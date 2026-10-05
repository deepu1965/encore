import { NextResponse, type NextRequest } from 'next/server';

import { hasAnyRole } from '@/lib/auth';
import { isPublicRoute, matchRoutePermission } from '@/config/route-permissions';
import type { Role } from '@/types';

/**
 * RBAC gate (auth-rbac.md). Runs before any route group's layout renders:
 *  1. read the httpOnly session cookie
 *  2. auth-required route with no session -> /login?redirect=
 *  3. role-gated route the session role can't access -> /forbidden
 *
 * This is a UX optimization only — the backend re-checks authorization on
 * every request. The cookie payload is a base64url JSON blob written by the
 * /api/auth/login BFF route (Phase 3 wires real verification).
 */
const SESSION_COOKIE = 'encore_session';

interface SessionClaims {
  role?: Role;
}

function readSession(req: NextRequest): SessionClaims | null {
  const mockRole = req.headers.get('x-mock-role') || req.cookies.get('mock_role')?.value;
  if (mockRole) {
    return { role: mockRole as Role };
  }

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const json = Buffer.from(raw, 'base64url').toString('utf8');
      return JSON.parse(json) as SessionClaims;
    } catch {
      // fallback to jwt check
    }
  }

  const authJwt = req.cookies.get('encore_auth')?.value;
  if (authJwt) {
    try {
      const [, payload] = authJwt.split('.');
      if (payload) {
        const json = Buffer.from(payload, 'base64url').toString('utf8');
        const claims = JSON.parse(json) as { role?: string };
        const role = claims.role === 'BUYER' ? 'CUSTOMER' : (claims.role as Role);
        return { role };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  const isProd = process.env.NODE_ENV === 'production';
  const cspHeader = `
    default-src 'self';
    connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*;
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://images.unsplash.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isProd ? 'upgrade-insecure-requests;' : ''}
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    const authCookie = req.cookies.get('encore_auth')?.value;
    if (authCookie && !req.headers.has('authorization')) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('authorization', `Bearer ${authCookie}`);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    return NextResponse.next();
  }

  const session = readSession(req);
  const mockRoleHeader = req.headers.get('x-mock-role') || req.cookies.get('mock_role')?.value;

  if (isPublicRoute(pathname)) {
    const res = addSecurityHeaders(NextResponse.next());
    if (mockRoleHeader) res.cookies.set('mock_role', mockRoleHeader, { path: '/' });
    return res;
  }

  const permission = matchRoutePermission(pathname);
  // Not public and not explicitly permissioned => require auth only.

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (permission?.allowedRoles && session.role) {
    if (!hasAnyRole(session.role, permission.allowedRoles)) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/forbidden', req.url)));
    }
  }

  const res = addSecurityHeaders(NextResponse.next());
  if (mockRoleHeader) {
    res.cookies.set('mock_role', mockRoleHeader, { path: '/' });
  }
  return res;
}

export const config = {
  // Exclude Next internals, the BFF auth routes, and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
