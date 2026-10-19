// node scripts/polish/a11y-story.mjs --port 5210 --input keyboard|gamepad|touch
// With the story on, gets from PRESS START through the prologue, the chapter card and the opening dialogue with ONE kind of input.
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
  const seed = args.seed ? `try{localStorage.setItem('upside-down:progress:v1',${JSON.stringify(args.seed)})}catch{}` : '';
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();localStorage.setItem('upside-down:settings:v1',${JSON.stringify(JSON.stringify({ musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: 1, reduceFlashing: false, skipDialogue: false, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 }))})}catch{}` });
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

  // ---- story on: PRESS START plays the prologue and the chapter card, then the stage opens with a dialogue box
  await must('confirm'); await c.sleep(2500);
  let presses = 0;
  while (presses < 120 && !(await c.evaluate('window.__ud && window.__ud.play ? 1 : 0'))) { await must('confirm'); presses++; await c.sleep(120); }
  log(presses < 120, `confirm alone gets through the prologue and the chapter card to the stage (${presses} presses)`);
  await c.sleep(1500);
  // ---- the stage's opening dialogue: confirm advances it, skip closes the rest
  const sim0 = await c.evaluate('JSON.stringify(window.__ud.play.sim.heroPos())');
  const d0 = await obs();
  let pressed = 0;
  // A dialogue box freezes the play field: while it is open the hero cannot be moved. Count confirm presses until a move works.
  async function canMove() {
    const a = await c.evaluate('JSON.stringify(window.__ud.play.sim.heroPos())');
    for (let i = 0; i < 6; i++) await press('right');
    await c.sleep(200);
    const b = await c.evaluate('JSON.stringify(window.__ud.play.sim.heroPos())');
    return a !== b;
  }
  const frozen = !(await canMove());
  console.log('opening dialogue frozen the hero:', frozen);
  if (frozen) {
    while (pressed < 40 && !(await canMove())) { await must('confirm'); pressed++; await c.sleep(150); }
    log(pressed < 40, `confirm closes the opening dialogue (${pressed} presses)`);
  } else log(true, 'no opening dialogue to close (play was free)');
  const bad = out.filter((x) => !x.ok).length;
  console.log(`${kind}: ${out.length - bad} ok, ${bad} failed`);
} finally { await c.close(); }
