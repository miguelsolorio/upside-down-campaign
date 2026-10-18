// Stage 4.1, Kamchatka, as data: the map and its rooms, the budget, the gates, reachability (the block behind crack1, the cache behind
// crack2, the pit behind door1 once it shuts), the checkpoints, the puzzles, and the bot's route. The beats and the scripts are in
// stage41-story.test.ts, and whole runs of the bot and the play scene in stage41-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import { botRoute, stageKit, tileOf } from './stage-helpers.ts';
import { ROOMS, ROWS, S, at, ch, inRect, inRoom, kit, prop, propTiles, rectOf, rectTiles, solid, xpOf } from './stage41-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const CAMP = 'ÈÉÊËÌÍÎÏÐÑÒ';
const PIT = 'ÓÔÕÖ';
/** The same stage with door1 shut, as the pit beat leaves it. */
const shut = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.prop === 'door' ? { ...s, solid: true } : s)) } as StageData);

// ---------------------------------------------------------------- the map
test('stage 4.1: the map is 44 by 40, uses only the camp and the pit tiles, is solid all round and runs at night with the kamchatka theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 44, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [44, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['4.1', 'Kamchatka', 'night', 'kamchatka']);
  assert.ok((S.enemyMult ?? 1) > 0 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.ok((S.xpMult ?? 1) >= 1 && (S.xpMult ?? 1) <= 4, `xpMult ${S.xpMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set(S.rows.join(''));
  for (const c of CAMP + PIT) assert.ok(used.has(c), `the map uses the tile '${c}'`);
  assert.ok(![...used].some((c) => !(CAMP + PIT).includes(c)), 'and nothing but the camp and the pit tiles');
  assert.ok([...S.rows.join('')].filter((c) => c === 'Ñ' || c === 'Ò').length > 20, 'with crates and drums for cover');
});

test('stage 4.1: walls are a cap row over a face row looking onto the floor, the cell doors and the barricade come in pairs', () => {
  const FACE = 'ÍÎÔÖ';
  const CAP = 'ÌÓ';
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has the cap row above it.
      if (FACE.includes(c) && y + 1 < grid.h && !solid(x, y + 1)) assert.ok(CAP.includes(ch(x, y - 1)), `the wall face at ${x},${y} has a cap above it`);
      if (CAP.includes(c) && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on rock, not floor`);
      if (!solid(x, y) && y > 0) assert.ok(!CAP.includes(ch(x, y - 1)), `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  const doors = rectTiles({ tx: 0, ty: 0, w: 44, h: 40 }).filter(([x, y]) => ch(x, y) === 'Î');
  assert.deepEqual(doors.map(([x, y]) => `${x},${y}`), ['2,10', '3,10', '7,10', '8,10', '17,10', '18,10'], 'three cell doors, two tiles wide, in the corridor\'s north wall');
  assert.deepEqual(rectTiles({ tx: 0, ty: 0, w: 44, h: 40 }).filter(([x, y]) => ch(x, y) === 'Ö').map(([x, y]) => `${x},${y}`), ['30,1', '31,1'], 'the barricade is a pair in the pit\'s north wall');
  // The pit's lanterns hang from the upper face at every sixth tile with a wall either side (tx 3 of 6): the barricade leaves three along the arena's wall.
  assert.deepEqual([27, 33, 39].map((x) => ch(x - 1, 1) + ch(x, 1) + ch(x + 1, 1)), ['ÔÔÔ', 'ÔÔÔ', 'ÔÔÔ'], 'three lanterns on the north wall');
});

test('stage 4.1: the rooms are where the spec has them, and the pit is an arena 18 by 12 with a wall on every side', () => {
  const count = (room: string, c: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('pen', startTx, startTy), 'the stage begins in the work yard');
  assert.ok(count('pen', 'È') + count('pen', 'Ê') > total('pen') * 0.7, 'the pen is snow and trodden path');
  assert.ok(count('pen', 'Ò') >= 2 && count('pen', 'Ñ') >= 3 && count('pen', 'É') >= 6, 'with a drum, crates and drifts');
  for (let y = 28; y <= 38; y++) assert.equal(ch(15, y), y >= 33 && y <= 36 ? 'Ê' : 'Ë', `the pen's fence has a four tile gap in it at 15,${y}`);
  assert.ok(count('strip', 'È') + count('strip', 'Ê') > total('strip') * 0.8, 'the strip of the work yard is snow and path too');
  assert.deepEqual([37, 38, 39, 40].map((x) => ch(x, 27)), ['Ê', 'Ê', 'Ê', 'Ê'], 'with a four tile gate in the inner fence, in the east');
  assert.ok(rectTiles({ tx: 1, ty: 27, w: 36, h: 1 }).every(([x, y]) => ch(x, y) === 'Ë'), 'which is wire all along the rest of the yard\'s south edge');
  assert.ok(count('yard', 'È') + count('yard', 'Ê') > total('yard') * 0.7, 'the snow yard is snow and path');
  assert.ok(count('yard', 'É') >= 12 && count('yard', 'Ñ') >= 6 && count('yard', 'Ò') >= 4, 'with drifts, crates and burning drums for cover');
  assert.ok(rectTiles({ tx: 1, ty: 15, w: 23, h: 1 }).filter(([x, y]) => ch(x, y) === 'Í').length >= 20, 'the block\'s south wall faces the yard');
  assert.ok(count('corridor', 'Ï') > total('corridor') * 0.8 && count('corridor', 'Ð') >= 2 && count('corridor', 'Ò') >= 1, 'the corridor is bare concrete, a grate or two and a drum');
  assert.deepEqual([ROOMS.corridor?.h, ch(9, 14), ch(10, 14), ch(8, 14), ch(11, 14)], [3, 'Ï', 'Ï', 'Ì', 'Ì'], 'three tiles wide, with a notch two tiles wide in its south wall');
  assert.ok(count('cache', 'Ï') >= 12, 'the cache is a cell 4 by 4');
  assert.ok(count('guardroom', 'Ñ') >= 4, 'the guard room has crates, and a table of them');
  assert.ok(rectTiles({ tx: 20, ty: 10, w: 3, h: 3 }).every(([x, y]) => ch(x, y) === 'Ð'), 'the shaft has a grate in the middle of its landing');
  assert.deepEqual([ROOMS.pit?.w, ROOMS.pit?.h], [18, 12]);
  // Every tile of the arena is floor, and its walls are rock: nothing stands in it, so every charge ends in a wall.
  for (const [x, y] of rectTiles(ROOMS.pit as TileRect)) assert.equal(ch(x, y), 'Õ', `pit tile ${x},${y}`);
  for (let x = 25; x <= 42; x++) assert.ok(solid(x, 1) && solid(x, 14), `the pit's walls at ${x}`);
  for (let y = 2; y <= 13; y++) assert.ok(solid(43, y) && (y === 10 || y === 11 || solid(24, y)), `the pit's side walls at ${y}`);
  assert.deepEqual([ch(24, 9), ch(24, 10), ch(24, 11), ch(24, 12)], ['Ô', 'Õ', 'Õ', 'Ó'], 'with a doorway two tiles tall in the west wall');
  assert.ok(rectTiles({ tx: 0, ty: 0, w: 44, h: 40 }).filter(([x, y]) => ch(x, y) === 'Ð' && x >= 19).length === 9, 'one grate, 3 by 3');
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 4.1: the lights are lamps over the pen, the block and the shaft, and the three strings are the save points in route order', () => {
  assert.ok(S.lights.length >= 8, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 43 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || 'ÍÎÔ'.includes(ch(tx, ty)), `the light at ${tx},${ty} is on floor or a wall face`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_yard', 'lights_block', 'lights_shaft']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_yard', 'lights_block', 'lights_shaft']);
  const open = flood(new Set(['crack1', 'crack2']));
  // A retry from a string must not wake anything on the spot: the checkpoint is outside the beats that wake or shut.
  const triggers = ['block', 'pit'].map((id) => rectTiles(rectOf(id)));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(triggers.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the wake triggers`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 4, 'lights_yard is at the start');
  assert.ok(inRoom('pen', prop('lights_yard').tx, prop('lights_yard').ty), 'in the work yard');
  assert.ok(inRoom('guardroom', prop('lights_block').tx, prop('lights_block').ty), 'lights_block hangs in the guard room');
  assert.ok(inRoom('shaft', prop('lights_shaft').tx, prop('lights_shaft').ty) && !inRect(rectOf('shaft'), ...tileOf(S.checkpoints[2]?.x ?? 0, S.checkpoints[2]?.y ?? 0)), 'lights_shaft is on the shaft\'s landing, past the shaft beat\'s tiles');
});

// ---------------------------------------------------------------- spawns
test('stage 4.1: the start and every spawn, item and patrol point is on open ground, ids are unique, and the work yard is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  for (const e of enemies) for (const q of e.patrol ?? []) assert.equal(solid(q.tx, q.ty), false, `${e.id}'s patrol point ${q.tx},${q.ty}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0, 'Hopper is alone: there are no npcs');
  for (const e of enemies.filter((q) => !q.dormant)) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 9, `${e.id} is too close to the start`);
  for (const room of ['pen', 'strip', 'cache', 'shaft']) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), `nothing hostile in the ${room}`);
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items, ...npcs]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights`);
});

test('stage 4.1: the roster is worth 200 to 250 XP, in its groups, the yard in three clusters that never join one fight, the sleepers in the guard room', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 200 && xp <= 250, `stage XP ${xp}`);
  assert.equal(xp, 200);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('kguard'), kind('kbaton'), kind('pitdemo')], [5, 5, 1]);
  assert.ok(enemies.every((e) => e.tier === undefined), 'no elites');
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['block', 'boss', 'guardroom', 'yard']);
  const yard = groups('yard');
  assert.deepEqual([yard.filter((e) => e.type === 'kguard').length, yard.filter((e) => e.type === 'kbaton').length], [4, 1], 'four rifle guards and a baton guard');
  assert.ok(yard.every((e) => !e.dormant && inRoom('yard', e.tx, e.ty)), 'awake in the snow yard');
  const patrols = yard.filter((e) => e.patrol);
  assert.equal(patrols.length, 2, 'two of the rifles walk the loop');
  assert.ok(patrols.every((e) => e.type === 'kguard' && e.patrol?.length === 4), 'rifle guards, round the floodlight');
  const fl = prop('flood1');
  for (const e of patrols) {
    const xs = (e.patrol ?? []).map((q) => q.tx), ys = (e.patrol ?? []).map((q) => q.ty);
    assert.ok(Math.min(...xs) < fl.tx && Math.max(...xs) > fl.tx && Math.min(...ys) < fl.ty && Math.max(...ys) > fl.ty, `${e.id}'s loop goes round the floodlight`);
  }
  // An alerted guard alerts his group within 140 px, and so on down the line (damage.ts): the yard stays three fights, not one.
  const pts = yard.map((e) => [{ x: e.tx * 16 + 8, y: e.ty * 16 + 12 }, ...(e.patrol ?? []).map((q) => ({ x: q.tx * 16 + 8, y: q.ty * 16 + 12 }))]);
  const parent = pts.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i] as number)));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if ((pts[i] ?? []).some((a) => (pts[j] ?? []).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 140))) parent[root(i)] = root(j);
  }
  assert.equal(new Set(pts.map((_, i) => root(i))).size, 3, 'a rifle at the gate, the pair on the loop, a rifle and the baton guard by the block');
  const block = groups('block');
  assert.deepEqual([block.filter((e) => e.type === 'kbaton').length, block.filter((e) => e.type === 'kguard').length], [2, 1], 'two batons and a rifle in the corridor');
  assert.ok(block.every((e) => !e.dormant && inRoom('corridor', e.tx, e.ty) && e.tx >= 15), 'awake, east of the guard room\'s doorway');
  const room = groups('guardroom');
  assert.ok(room.length === 2 && room.every((e) => e.type === 'kbaton' && e.dormant && inRoom('guardroom', e.tx, e.ty)), 'two batons asleep in the guard room');
  const boss = groups('boss');
  assert.deepEqual([boss.length, boss[0]?.id, boss[0]?.type, boss[0]?.dormant], [1, 'pitdemo', 'pitdemo', true]);
  assert.ok(inRoom('pit', boss[0]?.tx ?? 0, boss[0]?.ty ?? 0) && boss[0]?.ty === 4, 'the Demogorgon sleeps under the barricade over its tunnel');
  assert.ok(Math.abs((boss[0]?.tx ?? 0) - 30.5) <= 1, 'in front of it');
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [3, 2, 8]);
  const cache = items.filter((i) => inRoom('cache', i.tx, i.ty));
  assert.ok(cache.some((i) => i.item === 'eggo') && cache.filter((i) => i.item === 'quarter').length === 2, 'an Eggo and two quarters in the cache, behind crack2');
  assert.ok(items.every((i) => !inRoom('pit', i.tx, i.ty)), 'nothing to pick up in the arena');
});

