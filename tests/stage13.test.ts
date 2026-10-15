// Stage 1.3, Hawkins Middle School, as data: the map and its rooms, the gym court, the budget, the four gates in route order,
// every gate's hero, the checkpoints and the bot's route. The beats, the director and the scripts are in stage13-beats.test.ts, the
// real sim and whole runs in stage13-play.test.ts, and the shared plumbing and the boss hint in stage13-plumbing.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILES } from '../src/core/tiles.ts';
import { ENEMY_DEFS, ELITE } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { fitsBox } from '../src/core/text.ts';
import { STAGE_13 as S, ROWS } from '../src/world/stages/stage13.ts';
import { LIGHTS } from '../src/world/stages/stage13_data.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, propTiles, rectTiles, stageKit, stageXp, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const GATES = ['van1', 'vines1', 'door1'];
const ALL = new Set(GATES);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The rooms, as tile rectangles of their floors. */
const ROOMS: Record<string, TileRect> = {
  lot: { tx: 1, ty: 30, w: 20, h: 9 }, hall: { tx: 23, ty: 35, w: 23, h: 4 }, science: { tx: 24, ty: 27, w: 19, h: 6 },
  cafeteria: { tx: 24, ty: 18, w: 23, h: 7 }, gym: { tx: 29, ty: 4, w: 18, h: 12 },
};
const COURT = ROOMS.gym as TileRect;
const roomCount = (room: string, chars: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => chars.includes(ch(x, y))).length;

// ---------------------------------------------------------------- the map
test('stage 1.3: the map is 48 by 40, uses only legend characters, is walled all round and runs at night with the upside theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(grid.solid[idx(x, 0)] && grid.solid[idx(x, grid.h - 1)], 'top and bottom edges are solid');
  for (let y = 0; y < grid.h; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(grid.w - 1, y)], 'left and right edges are solid');
  assert.deepEqual([S.id, S.name, S.time, S.music], ['1.3', 'Hawkins Middle School', 'night', 'upside']);
  assert.ok((S.enemyMult ?? 1) >= 1, 'the school is no easier than the difficulty setting');
  assert.deepEqual(S.waves, [], 'no ambush waves: the boss is its own group');
  const used = new Set(S.rows.join(''));
  for (const c of 'njuJKAPQRIZ#%') assert.ok(used.has(c), `the map uses the school tile '${c}'`);
  for (const c of 'g=_Tl') assert.ok(used.has(c), `the lot uses the outdoor tile '${c}'`);
  for (const c of 'BUM') assert.ok(used.has(c), `the map uses '${c}'`);
});

test('stage 1.3: every room has its own floor and dressing, with a cap row over a wall face and lockers on both sides of the hall', () => {
  const floors: [string, string, number][] = [['lot', 'g=_T', 0.7], ['hall', 'nA', 0.7], ['science', 'nUPB', 0.8], ['cafeteria', 'jUIZ', 0.8], ['gym', 'uUM', 0.9]];
  for (const [room, chars, share] of floors) {
    const r = ROOMS[room] as TileRect;
    assert.ok(roomCount(room, chars) >= r.w * r.h * share, `${room} is mostly '${chars}'`);
  }
  assert.ok(roomCount('lot', '=') >= 100 && roomCount('lot', '_') >= 10 && roomCount('lot', 'g') >= 15, 'road, roadline and gravel in the lot');
  assert.ok(roomCount('science', 'P') >= 16 && roomCount('science', 'B') >= 6, 'desks and lab benches in the science room');
  assert.ok(roomCount('cafeteria', 'I') >= 20 && roomCount('cafeteria', 'Z') >= 7, 'tables and the serving counter in the cafeteria');
  assert.ok(roomCount('cafeteria', 'j') >= 100, 'the cafeteria floor is checker');
  assert.equal(S.rows[34]?.slice(23, 46).replace(/[nR]/g, '').length > 10, true, 'lockers along the hall north wall');
  assert.ok([...(S.rows[38] ?? '')].filter((c) => c === 'A').length >= 8, 'and along its south side');
  assert.ok(S.rows[34]?.includes('RR'), 'the trophy case is in the hall');
  assert.ok(S.rows[26]?.includes('QQQQ'), 'the chalkboard hangs on the science room wall');
  // A wall is a cap row over a face row: every face row has a cap or a face above it.
  for (let x = 24; x < 43; x++) assert.ok('KJ'.includes(ch(x, 25)) && 'JQ'.includes(ch(x, 26)) || ch(x, 26) === 'n', `science north wall at ${x}`);
  for (let x = 24; x < 47; x++) assert.equal(ch(x, 16), x >= 44 && x <= 45 ? 'u' : 'K', `cafeteria north wall cap at ${x}`);
  const inLot = (x: number, y: number): boolean => x <= 22 && y >= 28;
  for (const [y, row] of S.rows.entries()) for (const [x, c] of [...row].entries()) if ('g=_l'.includes(c)) assert.ok(inLot(x, y), `outdoor tile '${c}' at ${x},${y} is outside the lot`);
});

