import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const { listingId } = params;

  return NextResponse.json({
    data: {
      listingId: listingId,
      ticketId: 'tix_123',
      eventId: 'e31fea72-d88a-407b-9e36-19515a01e71e',
      sellerId: '11111111-1111-1111-1111-111111111111',
      askPriceCents: 10000,
      status: 'LISTED',
      section: 'A',
      row: '1',
      seatNumber: '1',
      createdAt: new Date().toISOString(),
    },
    requestId: `req_${crypto.randomUUID()}`,
  });
}
