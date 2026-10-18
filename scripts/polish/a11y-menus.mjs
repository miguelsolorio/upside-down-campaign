// node scripts/polish/a11y-menus.mjs --port 5210 --input keyboard|gamepad|touch
// Drives the title, the options, the pause menu and the character sheet with ONE kind of input, and says which rows answered.
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

  // ---- title: PRESS START (0), OPTIONS (1)
  let o0 = await obs();
  await must('down');
  await must('confirm');
  await c.sleep(300);
  const rowsSeen = [];
  // ---- options: walk every row but BACK, adjusting it with right, and with confirm when right changed nothing
  const keys = ['difficulty', 'musicVol', 'sfxVol', 'scanlines', 'shake', 'reduceFlashing', 'skipDialogue'];
  const rowCount = 7 + (kind === 'gamepad' ? 2 : 1);
  for (let row = 0; row < rowCount; row++) {
    const a = await obs();
    if (!(await press('right'))) break;
    let b = await obs();
    let changed = Object.keys(b.set ?? {}).filter((k) => JSON.stringify(b.set[k]) !== JSON.stringify(a.set[k]));
    let scene = b.top !== a.top, how = 'right';
    if (!changed.length && !scene) {
      await press('confirm'); b = await obs(); how = 'confirm';
      changed = Object.keys(b.set ?? {}).filter((k) => JSON.stringify(b.set[k]) !== JSON.stringify(a.set[k]));
      scene = b.top !== a.top;
    }
    rowsSeen.push({ row, changed, scene, how });
    if (scene) { await press('cancel'); const back = await obs(); if (back.top !== a.top) log(false, `row ${row}: cancel did not come back from the new screen`); }
    else if (how === 'right') await press('left');
    await must('down');
  }
  keys.forEach((k, i) => log(rowsSeen[i]?.changed.includes(k) ?? false, `options row ${i} changes ${k}${rowsSeen[i] ? ` (saw ${rowsSeen[i].changed.join(',') || 'nothing'})` : ''}`));
  if (kind === 'touch') log(!!rowsSeen[7]?.changed.includes('shell'), 'options GAME BOY row changes the shell');
  if (kind === 'gamepad') log(!!rowsSeen[7]?.changed.includes('rumble'), 'options RUMBLE row changes rumble (a controller is in use)');
  if (kind !== 'touch') { const r = rowsSeen[kind === 'gamepad' ? 8 : 7]; log(!!r?.scene, 'options CONTROLS row opens the controls screen'); }
  console.log('rows:', JSON.stringify(rowsSeen));
  // leave options: cancel, then PRESS START
  await press('cancel');
  await press('up');
  const preStart = await obs();
  await must('confirm');
  await c.sleep(2500);
  const inStage = await obs();
  log(inStage.top !== preStart.top, 'PRESS START begins the game');
  // ---- pause menu
  await c.sleep(1500);
  const play = await obs();
  await must('pause');
  const paused = await obs();
  log(paused.top !== play.top, 'pause opens the pause menu');
  // RESUME is row 0, CHARACTERS row 1
  await must('down');
  await must('confirm');
  const sheet = await obs();
  log(sheet.top !== paused.top, 'pause menu CHARACTERS opens the character sheet');
  const s1 = await obs();
  await press(kind === 'touch' ? 'right' : 'swapNext'); await press('right'); await press('left');
  await must('cancel');
  const back = await obs();
  log(back.top === paused.top, 'cancel leaves the character sheet for the pause menu');
  await must('cancel');
  const resumed = await obs();
  log(resumed.top === play.top, 'cancel resumes play');
  // SELECT skips dialogue, START pauses again
  await must('pause'); const p2 = await obs();
  log(p2.top !== play.top, 'pause opens again');
  await must('pause'); const p3 = await obs();
  log(p3.top === play.top, 'pause closes the pause menu');
  const bad = out.filter((x) => !x.ok).length;
  console.log(`${kind}: ${out.length - bad} ok, ${bad} failed`);
} finally { await c.close(); }
