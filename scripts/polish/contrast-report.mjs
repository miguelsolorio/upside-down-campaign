import { readFileSync } from 'node:fs';
const store = JSON.parse(readFileSync(process.argv[2] ?? 'polish-out/contrast.json', 'utf8'));
const rows = Object.values(store);
const isPlay = (t) => t.startsWith('play-') || t.startsWith('results-');
console.log('entries', rows.length, 'draws', rows.reduce((a, r) => a + r.n, 0));
const group = (r) => (isPlay(r.tag) ? 'play' : r.tag);
const tags = {};
for (const r of rows) { const o = (tags[group(r)] ??= { texts: 0, p25under3: 0, p25under45: 0 }); o.texts++; if (r.p25 < 3) o.p25under3++; if (r.p25 < 4.5) o.p25under45++; }
console.log(Object.entries(tags).map(([k, v]) => `${k.padEnd(16)} ${String(v.texts).padStart(4)} texts, p25 contrast <4.5:1: ${v.p25under45}, <3:1: ${v.p25under3}`).join('\n'));
// merge by (color,text) over the UI screens and over the play field
const merged = new Map();
for (const r of rows) {
  const k = (isPlay(r.tag) ? 'play' : 'ui') + '|' + r.color + '|' + r.text;
  const o = merged.get(k);
  if (!o) merged.set(k, { ...r, group: isPlay(r.tag) ? 'play' : 'ui', tags: new Set([r.tag.replace(/-\d\.\d$/, '')]) });
  else { o.tags.add(r.tag.replace(/-\d\.\d$/, '')); o.n += r.n; if (r.p25 < o.p25) o.p25 = r.p25; if (r.min < o.min) o.min = r.min; if (r.below3 > o.below3) o.below3 = r.below3; }
}
const list = [...merged.values()].filter((r) => r.p25 < 4.5).sort((a, b) => a.p25 - b.p25);
for (const g of ['ui', 'play']) {
  console.log(`\n${g.toUpperCase()} texts whose 25th-percentile neighbour contrast is under 4.5:1 (worst first):`);
  for (const r of list.filter((x) => x.group === g).slice(0, g === 'ui' ? 60 : 45)) console.log(`${r.p25.toFixed(2).padStart(5)} p25  min ${r.min.toFixed(2).padStart(5)}  <3:1 ${(r.below3 * 100).toFixed(0).padStart(3)}%  ${r.color.padEnd(7)} "${r.text.slice(0, 40)}"  x${r.n}  [${[...r.tags].slice(0, 4).join(',')}]`);
}
