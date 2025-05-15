import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByUsername(username);
    if (!user) {
      console.log('Login attempt with non-existent username:', username);
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Login attempt with incorrect password for user:', username);
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json(
      { message: 'Login successful', user: { id: user.id, username: user.username } },
      { status: 200 }
    );

    // Set cookie
    response.cookies.set({
      name: 'user_id',
      value: user.id,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    console.log('Login successful for user:', username);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { message: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 