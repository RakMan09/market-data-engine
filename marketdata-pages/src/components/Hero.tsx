import { DashboardModel } from '../lib/schema';

type Props = {
  model: DashboardModel;
};

export const Hero = ({ model }: Props) => {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Low-Latency Market Intelligence</p>
        <h2>{model.title}</h2>
        <p className="hero-subtitle">{model.subtitle}</p>
        <div className="hero-summary-box">
          <p className="label">Project Summary</p>
          <p className="hero-note">
            This project implements deterministic market-data capture, normalize, binlog, replay, and in-memory L2 book
            evaluation in C++20 using CMake/Ninja, GoogleTest, Google Benchmark, Linux perf, and Docker.
          </p>
          <p className="hero-note-secondary">
            The processed data is public crypto order-book/trade market data (focused on BTC/USDT-style streams) sourced
            from public exchange APIs and downloadable historical files, then normalized into artifacts like{' '}
            <code>metadata.json</code>, <code>metrics.json</code>, <code>tob_timeseries.json</code>,{' '}
            <code>spread_timeseries.json</code>, <code>benchmark_summary.json</code>, and{' '}
            <code>correctness_report.json</code>.
          </p>
          {model.symbol !== 'unavailable' && model.symbol !== 'unknown' ? (
            <p className="hero-note-secondary">Current published stream focus: {model.symbol}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
};
