// The bot against the Demogorgon: it dodges the charge and the marks, swaps to Eleven for the finisher and wins most
// fights in the 18 by 12 court at enemyMult 1.2. It is given no flag to open or wake anything for the boss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/combat/bot.ts';
import type { Difficulty, HeroId, Sim } from '../src/core/types.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Hero } from '../src/combat/state.ts';
import { arena, tc, tf } from './sim-helpers.ts';
import type { BossRig } from './demo-helpers.ts';
import { bossRig, only } from './demo-helpers.ts';

const grid = arena(18, 12);

interface Fight {
  won: boolean; down: boolean; frames: number; damage: number; kos: number;
  pinnedAt: number; killAt: number; killBy: string; swapToEleven: boolean; stuns: number; calls: string[];
}

/** Plays a bot against the rig until the boss is dead, the party is down or `max` frames pass. */
function play(r: BossRig, o: { careless?: boolean; max?: number } = {}): Fight {
  const calls: string[] = [];
  const spied: Sim = {
    ...r.sim,
    openProp: (id) => { calls.push(`openProp:${id}`); r.sim.openProp(id); },
    spawnGroup: (g) => { calls.push(`spawnGroup:${g}`); r.sim.spawnGroup(g); },
  };
  const bot = createBot({ grid, waypoints: [{ x: tc(3), y: tf(6) }], careless: o.careless });
  const out: Fight = { won: false, down: false, frames: 0, damage: 0, kos: 0, pinnedAt: -1, killAt: -1, killBy: '', swapToEleven: false, stuns: 0, calls };
  let f = 0;
  for (; f < (o.max ?? 14400); f++) {
    const ev = r.sim.step(bot.next(spied));
    for (const e of ev) {
      if (e.t === 'pinned') out.pinnedAt = f;
      if (e.t === 'kill' && e.kind === 'demogorgon') { out.killAt = f; out.killBy = e.by; }
      if (e.t === 'swap' && e.to === 'eleven' && out.pinnedAt >= 0) out.swapToEleven = true;
      if (e.t === 'allDown') out.down = true;
    }
    if (out.down || r.sim.enemiesAlive() === 0) break;
  }
  const st = r.sim.stats();
  return { ...out, won: r.sim.enemiesAlive() === 0 && !out.down, frames: f, damage: st.damageTaken, kos: st.kos, stuns: r.d.stuns };
}

const fightSeed = (seed: number, difficulty: Difficulty = 'chief', careless = false): Fight =>
  play(bossRig({ grid, seed, difficulty }, false), { careless });

test('boss fight: the bot wins at least 15 of 20 seeds on chief in the 18 by 12 court, finisher included', () => {
  const fights = Array.from({ length: 20 }, (_, i) => fightSeed(i + 1));
  const wins = fights.filter((f) => f.won);
  assert.ok(wins.length >= 15, `${wins.length}/20`);
  for (const f of wins) {
    assert.ok(f.pinnedAt >= 0 && f.killAt > f.pinnedAt, 'a win goes through the pin');
    assert.equal(f.killBy, 'eleven', 'and the beam does it');
    assert.ok(f.stuns >= 3, `${f.stuns} wall stuns`);
    assert.deepEqual(f.calls, [], 'with no flags from the bot');
  }
  const avg = wins.reduce((n, f) => n + f.frames, 0) / wins.length / 60;
  assert.ok(avg >= 20 && avg <= 120, `an average fight of ${avg.toFixed(0)} s`);
});

test('boss fight: a bot that does not watch the telegraphs still wins most of them, and loses far more HP doing it', () => {
  const careful = Array.from({ length: 20 }, (_, i) => fightSeed(i + 1));
  const careless = Array.from({ length: 20 }, (_, i) => fightSeed(i + 1, 'chief', true));
  const wins = careless.filter((f) => f.won).length;
  assert.ok(wins >= 12, `${wins}/20`);
  const mean = (fs: Fight[]): number => fs.reduce((n, f) => n + f.damage, 0) / fs.length;
  assert.ok(mean(careful) < mean(careless) * 0.7, `${mean(careful).toFixed(0)} damage against ${mean(careless).toFixed(0)}`);
});

test('boss fight: kid is a walk, and upside is harder than chief but can be won', () => {
  const rate = (d: Difficulty): number => Array.from({ length: 10 }, (_, i) => fightSeed(i + 1, d)).filter((f) => f.won).length;
  assert.ok(rate('kid') >= 9, 'kid');
  assert.ok(rate('upside') >= 4, 'upside');
});

test('boss fight: no seed leaves the bot stuck. Forty seeds all end, in a win or a wipe', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const f = fightSeed(seed);
    assert.ok(f.won || f.down, `seed ${seed} ran ${f.frames} frames without ending`);
  }
});

