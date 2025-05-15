import { pool } from './db-connection';

export async function createUser(username: string, password: string) {
  try {
    console.log('Attempting to create user:', username);
    await pool.sql`
      INSERT INTO users (username, password)
      VALUES (${username}, ${password})
    `;
    console.log('User created successfully:', username);
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return { success: false, error };
  }
}

export async function getUserByUsername(username: string) {
  try {
    console.log('Attempting to get user by username:', username);
    const result = await pool.sql`
      SELECT * FROM users WHERE username = ${username}
    `;
    console.log('User query result rows:', result.rows.length);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return null;
  }
}

export async function saveSession(userId: string, sessionData: any) {
  try {
    console.log('Attempting to save session for user:', userId);
    await pool.sql`
      INSERT INTO sessions (user_id, session_data)
      VALUES (${userId}, ${JSON.stringify(sessionData)})
    `;
    console.log('Session saved successfully for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error saving session:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return { success: false, error };
  }
}

export async function getUserSessions(userId: string) {
  try {
    console.log('Attempting to get sessions for user:', userId);
    const result = await pool.sql`
      SELECT * FROM sessions WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    console.log('User sessions query result rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return [];
  }
} 