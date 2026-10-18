// The bot under the clock curse (docs/level-11.md, "The curse"): with Max in the party and the Walkman ready it swaps to her, otherwise it swaps
// to Eddie (or keeps whoever is up) and breaks the clock that chimed. The careless bot does the same: it is the lesson, not a dodge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent } from '../src/core/types.ts';
import { createBot } from '../src/combat/bot.ts';
import type { Hero } from '../src/combat/state.ts';
import { arena, makeWhite, ofType, tc, tf } from './sim-helpers.ts';

/** A hall with a grandfather clock at tile (12, 3), the party in it, one clock chime in. Runs the bot until the curse ends. */
function underCurse(ids: HeroId[], o: { walkman?: boolean; careless?: boolean; down?: HeroId[]; hits?: number } = {}) {
  const grid = arena(24, 16);
  const { sim, s } = makeWhite({
    grid, party: ids.map((id) => ({ id, level: 6 })), start: { x: tc(4), y: tf(11) }, walkman: o.walkman === true, seed: 5,
    spawns: [{ kind: 'prop', id: 'clock1', prop: 'clock', tx: 12, ty: 3, w: 16, h: 32, ...(o.hits ? { hits: o.hits } : {}) }],
  });
  for (const id of o.down ?? []) { const h = s.heroes.find((p) => p.id === id) as Hero; h.ko = true; h.hp = 0; }
  const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(12) }], careless: o.careless === true });
  sim.curse?.('clock1');
  const events: SimEvent[] = [];
  let frames = 0;
  for (; frames < 1200; frames++) {
    const ev = sim.step(bot.next(sim));
    events.push(...ev);
    if (ev.some((e) => e.t === 'curseEnd')) break;
  }
  return { sim, s, events, frames, ends: ofType(events, 'curseEnd'), cursed: ofType(events, 'cursed')[0]?.hero };
}

test('bot: with Max in the party and the Walkman ready it swaps to her, and the curse ends', () => {
  for (const careless of [false, true]) {
    const r = underCurse(['mike', 'max', 'dustin'], { walkman: true, careless });
    assert.equal(r.cursed, 'mike');
    assert.deepEqual(r.ends.map((e) => e.how), ['walkman'], `careless ${careless}`);
    assert.ok(r.frames < 120, `and fast: ${r.frames} frames`);
    assert.equal(ofType(r.events, 'walkman').length, 1);
  }
});

test('bot: with Max up it tags out and back in so the swap plays the Walkman', () => {
  const r = underCurse(['max', 'mike', 'dustin'], { walkman: true });
  assert.equal(r.cursed, 'mike', 'Max is spared, the next hero is cursed');
  assert.deepEqual(r.ends.map((e) => e.how), ['walkman']);
});

test('bot: with no Walkman it swaps to Eddie and breaks the clock with his riff, well before the fourth chime', () => {
  for (const careless of [false, true]) {
    const r = underCurse(['mike', 'eddie', 'dustin'], { careless });
    assert.deepEqual(r.ends.map((e) => e.how), ['clock'], `careless ${careless}`);
    assert.ok(r.frames < 600, `${r.frames} frames`);
    assert.ok(ofType(r.events, 'swap').some((e) => e.to === 'eddie'));
    assert.equal(r.s.heroes.every((h) => !h.ko), true, 'nobody falls');
  }
});

test('bot: Max with a Walkman that is not ready yet goes for the clock with Eddie instead', () => {
  const grid = arena(24, 16);
  const { sim, s } = makeWhite({
    grid, party: ['mike', 'max', 'eddie'].map((id) => ({ id: id as HeroId, level: 6 })), start: { x: tc(4), y: tf(11) }, walkman: true, seed: 5,
    spawns: [{ kind: 'prop', id: 'clock1', prop: 'clock', tx: 12, ty: 3, w: 16, h: 32 }],
  });
  s.house.walkCd = 1500;
  const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(12) }] });
  sim.curse?.('clock1');
  const ends: string[] = [];
  for (let f = 0; f < 900 && ends.length === 0; f++) ends.push(...ofType(sim.step(bot.next(sim)), 'curseEnd').map((e) => e.how));
  assert.deepEqual(ends, ['clock']);
});

test('bot: with no Eddie it keeps whoever is up, walks to the clock and hits it until it breaks', () => {
  for (const careless of [false, true]) {
    const r = underCurse(['mike', 'dustin', 'lucas'], { hits: 3, careless });
    assert.deepEqual(r.ends.map((e) => e.how), ['clock'], `careless ${careless}`);
    assert.ok(r.frames < 800, `${r.frames} frames`);
    assert.equal(ofType(r.events, 'swap').length, 1, 'the one swap is the party leaving the cursed hero');
    assert.equal(r.s.props[0]?.struck, 3, 'three hits');
  }
});

test('bot: with Eddie down, a try at the clock stands him back up (combat/pokes.ts), and his riff ends it', () => {
  const r = underCurse(['mike', 'dustin', 'eddie'], { down: ['eddie'] });
  assert.deepEqual(r.ends.map((e) => e.how), ['clock']);
  assert.ok(r.frames < 800, `${r.frames} frames`);
});
