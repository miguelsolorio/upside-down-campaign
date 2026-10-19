// Stage 4.2, the Hellfire Club and the Creel House, as data: the map and its rooms, the budget, the mirrors and the clock, reachability
// (the foyer behind mirror1, the pantry behind mirror4), the checkpoints, the puzzles and the bot's route. The beats and the scripts are
// in stage42-story.test.ts, and whole runs of the bot and the play scene in stage42-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { CHIME_FRAMES } from '../src/combat/curse.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { HINT_AFTER, createPuzzleTracker } from '../src/world/puzzles.ts';
import type { PropView } from '../src/core/types.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, tileOf } from './stage-helpers.ts';
import { GATES, ROOMS, ROWS, S, at, ch, inRect, inRoom, kit, prop, propTiles, rectOf, rectTiles, roomOf, solid, xpOf } from './stage42-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const CLUB = 'ØÙÚÛÜÝßàáâ';
const HOUSE = 'ãäåæçèéê';
const SCHOOL = 'nJKARjP';
const TOWN = '.,f-=_/TtbkrFlmpHhd';
const FACE = 'ÙÚÛÜÝßäåJAR';
const CAP = 'ØãK';

// ---------------------------------------------------------------- the map
test('stage 4.2: the map is 48 by 40, uses only the club, school, town and house tiles, is solid all round and runs at night with the hawkins theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['4.2', 'The Creel House', 'night', 'hawkins']);
  assert.ok((S.enemyMult ?? 1) > 0 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.ok((S.xpMult ?? 1) >= 1 && (S.xpMult ?? 1) <= 4, `xpMult ${S.xpMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set(S.rows.join(''));
  for (const c of CLUB + HOUSE) assert.ok(used.has(c), `the map uses the tile '${c}'`);
  for (const c of 'nKARjP.-=_/lFpHhdT') assert.ok(used.has(c), `the map uses the tile '${c}' of the school and the street`);
  assert.ok(![...used].some((c) => !(CLUB + HOUSE + SCHOOL + TOWN).includes(c)), 'and nothing but the club, school, town and house tiles');
  // The club's banner is a run of posters and there is a lone one too; the D&D table is one block.
  assert.ok(S.rows.some((r) => r.includes('ÛÛ')) && S.rows.some((r) => /[^Û]Û[^Û]/.test(r)), 'a banner and a lone poster');
  assert.ok([...S.rows.join('')].filter((c) => c === 'â').length >= 6, 'with a table for the candles');
  assert.ok([...S.rows.join('')].filter((c) => c === 'á').length >= 5, 'and desks in rows');
  assert.equal(S.rows.join('').split('Û').length - 1, 3, 'two posters make the banner, one stands alone');
});

test('stage 4.2: walls are a cap row over a face row looking onto the floor, and every doorway in them is two tiles wide or more', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has the cap row above it.
      if (FACE.includes(c) && y + 1 < grid.h && !solid(x, y + 1)) assert.ok(CAP.includes(ch(x, y - 1)), `the wall face at ${x},${y} has a cap above it`);
      if (CAP.includes(c) && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on a wall, not on floor`);
      if (!solid(x, y) && y > 0) assert.ok(!CAP.includes(ch(x, y - 1)), `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  // Doorways, as the rectangles they open: [x, y, w, h] with the floor either side of them open and the walls beside them solid.
  const doorways: [string, number, number, number, number][] = [
    ['the club to the school hall', 13, 35, 1, 3], ['the school doors', 32, 32, 3, 2], ['the yard gate', 38, 26, 3, 1], ['the front door', 37, 19, 3, 2],
    ['mirror1', 40, 13, 2, 2], ['the hall to the dining room', 24, 13, 3, 2], ['mirror4', 15, 13, 2, 2], ['the hall to the parlor', 24, 7, 3, 2],
    ['the parlor to the back hall', 28, 4, 1, 3], ['door_back', 46, 4, 1, 2],
  ];
  for (const [name, x, y, w, h] of doorways) {
    for (const [u, v] of rectTiles({ tx: x, ty: y, w, h })) assert.ok(!(grid.solid[idx(u, v)] === 1), `${name}: ${u},${v} is open floor`);
    if (w > 1) { assert.ok(solid(x - 1, y) && solid(x + w, y), `${name} is flanked by wall`); assert.ok(w >= 2, `${name} is wide enough`); } else assert.ok(h >= 2 && solid(x, y - 1) && solid(x, y + h), `${name} is flanked by wall`);
  }
});

test('stage 4.2: the rooms are where the spec has them, in the club, the school, the street, the yard and the house', () => {
  const count = (room: string, c: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('club', startTx, startTy), 'the stage begins in the Hellfire Club');
  assert.ok(count('club', 'à') > total('club') * 0.6, 'the club is linoleum');
  assert.ok(count('club', 'á') >= 5 && count('club', 'â') >= 6, 'with desks and the D&D table');
  for (const [tx, name] of [[3, 'the board'], [6, 'the banner'], [9, 'the windows'], [11, 'a poster'], [12, 'the door']] as const) assert.ok('ÚÛÜÝß'.includes(ch(tx, 33)), `${name} is in the club's north wall`);
  assert.ok(count('schoolhall', 'n') + count('schoolhall', 'j') + count('schoolhall', 'P') === total('schoolhall'), 'the school hall is school floor and desks');
  assert.ok(rectTiles({ tx: 14, ty: 33, w: 22, h: 1 }).filter(([x, y]) => ch(x, y) === 'A').length >= 15, 'with lockers along its north wall');
  assert.ok(rectTiles({ tx: 14, ty: 33, w: 22, h: 1 }).some(([x, y]) => ch(x, y) === 'R'), 'and the trophy case');
  assert.ok(count('street', '=') + count('street', '_') >= 90, 'the street has a road in it');
  assert.ok(count('street', '/') >= 80 && count('street', 'l') >= 6, 'and sidewalks and lamps');
  assert.ok(count('lot', 'h') + count('lot', 'H') >= 10 && count('lot', 'd') === 1, 'the neighbor\'s lot has a house with a door');
  assert.ok(count('yard', 't') >= 4 && count('yard', 'b') >= 5 && count('yard', '.') > total('yard') * 0.5, 'the yard is overgrown, with dead trees and bushes');
  assert.ok(count('yard', 'p') >= 8 && rectTiles({ tx: 36, ty: 21, w: 5, h: 2 }).every(([x, y]) => ch(x, y) === 'p'), 'and a porch');
  assert.ok(rectTiles({ tx: 13, ty: 26, w: 34, h: 1 }).filter(([x, y]) => ch(x, y) === 'F').length === 31, 'in a fence with a three tile gate in it');
  assert.ok(count('foyer', 'é') === 9 && count('foyer', 'ç') >= 6, 'the foyer has the stairs and a rug');
  assert.ok(count('dining', 'ê') >= 8 && count('dining', 'ç') >= 6, 'the dining room has a table under a sheet and a rug');
  assert.ok(count('pantry', 'ê') >= 3, 'the pantry has shelves');
  assert.ok(count('hall', 'ç') >= 30 && count('hall', 'è') >= 2 && count('hall', 'ê') >= 4, 'the hall has a runner, holes in the boards and furniture');
  assert.ok(count('parlor', 'ç') >= 10 && count('parlor', 'ê') >= 3, 'the parlor has a rug and furniture');
  assert.ok(count('backhall', 'è') >= 4 && count('backhall', 'ç') >= 20, 'the back hall has holes and a runner');
  // The house's windows are in the face rows, and the clock stands against the parlor's north wall between two mirrors.
  assert.ok(rectTiles({ tx: 14, ty: 2, w: 32, h: 1 }).filter(([x, y]) => ch(x, y) === 'å').length >= 6, 'boarded windows in the north wall');
  assert.ok(rectTiles({ tx: 14, ty: 20, w: 32, h: 1 }).filter(([x, y]) => ch(x, y) === 'å').length >= 5, 'and the front');
  for (const room of Object.keys(ROOMS)) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(roomOf(x, y) === room, `${x},${y} is in one room only`);
});

// ---------------------------------------------------------------- the memory room
test('stage 4.2: the memory rect is the parlor with its walls, the clock in it, and no other room\'s floor', () => {
  const m = S.memory as TileRect;
  assert.ok(m, 'the stage has a memory room');
  assert.ok(m.tx >= 0 && m.ty >= 0 && m.tx + m.w <= grid.w && m.ty + m.h <= grid.h, 'inside the map');
  for (const [x, y] of rectTiles(ROOMS.parlor as TileRect)) assert.ok(inRect(m, x, y), `the parlor's ${x},${y} is in it`);
  for (const room of Object.keys(ROOMS).filter((r) => r !== 'parlor')) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(!inRect(m, x, y), `${room}'s ${x},${y} is not in it`);
  const clock = prop('clock1');
  for (const [x, y] of propTiles(clock)) assert.ok(inRect(m, x, y), 'the clock is in it');
  for (const id of ['mirror5', 'mirror6']) assert.ok(inRect(m, prop(id).tx, prop(id).ty), `${id} is in it`);
  for (const id of ['mirror2', 'mirror3', 'mirror7', 'mirror4']) assert.ok(!inRect(m, prop(id).tx, prop(id).ty), `${id} is not`);
  // It takes in the walls round the room, a cap over a face on the north, and stops at the face the hall looks at (row 8).
  assert.ok(inRect(m, 14, 1) && inRect(m, 14, 2) && inRect(m, 13, 4) && inRect(m, 28, 4) && inRect(m, 24, 7) && !inRect(m, 24, 8) && !inRect(m, 29, 4) && !inRect(m, 12, 4));
  assert.equal(m.w * m.h, 112);
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 4.2: the lights are lamps and windows, and the three strings are the save points in route order, outside every wake trigger', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || FACE.includes(ch(tx, ty)) || 'âl'.includes(ch(tx, ty)), `the light at ${tx},${ty} is on floor, a wall face or a lamp`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_club', 'lights_yard', 'lights_hall']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_club', 'lights_yard', 'lights_hall']);
  const open = flood(new Set(GATES));
  // A retry from a string must not wake anything on the spot: the checkpoint is outside the beats that wake.
  const waking = ['curse', 'finale'].map((id) => rectTiles(rectOf(id)));
  const rooms = ['club', 'yard', 'hall'];
  S.checkpoints.forEach((c, i) => {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(waking.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the wake triggers`);
    assert.ok(inRoom(rooms[i] as string, p.tx, p.ty) && inRoom(rooms[i] as string, x, y), `${c.prop} hangs in the ${rooms[i]}`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  });
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 6, 'lights_club is by the start');
  const hall = prop('lights_hall');
  assert.ok(hall.tx <= 22 && hall.ty >= 9, 'lights_hall is at the hall\'s west end');
  // Not in front of the parlor's or the dining room's doorway (x 24 to 26), so nobody lights it by walking through.
  assert.ok(hall.tx + 3 <= 24, 'and clear of the doorways');
  assert.ok(!inRect(rectOf('curse'), ...tileOf(S.checkpoints[2]?.x ?? 0, S.checkpoints[2]?.y ?? 0)));
});

// ---------------------------------------------------------------- spawns
test('stage 4.2: the start and every spawn, item and tile is on open ground, ids are unique, and the club, the school and the street are quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  // Props stand on open ground, except the mirrors and the clock, which stand in the wall's face row (and the clock's second tile on the floor).
  for (const p of props) {
    if (p.prop === 'mirror' || p.prop === 'clock') continue;
    for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  }
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0, 'Eddie is in the party from the start: there are no npcs');
  for (const e of enemies) assert.ok(roomOf(e.tx, e.ty) !== null && !['club', 'schoolhall', 'street', 'lot', 'yard'].includes(roomOf(e.tx, e.ty) as string), `${e.id} is in the house`);
  for (const room of ['club', 'schoolhall', 'street', 'lot', 'yard']) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), `nothing hostile in the ${room}`);
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights' || p.prop === 'clock' || p.prop === 'door').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items, ...npcs]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights, the clock or the door`);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom('lot', i.tx, i.ty)), 'an Eggo in a yard on the street');
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom('pantry', i.tx, i.ty)), 'and one in the pantry');
  assert.ok(items.filter((i) => inRoom('pantry', i.tx, i.ty)).length >= 2, 'the pantry holds more than the Eggo');
});

