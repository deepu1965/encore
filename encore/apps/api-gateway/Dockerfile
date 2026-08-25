# Build context is the repo root (see infrastructure/docker/docker-compose.yml),
# not this directory, because this service depends on ../../packages/common
# and Docker can't COPY from outside its build context otherwise.
FROM python:3.12-slim

WORKDIR /app

COPY packages/common ./packages/common
COPY apps/api-gateway/pyproject.toml ./apps/api-gateway/pyproject.toml
COPY apps/api-gateway/src ./apps/api-gateway/src
COPY apps/api-gateway/migrations ./apps/api-gateway/migrations
COPY apps/api-gateway/alembic.ini ./apps/api-gateway/alembic.ini
COPY apps/api-gateway/scripts ./apps/api-gateway/scripts

RUN pip install --no-cache-dir -e ./packages/common \
    && pip install --no-cache-dir -e ./apps/api-gateway

WORKDIR /app/apps/api-gateway

EXPOSE 8000

CMD ["uvicorn", "encore_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
