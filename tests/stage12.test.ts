// Stage 1.2, Hawkins Lab, as data: the map and its rooms, the budget, the three gates in route order, hazards and cameras,
// the beats, the bot's route and the director. The real sim and whole runs are in stage12-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import { ENEMY_DEFS, ELITE } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { HAZARD_WARN, hazardAt } from '../src/combat/hazards.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { STAGE_12 as S, ROWS, WAVES } from '../src/world/stages/stage12.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import type { HazardDef, SimEvent } from '../src/core/types.ts';
import { botRoute, camCanSee, camSafeShot, fakeEnv, propTiles, rectTiles, stageKit, stageXp, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const GATES = ['door1', 'door2', 'crate1'];
const ALL = new Set(GATES);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const HAZ = S.hazards ?? [];
const CAMS = props.filter((p) => p.prop === 'camera');
const LUCAS_REACH = HERO_DEFS.lucas.basic.reach;
/** The sealed chamber behind the observation glass. Nothing walks in. */
const CHAMBER = rectTiles({ tx: 17, ty: 14, w: 13, h: 2 });
/** The rooms, as tile rectangles of their floors. */
const ROOMS: Record<string, TileRect> = {
  dock: { tx: 1, ty: 32, w: 12, h: 10 }, corridorA: { tx: 14, ty: 31, w: 14, h: 6 }, power: { tx: 29, ty: 31, w: 17, h: 11 },
  animal: { tx: 31, ty: 17, w: 16, h: 11 }, observation: { tx: 4, ty: 17, w: 26, h: 5 }, server: { tx: 6, ty: 24, w: 23, h: 4 },
  storage: { tx: 3, ty: 3, w: 24, h: 9 }, records: { tx: 33, ty: 3, w: 14, h: 9 },
};
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
const roomCount = (room: string, chars: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => chars.includes(ch(x, y))).length;
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);

// ---------------------------------------------------------------- the map
test('stage 1.2: the map is 48 wide and 44 tall, uses only legend characters, and the edge ring is solid', () => {
  assert.equal(S.rows, ROWS);
  assert.ok(S.rows.length <= 44);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, S.rows.length]);
  for (let x = 0; x < grid.w; x++) assert.ok(grid.solid[idx(x, 0)] && grid.solid[idx(x, grid.h - 1)], 'top and bottom edges are solid');
  for (let y = 0; y < grid.h; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(grid.w - 1, y)], 'left and right edges are solid');
  assert.deepEqual([S.id, S.name, S.time, S.music], ['1.2', 'Hawkins Lab', 'day', 'lab']);
  assert.deepEqual(S.lights, [], 'a day stage has no light pools');
  const used = new Set(S.rows.join(''));
  for (const c of 'oOzWVviGcLBCNqDxUMaeYE') assert.ok(used.has(c), `the map uses the lab tile '${c}'`);
  for (const c of 'g=_XlT') assert.ok(used.has(c), `the dock uses the outdoor tile '${c}'`);
  for (const [y, row] of S.rows.entries()) for (const [x, c] of [...row].entries()) {
    if ('g=_Xl'.includes(c)) assert.ok(inRoom('dock', x, y) || (x <= 12 && y >= 31), `outdoor tile '${c}' at ${x},${y} is outside the dock`);
  }
});

