'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SidebarProps {
  children?: ReactNode;
  className?: string;
  collapsed?: boolean;
}

export function Sidebar({ children, className, collapsed }: SidebarProps) {
  return (
    <nav
      className={cn(
        'flex flex-col h-full py-4',
        collapsed ? 'px-2' : 'px-3',
        className,
      )}
      aria-label="Sidebar"
    >
      {children}
    </nav>
  );
}

export interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('mb-4', className)}>
      {title && <h3 className="mb-2 px-2 text-caption font-medium text-muted uppercase">{title}</h3>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export interface SidebarLinkProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  badge?: string | number;
}

export function SidebarLink({ href, icon, children, active, badge }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-label transition-colors',
        active
          ? 'bg-surface text-foreground font-medium'
          : 'text-muted hover:text-foreground hover:bg-surface/50',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && (
        <span className="ml-auto rounded-sm bg-primary px-1.5 text-caption text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
