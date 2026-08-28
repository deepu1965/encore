# Build context is the repo root — same pattern as api-gateway Dockerfile.
# waiting-room depends on packages/common, event-contracts, kafka-client, id-generator.
FROM python:3.12-slim

WORKDIR /app

COPY packages/common ./packages/common
COPY packages/event-contracts ./packages/event-contracts
COPY packages/kafka-client ./packages/kafka-client
COPY packages/id-generator ./packages/id-generator
COPY apps/waiting-room/pyproject.toml ./apps/waiting-room/pyproject.toml
COPY apps/waiting-room/src ./apps/waiting-room/src

RUN pip install --no-cache-dir -e ./packages/common \
    && pip install --no-cache-dir -e ./packages/event-contracts \
    && pip install --no-cache-dir -e ./packages/kafka-client \
    && pip install --no-cache-dir -e ./packages/id-generator \
    && pip install --no-cache-dir -e ./apps/waiting-room

WORKDIR /app/apps/waiting-room

EXPOSE 8001

CMD ["uvicorn", "encore_waiting_room.main:app", "--host", "0.0.0.0", "--port", "8001"]
