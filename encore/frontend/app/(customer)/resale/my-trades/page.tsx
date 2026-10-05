'use client';

import { useMyTrades } from '@/features/resale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function MyTradesPage() {
  const { data: trades, isLoading } = useMyTrades();
  const router = useRouter();

  if (isLoading) return <div className="p-12 text-center">Loading trades...</div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-h2 font-bold">My Resale Trades</h1>
      
      <Card className="overflow-hidden border">
        {(!trades || trades.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground">
            You have no resale trades.
          </div>
        ) : (
          <div className="divide-y">
            {trades.map(trade => (
              <div 
                key={trade.tradeId} 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/resale/trades/${trade.tradeId}`)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">${(trade.priceCents / 100).toFixed(2)}</p>
                    <Badge variant="outline" className="uppercase text-xs">{trade.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Trade #{trade.tradeId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(trade.createdAt).toLocaleDateString()} at {new Date(trade.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="text-right text-sm text-primary font-medium">
                  View Settlement &rarr;
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
