// The controller page of the CONTROLS screen and the RUMBLE row of the options, driven headless with the real input and
// a fake pad: pick a slot, press A, press the new button. Drawing is checked in the browser, not here.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PadLike } from '../src/core/gamepad.ts';
import { BTN } from '../src/core/gamepad.ts';

type Handler = (e: unknown) => void;
Object.assign(globalThis, { addEventListener: (_t: string, _fn: Handler) => {} });
let pads: (PadLike | null)[] = [];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
const classes = new Set<string>();
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ width: 1, height: 1, getContext: () => ({}) }),
  body: { classList: { toggle: (c: string, on: boolean) => { if (on) classes.add(c); else classes.delete(c); } } },
};
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
  configurable: true,
});

const { createInput } = await import('../src/core/input.ts');
const { createControlsScene } = await import('../src/ui/controls.ts');
const { reshape, settingItems, settingsKind } = await import('../src/ui/menu.ts');
const { getPadBinding, resetPadBindings } = await import('../src/core/padmap.ts');
const { getBinding, resetBindings } = await import('../src/core/bindings.ts');
const { settings } = await import('../src/core/settings.ts');

const hold = (...b: number[]): PadLike => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: b.includes(i), value: b.includes(i) ? 1 : 0 })),
  axes: [0, 0], mapping: 'standard', connected: true,
});

let backs = 0;
function open(): { scene: Scene; g: Game; tick: (...held: number[]) => void; press: (...b: number[]) => void } {
  const input = createInput();
  const g = { input, settings, flags: {}, frame: 0 } as unknown as Game;
  const scene = createControlsScene({ onBack: () => { backs++; } });
  const tick = (...held: number[]): void => { pads = [hold(...held)]; input.poll(); scene.update(g); };
  /** A press and a release, so the next press is fresh. */
  const press = (...b: number[]): void => { tick(...b); tick(); };
  return { scene, g, tick, press };
}
/** Opens the screen the way a controller player does: the pad has been touched, so it starts on the pad page. */
function openOnPad(): ReturnType<typeof open> {
  pads = [hold(BTN.LB)];
  const o = open();
  o.g.input.poll();
  o.tick();
  o.scene.enter?.(o.g);
  return o;
}

beforeEach(() => {
  pads = [];
  backs = 0;
  resetPadBindings();
  resetBindings();
  settings.rumble = true;
});

test('with a controller in use the screen opens on the controller page, and A starts a rebind of ATTACK', () => {
  const o = openOnPad();
  assert.equal(o.g.input.device(), 'gamepad');
  o.press(BTN.A);                       // the first row is ATTACK, slot 1
  o.press(BTN.LT);                      // waiting for a button: LT is it
  assert.deepEqual(getPadBinding('attack'), ['LT', 'RT']);
  assert.equal(backs, 0);
});

test('on a keyboard it opens on the keys page, so a controller press there never rebinds a button', () => {
  const input = createInput();
  const g = { input, settings, flags: {}, frame: 0 } as unknown as Game;
  const scene = createControlsScene({ onBack: () => { backs++; } });
  scene.enter?.(g);
  pads = [hold(BTN.A)];
  input.poll();
  scene.update(g);
  pads = [hold()];
  input.poll();
  scene.update(g);
  pads = [hold(BTN.LT)];
  input.poll();
  scene.update(g);
  assert.deepEqual(getPadBinding('attack'), ['A', 'RT'], 'untouched');
  assert.deepEqual(getBinding('up'), ['KeyW', null], 'and the key page was only browsed');
});

test('the second slot, and a swap with another action', () => {
  const o = openOnPad();
  o.press(BTN.RIGHT);                   // BTN 2
  o.press(BTN.A);
  o.press(BTN.Y);                       // Y was CRIT's, which gets RT in the swap
  assert.deepEqual(getPadBinding('attack'), ['A', 'Y']);
  assert.deepEqual(getPadBinding('burst'), ['RT', null]);
});

test('B can be bound like any button: it does not back out of the screen', () => {
  const o = openOnPad();
  o.press(BTN.DOWN);                    // SPECIAL
  o.press(BTN.RIGHT);
  o.press(BTN.A);
  o.press(BTN.B);
  assert.deepEqual(getPadBinding('special'), ['X', 'B']);
  assert.equal(backs, 0, 'the B that was taken did not count as back');
  // And it still backs out when the screen is just being browsed.
  o.press(BTN.B);
  assert.equal(backs, 1);
});

test('Start backs out of the wait without binding anything, and View clears the slot', () => {
  const o = openOnPad();
  o.press(BTN.A);
  o.press(BTN.MENU);
  assert.deepEqual(getPadBinding('attack'), ['A', 'RT']);
  assert.equal(backs, 0, 'Start ended the wait, it did not leave the screen');
  o.press(BTN.RIGHT);
  o.press(BTN.A);
  o.press(BTN.VIEW);
  assert.deepEqual(getPadBinding('attack'), ['A', null]);
  assert.equal(backs, 0);
});

