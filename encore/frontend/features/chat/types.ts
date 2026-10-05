export interface ChatMessage {
  id: string;
  sequenceId: number;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRemoved: boolean;
}

export interface ChatPresence {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeenAt: string;
}

export const chatKeys = {
  history: (eventId: string) => ['chat', eventId, 'history'] as const,
  presence: (eventId: string) => ['chat', eventId, 'presence'] as const,
};
