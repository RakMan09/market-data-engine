# Architecture

## Data Flow

1. `capture` polls Kraken depth endpoint for L2 book data.
2. Parser/normalizer converts feed payloads to fixed-point internal levels.
3. Snapshot (first poll) and deltas (subsequent diffs) are encoded as `MarketEvent`.
4. Events are persisted in deterministic binlog (`MDL2LOG`, v1).
5. `replay` loads the binlog and applies events to in-memory `L2Book`.
6. Replay emits deterministic state hash and latency/throughput metrics.
7. Artifact writer outputs metrics, metadata, report, and sampled book states.

## Component Boundaries

- `capture_main.cpp`: live L2 ingestion + diff generation + binlog write
- `parser.cpp`: Kraken depth JSON parsing
- `binlog.cpp`: deterministic binary format
- `replay_engine.cpp`: replay pacing and timing
- `book.cpp`: L2 price-level state and invariants
- `metrics.cpp`: latency summary, metadata helpers

## Data Structures and Tradeoffs

- `MarketEvent` is fixed 64-byte cacheline-aligned for predictable memory access.
- Price and quantity use fixed-point integers (`1e8` scales).
- L2 book uses ordered maps (`bids` desc, `asks` asc) for correctness and simple top-N extraction.
- Replay hot path avoids per-event heap allocations.

## Determinism

- Binlog records are replayed in strict sequence order.
- Replaying the same binlog twice must produce identical `book_state_hash`.
- `metadata.json` includes dataset hash to tie results to exact input bytes.
