import { execFileSync } from 'node:child_process';

const base = process.env.CACHED_COMMIT_REF;
const head = process.env.COMMIT_REF;

// If Netlify cannot tell us what changed, build normally.
if (!base || !head || base === head) process.exit(1);

let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' })
    .split('\n')
    .map(value => value.trim())
    .filter(Boolean);
} catch {
  process.exit(1);
}

if (!changed.length) process.exit(0);

// These files are live data. They are read from GitHub/Blobs at runtime and
// do not need a new production deploy.
const liveOnly = changed.every(path =>
  path === 'productos.js' ||
  path.startsWith('images/uploads/')
);

process.exit(liveOnly ? 0 : 1);
