import { useEffect, useState } from 'react';

import { MetricCard } from '../components/MetricCard';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import { fmtBool } from '../lib/format';
import { loadCorrectnessData } from '../lib/artifactLoader';
import { correctnessWhy } from '../content/explanations';

type FlatRow = {
  key: string;
  value: string;
};

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return 'unavailable';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
  }
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const flattenRows = (input: unknown, prefix = ''): FlatRow[] => {
  if (input === null || input === undefined) {
    return [{ key: prefix || 'value', value: 'unavailable' }];
  }
  if (typeof input !== 'object') {
    return [{ key: prefix || 'value', value: toDisplay(input) }];
  }
  if (Array.isArray(input)) {
    if (input.length === 0) return [{ key: prefix || 'value', value: '[]' }];
    return input.flatMap((item, index) => flattenRows(item, `${prefix}[${index}]`));
  }

  const obj = input as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return [{ key: prefix || 'value', value: '{}' }];
  }

  return entries.flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      return flattenRows(v, key);
    }
    return [{ key, value: toDisplay(v) }];
  });
};

export const CorrectnessPage = () => {
  const [det, setDet] = useState<boolean | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [correctness, setCorrectness] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [showRawCorrectness, setShowRawCorrectness] = useState(false);
  const [showRawSummary, setShowRawSummary] = useState(false);

  useEffect(() => {
    void (async () => {
      const d = await loadCorrectnessData();
      setDet(d.stateHash.deterministic ?? (d.metricsRes.data as { deterministic?: boolean } | undefined)?.deterministic ?? null);
      setHash(d.stateHash.hash);
      setCorrectness((d.correctnessRes.data as Record<string, unknown> | undefined) ?? null);
      setSummary((d.summaryRes.data as Record<string, unknown> | undefined) ?? null);
    })();
  }, []);

  return (
    <>
      <section className="metric-grid">
        <MetricCard
          title="Deterministic Replay"
          value={fmtBool(det)}
          accent={<StatusBadge status={det === true ? 'pass' : det === false ? 'fail' : 'unknown'} />}
        />
        <MetricCard title="Final State Hash" value={hash ?? 'unavailable'} valueClassName="hash-value" />
      </section>

      <SectionCard title="Why This Matters" subtitle={correctnessWhy}>
        <p>
          Deterministic equivalence, invariant checks, and sequence/gap validation reduce hidden failure modes in
          trading-system simulation and replay pipelines.
        </p>
      </SectionCard>

      {correctness ? (
        <SectionCard title="Correctness Report" subtitle="Detailed checks and replay-equivalence diagnostics.">
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowRawCorrectness((v) => !v)}
          >
            {showRawCorrectness ? 'Show Parsed Output' : 'Show JSON Output'}
          </button>
          {showRawCorrectness ? (
            <pre className="code-block">{JSON.stringify(correctness, null, 2)}</pre>
          ) : (
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Parsed Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {flattenRows(correctness).map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      ) : null}

      {summary ? (
        <SectionCard title="Summary Signals" subtitle="Condensed run-level indicators.">
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowRawSummary((v) => !v)}
          >
            {showRawSummary ? 'Show Parsed Output' : 'Show JSON Output'}
          </button>
          {showRawSummary ? (
            <pre className="code-block">{JSON.stringify(summary, null, 2)}</pre>
          ) : (
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Parsed Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {flattenRows(summary).map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      ) : null}
    </>
  );
};
