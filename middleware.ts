import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get user ID from cookie
  const userId = request.cookies.get('user_id')?.value;

  // If no user ID and trying to access dashboard, redirect to login
  if (!userId && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/dashboard/:path*'],
}; 