test('stage 1.3: the brick facade has lit windows, the lot has lamps with pools, and the halls get a few light entries', () => {
  const windows = [...(S.rows[28] ?? '')].flatMap((c, x) => (c === '%' && x % 2 === 1 ? [x] : []));
  assert.ok(windows.length >= 9, `${windows.length} window columns along the facade`);
  const lamps = [...S.rows.entries()].flatMap(([y, row]) => [...row].flatMap((c, x) => (c === 'l' ? [[x, y]] : [])));
  assert.ok(lamps.length >= 3, 'three lamps in the lot');
  for (const [x, y] of lamps as [number, number][]) {
    assert.ok(LIGHTS.some((l) => Math.hypot(l.x - (x * 16 + 8), l.y - (y * 16 + 4)) < 8), `lamp ${x},${y} has its pool`);
  }
  assert.equal(S.lights, LIGHTS);
  assert.ok(LIGHTS.length >= 6, 'lamps plus a vending glow and the exit signs');
  const inside = LIGHTS.filter((l) => l.x > 23 * 16);
  assert.ok(inside.length >= 3, `${inside.length} lights inside the school`);
  for (const l of LIGHTS) assert.ok(l.r >= 20 && l.r <= 60, 'pools stay between 20 and 60 px');
});

test('stage 1.3: the growth thickens toward the gym: none in the lot or the hall, a little in the science room, more in the cafeteria, most in the gym', () => {
  const growth = (room: string): number => {
    const r = ROOMS[room] as TileRect;
    return rectTiles({ tx: r.tx - 1, ty: r.ty - 1, w: r.w + 2, h: r.h + 2 }).filter(([x, y]) => 'UM'.includes(ch(x, y))).length;
  };
  assert.equal(growth('lot') + growth('hall'), 0, 'nothing has come through near the way in');
  assert.ok(growth('science') >= 4, 'a little in the science room, out of the sink corner');
  assert.ok(growth('cafeteria') > growth('science') + 4, 'more in the cafeteria');
  assert.ok(growth('gym') > growth('cafeteria') * 1.5, 'the most in the gym');
  const mass = (room: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === 'M').length;
  assert.ok(mass('gym') > mass('cafeteria') && mass('cafeteria') >= mass('science'), 'and the solid mass gets thicker the same way');
});

