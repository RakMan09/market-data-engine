import { useEffect, useState } from 'react';

import { ArtifactList } from '../components/ArtifactList';
import { SectionCard } from '../components/SectionCard';
import { loadArtifactsManifest } from '../lib/artifactLoader';
import { ArtifactDescriptor } from '../lib/schema';

export const ArtifactsPage = () => {
  const [items, setItems] = useState<ArtifactDescriptor[]>([]);

  useEffect(() => {
    void (async () => {
      const manifest = await loadArtifactsManifest();
      setItems(manifest);
    })();
  }, []);

  return (
    <>
      <SectionCard title="Artifact Inventory" subtitle="Latest data files discovered under /public/data/latest.">
        {items.length > 0 ? <ArtifactList items={items} /> : <p className="muted">No artifacts discovered yet.</p>}
      </SectionCard>
    </>
  );
};
