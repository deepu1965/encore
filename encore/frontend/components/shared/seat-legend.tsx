import { cn } from '@/lib/utils';

export interface SeatLegendProps {
  className?: string;
}

const items = [
  { label: 'Available', className: 'bg-surface border border-border' },
  { label: 'Selected', className: 'bg-primary text-primary-foreground' },
  { label: 'Held', className: 'bg-warning/20 border border-warning' },
  { label: 'Sold', className: 'bg-surface border border-border opacity-50' },
];

export function SeatLegend({ className }: SeatLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-4', className)} aria-label="Seat legend">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={cn('w-6 h-6 rounded-sm', item.className)} aria-hidden />
          <span className="text-caption text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
