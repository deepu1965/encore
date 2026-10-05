import { cn } from '@/lib/utils';

export interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <ol className={cn('relative border-l border-border ml-3 pl-6 space-y-4', className)}>
      {children}
    </ol>
  );
}

export interface TimelineItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function TimelineItem({ children, icon, className, active }: TimelineItemProps) {
  return (
    <li className={cn('relative', className)}>
      <span
        className={cn(
          'absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background',
          active && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {icon ?? (active ? '●' : '○')}
      </span>
      <div className="pb-2">{children}</div>
    </li>
  );
}

export interface TimelineContentProps {
  title?: React.ReactNode;
  time?: string;
  children: React.ReactNode;
}

export function TimelineContent({ title, time, children }: TimelineContentProps) {
  return (
    <div>
      {title && <h4 className="text-label font-medium text-foreground">{title}</h4>}
      {time && <p className="text-caption text-muted">{time}</p>}
      <div className="mt-1 text-body text-muted">{children}</div>
    </div>
  );
}
