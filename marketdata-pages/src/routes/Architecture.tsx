import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import { SectionCard } from '../components/SectionCard';
import { architectureMermaid, architectureNarrative } from '../content/architecture';

export const ArchitecturePage = () => {
  return (
    <>
      <SectionCard
        title="System Pipeline"
        subtitle="capture -> normalize -> binlog -> replay -> ring buffer -> order book -> metrics -> artifacts -> site"
      >
        <ArchitectureDiagram />
      </SectionCard>

      <SectionCard title="Mermaid Source" subtitle="Portable architecture source used in docs.">
        <pre className="code-block">{architectureMermaid}</pre>
      </SectionCard>

      <SectionCard title="Data Origin" subtitle="How this dashboard gets data.">
        <ul className="bullet-list">
          {architectureNarrative.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
};
