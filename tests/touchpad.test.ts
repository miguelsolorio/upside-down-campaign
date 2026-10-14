// The on-screen controls as a virtual controller: fingers in CSS px go in, a standard pad comes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BTN, readPad } from '../src/core/gamepad.ts';
import { layoutTouch } from '../src/core/touchlayout.ts';
import type { TouchButton } from '../src/core/touchlayout.ts';
import { FULL_TILT, createTouchPad } from '../src/core/touchpad.ts';

const L = layoutTouch({ w: 393, h: 852, dpr: 3, safe: { t: 59, r: 0, b: 34, l: 0 } });
const mid = (b: TouchButton): [number, number] => {
  const r = L.buttons[b];
  return [r.x + r.w / 2, r.y + r.h / 2];
};
const zone = (): [number, number] => [L.stickZone.x + L.stickZone.w / 2, L.stickZone.y + L.stickZone.h / 2];
const pressed = (p: ReturnType<typeof createTouchPad>): number[] =>
  p.pad().buttons.flatMap((b, i) => (b.pressed ? [i] : []));

test('a finger on a button holds that button until it lifts', () => {
  const p = createTouchPad(L);
  assert.equal(p.down(1, ...mid('a')), 'a');
  assert.deepEqual(pressed(p), [BTN.A]);
  p.up(1);
  assert.deepEqual(pressed(p), []);
});

test('B is special and back at once, like the X key', () => {
  const p = createTouchPad(L);
  p.down(1, ...mid('b'));
  assert.deepEqual(pressed(p), [BTN.B, BTN.X].sort((a, b) => a - b));
  const acts = readPad(p.pad()).actions;
  assert.ok(acts.has('special') && acts.has('cancel'));
});

test('each button reaches its action through the controller mapping', () => {
  const want: Record<TouchButton, string[]> = {
    a: ['attack', 'confirm', 'interact'], b: ['special', 'cancel'], burst: ['burst'],
    swapPrev: ['swapPrev'], swapNext: ['swapNext'], skip: ['skip'], pause: ['pause', 'start'],
  };
  for (const [b, acts] of Object.entries(want) as [TouchButton, string[]][]) {
    const p = createTouchPad(L);
    p.setSkip(true);
    p.down(1, ...mid(b));
    assert.deepEqual([...readPad(p.pad()).actions].sort(), [...acts].sort(), b);
  }
});

test('sliding off a button onto another keeps the first', () => {
  const p = createTouchPad(L);
  p.down(1, ...mid('a'));
  p.move(1, ...mid('b'));
  assert.deepEqual([...p.held()], ['a']);
});

test('two fingers work at once: the stick and a button', () => {
  const p = createTouchPad(L);
  const [sx, sy] = zone();
  assert.equal(p.down(1, sx, sy), 'stick');
  p.move(1, sx + L.stickR, sy);
  assert.equal(p.down(2, ...mid('a')), 'a');
  assert.deepEqual(p.vector(), { x: 1, y: 0 });
  assert.ok(p.pad().buttons[BTN.A]?.pressed);
  p.up(2);
  assert.deepEqual(p.vector(), { x: 1, y: 0 }, 'lifting the button finger leaves the stick alone');
});

test('the stick centers where the thumb lands, reaches full tilt early and never goes past one', () => {
  const p = createTouchPad(L);
  const [sx, sy] = zone();
  p.down(1, sx, sy);
  assert.deepEqual(p.vector(), { x: 0, y: 0 }, 'landing is no push');
  p.move(1, sx, sy - L.stickR * FULL_TILT * 0.5);
  assert.ok(Math.abs(p.vector().y + 0.5) < 1e-9, 'half of full tilt');
  p.move(1, sx + 300, sy + 300);
  assert.ok(Math.abs(Math.hypot(p.vector().x, p.vector().y) - 1) < 1e-9);
});

test('dragged past the rim, the base follows the thumb so pulling back responds at once', () => {
  const p = createTouchPad(L);
  const [sx, sy] = zone();
  p.down(1, sx, sy);
  p.move(1, sx + L.stickR * 3, sy);
  const s = p.stick();
  assert.ok(s);
  assert.ok(Math.abs(s.knob.x - s.base.x - L.stickR) < 1e-9, 'the knob sits on the rim');
  p.move(1, s.base.x - L.stickR * FULL_TILT, sy);
  assert.ok(p.vector().x <= -1 + 1e-9, 'a short pull back is full tilt the other way');
});

test('only one thumb holds the stick', () => {
  const p = createTouchPad(L);
  const [sx, sy] = zone();
  p.down(1, sx, sy);
  assert.equal(p.down(2, sx + 10, sy + 10), null);
});

test('a tap on the game or an empty margin is not a control', () => {
  const p = createTouchPad(L);
  assert.equal(p.down(1, L.game.x + 20, L.game.y + 20), null);
  assert.deepEqual(pressed(p), []);
});

test('SKIP is a target only while it is offered', () => {
  const p = createTouchPad(L);
  assert.equal(p.down(1, ...mid('skip')), null);
  p.setSkip(true);
  assert.equal(p.down(2, ...mid('skip')), 'skip');
});

test('reset lets go of everything', () => {
  const p = createTouchPad(L);
  const [sx, sy] = zone();
  p.down(1, sx, sy);
  p.move(1, sx + 30, sy);
  p.down(2, ...mid('a'));
  p.reset();
  assert.deepEqual(pressed(p), []);
  assert.deepEqual(p.vector(), { x: 0, y: 0 });
  assert.equal(p.stick(), null);
});
