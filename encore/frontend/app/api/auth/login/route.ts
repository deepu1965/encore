import { NextResponse, type NextRequest } from 'next/server';

import { mapBackendRole, SESSION_COOKIE } from '@/lib/auth';
import { env } from '@/lib/env';
import type { BackendRole } from '@/types';

/**
 * Auth BFF (Phase 0 gap G-8).
 *
 * The V1 backend exposes only `POST /api/v1/auth/token`, which takes a
 * `{ user_id }` and returns a bearer `{ access_token }` — not a cookie.
 * The plan's security model requires the JWT to live in an httpOnly cookie
 * (never readable by JS). This Route Handler bridges the two: it calls the
 * backend token endpoint server-side, then sets:
 *   - `encore_auth`   httpOnly Secure SameSite=Strict  — the JWT itself
 *   - `encore_session` httpOnly                          — a small role blob
 *                        the RBAC middleware reads (base64url JSON)
 *
 * Real credential validation (email+password) does not exist server-side
 * yet; until it does, this accepts the same `{ user_id }` the backend does.
 * When the backend adds a real login, only this handler changes.
 */
const AUTH_COOKIE = 'encore_auth';

interface LoginBody {
  userId?: string;
  email?: string;
  identifier?: string;
  password?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

function decodeClaims(jwt: string): { sub?: string; role?: string } | null {
  try {
    const [, payload] = jwt.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json) as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Malformed request body.' } },
      { status: 400 },
    );
  }

  const ident = (body.email || body.userId || body.identifier || '').trim();
  if (!ident) {
    return NextResponse.json(
      { error: { code: 'MISSING_CREDENTIALS', message: 'Email or User ID is required.' } },
      { status: 400 },
    );
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: ident,
        email: ident,
        identifier: ident,
        password: body.password,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'AUTH_UNAVAILABLE', message: 'Authentication service is unavailable.' } },
      { status: 502 },
    );
  }

  if (!tokenRes.ok) {
    const status = tokenRes.status === 404 ? 401 : tokenRes.status;
    return NextResponse.json(
      { error: { code: 'LOGIN_FAILED', message: 'Invalid credentials. User not found.' } },
      { status },
    );
  }

  const token = (await tokenRes.json()) as TokenResponse;
  const claims = decodeClaims(token.access_token);
  const backendRole = claims?.role === 'BUYER' || claims?.role === 'ORGANIZER' || claims?.role === 'ADMIN' ? (claims.role as BackendRole) : null;
  const role = backendRole ? mapBackendRole(backendRole) : 'CUSTOMER';
  const userId = claims?.sub ?? ident;

  const sessionBlob = Buffer.from(JSON.stringify({ role }), 'utf8').toString('base64url');

  const res = NextResponse.json({ data: { role, userId, email: body.email || '' }, requestId: null });
  const secure = env.NEXT_PUBLIC_ENVIRONMENT !== 'development';
  const common = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 8, // 8h; refresh handled by the apiClient interceptor (Phase 3)
  };

  res.cookies.set(AUTH_COOKIE, token.access_token, common);
  res.cookies.set(SESSION_COOKIE, sessionBlob, common);
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ data: { ok: true }, requestId: null });
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