test('stage 1.2: every room has its own floor and furniture, and the growth thickens toward the records wing', () => {
  const floors: [string, string, number][] = [
    ['dock', 'g=_', 0.8], ['corridorA', 'oz', 0.6], ['power', 'qEoOx', 0.8], ['animal', 'aDE', 0.6], ['observation', 'OE', 0.7],
    ['server', 'Oq', 0.7], ['storage', 'oxE', 0.7], ['records', 'eE', 0.6],
  ];
  for (const [room, chars, share] of floors) {
    const r = ROOMS[room] as TileRect;
    assert.ok(roomCount(room, chars) >= r.w * r.h * share, `${room} is mostly '${chars}'`);
  }
  assert.ok(roomCount('corridorA', 'L') >= 8, 'lockers line corridor A');
  assert.ok(roomCount('animal', 'c') >= 12 && roomCount('animal', 'D') >= 3, 'cages and drains in the animal lab');
  assert.ok(roomCount('storage', 'N') >= 10, 'shelves in the storage hall');
  assert.ok(roomCount('records', 'C') >= 6, 'cabinets in the records wing');
  assert.ok(S.rows.slice(1, 3).join('').includes('Y') && S.rows[16]?.includes('Y'), 'wall signs on the north faces');
  for (let x = 17; x <= 29; x++) assert.equal(ch(x, 16), 'G', `observation glass at ${x},16`);
  const kinds = (room: string, kind: string): number => props.filter((p) => p.prop === kind && inRoom(room, p.tx, p.ty)).length;
  assert.ok(kinds('power', 'generator') >= 2, 'generators in the power room');
  assert.ok(kinds('animal', 'tank') >= 4, 'tanks in the animal lab');
  assert.ok(kinds('server', 'rack') >= 4, 'racks in the server room');
  assert.ok(props.some((p) => p.prop === 'van' && inRoom('dock', p.tx, p.ty)), 'the van is on the dock');
  // Vines and growth: a little in the animal lab, more in the storage hall, most in the records wing.
  const growth = (room: string, r: TileRect = ROOMS[room] as TileRect): number =>
    rectTiles({ tx: r.tx - 1, ty: r.ty - 1, w: r.w + 2, h: r.h + 2 }).filter(([x, y]) => 'UM'.includes(ch(x, y))).length;
  assert.equal(growth('dock') + growth('corridorA') + growth('power'), 0, 'nothing has come through near the way in');
  assert.ok(growth('animal') > 0 && growth('storage') > 0, 'it starts in the animal lab and the storage hall');
  assert.ok(growth('records') > growth('storage') && growth('records') > growth('animal'), 'it is thickest in the records wing');
});

