import Papa from 'papaparse';

import {
  benchmarkSummarySchema,
  correctnessSchema,
  DashboardModel,
  DepthSnapshot,
  depthSnapshotsSchema,
  Metadata,
  metadataSchema,
  Metrics,
  metricsSchema,
  ReplayPoint,
  stateHashSchema,
  summarySchema,
  timeseriesSchema
} from './schema';

const asNum = (v: unknown): number | null => {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asBool = (v: unknown): boolean | null => {
  if (typeof v === 'boolean') {
    return v;
  }
  if (typeof v === 'string') {
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
  }
  return null;
};

const normalizePrice = (v: number | null): number | null => {
  if (v === null) return null;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return v / 100_000_000;
  if (abs >= 100_000_000) return v / 100_000;
  return v;
};

export const parseJsonSafe = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const parseMetadata = (raw: unknown): Metadata | null => {
  const parsed = metadataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const parseMetrics = (raw: unknown): Metrics | null => {
  const parsed = metricsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const parseSummary = (raw: unknown): Record<string, unknown> | null => {
  const parsed = summarySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const parseBenchmarkSummary = (raw: unknown): Record<string, unknown> | null => {
  const parsed = benchmarkSummarySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const parseCorrectness = (raw: unknown): Record<string, unknown> | null => {
  const parsed = correctnessSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const parseStateHash = (raw: unknown): { hash: string | null; deterministic: boolean | null } => {
  const parsed = stateHashSchema.safeParse(raw);
  if (!parsed.success) {
    return { hash: null, deterministic: null };
  }
  return {
    hash: parsed.data.hash !== undefined ? String(parsed.data.hash) : null,
    deterministic:
      parsed.data.deterministic ??
      parsed.data.equivalent ??
      (parsed.data.notes ? parsed.data.notes.toLowerCase().includes('deterministic') : null)
  };
};

export const parseReplayTimeseries = (raw: unknown): ReplayPoint[] => {
  const parsed = timeseriesSchema.safeParse(raw);
  if (!parsed.success) return [];

  return parsed.data
    .map((d, i) => {
      const t = asNum(d.t) ?? asNum(d.ts) ?? asNum(d.timestamp) ?? i;
      const bid = normalizePrice(asNum(d.bid) ?? asNum(d.bid_price) ?? null);
      const ask = normalizePrice(asNum(d.ask) ?? asNum(d.ask_price) ?? null);
      const spreadRaw = asNum(d.spread);
      const spread =
        normalizePrice(spreadRaw) ?? (bid !== null && ask !== null ? ask - bid : null);
      if (bid === null || ask === null || spread === null) return null;
      return { t, bid, ask, spread };
    })
    .filter((x): x is ReplayPoint => x !== null);
};

export const parseDepthSnapshots = (raw: unknown): DepthSnapshot[] => {
  const parsed = depthSnapshotsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data;
};

export const parseBookSamplesCsv = (raw: string): ReplayPoint[] => {
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) return [];

  return parsed.data
    .map((row, idx) => {
      const t = asNum(row.event_index) ?? idx;
      const bid = normalizePrice(asNum(row.bid_price_fp));
      const ask = normalizePrice(asNum(row.ask_price_fp));
      const spread = bid !== null && ask !== null ? ask - bid : null;
      if (bid === null || ask === null || spread === null) return null;
      return { t, bid, ask, spread };
    })
    .filter((x): x is ReplayPoint => x !== null);
};

export const deriveDashboardModel = (
  metadata: Metadata | null,
  metrics: Metrics | null,
  summary: Record<string, unknown> | null,
  stateHash: { hash: string | null; deterministic: boolean | null }
): DashboardModel => {
  const symbol =
    (metadata?.dataset?.symbol as string | undefined) ??
    (metadata?.dataset?.pair as string | undefined) ??
    (summary?.symbol as string | undefined) ??
    'unknown';

  const runLabel = metadata?.run_finished_utc ?? metadata?.run_started_utc ?? 'unavailable';

  const metricsDet = asBool(metrics?.deterministic);
  const summaryDet = asBool(summary?.deterministic_replay);

  const stateFromMetrics =
    metrics?.book_state_hash !== undefined
      ? String(metrics.book_state_hash)
      : metrics?.final_state_hash !== undefined
        ? String(metrics.final_state_hash)
        : null;

  const summaryEvents = asNum(summary?.events);
  const metricsEvents = asNum(metrics?.events) ?? asNum(metrics?.messages_processed);
  const events =
    summaryEvents !== null && metricsEvents !== null
      ? Math.max(summaryEvents, metricsEvents)
      : summaryEvents ?? metricsEvents;

  const summaryThroughput =
    asNum(summary?.throughput_msgs_per_sec) ??
    asNum(summary?.throughput_eps) ??
    asNum(summary?.throughput);
  const metricsThroughput = asNum(metrics?.throughput_msgs_per_sec) ?? asNum(metrics?.throughput);
  const throughput =
    summaryThroughput !== null && metricsThroughput !== null
      ? Math.max(summaryThroughput, metricsThroughput)
      : summaryThroughput ?? metricsThroughput;

  return {
    title: 'Market Data Engine',
    subtitle: 'Deterministic market-data capture, replay, and L2 state evaluation in C++20.',
    latestRunLabel: runLabel,
    symbol,
    events,
    throughput,
    p50: asNum(metrics?.latency?.p50_ns),
    p95: asNum(metrics?.latency?.p95_ns),
    p99: asNum(metrics?.latency?.p99_ns),
    deterministic: metricsDet ?? summaryDet ?? stateHash.deterministic,
    stateHash: stateHash.hash ?? stateFromMetrics
  };
};
