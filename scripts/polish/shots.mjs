// node scripts/polish/shots.mjs --port 5210 --what title,options,map,dialogue,stages [--stages 1.1,...] [--prefix polish]
// Takes the screenshots for docs/screenshots through the dev server's /__snap sink (POST /__snap?name=x with a data URL body), at 768 by 672.
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210);
const what = (args.what ?? 'title').split(',');
const stages = (args.stages ?? '1.1,1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3').split(',');
const hooks = readFileSync(new URL('./pagehooks.js', import.meta.url), 'utf8');
const sampler = readFileSync(new URL('./sampler.js', import.meta.url), 'utf8');
const PREFIX = args.prefix ?? 'polish';
const PROGRESS = JSON.stringify({ v: 1, cleared: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'], heroes: [
  { id: 'mike', level: 7, xp: 40 }, { id: 'dustin', level: 6, xp: 10 }, { id: 'lucas', level: 6, xp: 0 }, { id: 'eleven', level: 6, xp: 0 }, { id: 'will', level: 5, xp: 0 },
  { id: 'max', level: 5, xp: 0 }, { id: 'steve', level: 5, xp: 0 }, { id: 'robin', level: 4, xp: 0 }, { id: 'nancy', level: 4, xp: 0 }], purse: 40 });
const SETTINGS = (skip) => JSON.stringify({ musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: 1, reduceFlashing: false, skipDialogue: skip, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 });

const c = await launch(9600 + Math.floor(Math.random() * 30));
const saved = [];
const snap = async (name) => {
  const r = await c.evaluate(`fetch('/__snap?name=${name}', { method: 'POST', body: document.getElementById('game').toDataURL('image/png') }).then((r) => r.json()).then((j) => j.file)`);
  saved.push(r); console.log('saved', r);
};
const key = async (code, vk) => {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(80);
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(150);
};
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 768, height: 672, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: hooks });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: sampler });
  const prime = async (opts) => {
    const src = `try{localStorage.clear();${opts.progress ? `localStorage.setItem('upside-down:progress:v1',${JSON.stringify(PROGRESS)});` : ''}localStorage.setItem('upside-down:settings:v1',${JSON.stringify(SETTINGS(opts.skip ?? true))})}catch{}`;
    const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
    return identifier;
  };
  const go = async (query, opts) => {
    const id = await prime(opts);
    await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1${query}` });
    await c.sleep(1200);
    await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
  };

  if (what.includes('title')) { await go('&perf=1', {}); await c.sleep(3500); await snap(`${PREFIX}-title`); }
  if (what.includes('options')) { await go('&perf=1', {}); await c.sleep(1500); await key('ArrowDown', 40); await key('Enter', 13); await c.sleep(600); await snap(`${PREFIX}-options`); }
  if (what.includes('map')) {
    await go('&perf=1', { progress: true }); await c.sleep(2500);
    await key('Enter', 13); await c.sleep(3500);
    await snap(`${PREFIX}-map`);
  }
  if (what.includes('dialogue')) {
    await go('&perf=1&stage=1.1', { skip: false }); await c.sleep(1500);
    await key('Enter', 13); await c.sleep(1500);   // PRESS START; the story is on, so the prologue plays first
    // The prologue and the chapter card take about fifty presses of Enter; the stage opens on its first dialogue box.
    for (let i = 0; i < 200; i++) { const t = await c.evaluate('window.__ud && window.__ud.play ? 1 : 0'); if (t) break; await key('Enter', 13); await c.sleep(100); }
    await c.sleep(2500);
    await snap(`${PREFIX}-dialogue`);
  }
  if (what.includes('stages')) {
    let level = false;
    const bosses = new Set();
    for (const id of stages) {
      await go(`&rush=1&bot=1&perf=1&stage=${id}`, {});
      const t0 = Date.now();
      let shot = false, lastLevels = 0, over = 0, lastFrames = -1;
      for (;;) {
        await c.sleep(250);
        const secs = (Date.now() - t0) / 1000;
        const s = JSON.parse(await c.evaluate(`JSON.stringify((() => { const sim = window.__ud && window.__ud.play && window.__ud.play.sim; if (!sim) return null; const v = sim.view(); return { frames: sim.stats().frames, levels: sim.stats().levelUps.length, alive: sim.enemiesAlive(), actors: v.actors.length, boss: v.hud.boss ? v.hud.boss.name : null }; })())`));
        if (!s) { if (secs > 60) break; continue; }
        if (!shot && secs > 10 && s.alive >= 4 && s.actors >= 7 && !s.boss) { await snap(`${PREFIX}-stage-${id}`); shot = true; }
        if (!shot && secs > 50) { await snap(`${PREFIX}-stage-${id}`); shot = true; }
        if (s.boss && !bosses.has(s.boss)) {
          bosses.add(s.boss);
          await c.sleep(2500);
          await snap(`${PREFIX}-boss-${s.boss.toLowerCase().replace(/[^a-z]+/g, '-')}`);
        }
        if (!level && s.levels > lastLevels && lastLevels === 0 && s.levels > 0) { await c.sleep(300); await snap(`${PREFIX}-levelup`); level = true; }
        lastLevels = s.levels;
        over = s.frames === lastFrames ? over + 1 : 0; lastFrames = s.frames;
        if (secs > 15 && over >= 12) break;
        if (secs > 240) break;
      }
      console.log(id, 'done', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'bosses so far', [...bosses].join(','));
    }
  }
  console.log(JSON.stringify(saved));
} finally { await c.close(); }
