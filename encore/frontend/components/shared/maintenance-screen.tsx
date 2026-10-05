import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedTime?: string;
  icon?: ReactNode;
  className?: string;
}

export function MaintenanceScreen({
  title = 'Under maintenance',
  message = "We're currently performing scheduled maintenance. Please check back soon.",
  estimatedTime,
  icon,
  className,
}: MaintenanceScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center text-center px-4',
        className,
      )}
    >
      {icon && <div className="text-muted mb-4">{icon}</div>}
      <h1 className="text-h1 font-semibold text-foreground">{title}</h1>
      <p className="text-body text-muted mt-2 max-w-md">{message}</p>
      {estimatedTime && (
        <p className="text-caption text-muted mt-4">Estimated time: {estimatedTime}</p>
      )}
    </div>
  );
}
