'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  return (
    <button
      ref={ctx.triggerRef}
      type="button"
      onClick={() => ctx.setOpen((prev) => !prev)}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'start',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'end' | 'center' }) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx.open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        ctx.triggerRef.current &&
        !ctx.triggerRef.current.contains(e.target as Node)
      ) {
        ctx.setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ctx.setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [ctx]);

  if (!ctx.open) return null;

  const alignClasses =
    align === 'end'
      ? 'right-0 origin-top-right'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2 origin-top'
      : 'left-0 origin-top-left';

  return (
    <div
      ref={contentRef}
      role="menu"
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] rounded-md border border-border bg-background p-1 text-foreground shadow-lg ring-1 ring-black/5 focus:outline-none',
        alignClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        ctx?.setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-semibold text-foreground', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  );
}