// ---------------------------------------------------------------- the gym court
test('stage 1.3: the gym is an open court 18 by 12 with bleachers along the north wall and a wall on every side', () => {
  const floor = rectTiles(COURT).filter(([x, y]) => !grid.solid[idx(x, y)]);
  assert.ok(floor.length >= 180, `${floor.length} walkable tiles in a court of ${COURT.w * COURT.h}`);
  for (let x = COURT.tx; x < COURT.tx + COURT.w; x++) {
    assert.ok('#'.includes(ch(x, 2)) && ch(x, 3) === '#', `bleachers over the court at ${x}`);
    assert.ok(grid.solid[idx(x, 3)], 'the bleachers are solid');
    // The south wall is whole except the doorway of the fire door.
    assert.equal(grid.solid[idx(x, 16)], x === 44 || x === 45 ? 0 : 1, `south wall at ${x}`);
  }
  for (let y = 1; y <= 16; y++) assert.ok(grid.solid[idx(28, y)] || (y >= 4 && y <= 15 && grid.solid[idx(29, y)]) || y === 16, `west wall at ${y}`);
  for (let y = 4; y <= 15; y++) assert.ok(grid.solid[idx(28, y)] && grid.solid[idx(47, y)], `west and east walls at row ${y}`);
  for (const [x, y] of rectTiles({ tx: COURT.tx, ty: COURT.ty, w: COURT.w, h: 1 })) assert.equal(ch(x, y - 1), '#', `the north edge of the court is bleachers at ${x},${y}`);
});

test('stage 1.3: every charge ends in a wall: from every court tile, in sixteen directions, a straight run meets a solid tile within the charge cap', () => {
  // A charge runs at 4.2 px a frame for at most 150 frames: 630 px. Hero shots and walks are not the question here.
  const capPx = ENEMY_DEFS.demogorgon.x.chargeSpeed * 150;
  const solidAt = (x: number, y: number): boolean => grid.solid[idx(Math.floor(x / 16), Math.floor((y - 4) / 16))] === 1;
  for (const [tx, ty] of rectTiles(COURT)) {
    if (grid.solid[idx(tx, ty)]) continue;
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8, ux = Math.cos(a), uy = Math.sin(a);
      let d = 0;
      while (d < capPx && !solidAt(tx * 16 + 8 + ux * d, ty * 16 + 12 + uy * d)) d += 2;
      assert.ok(d < capPx, `a charge from ${tx},${ty} at heading ${k * 22.5} does not hit a wall`);
    }
  }
});

test('stage 1.3: the wall splits on the west side, where the boss waits, with mass in the wall and growth in front of it', () => {
  const mass = [...Array(16).keys()].filter((y) => ch(28, y) === 'M');
  assert.ok(mass.length >= 4, `${mass.length} mass tiles in the west wall`);
  const demo = enemies.find((e) => e.id === 'demo') as (typeof enemies)[number];
  assert.ok(demo.tx - 28 <= 5 && mass.some((y) => Math.abs(y - demo.ty) <= 2), 'the boss stands in front of the split');
  assert.equal(grid.solid[idx(demo.tx, demo.ty)], 0);
});

