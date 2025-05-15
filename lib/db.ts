import { sql } from '@vercel/postgres';

export async function createUser(username: string, password: string) {
  try {
    await sql`
      INSERT INTO users (username, password)
      VALUES (${username}, ${password})
    `;
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error };
  }
}

export async function getUserByUsername(username: string) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function saveSession(userId: string, sessionData: any) {
  try {
    await sql`
      INSERT INTO sessions (user_id, session_data)
      VALUES (${userId}, ${JSON.stringify(sessionData)})
    `;
    return { success: true };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error };
  }
}

export async function getUserSessions(userId: string) {
  try {
    const result = await sql`
      SELECT * FROM sessions WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
} 