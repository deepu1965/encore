FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy common packages
COPY packages /app/packages

# Copy service code
COPY apps/resale-engine /app/apps/resale-engine

WORKDIR /app/apps/resale-engine

# Install dependencies
RUN pip install --no-cache-dir -e ../../packages/common
RUN pip install --no-cache-dir -e ../../packages/id-generator
RUN pip install --no-cache-dir -e ../../packages/event-contracts
RUN pip install --no-cache-dir -e ../../packages/kafka-client
RUN pip install --no-cache-dir .

EXPOSE 8007

CMD ["uvicorn", "encore_resale_engine.main:app", "--host", "0.0.0.0", "--port", "8007"]
