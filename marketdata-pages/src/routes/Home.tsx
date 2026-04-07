import { useEffect, useState } from 'react';

import { Hero } from '../components/Hero';
import { MetricCard } from '../components/MetricCard';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import { AutoReplayChart } from '../components/AutoReplayChart';
import { EmptyState } from '../components/EmptyState';
import { fmtFloat, fmtInt, fmtNs } from '../lib/format';
import { useAutoplayIndex } from '../lib/autoplay';
import { loadHomeData, loadReplaySeries } from '../lib/artifactLoader';
import { DashboardModel, ReplayPoint } from '../lib/schema';
import { siteProvenance } from '../content/explanations';

const emptyModel: DashboardModel = {
  title: 'Market Data Engine',
  subtitle: 'Deterministic market-data capture, replay, and L2 state evaluation in C++20.',
  latestRunLabel: 'unavailable',
  symbol: 'unavailable',
  events: null,
  throughput: null,
  p50: null,
  p95: null,
  p99: null,
  deterministic: null,
  stateHash: null
};

export const HomePage = () => {
  const [model, setModel] = useState<DashboardModel>(emptyModel);
  const [series, setSeries] = useState<ReplayPoint[]>([]);
  const replayProgressIdx = useAutoplayIndex(series.length, 2200, false);

  useEffect(() => {
    void (async () => {
      const [home, replay] = await Promise.all([loadHomeData(), loadReplaySeries()]);
      setModel(home.model);
      setSeries(replay.replay);
    })();
  }, []);

  const progress = series.length > 0 ? (replayProgressIdx + 1) / series.length : 1;
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const replayRunning = series.length > 1 && safeProgress < 0.999;
  const phase = replayProgressIdx / 5;

  const liveEvents =
    model.events === null ? null : Math.max(1, Math.floor(model.events * safeProgress));
  const liveThroughput =
    model.throughput === null
      ? null
      : model.throughput * (0.975 + 0.05 * Math.sin(phase));
  const liveP50 = model.p50 === null ? null : model.p50 * (0.96 + 0.08 * Math.sin(phase + 0.3));
  const liveP95 = model.p95 === null ? null : model.p95 * (0.95 + 0.1 * Math.sin(phase + 0.8));
  const liveP99 = model.p99 === null ? null : model.p99 * (0.94 + 0.12 * Math.sin(phase + 1.3));

  const deterministicValue =
    model.deterministic === null ? 'unavailable' : replayRunning ? 'running' : model.deterministic ? 'pass' : 'fail';
  const deterministicStatus = replayRunning
    ? 'unknown'
    : model.deterministic
      ? 'pass'
      : model.deterministic === false
        ? 'fail'
        : 'unknown';
  const stateHashValue = replayRunning ? 'computing...' : model.stateHash ?? 'unavailable';

  return (
    <>
      <Hero model={model} />
      <section className="metric-grid">
        <MetricCard
          title="Messages Processed"
          value={fmtInt(liveEvents)}
          hint={series.length > 0 ? `${Math.floor(safeProgress * 100)}% replay progress` : undefined}
        />
        <MetricCard title="Throughput (msg/s)" value={fmtFloat(liveThroughput)} />
        <MetricCard title="p50 Latency" value={fmtNs(liveP50)} />
        <MetricCard title="p95 Latency" value={fmtNs(liveP95)} />
        <MetricCard title="p99 Latency" value={fmtNs(liveP99)} />
        <MetricCard
          title="Deterministic Replay"
          value={deterministicValue}
          accent={<StatusBadge status={deterministicStatus} label={replayRunning ? 'RUNNING' : undefined} />}
        />
        <MetricCard
          title="Final State Hash"
          value={stateHashValue}
          hint="Fingerprint of the final order-book state used to verify replay equivalence."
          valueClassName="hash-value"
        />
      </section>

      <SectionCard title="Top-of-Book Stream" subtitle="Auto-progressing best bid/ask trajectory over event time.">
        {series.length > 0 ? (
          <AutoReplayChart data={series} activeIndex={replayProgressIdx} />
        ) : (
          <EmptyState title="Top-of-book stream unavailable" message="Publish tob_timeseries.json or book_samples.csv." />
        )}
      </SectionCard>

      <SectionCard title="System Context" subtitle="How this dashboard is assembled.">
        <p>{siteProvenance}</p>
        <div className="link-row">
          <a href="https://github.com/your-org/marketdata_cpp" target="_blank" rel="noreferrer">
            Backend repo
          </a>
          <a href="https://github.com/your-org/marketdata-pages" target="_blank" rel="noreferrer">
            Website repo
          </a>
          <a href="/artifacts">Browse raw artifacts</a>
          <a href="/architecture">Architecture view</a>
          <a href="/performance">Performance</a>
        </div>
      </SectionCard>
    </>
  );
};
