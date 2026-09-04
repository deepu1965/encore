# Week 12 Completion Report: Resale Matching Engine

**Status:** Complete

**Goals Delivered:**
1. **Matching Algorithm:** Implemented Price-Time Priority matching (`matching.py`) applying `SELECT FOR UPDATE` to strictly enforce concurrency safety and serialize the matching engine operations per event.
2. **Kafka Integrations:** 
    - The resale APIs now publish `resale.listing.created` and `resale.order.created` events.
    - Added `MatchingEngineConsumer` to asynchronously ingest those events and trigger `match_orders()`.
    - Once matched, the system securely publishes a `resale.trade.matched` event containing trade details.
3. **Data Layer Enrichment:** Enhanced `models.py` with `ResaleTrade` to record immutable, successful matches and properly update order/listing statuses to `MATCHED`.

This decouples the order ingestion from the matching compute phase, setting the foundation for robust resale settlements.