test('stage 1.2: the start and every spawn are on walkable ground, ids are unique, and the start is quiet and outdoors', () => {
  assert.equal(grid.solid[idx(startTx, startTy)], 0, 'start tile');
  assert.ok('g=_'.includes(ch(startTx, startTy)), 'the level begins outside, on the dock');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(grid.solid[idx(s.tx, s.ty)], 0, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 12, `${e.id} is too close to the start`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(npcs.length, 0, 'there are no npcs, and Eleven is already in the party');
});

test('stage 1.2: props sit where the art expects them, and the doors and crate fill their gaps', () => {
  for (const p of props) {
    if (p.prop === 'console') {
      assert.equal(ch(p.tx, p.ty), 'W', `${p.id} is set into a wall face`);
      assert.equal(grid.solid[idx(p.tx, p.ty + 1)], 0, `${p.id} has floor in front of it`);
    } else if (p.prop === 'camera') {
      assert.ok('WV'.includes(ch(p.tx, p.ty)), `${p.id} hangs on a wall`);
    } else {
      for (const [x, y] of propTiles(p)) assert.equal(grid.solid[idx(x, y)], 0, `${p.id} stands on open ground at ${x},${y}`);
    }
  }
  for (const p of props.filter((q) => ['tank', 'rack'].includes(q.prop))) assert.deepEqual([p.w, p.h], [16, 32], `${p.id} is a tile wide and two tall`);
  for (const p of props.filter((q) => q.prop === 'generator')) assert.deepEqual([p.w, p.h], [32, 32], `${p.id} is two tiles square`);
  for (const id of ['door1', 'door2']) {
    const p = prop(id);
    assert.deepEqual([p.prop, p.w, p.h], ['door', 32, 16]);
    assert.ok(grid.solid[idx(p.tx - 1, p.ty)] && grid.solid[idx(p.tx + 2, p.ty)], `${id} fills a doorway two tiles wide`);
  }
  const crate = prop('crate1');
  assert.deepEqual([crate.prop, crate.pushBy, crate.w, crate.h], ['crate', 'push', 16, 48]);
  assert.ok(grid.solid[idx(crate.tx, crate.ty - 1)] && grid.solid[idx(crate.tx, crate.ty + 3)], 'the crate fills the corridor wall to wall');
  assert.deepEqual([prop('sensor1').hitBy, prop('relay1').hitBy], ['burn', 'shoot']);
});

// ---------------------------------------------------------------- the budget
test('stage 1.2: the roster follows the encounter rules and the stage is worth 130 to 160 XP', () => {
  // The roster is worth 360 at the enemies' own XP; the stage's xpMult brings it into the campaign's pace.
  assert.equal(enemies.reduce((sum, e) => sum + xpOf(e), 0), 360);
  const xp = stageXp(S);
  assert.ok(xp >= 130 && xp <= 160, `stage XP ${xp}`);
  assert.equal(xp, 146);
  // Every room has someone in it, so no big floor is left empty: at least 24 enemies, six of them rats in the animal lab.
  assert.ok(enemies.length >= 24, `${enemies.length} enemies`);
  assert.ok(enemies.filter((e) => e.group === 'rats1').length >= 6, 'six rats wait in the animal lab');
  const of = (type: string, elite: boolean): typeof enemies => enemies.filter((e) => e.type === type && (e.tier === 'elite') === elite);
  assert.ok(of('guard', false).length + of('guard', true).length >= 3, 'at least three guards');
  assert.ok(of('agent', true).length >= 4, 'at least four elite agents');
  assert.ok(of('rat', false).length >= 1 && of('rat', true).length >= 1, 'rats and elite rats');
  assert.equal(enemies.filter((e) => e.type === 'warden').length, 1);
  assert.deepEqual(WAVES, ['lock1', 'lock2', 'lock3']);
  assert.deepEqual(S.waves, WAVES);
  const lock3 = enemies.filter((e) => e.group === 'lock3');
  assert.ok(lock3.some((e) => e.type === 'warden') && lock3.length >= 2, 'the Warden is the last wave, with company');
  for (const g of ['rats1', ...WAVES]) assert.ok(enemies.filter((e) => e.group === g).every((e) => e.dormant), `${g} is dormant`);
  // Corridor A is agents, and the first guard stands further on than the first agent.
  assert.ok(enemies.filter((e) => e.group === 'agents1').every((e) => e.type === 'agent' && e.tier !== 'elite' && (e.patrol?.length ?? 0) >= 2));
  for (const e of enemies.filter((q) => q.type === 'guard' || q.type === 'warden')) assert.ok(e.dir, `${e.id} faces a set way`);
  const kind = (k: string): number => items.filter((i) => i.item === k).length;
  assert.deepEqual([kind('eggo'), kind('coke'), kind('quarter')], [4, 2, 12]);
});

test('stage 1.2: every camera wakes a dormant reinforcement group that comes out of a vent', () => {
  assert.ok(CAMS.length >= 2);
  for (const c of CAMS) {
    const beat = S.beats.find((b) => 'event' in b.when && b.when.event === 'spotted' && b.when.prop === c.id);
    assert.ok(beat, `${c.id} has a spotted beat`);
    assert.deepEqual(beat.steps[0], { t: 'alarm' });
    const wake = beat.steps[1];
    assert.ok(wake?.t === 'wake' && /^reinf\d$/.test(wake.group), `${c.id} wakes a reinforcement group`);
    const group = enemies.filter((e) => e.group === wake.group);
    assert.ok(group.length > 0 && group.every((e) => e.dormant), `${wake.group} is dormant until the camera calls it`);
    for (const e of group) assert.equal(ch(e.tx, e.ty), 'v', `${e.id} waits in a vent`);
  }
});

// ---------------------------------------------------------------- reachability
test('stage 1.2: door1, door2 and crate1 cut the route in that order, with every solid prop in the way', () => {
  const power = [35, 36], animal = [38, 20], observation = [10, 19], server = [22, 26], storage = [15, 8], wing = [40, 7];
  const reach = (open: string[], p: number[]): number => at(flood(new Set(open)), p[0] as number, p[1] as number);
  for (const p of [[startTx, startTy], [22, 33], power]) assert.equal(reach([], p), 1, `${p} is open at the start`);
  for (const p of [animal, observation, server, storage, wing]) assert.equal(reach([], p), 0, `${p} is cut off at the start`);
  assert.equal(reach(['door2', 'crate1'], animal), 0, 'door2 and the crate do nothing before door1');
  for (const p of [animal, observation, server]) assert.equal(reach(['door1'], p), 1, `${p} after door1`);
  for (const p of [storage, wing]) assert.equal(reach(['door1'], p), 0, `${p} is still past door2`);
  assert.equal(reach(['door1', 'crate1'], storage), 0, 'the crate comes after door2, not instead of it');
  assert.equal(reach(['door1', 'door2'], storage), 1);
  assert.equal(reach(['door1', 'door2'], wing), 0, 'the crate still holds the wing');
  assert.equal(reach(GATES, wing), 1, 'open, the route runs through to the records wing');
});

test('stage 1.2: with every gate open nothing is boxed in, and only the glass chamber stays sealed', () => {
  const open = flood(ALL);
  const blocked = kit.blocked(ALL);
  const sealed = new Set(CHAMBER.map(([x, y]) => idx(x, y)));
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (blocked[idx(x, y)]) continue;
    if (sealed.has(idx(x, y))) assert.equal(open[idx(x, y)], 0, `chamber tile ${x},${y} must not be reachable`);
    else assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const [x, y] of CHAMBER) assert.equal(grid.solid[idx(x, y)], 0, 'the chamber has a floor behind the glass');
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) {
    const near = rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1);
    assert.ok(near, `${p.id} has open ground next to it`);
  }
});

