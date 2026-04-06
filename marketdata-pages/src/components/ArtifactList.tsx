import { ArtifactDescriptor } from '../lib/schema';

type Props = {
  items: ArtifactDescriptor[];
};

export const ArtifactList = ({ items }: Props) => {
  return (
    <table className="kv-table">
      <thead>
        <tr>
          <th>Artifact</th>
          <th>Status</th>
          <th>Source</th>
          <th>Open</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.name}>
            <td>{it.name}</td>
            <td>{it.exists ? 'available' : 'unavailable'}</td>
            <td>{it.source}</td>
            <td>
              {it.exists ? (
                <a href={it.path} target="_blank" rel="noreferrer">
                  view
                </a>
              ) : (
                <span className="muted">n/a</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
