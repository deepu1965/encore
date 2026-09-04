# ADR-0005: Transitional Checkout Orchestrator Shared Database

**Status:** Accepted
**Date:** 2026-09-02
**Deciders:** project author (solo project)

## Context

In Week 11, we are extracting the Checkout Orchestrator from the API Gateway into its own dedicated microservice (`checkout-service`). The Checkout Orchestrator is responsible for managing the distributed saga for ticket purchases, which requires reading and mutating the state of Orders, Inventory, Tickets, and AuditEvents.

In a fully decomposed microservice architecture, these entities would be owned by their respective microservices (e.g., `order-service`, `inventory-service`, `ticket-service`), and the Checkout Orchestrator would interact with them exclusively via HTTP or gRPC APIs. However, extracting all of these services simultaneously would be a massive leap, violating ADR-0003 (Thin Vertical Slice Before Depth) and drastically slowing down development velocity.

## Decision

We will extract the `checkout-service` as a standalone daemon, but it will continue to connect directly to the shared `encore` PostgreSQL database as an interim, transitional step. 

Crucially, the `checkout-service` will NOT scatter raw SQL queries throughout the orchestrator logic. Instead, it must access the database strictly through **explicit Repository interfaces** (e.g., `OrderRepository`, `InventoryRepository`).

## Rationale

1. **Velocity vs Purity:** Creating full `order-service` and `inventory-service` boundaries now would require scaffolding multiple new applications, defining complex HTTP/gRPC contracts, and managing distributed transactions prematurely.
2. **Encapsulation Preparation:** By forcing the use of Repository interfaces, we decouple the orchestrator's business logic from the underlying data store. The business logic only knows it is calling `repository.mark_order_completed(order_id)`.
3. **Future Migration Path:** When we are ready to extract `order-service` or `inventory-service`, we will simply replace the SQLAlchemy implementations of these Repository interfaces with HTTP/gRPC client implementations. The orchestrator logic will remain completely unchanged.

## Consequences

**Positive:**
- Immediate extraction of the Checkout Orchestrator into an independently deployable and scalable service.
- Business logic is strictly separated from data access via Repository patterns.
- Clear, well-defined path to future microservice extraction.

**Negative / accepted tradeoffs:**
- The `checkout-service` and `api-gateway` still share a database, which is an anti-pattern in strict microservices. This is explicitly documented as a transitional state.
- Duplicate ORM models temporarily exist in both `api-gateway` and `checkout-service`.
