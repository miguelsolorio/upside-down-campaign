// Dig Dug, played headless: the cart survives any input, ends on its own, replays the same for a seed, and its rules
// hold: digging pays per cell, four pumps pop a Pooka, a rock falls on what's under it, and the last one runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { BLOCKS, buildDigDug, cellOpen, layerOf } from '../src/arcade/digdug.ts';
import type { DigState, Mob } from '../src/arcade/digdug.ts';
import { IDLE_PAD } from '../src/arcade/types.ts';
import type { Pad } from '../src/arcade/types.ts';

const pad = (o: Partial<Pad> = {}): Pad => ({ ...IDLE_PAD, ...o });
const RIGHT = pad({ mx: 1 }), DOWN = pad({ my: 1 }), FIRE = pad({ fire: true, firePressed: true });

/** Seeded random play: the stick held a while in one way, fire tapped now and then. */
function randomPads(seed: number): () => Pad {
  const r = createRng(seed);
  let held = IDLE_PAD, left = 0, was = false;
  return () => {
    if (--left <= 0) {
      left = 10 + Math.floor(r() * 50);
      const d = Math.floor(r() * 5);
      held = pad({ mx: d === 0 ? -1 : d === 1 ? 1 : 0, my: d === 2 ? -1 : d === 3 ? 1 : 0 });
    }
    const fire = r() < 0.15;
    const p = { ...held, fire, firePressed: fire && !was };
    was = fire;
    return p;
  };
}

/** A cart on round 1 in play, with the mobs and rocks cleared away. */
function bare(): ReturnType<typeof buildDigDug> {
  const c = buildDigDug({ seed: 1, best: 0 });
  c.s.mobs = []; c.s.rocks = []; c.s.phase = 'play'; c.s.phaseT = 0;
  return c;
}
function dig(s: DigState, c0: number, r0: number, c1: number, r1: number): void {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) s.dug[(r * 2 + j) * BLOCKS + c * 2 + i] = 1;
}
function mob(s: DigState, kind: Mob['kind'], c: number, r: number): Mob {
  const m: Mob = {
    kind, x: c * 8, y: r * 8, dir: 'left', face: 'left', homeX: c * 8, homeY: r * 8, ghost: false, ghostT: 0, ghostIn: 99999,
    inflate: 0, deflateT: 0, popT: -1, crushed: false, escaping: false, windT: 0, fireT: 0, fireCd: 99999, acc: 0, gone: false,
  };
  s.mobs.push(m);
  return m;
}

test('random play for 20,000 ticks never throws, and the score only goes up', () => {
  for (const seed of [1, 2, 3]) {
    const { cart } = buildDigDug({ seed, best: 6150 });
    const next = randomPads(seed * 7);
    let last = 0;
    for (let i = 0; i < 20000 && !cart.over; i++) {
      cart.step(next());
      assert.ok(cart.score >= last, `score went from ${last} to ${cart.score}`);
      last = cart.score;
    }
  }
});

test('left alone, the digger is caught and the game ends', () => {
  const { cart } = buildDigDug({ seed: 5, best: 0 });
  let i = 0;
  for (; i < 40000 && !cart.over; i++) cart.step(IDLE_PAD);
  assert.ok(cart.over, 'over within 40,000 ticks');
  assert.equal(cart.lives, 0);
});

test('the same seed and the same input play the same game', () => {
  const run = (): number => {
    const { cart } = buildDigDug({ seed: 9, best: 0 });
    const next = randomPads(11);
    for (let i = 0; i < 6000 && !cart.over; i++) cart.step(next());
    return cart.score;
  };
  assert.equal(run(), run());
});

