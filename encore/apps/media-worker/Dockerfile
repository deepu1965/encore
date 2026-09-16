FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# We expect the repo root context so we can COPY packages/common
COPY packages/common ./packages/common
RUN pip install ./packages/common

COPY apps/media-worker ./apps/media-worker
RUN pip install ./apps/media-worker

CMD ["python", "-m", "encore_media_worker.worker"]
