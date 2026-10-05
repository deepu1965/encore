export type WaitingRoomStatus = 'JOINING' | 'QUEUED' | 'ADMITTED' | 'EXPIRED' | 'EVENT_CLOSED';

export interface WaitingRoomEntry {
  entryId: string;
  eventId: string;
  userId: string;
  position: number;
  estimatedWaitSeconds: number | null;
  status: WaitingRoomStatus;
  joinedAt: string;
}

export interface JoinWaitingRoomPayload {
  eventId: string;
}

// WebSocket Payloads
export interface PositionUpdatedPayload {
  entryId: string;
  position: number;
  estimatedWaitSeconds: number | null;
}

export interface EntryAdmittedPayload {
  entryId: string;
  admittedAt: string;
}

export interface EntryExpiredPayload {
  entryId: string;
  expiredAt: string;
}

export interface EventClosedPayload {
  eventId: string;
  closedAt: string;
}

export const waitingRoomKeys = {
  entry: (entryId: string) => ['waiting-room', 'entry', entryId] as const,
};
