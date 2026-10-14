// Stage 1.2, Hawkins Lab: the map, the budget, the three gates in route order, the beats, the bot's route, the three
// puzzles in the real sim, and a chained headless run that carries the party out of stage 1.1. Pure TS, no canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import { defaultParty, seedsFrom } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { createSim } from '../src/combat/index.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 as S, ROWS, WAVES } from '../src/world/stages/stage12.ts';
import { simOptions } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import type { HeroId, SimEvent, SimInput } from '../src/core/types.ts';
import { fakeEnv, idle, playStage, rectTiles, runUntil, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = stageKit(S);
const ALL = new Set(['door1', 'door2', 'crate1']);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const tileChar = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
/** The chamber behind the observation glass: x 17 to 29, y 13 and 14. Sealed, so nothing walks in. */
const CHAMBER = rectTiles({ tx: 17, ty: 13, w: 13, h: 2 });

// ---------------------------------------------------------------- the map
test('stage 1.2: the map is 48 by 40, uses only legend characters, and the edge ring is solid', () => {
  assert.equal(S.rows.length, 40);
  assert.equal(S.rows, ROWS);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const ch of row) assert.ok(TILES[ch], `unknown tile '${ch}' in row ${y}`);
  }
  assert.equal(grid.w, 48);
  assert.equal(grid.h, 40);
  for (let x = 0; x < 48; x++) assert.ok(grid.solid[idx(x, 0)] && grid.solid[idx(x, 39)], 'top and bottom edges are solid');
  for (let y = 0; y < 40; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(47, y)], 'left and right edges are solid');
  assert.deepEqual([S.id, S.name, S.time, S.music], ['1.2', 'Hawkins Lab', 'day', 'lab']);
  assert.deepEqual(S.lights, [], 'a day stage has no light pools');
  const used = new Set(S.rows.join(''));
  for (const ch of 'oOzWVviGc') assert.ok(used.has(ch), `the map uses the lab tile '${ch}'`);
  for (const ch of 'g=_XlT') assert.ok(used.has(ch), `the dock uses the outdoor tile '${ch}'`);
  for (const ch of S.rows.slice(0, 30).map((r) => r.slice(14)).join('')) assert.ok(!'g=_Xl'.includes(ch), 'the inside of the lab has no outdoor tiles');
});

test('stage 1.2: the start and every spawn tile are walkable, the start is quiet and outdoors', () => {
  assert.equal(grid.solid[idx(startTx, startTy)], 0, 'start tile');
  assert.ok('g=_'.includes(tileChar(startTx, startTy)), 'the level begins outside, on the dock');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(grid.solid[idx(s.tx, s.ty)], 0, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) {
    const d = Math.hypot(e.tx - startTx, e.ty - startTy);
    assert.ok(d > 8, `${e.id} is ${d.toFixed(1)} tiles from the start`);
  }
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(npcs.length, 0, 'there are no npcs, and Eleven is already in the party');
});

test('stage 1.2: props sit where the art expects them, and the doors and crate fill their gaps', () => {
  for (const p of props) {
    if (p.prop === 'console') {
      assert.equal(tileChar(p.tx, p.ty), 'W', `${p.id} is set into a wall face`);
      assert.equal(grid.solid[idx(p.tx, p.ty + 1)], 0, `${p.id} has floor in front of it`);
    } else {
      assert.equal(grid.solid[idx(p.tx, p.ty)], 0, `prop ${p.id} sits on open ground`);
    }
  }
  const width = (p: Prop): number => Math.ceil((p.w ?? 16) / 16), height = (p: Prop): number => Math.ceil((p.h ?? 16) / 16);
  for (const id of ['door1', 'door2']) {
    const p = prop(id);
    assert.equal(p.prop, 'door');
    assert.equal(p.w, 32);
    assert.equal(p.h, 16);
    for (let x = p.tx; x < p.tx + width(p); x++) assert.equal(grid.solid[idx(x, p.ty)], 0, `${id} stands on floor`);
    assert.ok(grid.solid[idx(p.tx - 1, p.ty)] && grid.solid[idx(p.tx + width(p), p.ty)], `${id} fills a doorway two tiles wide`);
  }
  const crate = prop('crate1');
  assert.deepEqual([crate.prop, crate.pushBy, crate.w, crate.h], ['crate', 'push', 16, 48]);
  for (let y = crate.ty; y < crate.ty + height(crate); y++) assert.equal(grid.solid[idx(crate.tx, y)], 0, 'the crate stands in the corridor');
  assert.ok(grid.solid[idx(crate.tx, crate.ty - 1)] && grid.solid[idx(crate.tx, crate.ty + height(crate))], 'the crate fills the corridor wall to wall');
  assert.deepEqual([prop('sensor1').hitBy, prop('relay1').hitBy], ['burn', 'shoot']);
});

