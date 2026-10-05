import { cn } from '@/lib/utils';

export interface ChatMessageProps {
  id: string;
  content: string;
  senderName: string;
  senderType: 'user' | 'support' | 'system';
  createdAt: string;
  className?: string;
}

export function ChatMessage({
  content,
  senderName,
  senderType,
  createdAt,
  className,
}: ChatMessageProps) {
  const isOwn = senderType === 'user';
  const time = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        'flex gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-md px-3 py-2',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground',
          senderType === 'system' && 'bg-muted/20 text-muted italic',
        )}
      >
        {senderType !== 'user' && (
          <p className="text-caption font-medium mb-1">{senderName}</p>
        )}
        <p className="text-body whitespace-pre-wrap">{content}</p>
        <p
          className={cn(
            'text-caption mt-1',
            isOwn ? 'text-primary-foreground/70' : 'text-muted',
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
