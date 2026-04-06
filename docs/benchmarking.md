# Benchmarking

## Metrics

Replay writes:
- events processed
- throughput messages/sec
- apply latency: min/p50/p95/p99/max/mean (ns)
- deterministic state hash

## Run

```bash
make bench
make replay BINLOG=artifacts/captured.binlog
```

## perf

```bash
bash scripts/run_perf.sh artifacts/captured.binlog
```

Generated:
- `artifacts/perf_stat.txt`
- `artifacts/perf.data`

Optional flamegraph:

```bash
bash scripts/make_flamegraph.sh
```

## Interpretation

- p50: common-case per-event update cost
- p99: tail behavior and jitter sensitivity
- throughput: end-to-end replay efficiency on current hardware
