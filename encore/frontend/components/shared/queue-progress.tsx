import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface QueueProgressProps {
  /** Percentage through the queue (0-100) */
  progress: number;
  className?: string;
}

export function QueueProgress({ progress, className }: QueueProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Progress value={progress} />
      <p className="text-caption text-muted text-center">{Math.round(progress)}% complete</p>
    </div>
  );
}
