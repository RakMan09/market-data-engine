export const architectureMermaid = `
flowchart LR
  A[Capture L2 Feed] --> B[Normalize & Validate]
  B --> C[Deterministic Binlog]
  C --> D[Replay Reader]
  D --> E[SPSC Ring Buffer (optional)]
  E --> F[L2 Order Book]
  F --> G[Metrics & Correctness]
  G --> H[Artifacts]
  H --> I[Operations Dashboard]
`;

export const architectureNarrative = [
  'The C++ engine writes structured artifacts after each run, including metrics, timeseries, and correctness outputs.',
  'This dashboard fetches those artifacts, normalizes field shapes, and renders synchronized telemetry views.',
  'When files are missing or malformed, parsers stay tolerant and degrade individual panels without crashing.'
];
