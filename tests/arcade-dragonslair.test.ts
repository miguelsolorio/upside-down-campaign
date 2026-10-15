// The DRAGON'S LAIR cart: long seeded runs that never throw or lose points, game over on an idle pad, determinism, a
// late or wrong answer costing a life, the right answer scoring and moving on, a whole loop played clean, and the how-to
// holding the first scene's intro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import {
  ACT_T, BEAT_T, bonusFor, buildDragonsLair, createDragonsLair, expectedKey, HOWTO_RETRY_T, HOWTO_T, pointsFor, SCENES, windowFor,
} from '../src/arcade/dragonslair.ts';
import type { DLState, Key } from '../src/arcade/dragonslair.ts';
import { IDLE_PAD } from '../src/arcade/types.ts';
import type { Dir, Pad } from '../src/arcade/types.ts';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const press = (k: Key): Pad => (k === 'fire' ? { ...IDLE_PAD, fire: true, firePressed: true } : { ...IDLE_PAD, dirPressed: k });
const wrong = (k: Key): Key => (k === 'up' ? 'down' : 'up');

function toCue(step: (p: Pad) => unknown, s: DLState, limit = 2000): number {
  let t = 0;
  while (s.phase !== 'cue' && t < limit) { step(IDLE_PAD); t++; }
  assert.equal(s.phase, 'cue');
  return t;
}

test("dragon's lair: 20000 ticks of seeded random taps never throw, and the score never drops", () => {
  for (const seed of [1, 2, 3, 4]) {
    const cart = createDragonsLair({ seed, best: 0 });
    const rng = createRng(seed * 7);
    let last = 0;
    for (let t = 0; t < 20000 && !cart.over; t++) {
      const r = rng();
      const pad = r < 0.03 ? press(DIRS[Math.floor(rng() * 4)] as Dir) : r < 0.04 ? press('fire') : IDLE_PAD;
      const sfx = cart.step(pad);
      assert.ok(sfx.length <= 3);
      assert.ok(cart.score >= last && cart.score >= 0, `score went from ${last} to ${cart.score}`);
      last = cart.score;
    }
  }
});

test("dragon's lair: an idle pad ends the game within 40000 ticks, and step() is a no-op after", () => {
  const cart = createDragonsLair({ seed: 5, best: 0 });
  let t = 0;
  while (!cart.over && t < 40000) { cart.step(IDLE_PAD); t++; }
  assert.ok(cart.over);
  assert.equal(cart.lives, 0);
  assert.equal(cart.score, 0);
  assert.deepEqual(cart.step(press('fire')), []);
});

test("dragon's lair: the same seed and input give the same game", () => {
  const run = (): string => {
    const { cart, s } = buildDragonsLair({ seed: 11, best: 0 });
    const rng = createRng(4);
    const marks: number[] = [];
    for (let t = 0; t < 12000 && !cart.over; t++) {
      // Right most of the time, and now and then a miss, so deaths and loops both happen.
      const pad = s.phase === 'cue' && s.t === 10 ? press(rng() < 0.9 ? expectedKey(s) : wrong(expectedKey(s))) : IDLE_PAD;
      cart.step(pad);
      if (t % 400 === 0) marks.push(cart.score, cart.lives);
    }
    return marks.join(',');
  };
  assert.equal(run(), run());
});

test("dragon's lair: the right answer inside the window scores and moves on to the next cue", () => {
  const { cart, s } = buildDragonsLair({ seed: 1, best: 0 });
  const step = (p: Pad): unknown => cart.step(p);
  toCue(step, s);
  assert.equal(s.move, 0);
  for (let t = 0; t < windowFor(0) - 2; t++) cart.step(IDLE_PAD);
  const sfx = cart.step(press(expectedKey(s)));
  assert.ok(sfx.includes('kill'));
  assert.equal(cart.score, pointsFor(0, 0));
  assert.equal(s.phase, 'act');
  const t = toCue(step, s);
  assert.equal(s.move, 1);
  assert.equal(t, ACT_T + BEAT_T);
  assert.equal(cart.lives, 3);
});

test("dragon's lair: an answer after the window closes costs a life, and the scene starts over", () => {
  const { cart, s } = buildDragonsLair({ seed: 1, best: 0 });
  const step = (p: Pad): unknown => cart.step(p);
  toCue(step, s);
  cart.step(press(expectedKey(s)));
  toCue(step, s);
  const key = expectedKey(s);
  for (let t = 0; t < windowFor(0); t++) cart.step(IDLE_PAD);
  assert.equal(s.phase, 'death');
  assert.equal(cart.lives, 2);
  const score = cart.score;
  cart.step(press(key));
  assert.equal(cart.score, score, 'a late answer scored');
  assert.equal(cart.lives, 2);
  toCue(step, s);
  assert.equal(s.scene, 0);
  assert.equal(s.move, 0, 'the scene did not start over from its first move');
});

test("dragon's lair: the wrong button costs a life at once", () => {
  const { cart, s } = buildDragonsLair({ seed: 2, best: 0 });
  toCue((p) => cart.step(p), s);
  const sfx = cart.step(press(wrong(expectedKey(s))));
  assert.ok(sfx.includes('ko'));
  assert.equal(s.phase, 'death');
  assert.equal(cart.lives, 2);
  assert.equal(cart.score, 0);
});

test("dragon's lair: a clean loop pays every move and the bonus, then the next loop is mirrored with less time", () => {
  assert.equal(windowFor(0), 60, 'a full second to answer the first cue');
  for (let l = 1; l < 10; l++) assert.ok(windowFor(l) <= windowFor(l - 1) && windowFor(l) >= 24);
  assert.equal(windowFor(9), 24);
  for (const sc of SCENES) assert.ok(sc.moves.length >= 3 && sc.moves.length <= 5, sc.name);

  const { cart, s } = buildDragonsLair({ seed: 1, best: 0 });
  let want = 0;
  SCENES.forEach((sc, i) => { want += sc.moves.length * pointsFor(i, 0); });
  want += bonusFor(0);
  let t = 0;
  while (s.loop === 0 && t < 20000) {
    cart.step(s.phase === 'cue' && s.t === 8 ? press(expectedKey(s)) : IDLE_PAD);
    t++;
  }
  assert.equal(s.loop, 1);
  assert.equal(cart.score, want);
  assert.equal(cart.lives, 3);
  assert.ok(s.mirror);
  // The first move of the drawbridge is to the right; mirrored, it's to the left.
  assert.equal(SCENES[0]?.moves[0]?.key, 'right');
  assert.equal(expectedKey(s), 'left');
});

test("dragon's lair: the first scene opens on the how-to and holds it, and a retry shows it again for less", () => {
  const { cart, s } = buildDragonsLair({ seed: 3, best: 0 });
  assert.equal(toCue((p) => cart.step(p), s), HOWTO_T + BEAT_T);
  cart.step(press(wrong(expectedKey(s))));
  while (s.phase === 'death') cart.step(IDLE_PAD);
  assert.equal(s.phase, 'intro');
  assert.equal(toCue((p) => cart.step(p), s), HOWTO_RETRY_T + BEAT_T);
});
