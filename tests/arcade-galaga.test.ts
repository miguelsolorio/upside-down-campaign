// The Galaga cart, headless: random play doesn't break it, an idle ship loses all three lives, a seed plays the same
// every time, a boss takes two hits, and a bug is worth double away from the formation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { buildGalaga, createGalaga, slotX, slotY, SHIP_Y } from '../src/arcade/galaga.ts';
import type { Foe, GalagaState } from '../src/arcade/galaga.ts';
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

/** A stage in play with just the one bug of a kind left, and no dives coming. */
function alone(s: GalagaState, kind: Foe['kind']): Foe {
  const f = s.foes.find((e) => e.kind === kind) as Foe;
  s.foes = [f];
  s.phase = 'play';
  s.diveWait = 100000;
  f.mode = 'form'; f.x = slotX(s, f); f.y = slotY(f);
  return f;
}

test('galaga: 20,000 ticks of random input never throw, and the score never goes negative or down', () => {
  // Random play loses all three lives in a few minutes, so a new game starts each time one ends.
  const pads = randomPads(17);
  let seed = 1, cart = createGalaga({ seed, best: 18300 }), last = 0, games = 1;
  for (let i = 0; i < 20000; i++) {
    if (cart.over) { cart = createGalaga({ seed: ++seed, best: 18300 }); last = 0; games++; }
    const sounds = cart.step(pads());
    assert.ok(sounds.length <= 3, `${sounds.length} sounds in one tick`);
    assert.ok(cart.score >= last, `score went from ${last} to ${cart.score}`);
    assert.ok(cart.lives >= 0);
    last = cart.score;
  }
  assert.ok(games >= 2, `${games} games`);
});

test('galaga: an idle ship is shot down three times and the game ends within 40,000 ticks', () => {
  const cart = createGalaga({ seed: 5, best: 0 });
  let t = 0;
  while (!cart.over && t < 40000) { cart.step(IDLE_PAD); t++; }
  assert.ok(cart.over, `still going after ${t} ticks`);
  assert.equal(cart.lives, 0);
  const score = cart.score;
  assert.deepEqual(cart.step({ ...IDLE_PAD, fire: true, firePressed: true }), []);
  assert.equal(cart.score, score);
});

test('galaga: the same seed and the same input give the same game', () => {
  const a = play(createGalaga({ seed: 42, best: 0 }), 8000, randomPads(9));
  const b = play(createGalaga({ seed: 42, best: 0 }), 8000, randomPads(9));
  assert.deepEqual(a, b);
  assert.ok((a.at(-1) as number) > 0, 'random play scored nothing');
});

test('galaga: a boss takes two hits, changing color after the first, and is worth 150 in formation', () => {
  const { cart, s } = buildGalaga({ seed: 3, best: 0 });
  const boss = alone(s, 'boss');
  assert.equal(boss.hp, 2);
  s.shots = [{ x: Math.round(boss.x), y: boss.y + 6 }];
  cart.step(IDLE_PAD);
  assert.equal(s.shots.length, 0, 'the shot is used up');
  assert.equal(boss.hp, 1, 'the first hit marks it');
  assert.equal(s.foes.length, 1, 'still there');
  assert.equal(s.score, 0, 'no points for the first hit');
  s.shots = [{ x: Math.round(boss.x), y: boss.y + 6 }];
  cart.step(IDLE_PAD);
  assert.equal(s.foes.length, 0, 'the second hit kills it');
  assert.equal(s.score, 150);
  assert.equal(s.phase, 'stage', 'the last bug down clears the stage');
});

test('galaga: a bee is worth 50 in formation and 100 diving', () => {
  const still = buildGalaga({ seed: 4, best: 0 });
  const home = alone(still.s, 'bee');
  still.s.shots = [{ x: Math.round(home.x), y: home.y + 6 }];
  still.cart.step(IDLE_PAD);
  assert.equal(still.s.score, 50);

  // A bee halfway down a dive, nose down, with a shot just under it.
  const { cart, s } = buildGalaga({ seed: 4, best: 0 });
  const bee = alone(s, 'bee');
  bee.mode = 'attack'; bee.x = 84; bee.y = 80; bee.a = Math.PI / 2; bee.v = 2; bee.aimX = 84; bee.shots = 0;
  s.shots = [{ x: 84, y: 88 }];
  cart.step(IDLE_PAD);
  assert.ok(bee.y > slotY(bee) && bee.y < SHIP_Y, 'it was hit on the way down');
  assert.equal(s.foes.length, 0);
  assert.equal(s.score, 100);
});
