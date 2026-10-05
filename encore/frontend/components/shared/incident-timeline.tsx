import { Timeline, TimelineItem, TimelineContent } from '@/components/shared/timeline';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface IncidentEvent {
  time: string;
  type: 'triggered' | 'acknowledged' | 'resolved';
  message: string;
  actor?: string;
}

export interface IncidentTimelineProps {
  events: IncidentEvent[];
  className?: string;
}

const typeConfig = {
  triggered: { label: 'Triggered', variant: 'error' as const },
  acknowledged: { label: 'Acknowledged', variant: 'warning' as const },
  resolved: { label: 'Resolved', variant: 'success' as const },
};

export function IncidentTimeline({ events, className }: IncidentTimelineProps) {
  return (
    <Timeline className={cn('', className)}>
      {events.map((event, idx) => {
        const config = typeConfig[event.type];
        return (
          <TimelineItem key={idx} active={event.type === 'resolved'}>
            <TimelineContent
              title={
                <span className="flex items-center gap-2">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  {event.actor && <span className="text-muted">by {event.actor}</span>}
                </span>
              }
              time={new Date(event.time).toLocaleString()}
            >
              {event.message}
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
