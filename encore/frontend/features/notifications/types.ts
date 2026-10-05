export type NotificationType = 'TICKET_SOLD' | 'EVENT_POSTPONED' | 'TRANSFER_RECEIVED' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationKeys = {
  all: () => ['notifications'] as const,
};
