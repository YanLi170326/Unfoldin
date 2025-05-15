import { createPool } from '@vercel/postgres';

// Create a connection pool suitable for serverless environments
let globalPool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export const pool = globalPool; 