// node scripts/polish/run.mjs --port 5210 --mode desktop|phone --stages 1.1,1.2 --max 200 --out file.json [--query "&x=1"]
// Plays each stage with the bot (?bot=1) and logs how long every frame took (?perf=1, src/core/perf.ts): the page needs to be a build or a dev server of this tree.
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210);
const mode = args.mode ?? 'desktop';
const stages = (args.stages ?? '1.1').split(',');
const max = Number(args.max ?? 200);
const query = args.query ?? '';
const base = args.bot === '0' ? '' : '&bot=1';
const sampler = readFileSync(new URL('./sampler.js', import.meta.url), 'utf8');

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r2 = (n) => Math.round(n * 1000) / 1000;

function summarize(raw, samples, warm = 3) {
  const keep = raw.sec.map((s, i) => (s >= warm ? i : -1)).filter((i) => i >= 0);
  const pick = (a) => keep.map((i) => a[i]);
  const tot = pick(raw.tot), tick = pick(raw.tick), draw = pick(raw.draw), copy = pick(raw.copy);
  const bySec = new Map();
  keep.forEach((i) => { const s = raw.sec[i]; if (!bySec.has(s)) bySec.set(s, []); bySec.get(s).push(raw.tot[i]); });
  const secs = [...bySec.entries()].map(([s, a]) => ({ sec: s, mean: r2(mean(a)), p95: r2(q(a, 0.95)), max: r2(Math.max(...a)), n: a.length, ctx: samples[s]?.ctx ?? null }));
  const busiest = [...secs].sort((a, b) => b.p95 - a.p95).slice(0, 3);
  return {
    frames: tot.length, seconds: secs.length,
    fps: r2(mean(samples.slice(warm).map((s) => s.fps).filter(Boolean))),
    total: { mean: r2(mean(tot)), p50: r2(q(tot, 0.5)), p95: r2(q(tot, 0.95)), p99: r2(q(tot, 0.99)), max: r2(Math.max(0, ...tot)), over4: r2((tot.filter((x) => x > 4).length / (tot.length || 1)) * 100) },
    tick: { mean: r2(mean(tick)), p95: r2(q(tick, 0.95)), max: r2(Math.max(0, ...tick)) },
    draw: { mean: r2(mean(draw)), p95: r2(q(draw, 0.95)), max: r2(Math.max(0, ...draw)) },
    copy: { mean: r2(mean(copy)), max: r2(Math.max(0, ...copy)) },
    busiest,
  };
}

const c = await launch(9330 + Math.floor(Math.random() * 50));
try {
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  if (mode === 'phone') {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  }
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: sampler });
  const results = {};
  for (const stage of stages) {
    const url = `http://127.0.0.1:${port}/?mute=1&rush=1${base}&perf=1&stage=${stage}${mode === 'phone' ? '&touch=1' : ''}${query}`;
    await c.send('Page.navigate', { url });
    const t0 = Date.now();
    let note = 'timeout';
    for (;;) {
      await c.sleep(2000);
      const s = await c.evaluate('JSON.stringify(window.__samples ? window.__samples.slice(-4) : [])').then(JSON.parse).catch(() => []);
      const secs = (Date.now() - t0) / 1000;
      if (secs > max) break;
      if (args.fixed) continue;
      const last = s.slice(-3);
      if (secs > 12 && last.length === 3 && last.every((x) => x.ctx && x.ctx.frames === last[0].ctx.frames)) { note = 'stage over'; break; }
    }
    const raw = JSON.parse(await c.evaluate('JSON.stringify(window.__raw)'));
    const samples = JSON.parse(await c.evaluate('JSON.stringify(window.__samples)'));
    const info = JSON.parse(await c.evaluate('JSON.stringify({touch: document.getElementById("stage").classList.contains("touch"), w: document.getElementById("game").width, h: document.getElementById("game").height, cssW: document.getElementById("game").style.width, dpr: devicePixelRatio, errs: window.__errs || null})'));
    results[stage] = { note, ran: r2((Date.now() - t0) / 1000), canvas: info, ...summarize(raw, samples) };
    const r = results[stage];
    console.log(`${stage} ${mode} ${note} ${r.ran}s frames=${r.frames} fps=${r.fps} total mean=${r.total.mean} p95=${r.total.p95} p99=${r.total.p99} max=${r.total.max} >4ms=${r.total.over4}% | tick mean=${r.tick.mean} max=${r.tick.max} | draw mean=${r.draw.mean} max=${r.draw.max} (copy ${r.copy.mean}/${r.copy.max}) | canvas ${info.w}x${info.h} touch=${info.touch}`);
    for (const b of r.busiest) console.log(`   busiest sec ${b.sec}: p95=${b.p95} max=${b.max} ${JSON.stringify(b.ctx)}`);
  }
  if (args.out) writeFileSync(args.out, JSON.stringify(results, null, 1));
} finally {
  await c.close();
}
