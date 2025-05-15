import { NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
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

    // Check if user already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { message: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await createUser(username, hashedPassword);

    if (!result.success) {
      console.error('Failed to create user:', result.error);
      return NextResponse.json(
        { message: 'Failed to create user account' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', { message: errorMessage });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 