test('stage 4.2: sixteen ghouls worth 230 to 290 XP, each waiting in a mirror in front of its tile, awake in the foyer and the hall, asleep in the parlor and the back hall', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 230 && xp <= 290, `stage XP ${xp}`);
  assert.equal(xp, 238);
  assert.ok(enemies.every((e) => e.type === 'ghoul'), 'every foe is a Creel ghoul');
  assert.equal(enemies.length, 16);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['finale', 'foyer', 'hall', 'parlor']);
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  const byMirror = (g: string): Record<string, number> => groups(g).reduce((m, e) => ({ ...m, [e.mirror as string]: (m[e.mirror as string] ?? 0) + 1 }), {} as Record<string, number>);
  assert.deepEqual(byMirror('foyer'), { mirror1: 2 });
  assert.deepEqual(byMirror('hall'), { mirror2: 2, mirror3: 2, mirror4: 1 });
  assert.deepEqual(byMirror('parlor'), { mirror5: 1, mirror6: 1 });
  assert.deepEqual(byMirror('finale'), { mirror7: 2, mirror8: 2, mirror9: 3 });
  for (const g of ['foyer', 'hall']) assert.ok(groups(g).every((e) => !e.dormant), `${g} is awake: they come out as the party nears`);
  for (const g of ['parlor', 'finale']) assert.ok(groups(g).every((e) => e.dormant), `${g} is dormant until its beat`);
  const elite = enemies.filter((e) => e.tier === 'elite');
  assert.deepEqual(elite.map((e) => e.group), ['finale'], 'the one elite is in the back hall');
  assert.equal(elite[0]?.mirror, 'mirror9');
  assert.ok(enemies.filter((e) => e !== elite[0]).every((e) => e.tier === undefined));
  // Each ghoul's tile is the floor in front of its glass: the face row's mirror above it, or one tile either side of a wall mirror.
  for (const e of enemies) {
    const m = prop(e.mirror as string);
    assert.equal(m.prop, 'mirror', `${e.id} waits in a mirror`);
    assert.equal(e.ty, m.ty + 1, `${e.id} steps out on the row south of ${m.id}`);
    const x0 = m.tx - ((m.w ?? 16) > 16 ? 0 : 1), x1 = m.tx + Math.ceil((m.w ?? 16) / 16) - 1 + ((m.w ?? 16) > 16 ? 0 : 1);
    assert.ok(e.tx >= x0 && e.tx <= x1, `${e.id} is in front of ${m.id}`);
    assert.ok(roomOf(e.tx, e.ty) !== null, `${e.id} stands in a room`);
  }
});

