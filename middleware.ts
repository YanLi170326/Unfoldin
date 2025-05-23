import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get user ID from cookie
  const userId = request.cookies.get('user_id')?.value;

  // If no user ID and trying to access protected pages, redirect to login
  if (!userId && (request.nextUrl.pathname.startsWith('/dashboard') || 
                  request.nextUrl.pathname.startsWith('/profile'))) {
    // Add the redirect URL as a query parameter
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/dashboard/:path*'],
}; 