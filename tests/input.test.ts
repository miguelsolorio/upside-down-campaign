// createInput with a controller: edges, the device switch, keys beating a drifting stick, hot-plug notices.
// Node has no window, so the three browser globals input.ts touches are stubbed here.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createInput, toSimInput } from '../src/core/input.ts';
import type { InputOptions, InputState } from '../src/core/input.ts';
import { BTN } from '../src/core/gamepad.ts';
import type { PadLike } from '../src/core/gamepad.ts';
import { resetBindings } from '../src/core/bindings.ts';
import { makeWhite } from './sim-helpers.ts';

type Handler = (e: unknown) => void;
const handlers = new Map<string, Handler[]>();
let pads: (PadLike | null)[] = [];

Object.assign(globalThis, {
  addEventListener: (type: string, fn: Handler) => { handlers.set(type, [...(handlers.get(type) ?? []), fn]); },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });

const fire = (type: string, e: unknown = {}): void => { for (const fn of handlers.get(type) ?? []) fn(e); };
const keyDown = (code: string): void => fire('keydown', { code, repeat: false, preventDefault() {} });
const keyUp = (code: string): void => fire('keyup', { code });

function pad(held: number[] = [], axes: number[] = [0, 0]): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 }));
  return { buttons, axes, mapping: 'standard', connected: true };
}
/** A fresh input, with the handlers of the last one forgotten. */
function make(opts?: InputOptions): InputState {
  handlers.clear();
  return createInput(opts);
}

beforeEach(() => {
  pads = [];
  resetBindings();
});

test('a controller button is pressed for one tick, held after that, then released', () => {
  const i = make();
  pads = [pad([BTN.A])];
  i.poll();
  assert.ok(i.pressed('attack') && i.held('attack') && i.pressed('confirm'));
  i.poll();
  assert.ok(!i.pressed('attack') && i.held('attack'));
  pads = [pad()];
  i.poll();
  assert.ok(i.released('attack') && !i.held('attack'));
});

test('Start gives pause and start on its first tick only', () => {
  const i = make();
  pads = [pad([BTN.MENU])];
  i.poll();
  assert.ok(i.pressed('pause') && i.pressed('start'));
  i.poll();
  assert.ok(!i.pressed('pause') && !i.pressed('start'));
});

test('the device follows whichever was touched last', () => {
  const i = make();
  assert.equal(i.device(), 'keyboard');
  pads = [pad([BTN.X])];
  i.poll();
  assert.equal(i.device(), 'gamepad');
  keyDown('KeyJ');
  assert.equal(i.device(), 'keyboard');
});

test('a stick that sits off center does not pull the device back from the keyboard', () => {
  const i = make();
  pads = [pad([], [0.6, 0])];
  i.poll();
  assert.equal(i.device(), 'gamepad', 'pushing the stick is a touch');
  keyDown('KeyJ');
  i.poll();
  i.poll();
  assert.equal(i.device(), 'keyboard', 'holding it there is not');
  pads = [pad([], [0, 0])];
  i.poll();
  pads = [pad([], [0, -0.7])];
  i.poll();
  assert.equal(i.device(), 'gamepad', 'a fresh push is');
});

test('the stick moves the hero, and a partial tilt is a partial vector', () => {
  const i = make();
  pads = [pad([], [0.5, 0])];
  i.poll();
  assert.deepEqual(i.axis(), { x: 0.5, y: 0 });
  pads = [pad([], [0, 0.05])];
  i.poll();
  assert.deepEqual(i.axis(), { x: 0, y: 0 }, 'inside the deadzone');
});

test('the d-pad moves at full speed when the stick is still', () => {
  const i = make();
  pads = [pad([BTN.LEFT])];
  i.poll();
  assert.deepEqual(i.axis(), { x: -1, y: 0 });
});

test('held movement keys win over a stick that has drifted', () => {
  const i = make();
  pads = [pad([], [0.4, 0.4])];
  keyDown('KeyD');
  i.poll();
  assert.deepEqual(i.axis(), { x: 1, y: 0 });
  keyUp('KeyD');
  i.poll();
  const a = i.axis();
  assert.ok(a.x > 0 && a.y > 0, 'the stick takes over once the key is up');
});

test('Space bursts only when the play scene says nothing is in reach to light', () => {
  const i = make();
  keyDown('Space');
  i.poll();
  assert.equal(toSimInput(i, true).burstPressed, true);
  assert.equal(toSimInput(i).burstPressed, false, 'next to lights, Space lights them');
  keyUp('Space');
  keyDown('KeyU');
  i.poll();
  assert.equal(toSimInput(i).burstPressed, true, 'U bursts anywhere');
});

test('a Space press with a full d20 and nothing in reach sets off the party burst', () => {
  const i = make();
  const { sim, s } = makeWhite();
  s.burst = 1;
  keyDown('Space');
  i.poll();
  assert.equal(sim.step(toSimInput(i, true)).filter((e) => e.t === 'burst').length, 1);
  assert.equal(sim.view().hud.burst, 0);
});

