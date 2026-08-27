COMPOSE_FILE := infrastructure/docker/docker-compose.yml

.PHONY: up down logs ps \
        test-common lint-common \
        test-cache lint-cache \
        test-rate-limiter lint-rate-limiter \
        test-id-generator lint-id-generator \
        test-event-contracts lint-event-contracts \
        test-kafka-client lint-kafka-client \
        install-api migrate seed run-api test-api lint-api \
        create-topics

up: ## Start local infra (Postgres, Redis, Kafka)
	docker compose -f $(COMPOSE_FILE) up -d

down: ## Stop local infra
	docker compose -f $(COMPOSE_FILE) down

logs: ## Tail infra logs
	docker compose -f $(COMPOSE_FILE) logs -f

ps: ## Show infra container status
	docker compose -f $(COMPOSE_FILE) ps

test-common: ## Run packages/common's test suite
	cd packages/common && pip install -e ".[dev]" -q && pytest -v

lint-common: ## Lint packages/common
	cd packages/common && ruff check .

test-cache: ## Run packages/cache's test suite
	cd packages/cache && pip install -e ".[dev]" -q && pytest -v

lint-cache: ## Lint packages/cache
	cd packages/cache && ruff check .

test-rate-limiter: ## Run packages/rate-limiter's test suite
	cd packages/rate-limiter && pip install -e ".[dev]" -q && pytest -v

lint-rate-limiter: ## Lint packages/rate-limiter
	cd packages/rate-limiter && ruff check .

test-id-generator: ## Run packages/id-generator's test suite
	cd packages/id-generator && pip install -e ".[dev]" -q && pytest -v

lint-id-generator: ## Lint packages/id-generator
	cd packages/id-generator && ruff check .

install-api: ## Install api-gateway + all local dependencies
	pip install -e packages/common
	pip install -e packages/cache
	pip install -e packages/rate-limiter
	pip install -e packages/id-generator
	pip install -e packages/event-contracts
	pip install -e packages/kafka-client
	cd apps/api-gateway && pip install -e ".[dev]"

migrate: ## Apply Alembic migrations against the running Postgres container
	cd apps/api-gateway && alembic upgrade head

seed: ## Seed demo venue/event/seats (prints the demo user id to use as a Bearer token)
	cd apps/api-gateway && python -m scripts.seed

run-api: ## Run api-gateway locally with reload (needs `make up` + `make migrate` first)
	cd apps/api-gateway && uvicorn encore_gateway.main:app --reload

test-api: ## Run api-gateway's test suite
	cd apps/api-gateway && pytest -v

lint-api: ## Lint api-gateway
	cd apps/api-gateway && ruff check .

test-event-contracts: ## Run packages/event-contracts's test suite
	cd packages/event-contracts && pip install -e ".[dev]" -q && pytest -v

lint-event-contracts: ## Lint packages/event-contracts
	cd packages/event-contracts && ruff check .

test-kafka-client: ## Run packages/kafka-client's test suite
	cd packages/kafka-client && pip install -e ".[dev]" -q && pytest -v

lint-kafka-client: ## Lint packages/kafka-client
	cd packages/kafka-client && ruff check .

create-topics: ## Create required Kafka topics
	cd apps/api-gateway && python -m scripts.create_topics
