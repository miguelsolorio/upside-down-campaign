import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/combat/init.ts';
import { hurtHero } from '../src/combat/damage.ts';
import { setReduceFlashing, setShakeScale } from '../src/combat/index.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { arena, agent, inp, makeWhite, ofType, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { S } from '../src/combat/state.ts';
import type { SimEvent, SimSpawn } from '../src/core/types.ts';

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

test('rat: fast chaser, 24-frame red "!" before the bite, then 3 damage', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin' }], spawns: [rat('r', 8, 8)], seed: 5 });
  assert.equal(s.enemies[0]?.hpMax, 10);
  assert.ok(ENEMY_DEFS.rat.speed > 1.2);
  let alertRun = 0, longest = 0, hurt = 0, alertAt = -1, hurtAt = -1;
  const evs: SimEvent[] = [];
  for (let f = 0; f < 300 && hurt === 0; f++) {
    const ev = sim.step(inp());
    evs.push(...ev);
    const r = sim.view().actors.find((a) => a.kind === 'enemy');
    if (r?.alert) { alertRun++; if (alertAt < 0) alertAt = f; } else if (alertRun > 0) { longest = Math.max(longest, alertRun); alertRun = 0; }
    for (const h of ofType(ev, 'hit')) if (!h.onEnemy) { hurt = h.dmg; hurtAt = f; }
  }
  assert.equal(longest, 24, 'the alert shows for 24 frames');
  assert.equal(hurt, 3, 'contact damage 3');
  assert.ok(hurtAt - alertAt >= 24 && hurtAt - alertAt <= 40, `bite ${hurtAt - alertAt} frames after the alert`);
  assert.ok(sfxIds(evs).includes('alert'));
  // It closed 80 px in well under two seconds: a hero walks 60 px in that time.
  assert.ok(alertAt < 90, `reached the hero after ${alertAt} frames`);
});

test('rat: one to three bat hits kill it, a bite does not outlast the hit that interrupts it', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike' }], spawns: [rat('r', 6, 8)], seed: 5 });
  let hits = 0, hurt = 0;
  for (let f = 0; f < 200 && sim.enemiesAlive() > 0; f++) {
    const ev = sim.step(inp({ attackHeld: true, mx: 0.3 }));
    hits += ofType(ev, 'hit').filter((h) => h.onEnemy).length;
    hurt += ofType(ev, 'hit').filter((h) => !h.onEnemy).length;
  }
  assert.equal(sim.enemiesAlive(), 0);
  assert.ok(hits >= 1 && hits <= 3, `${hits} hits`);
  assert.equal(sim.view().actors.filter((a) => a.kind === 'enemy' && a.anim === 'ko').length, 1, 'it plays its death animation');
  run(sim, 40);
  assert.equal(s.enemies.length, 0, 'and the body is removed afterward');
  assert.ok(hurt <= 1);
});

test('agent: aggro radius 90 px needs line of sight', () => {
  const far = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 10, 8)], start: { x: tc(4), y: tf(8) } });
  run(far.sim, 60);
  assert.equal(far.sim.aggro(), false, 'at 96 px it does not notice');
  const close = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 9, 8)], start: { x: tc(4), y: tf(8) } });
  run(close.sim, 2);
  assert.equal(close.sim.aggro(), true, 'at 80 px it does');
  const wall = makeWhite({
    party: [{ id: 'dustin' }], spawns: [agent('a', 9, 8)], start: { x: tc(4), y: tf(8) },
    grid: arena(24, 16, { '7,7': 'T', '7,8': 'T', '7,9': 'T' }),
  });
  run(wall.sim, 60);
  assert.equal(wall.sim.aggro(), false, 'a wall blocks the line of sight');
});

test('agent: follows its patrol path until it sees the hero', () => {
  const spawns = [agent('a', 14, 4, 'g', { patrol: [{ tx: 14, ty: 4 }, { tx: 14, ty: 9 }, { tx: 19, ty: 9 }] })];
  const { sim } = makeWhite({ party: [{ id: 'dustin' }], spawns, start: { x: tc(2), y: tf(13) } });
  let minY = 1e9, maxY = 0, maxX = 0;
  for (let f = 0; f < 700; f++) {
    sim.step(inp());
    const a = sim.view().actors.find((x) => x.kind === 'enemy');
    assert.ok(a);
    minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y); maxX = Math.max(maxX, a.x);
  }
  assert.ok(maxY - minY > 60, `walked a leg of ${maxY - minY} px`);
  assert.ok(maxX > tc(18), 'reached the far corner of the path');
  assert.equal(sim.aggro(), false);
});

