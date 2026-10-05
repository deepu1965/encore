'use client';

import { useOrders } from '@/features/orders';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const router = useRouter();

  if (isLoading) {
    return <div className="p-12 text-center animate-pulse">Loading orders...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-h2 font-bold">Order History</h1>
      
      <Card className="p-0 overflow-hidden border">
        {(!orders || orders.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground">
            No orders found.
          </div>
        ) : (
          <div className="divide-y">
            {orders.map(order => (
              <div 
                key={order.orderId} 
                onClick={() => router.push(`/orders/${order.orderId}`)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground font-mono">#{order.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${(order.totalCents / 100).toFixed(2)}</p>
                  <p className={`text-xs uppercase font-semibold ${order.status === 'PAID' ? 'text-success' : 'text-muted-foreground'}`}>
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
