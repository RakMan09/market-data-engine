import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const exDir = path.join(root, 'public', 'examples');

await fs.mkdir(exDir, { recursive: true });

const now = new Date().toISOString();

const summary = {
  project: 'Market Data Engine',
  symbol: 'XBTUSD',
  deterministic_replay: true,
  notes: 'Example data generated for local development.'
};

const metrics = {
  events: 200000,
  throughput_msgs_per_sec: 24500000,
  replay_wall_ns: 8400000,
  deterministic: true,
  book_state_hash: '1453209871234556678',
  latency: {
    p50_ns: 90,
    p95_ns: 420,
    p99_ns: 780,
    min_ns: 24,
    max_ns: 2300,
    mean_ns: 140
  }
};

const tob = Array.from({ length: 120 }, (_, i) => {
  const bid = 6800000 + Math.sin(i / 7) * 60 + i * 0.3;
  const ask = bid + 20 + Math.cos(i / 10) * 2;
  return {
    t: i,
    bid: Number(bid.toFixed(2)),
    ask: Number(ask.toFixed(2)),
    spread: Number((ask - bid).toFixed(2))
  };
});

const correctness = {
  deterministic: true,
  replay_equivalence: {
    csv_vs_binlog: true,
    csv_hash: '1453209871234556678',
    binlog_hash: '1453209871234556678'
  },
  invariants: {
    no_crossed_book: true,
    nonnegative_qty: true,
    sequence_monotonic: true
  }
};

await Promise.all([
  fs.writeFile(path.join(exDir, 'sample-summary.json'), JSON.stringify(summary, null, 2) + '\n'),
  fs.writeFile(path.join(exDir, 'sample-metrics.json'), JSON.stringify(metrics, null, 2) + '\n'),
  fs.writeFile(path.join(exDir, 'sample-tob-timeseries.json'), JSON.stringify(tob, null, 2) + '\n'),
  fs.writeFile(path.join(exDir, 'sample-correctness.json'), JSON.stringify(correctness, null, 2) + '\n')
]);

console.log(`example artifacts generated at ${exDir} (${now})`);
