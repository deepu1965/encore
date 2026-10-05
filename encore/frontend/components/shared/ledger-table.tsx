'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface LedgerEntry {
  id: string;
  createdAt: string;
  description: string;
  amountCents: number;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed';
}

export interface LedgerTableProps {
  entries: LedgerEntry[];
  className?: string;
}

export function LedgerTable({ entries, className }: LedgerTableProps) {
  return (
    <div className={cn('', className)}>
      <Table aria-label="Transaction history">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Date</TableHead>
            <TableHead scope="col">Description</TableHead>
            <TableHead scope="col">Amount</TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell
                className={cn(
                  'tabular-nums font-medium',
                  entry.type === 'credit' ? 'text-success' : 'text-foreground',
                )}
              >
                {entry.type === 'credit' ? '+' : '-'}${Math.abs(entry.amountCents / 100).toFixed(2)}
              </TableCell>
              <TableCell className="capitalize">{entry.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
