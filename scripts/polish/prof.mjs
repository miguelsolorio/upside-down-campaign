// node scripts/polish/prof.mjs --port 5210 --stage 2.2 --secs 30 [--skip 8] [--mode desktop|phone] : CPU profile of the bot playing a stage, top self-time functions
import { launch } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210), stage = args.stage ?? '1.1', secs = Number(args.secs ?? 30), mode = args.mode ?? 'desktop', skip = Number(args.skip ?? 8);
const c = await launch(9400 + Math.floor(Math.random() * 50));
try {
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Profiler.enable');
  if (mode === 'phone') {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  await c.send('Profiler.setSamplingInterval', { interval: 200 });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1&rush=1&bot=1&perf=1&stage=${stage}${mode === 'phone' ? '&touch=1' : ''}` });
  await c.sleep(skip * 1000);
  await c.send('Profiler.start');
  await c.sleep(secs * 1000);
  const { profile } = await c.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*\/src\//, 'src/')}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + dt[i]); total += dt[i]; });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(args.top ?? 28));
  console.log(`${stage} ${mode} ${secs}s total sampled ${(total / 1000).toFixed(0)}ms`);
  for (const [k, v] of top) console.log(`${(v / 1000).toFixed(0).padStart(6)}ms ${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
} finally { await c.close(); }
