// Stage 3.2, the Russian base, as data: the map and its rooms, the budget, the gates in route order and the hero who opens each,
// reachability (Robin's cipher door is on the route, the barracks is behind the second, the chamber is shut by its doors, the breaker is
// shut in rock), the checkpoints, the puzzles, the beats and the 10 scripts, and the bot's route. The real sim and the headless runs of
// the bot are in stage32-sim.test.ts, and the play scene in stage32-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L8_SCRIPTS } from '../src/story/scripts_l8.ts';
import { STAGE_32 as S, ROWS } from '../src/world/stages/stage32.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import type { Sim } from '../src/core/types.ts';
import { botRoute, propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, flood, startTx, startTy } = kit;
/** The same stage with the chamber's doors shut, as the grigori beat leaves them. */
const shut = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.prop === 'door' ? { ...s, solid: true } : s)) } as StageData);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The rooms as floor rectangles, doorways between them included where they are rooms of their own. */
const ROOMS: Record<string, TileRect> = {
  lift: { tx: 2, ty: 2, w: 7, h: 7 }, bay: { tx: 11, ty: 2, w: 30, h: 10 }, corridor: { tx: 21, ty: 12, w: 2, h: 6 }, hall: { tx: 14, ty: 18, w: 14, h: 7 },
  barracks: { tx: 30, ty: 14, w: 13, h: 7 }, lab: { tx: 2, ty: 18, w: 10, h: 16 }, post: { tx: 12, ty: 30, w: 6, h: 4 }, control: { tx: 18, ty: 29, w: 8, h: 9 },
  chamber: { tx: 28, ty: 26, w: 18, h: 12 },
};
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
const BEAT_IDS = ['start', 'bay', 'cipher_hint', 'cipher_open', 'cache_hint', 'cache_open', 'lab', 'control', 'grigori', 'level_clear'];
const SCRIPT_IDS = ['l8_start', 'l8_bay', 'l8_cipher_hint', 'l8_cipher_done', 'l8_cache_hint', 'l8_cache_done', 'l8_lab', 'l8_control', 'l8_grigori', 'l8_clear'];
/** The base's own tiles, and the lab dressing it shares: pipes, glass, cages, a cabinet and a locker, and the lift from the mall. */
const BASE = '·°¯¦±§×¤º';
const SHARED = 'iGcCLÞ';

// ---------------------------------------------------------------- the map
test('stage 3.2: the map is 48 by 40, uses only legend characters, is solid all round and runs at night with the starcourt theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['3.2', 'The Russian base', 'night', 'starcourt']);
  assert.ok((S.enemyMult ?? 1) >= 1 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set(S.rows.join(''));
  for (const c of BASE) assert.ok(used.has(c), `the map uses the base tile '${c}'`);
  assert.ok(![...used].some((c) => !(BASE + SHARED).includes(c)), 'and nothing but the base tiles and the shared dressing');
  assert.equal(S.rows.join('').split('Þ').length - 1, 4, 'the lift is two tiles by two');
  assert.ok(rectTiles({ tx: 2, ty: 2, w: 2, h: 2 }).every(([x, y]) => ch(x, y) === 'Þ'), 'in the lift drop\'s north-west corner');
});

test('stage 3.2: walls are a cap row over a face row looking onto the floor below, and the window is glass in the wall between the doors', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has a cap or other wall above it.
      if (c === '¦' && y + 1 < grid.h && !solid(x, y + 1)) assert.ok(solid(x, y - 1), `the wall face at ${x},${y} has a cap above it`);
      if (c === '¯' && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on rock, not floor`);
      if (!solid(x, y) && y > 0) assert.ok(ch(x, y - 1) !== '¯', `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  const glass = rectTiles({ tx: 0, ty: 0, w: 48, h: 40 }).filter(([x, y]) => ch(x, y) === 'G');
  assert.deepEqual(glass, rectTiles({ tx: 26, ty: 32, w: 2, h: 3 }), 'six panes, two deep and three high, in the control room\'s east wall');
  for (const y of [32, 33, 34]) assert.ok(!solid(25, y) && !solid(28, y), `the window at ${y} looks from the control room onto the chamber`);
  const machine = rectTiles({ tx: 0, ty: 0, w: 48, h: 40 }).filter(([x, y]) => ch(x, y) === '¤');
  assert.deepEqual(machine, rectTiles({ tx: 33, ty: 25, w: 8, h: 1 }), 'the machine is eight tiles along the chamber\'s north face');
  for (const [x, y] of machine) assert.ok(!solid(x, y + 1) && ch(x, y - 1) === '¯', 'with the chamber\'s floor below it and the cap row above');
});

