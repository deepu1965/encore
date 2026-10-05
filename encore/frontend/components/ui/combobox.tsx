'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const comboboxVariants = cva(
  'flex w-full rounded-sm border border-border bg-background text-body text-foreground placeholder:text-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border',
        error: 'border-error focus-within:ring-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>,
    VariantProps<typeof comboboxVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  (
    {
      className,
      variant,
      label,
      helperText,
      error,
      options,
      value,
      onChange,
      onSearch,
      id,
      placeholder,
      disabled,
      ...props
    },
    ref,
  ) => {
    const comboboxId = id ?? undefined;
    const helperId = helperText ? `${comboboxId}-helper` : undefined;
    const errorId = error ? `${comboboxId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
      if (onSearch) onSearch(inputValue);
    }, [inputValue, onSearch]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: ComboboxOption) => {
      if (option.disabled) return;
      onChange?.(option.value);
      setInputValue('');
      setOpen(false);
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (options[highlightedIndex]) handleSelect(options[highlightedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    };

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={comboboxId} className="text-label text-foreground">
            {label}
          </label>
        )}
        <div ref={containerRef} className="relative">
          <div className={cn(comboboxVariants({ variant: error ? 'error' : variant }), 'h-10 px-3')}>
            <input
              ref={(node) => {
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
              }}
              id={comboboxId}
              className="flex-1 bg-transparent outline-none"
              placeholder={placeholder}
              disabled={disabled}
              value={open ? inputValue : (selectedOption?.label ?? '')}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={describedBy}
              aria-expanded={open}
              aria-autocomplete="list"
              role="combobox"
              {...props}
            />
          </div>
          {open && options.length > 0 && (
            <ul
              ref={listRef}
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-border bg-background shadow-md"
              role="listbox"
            >
              {options.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  aria-disabled={opt.disabled}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-body',
                    idx === highlightedIndex && 'bg-surface',
                    opt.disabled && 'opacity-50 cursor-not-allowed',
                    value === opt.value && 'font-medium',
                  )}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
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
Combobox.displayName = 'Combobox';
