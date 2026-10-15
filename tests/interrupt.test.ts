// What pulls the player away from the game: the window losing focus, the tab being hidden, and the controller they were
// playing with going away. createInput reports it for one tick (`interrupted`), and the scenes where something moves pause on it.
// Node has no window, so the browser globals input.ts touches are stubbed here.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/core/input.ts';
import type { InputOptions, InputState } from '../src/core/input.ts';
import { BTN } from '../src/core/gamepad.ts';
import type { PadLike } from '../src/core/gamepad.ts';
import { resetBindings } from '../src/core/bindings.ts';

type Handler = (e: unknown) => void;
const handlers = new Map<string, Handler[]>();
const docHandlers = new Map<string, Handler[]>();
const page = { visibilityState: 'visible' };
let pads: (PadLike | null)[] = [];

Object.assign(globalThis, {
  addEventListener: (type: string, fn: Handler) => { handlers.set(type, [...(handlers.get(type) ?? []), fn]); },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
Object.defineProperty(globalThis, 'document', {
  value: Object.assign(page, { addEventListener: (type: string, fn: Handler) => { docHandlers.set(type, [...(docHandlers.get(type) ?? []), fn]); } }),
  configurable: true,
});

const fire = (type: string, e: unknown = {}): void => { for (const fn of handlers.get(type) ?? []) fn(e); };
const hide = (visibilityState: string): void => { page.visibilityState = visibilityState; for (const fn of docHandlers.get('visibilitychange') ?? []) fn({}); };
const keyDown = (code: string): void => fire('keydown', { code, repeat: false, preventDefault() {} });

function pad(held: number[] = []): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 }));
  return { buttons, axes: [0, 0], mapping: 'standard', connected: true };
}
function make(opts?: InputOptions): InputState {
  handlers.clear();
  docHandlers.clear();
  return createInput(opts);
}

beforeEach(() => {
  pads = [];
  page.visibilityState = 'visible';
  resetBindings();
});

test('nothing interrupts a game that is just being played', () => {
  const i = make();
  i.poll();
  assert.equal(i.interrupted(), false);
  keyDown('KeyJ');
  i.poll();
  assert.equal(i.interrupted(), false);
});

test('the window losing focus interrupts for one tick', () => {
  const i = make();
  i.poll();
  fire('blur');
  assert.equal(i.interrupted(), false, 'it is reported by the next poll, like every other input');
  i.poll();
  assert.equal(i.interrupted(), true);
  i.poll();
  assert.equal(i.interrupted(), false, 'one tick only');
});

test('the tab being hidden interrupts, and coming back does not', () => {
  const i = make();
  hide('hidden');
  i.poll();
  assert.equal(i.interrupted(), true);
  i.poll();
  hide('visible');
  i.poll();
  assert.equal(i.interrupted(), false, 'the pause waits for the player, so showing the tab again is not another one');
});

test('a hidden tab that stops the loop is still reported when the first tick runs after it comes back', () => {
  const i = make();
  i.poll();
  hide('hidden');
  hide('visible');
  fire('focus');
  i.poll();
  assert.equal(i.interrupted(), true);
});

test('losing focus and hiding the tab together are one interruption', () => {
  const i = make();
  fire('blur');
  hide('hidden');
  i.poll();
  assert.equal(i.interrupted(), true);
  i.poll();
  assert.equal(i.interrupted(), false);
});

test('losing focus lets go of the held keys', () => {
  const i = make();
  keyDown('KeyD');
  i.poll();
  assert.ok(i.held('right'));
  fire('blur');
  i.poll();
  assert.ok(!i.held('right'));
});

test('losing the controller being played with interrupts, and hands the prompts back', () => {
  const i = make();
  pads = [pad([BTN.A])];
  i.poll();
  assert.equal(i.device(), 'gamepad');
  pads = [];
  fire('gamepaddisconnected');
  i.poll();
  assert.equal(i.interrupted(), true);
  assert.equal(i.device(), 'keyboard');
  assert.equal(i.notice(), 'CONTROLLER LOST');
});

test('a controller that drops while the keyboard has the hands is news but not an interruption', () => {
  const i = make();
  pads = [pad([BTN.A])];
  i.poll();
  keyDown('KeyJ');
  pads = [];
  fire('gamepaddisconnected');
  i.poll();
  assert.equal(i.interrupted(), false);
  assert.equal(i.notice(), 'CONTROLLER LOST');
});

test('losing one of two controllers does not interrupt, since the other one still plays', () => {
  const i = make();
  pads = [pad([BTN.A]), pad()];
  i.poll();
  assert.equal(i.device(), 'gamepad');
  pads = [pad()];
  fire('gamepaddisconnected');
  i.poll();
  assert.equal(i.interrupted(), false);
  assert.equal(i.device(), 'gamepad');
});

test('a controller that drops under the touch screen is not an interruption either', () => {
  const i = make({ startDevice: 'touch' });
  pads = [pad()];
  fire('gamepadconnected', { gamepad: pads[0] });
  keyDown('KeyJ');
  fire('pointerdown', { pointerType: 'touch' });
  assert.equal(i.device(), 'touch');
  pads = [];
  fire('gamepaddisconnected');
  i.poll();
  assert.equal(i.interrupted(), false);
});
