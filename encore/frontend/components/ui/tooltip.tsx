'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const tooltipVariants = cva(
  'z-50 rounded-sm border border-border bg-surface px-2 py-1 text-caption text-foreground shadow-sm',
  {
    variants: {
      side: {
        top: 'mb-1',
        bottom: 'mt-1',
        left: 'mr-1',
        right: 'ml-1',
      },
    },
    defaultVariants: {
      side: 'top',
    },
  },
);

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  content: ReactNode;
  children: ReactNode;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({ content, children, side = 'top', delayDuration = 300, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position tooltip
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;
    switch (side) {
      case 'top':
        top = trigger.top - tooltip.height - 4;
        left = trigger.left + (trigger.width - tooltip.width) / 2;
        break;
      case 'bottom':
        top = trigger.bottom + 4;
        left = trigger.left + (trigger.width - tooltip.width) / 2;
        break;
      case 'left':
        top = trigger.top + (trigger.height - tooltip.height) / 2;
        left = trigger.left - tooltip.width - 4;
        break;
      case 'right':
        top = trigger.top + (trigger.height - tooltip.height) / 2;
        left = trigger.right + 4;
        break;
    }
    // Clamp to viewport
    top = Math.max(4, Math.min(top, window.innerHeight - tooltip.height - 4));
    left = Math.max(4, Math.min(left, window.innerWidth - tooltip.width - 4));
    setPosition({ top, left });
  }, [open, side]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? 'tooltip-content' : undefined}
      >
        {children}
      </button>
      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id="tooltip-content"
            role="tooltip"
            className={cn(tooltipVariants({ side }), 'fixed', className)}
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
