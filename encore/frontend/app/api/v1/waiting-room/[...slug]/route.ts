import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const entryId = `entry_${crypto.randomUUID()}`;

  return NextResponse.json({
    data: {
      entryId,
      eventId: body.eventId || 'e31fea72-d88a-407b-9e36-19515a01e71e',
      userId: '11111111-1111-1111-1111-111111111111',
      position: 1,
      estimatedWaitSeconds: 5,
      status: 'WAITING',
      admittedAt: null,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    },
    requestId: `req_${crypto.randomUUID()}`,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const entryId = params.slug?.[0] || 'entry_123';

  return NextResponse.json({
    data: {
      entryId,
      eventId: 'e31fea72-d88a-407b-9e36-19515a01e71e',
      userId: '11111111-1111-1111-1111-111111111111',
      position: 1,
      estimatedWaitSeconds: 5,
      status: 'WAITING',
      admittedAt: null,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    },
    requestId: `req_${crypto.randomUUID()}`,
  });
}
