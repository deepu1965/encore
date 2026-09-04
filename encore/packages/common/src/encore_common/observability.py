import os
import logging
from fastapi import FastAPI
from pythonjsonlogger import jsonlogger

# Metrics
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Histogram

# Tracing
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Custom Business Metrics
RESALE_MATCHES_TOTAL = Counter("resale_matches_total", "Total successful resale matches")
INVENTORY_HOLDS_TOTAL = Counter("inventory_holds_total", "Total inventory holds requested")
PAYMENT_FAILURES_TOTAL = Counter("payment_failures_total", "Total payment failures")

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Inject OTEL trace_id and span_id if available
        span = trace.get_current_span()
        if span.is_recording():
            ctx = span.get_span_context()
            log_record["trace_id"] = format(ctx.trace_id, "032x")
            log_record["span_id"] = format(ctx.span_id, "016x")
        else:
            log_record["trace_id"] = None
            log_record["span_id"] = None

def setup_logging():
    """Configure structured JSON logging for the root logger."""
    logger = logging.getLogger()
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    logHandler = logging.StreamHandler()
    formatter = CustomJsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    logHandler.setFormatter(formatter)
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)

def setup_observability(app: FastAPI, service_name: str) -> None:
    """Initialize Metrics, Tracing, and Logging."""
    
    # 1. Structured Logging
    setup_logging()
    
    # 2. OpenTelemetry Tracing
    resource = Resource(attributes={
        "service.name": service_name
    })
    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)
    
    # Use Jaeger OTLP if ENABLE_TRACING is set (we'll just use it if endpoint is accessible)
    # Default Jaeger OTLP gRPC endpoint is localhost:4317 when running locally
    otlp_endpoint = os.environ.get("OTLP_ENDPOINT", "http://jaeger:4317")
    
    # In V1 local docker-compose, this might fail to connect if jaeger isn't up, 
    # but the BatchSpanProcessor will just drop spans safely.
    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Instrument HTTPX (for synchronous payment calls)
    HTTPXClientInstrumentor().instrument()

    # 3. Prometheus Metrics
    Instrumentator().instrument(app).expose(app, include_in_schema=False, tags=["observability"])
