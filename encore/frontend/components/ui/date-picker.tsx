'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const datePickerVariants = cva('', {
  variants: {
    variant: {
      default: '',
      error: '[&>button]:border-error',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface DatePickerProps extends VariantProps<typeof datePickerVariants> {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      label,
      helperText,
      error,
      placeholder = 'Select date',
      disabled,
      minDate,
      maxDate,
      className,
      variant,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(value ?? new Date());
    const buttonRef = useRef<HTMLButtonElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const helperId = helperText ? 'dp-helper' : undefined;
    const errorId = error ? 'dp-error' : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    useEffect(() => {
      if (!open || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }, [open]);

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (
          calendarRef.current &&
          !calendarRef.current.contains(e.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, []);

    const formatValue = (d: Date | null | undefined): string => {
      if (!d) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay();
    };

    const handleSelect = (day: number) => {
      const selected = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      if (minDate && selected < minDate) return;
      if (maxDate && selected > maxDate) return;
      onChange(selected);
      setOpen(false);
    };

    const renderDays = () => {
      const year = viewMonth.getFullYear();
      const month = viewMonth.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      const days: JSX.Element[] = [];

      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} />);
      }

      // Day cells
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const isSelected = value && formatValue(value) === formatValue(date);
        const isDisabled =
          (minDate && date < minDate) || (maxDate && date > maxDate);
        days.push(
          <button
            key={d}
            type="button"
            disabled={isDisabled}
            onClick={() => handleSelect(d)}
            aria-selected={isSelected ? true : undefined}
            className={cn(
              'h-8 w-8 rounded-sm text-body',
              isSelected && 'bg-primary text-primary-foreground',
              !isSelected && 'hover:bg-surface',
              isDisabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {d}
          </button>,
        );
      }

      return days;
    };

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label className="text-label text-foreground">{label}</label>
        )}
        <div className={cn(datePickerVariants({ variant: error ? 'error' : variant }))}>
          <button
            ref={(node) => {
              (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-sm border border-border bg-background px-3 text-body text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              disabled && 'opacity-50 cursor-not-allowed',
              !value && 'text-muted',
            )}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
          >
            {value ? formatValue(value) : placeholder}
            <span aria-hidden>📅</span>
          </button>
        </div>
        {helperText && !error && (
          <p id={helperId} className="text-caption text-muted">{helperText}</p>
        )}
        {error && (
          <p id={errorId} className="text-caption text-error" role="alert">{error}</p>
        )}
        {open &&
          typeof window !== 'undefined' &&
          createPortal(
            <div
              ref={calendarRef}
              role="dialog"
              aria-label="Choose date"
              className="fixed z-50 w-64 rounded-md border border-border bg-background p-3 shadow-md"
              style={{ top: position.top, left: position.left }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
                  aria-label="Previous month"
                  className="p-1 hover:bg-surface rounded"
                >
                  ←
                </button>
                <span className="text-label font-medium">
                  {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
                  aria-label="Next month"
                  className="p-1 hover:bg-surface rounded"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-caption text-muted">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);
DatePicker.displayName = 'DatePicker';
