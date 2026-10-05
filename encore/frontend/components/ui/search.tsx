import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const searchId = id ?? undefined;
    const helperId = helperText ? `${searchId}-helper` : undefined;
    const errorId = error ? `${searchId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={searchId} className="text-label text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            🔍
          </span>
          <input
            ref={ref}
            id={searchId}
            type="search"
            className={cn(
              'flex h-10 w-full rounded-sm border border-border bg-background pl-9 pr-3 text-body text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-error focus-visible:ring-error',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            {...props}
          />
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
Search.displayName = 'Search';
