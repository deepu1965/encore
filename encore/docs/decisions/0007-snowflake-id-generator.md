# ADR-0007: Snowflake-Style Distributed ID Generator

**Status:** Accepted
**Date:** 2026-08-27
**Deciders:** project author (solo project)

## Context

The vertical-slice plan deferred Snowflake IDs from Week 2, where Order and
Ticket PKs used `uuid4()` as a placeholder. Week 4 introduces the real ID
generator. The key requirements:

1. **Globally unique** across workers without coordination.
2. **Sortable by generation time** for B-tree index efficiency.
3. **No network dependency** — generation must be local (no DB sequence lock).
4. **Embeds a timestamp** for operational debugging without a DB lookup.

## Decision

### Snowflake-Style 64-Bit ID

Bit layout:

```
 63        22 21     12 11       0
 ┌──────────┬──────────┬──────────┐
 │ timestamp│ worker_id│ sequence │
 │  41 bits │  10 bits │  12 bits │
 └──────────┴──────────┴──────────┘
```

- **Timestamp (41 bits):** ms since `2024-01-01T00:00:00Z`. Gives ~69 years
  of IDs before overflow.
- **Worker ID (10 bits):** 0-1023, from `SNOWFLAKE_WORKER_ID` env var. Unique
  per process in a multi-process deployment.
- **Sequence (12 bits):** 0-4095 per ms per worker. Handles 4M+ IDs/sec/worker.

**Why not UUID4?**
Random UUIDs cause random B-tree page splits on every insert into high-write
tables (`orders`, `tickets`, `trades`). At scale this causes "index bloat" and
degrades write throughput. Snowflake IDs are time-sorted: new rows always
append to the right end of the B-tree, eliminating split pressure.

**Why not ULID or UUID v7?**
Both are valid alternatives. Snowflake was chosen because:
- It is the industry standard for distributed ticketing / high-throughput
  event systems (Twitter, Discord, Instagram).
- The worker-ID field explicitly addresses multi-process uniqueness without
  a random component.
- It demonstrates understanding of distributed ID design (a common system
  design interview topic relevant to this portfolio project).

### Transitional Storage: UUID Column

The existing schema uses Postgres `UUID` columns for Order and Ticket PKs.
Week 4 stores Snowflake IDs as `uuid.UUID` objects with the 64-bit value
packed into the lower 64 bits (upper 64 bits = 0).

This requires **zero schema changes**. The resulting values are always of
the form `00000000-0000-0000-xxxx-xxxxxxxxxxxx` — visually distinct from
random UUIDs and correctly accepted by UUID column types.

A dedicated `BIGINT` PK migration is deferred to the schema-hardening phase
(Week 15+) when the performance benefit of native integer keys over the
current UUID representation can be measured and justified with benchmark data.

## Consequences

**Positive:**
- Time-sorted inserts reduce B-tree index splits for high-write tables.
- Embedded timestamp enables operational debugging without DB round-trips.
- No coordination required — generation is local and lock-free (per-thread).
- Thread-safe via a single `threading.Lock` — correct under concurrent load.
- Clock-skew handled by spin-wait (not silent duplicate emission).

**Negative / accepted tradeoffs:**
- UUID columns store 128-bit values; Snowflake IDs only use 64 bits —
  64 bits wasted per row. Acceptable until the `BIGINT` migration.
- Sort order for IDs generated in the same millisecond is worker-then-sequence,
  not pure time order. This is fine for the use case.
- Clock dependency: if the system clock is severely skewed or reset, IDs
  could temporarily be non-monotonic (the spin-wait handles this, but does
  not prevent it from taking arbitrarily long in extreme cases).

## Related

`packages/id-generator/`, `docs/architecture/v1-scope-freeze.md`
