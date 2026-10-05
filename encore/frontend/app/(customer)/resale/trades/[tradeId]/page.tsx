'use client';

import { useTrade } from '@/features/resale';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resaleKeys } from '@/features/resale/types';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TradeSettlementPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params.tradeId as string;

  const { data: trade, isLoading } = useTrade(tradeId);
  const queryClient = useQueryClient();

  // WS subscription for real-time settlement steps
  useEffect(() => {
    if (!tradeId) return;
    const ws = getWebSocketManager();
    const channel = `resale.trade.${tradeId}`;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: resaleKeys.trade(tradeId) });
    };

    const unsubs = [
      ws.subscribe(channel, 'trade.settling', handleUpdate),
      ws.subscribe(channel, 'trade.completed', handleUpdate),
      ws.subscribe(channel, 'trade.failed', handleUpdate),
      ws.subscribe(channel, 'ownership.transferred', handleUpdate),
    ];

    return () => unsubs.forEach(u => u());
  }, [tradeId, queryClient]);

  if (isLoading) return <div className="p-12 text-center">Loading trade details...</div>;
  if (!trade) return <div className="p-12 text-center text-error">Trade not found</div>;

  const StepIcon = ({ done, failed }: { done: boolean, failed?: boolean }) => {
    if (failed) return <XCircle className="w-6 h-6 text-destructive shrink-0" />;
    if (done) return <CheckCircle2 className="w-6 h-6 text-success shrink-0" />;
    return <Clock className="w-6 h-6 text-muted-foreground animate-pulse shrink-0" />;
  };

  const isFailed = trade.status === 'FAILED';
  const isCompleted = trade.status === 'COMPLETED';

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <Button variant="ghost" onClick={() => router.push('/resale/my-trades')} className="-ml-4 mb-4">
        &larr; Back to Trades
      </Button>
      
      <div className="space-y-2">
        <h1 className="text-h2 font-bold">Trade Settlement</h1>
        <p className="text-muted-foreground font-mono">Trade #{trade.tradeId}</p>
      </div>

      <Card className="p-8 space-y-8">
        <div className="flex justify-between items-center border-b pb-6">
          <div>
             <p className="text-sm text-muted-foreground">Amount</p>
             <p className="font-bold text-2xl">${(trade.priceCents / 100).toFixed(2)}</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-muted-foreground">Status</p>
             <p className={cn("font-bold text-lg uppercase", isFailed ? "text-destructive" : isCompleted ? "text-success" : "text-warning")}>
               {trade.status.replace('_', ' ')}
             </p>
          </div>
        </div>

        <div className="space-y-6 relative">
           <h3 className="font-semibold text-lg mb-4">Settlement Timeline</h3>
           
           <div className="flex gap-4">
             <StepIcon done={trade.paymentCharged} failed={isFailed && !trade.paymentCharged} />
             <div className="space-y-1">
               <p className="font-medium">Payment Charged</p>
               <p className="text-sm text-muted-foreground">Securing funds from the buyer.</p>
             </div>
           </div>

           <div className="flex gap-4">
             <StepIcon done={trade.ownershipTransferred} failed={isFailed && trade.paymentCharged && !trade.ownershipTransferred} />
             <div className="space-y-1">
               <p className="font-medium">Ownership Transferred</p>
               <p className="text-sm text-muted-foreground">Transferring digital ticket to the buyer's account.</p>
             </div>
           </div>

           <div className="flex gap-4">
             <StepIcon done={trade.sellerCredited} failed={isFailed && trade.ownershipTransferred && !trade.sellerCredited} />
             <div className="space-y-1">
               <p className="font-medium">Seller Credited</p>
               <p className="text-sm text-muted-foreground">Disbursing funds to the seller's wallet.</p>
             </div>
           </div>
        </div>

        {isCompleted && (
          <div className="pt-6 border-t text-center">
            <Button onClick={() => router.push('/tickets')} className="w-full sm:w-auto">
              View My Tickets
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
