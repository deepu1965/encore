# ADR-004: V1 Final Architecture & Hardening

## Context
As we reach the conclusion of the V1 core system development (Week 23), the platform has scaled from a monolithic API gateway to a robust suite of microservices with distinct boundaries. We have introduced several synchronous services and asynchronous workers. It is necessary to formally document the finalized architecture, the communication boundaries, deployment abstractions, and concurrency mechanisms before entering production hardening and scope freeze.

## Decision

### 1. Final Microservice Boundaries
The system is divided into two primary types of services: **Synchronous API Services** and **Asynchronous Workers**.

**Synchronous Services:**
- `api-gateway`: Acts as the unified entry point. Handles all client traffic, performs RBAC/authentication using the mock JWT mechanism (resolving User UUIDs against the database), applies global and per-user rate limiting, and routes requests to appropriate backend services.
- `inventory-service`: Manages ticket availability and holds using a hybrid approach of PostgreSQL and Redis.
- `checkout-service`: Coordinates the ticket purchasing process.
- `payment-service`: Simulates interaction with external payment processors (e.g., Stripe).
- `location-service`: Handles spatial queries and coordinates, isolated from other services to respect data gravity.
- `deployment-service`: Manages the lifecycle of service deployments.
- `scheduler-service`: Orchestrates background jobs.

**Asynchronous Workers:**
- `media-worker`: Listens to `media.uploaded` events on Kafka and processes media files using FFmpeg, saving output back to MinIO/S3 compatible storage.
- `analytics-worker`: Consumes application events to generate metrics and insights without impacting the synchronous request path.
- `resale-engine` (Settlement/Compensations): Operates heavily on Kafka topics (`trade.matched`, `payment.failed`) using Saga patterns for eventual consistency during ticket resale.

### 2. Deployment Service Abstractions
To avoid coupling the business logic of our state machines to a specific container orchestrator (e.g., Kubernetes, Docker Swarm), the `deployment-service` uses the `DeploymentExecutor` protocol. 
For V1, we implement the `MockDeploymentExecutor`, which supports deterministic failures by analyzing the `-fail-canary`, `-fail-health`, and `-fail-rolling` suffixes in the version strings. This simulates a real orchestration lifecycle (PENDING → CANARY → HEALTH_CHECK → ROLLING → SUCCESS/ROLLED_BACK) while allowing us to swap in a real executor in V2.

### 3. PostgreSQL Advisory Locking
To guarantee that background tasks running in horizontal replicas (e.g., inventory hold expiry checks) execute safely, we utilize **PostgreSQL Advisory Locks** (`pg_advisory_xact_lock` / `pg_try_advisory_lock`).
This avoids race conditions and ensures that only one gateway/service replica processes a scheduled tick at any given time without the need for a heavy external locking coordinator (like Zookeeper or Redis Redlock) since the database is already our primary state store.

### 4. Secrets Management
All credentials and service URLs have been moved from hardcoded defaults to environment variables using `pydantic-settings`. A secure `.env.example` provides safe defaults for local development. In production, real secrets (e.g., database URIs, API keys, MinIO credentials) must be injected via the deployment orchestrator.

## Consequences

**Positive:**
- Strict separation of concerns limits the blast radius of failures.
- The `DeploymentExecutor` abstraction allows us to harden the state transitions and API without waiting for the real Kubernetes infrastructure to be finalized.
- Advisory locks keep our infrastructure dependencies low while providing robust distributed synchronization.

**Negative:**
- We continue to rely on a shared database approach for certain models (such as `users` and RBAC verification) via the API gateway proxy layer until a dedicated authentication service is extracted.
- The proliferation of services requires more robust E2E test suites and observability setups.