test('stage 3.2: the rooms are where the spec has them, and the chamber is an arena 18 by 12', () => {
  const floor = (room: string, c: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('lift', startTx, startTy), 'the stage begins in the lift drop');
  assert.ok(floor('bay', '±') >= 12, 'the bay is stacked with crates');
  assert.ok(rectTiles({ tx: 14, ty: 17, w: 14, h: 1 }).filter(([x, y]) => ch(x, y) === 'i').length >= 4, 'pipes along the hall\'s north wall');
  assert.ok(floor('barracks', '§') >= 6 && floor('barracks', 'L') >= 2, 'bunks and lockers in the barracks');
  assert.ok(floor('lab', '°') > total('lab') * 0.6, 'the lab is mostly grating');
  assert.ok(floor('lab', '×') >= 16 && floor('lab', 'c') >= 8, 'cells and rat cages');
  assert.ok(floor('control', 'C') >= 2, 'cabinets in the control room');
  assert.ok(floor('chamber', 'º') > total('chamber') * 0.7 && floor('chamber', '°') >= 16, 'the chamber is key floor with grating in front of the machine');
  assert.deepEqual([ROOMS.chamber?.w, ROOMS.chamber?.h], [18, 12]);
  // Every floor tile of the chamber's rectangle is walkable but the crates in its south-east corner.
  for (const [x, y] of rectTiles(ROOMS.chamber as TileRect)) assert.ok(!solid(x, y) || ch(x, y) === '±', `chamber tile ${x},${y}`);
  const cells = rectTiles(ROOMS.lab as TileRect).filter(([x, y]) => ch(x, y) === '×');
  assert.ok(cells.every(([x, y]) => x <= 6 && (y >= 20 && y <= 23 || y >= 28 && y <= 31)), 'two cells against the lab\'s west wall');
  for (const [tx, ty] of [[2, 20], [2, 28]] as const) {
    assert.deepEqual([ch(tx + 2, ty + 3), ch(tx + 1, ty + 1), ch(tx + 3, ty + 2)], ['°', '°', '°'], 'a cell has a floor inside and a gap in its bottom bars');
  }
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 3.2: the lights are lamps over each room, furnaces under the lab, the consoles and the machine, and the three strings', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || '¦¤G'.includes(ch(tx, ty)), `the light at ${tx},${ty} is on floor, a wall face, the machine or the window`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  const widest = S.lights.reduce((a, b) => (b.r > a.r ? b : a));
  assert.ok(ch(Math.floor(widest.x / 16), Math.floor(widest.y / 16)) === '°' && inRoom('chamber', Math.floor(widest.x / 16), Math.floor(widest.y / 16)), 'the widest pool is the machine\'s, on the grating in front of it');
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_lift', 'lights_lab', 'lights_control']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_lift', 'lights_lab', 'lights_control']);
  const open = flood(new Set(['cipher1']));
  const lab = rectTiles(rectOf('lab')), boss = rectTiles(rectOf('grigori'));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(!lab.some(([u, v]) => u === x && v === y) && !boss.some(([u, v]) => u === x && v === y), `${c.prop} is outside the lab's and Grigori's triggers, so a retry does not wake them at once`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 4, 'lights_lift is at the start');
  // lights_lab is on the hall side of the lab beat and lights_control is in the control room: a string lit in good time never saves
  // the lab beat as fired for Flayed the retry would put back to sleep.
  assert.ok(inRoom('hall', prop('lights_lab').tx, prop('lights_lab').ty), 'lights_lab is in the hall, before the lab\'s doorway');
  assert.ok(inRoom('control', prop('lights_control').tx, prop('lights_control').ty), 'lights_control is in the control room, the save point for the fight');
  assert.ok(rectTiles(rectOf('control')).every(([x, y]) => !rectTiles({ tx: prop('lights_control').tx, ty: prop('lights_control').ty, w: 3, h: 1 }).some(([u, v]) => u === x && v === y)), 'and outside the control beat\'s tiles');
});

