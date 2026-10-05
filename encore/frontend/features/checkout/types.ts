export type PaymentStatus = 'INITIAL' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'UNKNOWN';

export interface OrderCreatePayload {
  eventId: string;
  inventoryIds: string[];
}

export interface Order {
  orderId: string;
  eventId: string;
  userId: string;
  totalCents: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  createdAt: string;
}

export interface PaymentCreatePayload {
  orderId: string;
  token: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  errorMessage?: string;
  createdAt: string;
}

export const checkoutKeys = {
  order: (orderId: string) => ['checkout', 'order', orderId] as const,
  paymentStatus: (idempotencyKey: string) => ['checkout', 'paymentStatus', idempotencyKey] as const,
};
