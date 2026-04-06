#!/usr/bin/env bash
set -euo pipefail

BINLOG="${1:-artifacts/captured.binlog}"
mkdir -p artifacts

perf stat -d -r 3 ./build/replay --binlog "${BINLOG}" --artifacts artifacts 2> artifacts/perf_stat.txt
perf record -F 999 -g -- ./build/replay --binlog "${BINLOG}" --artifacts artifacts
mv -f perf.data artifacts/perf.data

echo "wrote artifacts/perf_stat.txt and artifacts/perf.data"
