import { NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
import { setupDatabaseSchema } from '@/lib/db-check';
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

    // Make sure the database schema is created
    await setupDatabaseSchema();

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
        { message: `Failed to create user: ${result.error ? (result.error as any).message || JSON.stringify(result.error) : 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { message: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 