/* important: Database migration script.
 * Creates the users table and a separate UNIQUE INDEX on email.
 * nota bene: The unique index is NOT the same as the primary key — both are required by the spec. */
import { pool } from './db.js';

async function migrate() {
    /* note: The users table stores all registered users.
     * The id is a UUID primary key, while email has its own unique index. */
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users(
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'unverified',
            email_verified_at TIMESTAMPTZ NULL,
            last_login_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )   
        `);
    /* important: This UNIQUE INDEX enforces email uniqueness at the database level.
     * We do NOT check email existence in application code — the DB does it. */
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

    /* note: Activity log for sparkline data.
     * Records each login event so we can show activity history. */
    await pool.query(`
        CREATE TABLE IF NOT EXISTS logins(
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logins_user_date ON logins(user_id, created_at);`);
    console.log('Migration completed');
    await pool.end();
}

migrate();
