/* important: This is the main Express server for the User Management application.
 * It handles registration, login, email verification, and user CRUD operations.
 * nota bene: All routes except /register, /login, and /verify require JWT authentication. */
import express from 'express';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from './auth.js';
import { pool } from './db.js';
import { generateJWT } from './auth.js';
import { authenticateJWT } from './middleware/auth.js';
import cors from 'cors';
import { generateVerificationToken, sendVerificationEmail } from './email.js';

const app = express();
const PORT = process.env.PORT || 3000;

// note: Enable JSON body parsing and CORS for cross-origin requests from the React client.
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.redirect('/register');
});

/* note: This GET endpoint exists so the / route can redirect here.
 * Not used by the React client but kept for convenience. */
app.get('/register', (req, res) => {
    res.send('Registration Page');
});

/* important: Registration creates a new user in the database.
 * The UNIQUE INDEX on email (idx_users_email) enforces duplicate detection.
 * We do NOT manually check for existing emails — the DB does it. */
app.post('/register', async (req, res) => {
    const { name, password, email } = req.body;
    if (!name || !password || !email) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // nota bene: Password is hashed using argon2 before storage.
    const hashedPass = await hashPassword(password);

    try {
        /* note: Insert the new user. If the email already exists,
         * the unique index will throw error code 23505. */
        const result = await pool.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, status, created_at
        `, [name, email, hashedPass]);

        // important: Send verification email asynchronously — don't block the response.
        const token = generateVerificationToken(result.rows[0].id);
        sendVerificationEmail(email, name, token).catch(err => console.error('Email send failed:', err));

        // note: User is registered immediately; no email verification required to proceed.
        res.status(201).json({ message: 'Registration successful', user: result.rows[0] });
    } catch (err: any) {
        // nota bene: 23505 is PostgreSQL's unique violation error code.
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        console.error('Error registering user:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/* important: Login authenticates a user by email and password.
 * Blocked users are rejected before password check. */
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // nota bene: Blocked users cannot log in under any circumstances.
    if (user.status === 'blocked') {
        return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
    }

    const isValid = await verifyPassword(user.password_hash, password);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // important: Update last login timestamp and record activity for sparklines.
    await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);
    await pool.query(`INSERT INTO logins (user_id) VALUES ($1)`, [user.id]);

    const token = generateJWT(user.id);
    res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, status: user.status }
    });

});

/* note: Returns the profile of the currently authenticated user.
 * The user object is attached by the authenticateJWT middleware. */
app.get('/api/user', authenticateJWT, async (req: any, res: any) => {
    const user = (req as any).user;
    res.json({ profile: user });
});

/* important: Returns all users for the management table with sparkline data.
 * The authenticateJWT middleware verifies the user exists and is not blocked before this runs.
 * nota bene: Sparklines show daily login activity for the last 7 days. */
app.get('/api/users', authenticateJWT, async (req: any, res: any) => {
    const result = await pool.query(`
        SELECT id, name, email, status, last_login_at, created_at
        FROM users
        ORDER BY created_at DESC
    `);
    const users = result.rows;

    // note: Fetch sparkline data — daily login counts per user for the last 7 days.
    const sparkResult = await pool.query(`
        SELECT user_id, DATE(created_at) as day, COUNT(*) as count
        FROM logins
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id, DATE(created_at)
        ORDER BY user_id, day
    `);

    // note: Build a sparkline map: user_id -> array of 7 daily counts (oldest to newest).
    const sparkMap: Record<string, number[]> = {};
    for (const row of sparkResult.rows) {
        const uid: string = row.user_id as string;
        if (!sparkMap[uid]) {
            sparkMap[uid] = [];
        }
        sparkMap[uid].push(Number(row.count));
    }

    // note: Attach sparkline data to each user.
    for (const u of users) {
        u.sparkline = sparkMap[u.id] || [];
    }

    res.json(users);
});

/* note: Blocks selected users by setting their status to 'blocked'. */
app.patch('/api/users/block', authenticateJWT, async (req: any, res: any) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'User IDs are required' });
    }
    await pool.query(`UPDATE users SET status = 'blocked' WHERE id = ANY($1)`, [ids]);
    res.json({ message: 'Users blocked' });
});

/* nota bene: Only affects users with status = 'blocked' to avoid accidentally
 * changing unverified or active users to active. */
app.patch('/api/users/unblock', authenticateJWT, async (req: any, res: any) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'User IDs are required' });
    }
    await pool.query(`UPDATE users SET status = 'active' WHERE id = ANY($1) AND status = 'blocked'`, [ids]);
    res.json({ message: 'Users unblocked' });
});

/* important: Deletes selected users permanently.
 * Deleted users can re-register with the same email since there is no residual record. */
app.delete('/api/users', authenticateJWT, async (req: any, res: any) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'User IDs are required' });
    }
    await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    res.json({ message: 'Users deleted' });
});

/* note: Deletes all users with status = 'unverified' in one operation.
 * Useful for cleaning up unverified registrations. */
app.delete('/api/users/unverified', authenticateJWT, async (req: any, res: any) => {
    const result = await pool.query(`DELETE FROM users WHERE status = 'unverified'`);
    res.json({ message: `${result.rowCount} unverified users deleted` });
});

/* important: Email verification endpoint.
 * Handles the link clicked by the user from their verification email. */
app.get('/verify', async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }
    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

        // nota bene: The token purpose field ensures only verification tokens are accepted.
        if (decoded.purpose !== 'email-verification') {
            return res.status(400).json({ error: 'Invalid verification link.' });
        }

        /* note: Only update if user is not blocked.
         * Blocked users who click the link stay blocked. */
        const result = await pool.query(
            `UPDATE users SET status = 'active', email_verified_at = NOW() WHERE id = $1 AND status != 'blocked' RETURNING status`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.json({ message: 'Account is blocked and cannot be verified.' });
        }

        res.json({ message: 'Email verified successfully! You can now log in.' });
    }
    catch (err) {
        console.error('Email verification failed:', err);
        res.status(400).json({ error: 'Invalid or expired verification link.' });
    }
});

// note: Start the server on the configured port.
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
