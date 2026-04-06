import { useEffect, useState } from 'react';

import { AutoReplayChart } from '../components/AutoReplayChart';
import { DepthSnapshotView } from '../components/DepthSnapshotView';
import { EmptyState } from '../components/EmptyState';
import { SectionCard } from '../components/SectionCard';
import { SpreadChart } from '../components/SpreadChart';
import { loadReplaySeries } from '../lib/artifactLoader';
import { DepthSnapshot, ReplayPoint } from '../lib/schema';

export const ReplayPage = () => {
  const [replay, setReplay] = useState<ReplayPoint[]>([]);
  const [spread, setSpread] = useState<ReplayPoint[]>([]);
  const [depth, setDepth] = useState<DepthSnapshot[]>([]);

  useEffect(() => {
    void (async () => {
      const data = await loadReplaySeries();
      setReplay(data.replay);
      setSpread(data.spread);
      setDepth(data.depthSnapshots);
    })();
  }, []);

  return (
    <>
      <SectionCard title="Top-of-Book Stream" subtitle="Best bid and ask evolve automatically over event sequence.">
        {replay.length ? (
          <AutoReplayChart data={replay} />
        ) : (
          <EmptyState title="Top-of-book data unavailable" message="Publish tob_timeseries.json or book_samples.csv." />
        )}
      </SectionCard>

      <SectionCard title="Spread Over Time" subtitle="Derived from the top-of-book price stream.">
        {spread.length ? (
          <SpreadChart data={spread} />
        ) : (
          <EmptyState title="Spread data unavailable" message="Publish spread_timeseries.json or tob_timeseries.json." />
        )}
      </SectionCard>

      {depth.length > 0 ? (
        <SectionCard title="Depth Snapshots" subtitle="Sampled order-book depth slices.">
          <DepthSnapshotView snapshots={depth} />
        </SectionCard>
      ) : null}
    </>
  );
};
