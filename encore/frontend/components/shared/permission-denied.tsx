import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PermissionDeniedProps {
  message?: string;
  className?: string;
}

export function PermissionDenied({
  message = "You don't have permission to access this page.",
  className,
}: PermissionDeniedProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <h3 className="text-h3 font-semibold text-foreground">Access denied</h3>
      <p className="text-body text-muted mt-2 max-w-md">{message}</p>
      <Link href="/">
        <Button className="mt-6">Go home</Button>
      </Link>
    </div>
  );
}
