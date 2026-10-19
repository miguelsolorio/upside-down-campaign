// node scripts/polish/scenes.mjs --port 5211 --mode desktop|phone --out file.json
// Frame time of the screens that aren't the play field: title, options, map, picks, shop, pause, character sheet, dialogue, results, the arcade.
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210), mode = args.mode ?? 'desktop', secs = Number(args.secs ?? 6);
const hooks = readFileSync(new URL('./pagehooks.js', import.meta.url), 'utf8');
const sampler = readFileSync(new URL('./sampler.js', import.meta.url), 'utf8');
const PROGRESS = JSON.stringify({ v: 1, cleared: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'], heroes: [
  { id: 'mike', level: 7, xp: 40 }, { id: 'dustin', level: 6, xp: 10 }, { id: 'lucas', level: 6, xp: 0 }, { id: 'eleven', level: 6, xp: 0 }, { id: 'will', level: 5, xp: 0 }], purse: 40 });
const SET = (skip) => JSON.stringify({ musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: 1, reduceFlashing: false, skipDialogue: skip, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 });
/** Which game each cabinet in the Palace plays (src/arcade/cabinets.ts), so this runs against a production build too. */
const CABINET_GAMES = { cab1: 'galaga', cab2: 'pacman', cab3: 'centipede', cab4: 'dragonslair', cab5: 'mspacman', cab6: 'centipede', cab7: 'mspacman', cab8: 'galaga', digdug: 'digdug' };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const r2 = (n) => Math.round(n * 1000) / 1000;

const c = await launch(9640 + Math.floor(Math.random() * 30));
const results = {};
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  if (mode === 'phone') {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: hooks });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: sampler });
  const key = async (code, vk) => {
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(80);
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code, windowsVirtualKeyCode: vk }); await c.sleep(200);
  };
  const K = { enter: ['Enter', 13], down: ['ArrowDown', 40], up: ['ArrowUp', 38], right: ['ArrowRight', 39], esc: ['Escape', 27], p: ['KeyP', 80], x: ['KeyX', 88], space: ['Space', 32] };
  const press = (n) => key(...K[n]);
  const load = async (query, { progress = false, skip = true } = {}) => {
    const src = `try{localStorage.clear();${progress ? `localStorage.setItem('upside-down:progress:v1',${JSON.stringify(PROGRESS)});` : ''}localStorage.setItem('upside-down:settings:v1',${JSON.stringify(SET(skip))})}catch{}`;
    const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
    await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1&perf=1${mode === 'phone' ? '&touch=1' : ''}${query}` });
    await c.sleep(2200);
    await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  };
  const measure = async (name, seconds = secs) => {
    const from = await c.evaluate('window.__raw.tot.length');
    await c.sleep(seconds * 1000);
    const raw = JSON.parse(await c.evaluate(`JSON.stringify({ tot: window.__raw.tot.slice(${from}), tick: window.__raw.tick.slice(${from}), draw: window.__raw.draw.slice(${from}) })`));
    const t = raw.tot;
    results[name] = { frames: t.length, mean: r2(mean(t)), p95: r2(q(t, 0.95)), p99: r2(q(t, 0.99)), max: r2(Math.max(...t)), tick: r2(mean(raw.tick)), draw: r2(mean(raw.draw)) };
    console.log(`${name.padEnd(22)} ${mode} frames=${t.length} mean=${results[name].mean} p95=${results[name].p95} p99=${results[name].p99} max=${results[name].max} (tick ${results[name].tick}, draw ${results[name].draw})`);
  };

  // title and options (no save)
  await load('');
  await measure('title');
  await press('down'); await press('enter'); await c.sleep(300);
  await measure('title options', 4);
  // a save: the title, the map, the picks, Erica's cart
  await load('', { progress: true });
  await measure('title (with save)', 4);
  await press('enter'); await c.sleep(3200);
  await measure('map');
  await press('x'); await c.sleep(500);
  await measure('shop (Erica)', 4);
  await press('esc'); await c.sleep(400);
  // stage start with the story on: the dialogue box
  await load('&stage=1.1', { skip: false });
  await press('enter'); await c.sleep(1800);
  for (let i = 0; i < 40; i++) { if (await c.evaluate('window.__ud && window.__ud.play ? 1 : 0')) break; await press('enter'); await c.sleep(150); }
  await c.sleep(2500);
  await measure('dialogue box', 4);
  for (let i = 0; i < 12; i++) await press('enter');
  await press('p'); await c.sleep(400);
  await measure('pause menu', 4);
  await press('down'); await press('enter'); await c.sleep(400);
  await measure('character sheet', 4);
  // arcade cabinets in the Palace (2.1)
  await load('&stage=2.1&rush=1');
  const cabs = JSON.parse(await c.evaluate(`JSON.stringify(window.__ud.play.sim.view().props.filter((p) => p.kind === 'arcade').map((p) => ({ id: p.id, x: p.x + p.w / 2, y: p.y + p.h + 8 })))`));
  const seen = new Set();
  for (const cab of cabs) {
    const game = CABINET_GAMES[cab.id] ?? cab.id;
    if (seen.has(game)) continue; seen.add(game);
    await c.evaluate(`window.__ud.play.sim.dev.teleport(${cab.x}, ${cab.y})`);
    await c.sleep(600);
    await press('space'); await c.sleep(2500);
    for (let i = 0; i < 6; i++) { await press('enter'); await c.sleep(300); }
    await measure(`arcade ${game}`, 5);
    await press('esc'); await c.sleep(300); await press('esc'); await c.sleep(500);
  }
  // results: play 1.1 with the bot until it clears
  await load('&stage=1.1&rush=1&bot=1');
  for (let t0 = Date.now(); Date.now() - t0 < 200000;) {
    await c.sleep(2000);
    const a = await c.evaluate('window.__samples.slice(-3).map((s) => s.ctx && s.ctx.frames).join(",")');
    const f = a.split(',');
    if (Date.now() - t0 > 15000 && f.length === 3 && f[0] && f[0] === f[1] && f[1] === f[2]) break;
  }
  await c.sleep(1500);
  await measure('results', 5);
  if (args.out) writeFileSync(args.out, JSON.stringify(results, null, 1));
} finally { await c.close(); }
