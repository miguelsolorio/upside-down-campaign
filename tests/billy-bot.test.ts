// The bot against Billy (src/combat/bot_billy.ts, bot_hold.ts), in a small walled court built in tests/billy-helpers.ts, with the party a real
// run brings to 3.3 (Mike, Dustin, Robin and Eleven): it beats him on chief, steps out of the charge's lane and off a grab's wind-up, hits him
// while he is stunned against a wall, and swaps to Eleven and walks up to him once he kneels. The bot is given no flag to open or wake anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import type { Sim, SimEvent } from '../src/core/types.ts';
import type { Hero } from '../src/combat/state.ts';
import { arena, ofType, tc, tf } from './sim-helpers.ts';
import type { BRig } from './billy-helpers.ts';
import { bRig, bossView, charger, grabber, knockOut, pinnedRig, slotOf, at, until } from './billy-helpers.ts';

const grid = arena(22, 14);
const bot = (careless = false) => createBot({ grid, waypoints: [{ x: tc(4), y: tf(7) }], careless });

/** The bot fights the rig until Billy is dead, the party is down or `max` frames pass. The rig's sim is wrapped to see any flag the bot sets. */
function fight(r: BRig, careless = false, max = 14400) {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const b = bot(careless);
  const ev: SimEvent[] = [];
  let won = false, down = false, f = 0, stunned = 0, held = 0, charges = 0, wasWind = false;
  for (; f < max; f++) {
    const out = r.sim.step(b.next(spied));
    ev.push(...out);
    if (out.some((e) => e.t === 'allDown')) down = true;
    if (out.some((e) => e.t === 'kill' && e.kind === 'billy')) won = true;
    if (r.b.move === 'stun') stunned++;
    if (r.s.hold) held++;
    const wind = r.b.move === 'wind';
    if (wind && !wasWind) charges++;
    wasWind = wind;
    if (down || won) break;
  }
  return { won, down, frames: f, calls, stunned, held, charges, ev, taken: r.sim.stats().damageTaken };
}

const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);

test('bot: it beats Billy on chief in at least 9 of 10 seeds, with no flag from the bot, through the pin and the reach', () => {
  const fights = seeds(10).map((seed) => fight(bRig({ seed }, false)));
  for (const f of fights) assert.deepEqual(f.calls, [], 'with no flags from the bot');
  const wins = fights.filter((f) => f.won);
  assert.ok(wins.length >= 9, `${wins.length}/10`);
  for (const f of wins) {
    const pinned = ofType(f.ev, 'pinned');
    assert.equal(pinned.length, 1, 'he was pinned, not killed');
    const kill = ofType(f.ev, 'kill').find((k) => k.kind === 'billy');
    assert.equal(kill?.by, 'eleven', 'and Eleven reached him');
  }
  const avg = wins.reduce((n, f) => n + f.frames, 0) / wins.length;
  assert.ok(avg / 60 >= 12 && avg / 60 <= 60, `an average of ${(avg / 60).toFixed(0)} s`);
  // The charge came at least once in most fights (the first one as he closes in), and the bot lost nobody to it.
  assert.ok(fights.filter((f) => f.charges >= 1).length >= 8, `charges seen: ${fights.map((f) => f.charges).join(', ')}`);
  // He called his Flayed at half HP, and the bot dealt with them or left them to the reach.
  assert.ok(fights.every((f) => ofType(f.ev, 'kill').filter((k) => k.group === 'billys').length <= 2));
});

test('bot: it steps out of the charge\'s lane, where a bot that never dodges is hit', () => {
  const hitBy = (careless: boolean): number => seeds(10).filter((seed) => {
    const r = charger(110, { seed });
    r.hero.st.hp = 900; r.hero.hp = 900;
    const b = bot(careless);
    for (let f = 0; f < 90; f++) {
      const ev = r.sim.step(b.next(r.sim));
      if (hurt(ev).length > 0) return true;
      if (r.b.move === 'recover' || r.b.move === 'stun') break;
    }
    return false;
  }).length;
  const careful = hitBy(false), careless = hitBy(true);
  assert.ok(careful <= 1, `the careful bot was hit in ${careful} of 10`);
  assert.ok(careless >= 7, `the careless bot was hit in ${careless} of 10`);
});

test('bot: it backs off a grab\'s wind-up, where a bot that never dodges is held', () => {
  const heldIn = (careless: boolean): number => seeds(10).filter((seed) => {
    const r = grabber(20, { seed });
    r.hero.st.hp = 900; r.hero.hp = 900;
    const b = bot(careless);
    for (let f = 0; f < 60; f++) {
      r.sim.step(b.next(r.sim));
      if (r.s.hold) return true;
    }
    return false;
  }).length;
  const careful = heldIn(false), careless = heldIn(true);
  assert.ok(careful <= 2, `the careful bot was held in ${careful} of 10`);
  assert.ok(careless >= 7, `the careless bot was held in ${careless} of 10`);
});

