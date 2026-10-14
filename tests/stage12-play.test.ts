// Stage 1.2, Hawkins Lab, in the real sim: the gates hold and open, each puzzle answers only its hero, each camera spots a
// hero in front of it and falls to a rocket from its blind spot, the scare, and whole headless runs, chained out of 1.1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty, seedsFrom } from '../src/core/campaign.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { createSim } from '../src/combat/index.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 as S } from '../src/world/stages/stage12.ts';
import { simOptions } from '../src/world/options.ts';
import type { TileRect } from '../src/world/types.ts';
import type { HeroId, SimEvent, SimInput } from '../src/core/types.ts';
import { camSafeShot, idle, playStage, rectTiles, runUntil, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, props } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const CAMS = props.filter((p) => p.prop === 'camera');
const LUCAS_REACH = HERO_DEFS.lucas.basic.reach;
/** The sealed chamber behind the observation glass. */
const CHAMBER = rectTiles({ tx: 17, ty: 14, w: 13, h: 2 });
const when = (id: string): unknown => S.beats.find((b) => b.id === id)!.when;

// ---------------------------------------------------------------- the gates, puzzles and cameras, in the real sim
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
/** One hero on the stage with its props and no hazards, so the floor never interrupts what a test is looking at. */
const solo = (id: HeroId, tx: number, ty: number) =>
  createSim({ ...simOptions(S, grid, { party: [{ id, level: 3 }], start: { x: tx * 16 + 8, y: ty * 16 + 12 } }), spawns: propsOnly, hazards: [] });
/** Walk toward (mx, my) for 20 frames to face that way, then ease off and press `key` once. */
const facing = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  (f < 20 ? { ...idle, mx, my } : f === 20 ? { ...idle, mx: mx * 0.2, my: my * 0.2, ...key } : idle);
const hit = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};

test('gates: closed, door1, door2 and crate1 stop a hero in the sim, and open they let one through', () => {
  const d1 = prop('door1'), d2 = prop('door2'), crate = prop('crate1');
  const north = solo('mike', d1.tx, d1.ty + 1);
  assert.ok(walk(north, 150, 0, -1).y >= d1.ty * 16 + 24, 'door1 holds');
  north.openProp('door1');
  assert.ok(walk(north, 150, 0, -1).y < d1.ty * 16, 'door1 open, the animal lab is next');
  const passage = solo('mike', d2.tx, d2.ty + 2);
  assert.ok(walk(passage, 150, 0, -1).y >= d2.ty * 16 + 24, 'door2 holds');
  passage.openProp('door2');
  assert.ok(walk(passage, 150, 0, -1).y < d2.ty * 16, 'door2 open, the storage hall is next');
  for (const row of [5, 6, 7]) assert.ok(walk(solo('mike', 27, row), 100, 1, 0).x <= crate.tx * 16 - 5 + 0.01, `crate1 holds row ${row}`);
  const lane = solo('mike', 27, 6);
  lane.openProp('crate1');
  assert.ok(walk(lane, 100, 1, 0).x > (crate.tx + 2) * 16, 'open, the crate corridor leads on to the wing');
  assert.ok(walk(solo('mike', 23, 18), 150, 0, -1).y >= 16 * 16 + 24, 'the glass holds a hero out of the chamber');
});

