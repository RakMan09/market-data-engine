import { z } from 'zod';

export const metadataSchema = z.object({
  git_sha: z.string().optional(),
  build: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  dataset: z.record(z.any()).optional(),
  dataset_hashes: z.record(z.any()).optional(),
  run_started_utc: z.string().optional(),
  run_finished_utc: z.string().optional()
});

export const metricsSchema = z.object({
  events: z.number().optional(),
  messages_processed: z.number().optional(),
  throughput_msgs_per_sec: z.number().optional(),
  throughput: z.number().optional(),
  replay_wall_ns: z.number().optional(),
  deterministic: z.boolean().optional(),
  book_state_hash: z.union([z.string(), z.number()]).optional(),
  final_state_hash: z.union([z.string(), z.number()]).optional(),
  latency: z
    .object({
      p50_ns: z.number().optional(),
      p95_ns: z.number().optional(),
      p99_ns: z.number().optional(),
      min_ns: z.number().optional(),
      max_ns: z.number().optional(),
      mean_ns: z.number().optional()
    })
    .optional()
});

export const summarySchema = z.record(z.any());

export const benchmarkSummarySchema = z.record(z.any());

export const correctnessSchema = z.record(z.any());

export const stateHashSchema = z.object({
  hash: z.union([z.number(), z.string()]).optional(),
  deterministic: z.boolean().optional(),
  equivalent: z.boolean().optional(),
  notes: z.string().optional()
});

export const timeseriesPointSchema = z.object({
  t: z.number().optional(),
  ts: z.number().optional(),
  timestamp: z.number().optional(),
  bid: z.number().optional(),
  ask: z.number().optional(),
  spread: z.number().optional(),
  bid_price: z.number().optional(),
  ask_price: z.number().optional(),
  bid_qty: z.number().optional(),
  ask_qty: z.number().optional()
});

export const timeseriesSchema = z.array(timeseriesPointSchema);

export const depthSnapshotSchema = z.object({
  t: z.number().optional(),
  timestamp: z.number().optional(),
  bids: z.array(z.object({ price: z.number(), qty: z.number() })).optional(),
  asks: z.array(z.object({ price: z.number(), qty: z.number() })).optional()
});

export const depthSnapshotsSchema = z.array(depthSnapshotSchema);

export type Metadata = z.infer<typeof metadataSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type TimeseriesPoint = z.infer<typeof timeseriesPointSchema>;
export type DepthSnapshot = z.infer<typeof depthSnapshotSchema>;

export type ArtifactStatus = 'ok' | 'missing' | 'error';

export type LoadResult<T> = {
  status: ArtifactStatus;
  data?: T;
  source?: 'latest' | 'examples';
  message?: string;
};

export type DashboardModel = {
  title: string;
  subtitle: string;
  latestRunLabel: string;
  symbol: string;
  events: number | null;
  throughput: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  deterministic: boolean | null;
  stateHash: string | null;
};

export type ReplayPoint = {
  t: number;
  bid: number;
  ask: number;
  spread: number;
};

export type DepthViewPoint = {
  side: 'bid' | 'ask';
  price: number;
  qty: number;
};

export type ArtifactDescriptor = {
  name: string;
  path: string;
  exists: boolean;
  source: 'latest' | 'examples' | 'missing';
  kind: 'json' | 'csv' | 'txt' | 'md';
};
