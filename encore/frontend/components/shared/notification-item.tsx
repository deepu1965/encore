import { cn } from '@/lib/utils';

export interface NotificationItemProps {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NotificationItem({
  title,
  body,
  createdAt,
  read = false,
  onClick,
  className,
}: NotificationItemProps) {
  const timeAgo = formatTimeAgo(new Date(createdAt));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-sm hover:bg-surface transition-colors',
        !read && 'bg-surface/50',
        className,
      )}
      aria-label={`${title}${!read ? ' (unread)' : ''}`}
    >
      <div className="flex items-start gap-3">
        {!read && (
          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-foreground truncate">{title}</p>
          {body && <p className="text-caption text-muted mt-0.5 line-clamp-2">{body}</p>}
          <p className="text-caption text-muted mt-1">{timeAgo}</p>
        </div>
      </div>
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
