# Data Contract

The site reads artifact files from `public/data/latest/`.

Supported filenames:
- `metadata.json`
- `metrics.json`
- `summary.json`
- `benchmark_summary.json`
- `correctness_report.json`
- `state_hash.json`
- `tob_timeseries.json`
- `spread_timeseries.json`
- `depth_snapshots.json`
- `profiler_summary.json`
- `replay_summary.txt`
- `book_samples.csv`

## Compatibility rules

- Files are optional except that `metadata.json` and `metrics.json` are expected in a fully published run.
- Missing files do not crash the UI.
- The parser layer accepts partial fields and derives fallback values where possible.
- If parsing fails, pages show explicit non-fatal error/empty states.

## CSV schema (`book_samples.csv`)

Expected columns:
- `event_index`
- `bid_price_fp`
- `bid_qty_fp`
- `ask_price_fp`
- `ask_qty_fp`
