import { useMemo } from 'react';

import { useAutoplayIndex } from '../lib/autoplay';
import { DepthSnapshot } from '../lib/schema';
import { EmptyState } from './EmptyState';

type Props = {
  snapshots: DepthSnapshot[];
};

export const DepthSnapshotView = ({ snapshots }: Props) => {
  const idx = useAutoplayIndex(snapshots.length, 2300);
  const current = snapshots[idx];

  const rows = useMemo(() => {
    if (!current) return [];
    const bids = (current.bids ?? []).slice(0, 8).map((x) => ({ side: 'bid', ...x }));
    const asks = (current.asks ?? []).slice(0, 8).map((x) => ({ side: 'ask', ...x }));
    return [...bids, ...asks];
  }, [current]);

  if (!current) {
    return <EmptyState title="Depth snapshots unavailable" message="Publish depth_snapshots.json to enable this section." />;
  }

  return (
    <div className="depth-grid">
      <p className="label">Autoplay Snapshot #{idx + 1}</p>
      <table>
        <thead>
          <tr>
            <th>Side</th>
            <th>Price</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.side}-${row.price}-${i}`}>
              <td className={row.side === 'bid' ? 'txt-green' : 'txt-red'}>{row.side}</td>
              <td>{row.price}</td>
              <td>{row.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
