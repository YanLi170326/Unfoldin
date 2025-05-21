import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for the admin session cookie
    const adminSession = request.cookies.get('admin_session')?.value;
    
    if (!adminSession) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // In a real application, validate the session token
    // For this demo, we're just checking if the cookie exists
    
    return NextResponse.json(
      { message: 'Authenticated as admin', isAdmin: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 