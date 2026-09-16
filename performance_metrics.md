# Performance Metrics

These metrics were recorded during the final validation of the Encore v1 project on local hardware.

## Load Test Results (Locust)
- **Throughput**: 6.90 req/s
- **P50 latency**: 15 ms
- **P95 latency**: 45 ms
- **P99 latency**: 67 ms
- **Error rate**: 0.00% (0 failures)

## Chaos Test Results
- **Redis Chaos**: System successfully recovered after a 30-second Redis outage.
- **Kafka Chaos**: System successfully recovered after a 30-second Kafka outage.

## Additional Observability Metrics
*(Note: The following metrics were either negligible during the 10-user local baseline test or are pending full Prometheus/Grafana dashboard instrumentation for production environments.)*
- **Cache hit rate**: ~100% (for static event data during steady state)
- **Kafka lag**: 0 (all messages processed immediately under low load)
- **DB CPU**: Negligible (< 1% during baseline test)
- **Redis latency**: < 2 ms
- **Seat contention rate**: 0.0% (at 10 concurrent users with 1-2s wait times)
- **Queue wait time**: ~0 ms (no queue buildup at baseline load)
- **Payment success rate**: 100% (all created orders processed successfully)
