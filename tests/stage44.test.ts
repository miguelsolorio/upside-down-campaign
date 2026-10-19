// Stage 4.4, Vecna's lair, as data: the map and its rooms, the attic with its rug, its four orbs and Vecna on it, the doorways, the budget, the
// props, reachability (the house in route order, the attic sealed by its door), the checkpoints, the beats and the bot's route. The scripts and the
// director running the beats are in stage44-story.test.ts, and whole runs of the bot and the play scene in stage44-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import { ORB_AT } from '../src/gfx/tile_attic.ts';
import { botRoute, stageXp, tileOf } from './stage-helpers.ts';
import { BEAT_IDS, ROOMS, ROWS, RUG, S, at, ch, inRect, inRoom, kit, prop, propTiles, rectOf, rectTiles, roomOf, solid, when, xpOf } from './stage44-helpers.ts';
import type { TileRect } from '../src/world/types.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const HOUSE = 'ãäåæçèéê';
const ATTIC = 'ĆćĈĉĊ';
const OUTSIDE = 'Tpîïă';
const ORBS = ['orb1', 'orb2', 'orb3', 'orb4'];
const feet = (e: { tx: number; ty: number }): [number, number] => [e.tx * 16 + 8, e.ty * 16 + 12];

// ---------------------------------------------------------------- the map
test('stage 4.4: the map is 48 by 40, uses only the house, attic, lawn and edge tiles, is solid all round, and runs at night in the upside skin', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music, S.skin], ['4.4', "Vecna's lair", 'night', 'upside', 'upside']);
  assert.ok((S.enemyMult ?? 1) > 0 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.ok((S.xpMult ?? 1) >= 1 && (S.xpMult ?? 1) <= 4, `xpMult ${S.xpMult}`);
  assert.deepEqual([S.waves, S.puzzles, S.hazards, S.memory], [[], [], undefined, undefined], 'no waves, puzzles, hazards or memory room');
  const used = new Set(S.rows.join(''));
  for (const c of HOUSE + ATTIC + 'Tpîï') assert.ok(used.has(c), `the map uses the tile '${c}'`);
  assert.ok(![...used].some((c) => !(HOUSE + ATTIC + OUTSIDE).includes(c)), 'and nothing but the house, the attic, the lawn and the edge');
  // The attic letters stay inside the attic's 18 columns, and the house letters inside its box.
  for (const [y, row] of S.rows.entries()) for (const [x, c] of [...row].entries()) {
    if (ATTIC.includes(c)) assert.ok(x >= 15 && x <= 32 && y <= 14, `the attic tile at ${x},${y}`);
    if (HOUSE.includes(c)) assert.ok(x >= 9 && x <= 38 && y >= 13 && y <= 35, `the house tile at ${x},${y}`);
  }
});

test('stage 4.4: walls are a cap row over a face row looking onto the floor, and every doorway in them is two tiles wide or more', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has a cap above it, a cap sits on a wall and floor never has a cap above it, so no face is missing.
      if ('äå'.includes(c) && y + 1 < grid.h && !solid(x, y + 1)) assert.equal(ch(x, y - 1), 'ã', `the wall face at ${x},${y} has a cap above it`);
      if (c === 'ã' && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on a wall, not on floor`);
      if (!solid(x, y) && y > 0) assert.notEqual(ch(x, y - 1), 'ã', `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  // [name, x, y, w, h]: the floor in the wall, flanked by wall on its two ends.
  const doorways: [string, number, number, number, number][] = [
    ['the front door', 22, 34, 4, 2], ['the foyer to the hall', 11, 29, 3, 2], ['the hall to the parlor', 33, 24, 3, 2], ['the parlor to the dining room', 22, 22, 1, 2],
    ['the way up beside the stairs', 14, 18, 3, 2], ['the attic', 22, 13, 4, 2],
  ];
  for (const [name, x, y, w, h] of doorways) {
    for (const [u, v] of rectTiles({ tx: x, ty: y, w, h })) assert.equal(solid(u, v), false, `${name}: ${u},${v} is open floor`);
    if (w > 1) { assert.ok(w >= 2 && solid(x - 1, y) && solid(x + w, y) && solid(x - 1, y + 1) && solid(x + w, y + 1), `${name} is flanked by wall`); }
    else { assert.ok(h >= 2 && solid(x, y - 1) && solid(x, y + h), `${name} is flanked by wall`); }
  }
  // The stairs are a wall face: both rows of the wall, three tiles wide, with the gap beside them, and nowhere else.
  assert.equal([...S.rows.join('')].filter((c) => c === 'é').length, 6);
  for (const [x, y] of rectTiles({ tx: 11, ty: 18, w: 3, h: 2 })) assert.ok(ch(x, y) === 'é' && solid(x, y), `the stairs at ${x},${y}`);
  assert.ok(inRoom('dining', 12, 20) && inRoom('landing', 12, 17), 'between the dining room and the landing');
});

