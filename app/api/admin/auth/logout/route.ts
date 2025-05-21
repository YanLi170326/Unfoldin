import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create a response that will clear the admin session cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Clear the admin session cookie
    response.cookies.set({
      name: 'admin_session',
      value: '',
      expires: new Date(0), // Set expiration in the past to delete the cookie
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 