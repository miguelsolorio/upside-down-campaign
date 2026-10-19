// node scripts/polish/tables.mjs before.json after.json : markdown table of frame time per stage, from two run.mjs outputs
import { readFileSync } from 'node:fs';
const [b, a] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const NAMES = { '1.1': 'Mirkwood', '1.2': 'Hawkins Lab', '1.3': 'Middle School', '2.1': 'The Palace', '2.2': 'The tunnels', '2.3': 'The Gate', '3.1': 'Starcourt Mall', '3.2': 'Russian base', '3.3': 'The food court' };
const f1 = (n) => n.toFixed(1);
console.log('| Stage | Before: mean / p95 / p99 / max | After: mean / p95 / p99 / max | Frames over 4 ms, before → after |');
console.log('|---|---|---|---|');
for (const id of Object.keys(NAMES)) {
  const x = b[id], y = a?.[id];
  if (!x) continue;
  const cell = (r) => `${f1(r.total.mean)} / ${f1(r.total.p95)} / ${f1(r.total.p99)} / ${f1(r.total.max)}`;
  console.log(`| ${id} ${NAMES[id]} | ${cell(x)} | ${y ? cell(y) : ''} | ${x.total.over4.toFixed(1)}%${y ? ` → ${y.total.over4.toFixed(1)}%` : ''} |`);
}
