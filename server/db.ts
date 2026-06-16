/* important: Database connection pool using pg (node-postgres).
 * The pool manages connections to PostgreSQL and reuses them efficiently.
 * nota bene: Connection string comes from DATABASE_URL in the .env file. */
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
