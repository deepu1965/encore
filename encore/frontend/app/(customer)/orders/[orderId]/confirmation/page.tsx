'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrder } from '@/features/checkout';
import { getWebSocketManager } from '@/lib/websocket-manager';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TicketQR } from '@/components/shared/ticket-qr';
import { CheckCircle2, Clock } from 'lucide-react';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const { data: order, isLoading } = useOrder(orderId);
  const [ticketIssued, setTicketIssued] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const ws = getWebSocketManager();
    const channel = `order.${orderId}`;

    const unsubUpdated = ws.subscribe(channel, 'order.updated', (env: any) => {
      // In a real app we'd mutate query cache. Here we just rely on ticket.issued
    });

    const unsubTicket = ws.subscribe(channel, 'ticket.issued', (env: any) => {
      setTicketIssued(true);
    });

    return () => {
      unsubUpdated();
      unsubTicket();
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 text-success mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-h2 font-bold">Payment Successful</h1>
        <p className="text-muted-foreground">Order #{order.orderId}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-12">
        {/* Ticket Status */}
        <Card className="p-8 flex flex-col items-center justify-center text-center space-y-6">
          {!ticketIssued ? (
            <>
              <Clock className="w-12 h-12 text-muted-foreground animate-pulse" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Generating Your Tickets</h3>
                <p className="text-sm text-muted-foreground">Please wait while we issue your digital tickets. This usually takes just a few seconds.</p>
              </div>
            </>
          ) : (
            <>
              <TicketQR value={`ticket-auth-${orderId}`} size={200} />
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Your Tickets are Ready</h3>
                <p className="text-sm text-muted-foreground">Scan this QR code at the venue</p>
              </div>
            </>
          )}
        </Card>

        {/* Order Summary */}
        <Card className="p-6 space-y-6 bg-muted/20">
          <h3 className="font-semibold text-lg border-b pb-2">Receipt</h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Order Date</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Status</span>
              <span className="capitalize">{order.status.toLowerCase()}</span>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span className="font-bold">${(order.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-8">
            <Button variant="outline" className="w-full" onClick={() => router.push('/explore')}>
              Find More Events
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
