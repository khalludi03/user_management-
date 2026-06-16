/* important: This middleware runs before every protected API route.
 * It verifies the JWT token and checks that the user exists and is not blocked.
 * nota bene: This is the single place where authorization checks happen —
 * individual route handlers do not duplicate this logic. */
import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { pool } from '../db.js';
import  type { Middleware } from '../types.js';

export const authenticateJWT: Middleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1] as string;

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        // note: Fetch the user from the database to check current status.
        const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
        const user = result.rows[0];

        if (!user) {
            /* important: User was deleted after receiving the token.
             * Return 401 so the client redirects to login. */
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.status === 'blocked') {
            // nota bene: Blocked users get 403 so the client knows the account is locked.
            return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
        }
        // note: Attach user info to the request for downstream handlers.
        (req as any).user = { id: user.id, name: user.name, email: user.email, status: user.status };
        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }   
};
