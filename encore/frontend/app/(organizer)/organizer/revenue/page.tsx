'use client';

import { Card } from '@/components/ui/card';
import { DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function OrganizerRevenuePage() {
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h2 font-bold flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-success" /> Revenue & Payouts
        </h1>
        <p className="text-muted-foreground">Track financial performance and settlement schedules across all your events.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 border-success/30 bg-success/5">
          <h3 className="text-sm font-medium text-success uppercase tracking-wider">Available for Payout</h3>
          <p className="text-4xl font-bold">$124,500.00</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-success" /> +$12k this week
          </p>
        </Card>
        
        <Card className="p-6 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Settlement</h3>
          <p className="text-4xl font-bold text-muted-foreground">$45,200.00</p>
          <p className="text-xs text-muted-foreground">Funds held until 3 days post-event</p>
        </Card>

        <Card className="p-6 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Gross (YTD)</h3>
          <p className="text-4xl font-bold">$892,100.00</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +24% vs last year
          </p>
        </Card>
      </div>

      <Card className="p-8 mt-8 border-dashed flex flex-col items-center justify-center text-center space-y-4">
         <h3 className="font-bold text-lg">Detailed Payout History</h3>
         <p className="text-muted-foreground max-w-md">
           Connect your Stripe account to view granular, line-by-line payout reports and manage automated withdrawal schedules.
         </p>
         <button className="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors">
           Connect Stripe
         </button>
      </Card>
    </div>
  );
}
