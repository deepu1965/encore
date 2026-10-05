'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service?: string;
}

const levelColor: Record<LogEntry['level'], string> = {
  debug: 'text-muted',
  info: 'text-info',
  warn: 'text-warning',
  error: 'text-error',
};

export interface LogViewerProps {
  entries: LogEntry[];
  className?: string;
  autoScroll?: boolean;
}

export function LogViewer({ entries, className, autoScroll = true }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-64 overflow-auto rounded-md border border-border bg-background font-mono text-caption',
        className,
      )}
      role="log"
      aria-label="Log viewer"
      aria-live="polite"
    >
      {entries.map((entry, idx) => (
        <div key={idx} className="px-2 py-0.5 hover:bg-surface">
          <span className="text-muted">{entry.timestamp}</span>
          {entry.service && <span className="text-muted ml-2">[{entry.service}]</span>}
          <span className={cn('ml-2 uppercase font-medium', levelColor[entry.level])}>
            {entry.level}
          </span>
          <span className="ml-2">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
