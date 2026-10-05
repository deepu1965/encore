'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle } from 'lucide-react';

export default function OrganizerWaitingRoomPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [metrics, setMetrics] = useState({ queueLength: 0, admissionRate: 0, estimatedWait: '0m' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const ws = getWebSocketManager();
    const channel = `waiting-room.${eventId}.ops`;
    
    const unsub = ws.subscribe(channel, 'queue.metrics', (env: any) => {
      setMetrics(env.data);
    });

    return () => unsub();
  }, [eventId]);

  const handleAction = (type: string) => {
    setAction(type);
    setShowConfirm(true);
  };

  const executeAction = () => {
    alert(`Executed waiting room control: ${action}`);
    setShowConfirm(false);
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto flex flex-col h-full">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h3 font-bold">Waiting Room Control</h1>
        <p className="text-muted-foreground">Real-time metrics and manual override controls for the queue.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 flex-1">
        
        {/* READ-ONLY METRICS PANEL */}
        <Card className="p-6 space-y-6 bg-muted/10 border-primary/20">
          <h2 className="font-bold text-lg border-b pb-2">Live Metrics</h2>
          
          <div className="space-y-6">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3 text-muted-foreground">
                 <Users className="w-5 h-5" /> Queue Length
               </div>
               <span className="font-bold text-2xl">{metrics.queueLength.toLocaleString()}</span>
             </div>

             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3 text-muted-foreground">
                 <AlertTriangle className="w-5 h-5" /> Admission Rate (users/min)
               </div>
               <span className="font-bold text-2xl">{metrics.admissionRate}</span>
             </div>

             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3 text-muted-foreground">
                 <Clock className="w-5 h-5" /> Estimated Wait Time
               </div>
               <span className="font-bold text-2xl">{metrics.estimatedWait}</span>
             </div>
          </div>
        </Card>

        {/* AUTHORIZED ACTIONS PANEL */}
        <Card className="p-6 space-y-6">
          <h2 className="font-bold text-lg border-b pb-2 text-destructive">Authorized Actions</h2>
          
          <div className="space-y-4">
             <div className="p-4 border rounded-md space-y-2">
               <h3 className="font-medium">Pause Admission</h3>
               <p className="text-sm text-muted-foreground">Temporarily halt all admissions from the waiting room to the seat map.</p>
               <Button variant="outline" className="w-full" onClick={() => handleAction('PAUSE_ADMISSION')}>Pause</Button>
             </div>
             
             <div className="p-4 border rounded-md space-y-2">
               <h3 className="font-medium">Adjust Admission Rate</h3>
               <p className="text-sm text-muted-foreground">Increase or decrease the throttle.</p>
               <Button variant="outline" className="w-full" onClick={() => handleAction('ADJUST_RATE')}>Modify Throttle</Button>
             </div>

             <div className="p-4 border rounded-md space-y-2 bg-destructive/10 border-destructive/20">
               <h3 className="font-medium text-destructive">Purge Queue</h3>
               <p className="text-sm text-destructive/80">Evict all users currently in the waiting room.</p>
               <Button variant="destructive" className="w-full" onClick={() => handleAction('PURGE_QUEUE')}>Purge</Button>
             </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full space-y-6">
            <h3 className="font-bold text-lg">Confirm Control Action</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to execute `{action}`? This will directly impact live users.
            </p>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant={action === 'PURGE_QUEUE' ? 'destructive' : 'primary'} onClick={executeAction}>Confirm</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