test('agent: keeps 70 to 100 px away, backs off when closed on, darts 5 damage after a 24-frame alert', () => {
  const { sim } = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 9, 8)], seed: 14 });
  // Stand still. The agent holds inside its band and shoots about every 100 frames.
  const ds: number[] = [];
  const alertStarts: number[] = [];
  let was = false, alertRun = 0, longest = 0;
  const dmgs: number[] = [];
  for (let f = 0; f < 700; f++) {
    const ev = sim.step(inp());
    const a = sim.view().actors.find((x) => x.kind === 'enemy')!;
    if (f > 60) ds.push(dist(a.x, a.y, sim.heroPos().x, sim.heroPos().y));
    if (a.alert && !was) alertStarts.push(f);
    if (a.alert) alertRun++; else if (alertRun) { longest = Math.max(longest, alertRun); alertRun = 0; }
    was = a.alert;
    for (const h of ofType(ev, 'hit')) if (!h.onEnemy) dmgs.push(h.dmg);
  }
  assert.ok(Math.min(...ds) >= 66, `closest ${Math.min(...ds)}`);
  assert.ok(Math.max(...ds) <= 112, `farthest ${Math.max(...ds)}`);
  assert.equal(longest, 24);
  assert.ok(alertStarts.length >= 5);
  const gaps = alertStarts.slice(1).map((v, i) => v - (alertStarts[i] as number));
  assert.ok(gaps.every((g) => g >= 85 && g <= 135), `gaps ${gaps.join(',')}`);
  assert.ok(dmgs.length >= 3);
  assert.ok(dmgs.every((d) => d >= 4 && d <= 6), `dart damage ${dmgs.join(',')}`);
  // Close in on one: it backs off first.
  const b = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 8, 8)], seed: 14 });
  run(b.sim, 5);
  const x0 = b.sim.view().actors.find((x) => x.kind === 'enemy')!.x;
  run(b.sim, 25, inp({ mx: 0.3 }));
  const x1 = b.sim.view().actors.find((x) => x.kind === 'enemy')!.x;
  assert.ok(x1 > x0 + 8, `agent backed off ${x1 - x0}`);
});

test('difficulty scales enemy HP and damage: kid 0.7, chief 1, upside 1.4', () => {
  const hp = (d: 'kid' | 'chief' | 'upside'): number[] => {
    const { s } = makeWhite({ difficulty: d, spawns: [rat('r', 15, 12), agent('a', 15, 13)] });
    return s.enemies.map((e) => e.hpMax);
  };
  assert.deepEqual(hp('kid'), [7, 17]);
  assert.deepEqual(hp('chief'), [10, 24]);
  assert.deepEqual(hp('upside'), [14, 34]);
  const dmg = (d: 'kid' | 'chief' | 'upside'): number => {
    const s = createState({ grid: arena(24, 16), party: [{ id: 'dustin' }], start: { x: 100, y: 100 }, spawns: [], seed: 9, difficulty: d });
    return hurtHero(s, s.heroes[0]!, 160, 100, 1, 20, 2);
  };
  const kid = dmg('kid'), chief = dmg('chief'), up = dmg('upside');
  assert.ok(Math.abs(kid - chief * 0.7) <= 1.2, `kid ${kid} chief ${chief}`);
  assert.ok(Math.abs(up - chief * 1.4) <= 1.2, `upside ${up} chief ${chief}`);
});

