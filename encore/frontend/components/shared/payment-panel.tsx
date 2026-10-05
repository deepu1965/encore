'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/metric-card';
import { cn } from '@/lib/utils';

export interface PaymentMetrics {
  totalVolumeCents: number;
  successRate: number; // 0-100
  avgLatencyMs: number;
  failedCount: number;
}

export interface PaymentRecord {
  id: string;
  amountCents: number;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
}

export interface PaymentPanelProps {
  metrics: PaymentMetrics;
  recentPayments: PaymentRecord[];
  className?: string;
}

export function PaymentPanel({ metrics, recentPayments, className }: PaymentPanelProps) {
  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <h3 className="text-h4 font-medium">Payments</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Total volume"
          value={`$${(metrics.totalVolumeCents / 100).toLocaleString()}`}
        />
        <MetricCard label="Success rate" value={metrics.successRate} unit="%" />
        <MetricCard label="Avg latency" value={metrics.avgLatencyMs} unit="ms" />
        <MetricCard label="Failed" value={metrics.failedCount} />
      </div>
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Recent</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <div className="space-y-2">
            {recentPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between py-1 text-caption">
                <span>${(p.amountCents / 100).toFixed(2)}</span>
                <span className={p.status === 'failed' ? 'text-error' : 'text-success'}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <Table aria-label="Recent payments">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-caption">{p.id}</TableCell>
                  <TableCell>${(p.amountCents / 100).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{p.status}</TableCell>
                  <TableCell>{new Date(p.createdAt).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
