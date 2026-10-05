import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';
import type { BackendRole } from '@/types';
import { mapBackendRole, SESSION_COOKIE } from '@/lib/auth';

/**
 * Token refresh BFF route (Phase 3).
 *
 * Calls the backend refresh endpoint and updates the httpOnly cookies.
 * The backend issues both access and refresh tokens as httpOnly cookies,
 * so we just need to trigger the refresh and pass through the new cookies.
 */
const AUTH_COOKIE = 'encore_auth';

interface RefreshResponse {
  access_token: string;
  token_type: string;
}

function decodeRole(jwt: string): BackendRole | null {
  try {
    const [, payload] = jwt.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { role?: string };
    const role = claims.role;
    return role === 'BUYER' || role === 'ORGANIZER' || role === 'ADMIN' ? role : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // The refresh token should be in an httpOnly cookie set by the backend
  // For now, we call the backend's refresh endpoint (which doesn't exist yet)
  // This is a placeholder that will work once the backend adds refresh support

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the cookies to the backend
        Cookie: req.headers.get('cookie') ?? '',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: { code: 'REFRESH_FAILED', message: 'Token refresh failed' } },
        { status: 401 },
      );
    }

    const data = (await res.json()) as RefreshResponse;
    const backendRole = decodeRole(data.access_token);
    const role = backendRole ? mapBackendRole(backendRole) : 'CUSTOMER';

    const sessionBlob = Buffer.from(JSON.stringify({ role }), 'utf8').toString('base64url');

    const response = NextResponse.json({ data: { ok: true }, requestId: null });
    const secure = env.NEXT_PUBLIC_ENVIRONMENT !== 'development';
    const common = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 8, // 8h
    };

    response.cookies.set(AUTH_COOKIE, data.access_token, common);
    response.cookies.set(SESSION_COOKIE, sessionBlob, common);

    return response;
  } catch {
    return NextResponse.json(
      { error: { code: 'REFRESH_FAILED', message: 'Token refresh failed' } },
      { status: 401 },
    );
  }
}