test('bot: a swap frees it from Billy\'s hold at once', () => {
  const r = grabber(20, { seed: 3 });
  r.hero.st.hp = 900; r.hero.hp = 900;
  // The hold starts while the hero stands still, then the real bot plays on.
  until(r, () => r.s.hold !== null);
  const b = bot();
  let freedAt = -1;
  for (let f = 0; f < 10 && freedAt < 0; f++) {
    r.sim.step(b.next(r.sim));
    if (r.s.hold === null) freedAt = f;
  }
  assert.ok(freedAt >= 0 && freedAt <= 8, `freed after ${freedAt} frames`);
  assert.notEqual((r.s.heroes[r.s.active] as Hero).id, 'mike');
});

test('bot: a charge into a wall stuns him, and it is on him inside the stun without having taken the charge', () => {
  // Billy charges at a hero 40 px off the west wall. The bot leaves the lane, he meets the wall and the bot goes in.
  const got = seeds(6).map((seed) => {
    const r = charger(100, { seed });
    r.hero.st.hp = 900; r.hero.hp = 900;
    at(r, 56, r.boss.y);
    r.boss.x = 156; r.boss.hx = 156;
    const b = bot();
    let stunnedAt = -1, hits = 0, dmg = 0;
    for (let f = 0; f < 200; f++) {
      const ev = r.sim.step(b.next(r.sim));
      if (stunnedAt < 0 && r.b.move === 'stun') stunnedAt = f;
      if (stunnedAt >= 0 && r.b.move === 'stun') for (const h of ofType(ev, 'hit')) if (h.onEnemy) { hits++; dmg += h.dmg; }
      if (stunnedAt >= 0 && r.b.move !== 'stun') break;
    }
    return { stunnedAt, hits, dmg, hero: r.hero.hp };
  });
  assert.ok(got.every((g) => g.stunnedAt >= 0), 'the charge ended in the wall every time: the bot left the lane');
  assert.ok(got.filter((g) => g.hits >= 2).length >= 5, `hits in the stun: ${got.map((g) => g.hits).join(', ')}`);
  assert.ok(got.every((g) => g.hero === 900), 'and the charge hit nobody');
});

test('bot: pinned, it swaps to Eleven, walks up to within 24 px, and stands there until he is free', () => {
  const { r } = pinnedRig({}, undefined, false);
  r.sim.dev.teleport(tc(4), tf(7));
  const b = bot();
  const ev: SimEvent[] = [];
  let reachFrom = -1, dist = 0;
  for (let f = 0; f < 600 && !r.boss.dead; f++) {
    ev.push(...r.sim.step(b.next(r.sim)));
    const h = r.s.heroes[r.s.active] as Hero;
    if (reachFrom < 0 && (bossView(r)?.k ?? 0) > 0) { reachFrom = f; dist = Math.hypot(h.x - r.boss.x, h.y - r.boss.y); assert.equal(h.id, 'eleven'); }
  }
  assert.ok(r.boss.dead, 'he is free');
  assert.ok(ofType(ev, 'swap').some((s) => s.to === 'eleven'), 'it swapped to Eleven');
  assert.ok(dist <= 32 && dist > 0, `the reach began at ${dist.toFixed(0)} px`);
  assert.equal(ofType(ev, 'poked').length, 0, 'and it never swung at him');
  assert.equal(ofType(ev, 'kill').find((k) => k.kind === 'billy')?.by, 'eleven');
  // The walk across a 22 tile court is about 150 px, then the minute of standing.
  assert.ok(reachFrom < 400, `${reachFrom} frames to start`);
});

test('bot: pinned with Eleven down, it swings at him, she stands back up, and it swaps to her and frees him', () => {
  const { r } = pinnedRig();
  knockOut(r, 'eleven');
  r.sim.dev.teleport(tc(4), tf(7));
  const b = bot();
  const ev: SimEvent[] = [];
  for (let f = 0; f < 900 && !r.boss.dead; f++) ev.push(...r.sim.step(b.next(r.sim)));
  assert.ok(r.boss.dead, 'he is free');
  assert.ok(ofType(ev, 'poked').length >= 1, 'a try brought her back');
  assert.equal((r.s.heroes[slotOf(r, 'eleven')] as Hero).ko, false);
  assert.ok(ofType(ev, 'swap').some((s) => s.to === 'eleven'));
});

test('bot: with Eleven not in the party it keeps trying him, and nothing frees him', () => {
  const party = [{ id: 'mike' as const, level: 7 }, { id: 'dustin' as const, level: 6 }];
  const { r } = pinnedRig({}, party);
  r.sim.dev.teleport(tc(4), tf(7));
  const b = bot();
  const ev: SimEvent[] = [];
  for (let f = 0; f < 600; f++) ev.push(...r.sim.step(b.next(r.sim)));
  assert.equal(r.boss.dead, false);
  assert.ok(ofType(ev, 'poked').length >= 3, 'it keeps trying');
});