// ---------------------------------------------------------------- the gates
test('stage 4.1: crack1 shuts the notch in the block\'s south wall, crack2 the cache cell\'s door, door1 the pit\'s doorway spawned open, and the floodlight is lit', () => {
  const c1 = prop('crack1');
  assert.deepEqual([c1.prop, c1.hitBy, c1.w, c1.h, c1.solid, c1.tx, c1.ty], ['crack', 'smash', 32, 16, true, 9, 15]);
  assert.ok(solid(c1.tx - 1, c1.ty) && solid(c1.tx + 2, c1.ty) && solid(c1.tx - 1, c1.ty - 1) && solid(c1.tx + 2, c1.ty - 1), 'crack1 fills the notch wall to wall');
  assert.ok(inRoom('corridor', c1.tx, c1.ty - 2) && inRoom('yard', c1.tx, c1.ty + 1), 'the corridor is north of it, the yard south');
  const c2 = prop('crack2');
  assert.deepEqual([c2.prop, c2.hitBy, c2.w, c2.h, c2.solid, c2.tx, c2.ty], ['crack', 'smash', 32, 16, true, 4, 10]);
  assert.ok(solid(c2.tx - 1, c2.ty) && solid(c2.tx + 2, c2.ty), 'crack2 fills the cell\'s door wall to wall');
  assert.ok(inRoom('cache', c2.tx, c2.ty - 2) && inRoom('corridor', c2.tx, c2.ty + 1), 'the cache is north of it, the corridor south');
  const d = prop('door1');
  assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 32, 'open', false, 24, 10]);
  assert.ok(solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 2), 'door1 fills its doorway wall to wall');
  assert.ok(inRoom('shaft', d.tx - 1, d.ty) && inRoom('pit', d.tx + 1, d.ty), 'and joins the shaft\'s landing and the pit');
  const f = prop('flood1');
  assert.deepEqual([f.prop, f.state], ['floodlight', 'open']);
  assert.ok(inRoom('yard', f.tx, f.ty), 'in the middle of the snow yard');
  assert.deepEqual(props.filter((p) => p.prop !== 'lights').map((p) => p.id), ['crack1', 'crack2', 'door1', 'flood1']);
});

