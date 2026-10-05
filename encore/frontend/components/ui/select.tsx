import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const selectVariants = cva(
  'flex w-full appearance-none rounded-sm border border-border bg-background text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      selectSize: {
        sm: 'h-8 px-3 pr-8',
        md: 'h-10 px-3 pr-10',
        lg: 'h-12 px-4 pr-12 text-body',
      },
      variant: {
        default: 'border-border',
        error: 'border-error focus-visible:ring-error',
      },
    },
    defaultVariants: {
      selectSize: 'md',
      variant: 'default',
    },
  },
);

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, selectSize, variant, label, helperText, error, options, placeholder, id, ...props },
    ref,
  ) => {
    const selectId = id ?? undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-label text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(selectVariants({ selectSize, variant: error ? 'error' : variant }), className)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted"
            aria-hidden
          >
            ▼
          </span>
        </div>
        {helperText && !error && (
          <p id={helperId} className="text-caption text-muted">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-caption text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
