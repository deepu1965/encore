import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tradeId: string } }
) {
  const { tradeId } = params;

  return NextResponse.json({
    data: {
      tradeId: tradeId,
      listingId: 'list_123',
      ticketId: 'tix_123',
      buyerId: '11111111-1111-1111-1111-111111111111',
      sellerId: '00000000-0000-0000-0000-000000000000',
      settlementPriceCents: 10000,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    },
    requestId: `req_${crypto.randomUUID()}`,
  });
}
