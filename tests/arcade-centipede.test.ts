// The Centipede cart, headless: random play doesn't break it, an idle gnome loses all three lives, a seed plays the same
// every time, and a shot body segment leaves a mushroom and splits the centipede in two.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { buildCentipede, createCentipede, mushAt } from '../src/arcade/centipede.ts';
import type { Seg } from '../src/arcade/centipede.ts';
import { IDLE_PAD } from '../src/arcade/types.ts';
import type { Cart, Pad } from '../src/arcade/types.ts';

/** Random stick and fire, held for a few ticks at a time, with firePressed on the press edge. */
function randomPads(seed: number): () => Pad {
  const rng = createRng(seed);
  let mx = 0, my = 0, fire = false, hold = 0;
  return () => {
    const was = fire;
    if (--hold <= 0) {
      hold = 1 + Math.floor(rng() * 20);
      mx = rng() * 2 - 1; my = rng() * 2 - 1; fire = rng() < 0.6;
    }
    return { mx, my, fire, firePressed: fire && !was, dirPressed: null };
  };
}

function play(cart: Cart, ticks: number, pads: () => Pad): number[] {
  const scores: number[] = [];
  for (let i = 0; i < ticks; i++) { cart.step(pads()); scores.push(cart.score); }
  return scores;
}

test('centipede: 20,000 ticks of random input never throw, and the score never goes negative or down', () => {
  // Random play loses all three lives in a minute or so, so a new game starts each time one ends.
  const pads = randomPads(31);
  let seed = 1, cart = createCentipede({ seed, best: 16420 }), last = 0, games = 1;
  for (let i = 0; i < 20000; i++) {
    if (cart.over) { cart = createCentipede({ seed: ++seed, best: 16420 }); last = 0; games++; }
    const sounds = cart.step(pads());
    assert.ok(sounds.length <= 3, `${sounds.length} sounds in one tick`);
    assert.ok(cart.score >= last, `score went from ${last} to ${cart.score}`);
    assert.ok(cart.lives >= 0);
    last = cart.score;
  }
  assert.ok(games >= 2 && games < 20, `${games} games`);
});

test('centipede: an idle gnome is caught three times and the game ends within 40,000 ticks', () => {
  const cart = createCentipede({ seed: 5, best: 0 });
  let t = 0;
  while (!cart.over && t < 40000) { cart.step(IDLE_PAD); t++; }
  assert.ok(cart.over, `still going after ${t} ticks`);
  assert.equal(cart.lives, 0);
  const score = cart.score;
  assert.deepEqual(cart.step({ ...IDLE_PAD, fire: true, firePressed: true }), []);
  assert.equal(cart.score, score);
});

test('centipede: the same seed and the same input give the same game', () => {
  const a = play(createCentipede({ seed: 42, best: 0 }), 8000, randomPads(9));
  const b = play(createCentipede({ seed: 42, best: 0 }), 8000, randomPads(9));
  assert.deepEqual(a, b);
  assert.ok((a.at(-1) as number) > 0, 'random play scored nothing');
});

test('centipede: a shot body segment becomes a mushroom and splits the centipede in two', () => {
  const { cart, s } = buildCentipede({ seed: 3, best: 0 });
  s.phase = 'play';
  s.mush.fill(0);
  s.spider = null; s.spiderWait = 10000;
  s.t = 0; s.acc = 0;
  // Five segments resting on row 8, head at column 10 walking right.
  const chain: Seg[] = [];
  for (let k = 0; k < 5; k++) chain.push({ fx: 10 - k, fy: 8, tx: 10 - k, ty: 8, dx: 1, vy: 1 });
  s.chains = [chain];
  const third = chain[2] as Seg;
  // The shot just under the third segment (a body segment), on its way up.
  s.shot = { x: third.fx * 8 + 3, y: third.fy * 8 + 10 };
  const before = s.score;
  cart.step(IDLE_PAD);
  assert.equal(s.shot, null, 'the shot is used up');
  assert.equal(mushAt(s, 8, 8), 4, 'a whole mushroom where the segment was');
  assert.equal(s.score - before, 10, 'a body segment is worth 10');
  assert.equal(s.chains.length, 2, 'two centipedes now');
  const [front, back] = s.chains as [Seg[], Seg[]];
  assert.deepEqual(front.map((g) => g.fx), [10, 9]);
  assert.deepEqual(back.map((g) => g.fx), [7, 6], 'the segment behind leads the second one');
  // The new head walks on and turns down at the mushroom in its way.
  for (let i = 0; i < 40; i++) cart.step(IDLE_PAD);
  assert.ok(s.chains.some((c) => c[0] === back[0] && back[0].fy === 9), 'the new head dropped a row');
});

test('centipede: a head is worth 100 and a spider shot up close 900', () => {
  const { cart, s } = buildCentipede({ seed: 4, best: 0 });
  s.phase = 'play';
  s.mush.fill(0);
  s.spider = null; s.spiderWait = 10000;
  s.t = 0;
  s.chains = [[{ fx: 5, fy: 6, tx: 5, ty: 6, dx: 1, vy: 1 }, { fx: 4, fy: 6, tx: 4, ty: 6, dx: 1, vy: 1 }]];
  s.shot = { x: 5 * 8 + 3, y: 6 * 8 + 10 };
  cart.step(IDLE_PAD);
  assert.equal(s.score, 100);
  s.spider = { x: s.px - 2, y: s.py - 14, vx: 0, vy: 0, dir: 1, turn: 100 };
  s.shot = { x: Math.round(s.px) + 3, y: Math.round(s.py) - 4 };
  cart.step(IDLE_PAD);
  assert.equal(s.score, 1000);
  assert.equal(s.spider, null);
});
