// node scripts/polish/a11y-map.mjs --port 5210 --input keyboard|gamepad|touch
// Drives CONTINUE, the map, Erica's cart and the party picks with ONE kind of input, and says which of them answered.
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, r) => (v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a), []));
const port = Number(args.port ?? 5210), kind = args.input ?? 'keyboard';
const hooks = readFileSync(new URL('./pagehooks.js', import.meta.url), 'utf8');
const KEYS = { up: ['ArrowUp', 38], down: ['ArrowDown', 40], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], confirm: ['Enter', 13], cancel: ['Escape', 27], special: ['KeyX', 88], pause: ['KeyP', 80], skip: ['KeyT', 84], swapNext: ['KeyV', 86], swapPrev: ['KeyC', 67], attack: ['KeyZ', 90] };
const PADB = { confirm: 0, attack: 0, cancel: 1, special: 2, burst: 3, swapPrev: 4, swapNext: 5, skip: 8, pause: 9, up: 12, down: 13, left: 14, right: 15 };
const TOUCHB = { confirm: 'a', attack: 'a', cancel: 'b', special: 'b', swapNext: 'swap', skip: 'select', pause: 'start', burst: 'burst' };

const c = await launch(9560 + Math.floor(Math.random() * 30));
const out = [];
const log = (ok, what) => { out.push({ ok, what }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${kind}: ${what}`); };
try {
  await c.send('Page.enable'); await c.send('Runtime.enable');
  if (kind === 'touch') {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else await c.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: hooks });
  const PROGRESS = JSON.stringify({ v: 1, cleared: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1'], heroes: [
    { id: 'mike', level: 5, xp: 40 }, { id: 'dustin', level: 4, xp: 10 }, { id: 'lucas', level: 4, xp: 0 }, { id: 'eleven', level: 4, xp: 0 }, { id: 'will', level: 3, xp: 0 },
    { id: 'max', level: 3, xp: 0 }, { id: 'steve', level: 3, xp: 0 }, { id: 'robin', level: 3, xp: 0 }, { id: 'nancy', level: 3, xp: 0 }], purse: 60 });
  const seed = `try{localStorage.setItem('upside-down:progress:v1',${JSON.stringify(PROGRESS)})}catch{}`;
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear()}catch{};${seed}` });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${port}/?mute=1${kind === 'touch' ? '&touch=1' : ''}` });
  await c.sleep(2500);

  let layout = null;
  if (kind === 'touch') layout = await c.evaluate(`(async () => { const m = await import('/src/core/touchlayout.ts'); const l = m.layoutTouch({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, safe: { t: 0, l: 0, r: 0, b: 0 } }); return JSON.parse(JSON.stringify(l)); })()`);
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const dpadAt = (dir) => { const k = layout.dpadR * 0.75, d = layout.dpad; return { x: d.x + (dir === 'left' ? -k : dir === 'right' ? k : 0), y: d.y + (dir === 'up' ? -k : dir === 'down' ? k : 0) }; };
  const obs = async () => JSON.parse(await c.evaluate('JSON.stringify(window.__obs())'));

  /** One press of an action with this input kind. Returns false when this input has no way to send it. */
  async function press(action) {
    if (kind === 'keyboard') {
      const [code, vk] = KEYS[action]; if (!code) return false;
      await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: code, windowsVirtualKeyCode: vk });
      await c.sleep(70);
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code, windowsVirtualKeyCode: vk });
    } else if (kind === 'gamepad') {
      const i = PADB[action]; if (i === undefined) return false;
      await c.evaluate(`window.__pad.on = true; window.__pad.buttons[${i}] = { pressed: true, value: 1, touched: true }`);
      await c.sleep(70);
      await c.evaluate(`window.__pad.buttons[${i}] = { pressed: false, value: 0, touched: false }`);
    } else {
      let p;
      if (['up', 'down', 'left', 'right'].includes(action)) p = dpadAt(action);
      else { const b = TOUCHB[action]; if (!b) return false; p = center(layout.buttons[b]); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
      await c.sleep(90);
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await c.sleep(160);
    return true;
  }
  const must = async (action) => { if (!(await press(action))) { log(false, `no way to send ${action}`); return false; } return true; };

  // ---- title with a save: CONTINUE (0), NEW GAME (1), OPTIONS (2)
  const t0 = await obs();
  await must('confirm');
  await c.sleep(3500);
  const map = await obs();
  log(map.top !== t0.top, 'CONTINUE opens the map');
  const shot = async () => JSON.parse(await c.evaluate('JSON.stringify(window.__shot())'));
  const diff = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length / 255;
  const base = await shot();
  await c.sleep(200);
  const base2 = await shot();
  console.log('map idle noise', diff(base, base2).toFixed(4));
  // ---- Erica's cart: special opens it; which input closes it?
  await must('special'); await c.sleep(400);
  const shop = await shot();
  log(diff(base, shop) > 0.04, `the map opens Erica's cart with the special key (change ${diff(base, shop).toFixed(3)})`);
  await press('cancel'); await c.sleep(400);
  let after = await shot();
  const cancelShop = diff(base, after) < 0.02;
  if (!cancelShop) { await press('pause'); await c.sleep(400); after = await shot(); }
  log(diff(base, after) < 0.02, `the cart closes (${cancelShop ? 'with cancel' : 'only with pause/START'})`);
  // ---- confirm on the next stage (3.2) opens the party picks
  await must('confirm'); await c.sleep(700);
  const picks = await shot();
  log(diff(base, picks) > 0.04, `the map opens the party picks for 3.2 (change ${diff(base, picks).toFixed(3)})`);
  await press('cancel'); await c.sleep(500);
  let p2 = await shot();
  const cancelPicks = diff(base, p2) < 0.02;
  if (!cancelPicks) { await press('pause'); await c.sleep(500); p2 = await shot(); }
  log(diff(base, p2) < 0.02, `the picks close (${cancelPicks ? 'with cancel' : 'only with pause/START'})`);
  // ---- picks: walk the cursor to START and start the stage
  await must('confirm'); await c.sleep(700);
  let started = false;
  for (const path of [['down', 'down', 'down'], ['down', 'down'], ['up'], ['down', 'down', 'down', 'down'], ['down']]) {
    for (const d of path) await press(d);
    await must(kind === 'keyboard' ? 'confirm' : 'attack'); await c.sleep(2800);
    if (await c.evaluate('window.__ud && window.__ud.play ? 1 : 0')) { started = true; break; }
  }
  log(started, 'the picks START row starts the stage');
  const bad = out.filter((x) => !x.ok).length;
  console.log(`${kind}: ${out.length - bad} ok, ${bad} failed`);
} finally { await c.close(); }
