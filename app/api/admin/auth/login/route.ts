import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// Define a fixed admin user for simplicity
// In a production environment, this should be stored in a database
const ADMIN_USERNAME = 'admin';
// Store hashed password
const ADMIN_PASSWORD_HASH = '$2b$10$z9L3L8KpgZ2w2vJQK4YbVeZ0XLd5Fj6/5GZQTXjJQ8c5LJpnH7wuO'; // bcrypt hash for 'unfoldiin-admin'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username matches the admin username
    if (username !== ADMIN_USERNAME) {
      console.log('Admin login attempt with incorrect username:', username);
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password against stored hash
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordMatch) {
      console.log('Admin login attempt with incorrect password');
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session cookie for admin access
    const response = NextResponse.json(
      { message: 'Login successful', isAdmin: true },
      { status: 200 }
    );

    // Set a secure HTTP-only cookie for admin authentication
    response.cookies.set({
      name: 'admin_session',
      value: 'true', // In a real app, use a signed JWT or other secure token
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    console.log('Admin login successful');
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 