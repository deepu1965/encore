# Encore V1 — Scope Freeze

**Status:** Frozen (Week 1)
**Applies to:** Weeks 1–25
**Owner:** solo project — freeze reviewed and accepted by project author

This document is the single source of truth for what V1 includes and excludes.
Any change to this list after Week 1 requires a new ADR (see `docs/decisions/`)
explaining why the freeze is being broken.

## 1. Product boundary

Encore V1 is a distributed live-events ticketing and resale platform. Its
primary engineering problem is: **millions of users competing for a small
amount of ticket inventory during flash-sale events, while preserving
correctness, reliability, and acceptable latency.**

V1 is the complete distributed-systems foundation. It contains **no** ML,
GenAI, RAG, or agentic components — those are explicitly deferred to V2
(Weeks 26–36) and must not leak into V1 code paths.

## 2. In scope for V1

### 2.1 Core distributed-systems mechanics
horizontal scaling · load balancing · API gateway · rate limiting ·
consistent hashing · distributed cache · key-value storage · unique ID
generation · queues · asynchronous processing · distributed locking ·
reservation systems · payments · digital wallet · matching engine ·
sharding · replication · object storage · observability · job scheduling ·
deployment

### 2.2 Product capabilities
event search · autocomplete · event feed · event crawler · notifications ·
chat · email · media/VOD · organizer documents · proximity search ·
nearby friends · venue routing · leaderboard · ad-click aggregation ·
URL shortening

## 3. Explicitly deferred to V2 (Weeks 26–36)

demand prediction · ML-based recommendations · fraud ML · resale anomaly ML ·
pricing intelligence · RAG · LLM applications · AI operations agent ·
incident-response agent · customer-support agent · discovery agent

**Rule:** if a Week 1–25 task starts to require a model, an embedding, or an
LLM call, that's a signal the task has drifted into V2 territory — stop and
flag it rather than quietly implementing it early.

## 4. Functional requirements (frozen)

1. Browse and search events, artists, and venues.
2. Search with autocomplete.
3. Purchase tickets for normal and flash-sale events.
4. Reserve seats without double-selling.
5. Release expired holds automatically.
6. Process idempotent payments.
7. Support wallet/store credit.
8. Resell tickets using a secondary marketplace.
9. Match resale bids and asks using price-time priority.
10. Send notifications through push/SMS/email.
11. Support live event chat.
12. Stream events and provide replay/VOD.
13. Share organizer documents with permissions and versions.
14. Find nearby events.
15. Find friends attending nearby events.
16. Provide simplified venue routing/ETA.
17. Run scheduled background jobs.
18. Deploy Encore services using a controlled deployment pipeline.
19. Provide operator metrics, logs, tracing, alerts, and leaderboards.

## 5. Non-functional requirements (frozen)

| Property | Requirement |
|---|---|
| Consistency | Ticket inventory is strongly consistent — a seat is never sold twice. |
| Availability | Search, feed, notifications, and discovery data may be a few seconds stale. |
| Scalability | Must absorb extreme peak-to-trough swings caused by flash sales. |
| Performance | Sub-100ms reads for hot seat-availability checks, where feasible. |
| Reliability | Retries/failures must never lose a ticket or double-charge a payment. |
| Durability | Purchases, refunds, and resale trades require a durable audit trail. |

## 6. Capacity targets (design-time estimate, to be replaced by measured numbers in Week 25)

| Metric | Normal | Flash-sale peak |
|---|---:|---:|
| Active events on sale | 5,000 | 1 major event |
| Concurrent buyers | 50,000 | 2,000,000 |
| Checkout QPS | 500 | 50,000 |
| Seat-read QPS | 5,000 | 500,000 |
| Peak/trough ratio | — | ~1000x |

The core design constraint driving nearly every later architectural decision:
**this is not a big-data problem, it's a hot-row contention problem** —
thousands to millions of clients contending over a small number of hot
inventory records at the same instant.

## 7. Freeze acknowledgement

This scope is treated as **frozen** for the duration of V1. Expanding scope
mid-build is the single most common reason side projects stall — new ideas
get captured as a note in `docs/decisions/`, not built ad hoc.
