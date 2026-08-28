import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Cron/CRON_SECRET-protected API routes authenticate themselves via a bearer
  // token, not a browser session cookie. Vercel's cron invoker has no session,
  // so without this bypass every scheduled run gets redirected to /login before
  // the route's own CRON_SECRET check ever runs.
  const cronRoutes = ['/api/backup/weekly-export', '/api/oracle/sync-po'];
  if (cronRoutes.some((r) => request.nextUrl.pathname.startsWith(r))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Guard against a slow/hanging Supabase auth response taking down the ENTIRE site.
  // Without this, a Supabase outage or latency spike causes every route to 504
  // (MIDDLEWARE_INVOCATION_TIMEOUT) until Vercel's hard middleware timeout kicks in.
  // If the session check doesn't resolve within 8s, fail safely: treat as no session
  // and let the normal redirect-to-login logic below handle it.
  let session = null;
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('session check timed out')), 8000)),
    ]);
    session = result.data.session;
  } catch {
    session = null;
  }
  const { pathname } = request.nextUrl;

  // Public routes — accessible without auth
  const publicRoutes = ['/login', '/auth/callback', '/auth/reset-password'];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
