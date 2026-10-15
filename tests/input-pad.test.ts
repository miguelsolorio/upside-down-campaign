// The controller bindings inside createInput: a real pad follows them, the on-screen controls never do, and the rebinding
// screen can wait for the next face, bumper or trigger press. Node has no window, so the browser globals are stubbed.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/core/input.ts';
import type { InputOptions, InputState } from '../src/core/input.ts';
import { BTN } from '../src/core/gamepad.ts';
import type { PadLike } from '../src/core/gamepad.ts';
import { resetPadBindings, setPadBinding } from '../src/core/padmap.ts';
import type { PadBtn } from '../src/core/padmap.ts';

type Handler = (e: unknown) => void;
const handlers = new Map<string, Handler[]>();
let pads: (PadLike | null)[] = [];

Object.assign(globalThis, {
  addEventListener: (type: string, fn: Handler) => { handlers.set(type, [...(handlers.get(type) ?? []), fn]); },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });

function pad(held: Record<number, number> = {}, axes: number[] = [0, 0]): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: (held[i] ?? 0) > 0.5, value: held[i] ?? 0 }));
  return { buttons, axes, mapping: 'standard', connected: true };
}
const hold = (...b: number[]): PadLike => pad(Object.fromEntries(b.map((i) => [i, 1])));
function make(opts?: InputOptions): InputState {
  handlers.clear();
  return createInput(opts);
}

beforeEach(() => {
  pads = [];
  resetPadBindings();
});

test('a real controller follows the player\'s buttons', () => {
  const i = make();
  setPadBinding('attack', 0, 'LT');
  pads = [hold(BTN.A)];
  i.poll();
  assert.ok(i.pressed('confirm') && i.pressed('interact'));
  assert.ok(!i.pressed('attack'), 'A no longer attacks');
  pads = [pad({ [BTN.LT]: 0.9 })];
  i.poll();
  assert.ok(i.pressed('attack') && !i.pressed('confirm'), 'LT attacks and never confirms');
});

test('the on-screen controls keep the factory layout whatever the controller is set to', () => {
  let touchPad: PadLike | null = null;
  const i = make({ touch: { pad: () => touchPad } });
  setPadBinding('attack', 0, 'LT');
  setPadBinding('special', 0, 'RT');
  touchPad = hold(BTN.A);
  i.poll();
  assert.ok(i.pressed('attack'), 'the Game Boy\'s A still attacks');
  touchPad = hold(BTN.X, BTN.B);
  i.poll();
  assert.ok(i.pressed('special') && i.pressed('cancel'), 'and its B is still special and back');
});

// ---------------------------------------------------------------- waiting for a button
test('capturePad hands over the next fresh press and then stops waiting', () => {
  const i = make();
  const got: PadBtn[] = [];
  i.capturePad((b) => got.push(b));
  i.poll();
  assert.deepEqual(got, []);
  pads = [hold(BTN.RB)];
  i.poll();
  assert.deepEqual(got, ['RB']);
  pads = [hold(BTN.RB, BTN.Y)];
  i.poll();
  assert.deepEqual(got, ['RB'], 'only the first press is taken');
});

test('a button already held when the wait starts is not taken, until it is let go and pressed again', () => {
  pads = [hold(BTN.A)];
  const i = make();
  i.poll();
  const got: PadBtn[] = [];
  i.capturePad((b) => got.push(b));
  i.poll();
  assert.deepEqual(got, [], 'A was down already, the press that opened the row');
  pads = [pad()];
  i.poll();
  pads = [hold(BTN.A)];
  i.poll();
  assert.deepEqual(got, ['A']);
});

test('a trigger is taken past half a pull, and the face and bumper buttons all can be', () => {
  for (const [b, name] of [[BTN.A, 'A'], [BTN.B, 'B'], [BTN.X, 'X'], [BTN.Y, 'Y'], [BTN.LB, 'LB'], [BTN.RB, 'RB']] as const) {
    const i = make();
    pads = [pad()];
    const got: string[] = [];
    i.capturePad((x) => got.push(x));
    pads = [hold(b)];
    i.poll();
    assert.deepEqual(got, [name]);
  }
  for (const [b, name] of [[BTN.LT, 'LT'], [BTN.RT, 'RT']] as const) {
    const i = make();
    pads = [pad()];
    const got: string[] = [];
    i.capturePad((x) => got.push(x));
    pads = [pad({ [b]: 0.3 })];
    i.poll();
    assert.deepEqual(got, [], `a light pull on ${name} is not a press`);
    pads = [pad({ [b]: 0.8 })];
    i.poll();
    assert.deepEqual(got, [name]);
  }
});

test('while it waits those buttons do nothing in the game, so B can be bound without backing out', () => {
  pads = [hold(BTN.A)];
  const i = make();
  i.poll();
  i.capturePad(() => {});
  i.poll();
  assert.ok(!i.held('confirm') && !i.held('attack'), 'A, held through the wait, is silent');
  pads = [hold(BTN.B)];
  i.poll();
  assert.ok(!i.pressed('cancel') && !i.held('cancel'), 'the B that was taken never reaches the game');
});

test('the taken button stays silent until it is let go, then works again', () => {
  const i = make();
  pads = [pad()];
  i.poll();
  i.capturePad(() => {});
  pads = [hold(BTN.B)];
  i.poll();
  i.poll();
  assert.ok(!i.held('cancel') && !i.pressed('cancel'), 'held B is silent');
  pads = [pad()];
  i.poll();
  pads = [hold(BTN.B)];
  i.poll();
  assert.ok(i.pressed('cancel'), 'a fresh B counts again');
});

test('Start, View and the D-pad still work while it waits, so the screen can back out', () => {
  const i = make();
  i.capturePad(() => {});
  pads = [hold(BTN.MENU)];
  i.poll();
  assert.ok(i.pressed('pause'));
  pads = [hold(BTN.VIEW)];
  i.poll();
  assert.ok(i.pressed('skip'));
  pads = [hold(BTN.DOWN)];
  i.poll();
  assert.ok(i.pressed('down'));
});

test('the stop function ends the wait without taking anything', () => {
  const i = make();
  const got: string[] = [];
  const stop = i.capturePad((b) => got.push(b));
  stop();
  pads = [hold(BTN.Y)];
  i.poll();
  assert.deepEqual(got, []);
  assert.ok(i.pressed('burst'), 'and the game gets the button back');
});

test('a second wait replaces the first, and an old stop function leaves the new one alone', () => {
  const i = make();
  const first: string[] = [];
  const second: string[] = [];
  const stopFirst = i.capturePad((b) => first.push(b));
  i.capturePad((b) => second.push(b));
  stopFirst();
  pads = [hold(BTN.LB)];
  i.poll();
  assert.deepEqual(first, []);
  assert.deepEqual(second, ['LB']);
});
