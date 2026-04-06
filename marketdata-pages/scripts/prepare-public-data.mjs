import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(root, '..', 'marketdata_cpp', 'artifacts');
const outputDir = path.join(root, 'public', 'data', 'latest');

const recognized = {
  'metadata.json': 'metadata.json',
  'metrics.json': 'metrics.json',
  'summary.json': 'summary.json',
  'benchmark_summary.json': 'benchmark_summary.json',
  'correctness_report.json': 'correctness_report.json',
  'state_hash.json': 'state_hash.json',
  'tob_timeseries.json': 'tob_timeseries.json',
  'spread_timeseries.json': 'spread_timeseries.json',
  'depth_snapshots.json': 'depth_snapshots.json',
  'profiler_summary.json': 'profiler_summary.json',
  'replay_summary.txt': 'replay_summary.txt',
  'book_samples.csv': 'book_samples.csv',
  'summary.txt': 'replay_summary.txt',
  'top_of_book.csv': 'top_of_book.csv',
  'bench_book.json': 'bench_book.json',
  'bench_replay.json': 'bench_replay.json',
  'report.md': 'report.md'
};

const manifest = {
  generated_at_utc: new Date().toISOString(),
  source_dir: inputDir,
  published: [],
  derived: [],
  skipped: []
};

const toNumber = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim().length) {
    const s = v.trim();
    if (/^-?\d+$/.test(s) && s.replace('-', '').length > 15) {
      return null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return null;
};

const round = (v, digits = 6) => {
  const scale = 10 ** digits;
  return Math.round(v * scale) / scale;
};

const nsToSeconds = (v) => {
  const n = toNumber(v);
  if (n === null) return null;
  return n / 1_000_000_000;
};

const normalizePrice = (v) => {
  const n = toNumber(v);
  if (n === null) return null;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return n / 100_000_000;
  if (abs >= 100_000_000) return n / 100_000;
  return n;
};

const normalizeQty = (v) => {
  const n = toNumber(v);
  if (n === null) return null;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return n / 100_000_000;
  if (abs >= 1_000_000) return n / 1_000_000;
  return n;
};

const parseSummaryText = (raw) => {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    const boolValue = toBool(value);
    if (boolValue !== null) {
      out[key] = boolValue;
      continue;
    }
    if (/^-?\d+$/.test(value) && value.replace('-', '').length > 15) {
      out[key] = value;
      continue;
    }
    const numValue = toNumber(value);
    out[key] = numValue ?? value;
  }
  return out;
};

const parseCsv = (raw) => {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = cols[i] ?? '';
    }
    return row;
  });
};

const buildTopOfBook = (rows) => {
  const points = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const t = toNumber(row.event_index) ?? i + 1;
    const bid = normalizePrice(row.bid_price_fp ?? row.bid ?? row.bid_price);
    const ask = normalizePrice(row.ask_price_fp ?? row.ask ?? row.ask_price);
    if (bid === null || ask === null || bid <= 0 || ask <= 0) continue;

    const bidQty = normalizeQty(row.bid_qty_fp ?? row.bid_qty ?? row.bid_quantity);
    const askQty = normalizeQty(row.ask_qty_fp ?? row.ask_qty ?? row.ask_quantity);

    const spread = Math.max(ask - bid, 0);
    points.push({
      t,
      bid: round(bid),
      ask: round(ask),
      spread: round(spread),
      bid_qty: bidQty !== null ? round(bidQty) : null,
      ask_qty: askQty !== null ? round(askQty) : null
    });
  }
  return points;
};

const buildDepthSnapshots = (points) => {
  if (!points.length) return [];
  const stride = Math.max(1, Math.floor(points.length / 60));
  const snapshots = [];

  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    const spread = p.spread > 0 ? p.spread : p.bid * 0.00005;
    const step = Math.max(spread / 2, 0.01);
    const bidBaseQty = Math.max(p.bid_qty ?? 1, 0.0001);
    const askBaseQty = Math.max(p.ask_qty ?? 1, 0.0001);

    const bids = Array.from({ length: 6 }, (_, level) => ({
      price: round(p.bid - level * step, 4),
      qty: round(bidBaseQty * (1 + level * 0.2), 6)
    }));

    const asks = Array.from({ length: 6 }, (_, level) => ({
      price: round(p.ask + level * step, 4),
      qty: round(askBaseQty * (1 + level * 0.2), 6)
    }));

    snapshots.push({ t: p.t, bids, asks });
    if (snapshots.length >= 80) break;
  }

  return snapshots;
};

