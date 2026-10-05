'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartProps {
  data: ChartDataPoint[];
  title?: string;
  className?: string;
  /** Show paired data table toggle (accessibility.md §5) */
  showTableToggle?: boolean;
}

/**
 * Simple bar chart with paired data table for accessibility.
 * In production, this would use a real charting library (recharts, etc.)
 * This is a CSS-based placeholder that provides the a11y-critical
 * table toggle.
 */
export function Chart({ data, title, className, showTableToggle = true }: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn('', className)}>
      {title && <h3 className="text-h4 font-medium mb-4">{title}</h3>}
      <Tabs defaultValue="chart">
        {showTableToggle && (
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="chart">
          <div className="flex items-end gap-2 h-40 pt-4">
            {data.map((point, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary rounded-t-sm"
                  style={{ height: `${(point.value / maxValue) * 100}%` }}
                  role="img"
                  aria-label={`${point.label}: ${point.value}`}
                />
                <p className="text-caption text-muted mt-2 truncate w-full text-center">{point.label}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <Table aria-label={title ?? 'Chart data'}>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((point, idx) => (
                <TableRow key={idx}>
                  <TableCell>{point.label}</TableCell>
                  <TableCell className="tabular-nums">{point.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
