import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db-connection';

export async function GET() {
  try {
    // Get the user_id cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      // If no user_id cookie, return 401 (Unauthorized)
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user data
    const userResult = await pool.sql`
      SELECT id, username, created_at 
      FROM users 
      WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Fetch user's chat history
    const sessionsResult = await pool.sql`
      SELECT id, session_data, created_at
      FROM sessions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // Return user data and sessions
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      },
      sessions: sessionsResult.rows,
      message: 'Profile data retrieved successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 