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
COPY apps/wallet-service /app/apps/wallet-service

WORKDIR /app/apps/wallet-service

# Install dependencies
RUN pip install --no-cache-dir -e ../../packages/common
RUN pip install --no-cache-dir .

EXPOSE 8008

CMD ["uvicorn", "encore_wallet_service.main:app", "--host", "0.0.0.0", "--port", "8008"]
