import {
  ArtifactDescriptor,
  DepthSnapshot,
  LoadResult,
  Metadata,
  Metrics,
  ReplayPoint
} from './schema';
import {
  deriveDashboardModel,
  parseBenchmarkSummary,
  parseBookSamplesCsv,
  parseCorrectness,
  parseDepthSnapshots,
  parseJsonSafe,
  parseMetadata,
  parseMetrics,
  parseReplayTimeseries,
  parseStateHash,
  parseSummary
} from './parsers';

const latestBase = '/data/latest';
const exampleBase = '/examples';

const fileMap = {
  metadata: 'metadata.json',
  metrics: 'metrics.json',
  summary: 'summary.json',
  benchmark: 'benchmark_summary.json',
  correctness: 'correctness_report.json',
  stateHash: 'state_hash.json',
  tobTs: 'tob_timeseries.json',
  spreadTs: 'spread_timeseries.json',
  depth: 'depth_snapshots.json',
  profiler: 'profiler_summary.json',
  replayTxt: 'replay_summary.txt',
  bookCsv: 'book_samples.csv',
  topBookCsv: 'top_of_book.csv',
  benchBookRaw: 'bench_book.json',
  benchReplayRaw: 'bench_replay.json',
  reportMd: 'report.md',
  manifest: 'manifest.json'
} as const;

const exampleFallback: Partial<Record<keyof typeof fileMap, string>> = {
  summary: 'sample-summary.json',
  metrics: 'sample-metrics.json',
  tobTs: 'sample-tob-timeseries.json',
  correctness: 'sample-correctness.json'
};

const tryFetch = async (url: string): Promise<Response | null> => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
};

const loadTextWithFallback = async (
  key: keyof typeof fileMap
): Promise<LoadResult<string>> => {
  const latestRes = await tryFetch(`${latestBase}/${fileMap[key]}`);
  if (latestRes) {
    return { status: 'ok', data: await latestRes.text(), source: 'latest' };
  }

  const ex = exampleFallback[key];
  if (ex) {
    const exRes = await tryFetch(`${exampleBase}/${ex}`);
    if (exRes) {
      return { status: 'ok', data: await exRes.text(), source: 'examples' };
    }
  }

  return { status: 'missing', message: `${fileMap[key]} unavailable` };
};

const loadJsonWithFallback = async <T>(
  key: keyof typeof fileMap,
  parser: (raw: unknown) => T | null
): Promise<LoadResult<T>> => {
  const loaded = await loadTextWithFallback(key);
  if (loaded.status !== 'ok' || !loaded.data) {
    return loaded as LoadResult<T>;
  }

  const raw = parseJsonSafe<unknown>(loaded.data);
  if (!raw) {
    return { status: 'error', source: loaded.source, message: `invalid json in ${fileMap[key]}` };
  }

  const parsed = parser(raw);
  if (parsed === null) {
    return {
      status: 'error',
      source: loaded.source,
      message: `schema mismatch in ${fileMap[key]}`
    };
  }

  return { status: 'ok', data: parsed, source: loaded.source };
};

export const loadHomeData = async () => {
  const [metadataRes, metricsRes, summaryRes, stateHashRes] = await Promise.all([
    loadJsonWithFallback('metadata', parseMetadata),
    loadJsonWithFallback('metrics', parseMetrics),
    loadJsonWithFallback('summary', parseSummary),
    loadJsonWithFallback('stateHash', (r) => r as Record<string, unknown>)
  ]);

  const state = parseStateHash(stateHashRes.data ?? {});

  const model = deriveDashboardModel(
    (metadataRes.data as Metadata | undefined) ?? null,
    (metricsRes.data as Metrics | undefined) ?? null,
    (summaryRes.data as Record<string, unknown> | undefined) ?? null,
    state
  );

  return {
    model,
    metadataRes,
    metricsRes,
    summaryRes,
    stateHashRes
  };
};

export const loadReplaySeries = async (): Promise<{
  replay: ReplayPoint[];
  spread: ReplayPoint[];
  depthSnapshots: DepthSnapshot[];
  source: 'latest' | 'examples' | 'missing';
}> => {
  const [tobRes, spreadRes, csvRes, depthRes] = await Promise.all([
    loadJsonWithFallback('tobTs', parseReplayTimeseries),
    loadJsonWithFallback('spreadTs', parseReplayTimeseries),
    loadTextWithFallback('bookCsv'),
    loadJsonWithFallback('depth', parseDepthSnapshots)
  ]);

  const csvSeries = csvRes.status === 'ok' && csvRes.data ? parseBookSamplesCsv(csvRes.data) : [];

  const replay = (tobRes.data as ReplayPoint[] | undefined) ?? csvSeries;
  const spread =
    ((spreadRes.data as ReplayPoint[] | undefined) ?? replay).map((p) => ({
      ...p,
      spread: p.spread
    })) ?? [];

  const source = tobRes.source ?? spreadRes.source ?? csvRes.source ?? 'missing';

  return {
    replay,
    spread,
    depthSnapshots: (depthRes.data as DepthSnapshot[] | undefined) ?? [],
    source
  };
};

export const loadPerformanceData = async () => {
  const [metricsRes, benchmarkRes, profilerRes] = await Promise.all([
    loadJsonWithFallback('metrics', parseMetrics),
    loadJsonWithFallback('benchmark', parseBenchmarkSummary),
    loadJsonWithFallback('profiler', parseSummary)
  ]);

  return { metricsRes, benchmarkRes, profilerRes };
};

export const loadCorrectnessData = async () => {
  const [metricsRes, correctnessRes, stateHashRes, summaryRes] = await Promise.all([
    loadJsonWithFallback('metrics', parseMetrics),
    loadJsonWithFallback('correctness', parseCorrectness),
    loadJsonWithFallback('stateHash', (r) => r as Record<string, unknown>),
    loadJsonWithFallback('summary', parseSummary)
  ]);

  const state = parseStateHash(stateHashRes.data ?? {});

  return {
    metricsRes,
    correctnessRes,
    summaryRes,
    stateHash: state
  };
};

export const loadArtifactsManifest = async (): Promise<ArtifactDescriptor[]> => {
  const detectKind = (filename: string): ArtifactDescriptor['kind'] => {
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.csv')) return 'csv';
    if (filename.endsWith('.md')) return 'md';
    return 'txt';
  };

  const entries = await Promise.all(
    Object.entries(fileMap).map(async ([_, filename]) => {
      const latestRes = await tryFetch(`${latestBase}/${filename}`);
      if (latestRes) {
        return {
          name: filename,
          path: `${latestBase}/${filename}`,
          exists: true,
          source: 'latest' as const,
          kind: detectKind(filename)
        };
      }

      const fallback = Object.entries(exampleFallback).find(([, f]) => f === filename || f?.includes(filename));
      if (fallback) {
        return {
          name: filename,
          path: `${exampleBase}/${fallback[1]}`,
          exists: true,
          source: 'examples' as const,
          kind: detectKind(filename)
        };
      }

      return {
        name: filename,
        path: `${latestBase}/${filename}`,
        exists: false,
        source: 'missing' as const,
        kind: detectKind(filename)
      };
    })
  );

  return entries.filter((entry) => entry.exists);
};