test('stage 1.2: nothing worth a detour lies within the bot\'s pickup reach on the far side of a shut gate', () => {
  // The bot walks to an Eggo or a Coke without checking the way, so one just behind a shut gate would pin it there.
  const reach: Record<string, number> = { eggo: 124, coke: 104, quarter: 44 };
  let opened = new Set<string>();
  for (const gate of GATES) {
    const before = flood(opened);
    const after = flood(new Set([...opened, gate]));
    const near: [number, number][] = [];
    for (let i = 0; i < before.length; i++) if (before[i]) near.push([i % grid.w, (i / grid.w) | 0]);
    for (const it of items.filter((q) => after[idx(q.tx, q.ty)] && !before[idx(q.tx, q.ty)])) {
      const d = Math.min(...near.map(([x, y]) => Math.hypot(x - it.tx, y - it.ty) * 16));
      assert.ok(d > (reach[it.item] as number), `${it.id} is ${d.toFixed(0)} px from the route on the near side of ${gate}`);
    }
    opened = new Set([...opened, gate]);
  }
});

test('stage 1.2: three lights, each reachable and lit before a hard stretch', () => {
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_dock', 'lights_hall', 'lights_records']);
  for (const c of S.checkpoints) {
    assert.ok(props.some((p) => p.id === c.prop && p.prop === 'lights'));
    const [x, y] = tileOf(c.x, c.y);
    assert.equal(at(flood(ALL), x, y), 1, `checkpoint ${c.prop} is walkable`);
  }
  const tile = (i: number): [number, number] => tileOf(S.checkpoints[i]!.x, S.checkpoints[i]!.y);
  const [dx, dy] = tile(0), [hx, hy] = tile(1), [rx, ry] = tile(2);
  assert.ok(at(flood(new Set()), dx, dy) && Math.hypot(dx - startTx, dy - startTy) < 8, 'lights_dock is at the start');
  assert.ok(!at(flood(new Set(['door1'])), hx, hy) && at(flood(new Set(['door1', 'door2'])), hx, hy), 'lights_hall is behind door2');
  const door2 = prop('door2');
  assert.ok(Math.hypot(hx - door2.tx, hy - door2.ty) < 6, 'lights_hall is just past door2');
  assert.ok(!at(flood(new Set(['door1', 'door2'])), rx, ry) && at(flood(ALL), rx, ry), 'lights_records is behind the crate');
  const lock = (S.beats.find((b) => b.id === 'lockdown')!.when as { rect: TileRect }).rect;
  assert.ok(rx < lock.tx, 'lights_records comes before the lockdown trigger');
});

