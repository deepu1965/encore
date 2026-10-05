'use client';

import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MobileNavProps {
  children?: ReactNode;
  className?: string;
  trigger?: ReactNode;
}

export function MobileNav({ children, className, trigger }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('md:hidden', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        {trigger ?? '☰'}
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </Button>
            </div>
            <nav className="space-y-1">{children}</nav>
          </div>
        </>
      )}
    </div>
  );
}
