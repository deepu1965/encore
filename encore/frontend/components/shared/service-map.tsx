'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HealthIndicator } from '@/components/shared/health-indicator';
import type { ServiceHealth } from '@/components/shared/service-status';
import { cn } from '@/lib/utils';

export interface ServiceNode {
  id: string;
  name: string;
  health: ServiceHealth;
  connections: string[]; // IDs of connected services
}

export interface ServiceMapProps {
  services: ServiceNode[];
  className?: string;
}

/**
 * Service map with paired data table (accessibility.md §5).
 * The visual map is a placeholder; real implementation would use a graph lib.
 */
export function ServiceMap({ services, className }: ServiceMapProps) {
  return (
    <div className={cn('', className)}>
      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          <div className="h-64 rounded-md border border-border bg-surface flex items-center justify-center text-muted">
            Service map visualization placeholder — use a graph library in production
          </div>
        </TabsContent>
        <TabsContent value="table">
          <Table aria-label="Services">
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Connections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell className="font-medium">{svc.name}</TableCell>
                  <TableCell>
                    <HealthIndicator health={svc.health} className="mr-2" />
                    <span className="capitalize">{svc.health}</span>
                  </TableCell>
                  <TableCell>{svc.connections.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