test('puzzles: only Dustin lights sensor1, and only from close up', () => {
  const s = prop('sensor1');
  const burn = (id: HeroId, tx: number, ty: number, key: Partial<SimInput> = { specialPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 90, facing(0, -1, key), (e) => hit(e, 'targetHit', 'sensor1')) !== null;
  for (const [dx, dy] of [[0, 1], [0, 2], [0, 3], [-1, 3], [1, 3]]) assert.ok(burn('dustin', s.tx + dx!, s.ty + dy!), `Farrah spray from ${dx},${dy} below lights it`);
  assert.ok(!burn('dustin', s.tx, s.ty + 6), 'six tiles back it falls short');
  assert.ok(!burn('dustin', s.tx, s.ty + 1, { attackPressed: true }), 'the candy lure does not light it');
  for (const id of ['mike', 'lucas', 'eleven'] as HeroId[]) {
    assert.ok(!burn(id, s.tx, s.ty + 1), `${id}'s special does not light it`);
    assert.ok(!burn(id, s.tx, s.ty + 1, { attackPressed: true }), `${id}'s basic does not light it`);
  }
});

test('puzzles: Lucas hits relay1 through the glass from the corridor, and nobody else can', () => {
  const r = prop('relay1');
  const shoot = (id: HeroId, tx: number, ty: number, mx: number, my: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 120, facing(mx, my, key), (e) => hit(e, 'targetHit', 'relay1')) !== null;
  for (const ty of [17, 18, 19, 20, 21]) assert.ok(shoot('lucas', r.tx, ty, 0, -1), `a rocket north from ${r.tx},${ty} lights the relay`);
  assert.ok(shoot('lucas', r.tx + 4, 17, -1, -1), 'a clean diagonal from the east does too');
  assert.ok(shoot('lucas', r.tx - 4, 17, 1, -1), 'and the other diagonal from the west');
  assert.ok(!shoot('lucas', r.tx + 1, 18, 0, -1) && !shoot('lucas', r.tx - 1, 18, 0, -1), 'a column to either side misses');
  for (const id of ['mike', 'dustin', 'eleven'] as HeroId[]) {
    assert.ok(!shoot(id, r.tx, 18, 0, -1), `${id}'s basic does not light the relay`);
    assert.ok(!shoot(id, r.tx, 18, 0, -1, { specialPressed: true }), `${id}'s special does not light the relay`);
  }
  const s = prop('sensor1');
  const rock = runUntil(solo('lucas', s.tx, s.ty + 1), 120, facing(0, -1, { attackPressed: true }), (e) => hit(e, 'targetHit', 'sensor1'));
  assert.equal(rock, null, 'a rocket does not light the sensor: it wants fire');
});

test('puzzles: Eleven shoves crate1 aside from the west, and nobody else can', () => {
  const push = (id: HeroId, tx: number, ty: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 90, facing(1, 0, key), (e) => hit(e, 'propCleared', 'crate1')) !== null;
  for (const ty of [5, 6, 7]) assert.ok(push('eleven', 27, ty), `Push clears the crate from 27,${ty}`);
  assert.ok(!push('eleven', 22, 6), 'five tiles back the shove falls short');
  assert.ok(!push('eleven', 27, 6, { specialPressed: true }), 'her beam does not move it');
  for (const id of ['mike', 'dustin', 'lucas'] as HeroId[]) {
    assert.ok(!push(id, 27, 6), `${id}'s basic does not move it`);
    assert.ok(!push(id, 27, 6, { specialPressed: true }), `${id}'s special does not move it`);
  }
});

test('cameras: each one spots a hero who walks under it, and Lucas shoots it out from its blind spot without being seen', () => {
  for (const c of CAMS) {
    const seen = runUntil(solo('mike', c.tx, c.ty + 2 * (c.cam!.from < 180 ? 1 : -1)), c.cam!.period, () => idle, (e) => e.t === 'spotted' && e.propId === c.id);
    assert.ok(seen, `${c.id} sees a hero standing two tiles out in front of it`);
    const spot = camSafeShot(kit, c, LUCAS_REACH, new Set(['door1']));
    assert.ok(spot, `${c.id} has a blind spot`);
    const sim = solo('lucas', spot.tx, spot.ty);
    let spotted = false;
    const shot = runUntil(sim, 120, (f) => (f < 12 ? { ...idle, mx: spot.dx * 0.2, my: spot.dy * 0.2 } : f === 12 ? { ...idle, mx: spot.dx * 0.2, my: spot.dy * 0.2, attackPressed: true } : idle),
      (e) => { if (e.t === 'spotted') spotted = true; return hit(e, 'targetHit', c.id); });
    assert.ok(shot, `a rocket from ${spot.tx},${spot.ty} knocks out ${c.id}`);
    assert.ok(!spotted, `${c.id} never saw Lucas at ${spot.tx},${spot.ty}`);
    assert.equal(sim.view().props.find((p) => p.id === c.id)?.cam?.live, false, `${c.id} is off for good`);
  }
});

test('scare: the shape crosses behind the observation glass, in view of the trigger', () => {
  const { from, to, frames } = S.scare;
  assert.ok(frames >= 60 && frames <= 120);
  for (const p of [from, to]) {
    const [tx, ty] = tileOf(p.x, p.y);
    assert.ok(CHAMBER.some(([x, y]) => x === tx && y === ty), `${p.x},${p.y} is inside the chamber behind the glass`);
  }
  assert.ok(from.x > to.x, 'it walks west, the way the party does');
  const trigger = (when('scare') as { rect: TileRect }).rect;
  const centre = (trigger.tx + trigger.w / 2) * 16;
  assert.ok(Math.abs(from.x - centre) < 128 && Math.abs(to.x - centre) < 256, 'the party sees it start and most of the crossing');
});

// ---------------------------------------------------------------- whole runs
const ROUTE_SCRIPTS = ['l2_start', 'l2_agents', 'l2_burn_hint', 'l2_cages', 'l2_scare', 'l2_shoot_hint', 'l2_crate_cleared', 'l2_lockdown_start', 'l2_warden', 'l2_lockdown_clear', 'l2_clear'];

test('chained run: out of stage 1.1 with the carried party, the bot clears the hard Lab most of the time and it costs real damage', () => {
  let clears = 0, damage = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const first = playStage(STAGE_11, seed, [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }]);
    assert.ok(first.done && !first.allDown, `seed ${seed}: stage 1.1 clears`);
    const seeds = seedsFrom(first.party);
    assert.deepEqual(seeds.map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
    const r = playStage(S, seed, seeds);
    damage += r.damage;
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    // The Lab is worth enough XP that the party levels well past Lv 3 (the bot swaps leaders, so the XP spreads: the
    // best hero ends at Lv 4 or 5 and the weakest at Lv 3 or more), and nobody gets near Lv 6 (659 XP in all).
    assert.ok(Math.max(...r.levels) >= 4, `seed ${seed}: somebody reaches Lv 4, got ${r.levels.join(',')}`);
    assert.ok(Math.min(...r.levels) >= 3, `seed ${seed}: nobody is left behind, got ${r.levels.join(',')}`);
    assert.ok(Math.max(...r.levels) < 6, `seed ${seed}: nobody reaches Lv 6, got ${r.levels.join(',')}`);
    assert.ok(r.xp >= 330 && r.xp <= 390, `seed ${seed}: xp ${r.xp}`);
    // A camera sighting can happen anywhere, and a fight near a console can light it by accident (Dustin's flame, Lucas's
    // shot), which plays that puzzle's "done" script early. Neither belongs to the route's order.
    const incidental = new Set(['l2_spotted', 'l2_burn_done', 'l2_relay_done']);
    assert.deepEqual(r.said.filter((id) => !incidental.has(id)), ROUTE_SCRIPTS, `seed ${seed}: the scripts play in route order`);
    assert.ok(r.steps.includes('alarm'), 'the klaxon sounds');
  }
  assert.ok(clears >= 14, `cleared ${clears} of 20`);
  assert.ok(damage / 20 >= 150, `the Lab cost ${(damage / 20).toFixed(0)} HP on average (it cost 13 before the second pass)`);
});

