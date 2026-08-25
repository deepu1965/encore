# Encore

A distributed live-events ticketing and resale platform, built as a system
design portfolio project covering the ByteByteGo System Design Interview
curriculum end to end. See `docs/architecture/v1-scope-freeze.md` for the
frozen scope and `Encore_v1_v2_Updated_36_Week_Plan.xlsx` for the week-by-
week build plan this repo follows.

**Primary engineering problem:** millions of users competing for a small
amount of ticket inventory during flash-sale events, while preserving
correctness, reliability, and acceptable latency.

## Status

Week 2 — Vertical Slice. The full browse → hold → order → ticket path is
implemented end to end in `apps/api-gateway` (still a monolith — service
decomposition starts around Week 6). See `docs/decisions/` for what's been
decided so far and why.

## Repo layout

```text
encore/
├── apps/              one directory per deployable service
├── packages/          shared libraries imported by services (not services themselves)
├── infrastructure/    docker-compose, k8s manifests, broker/db config
├── tests/             unit / integration / contract / load tests that span services
├── docs/
│   ├── architecture/  service boundaries, scope freeze, Kafka conventions, vertical-slice plan
│   ├── decisions/     ADRs — the "why" behind every non-trivial choice
│   ├── api/           REST conventions
│   ├── benchmarks/    load-test results (populated from Week 25 onward)
│   └── incidents/     postmortems, if/when something breaks in a demo/load test
└── frontend/          React/Vite client
```

See `docs/architecture/service-boundaries.md` for what each service under
`apps/` is responsible for.

## Local development

```bash
# Bring up infra + api-gateway (Postgres, Redis, Kafka, api-gateway)
docker compose -f infrastructure/docker/docker-compose.yml up -d
# or: make up

# Apply migrations, then seed demo data
make install-api      # first time only — installs encore-common + api-gateway locally
make migrate
make seed             # prints a demo user id — use it as your Bearer token

# Run the API locally (outside Docker, with reload)
make run-api

# Try the vertical slice end to end:
curl http://localhost:8000/api/v1/events
curl http://localhost:8000/api/v1/events/<event_id>/seats
curl -X POST http://localhost:8000/api/v1/holds \
  -H "Authorization: Bearer <demo_user_id>" \
  -H "Idempotency-Key: demo-hold-1" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "<event_id>", "seat_id": "<seat_id>"}'
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer <demo_user_id>" \
  -H "Idempotency-Key: demo-order-1" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "<event_id>", "seat_id": "<seat_id>"}'
curl http://localhost:8000/api/v1/orders/<order_id>

# Run tests / lint for a given package
make test-common && make lint-common
make test-api && make lint-api
```

Note on auth: `Authorization: Bearer <token>` currently expects the raw
user UUID as the token — this is a deliberate, documented Week 2 shortcut,
not real authentication. See `docs/decisions/0004-fake-bearer-token-week2-auth.md`.

Copy `.env.example` to `.env` and adjust before running anything that needs
real credentials (there are none required for local dev with the default
Compose file — it's all local containers with dev-only passwords).

## Conventions to read before writing any service code

1. `docs/architecture/v1-scope-freeze.md` — what's in and out of scope.
2. `docs/architecture/service-boundaries.md` — who owns what.
3. `docs/api/api-conventions.md` — REST rules every endpoint follows.
4. `docs/architecture/kafka-conventions.md` — topic naming, envelope,
   partitioning, delivery semantics.
5. `docs/decisions/adr-template.md` — how to record a new decision.

## Versioning

Weeks 1–25 build Encore V1 (the distributed-systems platform, no AI).
Weeks 26–36 build Encore V2 (an intelligence layer — ML/RAG/agents — that
consumes V1's events/APIs and never becomes V1's source of truth). See
`docs/architecture/v1-scope-freeze.md` section 3.
