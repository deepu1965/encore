import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  const { ticketId } = params;

  return NextResponse.json({
    data: {
      ticketId: ticketId,
      orderId: 'ord_demo_123',
      eventId: 'e31fea72-d88a-407b-9e36-19515a01e71e',
      eventName: 'Encore Launch Night',
      venueName: 'Encore Arena',
      eventDate: '2026-10-16T13:03:50.400Z',
      section: 'A',
      row: '1',
      number: '1',
      status: 'ISSUED',
      qrCodeData: `ENCORE-${ticketId}`,
      priceCents: 5000,
      createdAt: '2026-09-28T12:00:00.000Z',
    },
    requestId: `req_${crypto.randomUUID()}`,
  });
}
