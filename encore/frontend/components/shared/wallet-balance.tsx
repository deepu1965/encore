import { cn } from '@/lib/utils';

export interface WalletBalanceProps {
  balanceCents: number;
  currency?: string;
  label?: string;
  className?: string;
}

export function WalletBalance({ balanceCents, currency = 'USD', label = 'Balance', className }: WalletBalanceProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(balanceCents / 100);

  return (
    <div className={cn('text-center', className)}>
      <p className="text-caption text-muted">{label}</p>
      <p className="text-display font-bold text-foreground tabular-nums">{formatted}</p>
    </div>
  );
}
