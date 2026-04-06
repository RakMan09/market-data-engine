import { useEffect, useState } from 'react';

import { MetricCard } from '../components/MetricCard';
import { SectionCard } from '../components/SectionCard';
import { fmtFloat, fmtNs } from '../lib/format';
import { loadPerformanceData } from '../lib/artifactLoader';
import { Metrics } from '../lib/schema';
import { performanceWhy } from '../content/explanations';

type Row = {
  name: string;
  value: string;
};

type ReplayCaseRow = {
  name: string;
  iterMicroSeconds: string;
  throughput: string;
};

const asNum = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const fmtCount = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return 'unavailable';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(v);
};

const fromNsToMicroSeconds = (ns: number | null | undefined): string => {
  if (ns === null || ns === undefined || Number.isNaN(ns)) return 'unavailable';
  return `${fmtCount(ns / 1_000, 3)} micro seconds`;
};

const toNanoSeconds = (seconds: number | null): string =>
  seconds === null ? 'unavailable' : `${fmtCount(seconds * 1_000_000_000, 2)} nano seconds`;

const toMicroSeconds = (seconds: number | null): string =>
  seconds === null ? 'unavailable' : `${fmtCount(seconds * 1_000_000, 3)} micro seconds`;

const buildProfilerRows = (profiler: Record<string, unknown> | null): Row[] => {
  if (!profiler) return [];

  const rows: Row[] = [];
  rows.push({
    name: 'Replay Duration (seconds)',
    value: fmtCount(asNum(profiler.replay_duration_seconds), 6)
  });
  rows.push({
    name: 'Throughput (messages/second)',
    value: fmtCount(asNum(profiler.throughput_msgs_per_sec), 2)
  });

  const latencyObj =
    typeof profiler.latency_seconds === 'object' && profiler.latency_seconds !== null
      ? (profiler.latency_seconds as Record<string, unknown>)
      : null;

  rows.push({
    name: 'Latency p50 (nano seconds)',
    value: toNanoSeconds(asNum(latencyObj?.p50))
  });
  rows.push({
    name: 'Latency p95 (micro seconds)',
    value: toMicroSeconds(asNum(latencyObj?.p95))
  });
  rows.push({
    name: 'Latency p99 (micro seconds)',
    value: toMicroSeconds(asNum(latencyObj?.p99))
  });
  rows.push({
    name: 'Latency max (micro seconds)',
    value: toMicroSeconds(asNum(latencyObj?.max))
  });

  return rows.filter((r) => r.value !== 'unavailable');
};

const buildBenchmarkRows = (
  bench: Record<string, unknown> | null
): { summary: Row[]; replayCases: ReplayCaseRow[] } => {
  if (!bench) return { summary: [], replayCases: [] };

  const summary: Row[] = [
    {
      name: 'Book Apply Time / Operation (nano seconds)',
      value: toNanoSeconds(asNum(bench.book_apply_seconds_per_op))
    },
    {
      name: 'Book Apply CPU Time / Operation (nano seconds)',
      value: toNanoSeconds(asNum(bench.book_apply_cpu_seconds_per_op))
    },
    {
      name: 'Replay Max Throughput (messages/second)',
      value: fmtCount(asNum(bench.replay_max_items_per_second), 2)
    }
  ].filter((r) => r.value !== 'unavailable');

  const replayCasesRaw = Array.isArray(bench.replay_cases)
    ? (bench.replay_cases as Array<Record<string, unknown>>)
    : [];

  const replayCases: ReplayCaseRow[] = replayCasesRaw.map((item) => ({
    name: String(item.name ?? 'unknown'),
    iterMicroSeconds: toMicroSeconds(asNum(item.seconds_per_iter)),
    throughput: `${fmtCount(asNum(item.items_per_second), 2)} messages/second`
  }));

  return { summary, replayCases };
};

export const PerformancePage = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [bench, setBench] = useState<Record<string, unknown> | null>(null);
  const [profiler, setProfiler] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const d = await loadPerformanceData();
      setMetrics((d.metricsRes.data as Metrics | undefined) ?? null);
      setBench((d.benchmarkRes.data as Record<string, unknown> | undefined) ?? null);
      setProfiler((d.profilerRes.data as Record<string, unknown> | undefined) ?? null);
    })();
  }, []);

  const profilerRows = buildProfilerRows(profiler);
  const benchRows = buildBenchmarkRows(bench);

  return (
    <>
      <section className="metric-grid">
        <MetricCard title="Throughput (messages/second)" value={fmtFloat(metrics?.throughput_msgs_per_sec ?? metrics?.throughput ?? null)} />
        <MetricCard title="Replay Duration" value={fmtNs(metrics?.replay_wall_ns ?? null)} />
        <MetricCard title="Latency p50 (nano seconds)" value={fmtNs(metrics?.latency?.p50_ns ?? null)} />
        <MetricCard title="Latency p95 (micro seconds)" value={fromNsToMicroSeconds(metrics?.latency?.p95_ns ?? null)} />
        <MetricCard title="Latency p99 (micro seconds)" value={fromNsToMicroSeconds(metrics?.latency?.p99_ns ?? null)} />
        <MetricCard title="Latency max (micro seconds)" value={fromNsToMicroSeconds(metrics?.latency?.max_ns ?? null)} />
      </section>

      <SectionCard title="Performance Interpretation" subtitle={performanceWhy}>
        <p>
          These metrics are sourced from generated run outputs and intended for reproducible comparison across runs.
        </p>
      </SectionCard>

      {benchRows.summary.length > 0 || benchRows.replayCases.length > 0 ? (
        <SectionCard title="Microbenchmark Summary" subtitle="Parsed from benchmark_summary.json.">
          {benchRows.summary.length > 0 ? (
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Metric Name</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {benchRows.summary.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {benchRows.replayCases.length > 0 ? (
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Replay Case</th>
                  <th>Iteration Time</th>
                  <th>Throughput</th>
                </tr>
              </thead>
              <tbody>
                {benchRows.replayCases.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.iterMicroSeconds}</td>
                    <td>{row.throughput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </SectionCard>
      ) : null}

      {profilerRows.length > 0 ? (
        <SectionCard title="Profiler Summary" subtitle="Optional output from perf and related tooling.">
          <table className="kv-table">
            <thead>
              <tr>
                <th>Metric Name</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {profilerRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}
    </>
  );
};
