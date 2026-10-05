import { Timeline, TimelineItem, TimelineContent } from '@/components/shared/timeline';
import { cn } from '@/lib/utils';

export interface SettlementStep {
  label: string;
  time?: string;
  completed: boolean;
}

export interface SettlementTimelineProps {
  steps: SettlementStep[];
  className?: string;
}

export function SettlementTimeline({ steps, className }: SettlementTimelineProps) {
  return (
    <Timeline className={cn('', className)}>
      {steps.map((step, idx) => (
        <TimelineItem key={idx} active={step.completed}>
          <TimelineContent title={step.label} time={step.time}>
            {step.completed ? 'Completed' : 'Pending'}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