test('stage 1.2: the spawn budget matches docs/level-2.md', () => {
  const count = (g: string): number => enemies.filter((e) => e.group === g).length;
  assert.equal(enemies.filter((e) => e.type === 'agent').length, 10);
  assert.equal(enemies.filter((e) => e.type === 'rat').length, 11);
  assert.deepEqual(['agents1', 'rats1', 'agents2', 'rats2', 'lock1', 'lock2', 'lock3'].map(count), [2, 6, 2, 2, 2, 4, 3]);
  const kinds = (g: string, t: string): number => enemies.filter((e) => e.group === g && e.type === t).length;
  assert.deepEqual([kinds('lock2', 'rat'), kinds('lock2', 'agent'), kinds('rats1', 'rat'), kinds('lock3', 'agent')], [3, 1, 6, 3]);
  for (const g of ['rats1', 'lock1', 'lock2', 'lock3']) assert.ok(enemies.filter((e) => e.group === g).every((e) => e.dormant), `${g} is dormant`);
  for (const g of ['agents1', 'agents2']) assert.ok(enemies.filter((e) => e.group === g).every((e) => !e.dormant && (e.patrol?.length ?? 0) >= 2), `${g} patrols`);
  assert.ok(enemies.filter((e) => e.group === 'rats2').every((e) => !e.dormant), 'rats2 is awake from the start');
  const kind = (k: string): number => items.filter((i) => i.item === k).length;
  assert.deepEqual([kind('eggo'), kind('coke'), kind('quarter')], [3, 2, 12]);
  assert.deepEqual(props.map((p) => p.id).sort(), ['crate1', 'door1', 'door2', 'lights_dock', 'lights_hall', 'relay1', 'sensor1']);
  assert.deepEqual(WAVES, ['lock1', 'lock2', 'lock3']);
  assert.deepEqual(S.waves, WAVES);
});

test('stage 1.2: the stage is worth between 110 and 130 XP', () => {
  const xp = enemies.reduce((sum, e) => sum + ENEMY_DEFS[e.type].xp, 0);
  assert.equal(xp, 124);
  assert.ok(xp >= 110 && xp <= 130);
});

// ---------------------------------------------------------------- reachability
test('stage 1.2: door1, door2 and crate1 each cut the route, in that order', () => {
  const hall = [38, 24], cages = [38, 16], gallery = [21, 16], passage = [15, 14], storage = [20, 8], cold = [4, 5], wing = [38, 6];
  const reach = (open: string[], p: number[]): number => at(flood(new Set(open)), p[0] as number, p[1] as number);
  // Closed: the dock, corridor A, the closet and the power room, and nothing past door1.
  const shut = flood(new Set());
  assert.ok(shut[idx(startTx, startTy)]);
  for (const [x, y] of [[20, 34], [26, 28], [34, 31], [38, 30], [44, 36]]) assert.equal(at(shut, x as number, y as number), 1, `${x},${y} is open at the start`);
  for (const p of [hall, cages, gallery, passage, storage, cold, wing]) assert.equal(reach([], p), 0, `${p} is cut off while everything is shut`);
  // Only door1 matters at first. door2 and the crate do nothing for someone still in the power room.
  assert.equal(reach(['door2'], hall), 0);
  assert.equal(reach(['crate1'], hall), 0);
  assert.equal(reach(['door2', 'crate1'], hall), 0);
  // door1 opens the hall, the cage room, the corridor and the passage. Not the north band.
  for (const p of [hall, cages, gallery, passage]) assert.equal(reach(['door1'], p), 1, `${p} after door1`);
  for (const p of [storage, cold, wing]) assert.equal(reach(['door1'], p), 0, `${p} is still past door2`);
  assert.equal(reach(['door1', 'crate1'], storage), 0, 'the crate comes after door2, not instead of it');
  // door2 opens the storage hall and the cold room, but the crate still holds the wing.
  for (const p of [storage, cold]) assert.equal(reach(['door1', 'door2'], p), 1, `${p} after door2`);
  assert.equal(reach(['door1', 'door2'], wing), 0, 'the crate corridor is still shut');
  assert.equal(reach(['door2', 'crate1'], wing), 0, 'door1 is needed too');
  assert.equal(reach(['door1', 'door2', 'crate1'], wing), 1, 'open, the route runs through to the records wing');
});