test('a jump straight to stage 1.2 starts all four at Lv 3, and the bot still clears it', () => {
  let clears = 0;
  for (const seed of [1, 2, 3, 4]) {
    const r = playStage(S, seed, defaultParty('1.2'));
    if (r.done) clears++;
    assert.ok(Math.max(...r.levels) <= 6, `levels ${r.levels.join(',')}`);
  }
  assert.ok(clears >= 3, `cleared ${clears} of 4`);
});

test('a bot that never dodges still gets through the Lab, but it is hurt badly doing it', () => {
  // The default bot sidesteps darts, slams and bashes almost perfectly, which flatters the stage. This one does not dodge
  // and does not circle a shielded guard: a floor for how a player who is not watching the telegraphs fares.
  let clears = 0, damage = 0, kos = 0, lowest = 0;
  const seeds = 10;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = playStage(S, seed, defaultParty('1.2'), 30000, 'chief', true);
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (r.done) clears++;
    damage += r.damage;
    kos += r.kos;
    lowest += r.lowestHp;
  }
  assert.ok(clears >= 8, `cleared ${clears} of ${seeds}`);
  assert.ok(damage / seeds >= 180, `it cost ${(damage / seeds).toFixed(0)} HP on average (before: 13)`);
  assert.ok(kos / seeds >= 0.2, `${(kos / seeds).toFixed(2)} heroes went down on average`);
  assert.ok(lowest / seeds < 0.5, `the party fell to ${(100 * lowest / seeds).toFixed(0)} percent health on average`);
});
