import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const latestDir = path.join(root, 'public', 'data', 'latest');
const examplesDir = path.join(root, 'public', 'examples');

const requiredShape = ['metadata.json', 'metrics.json'];
const optional = [
  'summary.json',
  'benchmark_summary.json',
  'correctness_report.json',
  'state_hash.json',
  'tob_timeseries.json',
  'spread_timeseries.json',
  'depth_snapshots.json',
  'profiler_summary.json',
  'replay_summary.txt',
  'book_samples.csv'
];

const warn = (msg) => console.warn(`WARN: ${msg}`);
const fail = (msg) => {
  console.error(`ERROR: ${msg}`);
  process.exitCode = 1;
};

const loadJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`invalid json: ${filePath}`);
  }
};

const pathFor = (name) => {
  const latest = path.join(latestDir, name);
  if (fssync.existsSync(latest)) return latest;
  return null;
};

if (!fssync.existsSync(latestDir)) {
  warn(`latest data dir missing: ${latestDir}`);
}

if (!fssync.existsSync(examplesDir)) {
  fail(`examples directory missing: ${examplesDir}`);
}

for (const name of requiredShape) {
  const p = pathFor(name);
  if (!p) {
    warn(`${name} not published in latest/ (site will fallback when possible)`);
    continue;
  }
  try {
    const obj = await loadJson(p);
    if (typeof obj !== 'object' || obj === null) {
      fail(`${name} must be a JSON object`);
    }
  } catch (err) {
    fail(String(err.message || err));
  }
}

for (const name of optional) {
  const p = pathFor(name);
  if (!p) {
    warn(`${name} not published`);
    continue;
  }
  if (name.endsWith('.json')) {
    try {
      await loadJson(p);
    } catch (err) {
      fail(String(err.message || err));
    }
  }
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('artifact validation failed');
} else {
  console.log('artifact validation completed (tolerant mode)');
}
