import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-sm border border-border bg-background text-body text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      inputSize: {
        sm: 'h-8 px-3',
        md: 'h-10 px-3',
        lg: 'h-12 px-4 text-body',
      },
      variant: {
        default: 'border-border',
        error: 'border-error focus-visible:ring-error',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      variant: 'default',
    },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Render a visible label above the input. */
  label?: string;
  /** Helper text shown below the input. */
  helperText?: string;
  /** Error message — also sets the error variant and aria-invalid. */
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, variant, label, helperText, error, id, ...props }, ref) => {
    const inputId = id ?? undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-label text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(inputVariants({ inputSize, variant: error ? 'error' : variant }), className)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
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
Input.displayName = 'Input';
