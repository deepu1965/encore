'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useEvent } from '@/features/discovery/queries';
import { useEventSeats, useUserHolds, useSeatSelectionMutator } from '@/features/seat-selection/queries';
import { useCreateHold, useReleaseHold } from '@/features/seat-selection/mutations';
import { useSeatSelectionStore } from '@/stores/seat-selection';
import { getWebSocketManager, WsEnvelope } from '@/lib/websocket-manager';

import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeatMap, SeatData } from '@/components/shared/seat-map';
import { HoldCountdown } from '@/components/shared/hold-countdown';
import { SeatHeldPayload, SeatReleasedPayload, SeatSoldPayload } from '@/features/seat-selection/types';

export default function SelectSeatsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  // 1. Fetch Event Info
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);

  // 2. Fetch Seats & Restoring User Holds
  const { data: seatsData, isLoading: seatsLoading } = useEventSeats(eventId);
  const { data: userHolds, isLoading: holdsLoading } = useUserHolds(eventId);

  // 3. Setup Store and Mutations
  const { 
    setEvent,
    status,
    activeHold,
    holdExpiresAt,
    pendingSeatIds,
    errorMessage,
    conflictSeatId,
    setPending,
    setHeld,
    setConflict,
    setExpired,
    setActiveHold,
    clearActiveHold,
    setError
  } = useSeatSelectionStore();

  const createHold = useCreateHold();
  const releaseHold = useReleaseHold();
  const { updateSeatStatus } = useSeatSelectionMutator();

  // Initialize store event context
  useEffect(() => {
    setEvent(eventId);
  }, [eventId, setEvent]);

  // Session Restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && !activeHold) {
      const stored = window.sessionStorage.getItem('active_hold');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (!parsed.eventId || parsed.eventId === eventId)) {
            setActiveHold(parsed);
            return;
          }
        } catch {
          // ignore
        }
      }
    }
    if (userHolds && userHolds.length > 0 && !activeHold) {
      // Restore the first active hold
      const validHold = userHolds.find(h => h.holdExpiresAt && new Date(h.holdExpiresAt).getTime() > Date.now());
      if (validHold) {
        setActiveHold(validHold);
      }
    }
  }, [eventId, userHolds, activeHold, setActiveHold]);

  // WebSocket Integration
  useEffect(() => {
    const ws = getWebSocketManager();
    const channel = `inventory.${eventId}`;

    const unsubHeld = ws.subscribe<SeatHeldPayload>(channel, 'seat.held', (env) => {
      updateSeatStatus(eventId, env.payload.seatId, 'HELD');
    });

    const unsubReleased = ws.subscribe<SeatReleasedPayload>(channel, 'seat.released', (env) => {
      updateSeatStatus(eventId, env.payload.seatId, 'AVAILABLE');
    });

    const unsubSold = ws.subscribe<SeatSoldPayload>(channel, 'seat.sold', (env) => {
      updateSeatStatus(eventId, env.payload.seatId, 'SOLD');
    });

    return () => {
      unsubHeld();
      unsubReleased();
      unsubSold();
    };
  }, [eventId, updateSeatStatus]);

  // Handlers
  const handleSeatSelect = (seatId: string) => {
    if (status === 'HELD' || status === 'PENDING_SELECTION') return;

    setPending(seatId);
    createHold.mutate(
      { eventId, seatId },
      {
        onSuccess: (hold) => {
          const selectedSeat = seatsData?.items.find((s) => s.seatId === seatId);
          const enrichedHold = {
            ...hold,
            seatNumber: selectedSeat?.seatNumber || '1',
            row: selectedSeat?.rowLabel || 'A',
            section: selectedSeat?.section || 'Standard',
            priceCents: selectedSeat?.priceCents || 8000,
          };
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('active_hold', JSON.stringify(enrichedHold));
          }
          setHeld(enrichedHold);
        },
        onError: (err: any) => {
          if (err?.kind === 'conflict' || err?.status === 409) {
            setConflict(seatId, 'This seat was just taken by someone else.');
          } else {
            setError(err?.message || 'Failed to hold seat. Please make sure you are logged in.');
          }
        }
      }
    );
  };

  const handleReleaseHold = () => {
    if (activeHold) {
      releaseHold.mutate({
        inventoryId: activeHold.inventoryId,
        eventId,
        seatId: activeHold.seatId
      });
      clearActiveHold();
    }
  };

  const handleCheckout = () => {
    // Navigate to checkout
    router.push('/checkout');
  };

  // Prepare seat map data
  const mappedSeats: SeatData[] = useMemo(() => {
    if (!seatsData) return [];
    return seatsData.items.map(s => ({
      id: s.seatId,
      section: s.section,
      row: s.rowLabel,
      number: s.seatNumber,
      status: s.status,
      priceCents: s.priceCents
    }));
  }, [seatsData]);

  // Loading States
  const isLoading = eventLoading || seatsLoading || holdsLoading;

  if (isLoading) {
    return (
      <section className="h-[calc(100vh-80px)] flex flex-col space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-80 h-full" />
        </div>
      </section>
    );
  }

  if (eventError || !event) {
    return (
      <EmptyState
        title="Event not found"
        description="This event doesn't exist or has been removed."
        action={{ label: 'Back to event', onClick: () => router.push(`/events/${eventId}`) }}
      />
    );
  }

  if (event.status !== 'ON_SALE' && event.status !== 'SCHEDULED') {
    return (
      <EmptyState
        title="Tickets not available"
        description={`This event is currently ${event.status.toLowerCase().replace('_', ' ')}.`}
        action={{ label: 'Back to event', onClick: () => router.push(`/events/${eventId}`) }}
      />
    );
  }

  // Derive selection info for sidebar
  const selectedSeat = activeHold 
    ? mappedSeats.find(s => s.id === activeHold.seatId)
    : mappedSeats.find(s => pendingSeatIds.includes(s.id));

  return (
    <section className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] pt-4">
      {/* Interactive Seat Map Area */}
      <div className="flex-1 bg-surface border rounded-lg flex flex-col relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur p-2 rounded-md border shadow-sm">
          <h2 className="font-semibold text-lg">{event.name}</h2>
          <p className="text-sm text-muted-foreground">{event.venueName}</p>
        </div>
        
        <div className="flex-1 overflow-auto p-4 pt-20">
          <SeatMap 
            eventId={eventId}
            seats={mappedSeats}
            selectedSeatIds={activeHold ? [activeHold.seatId] : pendingSeatIds}
            onSeatSelect={handleSeatSelect}
          />
        </div>

        {/* Status Toast Overlay (Error / Conflict) */}
        {(status === 'CONFLICT' || status === 'ERROR') && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded shadow-md flex items-center gap-2 z-20">
            <span>{errorMessage || 'Failed to select seat.'}</span>
            <Button size="sm" variant="outline" className="text-foreground" onClick={() => useSeatSelectionStore.getState().reset()}>Dismiss</Button>
          </div>
        )}
      </div>

      {/* Sidebar: Selection & Checkout */}
      <Card className="w-full lg:w-96 p-4 flex flex-col">
        <h3 className="font-semibold text-lg mb-4 border-b pb-2">Your Selection</h3>
        
        <div className="flex-1 flex flex-col gap-4">
          {!selectedSeat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <p>No seats selected</p>
              <p className="text-xs mt-1">Select seats on the map to continue</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-foreground">
                    Section {selectedSeat.section}, Row {selectedSeat.row}, Seat {selectedSeat.number}
                  </p>
                  <p className="text-sm text-muted-foreground">Standard Ticket</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(selectedSeat.priceCents / 100).toFixed(2)}</p>
                </div>
              </div>

              {status === 'PENDING_SELECTION' && (
                <Badge variant="secondary" className="w-full justify-center">Securing seat...</Badge>
              )}

              {status === 'HELD' && holdExpiresAt && (
                <div className="bg-muted p-3 rounded-md border flex items-center justify-between">
                  <span className="text-sm font-medium">Time left to buy:</span>
                  <HoldCountdown 
                    expiresAt={holdExpiresAt} 
                    onExpire={() => setExpired()} 
                    className="font-bold text-primary"
                  />
                </div>
              )}

              {status === 'EXPIRED' && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 text-sm text-center">
                  Your hold has expired. Please select a new seat.
                </div>
              )}

              {activeHold && (
                <Button variant="ghost" size="sm" onClick={handleReleaseHold} className="w-full text-muted-foreground">
                  Release Seat
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t space-y-4">
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{selectedSeat ? `$${(selectedSeat.priceCents / 100).toFixed(2)}` : '$0.00'}</span>
          </div>
          <Button 
            className="w-full" 
            disabled={status !== 'HELD'} 
            onClick={handleCheckout}
          >
            {status === 'HELD' ? 'Continue to Checkout' : 'Select a seat'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