// ---------------------------------------------------------------- reachability
test('stage 4.1: crack1 shuts the block, the shaft and the pit, crack2 the cache, and the doors cut the pit off once it shuts', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the pen', 4, 34, []], ['the strip', 30, 34, []], ['the snow yard', 20, 26, []], ['in front of the block', 10, 17, []],
    ['the corridor', 12, 12, ['crack1']], ['the guard room', 12, 6, ['crack1']], ['the shaft', 21, 12, ['crack1']], ['the pit', 33, 8, ['crack1']],
    ['the cache', 5, 7, ['crack1', 'crack2']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind a gate'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['crack2'], 5, 7), 0, 'the cache is no way into the block');
  assert.equal(reach(['crack1'], 5, 7), 0, 'and crack1 no way into the cache');
  // The doors shut: the pit is cut off from the shaft, and the shaft is the only way in.
  assert.equal(shut.flood(new Set(['crack1']))[idx(33, 8)], 0, 'the pit is shut off by door1');
  assert.equal(shut.flood(new Set(['crack1']))[idx(21, 12)], 1);
  assert.equal(shut.flood(new Set(['crack1', 'door1']))[idx(33, 8)], 1, 'and the door open lets him in');
  // Hopper opens both cracks himself: the haymaker and the slam smash, and he is the whole party.
  assert.deepEqual(rosterFor('4.1'), ['hopper']);
  assert.deepEqual(requiredFor('4.1'), []);
  assert.ok(HERO_DEFS.hopper.utilities.includes('smash'));
});

