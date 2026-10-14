// The bot against guards: it circles to the blind side, burns, shoves, hits during the recovery, steps out of the slam, and
// does not get stuck. The win rates are loose floors. The bot is a good dodger, so they are met with room to spare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSim } from '../src/combat/sim.ts';
import { createBot } from '../src/combat/bot.ts';
import type { BotWaypoint } from '../src/combat/bot.ts';
import { damageRange } from '../src/combat/damage.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { arena, fightArena, tc, tf } from './sim-helpers.ts';
import { guardAt, wardenAt } from './guard-helpers.ts';
import type { Grid, HeroId, PartySeed, SimSpawn } from '../src/core/types.ts';
import type { Enemy } from '../src/combat/state.ts';

interface Fight { won: boolean; down: boolean; frames: number; damage: number; kos: number; full: number; blocked: number; burned: boolean; broke: boolean; slams: number; slamsLanded: number }

function fight(grid: Grid, party: PartySeed[], spawns: SimSpawn[], seed: number, goal: BotWaypoint, start = { x: tc(3), y: tf(9) }, max = 9000): Fight {
  const { sim, s } = buildSim({ grid, party, start, spawns, seed, difficulty: 'chief' });
  const bot = createBot({ grid, waypoints: [goal] });
  const lead = party[0]?.id as HeroId;
  const fullMin = damageRange(1, s.heroes[0]?.st.atk ?? 10, 8).min;
  const out: Fight = { won: false, down: false, frames: 0, damage: 0, kos: 0, full: 0, blocked: 0, burned: false, broke: false, slams: 0, slamsLanded: 0 };
  const target = s.enemies.find((e) => e.kind === 'guard' || e.kind === 'warden') as Enemy | undefined;
  let f = 0;
  for (; f < max; f++) {
    const ev = sim.step(bot.next(sim));
    const slam = ev.some((e) => e.t === 'sfx' && e.id === 'slam');
    if (slam) {
      out.slams++;
      if (ev.some((e) => e.t === 'hit' && !e.onEnemy)) out.slamsLanded++;
    }
    for (const e of ev) if (e.t === 'hit' && e.onEnemy && s.heroes[s.active]?.id === lead) { if (e.dmg >= fullMin) out.full++; else out.blocked++; }
    if (target && target.stat.burn > 0) out.burned = true;
    if (target && target.grace > 0) out.broke = true;
    if (ev.some((e) => e.t === 'allDown')) { out.down = true; break; }
    if (sim.enemiesAlive() === 0) break;
  }
  const st = sim.stats();
  return { ...out, won: sim.enemiesAlive() === 0 && !out.down, frames: f, damage: st.damageTaken, kos: st.kos };
}

const goal: BotWaypoint = { x: tc(28), y: tf(9) };
const elite = (id: string, tx: number, ty: number, patrol: [number, number][]): SimSpawn =>
  ({ kind: 'enemy', id, type: 'agent', tx, ty, group: 'x', tier: 'elite', patrol: patrol.map(([a, b]) => ({ tx: a, ty: b })) });
const agentP = (id: string, tx: number, ty: number, patrol: [number, number][]): SimSpawn =>
  ({ kind: 'enemy', id, type: 'agent', tx, ty, group: 'x', patrol: patrol.map(([a, b]) => ({ tx: a, ty: b })) });

test('bot: one guard and one elite agent in an arena, on chief: beaten in at least 80 percent of 20 seeds', () => {
  const spawns = [guardAt(17, 9, { group: 'x' }), elite('a1', 22, 5, [[22, 5], [22, 11]])];
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) if (fight(fightArena(), defaultParty('1.2'), spawns, seed, goal).won) wins++;
  assert.ok(wins >= 16, `${wins}/20`);
  // The same with the Lv 1 trio the other bot tests use.
  let trio = 0;
  for (let seed = 1; seed <= 20; seed++) if (fight(fightArena(), [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }], spawns, seed, goal).won) trio++;
  assert.ok(trio >= 16, `${trio}/20 with the Lv 1 trio`);
});

test('bot: a lone Warden with two agents, on chief: beaten in at least 40 percent of 20 seeds, and it cost something', () => {
  const spawns = [wardenAt(20, 9, { group: 'x' }), agentP('a1', 23, 6, [[23, 6], [23, 11]]), agentP('a2', 25, 12, [[25, 12], [25, 7]])];
  let wins = 0, damage = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = fight(fightArena(), defaultParty('1.2'), spawns, seed, goal);
    if (r.won) wins++;
    damage += r.damage;
  }
  assert.ok(wins >= 8, `${wins}/20`);
  assert.ok(damage / 20 >= 15, `the fights cost ${(damage / 20).toFixed(0)} HP on average`);
});