// ---------------------------------------------------------------- spawns
test('stage 3.2: the start and every spawn, item and patrol point is on open ground, ids are unique, and the start is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  const inWall = new Set(['breaker', 'console']);
  for (const p of props.filter((q) => !inWall.has(q.prop))) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items and props');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 9, `${e.id} is too close to the start`);
  for (const room of ['lift', 'barracks']) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), `nothing hostile in the ${room}`);
  const taken = new Set([...enemies, ...items].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights`);
});

test('stage 3.2: the roster is worth 190 to 240 XP, in its groups, with the Flayed in the cells and Grigori asleep in the chamber', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 190 && xp <= 240, `stage XP ${xp}`);
  assert.equal(xp, 236);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('soldier'), kind('melter'), kind('flayed'), kind('grigori')], [6, 7, 4, 1]);
  assert.equal(enemies.filter((e) => e.tier === 'elite').length, 1, 'one elite, a soldier');
  assert.ok(enemies.filter((e) => e.tier === 'elite').every((e) => e.type === 'soldier'));
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['bay', 'boss', 'hall', 'lab', 'post']);
  assert.ok(groups('bay').length >= 2 && groups('bay').every((e) => e.type === 'soldier' && !e.dormant && inRoom('bay', e.tx, e.ty)), 'soldiers in the bay, awake');
  assert.ok(groups('hall').every((e) => e.type === 'soldier' && !e.dormant && inRoom('hall', e.tx, e.ty)) && groups('hall').some((e) => e.tier === 'elite'), 'soldiers and an elite in the hall');
  assert.ok(groups('hall').every((e) => !(e.tx >= 21 && e.tx <= 22)), 'none of them on the corridor\'s line, which would be a sniper on a two-tile lane');
  const lab = groups('lab');
  assert.ok(lab.filter((e) => e.type === 'melter').length >= 6 && lab.every((e) => (e.type === 'melter' || e.type === 'flayed') && inRoom('lab', e.tx, e.ty)), 'melting rats and Flayed in the lab');
  assert.ok(lab.filter((e) => e.type === 'melter').every((e) => !e.dormant), 'the rats are awake');
  assert.ok(lab.filter((e) => e.type === 'flayed').every((e) => e.dormant && ch(e.tx, e.ty) === '°' && e.tx <= 5 && ((e.ty >= 21 && e.ty <= 22) || (e.ty >= 29 && e.ty <= 30))), 'the Flayed are puddles inside the two cells');
  assert.ok(groups('post').length === 2 && groups('post').every((e) => e.type === 'soldier' && !e.dormant && inRoom('control', e.tx, e.ty)), 'two soldiers at the control room');
  const boss = groups('boss');
  assert.equal(boss.length, 1);
  const g = boss[0] as (typeof enemies)[number];
  assert.deepEqual([g.id, g.type, g.dormant], ['grigori', 'grigori', true]);
  assert.ok(inRoom('chamber', g.tx, g.ty) && g.tx >= 38, 'Grigori sleeps on the chamber\'s east side');
  assert.ok(enemies.every((e) => ['soldier', 'melter', 'flayed', 'grigori'].includes(e.type)), 'only the chapter 3 enemies');
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  const barracks = items.filter((i) => inRoom('barracks', i.tx, i.ty));
  assert.ok(barracks.some((i) => i.item === 'eggo') && barracks.filter((i) => i.item === 'quarter').length >= 3, 'an Eggo and quarters in the barracks, behind cipher2');
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom('control', i.tx, i.ty)), 'an Eggo in the control room');
  assert.ok(items.every((i) => !inRoom('chamber', i.tx, i.ty)), 'nothing to pick up in the arena');
});

// ---------------------------------------------------------------- the gates
test('stage 3.2: cipher1 fills the corridor, cipher2 the barracks doorway, and door1 and door2 the chamber\'s two doorways, spawned open', () => {
  const c1 = prop('cipher1');
  assert.deepEqual([c1.prop, c1.hitBy, c1.w, c1.h, c1.solid], ['cipher', 'read', 32, 16, true]);
  assert.ok(solid(c1.tx - 1, c1.ty) && solid(c1.tx + 2, c1.ty), 'cipher1 fills the corridor wall to wall');
  assert.ok(propTiles(c1).every(([x, y]) => !solid(x, y) && inRoom('corridor', x, y)), 'with floor under it');
  assert.ok(inRoom('bay', c1.tx, c1.ty - 3) && inRoom('hall', c1.tx, c1.ty + 4), 'the bay is north of it, the hall south');
  const c2 = prop('cipher2');
  assert.deepEqual([c2.prop, c2.hitBy, c2.w, c2.h, c2.solid], ['cipher', 'read', 16, 32, true]);
  assert.ok(solid(c2.tx, c2.ty - 1) && solid(c2.tx, c2.ty + 2), 'cipher2 fills the doorway wall to wall');
  assert.ok(inRoom('hall', c2.tx - 1, c2.ty) && inRoom('barracks', c2.tx + 2, c2.ty), 'the hall west of it, the barracks east');
  for (const [id, ty] of [['door1', 35], ['door2', 30]] as const) {
    const d = prop(id);
    assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 32, 'open', false, 27, ty], id);
    assert.ok(solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 2), `${id} fills its doorway wall to wall`);
    assert.ok(inRoom('control', d.tx - 2, d.ty) && inRoom('chamber', d.tx + 1, d.ty), `${id} joins the control room and the chamber`);
  }
  assert.deepEqual(props.filter((p) => !['lights', 'console'].includes(p.prop)).map((p) => p.id), ['cipher1', 'cipher2', 'door1', 'door2', 'powerbox1', 'breaker1']);
});

test('stage 3.2: the power box is the plate between the doors and Grigori, and the breaker is in the cap row over the machine, shut in rock', () => {
  const box = prop('powerbox1'), br = prop('breaker1'), g = enemies.find((e) => e.id === 'grigori') as (typeof enemies)[number];
  assert.deepEqual([box.prop, box.w, box.h, box.solid], ['powerbox', 32, 32, undefined]);
  assert.ok(propTiles(box).every(([x, y]) => inRoom('chamber', x, y) && !solid(x, y) && ch(x, y) === 'º'), 'a plate of key floor in the chamber');
  const d2 = prop('door2');
  assert.ok(box.tx > d2.tx + 2 && box.tx + 2 < g.tx, 'between the doors and Grigori');
  assert.ok(g.ty >= box.ty && g.ty < box.ty + 2 && d2.ty + 1 >= box.ty && d2.ty < box.ty + 2, 'on the line from the upper door to Grigori, so he crosses it on his way');
  assert.deepEqual([br.prop, br.hitBy, br.tx, br.ty, br.w, br.h, br.smash], ['breaker', 'shoot', 36, 24, 16, 16, undefined]);
  assert.equal(ch(br.tx, br.ty), '¯', 'in the cap row');
  assert.equal(ch(br.tx, br.ty + 1), '¤', 'right over the machine');
  assert.ok(br.tx >= 33 && br.tx <= 40, 'on the far wall');
  // Nothing around it is walkable, with every gate open: the nearest floor is two tiles off, and the rock behind it is solid.
  const open = flood(new Set(['cipher1', 'cipher2']));
  for (let y = br.ty - 3; y <= br.ty + 1; y++) for (let x = br.tx - 3; x <= br.tx + 3; x++) {
    if (open[idx(x, y)] === 1) assert.fail(`the walkable tile ${x},${y} is next to the breaker`);
  }
  assert.ok(rectTiles({ tx: 33, ty: 21, w: 8, h: 4 }).every(([x, y]) => solid(x, y)), 'solid all the way up to the barracks');
  assert.ok(open[idx(br.tx, br.ty + 2)] === 1, 'but a hero standing on the chamber floor can face it');
});

// ---------------------------------------------------------------- reachability
test('stage 3.2: Robin\'s cipher door is the only way out of the bay, cipher2 shuts the barracks, and the doors cut the chamber off', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the lift drop', 5, 5, []], ['the bay', 30, 7, []], ['the corridor\'s mouth', 21, 12, []],
    ['the hall', 20, 19, ['cipher1']], ['the lab', 7, 25, ['cipher1']], ['the post', 13, 32, ['cipher1']], ['the control room', 22, 33, ['cipher1']],
    ['the chamber', 36, 33, ['cipher1']], ['the cells', 4, 22, ['cipher1']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind cipher1'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['cipher1'], 36, 17), 0, 'the barracks is shut until cipher2 is read');
  assert.equal(reach(['cipher1', 'cipher2'], 36, 17), 1);
  assert.equal(reach(['cipher2'], 36, 17), 0, 'and cipher2 is no way round cipher1');
  // The doors shut: the chamber is cut off from the control room, and the control room is the only way in.
  const closed = shut.flood(new Set(['cipher1']));
  assert.equal(closed[idx(36, 33)], 0, 'the chamber is shut off by its doors');
  assert.equal(closed[idx(22, 33)], 1);
  assert.equal(shut.flood(new Set(['cipher1', 'door1']))[idx(36, 33)], 1, 'and one door open lets the party in');
  assert.equal(shut.flood(new Set(['cipher1', 'door2']))[idx(36, 33)], 1);
  // The party cannot get to the chamber without reading cipher1, so Robin is on the route.
  assert.deepEqual(requiredFor('3.2'), ['robin']);
  assert.ok(HERO_DEFS.robin.utilities.includes('read'));
  assert.deepEqual(rosterFor('3.2').filter((h) => HERO_DEFS[h].utilities.includes('read')), ['robin'], 'only Robin can read');
});

test('stage 3.2: with every gate open nothing is boxed in, and every spawn and string of lights is reachable', () => {
  const gates = new Set(['cipher1', 'cipher2']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ROOMS)) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
});

// ---------------------------------------------------------------- the puzzles
test('stage 3.2: three puzzles, each with a hero in the roster who has what the prop asks for, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['cipher', 'cache', 'breaker']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['cipher_hint', 'cache_hint', 'grigori']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['cipher1', 'cipher2', 'breaker1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['robin', 'robin', 'lucas']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined && p.blocks === undefined));
  const roster = rosterFor('3.2');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    const need = prop(p.prop).hitBy as NonNullable<Prop['hitBy']>;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(need), `${p.id}: ${p.hero} has ${need}`);
  }
  assert.deepEqual(roster.filter((h) => HERO_DEFS[h].utilities.includes('shoot')), ['lucas', 'nancy'], 'a shot comes from Lucas or Nancy');
  const breaker = S.puzzles[2];
  assert.deepEqual(breaker?.alt, [{ hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER PISTOL' }]);
  assert.ok(S.puzzles.slice(0, 2).every((p) => p.alt === undefined), 'only the breaker has an alt');
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-8.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    for (const [hero, hint] of [[p.hero, p.hint] as const, ...(p.alt ?? []).map((a) => [a.hero, a.hint] as const)]) {
      assert.ok(fitsBox(hint, cols, 1), `"${hint}" is over one subtitle row`);
      assert.equal(hint, hint.toUpperCase());
      assert.ok(hint.includes(HERO_DEFS[hero].name.toUpperCase()), `${p.id}: ${hint} names ${hero}`);
      assert.ok(!/[0-9]/.test(hint) && !/seamless|robust|leverage|unlock|delve/i.test(hint) && !hasEmDash(hint), 'no key digits, no banned words');
      assert.ok(doc.includes(hint), `${p.id}: the hint is the one in docs/level-8.md`);
    }
  }
});

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close and music, which the grigori beat uses. */
function fakeBase(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); }, jingle: () => undefined, finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('stage 3.2: every beat has a trigger and a real script, in the spec\'s order, and the doors close and open on the grigori and clear beats', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['cipher1', 'cipher2']));
  const ids = S.beats.map((b) => b.id);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens or closes ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.includes(w.needs), `${b.id} needs ${w.needs}`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'pinned' || w.event === 'defended') assert.fail('no pinned boss and no defense in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('cipher_open'), { event: 'propCleared', prop: 'cipher1' });
  assert.deepEqual(when('cache_open'), { event: 'propCleared', prop: 'cipher2' });
  assert.deepEqual(when('level_clear'), { cleared: 'boss' });
  assert.deepEqual((when('grigori') as { needs: string }).needs, 'control');
  assert.deepEqual(S.beats.find((b) => b.id === 'lab')?.steps, [{ t: 'say', script: 'l8_lab' }, { t: 'wake', group: 'lab' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'grigori')?.steps,
    [{ t: 'close', prop: 'door1' }, { t: 'close', prop: 'door2' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l8_grigori' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'level_clear')?.steps,
    [{ t: 'open', prop: 'door1' }, { t: 'open', prop: 'door2' }, { t: 'say', script: 'l8_clear' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend')), 'no scare, no waves, no defense');
  // The triggers sit where the spec puts them.
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'bay', 'cipher_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['cache_hint', 'lab', 'control', 'grigori']) {
    assert.ok(through(['cipher1'], id), `${id} is reachable once cipher1 is read`);
    assert.ok(!through([], id), `${id} is not reachable with cipher1 shut`);
  }
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  const c1 = prop('cipher1'), c2 = prop('cipher2');
  assert.ok(rectOf('cipher_hint').ty + rectOf('cipher_hint').h <= c1.ty && rectOf('cipher_hint').ty >= c1.ty - 3, 'the cipher hint stands in front of cipher1, on the bay side');
  assert.ok(rectOf('cache_hint').tx + rectOf('cache_hint').w === c2.tx && rectOf('cache_hint').ty <= c2.ty, 'the cache hint stands in front of cipher2, on the hall side');
  assert.ok(rectTiles(rectOf('lab')).some(([x, y]) => inRoom('lab', x, y)) && rectTiles(rectOf('lab')).every(([x, y]) => x >= 11), 'the lab beat is the lab\'s doorway');
  assert.ok(rectTiles(rectOf('control')).every(([x, y]) => inRoom('control', x, y)), 'the control beat is inside the control room');
  const trig = rectTiles(rectOf('grigori'));
  assert.ok(trig.every(([x, y]) => inRoom('chamber', x, y)), 'the grigori trigger is inside the chamber');
  assert.ok(trig.every(([x]) => x >= prop('door1').tx + 2), 'a tile and more clear of the doors, so nobody stands in one when they shut');
  assert.equal(musicAfter(S.beats, ['start', 'control'], S.music), 'starcourt');
  assert.equal(musicAfter(S.beats, ['start', 'control', 'grigori'], S.music), 'clock', 'a retry after the beat stays on the boss track');
});

test('director: the beats run in route order, the doors shut before the script and the boss wakes after it, and the clear opens them', () => {
  const { env, log } = fakeBase({ lab: 11, boss: 1 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l8_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('bay')), ['say l8_bay']);
  assert.deepEqual(run(() => tick('cipher_hint')), ['say l8_cipher_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'cipher1' }])), ['say l8_cipher_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'other' }])), []);
  assert.deepEqual(run(() => tick('cache_hint')), ['say l8_cache_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'cipher2' }])), ['say l8_cache_done']);
  assert.deepEqual(run(() => tick('grigori')), [], 'the chamber waits for the control room');
  assert.deepEqual(run(() => tick('lab')), ['say l8_lab', 'wake lab']);
  assert.deepEqual(run(() => tick('control')), ['say l8_control']);
  assert.deepEqual(run(() => tick('grigori')), ['close door1', 'close door2', 'music clock', 'say l8_grigori', 'wake boss']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['open door1', 'open door2', 'say l8_clear', 'finish']);
  assert.ok(d.finished());
});

// ---------------------------------------------------------------- the scripts
test('stage 3.2: the 10 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to their voices', () => {
  const doc = readFileSync(new URL('../docs/level-8.md', import.meta.url), 'utf8');
  const listed = [...(/^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '').split('. ')[0]?.matchAll(/`([a-z0-9_]+)`/g) ?? []].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the ten');
  assert.deepEqual(L8_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l8_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l8 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L8_SCRIPTS) {
        assert.ok(s.lines.length >= 3 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
        for (const [i, l] of s.lines.entries()) {
          const shown = keyText(l.text);
          assert.ok(shown.length <= 96 && fitsBox(shown), `${device} ${s.id}[${i}] needs ${wrapText(shown).length} rows: ${shown}`);
          assert.ok(!/\{|\}/.test(shown), `${s.id}[${i}] has an unfilled token`);
        }
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
  const all = L8_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const by = (h: string): typeof all => all.filter((l) => l.who === h);
  const counts = new Map<string, number>();
  for (const l of all) counts.set(l.who, (counts.get(l.who) ?? 0) + 1);
  assert.equal([...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0], 'robin', 'Robin carries the level: nobody has more lines');
  assert.ok(by('robin').length >= 10 && by('dustin').length >= 6 && by('nancy').length >= 4 && by('eleven').length >= 4, 'Robin, Dustin, Nancy and Eleven all speak');
  assert.ok(all.every((l) => (l.who as string) !== 'grigori' && (l.who as string) !== 'narrator'), 'Grigori never speaks');
  assert.ok(by('robin').filter((l) => /'/.test(l.text.replace(/\w'\w/g, ''))).length >= 5, 'Robin reads signs out loud, in quotes');
  assert.ok(by('robin').filter((l) => /or '|\.\.\.|sure|I think|I hope/i.test(l.text)).length >= 5, 'and gets them wrong, or is not sure');
  assert.ok(by('nancy').every((l) => l.text.length <= 72), 'Nancy is flat and short');
  assert.ok(by('eleven').every((l) => l.text.length <= 44 && /[.!?]$/.test(l.text)), 'Eleven speaks in short full sentences');
  assert.equal(SCRIPTS.l8_control?.lines[0]?.who, 'dustin', 'Dustin explains the machine before anyone asks');
  assert.match(text('l8_control'), /boiler/);
  assert.match(text('l8_control'), /Key/);
  assert.match(text('l8_control'), /plate/);
  assert.match(text('l8_control'), /switch/);
  assert.match(text('l8_grigori'), /quarter/, 'the fight teaches his front guard');
  assert.match(text('l8_cipher_hint'), /stop/i, 'the door says stop');
  assert.match(text('l8_cipher_hint'), /Robin/);
  assert.match(text('l8_cache_hint'), /barracks/i);
  assert.match(text('l8_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l8_lab'), /\{swapOr\}/, 'the lab teaches the swap that frees a held hero');
  assert.match(text('l8_grigori'), /\{swapOr\}/);
  assert.ok(!all.some((l) => /\{swapTo\d\}/.test(l.text)), 'no line names a swap slot: the party is picked on the map');
  assert.ok(all.filter((l) => /it's opening/.test(l.text)).length >= 2, 'they know the Key is opening something');
  assert.ok(!all.some((l) => /portal|\bgate\b|mind flayer|upside|demogorgon|for sure/i.test(l.text)), 'and nobody says what, or how sure');
  assert.ok(!/\b(two|three|four|five|six|seven|eight|nine|\d+) soldiers\b/i.test(all.map((l) => l.text).join(' ')), 'nobody counts the soldiers, so the roster can change without the words');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
});

// ---------------------------------------------------------------- the bot's route
test('stage 3.2: the waypoints are reachable in order, cipher1 is opened by flag, the route skips the barracks and ends in the grigori trigger', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the lab and Grigori wake themselves');
    if (w.open) { assert.equal(w.open, 'cipher1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const flagged = S.waypoints.findIndex((w) => w.open);
  const [fx, fy] = tileOf(S.waypoints[flagged]?.x ?? 0, S.waypoints[flagged]?.y ?? 0);
  assert.ok(inRoom('bay', fx, fy) && Math.hypot(fx - 21.5, fy - 14) >= 3, 'cipher1 is read from the bay, a few tiles off, so the hall\'s soldiers cannot press up behind it while the bot fights through the door');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(rectTiles(rectOf('grigori')).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the grigori trigger');
  assert.ok(S.waypoints.every((w) => !inRoom('barracks', ...tileOf(w.x, w.y))), 'the route skips the barracks');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'bay', 'cipher_hint', 'lab', 'control', 'grigori']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(S.waypoints.length >= 20, `${S.waypoints.length} waypoints`);
});