// ---------------------------------------------------------------- spawns
test('stage 1.3: the start and every spawn are on walkable ground, ids are unique, and the start is quiet and outdoors', () => {
  assert.equal(grid.solid[idx(startTx, startTy)], 0, 'start tile');
  assert.ok('g=_'.includes(ch(startTx, startTy)), 'the level begins outside, in the lot');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(grid.solid[idx(s.tx, s.ty)], 0, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 8, `${e.id} is too close to the start`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(npcs.length, 0, 'there are no npcs');
  assert.equal(S.spawns.length, ids.length);
  for (const e of enemies.filter((q) => q.patrol)) for (const p of e.patrol ?? []) assert.equal(grid.solid[idx(p.tx, p.ty)], 0, `${e.id} patrols over open ground`);
});

test('stage 1.3: the roster is five agents, an elite agent, six rats and the boss, worth 90 to 115 XP', () => {
  assert.equal(enemies.reduce((sum, e) => sum + xpOf(e), 0), 140, 'at the enemies\' own XP, before the stage\'s xpMult');
  const xp = stageXp(S);
  assert.ok(xp >= 90 && xp <= 115, `stage XP ${xp}`);
  assert.equal(xp, 101);
  const of = (type: string, elite: boolean): typeof enemies => enemies.filter((e) => e.type === type && (e.tier === 'elite') === elite);
  assert.equal(of('agent', false).length, 5);
  assert.equal(of('agent', true).length, 1);
  assert.equal(of('rat', false).length, 6);
  assert.equal(enemies.filter((e) => e.type === 'demogorgon').length, 1);
  assert.equal(enemies.length, 13);
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.equal(groups('lot').length, 2);
  assert.equal(groups('agents1').length, 3);
  assert.ok(groups('agents1').some((e) => e.tier === 'elite'), 'the elite hunts in the hall');
  assert.equal(groups('sci').length, 1);
  assert.equal(groups('rats1').length, 6);
  assert.deepEqual(groups('boss').map((e) => e.id), ['demo']);
  assert.ok(groups('boss').every((e) => e.dormant) && groups('rats1').every((e) => e.dormant), 'the rats and the boss sleep until their beats');
  for (const g of ['lot', 'agents1', 'sci']) assert.ok(groups(g).every((e) => !e.dormant && (e.patrol?.length ?? 0) >= 2), `${g} is awake and paces`);
  const inRoom = (e: (typeof enemies)[number], room: string): boolean => rectTiles(ROOMS[room] as TileRect).some(([x, y]) => x === e.tx && y === e.ty);
  assert.ok(groups('lot').every((e) => inRoom(e, 'lot')) && groups('agents1').every((e) => inRoom(e, 'hall')), 'the lot and the hall hold their own');
  assert.ok(groups('sci').every((e) => inRoom(e, 'science')) && groups('rats1').every((e) => inRoom(e, 'cafeteria')) && groups('boss').every((e) => inRoom(e, 'gym')));
  for (const e of groups('rats1')) assert.equal(ch(e.tx, e.ty + 1), 'Z', `${e.id} waits behind the serving counter`);
  const kind = (k: string): number => items.filter((i) => i.item === k).length;
  assert.deepEqual([kind('eggo'), kind('coke'), kind('quarter')], [3, 2, 10]);
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom(i as never, 'gym')), 'an Eggo in the gym, before the boss wakes');
  const demoRect = (S.beats.find((b) => b.id === 'demogorgon')?.when as { rect: TileRect }).rect;
  const eggo = items.find((i) => i.item === 'eggo' && inRoom(i as never, 'gym')) as (typeof items)[number];
  assert.ok(!rectTiles(demoRect).some(([x, y]) => x === eggo.tx && y === eggo.ty), 'and outside the trigger that wakes it');
});