// ---------------------------------------------------------------- hazards and cameras
const hazTiles = (h: HazardDef): [number, number][] => rectTiles({ tx: h.tx, ty: h.ty, w: h.w, h: h.h });
const route = botRoute(S, kit);

test('stage 1.2: hazards sit on walkable plate tiles, every plate is a hazard, and the cycles leave time to cross', () => {
  assert.ok(HAZ.length >= 4);
  assert.equal(new Set(HAZ.map((h) => h.id)).size, HAZ.length, 'hazard ids are unique');
  const covered = new Set<number>();
  for (const h of HAZ) {
    for (const [x, y] of hazTiles(h)) {
      assert.equal(ch(x, y), 'E', `${h.id} covers a plate tile at ${x},${y}`);
      assert.equal(at(flood(ALL), x, y), 1, `${h.id} is on reachable floor at ${x},${y}`);
      covered.add(idx(x, y));
    }
    assert.ok(h.period >= 150 && h.period <= 200, `${h.id} period ${h.period}`);
    assert.ok(h.on >= 36 && h.on <= 60, `${h.id} on ${h.on}`);
    assert.ok(h.period - h.on - HAZARD_WARN >= 60, `${h.id} is quiet long enough to walk across`);
  }
  for (const [y, row] of S.rows.entries()) for (const [x, c] of [...row].entries()) if (c === 'E') assert.ok(covered.has(idx(x, y)), `plate at ${x},${y} has no hazard`);
  const kinds = (room: string, kind: string): number => HAZ.filter((h) => h.kind === kind && inRoom(room, h.tx, h.ty)).length;
  assert.ok(kinds('power', 'electric') >= 1, 'an arcing panel in the power room');
  assert.ok(kinds('observation', 'steam') >= 1, 'a steam grate in the observation corridor');
});

test('stage 1.2: at least two hazards cross the main route, and the two grates in a row never vent together', () => {
  assert.equal(route.missing, null, 'the bot has a path between every pair of waypoints');
  const crossing = HAZ.filter((h) => hazTiles(h).some(([x, y]) => route.tiles.has(idx(x, y))));
  assert.ok(crossing.length >= 2, `only ${crossing.map((h) => h.id).join(', ')} cross the route`);
  for (const w of S.waypoints) {
    const [x, y] = tileOf(w.x, w.y);
    assert.ok(!HAZ.some((h) => hazTiles(h).some(([u, v]) => u === x && v === y)), `waypoint ${x},${y} is not on a hazard`);
  }
  const s1 = HAZ.find((h) => h.id === 'steam1') as HazardDef, s2 = HAZ.find((h) => h.id === 'steam2') as HazardDef;
  for (let t = 0; t < 600; t++) assert.ok(!(hazardAt(s1, t).state === 'on' && hazardAt(s2, t).state === 'on'), `both grates vent at ${t}`);
  // Walking west at a steady pace, a party that steps onto the first grate as it goes quiet reaches the second while it is quiet.
  const quiet = (h: HazardDef, t: number): boolean => hazardAt(h, t).state === 'off';
  let ok = false;
  for (let t = 0; t < s1.period && !ok; t++) if (quiet(s1, t) && quiet(s1, t + 30) && quiet(s2, t + 110) && quiet(s2, t + 140)) ok = true;
  assert.ok(ok, 'there is a window to cross both grates at a walk');
});

test('stage 1.2: each camera sweeps readably, watches the route, and can be shot from a tile it never sees', () => {
  const walls = kit.blocked(new Set());
  for (const c of CAMS) {
    const d = c.cam;
    assert.ok(d, `${c.id} has a sweep`);
    assert.ok(d.period >= 240 && d.period <= 360, `${c.id} period ${d.period}`);
    assert.ok(d.half >= 25 && d.half <= 35, `${c.id} half ${d.half}`);
    assert.ok(d.range >= 90 && d.range <= 150, `${c.id} range ${d.range}`);
    assert.equal(c.hitBy ?? 'shoot', 'shoot');
    let watched = 0;
    for (const i of route.tiles) if (camCanSee(kit, c, i % grid.w, (i / grid.w) | 0, walls)) watched++;
    assert.ok(watched >= 3, `${c.id} sees ${watched} tiles of the route`);
    assert.ok(camSafeShot(kit, c, LUCAS_REACH, new Set(['door1'])), `${c.id} has a blind spot Lucas can shoot it from`);
  }
  const onRoute = CAMS.filter((c) => [...route.tiles].some((i) => camCanSee(kit, c, i % grid.w, (i / grid.w) | 0, walls)));
  assert.ok(onRoute.length >= 2, 'two or more cameras on the main route');
});

