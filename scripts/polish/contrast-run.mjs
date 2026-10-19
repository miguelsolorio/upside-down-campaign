// node scripts/polish/contrast-run.mjs --port 5213 --out polish-out/contrast.json [--stages 1.1,...]
// Drives the game through its screens on a server whose font.ts carries the contrast probe: every text draw records the colors behind it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5213);
const stages = (args.stages ?? '1.1,1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3').split(',');
const hooks = readFileSync(new URL('./pagehooks.js', import.meta.url), 'utf8');
const sampler = readFileSync(new URL('./sampler.js', import.meta.url), 'utf8');
const PROGRESS = JSON.stringify({ v: 1, cleared: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'], heroes: [
  { id: 'mike', level: 7, xp: 40 }, { id: 'dustin', level: 6, xp: 10 }, { id: 'lucas', level: 6, xp: 0 }, { id: 'eleven', level: 6, xp: 0 }, { id: 'will', level: 5, xp: 0 },
  { id: 'max', level: 5, xp: 0 }, { id: 'steve', level: 5, xp: 0 }, { id: 'robin', level: 4, xp: 0 }, { id: 'nancy', level: 4, xp: 0 }], purse: 40 });
const SET = (skip) => JSON.stringify({ musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: 1, reduceFlashing: false, skipDialogue: skip, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 });
const K = { enter: ['Enter', 13], down: ['ArrowDown', 40], up: ['ArrowUp', 38], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], esc: ['Escape', 27], p: ['KeyP', 80], x: ['KeyX', 88] };

mkdirSync('polish-out', { recursive: true });
const c = await launch(9700 + Math.floor(Math.random() * 40));
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 768, height: 672, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: hooks });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: sampler });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__ct = window.__ct || {};' });
  const tag = (t) => c.evaluate(`window.__ctTag = ${JSON.stringify(t)}`);
  const key = async (n) => {
    const [code, vk] = K[n];
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(80);
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(220);
  };
  const store = {};
  const harvest = async () => {
    const got = JSON.parse(await c.evaluate('JSON.stringify(window.__ct)'));
    for (const [k, v] of Object.entries(got)) {
      const o = store[k];
      if (!o) store[k] = v; else { o.n += v.n; if (v.ratio < o.ratio) { o.ratio = v.ratio; o.bg = v.bg; } o.bad = Math.max(o.bad, v.bad); }
    }
  };
  const go = async (query, { progress = false, skip = true } = {}) => {
    await harvest().catch(() => {});
    const src = `try{localStorage.clear();${progress ? `localStorage.setItem('upside-down:progress:v1',${JSON.stringify(PROGRESS)});` : ''}localStorage.setItem('upside-down:settings:v1',${JSON.stringify(SET(skip))})}catch{}`;
    const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
    await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1&perf=1${query}` });
    await c.sleep(1800);
    await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  };
  const inPlay = () => c.evaluate('window.__ud && window.__ud.play ? 1 : 0');

  // A. title, options, controls
  await go(''); await tag('title'); await c.sleep(2500);
  await key('down'); await key('enter'); await tag('options'); await c.sleep(1200);
  for (let i = 0; i < 7; i++) await key('down');
  await key('enter'); await tag('controls'); await c.sleep(1200);
  await key('down'); await key('down'); await key('enter'); await tag('controls-listen'); await c.sleep(800);
  await key('esc'); await key('esc'); await key('esc');
  // B. a save: title, map, nodes, shop, picks
  await go('', { progress: true }); await tag('title-save'); await c.sleep(2000);
  await key('enter'); await tag('map'); await c.sleep(3500);
  for (const d of ['left', 'left', 'left', 'right', 'right', 'right', 'right']) { await key(d); await c.sleep(900); }
  await key('x'); await tag('shop'); await c.sleep(1500); await key('down'); await key('down'); await c.sleep(600); await key('esc');
  await tag('map'); await c.sleep(600);
  await key('enter'); await tag('picks'); await c.sleep(1500); await key('right'); await key('down'); await c.sleep(800);
  // C. the story: prologue, chapter card, opening dialogue
  await go('', { skip: false }); await tag('story'); await c.sleep(1500);
  await key('enter');
  for (let i = 0; i < 130 && !(await inPlay()); i++) { await key('enter'); await c.sleep(180); }
  await c.sleep(1500); await tag('dialogue');
  for (let i = 0; i < 6; i++) { await c.sleep(1500); await key('enter'); }
  await tag('hud');
  await c.sleep(1500);
  await key('p'); await tag('pause'); await c.sleep(1200);
  await key('down'); await key('enter'); await tag('sheet'); await c.sleep(1200);
  for (let i = 0; i < 4; i++) { await key('right'); await c.sleep(500); }
  await key('esc'); await key('esc');
  // D. the bot through every stage
  for (const id of stages) {
    await go(`&rush=1&bot=1&stage=${id}`);
    await tag(`play-${id}`);
    const t0 = Date.now(); let last = -1, same = 0;
    while (Date.now() - t0 < 240000) {
      await c.sleep(2000);
      const f = await c.evaluate('window.__ud && window.__ud.play ? window.__ud.play.sim.stats().frames : -1');
      same = f === last ? same + 1 : 0; last = f;
      if (Date.now() - t0 > 15000 && same >= 3) break;
    }
    await tag(`results-${id}`); await c.sleep(2500);
    console.log(id, 'done');
  }
  await harvest();
  writeFileSync(args.out ?? 'polish-out/contrast.json', JSON.stringify(store));
  console.log('entries', Object.keys(store).length);
} finally { await c.close(); }