test('stage 1.3: props sit where the art expects them, and each gate fills its gap', () => {
  const dressing = props.filter((p) => !['door', 'vines', 'firebox'].includes(p.prop));
  for (const p of dressing) for (const [x, y] of propTiles(p)) assert.equal(grid.solid[idx(x, y)], 0, `${p.id} stands on open ground at ${x},${y}`);
  const van = prop('van1');
  assert.deepEqual([van.prop, van.pushBy, van.w, van.h], ['van', 'push', undefined, undefined], 'a full-size van, like the one by the lamps');
  // The side door is two tiles tall through the lot's two-tile wall, and the van is parked in the lot across all of it.
  for (const y of [van.ty, van.ty + 1]) {
    for (const x of [van.tx + 3, van.tx + 4]) assert.equal(ch(x, y), 'n', `the side door is floor at ${x},${y}`);
  }
  for (const x of [van.tx + 3, van.tx + 4]) assert.ok(ch(x, van.ty - 1) === '%' && ch(x, van.ty + 2) === '%', 'brick above and below the door');
  const vines = prop('vines1');
  assert.deepEqual([vines.prop, vines.hitBy, vines.w, vines.h, vines.solid], ['vines', 'burn', 32, 16, true]);
  assert.ok(grid.solid[idx(vines.tx - 1, vines.ty)] && grid.solid[idx(vines.tx + 2, vines.ty)], 'vines1 fills the back door, wall to wall');
  assert.deepEqual([vines.tx, vines.ty], [24, 26]);
  const door = prop('door1');
  assert.deepEqual([door.prop, door.w, door.h], ['door', 32, 16]);
  assert.ok(grid.solid[idx(door.tx - 1, door.ty)] && grid.solid[idx(door.tx + 2, door.ty)], 'door1 fills the fire door doorway, wall to wall');
  const box = prop('firebox1');
  assert.deepEqual([box.prop, box.hitBy], ['firebox', 'shoot']);
  assert.equal(ch(box.tx, box.ty), 'J', 'the firebox hangs on a wall face');
  assert.equal(ch(box.tx, box.ty + 1), 'j', 'a strip of floor under it, behind the counter');
  assert.equal(ch(box.tx, box.ty + 2), 'Z', 'with the serving counter in front of that');
  assert.ok(box.tx < COURT.tx - 1, 'west of the gym court, so a stray rocket from the court cannot reach it');
  assert.equal(props.filter((p) => p.prop === 'van').length, 2, 'two vans: the gate and the dressing');
  assert.equal(props.filter((p) => p.prop === 'bike').length, 2, 'two bikes');
  assert.equal(props.filter((p) => p.prop === 'lights').length, 3);
  assert.ok(prop('van2').pushBy === undefined && prop('van2').hitBy === undefined, 'the second van asks for nothing');
});

// ---------------------------------------------------------------- reachability
const lotP = [10, 34], hallP = [30, 36], sciP = [30, 30], cafP = [35, 23], gymP = [38, 9];

test('stage 1.3: van1, vines1 and door1 cut the route in that order, with every solid prop in the way', () => {
  const reach = (open: string[], p: number[]): number => at(flood(new Set(open)), p[0] as number, p[1] as number);
  assert.equal(reach([], lotP), 1, 'the lot is open at the start');
  for (const p of [hallP, sciP, cafP, gymP]) assert.equal(reach([], p), 0, `${p} is cut off at the start`);
  assert.equal(reach(['vines1', 'door1'], hallP), 0, 'the later gates do nothing before the van');
  for (const p of [hallP, sciP]) assert.equal(reach(['van1'], p), 1, `${p} after the van`);
  for (const p of [cafP, gymP]) assert.equal(reach(['van1'], p), 0, `${p} is still past the vines`);
  assert.equal(reach(['van1', 'door1'], cafP), 0, 'the fire door comes after the vines, not instead of them');
  assert.equal(reach(['van1', 'vines1'], cafP), 1);
  assert.equal(reach(['van1', 'vines1'], gymP), 0, 'the fire door still holds the gym');
  assert.equal(reach(GATES, gymP), 1, 'open, the route runs through to the gym');
});

test('stage 1.3: with every gate open nothing is boxed in, and every spawn is reachable', () => {
  const open = flood(ALL);
  const blocked = kit.blocked(ALL);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) {
    assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  }
});

