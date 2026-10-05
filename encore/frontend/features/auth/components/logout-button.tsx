'use client';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/features/auth/mutations';

export interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LogoutButton({ variant = 'ghost', size = 'sm', className }: LogoutButtonProps) {
  const logoutMutation = useLogout();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      className={className}
    >
      {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
