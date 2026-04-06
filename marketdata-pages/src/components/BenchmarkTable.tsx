import { EmptyState } from './EmptyState';

type Props = {
  data?: Record<string, unknown>;
};

export const BenchmarkTable = ({ data }: Props) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <EmptyState
        title="Benchmark summary unavailable"
        message="Publish benchmark_summary.json to display detailed benchmark comparisons."
      />
    );
  }

  return (
    <table className="kv-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
