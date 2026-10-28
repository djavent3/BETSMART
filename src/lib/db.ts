import { Pool } from 'pg';

declare global {
  // Prevent multiple connection pools during Next.js hot-reloading in development
  var pgPool: Pool | undefined;
}

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase cloud connections
    },
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}

export default pool;