test('stage 4.1: with every gate open nothing is boxed in, and every spawn and string of lights is reachable', () => {
  const gates = new Set(['crack1', 'crack2']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ROOMS)) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
  // The nav grid and the bot pass cleanly: every doorway and every neck on the route is two tiles wide or more.
  const wide = (cells: [number, number][]): void => { for (const [x, y] of cells) assert.equal(open[idx(x, y)], 1, `the gap at ${x},${y} is open`); };
  wide([[9, 14], [10, 14], [9, 15], [10, 15], [12, 9], [13, 9], [14, 9], [12, 10], [13, 10], [14, 10], [4, 9], [5, 9], [4, 10], [5, 10], [24, 10], [24, 11]]);
  wide([[15, 33], [15, 34], [15, 35], [15, 36], [37, 27], [38, 27], [39, 27], [40, 27]]);
});

// ---------------------------------------------------------------- the puzzles
test('stage 4.1: three puzzles, each with Hopper, who has what the prop asks for, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['crack', 'cell', 'finish']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['crack_hint', 'cell_hint', 'pit_down']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['crack1', 'crack2', 'pitdemo']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['hopper', 'hopper', 'hopper']);
  assert.deepEqual(S.puzzles.map((p) => p.enemy), [undefined, undefined, true]);
  assert.ok(S.puzzles.every((p) => p.alt === undefined && p.blocks === undefined));
  const roster = rosterFor('4.1');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    if (p.enemy) assert.ok(enemies.some((e) => e.id === p.prop), `${p.id}: ${p.prop} is an enemy spawn`);
    else assert.ok(HERO_DEFS[p.hero].utilities.includes(prop(p.prop).hitBy ?? 'smash'), `${p.id}: ${p.hero} has what ${p.prop} asks for`);
  }
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-10.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: ${p.hint} names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint) && !hasEmDash(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-10.md`);
  }
});

// ---------------------------------------------------------------- the bot's route
test('stage 4.1: the waypoints are reachable in order, crack1 is opened by flag, the route skips the cache and ends in the pit trigger', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the sleepers and the Demogorgon wake themselves');
    if (w.open) { assert.equal(w.open, 'crack1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const flagged = S.waypoints.findIndex((w) => w.open);
  const [fx, fy] = tileOf(S.waypoints[flagged]?.x ?? 0, S.waypoints[flagged]?.y ?? 0);
  assert.ok(inRoom('yard', fx, fy) && fy - 15 <= 3, 'crack1 is opened from the path, a couple of tiles short of it');
  assert.ok(inRect(rectOf('crack_hint'), fx, fy), 'inside the hint beat\'s tiles, so the hint fires before the open');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('pit'), lx, ly), 'the last waypoint is inside the pit trigger');
  assert.ok(S.waypoints.every((w) => !inRoom('cache', ...tileOf(w.x, w.y))), 'the route skips the cache');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'yard', 'crack_hint', 'block', 'shaft', 'pit']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(!crossed('cell_hint'), 'but not to the cache\'s door');
  assert.ok(S.waypoints.length >= 20, `${S.waypoints.length} waypoints`);
});
