// The controller reader: buttons, triggers, the stick's deadzone and hysteresis, and which pad gets used.
// Pure TypeScript, so these run in Node with fake pads shaped like the browser's standard Xbox mapping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Action } from '../src/core/bindings.ts';
import { BTN, DEADZONE, pickPads, readPad, readPads } from '../src/core/gamepad.ts';
import type { PadLike } from '../src/core/gamepad.ts';

/** A standard-mapped pad. `held` maps a button index to its value: 1 for a press, a fraction for a trigger. */
function pad(held: Record<number, number> = {}, axes: number[] = [0, 0, 0, 0], extra: Partial<PadLike> = {}): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: (held[i] ?? 0) > 0.5, value: held[i] ?? 0 }));
  return { buttons, axes, mapping: 'standard', connected: true, ...extra };
}
const acts = (p: PadLike, prev: ReadonlySet<Action> = new Set()): Action[] => [...readPad(p, prev).actions].sort();

test('face buttons, bumpers and the menu buttons map to the game actions', () => {
  assert.deepEqual(acts(pad({ [BTN.A]: 1 })), ['attack', 'confirm', 'interact']);
  assert.deepEqual(acts(pad({ [BTN.X]: 1 })), ['special']);
  assert.deepEqual(acts(pad({ [BTN.B]: 1 })), ['cancel', 'dash']);
  assert.deepEqual(acts(pad({ [BTN.Y]: 1 })), ['burst']);
  assert.deepEqual(acts(pad({ [BTN.LB]: 1 })), ['swapPrev']);
  assert.deepEqual(acts(pad({ [BTN.RB]: 1 })), ['swapNext']);
  assert.deepEqual(acts(pad({ [BTN.VIEW]: 1 })), ['skip']);
  assert.deepEqual(acts(pad()), []);
});

test('Start sends pause and start together, and nothing else sends start', () => {
  assert.deepEqual(acts(pad({ [BTN.MENU]: 1 })), ['pause', 'start']);
  for (const [name, i] of Object.entries(BTN)) {
    if (i === BTN.MENU) continue;
    assert.ok(!readPad(pad({ [i]: 1 })).actions.has('start'), `${name} must not send start`);
  }
});

test('the d-pad moves and navigates', () => {
  assert.deepEqual(acts(pad({ [BTN.UP]: 1 })), ['up']);
  assert.deepEqual(acts(pad({ [BTN.DOWN]: 1 })), ['down']);
  assert.deepEqual(acts(pad({ [BTN.LEFT]: 1 })), ['left']);
  assert.deepEqual(acts(pad({ [BTN.RIGHT]: 1 })), ['right']);
});

test('triggers count past half pull: right attacks, left dashes', () => {
  assert.deepEqual(acts(pad({ [BTN.RT]: 0.7 })), ['attack']);
  assert.deepEqual(acts(pad({ [BTN.LT]: 0.7 })), ['dash']);
  assert.deepEqual(acts(pad({ [BTN.RT]: 0.3 })), []);
  // The trigger aliases don't confirm or cancel, so a stray pull can't push through a menu.
  assert.ok(!readPad(pad({ [BTN.RT]: 1 })).actions.has('confirm'));
  assert.ok(!readPad(pad({ [BTN.LT]: 1 })).actions.has('cancel'));
});

test('a stick inside the deadzone reads as centered', () => {
  const small = DEADZONE - 0.02;
  const r = readPad(pad({}, [small, 0]));
  assert.deepEqual(r.stick, { x: 0, y: 0 });
  assert.equal(r.actions.size, 0);
  assert.deepEqual(readPad(pad({}, [0.14, 0.14])).stick, { x: 0, y: 0 }, 'a diagonal is judged by its length');
});

test('past the deadzone the raw vector goes through, so a light tilt is a slow walk', () => {
  const r = readPad(pad({}, [0.4, 0]));
  assert.deepEqual(r.stick, { x: 0.4, y: 0 });
  assert.equal(r.actions.size, 0, 'a light tilt moves but presses no direction');
});

test('a stick pushed into a corner is clamped to length one', () => {
  const { stick } = readPad(pad({}, [1, 1]));
  assert.ok(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
  assert.ok(stick.x > 0 && stick.y > 0);
});

test('a pushed stick presses directions, with up as negative y', () => {
  assert.deepEqual(acts(pad({}, [0, -0.9])), ['up']);
  assert.deepEqual(acts(pad({}, [0, 0.9])), ['down']);
  assert.deepEqual(acts(pad({}, [-0.9, 0])), ['left']);
  assert.deepEqual(acts(pad({}, [0.9, 0])), ['right']);
  assert.deepEqual(acts(pad({}, [0.8, -0.8])), ['right', 'up']);
});

test('a held stick keeps its direction until it falls well back, so a menu does not chatter', () => {
  const held = new Set<Action>(['right']);
  assert.ok(readPad(pad({}, [0.4, 0]), held).actions.has('right'), 'still held at 0.4');
  assert.ok(!readPad(pad({}, [0.3, 0]), held).actions.has('right'), 'let go at 0.3');
  assert.ok(!readPad(pad({}, [0.4, 0])).actions.has('right'), 'a fresh push needs 0.5');
  assert.ok(readPad(pad({}, [0.55, 0])).actions.has('right'));
});

test('a missing button or axis reads as not pressed', () => {
  const bare: PadLike = { buttons: [], axes: [], mapping: 'standard', connected: true };
  assert.equal(readPad(bare).actions.size, 0);
  assert.deepEqual(readPad(bare).stick, { x: 0, y: 0 });
});

test('pickPads drops empty slots and pads that are gone', () => {
  const live = pad();
  assert.deepEqual(pickPads([null, undefined, pad({}, [0, 0], { connected: false }), live]), [live]);
  assert.deepEqual(pickPads([]), []);
});

test('pickPads prefers standard-mapped pads, and falls back to the rest only when there are none', () => {
  const xbox = pad();
  const odd = pad({}, [0, 0], { mapping: '' });
  assert.deepEqual(pickPads([odd, xbox]), [xbox]);
  assert.deepEqual(pickPads([odd]), [odd]);
});

test('two pads share the work: actions merge and the stronger stick wins', () => {
  const a = pad({ [BTN.A]: 1 }, [0.3, 0]);
  const b = pad({ [BTN.X]: 1 }, [0, 0.8]);
  const r = readPads([a, b]);
  assert.deepEqual([...r.actions].sort(), ['attack', 'confirm', 'down', 'interact', 'special']);
  assert.deepEqual(r.stick, { x: 0, y: 0.8 });
  assert.deepEqual(readPads([]).stick, { x: 0, y: 0 });
});