test('the last button of an action cannot be cleared', () => {
  const o = openOnPad();
  o.press(BTN.DOWN); o.press(BTN.DOWN); o.press(BTN.DOWN); o.press(BTN.DOWN);   // CRIT, one button
  o.press(BTN.A);
  o.press(BTN.VIEW);
  assert.deepEqual(getPadBinding('burst'), ['Y', null]);
});

test('RESET ALL on the controller page restores the buttons and leaves the keys alone', () => {
  const o = openOnPad();
  o.press(BTN.A);
  o.press(BTN.LT);
  assert.deepEqual(getPadBinding('attack'), ['LT', 'RT']);
  for (let n = 0; n < 5; n++) o.press(BTN.DOWN);   // 5 rows, then RESET ALL
  o.press(BTN.A);
  assert.deepEqual(getPadBinding('attack'), ['A', 'RT']);
  assert.deepEqual(getBinding('attack'), ['KeyZ', 'KeyJ']);
});

test('the last row of the controller page leads back to the keys, and the keys page leads here', () => {
  const o = openOnPad();
  o.press(BTN.UP); o.press(BTN.UP);     // wraps to BACK, then KEYBOARD
  o.press(BTN.A);                       // now on the keys page: the first row is MOVE UP
  o.press(BTN.A);                       // starts a key rebind, which a pad press can't finish
  o.press(BTN.LT);
  assert.deepEqual(getBinding('up'), ['KeyW', null]);
  assert.deepEqual(getPadBinding('attack'), ['A', 'RT']);
  o.press(BTN.B);                       // backs out of the key wait
  o.press(BTN.UP); o.press(BTN.UP);     // BACK, then GAMEPAD
  o.press(BTN.A);
  o.press(BTN.A);
  o.press(BTN.RT);
  assert.deepEqual(getPadBinding('attack'), ['RT', 'A'], 'RT and A traded inside ATTACK');
});

// ---------------------------------------------------------------- the options row
test('RUMBLE shows in the options only while a controller is the input in use', () => {
  const rows = (device: string): string[] => settingItems({ input: { device: () => device }, settings } as unknown as Game).map((it) => it.label);
  assert.ok(rows('gamepad').includes('RUMBLE'));
  assert.ok(!rows('keyboard').includes('RUMBLE'));
  assert.ok(!rows('touch').includes('RUMBLE'));
  const pad = rows('gamepad');
  assert.deepEqual(pad.slice(pad.indexOf('RUMBLE') - 1), ['SKIP STORY', 'RUMBLE', 'CONTROLS']);
  assert.ok(rows('touch').includes('GAME BOY') && rows('keyboard').includes('CONTROLS'), 'the other rows are as they were');
});

test('the RUMBLE row flips ON and OFF with a press or a side arrow, and is saved with the settings', () => {
  const g = { input: { device: () => 'gamepad' }, settings } as unknown as Game;
  const row = settingItems(g).find((it) => it.label === 'RUMBLE');
  assert.ok(row);
  assert.equal(row.value?.(), 'ON');
  row.activate?.();
  assert.equal(settings.rumble, false);
  assert.equal(row.value?.(), 'OFF');
  assert.equal((JSON.parse(store.get('upside-down:settings:v1') ?? '{}') as { rumble?: boolean }).rumble, false, 'saved');
  row.adjust?.(1);
  assert.equal(settings.rumble, true);
  assert.equal((JSON.parse(store.get('upside-down:settings:v1') ?? '{}') as { rumble?: boolean }).rumble, true);
});

test('picking up the controller with a menu open brings RUMBLE in without moving the cursor', () => {
  let device = 'keyboard';
  const g = { input: { device: () => device }, settings } as unknown as Game;
  assert.equal(settingsKind(g), 'keys');
  const m = { sel: 0, items: settingItems(g) };
  m.sel = m.items.findIndex((it) => it.label === 'CONTROLS');
  device = 'gamepad';
  assert.equal(settingsKind(g), 'pad');
  reshape(m, settingItems(g));
  assert.equal(m.items[m.sel]?.label, 'CONTROLS', 'the cursor stays on CONTROLS though RUMBLE slid in above it');
  assert.ok(m.items.some((it) => it.label === 'RUMBLE'));
  m.sel = m.items.findIndex((it) => it.label === 'RUMBLE');
  device = 'touch';
  assert.equal(settingsKind(g), 'touch');
  reshape(m, settingItems(g));
  assert.ok(m.sel >= 0 && m.sel < m.items.length, 'a row that went away leaves the cursor on a real row');
  assert.ok(!m.items.some((it) => it.label === 'RUMBLE'));
});
