'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Seat } from '@/components/shared/seat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { InventoryStatus } from '@/types';
import { cn } from '@/lib/utils';

export interface SeatData {
  id: string;
  section: string;
  row: string;
  number: string;
  status: InventoryStatus;
  priceCents: number;
}

export interface SeatMapProps {
  eventId: string;
  seats: SeatData[];
  selectedSeatIds: string[];
  onSeatSelect: (seatId: string) => void;
  className?: string;
}

export function SeatMap({ seats, selectedSeatIds, onSeatSelect, className }: SeatMapProps) {
  const [view, setView] = useState<'map' | 'list'>('map');

  // Group seats by section for map view
  const sections = seats.reduce(
    (acc, seat) => {
      const arr = acc[seat.section] ?? [];
      arr.push(seat);
      acc[seat.section] = arr;
      return acc;
    },
    {} as Record<string, SeatData[]>,
  );

  const mapView = (
    <div className="space-y-6" role="grid" aria-label="Seat map">
      {Object.entries(sections).map(([sectionName, sectionSeats]) => {
        // Group by row within section
        const rows = sectionSeats.reduce(
          (acc, seat) => {
            const arr = acc[seat.row] ?? [];
            arr.push(seat);
            acc[seat.row] = arr;
            return acc;
          },
          {} as Record<string, SeatData[]>,
        );

        return (
          <div key={sectionName} role="rowgroup" aria-label={`Section ${sectionName}`}>
            <h3 className="text-h4 font-medium mb-2">Section {sectionName}</h3>
            <div className="space-y-1">
              {Object.entries(rows).map(([rowName, rowSeats]) => (
                <div key={rowName} className="flex items-center gap-2" role="row">
                  <span className="w-6 text-caption text-muted" aria-hidden>
                    {rowName}
                  </span>
                  <div className="flex gap-1" role="group" aria-label={`Row ${rowName}`}>
                    {rowSeats
                      .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                      .map((seat) => (
                        <Seat
                          key={seat.id}
                          section={sectionName}
                          row={rowName}
                          number={seat.number}
                          priceCents={seat.priceCents}
                          status={seat.status}
                          selected={selectedSeatIds.includes(seat.id)}
                          onSelect={() => onSeatSelect(seat.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const listView = (
    <Table aria-label="Available seats">
      <TableHeader>
        <TableRow>
          <TableHead>Section</TableHead>
          <TableHead>Row</TableHead>
          <TableHead>Seat</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Select</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {seats
          .filter((s) => s.status === 'AVAILABLE')
          .sort((a, b) => a.section.localeCompare(b.section) || a.row.localeCompare(b.row) || parseInt(a.number) - parseInt(b.number))
          .map((seat) => (
            <TableRow key={seat.id}>
              <TableCell>{seat.section}</TableCell>
              <TableCell>{seat.row}</TableCell>
              <TableCell>{seat.number}</TableCell>
              <TableCell>${(seat.priceCents / 100).toFixed(2)}</TableCell>
              <TableCell className="capitalize">{seat.status.toLowerCase()}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant={selectedSeatIds.includes(seat.id) ? 'primary' : 'outline'}
                  onClick={() => onSeatSelect(seat.id)}
                >
                  {selectedSeatIds.includes(seat.id) ? 'Selected' : 'Select'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')}>
        <TabsList>
          <TabsTrigger value="map">Map view</TabsTrigger>
          <TabsTrigger value="list">List view</TabsTrigger>
        </TabsList>
        <TabsContent value="map">{mapView}</TabsContent>
        <TabsContent value="list">{listView}</TabsContent>
      </Tabs>
    </div>
  );
}