test('stage 1.3: nothing worth a detour lies within the bot\'s pickup reach on the far side of a shut gate', () => {
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

test('stage 1.3: three lights, each reachable and lit before a hard stretch', () => {
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_lot', 'lights_hall', 'lights_gym']);
  for (const c of S.checkpoints) {
    assert.ok(props.some((p) => p.id === c.prop && p.prop === 'lights'));
    const [x, y] = tileOf(c.x, c.y);
    assert.equal(at(flood(ALL), x, y), 1, `checkpoint ${c.prop} is walkable`);
    const p = prop(c.prop);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
  }
  const tile = (i: number): [number, number] => tileOf(S.checkpoints[i]?.x ?? 0, S.checkpoints[i]?.y ?? 0);
  const [lx, ly] = tile(0), [hx, hy] = tile(1), [gx, gy] = tile(2);
  assert.ok(at(flood(new Set()), lx, ly) && Math.hypot(lx - startTx, ly - startTy) < 6, 'lights_lot is at the start');
  assert.ok(!at(flood(new Set()), hx, hy) && at(flood(new Set(['van1'])), hx, hy), 'lights_hall is behind the van');
  assert.ok(!at(flood(new Set(['van1', 'vines1'])), gx, gy) && at(flood(ALL), gx, gy), 'lights_gym is behind the fire door');
  const trig = (S.beats.find((b) => b.id === 'demogorgon')?.when as { rect: TileRect }).rect;
  assert.ok(!rectTiles(trig).some(([x, y]) => x === gx && y === gy), 'lights_gym is outside the boss trigger, so a retry does not wake it at once');
  const gymBeat = (S.beats.find((b) => b.id === 'gym')?.when as { rect: TileRect }).rect;
  assert.ok(Math.hypot(gx - (gymBeat.tx + gymBeat.w / 2), gy - (gymBeat.ty + gymBeat.h / 2)) < 6, 'and by the gym doors');
});

// ---------------------------------------------------------------- the gates and their heroes
const HEROES = ['mike', 'dustin', 'lucas', 'eleven'] as const;

test('stage 1.3: every gate has exactly one hero who opens it, and the puzzles name that hero and their hint', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['van', 'vines', 'firebox', 'finish']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['van_hint', 'vines_hint', 'firebox_hint', 'pinned']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['van1', 'vines1', 'firebox1', 'demo']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['eleven', 'dustin', 'lucas', 'eleven']);
  assert.deepEqual(S.puzzles.map((p) => p.enemy === true), [false, false, false, true]);
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const target = props.find((x) => x.id === p.prop);
    if (p.enemy) {
      assert.ok(enemies.some((e) => e.id === p.prop && e.type === 'demogorgon'), `${p.id}: the spawn ${p.prop} is the Demogorgon`);
      assert.equal(HERO_DEFS[p.hero].special.name, 'Mind Blast', 'only the Mind Blast finishes it');
      assert.ok(HERO_DEFS[p.hero].special.power > 0);
      continue;
    }
    assert.ok(target, `${p.id}: prop ${p.prop} exists`);
    const need = target?.hitBy ?? target?.pushBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    const can = HEROES.filter((h) => HERO_DEFS[h].utilities.includes(need as never));
    assert.deepEqual(can, [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
  // Every gate is a puzzle's own prop or the door a puzzle opens.
  for (const g of GATES) assert.ok(S.puzzles.some((p) => p.prop === g || p.blocks?.includes(g)), `${g} belongs to a puzzle`);
  assert.deepEqual(S.puzzles.find((p) => p.id === 'firebox')?.blocks, ['door1']);
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-3.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-3.md`);
  }
});

// ---------------------------------------------------------------- the bot
test('stage 1.3: the bot waypoints are reachable in order and flag the gates and the rats, ending inside the boss trigger', () => {
  const open = new Set<string>();
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y}`);
    if (w.open) open.add(w.open);
  });
  assert.deepEqual(S.waypoints.flatMap((w) => (w.open ? [w.open] : [])), GATES, 'the bot opens van1, vines1 and door1 in route order');
  assert.deepEqual(S.waypoints.flatMap((w) => (w.wake ? [w.wake] : [])), ['rats1'], 'and wakes only the rats');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot has a path between every pair of waypoints');
  const trig = (S.beats.find((b) => b.id === 'demogorgon')?.when as { rect: TileRect }).rect;
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(rectTiles(trig).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the demogorgon trigger');
  // A flagged gate is opened from the near side, not from inside it.
  for (const w of S.waypoints.filter((q) => q.open)) {
    const g = prop(w.open as string);
    const [x, y] = tileOf(w.x, w.y);
    assert.ok(Math.hypot(x - g.tx, y - g.ty) < 8, `${w.open} is opened close by`);
  }
});
