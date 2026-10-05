'use client';

import { useOrganizerEvent } from '@/features/organizer';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function OrganizerEventInventoryPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { data: evt, isLoading } = useOrganizerEvent(eventId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const mockEvt = evt ?? {
    id: eventId,
    name: 'Sample Event',
    status: 'ON_SALE',
    date: new Date().toISOString(),
    venueName: 'Main Arena',
    totalCapacity: 1000,
    ticketsSold: 450,
  };

  const handleAction = (type: string) => {
    setAction(type);
    setShowConfirm(true);
  };

  const executeAction = () => {
    // API Call would go here: never bypass AVAILABLE -> HELD -> SOLD state machine
    alert(`Executed inventory action: ${action}`);
    setShowConfirm(false);
  };

  const isOnSale = mockEvt.status === 'ON_SALE';

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h3 font-bold">Inventory & Seat Map Control</h1>
        <p className="text-muted-foreground">Manage allocations, VIP holds, and seat map topology.</p>
      </div>

      {isOnSale && (
        <div className="bg-warning/20 text-warning px-4 py-3 rounded-md text-sm flex gap-2 items-center font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Seat map editing is locked because the event is currently ON_SALE. You may still manage manual holds.
        </div>
      )}

      <Card className="p-6 space-y-6">
        <h3 className="font-semibold text-lg border-b pb-2">Manual Ticket Holds (Comps / VIP)</h3>
        
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Hold Type</label>
            <Select
              placeholder="Select type..."
              options={[
                { value: 'comp', label: 'Complimentary (Artist Guest)' },
                { value: 'vip', label: 'VIP Allocation' },
                { value: 'troubleshooting', label: 'Troubleshooting Hold' },
              ]}
            />
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Quantity</label>
            <Select
              placeholder="Qty..."
              options={[
                { value: '1', label: '1 Ticket' },
                { value: '2', label: '2 Tickets' },
                { value: '4', label: '4 Tickets' },
              ]}
            />
          </div>
          <Button onClick={() => handleAction('CREATE_HOLD')}>Execute Hold</Button>
        </div>
      </Card>

      {/* Confirmation Dialog Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full space-y-6">
            <h3 className="font-bold text-lg">Confirm Action</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to execute `{action}`? This will transition tickets through the `AVAILABLE → HELD` state machine.
            </p>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={executeAction}>Confirm</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
