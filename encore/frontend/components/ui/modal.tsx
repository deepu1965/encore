'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const modalVariants = cva(
  'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface ModalProps extends VariantProps<typeof modalVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size,
  showClose = true,
}: ModalProps) {
  const previousActive = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      previousActive.current = document.activeElement as HTMLElement;
      // Focus the modal
      modalRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Restore focus
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

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
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
    <div
      className="fixed inset-0 z-50 bg-foreground/50"
      onClick={onClose}
      aria-hidden
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={cn(modalVariants({ size }), className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {(title || showClose) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id="modal-title" className="text-h3 font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-body text-muted">
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
        {children}
      </div>
    </div>,
    document.body,
  );
}
