'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEvent } from '@/features/discovery/queries';
import { useWaitingRoomEntry, useJoinWaitingRoom, useWaitingRoomMutator } from '@/features/waiting-room';
import { getWebSocketManager } from '@/lib/websocket-manager';
import type { 
  WaitingRoomEntry,
  PositionUpdatedPayload, 
  EntryAdmittedPayload, 
  EntryExpiredPayload, 
  EventClosedPayload 
} from '@/features/waiting-room';

import { QueuePosition } from '@/components/shared/queue-position';
import { QueueProgress } from '@/components/shared/queue-progress';
import { RateLimitBanner } from '@/components/shared/rate-limit-banner';
import { ReconnectingBadge } from '@/components/shared/reconnecting-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  
  const [entryId, setEntryId] = useState<string | null>(null);
  const [localEntry, setLocalEntry] = useState<WaitingRoomEntry | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [wsConnected, setWsConnected] = useState(true); // default true for initial render

  const { data: entry, isLoading: entryLoading, error: entryError } = useWaitingRoomEntry(entryId);
  const joinMutation = useJoinWaitingRoom();
  const { updateEntry } = useWaitingRoomMutator();

  const currentEntry = entry || localEntry;
  const isJoining = useRef(false);

  useEffect(() => {
    // 1. Try to restore session
    const storedEntry = sessionStorage.getItem(`waiting_room_${eventId}`);
    if (storedEntry) {
      setEntryId(storedEntry);
      setHasJoined(true);
      return;
    }

    // 2. Otherwise join if not already joining
    if (!isJoining.current && !hasJoined) {
      isJoining.current = true;
      joinMutation.mutateAsync({ eventId })
        .then((data) => {
          setEntryId(data.entryId);
          setLocalEntry(data);
          setHasJoined(true);
          sessionStorage.setItem(`waiting_room_${eventId}`, data.entryId);
        })
        .catch((err: any) => {
          isJoining.current = false;
          if (err?.status === 429) {
            setRateLimited(true);
          }
        });
    }
  }, [eventId, hasJoined, joinMutation]);

  // WebSocket Integration
  useEffect(() => {
    if (!entryId) return;

    const ws = getWebSocketManager();
    const channel = `waiting-room.${entryId}`;

    // Track connection status roughly
    const subStatus = ws.status.subscribe((status) => {
      setWsConnected(status === 'connected');
    });

    const unsubPos = ws.subscribe<PositionUpdatedPayload>(channel, 'position.updated', (env) => {
      updateEntry(entryId, { 
        position: env.payload.position, 
        estimatedWaitSeconds: env.payload.estimatedWaitSeconds 
      });
      setLocalEntry((prev) => prev ? {
        ...prev,
        position: env.payload.position,
        estimatedWaitSeconds: env.payload.estimatedWaitSeconds
      } : prev);
    });

    const unsubAdmitted = ws.subscribe<EntryAdmittedPayload>(channel, 'entry.admitted', (env) => {
      updateEntry(entryId, { status: 'ADMITTED' });
      setLocalEntry((prev) => prev ? { ...prev, status: 'ADMITTED' } : prev);
      // Clear session so they don't get stuck if they go back
      sessionStorage.removeItem(`waiting_room_${eventId}`);
      
      // Auto-redirect
      setTimeout(() => {
        router.push(`/events/${eventId}/select-seats`);
      }, 2000);
    });

    const unsubExpired = ws.subscribe<EntryExpiredPayload>(channel, 'entry.expired', (env) => {
      updateEntry(entryId, { status: 'EXPIRED' });
      setLocalEntry((prev) => prev ? { ...prev, status: 'EXPIRED' } : prev);
      sessionStorage.removeItem(`waiting_room_${eventId}`);
    });

    const unsubClosed = ws.subscribe<EventClosedPayload>(channel, 'event.closed', (env) => {
      updateEntry(entryId, { status: 'EVENT_CLOSED' });
      setLocalEntry((prev) => prev ? { ...prev, status: 'EVENT_CLOSED' } : prev);
      sessionStorage.removeItem(`waiting_room_${eventId}`);
    });

    return () => {
      subStatus();
      unsubPos();
      unsubAdmitted();
      unsubExpired();
      unsubClosed();
    };
  }, [entryId, eventId, updateEntry, router]);

  const handleRejoin = () => {
    sessionStorage.removeItem(`waiting_room_${eventId}`);
    window.location.reload();
  };

  if (eventLoading || (!currentEntry && !rateLimited && !entryError)) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Joining waiting room...</p>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <EmptyState
        title="Event not found"
        description="We couldn't find the event you are trying to access."
        action={{ label: 'Return to explore', onClick: () => router.push('/explore') }}
      />
    );
  }

  if (rateLimited) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <RateLimitBanner retryAfterSeconds={30} onRetry={handleRejoin} />
        <Button onClick={handleRejoin} className="w-full">Try Again</Button>
      </div>
    );
  }

  if (entryError && !currentEntry) {
    return (
      <EmptyState
        title="Session Expired"
        description="Your waiting room session is no longer valid."
        action={{ label: 'Rejoin Queue', onClick: handleRejoin }}
      />
    );
  }

  if (currentEntry?.status === 'EXPIRED') {
    return (
      <EmptyState
        title="Window Missed"
        description="You missed your window to buy tickets. You must rejoin the back of the queue."
        action={{ label: 'Rejoin Queue', onClick: handleRejoin }}
      />
    );
  }

  if (currentEntry?.status === 'EVENT_CLOSED') {
    return (
      <EmptyState
        title="Event Closed"
        description="Tickets are no longer available for this event."
        action={{ label: 'Browse other events', onClick: () => router.push('/explore') }}
      />
    );
  }

  if (currentEntry?.status === 'ADMITTED') {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-h1 font-bold text-success">It's your turn!</h1>
          <p className="text-muted-foreground">Redirecting you to seat selection...</p>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Active Queue State
  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-8 px-4">
      <div className="text-center space-y-2 relative">
        <h1 className="text-h1 font-bold">{event.name}</h1>
        <p className="text-muted-foreground text-lg">Waiting Room</p>
        {!wsConnected && (
          <div className="absolute top-0 right-0">
            <ReconnectingBadge isReconnecting={!wsConnected} />
          </div>
        )}
      </div>

      <Card className="p-8 space-y-8 flex flex-col items-center">
        <QueuePosition position={currentEntry?.position ?? 1} />
        
        <div className="w-full space-y-2 text-center">
          <p className="text-sm font-medium">
            {currentEntry?.estimatedWaitSeconds 
              ? `Estimated wait: ~${Math.ceil(currentEntry.estimatedWaitSeconds / 60)} minutes` 
              : 'Calculating estimated wait time...'}
          </p>
          <QueueProgress progress={calculateProgress(currentEntry?.position)} />
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-md">
          Please do not refresh this page. You will be automatically redirected to the ticket selection page when it's your turn.
        </p>
      </Card>
    </div>
  );
}

// Simple heuristic to show progress moving (in real app, we'd use starting position vs current)
function calculateProgress(position: number | undefined): number {
  if (!position) return 0;
  // Fallback visual trick: if position is high, bar is low. 
  // Ideally backend provides total queue size.
  if (position > 5000) return 5;
  if (position > 1000) return 20;
  if (position > 500) return 50;
  if (position > 100) return 75;
  if (position > 10) return 90;
  return 98;
}
