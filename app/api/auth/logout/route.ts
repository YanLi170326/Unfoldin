import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Delete the user_id cookie
    response.cookies.set({
      name: 'user_id',
      value: '',
      expires: new Date(0), // Expire immediately
      path: '/',
    });

    console.log('User logged out successfully');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Failed to log out' },
      { status: 500 }
    );
  }
} 