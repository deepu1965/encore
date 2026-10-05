'use client';

import { useOrder } from '@/features/checkout';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) {
    return <div className="p-12 text-center animate-pulse">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-12 text-center text-error">Order not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
        &larr; Back to Orders
      </Button>
      
      <div className="space-y-2">
        <h1 className="text-h2 font-bold">Order Details</h1>
        <p className="text-muted-foreground font-mono text-sm">Order #{order.orderId}</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <p className="text-sm text-muted-foreground">Order Date</p>
            <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className={`font-semibold uppercase ${order.status === 'PAID' ? 'text-success' : 'text-muted-foreground'}`}>
              {order.status}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="font-semibold text-lg">Line Items</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Standard Ticket (1x)</span>
              <span>${((order.totalCents - 500) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span>$5.00</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-4 mt-4">
              <span>Total Paid</span>
              <span>${(order.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
