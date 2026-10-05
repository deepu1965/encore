'use client';

import { cn } from '@/lib/utils';

export interface TraceSpan {
  id: string;
  name: string;
  durationMs: number;
  startOffsetMs: number;
  children?: TraceSpan[];
}

export interface TraceViewerProps {
  traceId: string;
  rootSpan: TraceSpan;
  totalDurationMs: number;
  className?: string;
}

export function TraceViewer({ traceId, rootSpan, totalDurationMs, className }: TraceViewerProps) {
  return (
    <div className={cn('space-y-2', className)} role="region" aria-label="Trace viewer">
      <p className="text-caption text-muted">Trace ID: {traceId}</p>
      <div className="rounded-md border border-border p-4">
        {renderSpan(rootSpan, totalDurationMs, 0)}
      </div>
    </div>
  );
}

function renderSpan(span: TraceSpan, totalDuration: number, depth: number) {
  const widthPercent = (span.durationMs / totalDuration) * 100;
  const leftPercent = (span.startOffsetMs / totalDuration) * 100;

  return (
    <div key={span.id} className="mb-1">
      <div className="flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
        <span className="text-caption text-foreground">{span.name}</span>
        <span className="text-caption text-muted">{span.durationMs}ms</span>
      </div>
      <div
        className="relative h-4 bg-surface rounded-sm mt-0.5"
        style={{ marginLeft: depth * 16 }}
      >
        <div
          className="absolute h-full bg-primary/60 rounded-sm"
          style={{ width: `${widthPercent}%`, left: `${leftPercent}%` }}
          title={`${span.name}: ${span.durationMs}ms`}
        />
      </div>
      {span.children?.map((child) => renderSpan(child, totalDuration, depth + 1))}
    </div>
  );
}
