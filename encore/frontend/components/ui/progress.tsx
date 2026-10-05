import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const progressVariants = cva('h-2 w-full overflow-hidden rounded-sm bg-surface', {
  variants: {
    variant: {
      default: '[&>div]:bg-primary',
      success: '[&>div]:bg-success',
      warning: '[&>div]:bg-warning',
      error: '[&>div]:bg-error',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface ProgressProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof progressVariants> {
  value: number; // 0-100
  max?: number;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(progressVariants({ variant }), className)}
        {...props}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';
