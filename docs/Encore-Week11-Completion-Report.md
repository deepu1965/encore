# Week 11 Completion Report: Wallet + Resale Data Layer

**Status:** Complete

**Goals Delivered:**
1. **Wallet Service:** Created models and schema for `Wallet` and `WalletLedger` to provide an immutable ledger for store credit.
2. **Cancellation Flow Support:** Designed `/api/v1/wallet/transaction` to handle CREDIT/DEBIT with idempotency.
3. **Resale Engine Data Layer:** Created `ResaleListing` and `ResaleOrder` models properly partitioned by `event_id` to enable per-event order-book isolation.
4. **Resale APIs:** Added basic `POST /listings` and `POST /orders` endpoints.

The architecture isolates the resale data layer in preparation for Week 12's Price-Time Priority Matching Engine.