/** A charge-only boss against a lone bot: how many times is the hero hit across seeds? */
function chargeHits(id: HeroId, careless: boolean): number {
  let hit = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const r = bossRig({ grid, seed, party: [{ id, level: 5 }] }, false);
    only(r, 'charge');
    r.d.chargeCd = 0;
    const hp0 = r.hero.hp;
    const bot = createBot({ grid, waypoints: [{ x: tc(3), y: tf(6) }], careless });
    for (let f = 0; f < 400 && r.d.stuns === 0; f++) r.sim.step(bot.next(r.sim));
    assert.equal(r.d.stuns, 1, `seed ${seed}: the charge ended in a wall`);
    if (r.hero.hp < hp0) hit++;
  }
  return hit;
}

test('dodge: the bot leaves the line of a charge. A ranged hero is hit by few, a bot that is not watching by most', () => {
  assert.ok(chargeHits('lucas', false) <= 2, `Lucas was hit in ${chargeHits('lucas', false)} of 10`);
  assert.ok(chargeHits('lucas', true) >= 8, `a careless Lucas was hit in ${chargeHits('lucas', true)} of 10`);
});

test('dodge: it steps off the marks of the acid fan and the leap', () => {
  const hits = (careless: boolean, mode: 'spit' | 'leap'): number => {
    let n = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const r = bossRig({ grid, seed, party: [{ id: 'lucas', level: 5 }], start: { x: tc(7), y: tf(6) } }, false);
      only(r, mode);
      r.d.petals = true;
      if (mode === 'spit') { r.d.spitCd = 0; r.boss.hp = r.boss.hpMax * 0.7; } else { r.d.leapCd = 0; r.boss.hp = r.boss.hpMax * 0.29; }
      const bot = createBot({ grid, waypoints: [{ x: tc(7), y: tf(6) }], careless });
      const hp0 = r.hero.hp;
      for (let f = 0; f < 140; f++) r.sim.step(bot.next(r.sim));
      if (r.hero.hp < hp0) n++;
    }
    return n;
  };
  assert.ok(hits(false, 'spit') <= 1, `acid hit a careful bot in ${hits(false, 'spit')} of 10`);
  assert.ok(hits(true, 'spit') >= 6, `acid hit a careless one in ${hits(true, 'spit')} of 10`);
  assert.ok(hits(false, 'leap') <= 1, `the leap hit a careful bot in ${hits(false, 'leap')} of 10`);
  assert.ok(hits(true, 'leap') >= 8, `the leap hit a careless one in ${hits(true, 'leap')} of 10`);
});

/** A rig with the boss already pinned by a real hit, the way a fight leaves it. */
function pinnedFight(seed: number, over: Parameters<typeof bossRig>[0] = {}): BossRig {
  const r = bossRig({ grid, seed, ...over }, false);
  only(r, null);
  r.d.stuns = 3;
  r.boss.hp = 30;
  hitEnemy(r.s, r.s.heroes[0] as Hero, r.boss, { power: 30, noCrit: true });
  return r;
}

test('finisher: a pinned boss with Mike in front: the bot swaps to Eleven, walks up and blasts it, using no flag', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const r = pinnedFight(seed);
    assert.equal(r.s.heroes[r.s.active]?.id, 'mike');
    const f = play(r, { max: 1500 });
    assert.ok(f.won, `seed ${seed}`);
    assert.ok(f.swapToEleven, 'it swapped to her');
    assert.equal(f.killBy, 'eleven');
    assert.ok(f.frames < 700, `${f.frames} frames`);
    assert.deepEqual(f.calls, []);
    assert.equal(r.hero.hp, r.hero.st.hp, 'a pinned boss costs nothing');
  }
});

test('finisher: with Lucas in front, and with Eleven in front but dry, it still finishes the job', () => {
  const lucas = pinnedFight(3, { party: [{ id: 'lucas', level: 4 }, { id: 'mike', level: 5 }, { id: 'eleven', level: 4 }] });
  const a = play(lucas, { max: 1500 });
  assert.ok(a.won && a.killBy === 'eleven', 'Lucas hands over');
  const dry = pinnedFight(3, { party: [{ id: 'eleven', level: 4 }, { id: 'mike', level: 5 }] });
  const eleven = dry.s.heroes[0] as Hero;
  eleven.mp = 2;
  const b = play(dry, { max: 1800 });
  assert.ok(b.won && b.killBy === 'eleven', 'she waits for her MP and blasts');
  assert.ok(b.frames > 100, 'it took a while to get the MP back');
});
