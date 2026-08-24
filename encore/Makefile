COMPOSE_FILE := infrastructure/docker/docker-compose.yml

.PHONY: up down logs ps test-common lint-common

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
