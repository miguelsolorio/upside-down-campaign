// node scripts/polish/flash.mjs --port 5210 --calm 0|1 --stages 1.1,... [--shake 1] [--raw polish-out/flashraw]
// Plays each stage with the bot while sampling the screen into an 8 by 5 grid of average relative luminance every frame, with the game's own
// flash and shake values beside it. Writes one raw file per stage; scripts/polish/flash-report.mjs counts the flashes from those, the way
// WCAG 2.3.1 does: opposing jumps of 10% of relative luminance, more than 3 pairs in any one second.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210), calm = args.calm === '1', stages = (args.stages ?? '1.1').split(','), max = Number(args.max ?? 200);
const shake = args.shake ?? '1';
const sampler = readFileSync(new URL('./sampler.js', import.meta.url), 'utf8');
const mon = readFileSync(new URL('./flashmon.js', import.meta.url), 'utf8');

mkdirSync(dirname(args.raw ?? 'polish-out/flashraw'), { recursive: true });
const c = await launch(9500 + Math.floor(Math.random() * 40));
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  const prefs = JSON.stringify({ musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: Number(shake), reduceFlashing: calm, skipDialogue: true, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('upside-down:settings:v1',${JSON.stringify(prefs)})}catch{}` });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: sampler });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: mon });
  for (const stage of stages) {
    await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1&rush=1&bot=1&perf=1&stage=${stage}` });
    const t0 = Date.now();
    for (;;) {
      await c.sleep(2000);
      const s = await c.evaluate('JSON.stringify(window.__samples ? window.__samples.slice(-4) : [])').then(JSON.parse).catch(() => []);
      const secs = (Date.now() - t0) / 1000;
      if (secs > max) break;
      const last = s.slice(-3);
      if (secs > 12 && last.length === 3 && last.every((x) => x.ctx && x.ctx.frames === last[0].ctx.frames)) break;
    }
    const fl = JSON.parse(await c.evaluate('JSON.stringify(window.__fl)'));
    writeFileSync(`${args.raw ?? 'polish-out/flashraw'}-${calm ? 'on' : 'off'}-${stage}.json`, JSON.stringify(fl));
    console.log(`${stage} calm=${calm} frames=${fl.t.length} saved`);
  }
} finally { await c.close(); }