test('stage 4.4: the rooms are where the spec has them, rotted and overgrown, on the ground floor and the upper floor', () => {
  const count = (room: string, c: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('porch', startTx, startTy), 'the stage begins on the porch');
  assert.ok(count('porch', 'p') >= 20 && count('porch', 'î') >= 40 && count('porch', 'ï') >= 8 && count('porch', 'ă') >= 5, 'a porch of planks in a dead lawn, with veins and trees');
  assert.ok(count('foyer', 'ç') >= 20 && count('foyer', 'ê') >= 5, 'the foyer has a runner and furniture under sheets');
  assert.ok(count('hall', 'ç') >= 20 && count('hall', 'è') >= 3 && count('hall', 'ê') >= 4, 'the hall has a runner, holes in the boards and furniture');
  assert.ok(count('parlor', 'ç') >= 15 && count('parlor', 'ê') >= 4, 'the parlor has a rug and furniture');
  assert.ok(count('dining', 'ê') >= 8 && count('dining', 'ç') >= 8, 'the dining room has a table under a sheet and a rug');
  assert.ok(count('landing', 'ç') >= 20 && count('landing', 'è') >= 3 && count('landing', 'ê') >= 4, 'the landing has a runner, holes and furniture');
  for (const room of ['foyer', 'hall', 'parlor', 'dining', 'landing']) assert.ok(count(room, 'æ') + count(room, 'ç') > total(room) * 0.6, `${room} is mostly floor`);
  for (const y of [14, 19, 25, 30, 35]) assert.ok(rectTiles({ tx: 9, ty: y, w: 30, h: 1 }).filter(([x, v]) => ch(x, v) === 'å').length >= 2, `boarded windows in the face row ${y}`);
  for (const room of Object.keys(ROOMS)) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(roomOf(x, y) === room, `${x},${y} is in one room only`);
  // The ground floor has two clear rows in every column of the hall, the foyer and the landing, so a demodog and a hero can pass.
  const blocked = kit.blocked(new Set());
  for (const room of ['hall', 'foyer', 'landing']) {
    const r = ROOMS[room] as TileRect;
    for (let x = r.tx; x < r.tx + r.w; x++) assert.ok(rectTiles({ tx: x, ty: r.ty, w: 1, h: r.h }).filter(([u, v]) => !blocked[idx(u, v)]).length >= 2, `${room} has two clear rows at column ${x}`);
  }
});

