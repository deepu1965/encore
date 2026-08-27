"""encore-id-generator — Snowflake-style 64-bit ID generator.

Why Snowflake IDs instead of UUIDs?
─────────────────────────────────────
UUID4s are random. That means every new row you INSERT lands at a random
position in a B-tree index, which causes page splits and "index bloat" as
the table grows. For high-write tables (orders, tickets, trades) this
matters at scale.

Snowflake IDs are time-sorted: new IDs are always larger than old ones, so
inserts always append to the right end of the index — dramatically reducing
splits and improving write throughput at scale.

Additional benefits:
  - The embedded millisecond timestamp makes it trivial to answer
    "when was this order created?" from the ID alone, without a DB round-trip.
  - IDs can be generated locally (no DB sequence lock contention).
  - IDs across workers are globally unique without coordination.

Week 4 transitional note:
  IDs are stored as uuid.UUID objects (Snowflake value packed into the lower
  64 bits). This requires zero schema changes — existing UUID columns accept
  them. The upper 64 bits are always 0, so the values are clearly
  distinguishable from random UUIDs. A dedicated BIGINT column migration is
  deferred to the schema-hardening phase (Week 15+).

Public surface:
  SnowflakeID          — immutable value object (64-bit int + helpers)
  SnowflakeIDGenerator — thread-safe generator singleton
"""

from .generator import CUSTOM_EPOCH_MS, SnowflakeID, SnowflakeIDGenerator

__all__ = ["SnowflakeID", "SnowflakeIDGenerator", "CUSTOM_EPOCH_MS"]
