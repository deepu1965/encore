FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip

COPY packages/common ./packages/common
COPY packages/cache ./packages/cache
COPY packages/id-generator ./packages/id-generator
COPY packages/event-contracts ./packages/event-contracts
COPY packages/kafka-client ./packages/kafka-client

COPY apps/checkout-service/pyproject.toml ./apps/checkout-service/pyproject.toml
COPY apps/checkout-service/src ./apps/checkout-service/src

RUN pip install --no-cache-dir -e ./packages/common \
    && pip install --no-cache-dir -e ./packages/cache \
    && pip install --no-cache-dir -e ./packages/id-generator \
    && pip install --no-cache-dir -e ./packages/event-contracts \
    && pip install --no-cache-dir -e ./packages/kafka-client \
    && pip install --no-cache-dir -e ./apps/checkout-service

EXPOSE 8003

CMD ["uvicorn", "encore_checkout_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