// ---------------------------------------------------------------- the bot
test('stage 1.2: the bot waypoints are reachable in order and flag the gates and the waves', () => {
  const open = new Set<string>();
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y}`);
    if (w.open) open.add(w.open);
  });
  assert.deepEqual(S.waypoints.flatMap((w) => (w.open ? [w.open] : [])), GATES, 'the bot opens the gates in route order');
  assert.deepEqual(S.waypoints.flatMap((w) => (w.wake ? [w.wake] : [])), ['rats1', 'lock1']);
  const last = S.waypoints.at(-1)!;
  const lock = (S.beats.find((b) => b.id === 'lockdown')!.when as { rect: TileRect }).rect;
  const [lx, ly] = tileOf(last.x, last.y);
  assert.ok(rectTiles(lock).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the lockdown trigger');
});

// ---------------------------------------------------------------- beats
const SCRIPT_IDS = [
  'l2_start', 'l2_agents', 'l2_spotted', 'l2_burn_hint', 'l2_burn_done', 'l2_cages', 'l2_scare', 'l2_shoot_hint', 'l2_relay_done',
  'l2_guards', 'l2_push_hint', 'l2_crate_cleared', 'l2_lockdown_start', 'l2_warden', 'l2_lockdown_clear', 'l2_clear',
];
const BEAT_IDS = [
  'start', 'agents1', 'cam1_spotted', 'cam2_spotted', 'burn_hint', 'door1_open', 'cages', 'scare', 'relay_hint', 'cam3_spotted',
  'door2_open', 'guards', 'crate_hint', 'crate_cleared', 'lockdown', 'warden', 'level_clear',
];
const when = (id: string): unknown => S.beats.find((b) => b.id === id)!.when;
const steps = (id: string): unknown => S.beats.find((b) => b.id === id)!.steps;

test('stage 1.2: every beat has a trigger, a real script, group or prop, and the rect beats sit behind the right gates', () => {
  const ids = S.beats.map((b) => b.id);
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
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.includes(w.needs), `${b.id} needs ${w.needs}`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  for (const id of SCRIPT_IDS) assert.ok(said.has(id), `${id} is played by some beat`);
  assert.deepEqual(steps('door1_open'), [{ t: 'open', prop: 'door1' }, { t: 'say', script: 'l2_burn_done' }]);
  assert.deepEqual(steps('door2_open'), [{ t: 'open', prop: 'door2' }, { t: 'say', script: 'l2_relay_done' }]);
  assert.deepEqual(steps('cages'), [{ t: 'say', script: 'l2_cages' }, { t: 'wake', group: 'rats1' }]);
  assert.deepEqual(steps('scare'), [{ t: 'scare' }, { t: 'say', script: 'l2_scare' }]);
  assert.deepEqual(steps('lockdown'), [{ t: 'alarm' }, { t: 'say', script: 'l2_lockdown_start' }, { t: 'waves' }]);
  assert.deepEqual(steps('warden'), [{ t: 'say', script: 'l2_warden' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l2_lockdown_clear' }, { t: 'say', script: 'l2_clear' }, { t: 'finish' }]);
  assert.deepEqual(when('door1_open'), { event: 'targetHit', prop: 'sensor1' });
  assert.deepEqual(when('door2_open'), { event: 'targetHit', prop: 'relay1' });
  assert.deepEqual(when('crate_cleared'), { event: 'propCleared', prop: 'crate1' });
  assert.deepEqual(when('relay_hint'), { after: 'scare' });
  assert.deepEqual(when('warden'), { cleared: 'lock2' });
  assert.deepEqual(when('level_clear'), { cleared: 'lock3' });
  for (const id of ['guards', 'crate_hint']) assert.equal((when(id) as { needs?: string }).needs, 'door2_open');
  const through = (gates: string[], id: string): boolean => rectTiles((when(id) as { rect: TileRect }).rect).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  const behind: [string, string[], string[]][] = [
    ['cages', ['door1'], []], ['scare', ['door1'], []], ['guards', ['door1', 'door2'], ['door1']],
    ['crate_hint', ['door1', 'door2'], ['door1']], ['lockdown', GATES, ['door1', 'door2']],
  ];
  for (const id of ['start', 'agents1', 'burn_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const [id, needed, fewer] of behind) {
    assert.ok(through(needed, id), `${id} is reachable once ${needed.join(', ')} is open`);
    assert.ok(!through(fewer, id), `${id} is not reachable with only ${fewer.join(', ') || 'nothing'} open`);
  }
});

test('director: the beats run in route order, the cameras call their groups, and the waves chain through the Warden to the finish', () => {
  const { env, log } = fakeEnv({ reinf1: 1, reinf2: 1, reinf3: 1, rats1: 2, lock1: 1, lock2: 2, lock3: 2 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = (when(id) as { rect: TileRect }).rect; d.tick(r.tx, r.ty); };
  const spot = (cam: string): SimEvent[] => [{ t: 'spotted', propId: cam }];
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l2_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('agents1')), ['say l2_agents']);
  assert.deepEqual(run(() => d.events(spot('cam1'))), ['alarm', 'wake reinf1', 'say l2_spotted']);
  assert.deepEqual(run(() => d.events(spot('cam1'))), [], 'a camera calls its group once');
  assert.deepEqual(run(() => d.events(spot('cam2'))), ['alarm', 'wake reinf2', 'say l2_spotted']);
  assert.deepEqual(run(() => tick('burn_hint')), ['say l2_burn_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'sensor1' }])), ['open door1', 'say l2_burn_done']);
  assert.deepEqual(run(() => tick('cages')), ['say l2_cages', 'wake rats1']);
  assert.deepEqual(run(() => tick('scare')), ['scare', 'say l2_scare', 'say l2_shoot_hint'], 'the shoot hint follows the scare');
  assert.deepEqual(run(() => d.events(spot('cam3'))), ['alarm', 'wake reinf3', 'say l2_spotted']);
  assert.deepEqual(run(() => tick('crate_hint')), [], 'the push hint waits until door2 is open');
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'relay1' }])), ['open door2', 'say l2_relay_done']);
  assert.deepEqual(run(() => tick('guards')), ['say l2_guards']);
  assert.deepEqual(run(() => tick('crate_hint')), ['say l2_push_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crate1' }])), ['say l2_crate_cleared']);
  assert.deepEqual(run(() => tick('lockdown')), ['alarm', 'say l2_lockdown_start', 'wake lock1']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'lock1' }])), ['wake lock2']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'lock2' }])), ['say l2_warden', 'wake lock3'], 'the Warden walks in');
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'lock3' }])), ['say l2_lockdown_clear', 'say l2_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from the second light skips the dead and still reaches the crate hint and the finish', () => {
  const { env, log } = fakeEnv({ lock1: 0, lock2: 2, lock3: 2 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const d = createDirector(S.beats, S.waves, env);
  d.restore({ fired: ['start', 'agents1', 'cam1_spotted', 'burn_hint', 'door1_open', 'cages', 'scare', 'relay_hint', 'door2_open'], cleared: ['rats1'] });
  const tick = (id: string): void => { const r = (when(id) as { rect: TileRect }).rect; d.tick(r.tx, r.ty); };
  tick('scare');
  assert.deepEqual(log, [], 'the scare does not play twice');
  tick('crate_hint');
  assert.deepEqual(log, ['say l2_push_hint'], 'the push hint does, because door2_open had finished');
  log.length = 0;
  tick('lockdown');
  assert.deepEqual(log, ['alarm', 'say l2_lockdown_start', 'wake lock2'], 'a wave with nobody left counts as cleared');
});
