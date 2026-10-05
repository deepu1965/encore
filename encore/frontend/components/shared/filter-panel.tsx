'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterPanelProps {
  children: React.ReactNode;
  onClear?: () => void;
  onApply?: () => void;
  className?: string;
  showActions?: boolean;
}

export function FilterPanel({ children, onClear, onApply, className, showActions = true }: FilterPanelProps) {
  return (
    <aside
      className={cn('flex flex-col gap-4 p-4 border border-border rounded-md bg-surface', className)}
      aria-label="Filters"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-h4 font-medium">Filters</h2>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      {showActions && onApply && (
        <div className="pt-4 border-t border-border">
          <Button variant="primary" className="w-full" onClick={onApply}>
            Apply filters
          </Button>
        </div>
      )}
    </aside>
  );
}

export interface FilterGroupProps {
  label: string;
  children: React.ReactNode;
}

export function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-label font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
