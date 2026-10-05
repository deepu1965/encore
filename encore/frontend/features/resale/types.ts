export type ListingStatus = 'LISTED' | 'ACTIVE' | 'MATCHING' | 'MATCHED' | 'COMPLETED' | 'CANCELLED';
export type TradeStatus = 'PENDING_MATCH' | 'SETTLING' | 'COMPLETED' | 'FAILED';

export interface ResaleEventSummary {
  id: string;
  name: string;
  venue: string;
  venueName?: string;
  city?: string;
  startsAt?: string;
  activeListings: number;
  minPriceCents?: number;
  maxPriceCents?: number;
}

export interface ResaleListing {
  listingId: string;
  eventId: string;
  ticketId: string;
  sellerId: string;
  askPriceCents: number;
  status: ListingStatus;
  createdAt: string;
  section: string;
  row: string;
  seatNumber: string;
}

export interface ResaleTrade {
  tradeId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  ticketId: string;
  priceCents: number;
  status: TradeStatus;
  createdAt: string;
  // Settlement steps
  paymentCharged: boolean;
  sellerCredited: boolean;
  ownershipTransferred: boolean;
}

export const resaleKeys = {
  all: () => ['resale'] as const,
  allListings: () => ['resale', 'listings'] as const,
  eventListings: (eventId: string) => ['resale', 'listings', 'event', eventId] as const,
  listing: (id: string) => ['resale', 'listings', id] as const,
  myListings: () => ['resale', 'my-listings'] as const,
  myTrades: () => ['resale', 'my-trades'] as const,
  trade: (id: string) => ['resale', 'trades', id] as const,
};