test('bot: a lone Mike goes round to the blind side: most of his hits on a guard are full-damage ones, and the shield breaks', () => {
  let full = 0, blocked = 0, won = 0, broke = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const r = fight(arena(30, 16), [{ id: 'mike', level: 4 }], [guardAt(20, 8, { group: 'x' })], seed, { x: tc(26), y: tf(8) }, { x: tc(3), y: tf(8) });
    full += r.full; blocked += r.blocked; if (r.won) won++; if (r.broke) broke++;
  }
  assert.equal(won, 8);
  assert.ok(full > blocked * 3, `${full} full hits against ${blocked} blocked`);
  assert.ok(broke >= 6, `the third swing broke it in ${broke} of 8`);
});

test('bot: Dustin burns a guard with Farrah spray, and Eleven breaks it with Push or Mind Blast', () => {
  const run = (id: HeroId): { burned: number; broke: number; won: number } => {
    let burned = 0, broke = 0, won = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const r = fight(arena(30, 16), [{ id, level: 4 }], [guardAt(20, 8, { group: 'x' })], seed, { x: tc(26), y: tf(8) }, { x: tc(3), y: tf(8) });
      if (r.burned) burned++;
      if (r.broke) broke++;
      if (r.won) won++;
    }
    return { burned, broke, won };
  };
  const dustin = run('dustin'), eleven = run('eleven');
  assert.ok(dustin.burned >= 7, `Dustin lit the guard in ${dustin.burned} of 8`);
  assert.ok(eleven.broke >= 7, `Eleven broke it in ${eleven.broke} of 8`);
  assert.ok(dustin.won >= 7 && eleven.won >= 7, `Dustin won ${dustin.won}, Eleven won ${eleven.won}`);
  const lucas = run('lucas');
  assert.ok(lucas.won >= 7, `Lucas, who has neither, still wins ${lucas.won} of 8`);
});

test('bot: it steps out of the Warden\'s slam: few of them land', () => {
  let slams = 0, landed = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const r = fight(arena(30, 16), [{ id: 'mike', level: 5 }, { id: 'eleven', level: 5 }], [wardenAt(20, 8, { group: 'x' })], seed, { x: tc(26), y: tf(8) }, { x: tc(3), y: tf(8) });
    slams += r.slams; landed += r.slamsLanded;
  }
  assert.ok(slams >= 10, `${slams} slams to dodge`);
  assert.ok(landed <= slams * 0.3, `${landed} of ${slams} slams landed`);
});

test('bot: it does not get stuck with a guard in a corridor one, two or three tiles wide', () => {
  for (const width of [1, 2, 3]) {
    for (const kind of ['guard', 'warden'] as const) {
      const marks: Record<string, string> = {};
      for (let x = 1; x < 39; x++) for (let y = 1; y < 14; y++) if (Math.abs(y - 7) > (width - 1) / 2) marks[`${x},${y}`] = 'T';
      for (let seed = 1; seed <= 4; seed++) {
        const spawn = kind === 'guard' ? guardAt(20, 7, { group: 'x' }) : wardenAt(20, 7, { group: 'x' });
        const r = fight(arena(40, 15, marks), defaultParty('1.2'), [spawn], seed, { x: tc(36), y: tf(7) }, { x: tc(3), y: tf(7) }, 7000);
        assert.ok(r.won, `width ${width} ${kind} seed ${seed}: ${r.down ? 'wiped' : 'stuck'} after ${r.frames} frames`);
      }
    }
  }
});

test('bot: solid furniture is walls to it: it takes the same route round a wall of generators as round a wall of trees', () => {
  const walls: Record<string, string> = {};
  const furniture: SimSpawn[] = [];
  for (let y = 1; y <= 11; y++) { walls[`14,${y}`] = 'T'; furniture.push({ kind: 'prop', id: `g${y}`, prop: y % 3 === 0 ? 'tank' : y % 3 === 1 ? 'rack' : 'generator', tx: 14, ty: y }); }
  const route = (grid: Grid, spawns: SimSpawn[]): number => {
    const { sim } = buildSim({ grid, party: [{ id: 'mike' }], start: { x: tc(4), y: tf(4) }, spawns, seed: 1 });
    const bot = createBot({ grid, waypoints: [{ x: tc(24), y: tf(4) }] });
    let f = 0;
    for (; f < 1500 && !bot.done(); f++) sim.step(bot.next(sim));
    assert.ok(bot.done(), 'reached the far side');
    return f;
  };
  const trees = route(arena(30, 16, walls), []);
  const gear = route(arena(30, 16), furniture);
  assert.ok(Math.abs(gear - trees) <= 12, `${gear} frames round generators against ${trees} round trees`);
});
