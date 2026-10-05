'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarImage({
  src,
  alt = '',
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [error, setError] = React.useState(!src);

  if (error || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
