// The keyboard side of the CONTROLS screen, driven headless with the real input and keydown events: Backspace and Delete clear
// the slot under the cursor while browsing, and Esc (and Backspace on a row with no keys) still goes back. QA-6 in docs/qa-pass.md.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';

type Handler = (e: unknown) => void;
const handlers = new Map<string, Handler[]>();
Object.assign(globalThis, {
  addEventListener: (type: string, fn: Handler) => { handlers.set(type, [...(handlers.get(type) ?? []), fn]); },
});
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ width: 1, height: 1, getContext: () => ({}) }),
  body: { classList: { toggle: () => {} } },
};
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
  configurable: true,
});
const fire = (type: string, e: unknown): void => { for (const fn of handlers.get(type) ?? []) fn(e); };

const { createInput } = await import('../src/core/input.ts');
const { createControlsScene } = await import('../src/ui/controls.ts');
const { BIND_ROWS, getBinding, resetBindings } = await import('../src/core/bindings.ts');
const { settings } = await import('../src/core/settings.ts');

let backs = 0;
function open(): { scene: Scene; tap: (code: string) => void; to: (action: string, slot?: number) => void } {
  handlers.clear();
  const input = createInput();
  const g = { input, settings, flags: {}, frame: 0 } as unknown as Game;
  const scene = createControlsScene({ onBack: () => { backs++; } });
  const tick = (): void => { input.poll(); scene.update(g); };
  /** A press and a release, so the next press is fresh. */
  const tap = (code: string): void => {
    fire('keydown', { code, repeat: false, preventDefault() {} });
    tick();
    fire('keyup', { code });
    tick();
  };
  /** Walks the cursor to a row of keys and a slot. The list starts on the first row, slot 1. */
  const to = (action: string, slot = 0): void => {
    for (let k = 0; k < BIND_ROWS.findIndex((r) => r.action === action); k++) tap('ArrowDown');
    for (let k = 0; k < slot; k++) tap('ArrowRight');
  };
  return { scene, tap, to };
}

beforeEach(() => {
  backs = 0;
  store.clear();
  resetBindings();
});

test('Backspace clears the slot under the cursor while browsing, and the screen stays open', () => {
  const o = open();
  o.to('attack');
  assert.deepEqual(getBinding('attack'), ['KeyZ', 'KeyJ']);
  o.tap('Backspace');
  assert.deepEqual(getBinding('attack'), [null, 'KeyJ']);
  assert.equal(backs, 0);
});

test('the slot picked with right is the one cleared, and Delete clears it too', () => {
  const o = open();
  o.to('special', 1);
  o.tap('Delete');
  assert.deepEqual(getBinding('special'), ['KeyX', null]);
  assert.equal(backs, 0);
});

test('ATTACK keeps its last key, so a second Backspace is refused and the screen still stays open', () => {
  const o = open();
  o.to('attack');
  o.tap('Backspace');
  o.tap('ArrowRight');
  o.tap('Backspace');
  assert.deepEqual(getBinding('attack'), [null, 'KeyJ']);
  assert.equal(backs, 0);
});

test('Esc still goes back from a row of keys, and clears nothing', () => {
  const o = open();
  o.to('attack');
  o.tap('Escape');
  assert.equal(backs, 1);
  assert.deepEqual(getBinding('attack'), ['KeyZ', 'KeyJ']);
});

test('Backspace on a row without keys still goes back', () => {
  const o = open();
  for (let k = 0; k < BIND_ROWS.length; k++) o.tap('ArrowDown'); // RESET ALL
  o.tap('Backspace');
  assert.equal(backs, 1);
});

test('Backspace after Enter still clears, the way it always did', () => {
  const o = open();
  o.to('attack');
  o.tap('Enter');
  o.tap('Backspace');
  assert.deepEqual(getBinding('attack'), [null, 'KeyJ']);
  assert.equal(backs, 0);
});