// ---------------------------------------------------------------- the attic
test('stage 4.4: the attic is 18 tiles across on the sheet\'s layout, with the rug in the middle and a doorway in its bottom wall', () => {
  assert.equal(ch(15, 0) + ch(32, 0) + ch(15, 1) + ch(32, 1), 'ĆĆćć');
  for (let x = 15; x <= 32; x++) assert.ok(ch(x, 0) === 'Ć' && ch(x, 1) === 'ć', `the ridge and the knee wall at ${x}`);
  for (let y = 2; y <= 12; y++) {
    const row = ROWS[y]?.slice(15, 33);
    const rug = y >= 4 && y <= 7 ? 'ĉĉĉĉĉĉ' : 'ĈĈĈĈĈĈ';
    assert.equal(row, `ĆĊĊĊĈĈ${rug}ĈĈĊĊĊĆ`, `row ${y}: a roof tile, three of eave, two of floor and the rug between`);
  }
  assert.deepEqual([RUG.x0, RUG.x1, RUG.y0, RUG.y1, RUG.n], [21, 26, 4, 7, 24], 'a rug six tiles by four');
  assert.equal(RUG.x0 + RUG.x1 + 1, 15 + 32 + 1, 'in the middle of the room');
  assert.equal(ROWS[13]?.slice(15, 33), 'Ć'.repeat(7) + 'Ĉ'.repeat(4) + 'Ć'.repeat(7));
  assert.equal(ROWS[14]?.slice(15, 33), 'ć'.repeat(7) + 'Ĉ'.repeat(4) + 'ć'.repeat(7));
  assert.equal(ROWS[12]?.slice(22, 26), 'ĈĈĈĈ', 'the room is open over the doorway');
  for (const [x, y] of rectTiles(ROOMS.attic as TileRect)) assert.ok(roomOf(x, y) === 'attic' && ATTIC.includes(ch(x, y)), `${x},${y} is the attic`);
  // The sheet's room is 18 by 10 with the rug at its middle; this one is 18 by 15 with its bottom wall, and the map is about the spec's 48 by 40.
  assert.ok(Math.abs(grid.w - 48) <= 2 && Math.abs(grid.h - 40) <= 2);
});

test('stage 4.4: Vecna stands on the rug, and the four orbs at the offsets the attic\'s roots end at (ORB_AT), all dormant in `boss`', () => {
  const vecna = enemies.find((e) => e.id === 'vecna');
  assert.deepEqual([vecna?.type, vecna?.group, vecna?.dormant, vecna?.x, vecna?.tier], ['vecna', 'boss', true, undefined, undefined]);
  const [vx, vy] = feet(vecna as { tx: number; ty: number });
  assert.equal(vx, ((RUG.x0 + RUG.x1 + 1) * 16) / 2, 'in the middle of the rug');
  assert.equal(vy, RUG.y0 * 16 + 40, 'his feet 40 px under its top edge, where the roots meet');
  assert.equal(ch(Math.floor(vx / 16), Math.floor((vy - 4) / 16)), 'ĉ', 'on the rug');
  const want = [
    [RUG.x0 * 16 - ORB_AT.x, RUG.y0 * 16 + ORB_AT.top], [(RUG.x1 + 1) * 16 + ORB_AT.x, RUG.y0 * 16 + ORB_AT.top],
    [RUG.x0 * 16 - ORB_AT.x, (RUG.y1 + 1) * 16 + ORB_AT.bottom], [(RUG.x1 + 1) * 16 + ORB_AT.x, (RUG.y1 + 1) * 16 + ORB_AT.bottom],
  ];
  const orbs = enemies.filter((e) => e.type === 'orb');
  assert.deepEqual(orbs.map((o) => o.id), ORBS);
  orbs.forEach((o, i) => {
    assert.deepEqual([o.group, o.dormant, o.tier], ['boss', true, undefined], o.id);
    const [x, y] = feet(o);
    assert.ok(Math.abs(x - (want[i] as number[])[0]!) < 1e-6 && Math.abs(y - (want[i] as number[])[1]!) < 1e-6, `${o.id} stands at ${want[i]}, not ${x},${y}`);
    assert.equal(ch(Math.floor(x / 16), Math.floor((y - 4) / 16)), 'Ĉ', `${o.id} is on the floor beside the rug`);
  });
  // Nobody else is in the attic, and Vecna and his orbs are in no other room.
  assert.deepEqual(enemies.filter((e) => e.group === 'boss').map((e) => e.id), ['vecna', ...ORBS]);
  assert.deepEqual(enemies.filter((e) => inRoom('attic', Math.floor(feet(e)[0] / 16), Math.floor((feet(e)[1] - 4) / 16))).map((e) => e.group), Array(5).fill('boss'));
});

