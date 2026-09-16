FROM python:3.12-slim

WORKDIR /app

COPY packages/common/ /app/packages/common/
COPY apps/location-service/ /app/apps/location-service/

RUN pip install --no-cache-dir \
    /app/packages/common \
    /app/apps/location-service

EXPOSE 8004

CMD ["uvicorn", "encore_location.main:app", "--host", "0.0.0.0", "--port", "8004"]
