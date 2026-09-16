FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN pip install --upgrade pip

COPY packages/common /app/packages/common
COPY apps/scheduler-service /app/apps/scheduler-service

RUN pip install -e /app/packages/common
RUN pip install -e /app/apps/scheduler-service

EXPOSE 8005

CMD ["uvicorn", "encore_scheduler.main:app", "--host", "0.0.0.0", "--port", "8005"]