// ---------------------------------------------------------------- the mirrors and the clock
test('stage 4.2: mirror1 and mirror4 close doorways two tiles wide, seven mirrors hang on walls, clock1 stands against the parlor, and door_back is shut in the east wall', () => {
  const gate = (id: string, tx: number, ty: number, above: string, below: string): void => {
    const m = prop(id);
    assert.deepEqual([m.prop, m.hitBy, m.w, m.h, m.solid, m.tx, m.ty], ['mirror', 'riff', 32, 16, true, tx, ty], id);
    assert.ok(solid(m.tx - 1, m.ty) && solid(m.tx + 2, m.ty) && solid(m.tx - 1, m.ty - 1) && solid(m.tx + 2, m.ty - 1), `${id} fills its doorway wall to wall`);
    assert.ok(inRoom(above, m.tx, m.ty - 2) && inRoom(below, m.tx, m.ty + 1), `${id}: ${below} is south of it, ${above} north`);
  };
  gate('mirror1', 40, 14, 'hall', 'foyer');
  gate('mirror4', 15, 14, 'pantry', 'dining');
  const wall: [string, string][] = [['mirror2', 'hall'], ['mirror3', 'hall'], ['mirror5', 'parlor'], ['mirror6', 'parlor'], ['mirror7', 'backhall'], ['mirror8', 'backhall'], ['mirror9', 'backhall']];
  for (const [id, room] of wall) {
    const m = prop(id);
    assert.deepEqual([m.prop, m.w, m.h, m.hitBy, m.solid], ['mirror', 16, 16, undefined, undefined], id);
    assert.ok(solid(m.tx, m.ty) && ch(m.tx, m.ty) === 'ä', `${id} hangs on a wall face`);
    assert.ok(inRoom(room, m.tx, m.ty + 1), `${id} faces the ${room}`);
  }
  const c = prop('clock1');
  assert.deepEqual([c.prop, c.hitBy, c.w, c.h, c.solid, c.hits, c.tx, c.ty], ['clock', 'riff', 16, 32, true, 3, 21, 2]);
  assert.ok(inRoom('parlor', c.tx, c.ty + 2) && ch(c.tx, c.ty) === 'ä', 'the clock stands on the parlor\'s north wall');
  assert.ok(Math.abs(prop('mirror5').tx - c.tx) >= 3 && Math.abs(prop('mirror6').tx - c.tx) >= 3, 'with a mirror either side');
  const d = prop('door_back');
  assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 32, undefined, true, 46, 4]);
  assert.ok(solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 2) && inRoom('backhall', d.tx - 1, d.ty) && inRoom('backhall', d.tx - 1, d.ty + 1), 'door_back fills a doorway in the back hall\'s east wall');
  assert.deepEqual(props.filter((p) => !['lights'].includes(p.prop)).map((p) => p.id), ['mirror1', 'mirror4', 'mirror2', 'mirror3', 'mirror5', 'mirror6', 'mirror7', 'mirror8', 'mirror9', 'clock1', 'door_back']);
  // The three mirrors of the back hall are close enough that one spot in the corridor is within every ghoul's 80 px of its glass.
  const spot = { x: 37 * 16 + 8, y: 5 * 16 + 12 };
  for (const e of enemies.filter((q) => q.group === 'finale')) {
    const m = prop(e.mirror as string);
    const nx = Math.max(m.tx * 16, Math.min(spot.x, m.tx * 16 + (m.w ?? 16))), ny = Math.max(m.ty * 16, Math.min(spot.y - 2, m.ty * 16 + (m.h ?? 16)));
    assert.ok(Math.hypot(spot.x - nx, spot.y - 2 - ny) <= 80, `${e.id}: the middle of the back hall is within 80 px of ${m.id}`);
  }
});

