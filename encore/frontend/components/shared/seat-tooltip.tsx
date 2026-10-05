'use client';

import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SeatTooltipProps {
  section: string;
  row: string;
  number: string;
  priceCents: number;
  currency?: string;
  status: string;
  children: React.ReactNode;
  className?: string;
}

export function SeatTooltip({
  section,
  row,
  number,
  priceCents,
  currency = 'USD',
  status,
  children,
  className,
}: SeatTooltipProps) {
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(priceCents / 100);

  return (
    <Tooltip
      content={
        <div className={cn('space-y-1', className)}>
          <p className="font-medium">Section {section}, Row {row}, Seat {number}</p>
          <p className="text-muted">{priceFormatted}</p>
          <p className="text-muted capitalize">{status.toLowerCase()}</p>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
