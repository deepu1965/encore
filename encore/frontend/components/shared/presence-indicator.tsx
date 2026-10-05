import { cn } from '@/lib/utils';

export interface PresenceIndicatorProps {
  online: boolean;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceIndicator({ online, name, size = 'md', className }: PresenceIndicatorProps) {
  const sizePx = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }[size];

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizePx,
        online ? 'bg-success' : 'bg-muted',
        className,
      )}
      title={name ? `${name}: ${online ? 'online' : 'offline'}` : online ? 'Online' : 'Offline'}
      aria-label={name ? `${name} is ${online ? 'online' : 'offline'}` : undefined}
    />
  );
}
