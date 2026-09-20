import { NextResponse, type NextRequest } from 'next/server';

/**
 * The only thing this middleware does is tell a layout which page is rendering
 * beneath it, because Next does not hand a layout its own pathname.
 *
 * Authorisation never happens here. Middleware runs before the session can be
 * read from the database, and a gate that cannot see the session is not a
 * gate — every /admin, /judging and /portal route is guarded server-side in
 * its own layout or page.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-palma-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything but static assets and the files served from /public.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