test('stage 1.2: with every gate open nothing is boxed in, and only the glass chamber stays sealed', () => {
  const open = flood(ALL);
  const sealed = new Set(CHAMBER.map(([x, y]) => idx(x, y)));
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (grid.solid[idx(x, y)]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !grid.solid[idx(x + dx!, y + dy!)]).length;
    assert.ok(n > 0, `walkable tile ${x},${y} is boxed in`);
    if (sealed.has(idx(x, y))) assert.equal(open[idx(x, y)], 0, `chamber tile ${x},${y} must not be reachable`);
    else assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const [x, y] of CHAMBER) assert.equal(grid.solid[idx(x, y)], 0, 'the chamber has a floor behind the glass');
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty}`);
  assert.ok(![...enemies, ...items].some((s) => sealed.has(idx(s.tx, s.ty))), 'nothing is spawned in the sealed chamber');
  // The glass row is the only thing between the corridor and the chamber, and it is solid.
  for (let x = 17; x <= 29; x++) assert.equal(tileChar(x, 15), 'G', `glass at ${x},15`);
  for (const p of props.filter((q) => q.prop === 'lights')) {
    const near = rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: Math.ceil((p.w ?? 16) / 16) + 2, h: Math.ceil((p.h ?? 16) / 16) + 2 })
      .some(([x, y]) => open[idx(x, y)] === 1 && grid.solid[idx(x, y)] === 0);
    assert.ok(near, `${p.id} has open ground next to it`);
  }
});

test('stage 1.2: the checkpoints are the two lights, the second just past door2', () => {
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_dock', 'lights_hall']);
  const door2 = prop('door2');
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    assert.equal(at(flood(ALL), x, y), 1, `checkpoint ${c.prop} is walkable`);
    assert.ok(props.some((p) => p.id === c.prop && p.prop === 'lights'));
  }
  const [dx, dy] = tileOf(S.checkpoints[0]!.x, S.checkpoints[0]!.y);
  assert.equal(at(flood(new Set()), dx, dy), 1, 'lights_dock is reachable at the start');
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 6, 'lights_dock is at the start');
  const [hx, hy] = tileOf(S.checkpoints[1]!.x, S.checkpoints[1]!.y);
  assert.equal(at(flood(new Set(['door1'])), hx, hy), 0, 'lights_hall is behind door2');
  assert.equal(at(flood(new Set(['door1', 'door2'])), hx, hy), 1);
  assert.ok(hy < door2.ty && Math.hypot(hx - door2.tx, hy - door2.ty) < 8, 'lights_hall is just past door2');
});

test('stage 1.2: the bot waypoints are reachable in order and flag the gates and the waves', () => {
  const open = new Set<string>();
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y}`);
    if (w.open) open.add(w.open);
  });
  assert.deepEqual(S.waypoints.flatMap((w) => (w.open ? [w.open] : [])), ['door1', 'door2', 'crate1'], 'the bot opens the gates in route order');
  assert.deepEqual(S.waypoints.flatMap((w) => (w.wake ? [w.wake] : [])), ['rats1', 'lock1']);
  const last = S.waypoints.at(-1)!;
  const lock = S.beats.find((b) => b.id === 'lockdown')!.when as { rect: TileRect };
  const [lx, ly] = tileOf(last.x, last.y);
  assert.ok(rectTiles(lock.rect).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the lockdown trigger');
});

// ---------------------------------------------------------------- beats
const BEAT_IDS = ['start', 'agents1', 'burn_hint', 'door1_open', 'cages', 'agents2', 'scare', 'relay_hint', 'door2_open', 'crate_hint', 'crate_cleared', 'rats2', 'lockdown', 'level_clear'];
const SCRIPT_IDS = ['l2_start', 'l2_agents', 'l2_burn_hint', 'l2_burn_done', 'l2_cages', 'l2_scare', 'l2_shoot_hint', 'l2_relay_done', 'l2_push_hint', 'l2_crate_cleared', 'l2_lockdown_start', 'l2_lockdown_clear', 'l2_clear'];

