// The on-screen Game Boy as a virtual controller: fingers in CSS px go in, a standard pad comes out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BTN, readPad } from '../src/core/gamepad.ts';
import { layoutTouch } from '../src/core/touchlayout.ts';
import type { TouchButton } from '../src/core/touchlayout.ts';
import { DPAD_NUB, DPAD_SNAP, createTouchPad, dpadVector } from '../src/core/touchpad.ts';

const L = layoutTouch({ w: 393, h: 852, dpr: 3, safe: { t: 59, r: 0, b: 34, l: 0 } });
const mid = (b: TouchButton): [number, number] => {
  const r = L.buttons[b];
  return [r.x + r.w / 2, r.y + r.h / 2];
};
/** A point on the D-pad, `k` arm lengths from its center at `deg` degrees (0 is right, 90 is down). */
const on = (deg: number, k = 0.7): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [L.dpad.x + Math.cos(a) * L.dpadR * k, L.dpad.y + Math.sin(a) * L.dpadR * k];
};
const pressed = (p: ReturnType<typeof createTouchPad>): number[] =>
  p.pad().buttons.flatMap((b, i) => (b.pressed ? [i] : []));
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

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
    swap: ['swapNext'], select: ['skip'], start: ['pause', 'start'],
  };
  for (const [b, acts] of Object.entries(want) as [TouchButton, string[]][]) {
    const p = createTouchPad(L);
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

test('each arm of the D-pad is a clean press that way', () => {
  const arms: [number, { x: number; y: number }, string][] = [
    [0, { x: 1, y: 0 }, 'right'], [90, { x: 0, y: 1 }, 'down'], [180, { x: -1, y: 0 }, 'left'], [270, { x: 0, y: -1 }, 'up'],
  ];
  for (const [deg, want, action] of arms) {
    const p = createTouchPad(L);
    assert.equal(p.down(1, ...on(deg)), 'dpad');
    assert.deepEqual(p.vector(), want, action);
    // A thumb a little off the arm's middle still reads straight.
    p.move(1, ...on(deg + DPAD_SNAP - 1));
    assert.deepEqual(p.vector(), want, `${action}, a little off`);
    const acts = readPad(p.pad()).actions;
    assert.ok(acts.has(action as 'up'), `${action} reaches the menus`);
    assert.equal([...acts].filter((a) => ['up', 'down', 'left', 'right'].includes(a)).length, 1, 'and only that way');
  }
});

test('between the arms the D-pad steers like a stick, and a corner is a diagonal', () => {
  const p = createTouchPad(L);
  p.down(1, ...on(-45));
  const v = p.vector();
  assert.ok(near(v.x, Math.SQRT1_2) && near(v.y, -Math.SQRT1_2), 'up-right');
  const acts = readPad(p.pad()).actions;
  assert.ok(acts.has('up') && acts.has('right'));
  p.move(1, ...on(-30));
  const w = p.vector();
  assert.ok(w.x > v.x && w.y > v.y && w.y < 0, 'sliding toward the right arm turns toward right');
});

test('the middle of the D-pad is its pivot and pushes nowhere', () => {
  const p = createTouchPad(L);
  p.down(1, L.dpad.x + L.dpadR * DPAD_NUB * 0.5, L.dpad.y);
  assert.deepEqual(p.vector(), { x: 0, y: 0 });
  assert.deepEqual(p.dpad(), { x: 0, y: 0 }, 'held, but on the pivot');
});

test('a thumb slides from arm to arm without lifting', () => {
  const p = createTouchPad(L);
  p.down(1, ...on(0));
  assert.deepEqual(p.vector(), { x: 1, y: 0 });
  p.move(1, ...on(90));
  assert.deepEqual(p.vector(), { x: 0, y: 1 });
  p.move(1, ...on(180));
  assert.deepEqual(p.vector(), { x: -1, y: 0 });
});

test('a thumb that slides past the cross keeps steering, and one that lands beside it grabs it', () => {
  const p = createTouchPad(L);
  p.down(1, ...on(0));
  p.move(1, L.dpad.x + 400, L.dpad.y - 30);
  assert.deepEqual(p.vector(), { x: 1, y: 0 }, 'far out, but still mostly right');
  const q = createTouchPad(L);
  const x = Math.max(L.dpadZone.x + 1, L.dpad.x - L.dpadR * 1.3);
  assert.equal(q.down(1, x, L.dpad.y), 'dpad');
  assert.deepEqual(q.vector(), { x: -1, y: 0 });
});

test('dpadVector runs on smoothly through the edges of each arm', () => {
  let last = Math.atan2(dpadVector(1, 0, 10).y, dpadVector(1, 0, 10).x);
  for (let d = 0.5; d < 90; d += 0.5) {
    const a = (d * Math.PI) / 180;
    const v = dpadVector(Math.cos(a) * 10, Math.sin(a) * 10, 10);
    assert.ok(near(Math.hypot(v.x, v.y), 1), 'always full length off the pivot');
    const now = Math.atan2(v.y, v.x);
    assert.ok(now >= last - 1e-9, `never turns back at ${d} degrees`);
    assert.ok(now - last < (3 * Math.PI) / 180, `never jumps at ${d} degrees`);
    last = now;
  }
});

test('two fingers work at once: the D-pad and a button', () => {
  const p = createTouchPad(L);
  assert.equal(p.down(1, ...on(0)), 'dpad');
  assert.equal(p.down(2, ...mid('a')), 'a');
  assert.deepEqual(p.vector(), { x: 1, y: 0 });
  assert.ok(p.pad().buttons[BTN.A]?.pressed);
  p.up(2);
  assert.deepEqual(p.vector(), { x: 1, y: 0 }, 'lifting the button finger leaves the D-pad alone');
});

test('only one thumb holds the D-pad', () => {
  const p = createTouchPad(L);
  p.down(1, ...on(0));
  assert.equal(p.down(2, ...on(90)), null);
});

test('a tap on the game or the bare body is not a control', () => {
  const p = createTouchPad(L);
  assert.equal(p.down(1, L.game.x + 20, L.game.y + 20), null);
  assert.equal(p.down(2, L.shell.bezel.x + 4, L.shell.bezel.y + 4), null);
  assert.deepEqual(pressed(p), []);
});

test('reset lets go of everything', () => {
  const p = createTouchPad(L);
  p.down(1, ...on(0));
  p.down(2, ...mid('a'));
  p.reset();
  assert.deepEqual(pressed(p), []);
  assert.deepEqual(p.vector(), { x: 0, y: 0 });
  assert.equal(p.dpad(), null);
});