test('stage 4.4: clock_attic is solid on the attic\'s north wall and never broken, door_attic is open in the doorway, and the parlor has a clock and broken mirrors', () => {
  const c = prop('clock_attic');
  assert.deepEqual([c.prop, c.tx, c.ty, c.w, c.h, c.solid, c.hits, c.hitBy, c.state], ['clock', 19, 1, 16, 32, true, undefined, undefined, undefined]);
  assert.ok(ch(c.tx, c.ty) === 'ć' && inRoom('attic', c.tx, c.ty + 1), 'on the knee wall, over the floor');
  const d = prop('door_attic');
  assert.deepEqual([d.prop, d.tx, d.ty, d.w, d.h, d.state, d.solid, d.hitBy], ['door', 22, 14, 64, 16, 'open', false, undefined]);
  assert.deepEqual(propTiles(d), [[22, 14], [23, 14], [24, 14], [25, 14]], 'it fills the doorway\'s face row');
  for (const [x, y] of propTiles(d)) assert.equal(solid(x, y), false);
  assert.ok(inRoom('landing', 23, 15) && inRoom('attic', 23, 12), 'between the landing and the attic');
  // The chime Vecna sounds is shown over the first clock prop, so the attic's comes first; the parlor's is whole, solid and has no hits.
  const order = props.map((p) => p.id);
  assert.ok(order.indexOf('clock_attic') < order.indexOf('clock_parlor'));
  const p = prop('clock_parlor');
  assert.deepEqual([p.prop, p.w, p.h, p.solid, p.state, p.hits], ['clock', 16, 32, true, undefined, undefined]);
  assert.ok(ch(p.tx, p.ty) === 'ä' && inRoom('parlor', p.tx, p.ty + 1), 'the clock stands against the parlor\'s north wall');
  assert.equal(props.filter((q) => q.prop === 'clock').length, 2, 'two clocks, the attic\'s and the parlor\'s');
  const mirrors = props.filter((q) => q.prop === 'mirror');
  assert.equal(mirrors.length, 5);
  for (const m of mirrors) {
    assert.deepEqual([m.w, m.h, m.state, m.hitBy], [16, 16, 'open', undefined], `${m.id} is broken`);
    assert.ok(solid(m.tx, m.ty) && ch(m.tx, m.ty) === 'ä', `${m.id} hangs on a wall face`);
  }
  assert.equal(mirrors.filter((m) => inRoom('parlor', m.tx, m.ty + 1)).length, 3, 'three of them in the parlor');
  assert.ok(!enemies.some((e) => e.type === 'ghoul' || e.mirror !== undefined), 'no ghouls step out of them');
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 4.4: the lights are pools of window red and the attic\'s, and the two strings are the save points in route order, outside every wake trigger', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39 && ch(tx, ty) !== 'T', `the light at ${tx},${ty} is in the house, the attic or the yard`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_porch', 'lights_landing']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_porch', 'lights_landing']);
  const open = flood(new Set());
  const waking = ['house', 'stairs', 'vecna'].map((id) => rectTiles(rectOf(id)));
  S.checkpoints.forEach((c, i) => {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(waking.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the wake triggers`);
    assert.ok(inRoom(i === 0 ? 'porch' : 'landing', p.tx, p.ty) && inRoom(i === 0 ? 'porch' : 'landing', x, y), `${c.prop} hangs in the ${i === 0 ? 'porch' : 'landing'}`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  });
  assert.ok(prop('lights_porch').ty > prop('lights_landing').ty, 'the porch is first');
  assert.ok(!inRect(rectOf('vecna'), ...tileOf(S.checkpoints[1]?.x ?? 0, S.checkpoints[1]?.y ?? 0)), 'a retry from the landing is not in the attic');
});

// ---------------------------------------------------------------- spawns
test('stage 4.4: the start and every spawn, item and prop is on open ground, ids are unique, and the stage has no npcs', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  for (const e of enemies) { const [x, y] = feet(e); assert.equal(solid(Math.floor(x / 16), Math.floor((y - 4) / 16)), false, `${e.id} at ${e.tx},${e.ty}`); }
  for (const i of items) assert.equal(solid(i.tx, i.ty), false, `${i.id} at ${i.tx},${i.ty}`);
  // Props stand on open ground, except the mirrors and the clocks on the wall, which have their first tile in the face row.
  for (const p of props) {
    if (p.prop === 'mirror') continue;
    for (const [x, y] of propTiles(p)) assert.ok(!solid(x, y) || (p.prop === 'clock' && y === p.ty), `${p.id} stands on open ground at ${x},${y}`);
  }
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0);
  const blocked = kit.blocked(new Set());
  for (const e of enemies.filter((q) => q.group !== 'boss')) assert.equal(blocked[idx(Math.floor(feet(e)[0] / 16), Math.floor((feet(e)[1] - 4) / 16))], 0, `${e.id} stands clear of the furniture`);
  for (const i of items) assert.equal(blocked[idx(i.tx, i.ty)], 0, `${i.id} lies clear of the furniture`);
  const k = (kind: string): number => items.filter((i) => i.item === kind).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  for (const i of items) assert.ok(roomOf(i.tx, i.ty) !== null && roomOf(i.tx, i.ty) !== 'attic', `${i.id} lies in a room of the house or the porch`);
  assert.ok(new Set(items.map((i) => roomOf(i.tx, i.ty))).size >= 6, 'spread over the house');
});

test('stage 4.4: the groups are the spec\'s (foyer, landing, boss) and the XP before xpMult is 260 to 320', () => {
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  const kinds = (g: string): string[] => groups(g).map((e) => e.type).sort();
  assert.deepEqual(kinds('foyer'), ['demodog', 'demodog', 'demodog', 'vine', 'vine']);
  assert.deepEqual(kinds('landing'), ['demobat', 'demobat', 'demobat', 'demodog', 'demodog', 'pod', 'pod']);
  assert.deepEqual(kinds('boss'), ['orb', 'orb', 'orb', 'orb', 'vecna']);
  for (const g of ['foyer', 'landing', 'boss']) assert.ok(groups(g).every((e) => e.dormant), `${g} is dormant until its beat`);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['boss', 'dining', 'foyer', 'hall', 'landing', 'parlor']);
  for (const g of ['hall', 'parlor', 'dining']) assert.ok(groups(g).every((e) => !e.dormant && e.tier === undefined), `${g} is awake from the start`);
  for (const [g, room] of [['foyer', 'foyer'], ['landing', 'landing'], ['hall', 'hall'], ['parlor', 'parlor'], ['dining', 'dining'], ['boss', 'attic']] as const) {
    for (const e of groups(g)) assert.ok(inRoom(room, Math.floor(feet(e)[0] / 16), Math.floor((feet(e)[1] - 4) / 16)), `${e.id} is in the ${room}`);
  }
  assert.ok(enemies.every((e) => e.tier === undefined && ['demodog', 'vine', 'pod', 'demobat', 'vecna', 'orb'].includes(e.type)), 'chapter 2\'s foes, the demobat, and the boss');
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 260 && xp <= 320, `stage XP ${xp}`);
  assert.equal(xp, 280);
  assert.ok(Math.abs(stageXp(S) - xp * (S.xpMult ?? 1)) <= 8, `${stageXp(S)} XP after xpMult`);
  assert.equal(enemies.filter((e) => e.type === 'orb').reduce((n, e) => n + xpOf(e), 0), 0);
});

// ---------------------------------------------------------------- reachability
test('stage 4.4: the route runs porch, foyer, hall, parlor, dining room, landing, attic, and every room, spawn and item is reachable', () => {
  const open = flood(new Set());
  const blocked = kit.blocked(new Set());
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const e of enemies) assert.equal(open[idx(Math.floor(feet(e)[0] / 16), Math.floor((feet(e)[1] - 4) / 16))], 1, `${e.id} is reachable`);
  for (const i of items) assert.equal(open[idx(i.tx, i.ty)], 1, `${i.id} is reachable`);
  // Steps from the start, four ways, round the furniture: each room's nearest tile is farther than the one before it on the route.
  const dist = new Int32Array(grid.w * grid.h).fill(-1);
  const q: [number, number][] = [[startTx, startTy]];
  dist[idx(startTx, startTy)] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i] as [number, number];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h || dist[idx(nx, ny)] !== -1 || blocked[idx(nx, ny)]) continue;
      dist[idx(nx, ny)] = (dist[idx(x, y)] as number) + 1;
      q.push([nx, ny]);
    }
  }
  const nearest = (room: string): number => Math.min(...rectTiles(ROOMS[room] as TileRect).map(([x, y]) => dist[idx(x, y)] as number).filter((d) => d >= 0));
  const route = ['porch', 'foyer', 'hall', 'parlor', 'dining', 'landing', 'attic'].map(nearest);
  route.forEach((d, i) => { if (i > 0) assert.ok(d > (route[i - 1] as number), `room ${i} of the route is farther than room ${i - 1}: ${route.join(', ')}`); });
  // The wide doorways and necks on the route are two tiles across or more: the nav grid and the bot pass cleanly.
  const wide = (cells: [number, number][]): void => { for (const [x, y] of cells) assert.equal(open[idx(x, y)], 1, `the gap at ${x},${y} is open`); };
  wide([[22, 34], [23, 34], [24, 34], [25, 34], [22, 35], [25, 35], [11, 29], [12, 30], [13, 30], [33, 24], [34, 25], [35, 25], [22, 22], [22, 23], [14, 18], [15, 19], [16, 18], [22, 13], [25, 14]]);
  // The attic is a dead end behind its door: shut, nothing on the landing is reachable from the rug.
  const shut = new Uint8Array(blocked);
  for (const [x, y] of propTiles(prop('door_attic'))) shut[idx(x, y)] = 1;
  const seen = new Set<number>([idx(24, 9)]);
  const stack = [idx(24, 9)];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    for (const j of [i + 1, i - 1, i + grid.w, i - grid.w]) if (!shut[j] && !seen.has(j)) { seen.add(j); stack.push(j); }
  }
  assert.ok(rectTiles(ROOMS.attic as TileRect).every(([x, y]) => blocked[idx(x, y)] || seen.has(idx(x, y))), 'the whole attic is open to the party inside it');
  assert.ok(rectTiles(ROOMS.landing as TileRect).every(([x, y]) => !seen.has(idx(x, y))), 'and the landing is cut off from it');
});

// ---------------------------------------------------------------- the beats and the bot's route
test('stage 4.4: the beats are the spec\'s, in route order, and the rect beats are in the rooms they name', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS);
  assert.deepEqual(when('float'), { event: 'phase', spawn: 'vecna', phase: 2 });
  assert.deepEqual(when('burn'), { event: 'phase', spawn: 'vecna', phase: 3 });
  assert.deepEqual(when('level_clear'), { cleared: 'boss' });
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l13_start' }]);
  assert.deepEqual(steps('house'), [{ t: 'say', script: 'l13_house' }, { t: 'wake', group: 'foyer' }]);
  assert.deepEqual(steps('stairs'), [{ t: 'say', script: 'l13_stairs' }, { t: 'wake', group: 'landing' }]);
  assert.deepEqual(steps('vecna'), [{ t: 'close', prop: 'door_attic' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l13_vecna' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(steps('float'), [{ t: 'say', script: 'l13_float' }]);
  assert.deepEqual(steps('burn'), [{ t: 'say', script: 'l13_burn' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l13_clear' }, { t: 'open', prop: 'door_attic' }, { t: 'finish' }]);
  assert.equal(S.beats.filter((b) => b.steps.some((st) => st.t === 'music')).length, 1, 'the clock track starts at the vecna beat only');
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend' && st.t !== 'leave' && st.t !== 'recruit' && st.t !== 'curse' && st.t !== 'walkman')), 'no scare, waves, curse beat or Walkman: Vecna\'s clock does the cursing');
  // Every chain waits on rect beats: `vecna` needs `stairs`, and the two beats that wait on an event (the phases) have nothing waiting on them.
  const v = when('vecna') as { rect: TileRect; needs: string };
  assert.equal(v.needs, 'stairs');
  assert.ok('rect' in (when('stairs') as object) && 'rect' in (when('house') as object) && 'rect' in (when('start') as object));
  assert.ok(S.beats.every((b) => !('after' in b.when)), 'no beat follows another');
  assert.ok(S.beats.filter((b) => 'needs' in b.when).every((b) => 'rect' in (S.beats.find((o) => o.id === (b.when as { needs: string }).needs)?.when ?? {})), 'and a need is always a rect beat');
  // The triggers sit where the spec puts them.
  const open = flood(new Set());
  for (const id of ['start', 'house', 'stairs', 'vecna']) {
    assert.ok(rectTiles(rectOf(id)).every(([x, y]) => open[idx(x, y)] === 1), `${id}'s rect is open floor`);
  }
  assert.ok(rectTiles(rectOf('start')).every(([x, y]) => inRoom('porch', x, y)), 'the start beat is the porch');
  assert.ok(rectTiles(rectOf('house')).every(([x, y]) => inRoom('foyer', x, y)), 'the house beat is the foyer');
  assert.ok(rectTiles(rectOf('stairs')).every(([x, y]) => inRoom('dining', x, y) && y <= 22 && x <= 16), 'the stairs beat is the dining room\'s floor at the foot of the stairs');
  assert.ok(rectTiles(rectOf('vecna')).every(([x, y]) => inRoom('attic', x, y)), 'the vecna beat is the attic');
  // Followers trail the leader by about three tiles: with the rect's last row at 9, nobody is in the doorway (rows 13 and 14) when the door shuts.
  assert.ok(rectOf('vecna').ty + rectOf('vecna').h - 1 <= 9 && 14 - 9 >= 5, 'the leader is five rows from the door');
  assert.ok(rectTiles(rectOf('vecna')).every(([x, y]) => !inRect({ tx: 22, ty: 13, w: 4, h: 2 }, x, y)));
});