// ---------------------------------------------------------------- reachability
test('stage 4.2: mirror1 shuts the house, mirror4 the pantry, and nothing is reachable early: the way is the foyer, the hall, the parlor, the back hall', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the club', 8, 34, []], ['the school hall', 25, 36, []], ['the street', 20, 29, []], ['the lot', 6, 25, []], ['the yard', 25, 23, []], ['the porch', 38, 21, []],
    ['the foyer', 38, 17, []], ['the hall', 30, 10, ['mirror1']], ['the dining room', 25, 15, ['mirror1']], ['the parlor', 25, 5, ['mirror1']],
    ['the back hall', 35, 5, ['mirror1']], ['the pantry', 16, 11, ['mirror1', 'mirror4']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind a gate'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['mirror4'], 16, 11), 0, 'the pantry is no way in');
  assert.equal(reach(['mirror1'], 16, 11), 0, 'and mirror1 no way into the pantry');
  assert.equal(reach(['mirror1'], 46, 4), 0, 'door_back keeps the east wall shut');
  assert.equal(reach(['mirror1', 'door_back'], 46, 4), 1, 'and opens at the clear');
  // The dining room is a way round neither the foyer's mirror nor the hall: its only door is the hall's.
  assert.equal(reach([], 25, 15), 0);
  // Eddie opens both gates, and he is locked into the party.
  assert.deepEqual(requiredFor('4.2'), ['eddie']);
  assert.ok(rosterFor('4.2').includes('eddie'));
  assert.ok(HERO_DEFS.eddie.utilities.includes('riff'));
});

