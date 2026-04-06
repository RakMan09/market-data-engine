# Data

Project A ingestion is live L2 order book capture from Kraken REST depth endpoint.

- No raw market data is committed to git.
- Captured deterministic binary logs are written to `artifacts/captured.binlog` by default.

Run:

```bash
make capture
```
