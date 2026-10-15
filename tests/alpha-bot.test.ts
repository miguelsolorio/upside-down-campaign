// The bot against the Alpha: it sidesteps the lunge line during the wind-up, backs off the crouch and steps off the mark, hits
// the Alpha while it howls, and wins most fights in the 18 by 12 den at enemyMult 1. It is given no flag to open or wake anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import { howlFirst } from '../src/combat/bot_alpha.ts';
import type { Sim } from '../src/core/types.ts';
import { arena, ofType, tc, tf } from './sim-helpers.ts';
import type { AlphaRig } from './alpha-helpers.ts';
import { alphaRig, onlyMove } from './alpha-helpers.ts';

const grid = arena(18, 12);
const bot = (careless = false) => createBot({ grid, waypoints: [{ x: tc(3), y: tf(6) }], careless });

/** Plays a bot against the rig until the Alpha is dead, the party is down or `max` frames pass. */
function fight(r: AlphaRig, careless: boolean, max = 14400) {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const b = bot(careless);
  let won = false, down = false, f = 0;
  for (; f < max; f++) {
    const ev = r.sim.step(b.next(spied));
    if (ev.some((e) => e.t === 'allDown')) down = true;
    if (ev.some((e) => e.t === 'kill' && e.kind === 'alpha')) won = true;
    if (down || won) break;
  }
  return { won, down, frames: f, calls, damage: r.sim.stats().damageTaken };
}

test('bot: against a lunge it steps off the locked line during the wind-up and is not hit, where one that never dodges is', () => {
  const taken = (careless: boolean): number[] => Array.from({ length: 10 }, (_, i) => {
    const r = alphaRig({ grid, seed: i + 1, start: { x: tc(13) - 90, y: tf(6) } });
    onlyMove(r, 'lunge');
    r.a.lungeCd = 0;
    r.sim.dev.god = false;
    const b = bot(careless);
    let hits = 0;
    for (let f = 0; f < 80; f++) {
      const ev = r.sim.step(b.next(r.sim));
      hits += ofType(ev, 'hit').filter((h) => !h.onEnemy).length;
    }
    return hits;
  });
  const careful = taken(false), blind = taken(true);
  assert.ok(careful.filter((n) => n === 0).length >= 9, `careful hit by the lunge in ${careful.filter((n) => n > 0).length} of 10`);
  assert.ok(blind.filter((n) => n > 0).length >= 8, `careless hit in ${blind.filter((n) => n > 0).length} of 10`);
});

test('bot: against a pounce it backs off the crouch and is out of the shockwave on most tries', () => {
  const hit = Array.from({ length: 10 }, (_, i) => {
    const r = alphaRig({ grid, seed: i + 1, start: { x: tc(13) - 100, y: tf(6) } });
    onlyMove(r, 'pounce');
    r.a.pounceCd = 0;
    const b = bot();
    let hits = 0;
    for (let f = 0; f < 110; f++) hits += ofType(r.sim.step(b.next(r.sim)), 'hit').filter((h) => !h.onEnemy).length;
    return hits;
  });
  assert.ok(hit.filter((n) => n === 0).length >= 7, `hit by the pounce in ${hit.filter((n) => n > 0).length} of 10`);
});

test('bot: while the Alpha howls it hits the Alpha, not the pups that climb out round it', () => {
  const r = alphaRig({ grid, seed: 2, start: { x: tc(13) - 24, y: tf(6) } });
  onlyMove(r, null);
  r.boss.hpMax = 99999;
  r.boss.hp = r.boss.hpMax * 0.7;
  const b = bot();
  let onAlpha = 0, onPups = 0, howling = 0;
  for (let f = 0; f < 60; f++) {
    const at = { x: r.boss.x, y: r.boss.y };
    const ev = r.sim.step(b.next(r.sim));
    if (r.a.move === 'howl') howling++;
    for (const h of ofType(ev, 'hit').filter((x) => x.onEnemy)) {
      if (Math.hypot(h.x - at.x, h.y - (at.y - 7)) < 4) onAlpha++; else onPups++;
    }
  }
  assert.ok(howling >= 40, `howled for ${howling} frames`);
  assert.ok(onAlpha >= 2, `${onAlpha} hits on the Alpha while it howled`);
  assert.equal(onPups, 0);
});

test('bot: a howling Alpha goes to the front of the foes, and nothing else does', () => {
  const foes = [{ kind: 'demodog', pose: undefined }, { kind: 'demodog', pose: undefined }, { kind: 'alpha', pose: 'howl' }];
  howlFirst(foes);
  assert.equal(foes[0]?.kind, 'alpha');
  const calm = [{ kind: 'demodog', pose: undefined }, { kind: 'alpha', pose: undefined }];
  howlFirst(calm);
  assert.equal(calm[0]?.kind, 'demodog', 'an Alpha that is not howling keeps its place');
});

test('bot: it wins at least 12 of 16 seeds on chief in the 18 by 12 den at enemyMult 1, and a bot that never dodges at least 10', () => {
  for (const careless of [false, true]) {
    const fights = Array.from({ length: 16 }, (_, i) => fight(alphaRig({ grid, seed: i + 1, enemyMult: 1 }, false), careless));
    const wins = fights.filter((f) => f.won);
    assert.ok(wins.length >= (careless ? 10 : 12), `${careless ? 'careless' : 'careful'}: ${wins.length}/16`);
    for (const f of fights) assert.deepEqual(f.calls, [], 'with no flags from the bot');
    const avg = wins.reduce((n, f) => n + f.frames, 0) / Math.max(1, wins.length) / 60;
    assert.ok(avg >= 15 && avg <= 60, `an average fight of ${avg.toFixed(0)} s`);
  }
});