test("a controller's A attacks and never bursts, and Y does", () => {
  const i = make();
  pads = [pad([BTN.A])];
  i.poll();
  assert.ok(i.pressed('interact'));
  assert.equal(toSimInput(i, true).burstPressed, false);
  pads = [pad([BTN.Y])];
  i.poll();
  assert.equal(toSimInput(i, true).burstPressed, true);
});

test('the keyboard still works with no controller at all', () => {
  const i = make();
  keyDown('KeyJ');
  i.poll();
  assert.ok(i.pressed('attack'));
  keyDown('KeyA');
  i.poll();
  assert.deepEqual(i.axis(), { x: -1, y: 0 });
});

test('connecting a controller says so once and makes it the device', () => {
  const i = make();
  assert.equal(i.notice(), null);
  fire('gamepadconnected', { gamepad: pad() });
  assert.equal(i.device(), 'gamepad');
  assert.equal(i.notice(), 'CONTROLLER CONNECTED');
  assert.equal(i.notice(), null, 'the notice is taken, not repeated');
});

test('a pad that is not live is ignored when it connects', () => {
  const i = make();
  fire('gamepadconnected', { gamepad: { ...pad(), connected: false } });
  assert.equal(i.notice(), null);
  assert.equal(i.device(), 'keyboard');
});

test('losing the only controller says so and hands the prompts back to the keyboard', () => {
  const i = make();
  pads = [pad()];
  fire('gamepadconnected', { gamepad: pads[0] });
  i.notice();
  pads = [];
  fire('gamepaddisconnected', {});
  assert.equal(i.notice(), 'CONTROLLER LOST');
  assert.equal(i.device(), 'keyboard');
});

test('losing one of two controllers is not news', () => {
  const i = make();
  pads = [pad(), pad()];
  fire('gamepaddisconnected', {});
  assert.equal(i.notice(), null);
});

test('onPadPress fires on a fresh press, not while the button stays down', () => {
  let n = 0;
  const i = make({ onPadPress: () => { n++; } });
  pads = [pad([BTN.A])];
  i.poll();
  i.poll();
  i.poll();
  assert.equal(n, 1);
  pads = [pad()];
  i.poll();
  pads = [pad([BTN.B])];
  i.poll();
  assert.equal(n, 2);
});

test('onPadPress stays quiet for the keyboard', () => {
  let n = 0;
  const i = make({ onPadPress: () => { n++; } });
  keyDown('KeyJ');
  i.poll();
  assert.equal(n, 0);
});

// ---------------------------------------------------------------- the touch controls
test('the touch controls act like a controller, switch the prompts to touch and stay off onPadPress', () => {
  let n = 0;
  let touch: PadLike | null = null;
  const i = make({ onPadPress: () => { n++; }, touch: { pad: () => touch } });
  touch = pad([BTN.A]);
  i.poll();
  assert.ok(i.pressed('attack') && i.pressed('confirm'));
  assert.equal(i.device(), 'touch');
  assert.equal(n, 0, 'a touch never asks for sound the controller way');
  keyDown('KeyJ');
  assert.equal(i.device(), 'keyboard');
  i.poll();
  assert.equal(i.device(), 'keyboard', 'a button still held is not a fresh touch');
});

test('a finger anywhere on the page hands the prompts to touch', () => {
  const i = make();
  fire('pointerdown', { pointerType: 'mouse' });
  assert.equal(i.device(), 'keyboard');
  fire('pointerdown', { pointerType: 'touch' });
  assert.equal(i.device(), 'touch');
});

test('a phone starts on touch, and losing a controller hands it back to touch', () => {
  const i = make({ startDevice: 'touch' });
  assert.equal(i.device(), 'touch');
  fire('gamepadconnected', { gamepad: pad() });
  assert.equal(i.device(), 'gamepad');
  fire('gamepaddisconnected', {});
  assert.equal(i.device(), 'touch');
});

test('the stronger of the touch stick and the controller stick wins', () => {
  let touch: PadLike | null = pad([], [0.3, 0]);
  const i = make({ touch: { pad: () => touch } });
  pads = [pad([], [0, -0.9])];
  i.poll();
  assert.deepEqual(i.axis(), { x: 0, y: -0.9 });
  touch = pad([], [1, 0]);
  i.poll();
  assert.deepEqual(i.axis(), { x: 1, y: 0 });
});

test('the touch stick steps through menus with the same hysteresis as a controller', () => {
  let touch: PadLike | null = pad([], [0, 0.6]);
  const i = make({ touch: { pad: () => touch } });
  i.poll();
  assert.ok(i.pressed('down'));
  touch = pad([], [0, 0.4]);
  i.poll();
  assert.ok(i.held('down') && !i.pressed('down'), 'easing off a little holds the step');
  touch = null;
  i.poll();
  assert.ok(!i.held('down'), 'hidden controls let go');
});

test('an offer lasts until the next poll', () => {
  const i = make();
  i.poll();
  i.offer('skip');
  assert.ok(i.offered('skip') && !i.offered('burst'));
  i.poll();
  assert.ok(!i.offered('skip'));
});
