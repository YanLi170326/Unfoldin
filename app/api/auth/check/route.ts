import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the user_id cookie asynchronously
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      // If no user_id cookie, return 401 (Unauthorized)
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // If user_id cookie exists, return 200 with user ID
    return NextResponse.json(
      { 
        message: 'Authenticated',
        userId
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 