test('stage 1.2: every beat has a trigger, a real script id, and something to fire it', () => {
  const ids = S.beats.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, 'beat ids are unique');
  assert.deepEqual([...ids].sort(), [...BEAT_IDS].sort());
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(ALL);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(w.rect.tx >= 0 && w.rect.ty >= 0 && w.rect.tx + w.rect.w <= 48 && w.rect.ty + w.rect.h <= 40, `${b.id} rect in the map`);
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.includes(w.needs), `${b.id} needs ${w.needs}`);
    } else if ('cleared' in w) {
      assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    } else if ('after' in w) {
      assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    } else {
      assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
    }
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  for (const id of SCRIPT_IDS) assert.ok(said.has(id), `${id} is played by some beat`);
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)!.steps;
  const when = (id: string): unknown => S.beats.find((b) => b.id === id)!.when;
  assert.deepEqual(steps('agents2'), []);
  assert.deepEqual(steps('rats2'), []);
  assert.deepEqual(steps('door1_open'), [{ t: 'open', prop: 'door1' }, { t: 'say', script: 'l2_burn_done' }]);
  assert.deepEqual(steps('door2_open'), [{ t: 'open', prop: 'door2' }, { t: 'say', script: 'l2_relay_done' }]);
  assert.deepEqual(steps('cages'), [{ t: 'say', script: 'l2_cages' }, { t: 'wake', group: 'rats1' }]);
  assert.deepEqual(steps('scare'), [{ t: 'scare' }, { t: 'say', script: 'l2_scare' }]);
  assert.deepEqual(steps('lockdown'), [{ t: 'alarm' }, { t: 'say', script: 'l2_lockdown_start' }, { t: 'waves' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l2_lockdown_clear' }, { t: 'say', script: 'l2_clear' }, { t: 'finish' }]);
  assert.deepEqual(when('door1_open'), { event: 'targetHit', prop: 'sensor1' });
  assert.deepEqual(when('door2_open'), { event: 'targetHit', prop: 'relay1' });
  assert.deepEqual(when('crate_cleared'), { event: 'propCleared', prop: 'crate1' });
  assert.deepEqual(when('relay_hint'), { after: 'scare' });
  assert.deepEqual(when('level_clear'), { cleared: 'lock3' });
  assert.equal((when('crate_hint') as { needs?: string }).needs, 'door2_open');
  // Each rect beat sits on the right side of the gates.
  const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  const behind: [string, string[], string[]][] = [
    ['start', [], []], ['agents1', [], []], ['burn_hint', [], []],
    ['agents2', ['door1'], []], ['cages', ['door1'], []], ['scare', ['door1'], []],
    ['rats2', ['door1', 'door2'], ['door1']], ['crate_hint', ['door1', 'door2'], ['door1']], ['lockdown', ['door1', 'door2', 'crate1'], ['door1', 'door2']],
  ];
  for (const [id, needed, fewer] of behind) {
    assert.ok(through(needed, id), `${id} is reachable once ${needed.join(', ') || 'nothing'} is open`);
    if (id !== 'start' && id !== 'agents1' && id !== 'burn_hint') assert.ok(!through(fewer, id), `${id} is not reachable with only ${fewer.join(', ') || 'nothing'} open`);
  }
});

// ---------------------------------------------------------------- the director
test('director: the beats run in route order, the gates open on their events, and the waves chain to the finish', () => {
  const { env, log } = fakeEnv({ rats1: 6, lock1: 2, lock2: 4, lock3: 3 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l2_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => d.tick(14, 34)), ['say l2_agents']);
  assert.deepEqual(run(() => d.tick(33, 33)), ['say l2_burn_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'sensor1' }])), ['open door1', 'say l2_burn_done']);
  assert.deepEqual(run(() => d.tick(38, 25)), [], 'agents2 is silent');
  assert.deepEqual(run(() => d.tick(38, 21)), ['say l2_cages', 'wake rats1']);
  assert.deepEqual(run(() => d.tick(28, 17)), ['scare', 'say l2_scare', 'say l2_shoot_hint'], 'the shoot hint follows the scare');
  assert.deepEqual(run(() => d.tick(25, 6)), [], 'the push hint waits until door2 is open');
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'relay1' }])), ['open door2', 'say l2_relay_done']);
  assert.deepEqual(run(() => d.tick(20, 7)), [], 'rats2 is silent');
  assert.deepEqual(run(() => d.tick(25, 6)), ['say l2_push_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crate1' }])), ['say l2_crate_cleared']);
  assert.deepEqual(run(() => d.tick(38, 6)), ['alarm', 'say l2_lockdown_start', 'wake lock1']);
  assert.deepEqual(run(() => {
    d.events([{ t: 'groupCleared', group: 'lock1' }]);
    d.events([{ t: 'groupCleared', group: 'lock2' }]);
    assert.ok(!d.finished());
    d.events([{ t: 'groupCleared', group: 'lock3' }]);
  }), ['wake lock2', 'wake lock3', 'say l2_lockdown_clear', 'say l2_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from the second light skips the dead and still reaches the crate hint and the finish', () => {
  const { env, log } = fakeEnv({ rats1: 0, lock1: 0, lock2: 4, lock3: 3 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const d = createDirector(S.beats, S.waves, env);
  d.restore({ fired: ['start', 'agents1', 'burn_hint', 'door1_open', 'cages', 'scare', 'relay_hint', 'door2_open'], cleared: ['rats1'] });
  d.tick(28, 17);
  assert.deepEqual(log, [], 'the scare does not play twice');
  d.tick(25, 6);
  assert.deepEqual(log, ['say l2_push_hint'], 'the push hint does, because door2_open had finished');
  log.length = 0;
  d.tick(38, 6);
  assert.deepEqual(log, ['alarm', 'say l2_lockdown_start', 'wake lock2'], 'a wave with nobody left counts as cleared');
});

// ---------------------------------------------------------------- the gates and the puzzles, in the real sim
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
const solo = (id: HeroId, tx: number, ty: number) => createSim({ ...simOptions(S, grid, { party: [{ id }], start: { x: tx * 16 + 8, y: ty * 16 + 12 } }), spawns: propsOnly });
/** Walk toward (mx, my) for 20 frames to face that way, then ease off and press `key` once. */
const facing = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  (f < 20 ? { ...idle, mx, my } : f === 20 ? { ...idle, mx: mx * 0.2, my: my * 0.2, ...key } : idle);
const hit = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};

test('gates: closed, door1, door2 and crate1 stop a hero in the sim, and open they let one through', () => {
  const north = solo('mike', 38, 31);
  assert.ok(walk(north, 150, 0, -1).y >= 29 * 16 + 16 + 8, 'door1 holds');
  north.openProp('door1');
  assert.ok(walk(north, 150, 0, -1).y < 29 * 16, 'door1 open, the hall is next');
  const passage = solo('mike', 15, 14);
  assert.ok(walk(passage, 150, 0, -1).y >= 12 * 16 + 16 + 8, 'door2 holds');
  passage.openProp('door2');
  assert.ok(walk(passage, 150, 0, -1).y < 12 * 16, 'door2 open, the storage hall is next');
  for (const row of [5, 6, 7]) {
    const sim = solo('mike', 27, row);
    assert.ok(walk(sim, 100, 1, 0).x <= 28 * 16 - 5 + 0.01, `crate1 holds row ${row}`);
  }
  const lane = solo('mike', 27, 6);
  walk(lane, 30, 1, 0);
  lane.openProp('crate1');
  assert.ok(walk(lane, 100, 1, 0).x > 30 * 16, 'open, the crate corridor leads into the wing');
  assert.ok(walk(solo('mike', 23, 16), 150, 0, -1).y >= 15 * 16 + 16 + 8, 'the glass holds a hero out of the chamber');
});

test('puzzles: only Dustin lights sensor1, and only from close up', () => {
  const burn = (id: HeroId, tx: number, ty: number, key: Partial<SimInput> = { specialPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 90, facing(0, -1, key), (e) => hit(e, 'targetHit', 'sensor1')) !== null;
  // The cone is 32 degrees either side, so a hero flush against the wall has to stand in the console's column.
  for (const [tx, ty] of [[34, 30], [34, 31], [34, 32], [33, 32], [35, 32]]) assert.ok(burn('dustin', tx!, ty!), `Farrah spray from ${tx},${ty} lights the sensor`);
  assert.ok(!burn('dustin', 34, 36), 'five tiles back it falls short');
  assert.ok(!burn('dustin', 34, 31, { attackPressed: true }), 'the candy lure does not light it');
  for (const id of ['mike', 'lucas', 'eleven'] as HeroId[]) {
    assert.ok(!burn(id, 34, 31), `${id}'s special does not light it`);
    assert.ok(!burn(id, 34, 31, { attackPressed: true }), `${id}'s basic does not light it`);
  }
});

test('puzzles: Lucas hits relay1 through the glass from the corridor, and nobody else can', () => {
  const shoot = (id: HeroId, tx: number, ty: number, mx: number, my: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 120, facing(mx, my, key), (e) => hit(e, 'targetHit', 'relay1')) !== null;
  for (const ty of [16, 17, 18, 19]) assert.ok(shoot('lucas', 23, ty, 0, -1), `a rocket north from 23,${ty} lights the relay`);
  assert.ok(shoot('lucas', 27, 16, -1, -1), 'a clean diagonal from 27,16 does too');
  assert.ok(shoot('lucas', 19, 16, 1, -1), 'and the other diagonal from 19,16');
  assert.ok(!shoot('lucas', 24, 18, 0, -1), 'a column to the side misses');
  assert.ok(!shoot('lucas', 21, 18, 0, -1), 'on the other side too');
  for (const id of ['mike', 'dustin', 'eleven'] as HeroId[]) {
    assert.ok(!shoot(id, 23, 18, 0, -1), `${id}'s basic does not light the relay`);
    assert.ok(!shoot(id, 23, 18, 0, -1, { specialPressed: true }), `${id}'s special does not light the relay`);
  }
  // A shot is a shot: the sensor wants fire, not a rock.
  const rock = runUntil(solo('lucas', 34, 31), 120, facing(0, -1, { attackPressed: true }), (e) => hit(e, 'targetHit', 'sensor1'));
  assert.equal(rock, null, 'a rocket does not light the sensor');
});

test('puzzles: Eleven shoves crate1 aside from the west, and nobody else can', () => {
  const push = (id: HeroId, tx: number, ty: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, tx, ty), 90, facing(1, 0, key), (e) => hit(e, 'propCleared', 'crate1')) !== null;
  for (const ty of [5, 6, 7]) assert.ok(push('eleven', 27, ty), `Push clears the crate from 27,${ty}`);
  assert.ok(!push('eleven', 22, 6), 'six tiles back the shove falls short');
  assert.ok(!push('eleven', 27, 6, { specialPressed: true }), 'her beam does not move it');
  for (const id of ['mike', 'dustin', 'lucas'] as HeroId[]) {
    assert.ok(!push(id, 27, 6), `${id}'s basic does not move it`);
    assert.ok(!push(id, 27, 6, { specialPressed: true }), `${id}'s special does not move it`);
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
  const trigger = (S.beats.find((b) => b.id === 'scare')!.when as { rect: TileRect }).rect;
  const centre = (trigger.tx + trigger.w / 2) * 16;
  assert.ok(Math.abs(from.x - centre) < 128 && Math.abs(to.x - centre) < 256, 'the party sees it start and most of the crossing');
});

// ---------------------------------------------------------------- a whole run, chained from stage 1.1
test('chained run: the party leaves stage 1.1, the bot clears the lab on four seeds, the lead ends at Lv 4 and nobody at Lv 5', () => {
  for (const seed of [1, 2, 3, 4]) {
    const first = playStage(STAGE_11, seed, [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }]);
    assert.ok(first.done && !first.allDown, `seed ${seed}: stage 1.1 clears`);
    const seeds = seedsFrom(first.party);
    assert.deepEqual(seeds.map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
    const r = playStage(S, seed, seeds);
    assert.ok(r.done, `seed ${seed} did not reach the level clear (${r.frames} frames, levels ${r.levels.join(',')})`);
    assert.ok(!r.allDown, `seed ${seed} was wiped`);
    assert.ok(r.frames < 20000, `seed ${seed} took ${r.frames} frames`);
    assert.equal(r.levels[0], 4, `the lead ends at Lv 4, got ${r.levels.join(',')}`);
    assert.ok(Math.max(...r.levels) < 5, `nobody reaches Lv 5: ${r.levels.join(',')}`);
    assert.ok(r.xp >= 110 && r.xp <= 130, `xp ${r.xp}`);
    assert.equal(r.party.length, 4);
    const order = ['l2_start', 'l2_agents', 'l2_burn_hint', 'l2_cages', 'l2_scare', 'l2_shoot_hint', 'l2_crate_cleared', 'l2_lockdown_start', 'l2_lockdown_clear', 'l2_clear'];
    assert.deepEqual(r.said, order, `seed ${seed}: the scripts play in route order`);
    assert.deepEqual(r.steps, ['alarm'], 'the klaxon sounds once');
  }
});

test('a jump straight to stage 1.2 starts all four at Lv 3 and the bot still clears it', () => {
  for (const seed of [1, 2]) {
    const r = playStage(S, seed, defaultParty('1.2'));
    assert.ok(r.done && !r.allDown, `seed ${seed}: ${r.frames} frames, levels ${r.levels.join(',')}`);
    assert.ok(Math.max(...r.levels) <= 4, `levels ${r.levels.join(',')}`);
  }
});