test('stage 4.4: the waypoints are open ground, reachable in order, flag nothing, and cross every beat in order to end inside the attic\'s', () => {
  const open = flood(new Set());
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(open[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable`);
    assert.deepEqual(Object.keys(w).sort(), ['x', 'y'], 'no gaps, gates or groups on this route');
    assert.equal(kit.blocked(new Set())[idx(x, y)], 0, `waypoint ${i} is clear of furniture`);
  });
  const [fx, fy] = tileOf(S.waypoints[0]?.x ?? 0, S.waypoints[0]?.y ?? 0);
  assert.ok(inRoom('porch', fx, fy), 'the route starts on the porch');
  const firstIn = (id: string): number => S.waypoints.findIndex((w) => inRect(rectOf(id), ...tileOf(w.x, w.y)));
  const order = ['start', 'house', 'stairs', 'vecna'].map(firstIn);
  assert.ok(order.every((i) => i >= 0), `the route enters every rect: ${order}`);
  order.forEach((n, i) => { if (i > 0) assert.ok(n > (order[i - 1] as number), `rect ${i} comes after rect ${i - 1}`); });
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('vecna'), lx, ly) && inRoom('attic', lx, ly), 'the last waypoint is inside the vecna trigger');
  // The bot stops within 10 px of a waypoint, and its tile is read from y - 4: the last one is deep enough that it stops inside the rect.
  assert.ok(ly * 16 + 12 + 10 < (rectOf('vecna').ty + rectOf('vecna').h) * 16 + 4, 'even when it stops short of the last one');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'house', 'stairs', 'vecna']) assert.ok(crossed(id), `the bot walks through ${id}`);
  for (const room of ['porch', 'foyer', 'hall', 'parlor', 'dining', 'landing', 'attic']) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => route.tiles.has(idx(x, y))), `and through the ${room}`);
  assert.ok(S.waypoints.length >= 20, `${S.waypoints.length} waypoints`);
});
