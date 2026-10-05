'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import type { InventoryStatus } from '@/types';

const seatVariants = cva(
  'w-8 h-8 rounded-sm text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  {
    variants: {
      status: {
        AVAILABLE: 'bg-surface border border-border text-foreground hover:bg-primary/10 hover:border-primary',
        HELD: 'bg-warning/20 border border-warning text-foreground',
        SOLD: 'bg-surface border border-border text-muted opacity-50 cursor-not-allowed',
        RESERVED: 'bg-primary/20 border border-primary text-primary',
      },
      selected: {
        true: 'ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground',
        false: '',
      },
    },
    defaultVariants: {
      status: 'AVAILABLE',
      selected: false,
    },
  },
);

export interface SeatProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof seatVariants> {
  section: string;
  row: string;
  number: string;
  priceCents: number;
  currency?: string;
  status: InventoryStatus;
  selected?: boolean;
  onSelect?: () => void;
}

export const Seat = forwardRef<HTMLButtonElement, SeatProps>(
  (
    {
      section,
      row,
      number,
      priceCents,
      currency = 'USD',
      status,
      selected,
      onSelect,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || status === 'SOLD' || (status === 'HELD' && !selected) || status === 'RESERVED';
    const priceFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(priceCents / 100);

    const ariaLabel = `Section ${section}, Row ${row}, Seat ${number}, ${priceFormatted}, ${status.toLowerCase()}`;

    return (
      <button
        ref={ref}
        type="button"
        role="gridcell"
        data-status={status}
        aria-label={ariaLabel}
        aria-pressed={selected}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        onClick={onSelect}
        className={cn(seatVariants({ status, selected }), className)}
        {...props}
      >
        {number}
      </button>
    );
  },
);
Seat.displayName = 'Seat';