test('dormant spawns stay hidden until spawnGroup, then they come for you; groupCleared fires on the last kill', () => {
  const spawns: SimSpawn[] = [
    rat('r1', 12, 6, 'rats1', { dormant: true }), rat('r2', 12, 7, 'rats1', { dormant: true }),
    rat('r3', 12, 9, 'rats1', { dormant: true }), rat('r4', 12, 10, 'rats1', { dormant: true }),
    agent('a1', 20, 13, 'wave2', { dormant: true }),
  ];
  const { sim, s } = makeWhite({ spawns, seed: 3 });
  run(sim, 30);
  assert.equal(sim.view().actors.filter((a) => a.kind === 'enemy').length, 0, 'invisible');
  assert.equal(sim.enemiesAlive('rats1'), 4, 'but counted');
  assert.equal(sim.enemiesAlive(), 5);
  assert.equal(sim.aggro(), false);
  sim.spawnGroup('rats1');
  run(sim, 2);
  assert.equal(sim.view().actors.filter((a) => a.kind === 'enemy').length, 4);
  assert.equal(sim.aggro(), true);
  assert.equal(s.enemies.find((e) => e.id === 'a1')?.dormant, true, 'other groups sleep on');
  // Kill them one at a time.
  const events: SimEvent[] = [];
  for (const id of ['r1', 'r2', 'r3']) {
    s.enemies.find((e) => e.id === id)!.hp = 0;
    events.push(...sim.step(inp()));
  }
  assert.equal(ofType(events, 'groupCleared').length, 0, 'not yet');
  s.enemies.find((e) => e.id === 'r4')!.hp = 0;
  events.push(...sim.step(inp()));
  const cleared = ofType(events, 'groupCleared');
  assert.deepEqual(cleared.map((c) => c.group), ['rats1']);
  assert.equal(ofType(events, 'kill').length, 4);
  assert.equal(sim.enemiesAlive('rats1'), 0);
  assert.equal(sim.enemiesAlive(), 1);
  // A wave woken by the previous groupCleared.
  sim.spawnGroup('wave2');
  run(sim, 2);
  s.enemies.find((e) => e.id === 'a1')!.hp = 0;
  const e2 = sim.step(inp());
  assert.deepEqual(ofType(e2, 'groupCleared').map((c) => c.group), ['wave2']);
  assert.equal(sim.enemiesAlive(), 0);
  assert.equal(sim.aggro(), false);
});

test('stun: a stunned enemy stands still and cannot attack', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin' }], spawns: [rat('r', 5, 8)], seed: 2 });
  const r = s.enemies[0]!;
  r.stat.stun = 200;
  const x0 = r.x;
  run(sim, 150);
  assert.equal(r.x, x0);
  assert.equal(sim.stats().damageTaken, 0);
  assert.equal(sim.view().actors.find((a) => a.kind === 'enemy')?.tint, 'yellow');
  run(sim, 100);
  assert.ok(sim.stats().damageTaken > 0 || r.x !== x0, 'it wakes up after the stun');
});

test('burst meter: +1.5 percent per hit dealt, +4 per hit taken, +6 per kill', () => {
  const a = makeWhite({ party: [{ id: 'mike' }], spawns: [agent('a', 6, 8)], start: { x: tc(5), y: tf(8) }, seed: 7 });
  let burst = 0;
  for (let f = 0; f < 200 && burst === 0; f++) {
    const ev = a.sim.step(inp({ attackHeld: true, mx: 0.3 }));
    if (ofType(ev, 'hit').some((h) => h.onEnemy)) burst = a.sim.view().hud.burst;
  }
  assert.ok(Math.abs(burst - 0.015) < 1e-9, `after one hit ${burst}`);
  const b = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 9, 8)], seed: 14 });
  for (let f = 0; f < 200 && b.sim.view().hud.burst === 0; f++) b.sim.step(inp());
  assert.ok(Math.abs(b.sim.view().hud.burst - 0.04) < 1e-9, `after one hit taken ${b.sim.view().hud.burst}`);
  const c = makeWhite({ spawns: [rat('r1', 20, 12), rat('r2', 21, 12)] });
  c.sim.dev.killAll();
  c.sim.step(inp());
  assert.ok(Math.abs(c.sim.view().hud.burst - 0.12) < 1e-9, `two kills ${c.sim.view().hud.burst}`);
  assert.equal(c.sim.view().hud.burstReady, false);
});

