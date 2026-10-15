// The bot in Level 4's fights: three waves of young demodogs (the ambush at the hole), Will at range, and a swelling pod.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import { defaultParty } from '../src/core/campaign.ts';
import type { Enemy, Hero } from '../src/combat/state.ts';
import type { Difficulty, PartySeed, SimSpawn } from '../src/core/types.ts';
import { arena, makeWhite, ofType, run, tc, tf } from './sim-helpers.ts';

/** The ambush in a small field: three waves of 3, 3 and 4 demodogs, dormant at the east end, each woken by the last group cleared. */
function waves(): SimSpawn[] {
  const spots: [number, number][] = [[12, 4], [12, 8], [13, 6], [11, 6], [12, 3], [12, 9]];
  const out: SimSpawn[] = [];
  [3, 3, 4].forEach((n, w) => {
    for (let i = 0; i < n; i++) {
      const [tx, ty] = spots[(i + w) % spots.length] as [number, number];
      out.push({ kind: 'enemy', id: `d${w}${i}`, type: 'demodog', tx, ty, group: `amb${w + 1}`, dormant: true });
    }
  });
  return out;
}

interface Fight { won: boolean; down: boolean; frames: number; damage: number; kos: number }

function ambush(seed: number, difficulty: Difficulty = 'chief', careless = false): Fight {
  const grid = arena(16, 12);
  const { sim } = makeWhite({ grid, party: defaultParty('2.1'), start: { x: tc(3), y: tf(6) }, spawns: waves(), enemyMult: 1.15, seed, difficulty });
  sim.spawnGroup('amb1');
  const bot = createBot({ grid, waypoints: [{ x: tc(3), y: tf(6) }], careless });
  let down = false, f = 0;
  for (; f < 14400 && !down && sim.enemiesAlive() > 0; f++) {
    for (const e of sim.step(bot.next(sim))) {
      if (e.t === 'groupCleared' && e.group !== 'amb3') sim.spawnGroup(`amb${Number(e.group.slice(3)) + 1}`);
      if (e.t === 'allDown') down = true;
    }
  }
  const st = sim.stats();
  return { won: sim.enemiesAlive() === 0 && !down, down, frames: f, damage: st.damageTaken, kos: st.kos };
}

test('ambush: the 2.1 party on chief beats three waves of 3, 3 and 4 demodogs at enemyMult 1.15 in at least 17 of 20 seeds', () => {
  const fights = Array.from({ length: 20 }, (_, i) => ambush(i + 1));
  const wins = fights.filter((f) => f.won).length;
  assert.ok(wins >= 17, `${wins}/20`);
  const damage = fights.reduce((n, f) => n + f.damage, 0) / fights.length;
  const secs = fights.reduce((n, f) => n + f.frames, 0) / fights.length / 60;
  // The ambush costs something, but nowhere near the party's 230 HP.
  assert.ok(damage > 5 && damage < 150, `average damage taken ${damage.toFixed(0)}`);
  assert.ok(secs > 5 && secs < 90, `average fight ${secs.toFixed(0)} s`);
});

test('ambush: kid is easier than upside, upside still wins a third, and the careless bot clears most', () => {
  const rate = (d: Difficulty, careless = false): { wins: number; dmg: number } => {
    const fs = Array.from({ length: 12 }, (_, i) => ambush(i + 1, d, careless));
    return { wins: fs.filter((f) => f.won).length, dmg: fs.reduce((n, f) => n + f.damage, 0) / fs.length };
  };
  const kid = rate('kid'), upside = rate('upside');
  assert.ok(kid.wins >= 11 && upside.wins >= 4, `kid ${kid.wins}/12, upside ${upside.wins}/12`);
  assert.ok(upside.dmg > kid.dmg, `${upside.dmg.toFixed(0)} damage on upside against ${kid.dmg.toFixed(0)} on kid`);
  assert.ok(rate('chief', true).wins >= 10);
});

test('ambush: no seed leaves the bot stuck', () => {
  for (let seed = 21; seed <= 50; seed++) {
    const f = ambush(seed);
    assert.ok(f.won || f.down, `seed ${seed}: ${f.frames} frames without an end`);
  }
});

