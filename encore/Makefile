COMPOSE_FILE := infrastructure/docker/docker-compose.yml

.PHONY: up down logs ps test-common lint-common test-cache lint-cache

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

install-api: ## Install api-gateway + its local dependency (encore-common, encore-cache)
	pip install -e packages/common
	pip install -e packages/cache
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