test('a round starts with a shaft, a pocket per mob and rocks in solid dirt', () => {
  const { s } = buildDigDug({ seed: 4, best: 0 });
  assert.equal(s.mobs.length, 4);
  assert.ok(s.mobs.some((m) => m.kind === 'fygar') && s.mobs.some((m) => m.kind === 'pooka'));
  for (const m of s.mobs) assert.ok(cellOpen(s, m.x / 8, m.y / 8), 'every mob stands in its own pocket');
  for (let r = 3; r <= 8; r++) assert.ok(cellOpen(s, 10, r), `the shaft is open at row ${r}`);
  assert.ok(s.rocks.length >= 3);
  for (const k of s.rocks) assert.ok(!cellOpen(s, k.x / 8, k.y / 8 + 1), 'a rock has dirt under it');
});

test('digging opens the dirt and pays 10 a cell', () => {
  const c = bare();
  // A mob parked far off, so the round isn't over before it starts.
  dig(c.s, 19, 18, 19, 18);
  mob(c.s, 'pooka', 19, 18).acc = -1e9;
  c.s.player.x = 16; c.s.player.y = 16;
  for (let i = 0; i < 80; i++) c.cart.step(DOWN);
  assert.ok(c.s.player.y > 40, `dug down to ${c.s.player.y}`);
  assert.ok(cellOpen(c.s, 2, 4) && cellOpen(c.s, 2, 5));
  assert.ok(c.cart.score >= 30, `paid ${c.cart.score}`);
});

test('four pumps pop a Pooka, for the points of its layer', () => {
  const c = bare();
  const s = c.s;
  dig(s, 2, 12, 9, 12);
  s.player.x = 16; s.player.y = 96; s.player.dir = 'right'; s.player.face = 'right';
  const m = mob(s, 'pooka', 5, 12);
  m.acc = -1e9;
  c.cart.step(FIRE);
  for (let i = 0; i < 12 && s.harpoon?.state !== 'hooked'; i++) c.cart.step(IDLE_PAD);
  assert.equal(s.harpoon?.state, 'hooked', 'the harpoon hooks it');
  assert.equal(m.inflate, 1);
  for (let k = 0; k < 3; k++) { c.cart.step(FIRE); c.cart.step(IDLE_PAD); }
  assert.ok(m.popT >= 0, 'popped on the fourth pump');
  assert.equal(c.cart.score, [200, 300, 400, 500][layerOf(m.y)]);
});

test('a Fygar pumped from the side is worth double', () => {
  const c = bare();
  const s = c.s;
  dig(s, 2, 5, 9, 5);
  s.player.x = 16; s.player.y = 40; s.player.dir = 'right';
  const m = mob(s, 'fygar', 5, 5);
  m.acc = -1e9;
  c.cart.step(FIRE);
  for (let i = 0; i < 12; i++) c.cart.step(IDLE_PAD);
  for (let k = 0; k < 3; k++) { c.cart.step(FIRE); c.cart.step(IDLE_PAD); }
  assert.ok(m.popT >= 0);
  assert.equal(c.cart.score, 400);
});

test('a rock falls when the dirt under it is dug, and crushes the mob below', () => {
  const c = bare();
  const s = c.s;
  s.rocks = [{ x: 64, y: 48, state: 'rest', t: 0, crushed: [], hitPlayer: false }];
  s.player.x = 160; s.player.y = 16;
  dig(s, 8, 7, 8, 10);
  const m = mob(s, 'pooka', 8, 10);
  m.acc = -1e9;
  for (let i = 0; i < 120; i++) c.cart.step(IDLE_PAD);
  assert.ok(m.crushed, 'the mob under it is crushed');
  assert.ok(c.cart.score >= 1000, `crush pays ${c.cart.score}`);
});

test('the last one left runs for the surface and off the left edge, and the round ends', () => {
  const c = bare();
  const s = c.s;
  s.player.x = 160; s.player.y = 16;
  mob(s, 'pooka', 6, 14);
  dig(s, 5, 14, 7, 14);
  let ended = false;
  for (let i = 0; i < 4000 && !ended; i++) { c.cart.step(IDLE_PAD); ended = s.round === 2 || s.phase === 'clear'; }
  assert.ok(ended, `the runner got away: ${JSON.stringify({ x: s.mobs[0]?.x, y: s.mobs[0]?.y, phase: s.phase })}`);
});
