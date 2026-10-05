'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const toastVariants = cva(
  'flex items-start gap-3 rounded-md border p-4 shadow-md',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface text-foreground',
        success: 'border-success/50 bg-success/10 text-foreground',
        warning: 'border-warning/50 bg-warning/10 text-foreground',
        error: 'border-error/50 bg-error/10 text-foreground',
        info: 'border-info/50 bg-info/10 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  duration?: number;
  onDismiss: (id: string) => void;
}

export function Toast({ id, title, description, action, duration = 5000, variant, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => onDismiss(id), duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(toastVariants({ variant }))}
    >
      <div className="flex-1">
        {title && <p className="text-label font-medium">{title}</p>}
        {description && <p className="mt-1 text-caption text-muted">{description}</p>}
      </div>
      {action}
      <button
        onClick={() => onDismiss(id)}
        className="text-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// Simple toast container + hook
interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: VariantProps<typeof toastVariants>['variant'];
  duration?: number;
}

let toasts: Toast[] = [];
let listeners: Array<(t: Toast[]) => void> = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(t: Omit<Toast, 'id'>) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { ...t, id }];
  notify();
  return id;
}

toast.dismiss = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  if (typeof window === 'undefined' || items.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-50 flex max-h-screen w-80 flex-col gap-2 overflow-auto"
      aria-label="Notifications"
    >
      {items.map((t) => (
        <Toast key={t.id} {...t} onDismiss={toast.dismiss} />
      ))}
    </div>,
    document.body,
  );
}