test('will: led by the bot he stays at range, casts the Fireball, and beats a squad of agents', () => {
  const party: PartySeed[] = [{ id: 'will', level: 4 }];
  let wins = 0, casts = 0, near = 0, samples = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const grid = arena(24, 14);
    const spawns: SimSpawn[] = [0, 1, 2].map((i) => ({ kind: 'enemy', id: `a${i}`, type: 'agent', tx: 16 + i, ty: 4 + i * 3, group: 'g' }));
    const { sim, s } = makeWhite({ grid, party, start: { x: tc(3), y: tf(7) }, spawns, seed });
    const bot = createBot({ grid, waypoints: [{ x: tc(21), y: tf(7) }] });
    const will = s.heroes[0] as Hero;
    let mp = will.mp;
    for (let f = 0; f < 5400 && sim.enemiesAlive() > 0 && !s.over; f++) {
      sim.step(bot.next(sim));
      if (will.mp < mp - 5) casts++;
      mp = will.mp;
      const foes = s.enemies.filter((e: Enemy) => !e.dead);
      const d = Math.min(...foes.map((e) => Math.hypot(e.x - will.x, e.y - will.y)));
      if (foes.length > 0 && foes.some((e) => e.aware) && d < 200) { samples++; near += d; }
    }
    if (sim.enemiesAlive() === 0 && !s.over) wins++;
  }
  assert.ok(wins >= 9, `${wins}/12`);
  assert.ok(casts >= 6, `${casts} Fireballs in 12 fights`);
  assert.ok(near / samples > 55, `he fights from ${(near / samples).toFixed(0)} px on average`);
});

test('pod: the bot backs out of a swelling pod. A hero left standing beside one is hit', () => {
  const grid = arena(20, 12);
  const pod: SimSpawn[] = [{ kind: 'enemy', id: 'p', type: 'pod', tx: 8, ty: 6, group: 'g' }];
  let hurt = 0, idleHurt = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const mike = makeWhite({ grid, party: [{ id: 'mike', level: 5 }], start: { x: tc(4), y: tf(6) }, spawns: pod, seed, enemyMult: 1.15 });
    const bot = createBot({ grid, waypoints: [{ x: tc(14), y: tf(6) }] });
    for (let f = 0; f < 600; f++) mike.sim.step(bot.next(mike.sim));
    if (mike.sim.stats().damageTaken > 0) hurt++;
    const still = makeWhite({ grid, party: [{ id: 'mike', level: 5 }], start: { x: tc(8) - 12, y: tf(6) }, spawns: pod, seed, enemyMult: 1.15 });
    run(still.sim, 100);
    if (still.sim.stats().damageTaken > 0) idleHurt++;
  }
  assert.ok(hurt <= 2, `the bot was hit by a pod in ${hurt} of 10`);
  assert.equal(idleHurt, 10);
});

test('cold spot: a bot with Will in front fights the hidden vines it can now see, and with Mike in front it does not go looking', () => {
  const run1 = (lead: 'will' | 'mike'): { dead: number; lashed: number } => {
    const grid = arena(24, 12);
    const spawns: SimSpawn[] = [{ kind: 'enemy', id: 'v0', type: 'vine', tx: 12, ty: 5, group: 'corn', hidden: true }, { kind: 'enemy', id: 'v1', type: 'vine', tx: 12, ty: 8, group: 'corn', hidden: true }];
    const party: PartySeed[] = lead === 'will' ? [{ id: 'will', level: 4 }, { id: 'mike', level: 5 }] : [{ id: 'mike', level: 5 }, { id: 'will', level: 4 }];
    const { sim } = makeWhite({ grid, party, start: { x: tc(4), y: tf(6) }, spawns, seed: 4, enemyMult: 1.15 });
    const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(6) }] });
    let lashed = 0;
    for (let f = 0; f < 900; f++) lashed += ofType(sim.step(bot.next(sim)), 'hit').filter((h) => !h.onEnemy).length;
    return { dead: sim.stats().killsByKind.vine ?? 0, lashed };
  };
  const will = run1('will'), mike = run1('mike');
  assert.equal(will.dead, 2, 'Will sees them and shoots them');
  assert.ok(will.lashed <= mike.lashed, `${will.lashed} lashes against ${mike.lashed}`);
});
