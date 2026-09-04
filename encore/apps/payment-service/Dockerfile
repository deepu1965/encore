FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy common packages first (since they are referenced as local paths)
COPY packages /app/packages

# Copy service code
COPY apps/payment-service /app/apps/payment-service

WORKDIR /app/apps/payment-service

# Install dependencies
# We install the common packages first, then the service itself
RUN pip install --no-cache-dir -e ../../packages/common
RUN pip install --no-cache-dir -e ../../packages/id-generator
RUN pip install --no-cache-dir -e ../../packages/event-contracts
RUN pip install --no-cache-dir -e ../../packages/kafka-client
RUN pip install --no-cache-dir .

EXPOSE 8002

CMD ["uvicorn", "encore_payment_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
