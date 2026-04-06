export const ArchitectureDiagram = () => {
  return (
    <svg viewBox="0 0 920 260" className="arch-svg" role="img" aria-label="Project architecture pipeline">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="#69a7ff" />
        </marker>
      </defs>
      {[
        ['Capture', 20],
        ['Normalize', 150],
        ['Binlog', 280],
        ['Replay', 410],
        ['Ring Buffer', 540],
        ['L2 Book', 670],
        ['Artifacts', 800]
      ].map(([label, x]) => (
        <g key={String(label)}>
          <rect x={Number(x)} y="90" width="100" height="50" rx="8" fill="#13243a" stroke="#2e4d70" />
          <text x={Number(x) + 50} y="120" textAnchor="middle" fill="#dce7f6" fontSize="12">
            {label}
          </text>
        </g>
      ))}
      {[120, 250, 380, 510, 640, 770].map((x) => (
        <line key={x} x1={x} y1="115" x2={x + 30} y2="115" stroke="#69a7ff" markerEnd="url(#arrow)" />
      ))}
    </svg>
  );
};
