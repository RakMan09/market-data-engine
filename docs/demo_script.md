# Demo Script

## One Command

```bash
make demo
```

## What It Executes

1. Build release binaries.
2. Capture 60s of live Kraken L2 depth into deterministic binlog.
3. Replay binlog and enforce deterministic state-hash equivalence.
4. Write:
- `artifacts/metrics.json`
- `artifacts/metadata.json`
- `artifacts/book_samples.csv`
- `artifacts/report.md`
5. Run micro and macro benchmarks.

## Success Criteria

- `deterministic=true` in `artifacts/metrics.json`
- `artifacts/metadata.json` includes dataset hash + run timestamps
- benchmark JSON files present
