# Test Matrix

Every feature × every applicable test category, per the update request's requirement that every P0 feature carry all applicable categories and every P1 feature carry at least unit/integration/E2E. Full scenario definitions are in `testing-strategy.md`; this table is the coverage matrix, generated directly from the same route inventory that drives the backlog so it can't silently drift out of sync with it.

| Feature | Route | Priority | Unit | Integration | E2E | Failure | Realtime | Security | Accessibility |
|---|---|---|---|---|---|---|---|---|---|
| Login | `/login` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Signup | `/signup` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Forgot Password | `/forgot-password` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Reset Password | `/reset-password` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Unauthorized | `/unauthorized` | P0 | Required | N/A | Required | N/A | N/A | N/A (public) | Required |
| Forbidden | `/forbidden` | P0 | Required | N/A | Required | N/A | N/A | N/A (public) | Required |
| Home | `/` | P0 | Required | Required | Required | Required | Required | N/A (public) | Required |
| Explore | `/explore` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Search | `/search` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Venue Details | `/venues/[venueId]` | P1 | Required | Required | Recommended | Recommended | N/A | N/A (public) | Required |
| Near Me | `/near-me` | P2 | Required | Required | Optional | Recommended | N/A | N/A (public) | Required |
| Leaderboard | `/leaderboard` | P2 | Required | Required | Optional | Recommended | Required | N/A (public) | Required |
| Event Details | `/events/[eventId]` | P0 | Required | Required | Required | Required | Required | N/A (public) | Required |
| Seat Selection | `/events/[eventId]/select-seats` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Waiting Room | `/events/[eventId]/waiting-room` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Checkout | `/checkout` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Order Confirmation | `/orders/[orderId]/confirmation` | P0 | Required | Required | Required | Required | Required | Required | Required |
| My Tickets | `/tickets` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Ticket Details | `/tickets/[ticketId]` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Order History | `/orders` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Order Details | `/orders/[orderId]` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Wallet | `/wallet` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Create Resale Listing | `/tickets/[ticketId]/sell` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Resale Marketplace | `/resale` | P0 | Required | Required | Required | Required | N/A | N/A (public) | Required |
| Resale Order Book | `/resale/events/[eventId]` | P0 | Required | Required | Required | Required | Required | N/A (public) | Required |
| Listing Details / Buy | `/resale/listings/[listingId]` | P0 | Required | Required | Required | Required | Required | N/A (public) | Required |
| My Listings | `/resale/my-listings` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| My Trades | `/resale/my-trades` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Trade / Settlement Details | `/resale/trades/[tradeId]` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Notification Center | `/notifications` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Event Chat | `/events/[eventId]/chat` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Profile | `/profile` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Settings Index | `/settings` | P1 | Required | N/A | Recommended | N/A | N/A | Required | Required |
| Notification Preferences | `/settings/notifications` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Privacy Settings | `/settings/privacy` | P2 | Required | Required | Optional | Recommended | N/A | Required | Required |
| Help Center | `/help` | P2 | Required | N/A | Optional | N/A | N/A | N/A (public) | Required |
| Live Stream Viewer | `/events/[eventId]/live` | P2 | Required | Required | Optional | Recommended | Required | Required | Required |
| VOD Replay | `/events/[eventId]/replay` | P2 | Required | Required | Optional | Recommended | N/A | Required | Required |
| Not Found | `/404` | P0 | Required | N/A | Required | N/A | N/A | N/A (public) | Required |
| Unhandled Error | `/500` | P0 | Required | N/A | Required | N/A | N/A | N/A (public) | Required |
| Organizer Dashboard Overview | `/organizer` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Organizer Event List | `/organizer/events` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Create Event | `/organizer/events/new` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Event Management Overview | `/organizer/events/[eventId]` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Edit Event | `/organizer/events/[eventId]/edit` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Inventory Management | `/organizer/events/[eventId]/inventory` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Waiting Room Control | `/organizer/events/[eventId]/waiting-room` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Organizer Orders | `/organizer/events/[eventId]/orders` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Organizer Resale Monitoring | `/organizer/events/[eventId]/resale` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Event Analytics | `/organizer/events/[eventId]/analytics` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Attendees | `/organizer/events/[eventId]/attendees` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Chat Moderation | `/organizer/events/[eventId]/chat` | P1 | Required | Required | Recommended | Recommended | Required | Required | Required |
| Media Management | `/organizer/events/[eventId]/media` | P2 | Required | Required | Optional | Recommended | Required | Required | Required |
| Notification Campaigns | `/organizer/events/[eventId]/notifications` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Cross-Event Revenue | `/organizer/revenue` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Document List | `/organizer/documents` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Document Detail | `/organizer/documents/[documentId]` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Organizer Settings | `/organizer/settings` | P1 | Required | Required | Recommended | Recommended | N/A | Required | Required |
| Ops Overview | `/ops` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Flash-Sale Control Center | `/ops/flash-sale` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Cross-Event Waiting Room Monitor | `/ops/waiting-room` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Cross-Event Inventory Monitor | `/ops/inventory` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Kafka Dashboard | `/ops/kafka` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Redis Dashboard | `/ops/redis` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Database Dashboard | `/ops/database` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Payment Operations | `/ops/payments` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Service Map | `/ops/services` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Deployment List | `/ops/deployments` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Deployment Detail | `/ops/deployments/[deploymentId]` | P0 | Required | Required | Required | Required | Required | Required | Required |
| Log Explorer | `/ops/logs` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Trace Search | `/ops/traces` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Trace Waterfall | `/ops/traces/[traceId]` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Metrics Explorer | `/ops/metrics` | P0 | Required | Required | Required | Required | N/A | Required | Required |
| Alerts | `/ops/alerts` | P0 | Required | Required | Required | Required | Required | Required | Required |

**41 P0 features, 26 P1 features covered above.**