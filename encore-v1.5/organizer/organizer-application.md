# Organizer Application

Route-level metadata is in `../routes/route-inventory.md`.

## 1. Dashboard structure

```text
Organizer Dashboard
├── Overview, Events (list/new/detail/edit), Inventory, Waiting Room,
│   Orders, Resale, Revenue, Analytics, Attendees, Notifications,
│   Documents, Settings
```

No item on this tree lacks a backing V1 capability — the one
narrative-only capability (notification campaigns, via the job
scheduler) is a REQUIRED FRONTEND CONTRACT, not invented.

## 2. Inventory (`/organizer/events/[eventId]/inventory`)

### The rule that governs this page

**Organizer controls must respect backend transactional rules. The
frontend never allows a direct seat-status overwrite that bypasses the
AVAILABLE -> HELD -> SOLD state machine.**

| Allowed action | What it does NOT do |
|---|---|
| Set/edit price per section | Never changes a seat's AVAILABLE/HELD/SOLD status |
| Add/remove seats before an event goes on sale (`SCHEDULED` status) | Blocked entirely once status is `ON_SALE` |
| Mark seats "reserved for organizer use" (comps, press) | This is a genuinely distinct 4th inventory status (`RESERVED`), not a bypass of the 3-state machine — **backend gap G-5**, action hidden until it lands |

### Editing a live (`ON_SALE`) event's seat map

Blocked with a disabled control + tooltip: "Seat map changes are locked
once an event is on sale, to keep inventory consistent for buyers
currently checking out." Not a permissions issue — a consistency issue,
and the UI communicates that distinction.

## 3. Waiting Room Control (`/organizer/events/[eventId]/waiting-room`)

Explicit split into two visually distinct panels:

| READ-ONLY METRICS | AUTHORIZED ACTIONS |
|---|---|
| Queue length, admitted count, waiting count, estimated wait, queue throughput, event on-sale status | Adjust admission rate (within backend-enforced bounds — cannot bypass the rate limiter entirely), pause admission (emergency stop), resume admission |

Every authorized action requires a confirmation dialog before executing
— "pause admission" on a live flash sale must never fire from a
misclick.

## 4. Analytics (`/organizer/events/[eventId]/analytics`, `/organizer/revenue`)

Metrics shown are drawn only from capabilities the spec actually
supports: sales, revenue, ticket volume, resale activity, attendance,
conversion (waiting-room-admitted -> completed-purchase), queue metrics,
inventory utilization. A metric not backed by an existing capability is
marked REQUIRED FRONTEND CONTRACT or BACKEND GAP, never silently added
as if the data already existed.

## 5. Attendees (`/organizer/events/[eventId]/attendees`)

Attendee email/name visible to that event's own organizer only, never
another organizer even for a similar event — full PII rule in
`../security/security.md` §5.

## 6. Documents (`/organizer/documents`, `.../[documentId]`)

Chunked upload (5MB chunks) via a Route Handler proxy, per-chunk
progress, up to 3 retries per chunk before surfacing a failed-upload
state. Permissions map directly to the backend's OWNER/EDITOR/VIEWER
model. "Restore a previous version" is feature-flagged off until
confirmed as a real backend capability, since the spec doesn't
explicitly confirm restore is supported.

## 7. Media (`/organizer/events/[eventId]/media`)

`TranscodeStatusBadge` reflects backend transcoding state
(`PENDING`/`PROCESSING`/`READY`/`FAILED`) exactly — never showing
"processing" once the backend says READY, and never showing READY before
the backend confirms it (which would let an organizer publish a link
before the asset is playable).

## 8. Notification campaigns (`/organizer/events/[eventId]/notifications`)

Composes message + audience segment + send time; scheduling mechanics
(retry, dead-letter handling) are entirely backend-owned. Only backend-
supported audience segments are offered, never invented ones.