test('stage 4.2: with every gate open nothing is boxed in, and every spawn, light and room is reachable', () => {
  const gates = new Set([...GATES, 'door_back']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ROOMS)) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
  // The clock is solid for good: its second tile is the floor the open map loses, and the parlor stays one room round it.
  assert.ok(blocked[idx(21, 3)] === 1 && !solid(21, 3), 'the clock stands on a floor tile of the parlor');
  // The nav grid and the bot pass cleanly: every doorway and neck on the route is two tiles wide or more, the hall and the back hall three or four.
  const wide = (cells: [number, number][]): void => { for (const [x, y] of cells) assert.equal(open[idx(x, y)], 1, `the gap at ${x},${y} is open`); };
  wide([[13, 35], [13, 36], [13, 37], [32, 32], [33, 32], [34, 32], [38, 26], [39, 26], [40, 26], [37, 19], [38, 19], [39, 19], [40, 13], [41, 13], [40, 14], [41, 14]]);
  wide([[24, 7], [25, 7], [26, 7], [24, 8], [25, 8], [26, 8], [24, 13], [25, 13], [26, 13], [15, 13], [16, 13], [15, 14], [16, 14], [28, 4], [28, 5], [28, 6], [46, 4], [46, 5]]);
  // At least two clear rows in the hall and the back hall at every column, so a ghoul and a hero can pass.
  for (const [room, x0, x1] of [['hall', 20, 45], ['backhall', 29, 45]] as const) {
    const r = ROOMS[room] as TileRect;
    for (let x = x0; x <= x1; x++) assert.ok(rectTiles({ tx: x, ty: r.ty, w: 1, h: r.h }).filter(([u, v]) => !blocked[idx(u, v)]).length >= 2, `${room} has two clear rows at column ${x}`);
  }
});

