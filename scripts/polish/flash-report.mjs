// node scripts/polish/flash-report.mjs [prefix] : reads <prefix>-{off,on}-<stage>.json, written by flash.mjs
import { existsSync, readFileSync } from 'node:fs';
const STAGES = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3'];
const prefix = process.argv[2] ?? 'polish-out/flashraw';
/** A flash is a reversal of this much relative luminance (WCAG 2.3.1: 10%). */
const SWING = 0.1;

/** Times of the opposing transitions in a series: a reversal of at least `swing` from the running extreme. */
function zigzag(t, y, swing) {
  const out = [];
  let dir = 0, ext = y[0], extAt = 0;
  for (let i = 1; i < y.length; i++) {
    if (dir >= 0 && y[i] > ext) { ext = y[i]; extAt = i; if (dir === 0 && ext - y[0] >= swing) { dir = 1; } }
    else if (dir <= 0 && y[i] < ext) { ext = y[i]; extAt = i; if (dir === 0 && y[0] - ext >= swing) { dir = -1; } }
    if (dir === 1 && ext - y[i] >= swing) { out.push(t[extAt]); dir = -1; ext = y[i]; extAt = i; }
    else if (dir === -1 && y[i] - ext >= swing) { out.push(t[extAt]); dir = 1; ext = y[i]; extAt = i; }
  }
  return out;
}
/** Most transitions inside any 1 s window. */
function worst(ev) {
  let best = 0, at = 0;
  for (let a = 0, b = 0; b < ev.length; b++) { while (ev[b] - ev[a] > 1000) a++; if (b - a + 1 > best) { best = b - a + 1; at = ev[a]; } }
  return { n: best, at };
}

function analyse(file) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  // The first two seconds are the page loading and the stage fading in from black, not play.
  const from = raw.t.findIndex((t) => t >= raw.t[0] + 2000);
  const fl = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.slice(from)]));
  const n = fl.t.length, B = fl.blocks[0].length;
  const mean = fl.blocks.map((r) => r.reduce((a, v) => a + v, 0) / B);
  let swing100 = 0, at100 = 0;
  for (let i = 0, j = 0; i < n; i++) {
    while (fl.t[i] - fl.t[j] > 100) j++;
    let lo = 1, hi = 0;
    for (let k = j; k <= i; k++) { if (mean[k] < lo) lo = mean[k]; if (mean[k] > hi) hi = mean[k]; }
    if (hi - lo > swing100) { swing100 = hi - lo; at100 = fl.t[i]; }
  }
  const gz = zigzag(fl.t, mean, 0.03);
  const g = worst(gz);
  const big = zigzag(fl.t, mean, 0.1);
  const bigW = worst(big);
  return { frames: n, swing100: Math.round(swing100 * 1000) / 1000, swing100At: Math.round(at100), globalTransitionsPerSec: g.n, globalAt: g.at, bigEvents: big.length, bigPerSec: bigW.n, flashMax: Math.max(...fl.flash), shakeMax: Math.max(...fl.shakeAmp), shakeFrames: fl.shakeAmp.filter((v) => v > 0).length };
}
const rows = [];
for (const stage of STAGES) {
  for (const mode of ['off', 'on']) {
    const f = `${prefix}-${mode}-${stage}.json`;
    if (!existsSync(f)) continue;
    const r = analyse(f);
    rows.push({ stage, mode, ...r });
    console.log(`${stage} calm ${mode.padEnd(3)} frames=${r.frames} | biggest swing of the screen's mean in 100 ms: ${r.swing100} at ${r.swing100At}ms | whole-screen mean: swings >=0.1: ${r.bigEvents} in the run, at most ${r.bigPerSec} in a second | game flash max ${r.flashMax} | shake max ${r.shakeMax}px on ${r.shakeFrames} frames`);
  }
}
