FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN pip install --upgrade pip

COPY packages/common /app/packages/common
COPY apps/deployment-service /app/apps/deployment-service

RUN pip install -e /app/packages/common
RUN pip install -e /app/apps/deployment-service

EXPOSE 8006

CMD ["uvicorn", "encore_deployment.main:app", "--host", "0.0.0.0", "--port", "8006"]
