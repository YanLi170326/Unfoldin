import { NextResponse } from 'next/server';
import { saveSession } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get request cookies
    const cookieHeader = request.headers.get('cookie');
    const userId = parseCookieValue(cookieHeader, 'user_id');

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const sessionData = await request.json();

    // Save session
    const result = await saveSession(userId, sessionData);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Failed to save session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Session saved successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to parse cookie value
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : undefined;
} 