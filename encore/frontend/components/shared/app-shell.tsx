'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Dense mode for ops layout (narrower sidebar, compact header) */
  dense?: boolean;
}

/**
 * AppShell — the page-level frame. Used by route-group layouts to compose
 * header + sidebar + main + footer. This is a pure layout component; state
 * and navigation data live in the consuming layouts.
 */
export function AppShell({ children, header, sidebar, footer, className, dense }: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      {header && <div className={cn('shrink-0', dense && 'h-12')}>{header}</div>}
      <div className="flex flex-1">
        {sidebar && (
          <aside
            className={cn('shrink-0 border-r border-border', dense ? 'w-52' : 'w-60')}
            aria-label="Sidebar navigation"
          >
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