test('party burst: a 90-frame freeze, then every hero sweeps everything within 200 px for about 3x ATK', () => {
  const spawns = [agent('n1', 1, 1), agent('n2', 1, 1), agent('n3', 1, 1), agent('far', 1, 1)];
  const { sim, s } = makeWhite({
    party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }, { id: 'eleven' }], spawns, start: { x: 150, y: 150 }, seed: 5,
  });
  s.enemies.forEach((e) => { e.stat.stun = 99999; });
  const at = [[200, 150], [150, 230], [60, 100], [150 + 260, 150]];
  at.forEach(([x, y], i) => { s.enemies[i]!.x = x!; s.enemies[i]!.y = y!; });
  // Not full yet: pressing does nothing.
  s.burst = 0.99;
  let ev = sim.step(inp({ burstPressed: true }));
  assert.equal(ofType(ev, 'burst').length, 0);
  assert.equal(sim.view().hud.burstReady, false);
  run(sim, 8);
  s.burst = 1;
  assert.equal(sim.view().hud.burstReady, true);
  const x0 = sim.heroPos().x;
  ev = sim.step(inp({ burstPressed: true, mx: 1 }));
  assert.equal(ofType(ev, 'burst').length, 1);
  assert.ok(sfxIds(ev).includes('burst'));
  assert.equal(sim.view().hud.burst, 0, 'resets');
  assert.ok(sim.view().flash > 0.8, 'white flash');
  const all: SimEvent[] = [];
  for (let f = 0; f < 85; f++) {
    all.push(...sim.step(inp({ mx: 1 })));
    assert.equal(sim.heroPos().x, x0, 'the world is frozen');
  }
  assert.equal(ofType(all, 'hit').length, 0, 'nothing lands during the freeze');
  all.push(...run(sim, 80, inp()));
  const hits = ofType(all, 'hit').filter((h) => h.onEnemy);
  assert.ok(hits.length >= 3, `${hits.length} hits`);
  const first = hits[0]!;
  // Mike goes first: 3 x 9 ATK, minus half the agent's DEF, with spread and maybe a crit.
  assert.ok((first.dmg >= 23 && first.dmg <= 28) || (first.dmg >= 46 && first.dmg <= 56), `first sweep ${first.dmg}`);
  assert.equal(ofType(all, 'kill').length, 3, 'the three in range fell');
  assert.equal(s.enemies.find((e) => e.id === 'far')?.hp, 24, 'out of range');
  assert.equal(sim.view().hud.burst, 0);
  // The party moves again afterward.
  run(sim, 10, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > x0);
});

test('shake and flash follow the settings passed in', () => {
  const { sim } = makeWhite({ party: [{ id: 'mike' }], spawns: [agent('a', 6, 8)] });
  let peak = 0;
  for (let f = 0; f < 120; f++) {
    sim.step(inp({ attackHeld: true, mx: 0.3 }));
    const v = sim.view();
    peak = Math.max(peak, Math.abs(v.shake.x) + Math.abs(v.shake.y));
  }
  assert.ok(peak > 0, 'hits shake the screen');
  setShakeScale(0);
  const calm = makeWhite({ party: [{ id: 'mike' }], spawns: [agent('a', 6, 8)] });
  for (let f = 0; f < 120; f++) {
    calm.sim.step(inp({ attackHeld: true, mx: 0.3 }));
    const v = calm.sim.view();
    assert.equal(v.shake.x, 0);
    assert.equal(v.shake.y, 0);
  }
  setShakeScale(1);
  const f1 = makeWhite({ spawns: [] });
  f1.s.burst = 1;
  f1.sim.step(inp({ burstPressed: true }));
  assert.ok(f1.sim.view().flash > 0.8);
  setReduceFlashing(true);
  assert.ok(f1.sim.view().flash <= 0.2);
  setReduceFlashing(false);
});

test('view: actors are y-sorted and include followers and npcs; the HUD lists the party in slot order', () => {
  const { sim } = makeWhite({
    spawns: [{ kind: 'npc', id: 'joyce', tx: 3, ty: 4, dir: 'down' }, rat('r', 20, 3), { kind: 'item', id: 'q', item: 'quarter', tx: 8, ty: 9 }],
  });
  run(sim, 5);
  const v = sim.view();
  const ys = v.actors.map((a) => a.y);
  assert.deepEqual(ys, [...ys].sort((p, q) => p - q));
  assert.equal(v.actors.filter((a) => a.kind === 'hero').length, 3);
  assert.equal(v.actors.filter((a) => a.kind === 'npc').length, 1);
  assert.deepEqual(v.hud.party.map((p) => p.id), ['mike', 'dustin', 'lucas']);
  assert.deepEqual(v.hud.party.map((p) => p.active), [true, false, false]);
  assert.equal(v.hud.party[0]?.xpNext, 18);
  assert.equal(v.hud.boss, null);
  assert.deepEqual(v.focus, sim.heroPos());
  assert.equal(v.items[0]?.kind, 'quarter');
  assert.equal(v.items[0]?.x, tc(8));
});