// ---------------------------------------------------------------- the puzzles
test('stage 4.2: three puzzles, each with Eddie, who has what the prop asks for, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['mirror', 'cache', 'clock']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['mirror_hint', 'cache_hint', 'curse']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['mirror1', 'mirror4', 'clock1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['eddie', 'eddie', 'eddie']);
  assert.deepEqual(S.puzzles.map((p) => p.hint), ['MAYBE EDDIE SHOULD PLAY IT A RIFF', 'MAYBE EDDIE SHOULD PLAY IT A RIFF', 'MAYBE EDDIE CAN SHATTER THE CLOCK']);
  assert.ok(S.puzzles.every((p) => p.alt === undefined && p.blocks === undefined && p.enemy === undefined));
  const roster = rosterFor('4.2');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(prop(p.prop).hitBy ?? 'riff'), `${p.id}: ${p.hero} has what ${p.prop} asks for`);
  }
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-11.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: ${p.hint} names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint) && !hasEmDash(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-11.md`);
  }
});

test('stage 4.2: the clock\'s hint shows before the fourth chime, because the hint clock is shorter than three gaps between chimes', () => {
  assert.ok(HINT_AFTER < 3 * CHIME_FRAMES, `${HINT_AFTER} frames to a hint, ${3 * CHIME_FRAMES} to the fourth chime`);
  assert.ok(HINT_AFTER <= 2 * CHIME_FRAMES - 60, 'the hint is up by the second chime, with ten seconds left');
  const clock = prop('clock1');
  const view: PropView = { id: 'clock1', kind: 'clock', x: clock.tx * 16, y: clock.ty * 16, w: 16, h: 32, state: 'closed', t: 0 };
  const tracker = createPuzzleTracker(S.puzzles);
  const parlor = { x: 25 * 16 + 8, y: 6 * 16 + 12 };
  const tick = (busy: boolean): void => tracker.tick({ hasFired: (b) => b === 'curse', busy, props: [view], hero: parlor, party: ['mike', 'dustin', 'robin', 'eddie'] });
  // The dialogue holds the hint clock, and the sim with it; the frames after it count.
  for (let f = 0; f < 200; f++) tick(true);
  assert.equal(tracker.highlight(), null);
  for (let f = 0; f < HINT_AFTER - 1; f++) tick(false);
  assert.equal(tracker.highlight(), null, 'not a frame early');
  tick(false);
  assert.equal(tracker.highlight()?.id, 'clock');
  assert.equal(tracker.highlight()?.hero, 'eddie');
});

// ---------------------------------------------------------------- the bot's route
test('stage 4.2: the waypoints are reachable in order, mirror1 is opened by flag from inside the hint, the route skips the pantry and ends inside the finale', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the beats do');
    if (w.open) { assert.equal(w.open, 'mirror1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const flagged = S.waypoints.findIndex((w) => w.open);
  const [fx, fy] = tileOf(S.waypoints[flagged]?.x ?? 0, S.waypoints[flagged]?.y ?? 0);
  assert.ok(inRoom('foyer', fx, fy) && fy - 14 <= 3, 'mirror1 is opened from the foyer, a couple of tiles short of it');
  assert.ok(inRect(rectOf('mirror_hint'), fx, fy), 'inside the hint beat\'s tiles, so the hint fires before the open');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('finale'), lx, ly) && inRoom('backhall', lx, ly), 'the last waypoint is inside the finale trigger');
  assert.ok(S.waypoints.every((w) => !inRoom('pantry', ...tileOf(w.x, w.y)) && !inRoom('dining', ...tileOf(w.x, w.y))), 'the route skips the dining room and the pantry');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'walkman', 'street', 'yard', 'mirror_hint', 'curse', 'finale']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(!crossed('cache_hint'), 'but not to the pantry\'s door');
  assert.ok(S.waypoints.length >= 30, `${S.waypoints.length} waypoints`);
  // Every ghoul stands within 80 px of the route on some mirror's glass, so the walk wakes them all: some waypoint comes within 80 px of each mirror.
  for (const m of props.filter((p) => ['mirror1', 'mirror2', 'mirror3', 'mirror6', 'mirror7', 'mirror8', 'mirror9'].includes(p.id))) {
    const near = S.waypoints.some((w) => {
      const nx = Math.max(m.tx * 16, Math.min(w.x, m.tx * 16 + (m.w ?? 16))), ny = Math.max(m.ty * 16, Math.min(w.y - 2, m.ty * 16 + (m.h ?? 16)));
      return Math.hypot(w.x - nx, w.y - 2 - ny) <= 80;
    });
    assert.ok(near, `the route passes within 80 px of ${m.id}`);
  }
});
