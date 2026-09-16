FROM python:3.12-slim

WORKDIR /app

COPY packages/common/ /app/packages/common/
COPY apps/analytics-worker/ /app/apps/analytics-worker/

RUN pip install --no-cache-dir \
    /app/packages/common \
    /app/apps/analytics-worker

CMD ["python", "-m", "encore_analytics_worker.worker"]
