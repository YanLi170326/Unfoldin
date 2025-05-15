import { pool } from './db-connection';

export async function checkDatabaseConnection() {
  try {
    // Try a simple query to test connectivity
    const result = await pool.sql`SELECT current_timestamp`;
    console.log('Database connection successful. Current time:', result.rows[0].current_timestamp);
    return { success: true, timestamp: result.rows[0].current_timestamp };
  } catch (error) {
    console.error('Database connection error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function setupDatabaseSchema() {
  try {
    console.log('Setting up database schema');
    
    // Create users table
    await pool.sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create sessions table
    await pool.sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        session_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user 
          FOREIGN KEY(user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE
      )
    `;
    
    // Create index for faster lookups
    await pool.sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `;
    
    console.log('Database schema setup successful');
    return { success: true };
  } catch (error) {
    console.error('Error setting up database schema:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return { success: false, error: errorMessage };
  }
} 