'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const drawerVariants = cva(
  'fixed z-50 flex flex-col border-border bg-background shadow-lg',
  {
    variants: {
      side: {
        left: 'left-0 top-0 h-full w-80 border-r',
        right: 'right-0 top-0 h-full w-80 border-l',
        top: 'top-0 left-0 w-full h-auto border-b',
        bottom: 'bottom-0 left-0 w-full h-auto border-t',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

export interface DrawerProps extends VariantProps<typeof drawerVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
  side,
  showClose = true,
}: DrawerProps) {
  const previousActive = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      previousActive.current = document.activeElement as HTMLElement;
      drawerRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousActive.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  if (typeof window === 'undefined' || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-foreground/50" onClick={onClose} aria-hidden>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
        tabIndex={-1}
        className={cn(drawerVariants({ side }), className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              {title && (
                <h2 id="drawer-title" className="text-h4 font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p id="drawer-description" className="text-caption text-muted">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                ✕
              </Button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