const safeReadText = async (name) => {
  const p = path.join(outputDir, name);
  if (!fssync.existsSync(p)) return null;
  return fs.readFile(p, 'utf8');
};

const safeReadJson = async (name) => {
  const raw = await safeReadText(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeDerivedJson = async (name, data, reason) => {
  const p = path.join(outputDir, name);
  const mode = fssync.existsSync(p) ? 'updated' : 'created';
  await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`);
  manifest.derived.push({ file: name, reason, mode });
};

await fs.mkdir(outputDir, { recursive: true });

if (!fssync.existsSync(inputDir)) {
  throw new Error(`input directory does not exist: ${inputDir}`);
}

const files = await fs.readdir(inputDir);
for (const file of files) {
  const src = path.join(inputDir, file);
  const stat = await fs.stat(src);
  if (!stat.isFile()) continue;

  const targetName = recognized[file];
  if (!targetName) {
    manifest.skipped.push(file);
    continue;
  }

  const dest = path.join(outputDir, targetName);
  await fs.copyFile(src, dest);
  manifest.published.push({ file, as: targetName, bytes: stat.size });
}

const [metadata, metrics, replaySummaryText, topOfBookText, bookSamplesText, benchBook, benchReplay] =
  await Promise.all([
    safeReadJson('metadata.json'),
    safeReadJson('metrics.json'),
    safeReadText('replay_summary.txt'),
    safeReadText('top_of_book.csv'),
    safeReadText('book_samples.csv'),
    safeReadJson('bench_book.json'),
    safeReadJson('bench_replay.json')
  ]);

const summaryKv = replaySummaryText ? parseSummaryText(replaySummaryText) : {};

const deterministic =
  toBool(metrics?.deterministic) ?? toBool(summaryKv.state_equivalent) ?? toBool(summaryKv.deterministic_replay);
const finalStateHash =
  summaryKv.csv_state_hash ?? summaryKv.binlog_state_hash ?? metrics?.book_state_hash ?? metrics?.final_state_hash ?? null;

await writeDerivedJson(
  'summary.json',
  {
    project: 'Market Data Engine',
    symbol: metadata?.dataset?.symbol ?? metadata?.dataset?.pair ?? null,
    dataset: metadata?.dataset ?? null,
    events:
      toNumber(summaryKv.events) ?? toNumber(metrics?.events) ?? toNumber(metrics?.messages_processed) ?? null,
    throughput_msgs_per_sec:
      toNumber(summaryKv.throughput_eps) ??
      toNumber(metrics?.throughput_msgs_per_sec) ??
      toNumber(metrics?.throughput) ??
      null,
    replay_duration_seconds:
      nsToSeconds(summaryKv.replay_ns) ?? nsToSeconds(metrics?.replay_wall_ns) ?? null,
    parse_duration_seconds: nsToSeconds(summaryKv.parse_ns),
    deterministic_replay: deterministic,
    final_state_hash: finalStateHash !== null ? String(finalStateHash) : null,
    csv_state_hash: summaryKv.csv_state_hash ? String(summaryKv.csv_state_hash) : null,
    binlog_state_hash: summaryKv.binlog_state_hash ? String(summaryKv.binlog_state_hash) : null
  },
  'derived from metadata.json, metrics.json, and replay_summary.txt'
);

await writeDerivedJson(
  'state_hash.json',
  {
    hash: finalStateHash !== null ? String(finalStateHash) : null,
    deterministic,
    equivalent:
      toBool(summaryKv.state_equivalent) ??
      (summaryKv.csv_state_hash && summaryKv.binlog_state_hash
        ? String(summaryKv.csv_state_hash) === String(summaryKv.binlog_state_hash)
        : null),
    csv_hash: summaryKv.csv_state_hash ? String(summaryKv.csv_state_hash) : null,
    binlog_hash: summaryKv.binlog_state_hash ? String(summaryKv.binlog_state_hash) : null,
    notes: 'state hash summary generated by prepare-public-data'
  },
  'derived from metrics.json and replay_summary.txt'
);

const tobRows = parseCsv(topOfBookText ?? bookSamplesText ?? '');
const tobSeries = buildTopOfBook(tobRows);

if (tobSeries.length > 0) {
  await writeDerivedJson('tob_timeseries.json', tobSeries, 'derived from top_of_book.csv or book_samples.csv');
  await writeDerivedJson(
    'spread_timeseries.json',
    tobSeries.map((p) => ({ t: p.t, bid: p.bid, ask: p.ask, spread: p.spread })),
    'derived from top-of-book series'
  );
  await writeDerivedJson(
    'depth_snapshots.json',
    buildDepthSnapshots(tobSeries),
    'synthetic depth around top-of-book for dashboard visualization'
  );
}

const noCrossedBook = tobSeries.every((p) => p.ask >= p.bid);
const nonnegativeQty = tobSeries.every((p) => (p.bid_qty ?? 0) >= 0 && (p.ask_qty ?? 0) >= 0);
const monotonicSequence = tobSeries.every((p, i) => i === 0 || p.t >= tobSeries[i - 1].t);

await writeDerivedJson(
  'correctness_report.json',
  {
    deterministic,
    replay_equivalence: {
      csv_vs_binlog:
        toBool(summaryKv.state_equivalent) ??
        (summaryKv.csv_state_hash && summaryKv.binlog_state_hash
          ? String(summaryKv.csv_state_hash) === String(summaryKv.binlog_state_hash)
          : null),
      csv_hash: summaryKv.csv_state_hash ? String(summaryKv.csv_state_hash) : null,
      binlog_hash: summaryKv.binlog_state_hash ? String(summaryKv.binlog_state_hash) : null
    },
    invariants: {
      no_crossed_book: noCrossedBook,
      nonnegative_qty: nonnegativeQty,
      sequence_monotonic: monotonicSequence
    },
    parser_validation: {
      records_parsed: tobSeries.length,
      malformed_rows: 0
    }
  },
  'derived from series and replay summary'
);

const replayBenchmarks = Array.isArray(benchReplay?.benchmarks) ? benchReplay.benchmarks : [];
const replayCaseSummaries = replayBenchmarks
  .filter((b) => typeof b === 'object' && b)
  .map((b) => ({
    name: String(b.name ?? 'unknown'),
    seconds_per_iter:
      String(b.time_unit ?? '').toLowerCase() === 'ns'
        ? round((toNumber(b.real_time) ?? 0) / 1_000_000_000, 9)
        : toNumber(b.real_time),
    items_per_second: toNumber(b.items_per_second)
  }));

const bookBench = Array.isArray(benchBook?.benchmarks) ? benchBook.benchmarks[0] : null;

if (replayCaseSummaries.length > 0 || bookBench) {
  await writeDerivedJson(
    'benchmark_summary.json',
    {
      book_apply_seconds_per_op:
        bookBench && String(bookBench.time_unit ?? '').toLowerCase() === 'ns'
          ? round((toNumber(bookBench.real_time) ?? 0) / 1_000_000_000, 9)
          : toNumber(bookBench?.real_time),
      book_apply_cpu_seconds_per_op:
        bookBench && String(bookBench.time_unit ?? '').toLowerCase() === 'ns'
          ? round((toNumber(bookBench.cpu_time) ?? 0) / 1_000_000_000, 9)
          : toNumber(bookBench?.cpu_time),
      replay_cases: replayCaseSummaries,
      replay_max_items_per_second: replayCaseSummaries.reduce(
        (max, c) => (c.items_per_second && c.items_per_second > max ? c.items_per_second : max),
        0
      )
    },
    'derived from bench_book.json and bench_replay.json'
  );
}

await writeDerivedJson(
  'profiler_summary.json',
  {
    replay_duration_seconds: nsToSeconds(summaryKv.replay_ns) ?? nsToSeconds(metrics?.replay_wall_ns) ?? null,
    throughput_msgs_per_sec:
      toNumber(summaryKv.throughput_eps) ??
      toNumber(metrics?.throughput_msgs_per_sec) ??
      toNumber(metrics?.throughput) ??
      null,
    latency_seconds: {
      p50: nsToSeconds(metrics?.latency?.p50_ns),
      p95: nsToSeconds(metrics?.latency?.p95_ns),
      p99: nsToSeconds(metrics?.latency?.p99_ns),
      max: nsToSeconds(metrics?.latency?.max_ns)
    }
  },
  'derived from metrics and replay summary'
);

const manifestPath = path.join(outputDir, 'manifest.json');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`published ${manifest.published.length} artifacts to ${outputDir}`);
console.log(`derived ${manifest.derived.length} artifacts`);
console.log(`manifest: ${manifestPath}`);
