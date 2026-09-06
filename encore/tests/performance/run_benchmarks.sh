#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Running Local Benchmark Suite (Locust)"
echo "=========================================="
echo "Note: These results reflect local hardware"
echo "capabilities and Docker overhead, not"
echo "production capacity."
echo "------------------------------------------"

# Ensure we're in the right directory or python environment if needed
# We assume 'locust' is installed in the current environment

mkdir -p results

# Run headless locust for 1 minute with 10 users spawning at 2 users/sec
locust -f tests/performance/benchmark.py \
       --headless \
       --users 10 \
       --spawn-rate 2 \
       --run-time 1m \
       --csv results/benchmark \
       --host http://localhost:8000

echo "------------------------------------------"
echo " Benchmark Complete. Results saved to:"
echo " - results/benchmark_stats.csv"
echo " - results/benchmark_failures.csv"
echo " - results/benchmark_exceptions.csv"
echo "=========================================="
