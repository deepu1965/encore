'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useRef, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const dropdownVariants = cva('z-50 min-w-32 rounded-md border border-border bg-background p-1 shadow-md', {
  variants: {
    align: {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    },
  },
  defaultVariants: {
    align: 'start',
  },
});

export interface DropdownProps extends VariantProps<typeof dropdownVariants> {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Dropdown({ trigger, children, align, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (align === 'center') left = rect.left + rect.width / 2;
    if (align === 'end') left = rect.right;
    setPosition({ top, left });
  }, [open, align]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items) return;
    const current = document.activeElement;
    const idx = Array.from(items).indexOf(current as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      prev?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Menu"
            className={cn(dropdownVariants({ align }), 'fixed', className)}
            style={{ top: position.top, left: position.left }}
            onKeyDown={handleKeyDown}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, disabled, className }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      disabled={disabled}
      onClick={() => onClick?.()}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-body text-left',
        'hover:bg-surface focus:bg-surface focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-border', className)} />;
}
