import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import type { BotWaypoint } from '../src/combat/bot.ts';
import { buildGrid } from '../src/core/tiles.ts';
import { agent, rat, tc, tf } from './sim-helpers.ts';
import type { Grid, Sim, SimSpawn } from '../src/core/types.ts';

/** A 56 by 20 map: pine border, a creek wall at x = 24 with a ford at y = 15, a tree wall at x = 40 with a doorway at y = 5. */
function miniLevel(): Grid {
  const rows: string[] = [];
  for (let y = 0; y < 20; y++) {
    let row = '';
    for (let x = 0; x < 56; x++) {
      let c = '.';
      if (x === 0 || y === 0 || x === 55 || y === 19) c = 'T';
      else if (x === 24) c = y >= 14 && y <= 15 ? 'w' : '~';
      else if (x === 40) c = y === 5 ? '-' : 'T';
      else if ((x * 7 + y * 13) % 41 === 0) c = 'b';
      row += c;
    }
    rows.push(row);
  }
  return buildGrid(rows);
}

interface Run { sim: Sim; frames: number; done: boolean }

function playBot(grid: Grid, spawns: SimSpawn[], waypoints: BotWaypoint[], seed: number, max = 6000): Run {
  const sim = createSim({
    grid, party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }], start: { x: tc(3), y: tf(9) }, spawns, seed,
  });
  const bot = createBot({ grid, waypoints });
  let f = 0;
  for (; f < max && !bot.done(); f++) {
    const ev = sim.step(bot.next(sim));
    if (ev.some((e) => e.t === 'allDown')) break;
  }
  return { sim, frames: f, done: bot.done() };
}

test('bot: A* routes around a creek wall to a waypoint, then reports done', () => {
  const grid = miniLevel();
  const r = playBot(grid, [], [{ x: tc(50), y: tf(9) }], 1);
  assert.ok(r.done, 'reached the waypoint');
  assert.ok(r.frames < 1500, `took ${r.frames} frames`);
  assert.ok(Math.abs(r.sim.heroPos().x - tc(50)) < 12);
  // With no waypoints it is done at once and stays idle.
  const bot = createBot({ grid, waypoints: [] });
  assert.equal(bot.done(), true);
});

test('bot: opens a gate and wakes a group at flagged waypoints, and wins the fight that follows', () => {
  const grid = miniLevel();
  // Close the doorway at x = 40, y = 5 with a gate. Three agents sleep past it.
  const spawns: SimSpawn[] = [
    { kind: 'prop', id: 'gate1', prop: 'gate', tx: 40, ty: 5 },
    agent('w1', 46, 4, 'wave', { dormant: true }), agent('w2', 46, 6, 'wave', { dormant: true }), agent('w3', 47, 5, 'wave', { dormant: true }),
    rat('r1', 30, 14, 'rats'), rat('r2', 31, 15, 'rats'),
  ];
  const waypoints: BotWaypoint[] = [
    { x: tc(22), y: tf(14) }, { x: tc(38), y: tf(5), open: 'gate1' }, { x: tc(43), y: tf(5), wake: 'wave' }, { x: tc(52), y: tf(9) },
  ];
  let ok = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const r = playBot(grid, spawns, waypoints, seed, 9000);
    const gate = r.sim.view().props.find((p) => p.id === 'gate1');
    if (r.done && gate?.state === 'open' && r.sim.enemiesAlive() === 0) ok++;
  }
  assert.ok(ok >= 9, `${ok}/10 runs opened the gate, woke the wave and cleared everything`);
});

test('bot: ignores a foe it cannot reach instead of pacing at the water', () => {
  const grid = miniLevel();
  // An agent patrolling right behind the creek wall, close to the path but cut off by water.
  const spawns: SimSpawn[] = [agent('stuck', 25, 8, 'x', { patrol: [{ tx: 25, ty: 6 }, { tx: 25, ty: 11 }] })];
  const r = playBot(grid, spawns, [{ x: tc(20), y: tf(9) }, { x: tc(22), y: tf(15) }, { x: tc(30), y: tf(15) }], 3, 4000);
  assert.ok(r.done, `finished in ${r.frames} frames`);
});

test('bot: walks around a solid prop it did not know about', () => {
  const rows: string[] = [];
  for (let y = 0; y < 9; y++) {
    let row = '';
    for (let x = 0; x < 30; x++) row += x === 0 || x === 29 || y === 0 || y === 8 ? 'T' : '.';
    rows.push(row);
  }
  const grid = buildGrid(rows);
  const spawns: SimSpawn[] = [
    { kind: 'prop', id: 'crate1', prop: 'crate', tx: 12, ty: 4 },
    { kind: 'prop', id: 'crate2', prop: 'crate', tx: 12, ty: 3 },
    { kind: 'prop', id: 'crate3', prop: 'crate', tx: 12, ty: 5 },
  ];
  const sim = createSim({ grid, party: [{ id: 'mike' }], start: { x: tc(3), y: tf(4) }, spawns, seed: 1 });
  const bot = createBot({ grid, waypoints: [{ x: tc(26), y: tf(4) }] });
  let f = 0;
  for (; f < 1500 && !bot.done(); f++) sim.step(bot.next(sim));
  assert.ok(bot.done(), `stuck at ${JSON.stringify(sim.heroPos())} after ${f} frames`);
});

test('bot: a waypoint inside a wall is moved to the nearest open tile', () => {
  const grid = miniLevel();
  const r = playBot(grid, [], [{ x: tc(24), y: tf(5) }], 1, 2000);
  assert.ok(r.done);
});

test('bot: same seed, same run', () => {
  const grid = miniLevel();
  const spawns: SimSpawn[] = [rat('r1', 12, 8, 'a'), rat('r2', 14, 11, 'a'), agent('a1', 18, 6, 'a', { patrol: [{ tx: 18, ty: 6 }, { tx: 18, ty: 12 }] })];
  const wps: BotWaypoint[] = [{ x: tc(22), y: tf(14) }, { x: tc(30), y: tf(14) }];
  const a = playBot(grid, spawns, wps, 77);
  const b = playBot(grid, spawns, wps, 77);
  assert.equal(a.frames, b.frames);
  assert.deepEqual(a.sim.stats(), b.sim.stats());
  assert.deepEqual(a.sim.party(), b.sim.party());
  assert.deepEqual(a.sim.heroPos(), b.sim.heroPos());
  assert.deepEqual(a.sim.view().actors, b.sim.view().actors);
});
