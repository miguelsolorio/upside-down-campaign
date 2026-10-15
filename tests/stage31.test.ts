// Stage 3.1, Starcourt Mall, as data: the map and its rooms, the budget, the four gates in route order and a hero who opens each, the
// checkpoints, the beats and the 12 scripts, and the bot's route. The real sim, the hints and the headless runs of the bot are in
// stage31-sim.test.ts, and the play scene (the purse, the stash, the bank) in stage31-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L7_SCRIPTS } from '../src/story/scripts_l7.ts';
import { STAGE_31 as S, ROWS, WAVES } from '../src/world/stages/stage31.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, fakeEnv, propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const GATES = ['shutter1', 'crack1', 'crate1'];
/** panel1 is a switch, not a wall: it is never in the way. */
const ALL = new Set(GATES);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
const ROOMS: Record<string, TileRect> = {
  lobby: { tx: 2, ty: 32, w: 7, h: 6 }, concourse: { tx: 9, ty: 34, w: 18, h: 4 }, scoops: { tx: 10, ty: 25, w: 10, h: 7 },
  back: { tx: 12, ty: 19, w: 8, h: 4 }, passage: { tx: 21, ty: 29, w: 3, h: 4 }, court: { tx: 21, ty: 15, w: 16, h: 14 },
  exit: { tx: 37, ty: 25, w: 6, h: 3 }, shop: { tx: 38, ty: 18, w: 4, h: 5 }, east: { tx: 43, ty: 10, w: 4, h: 19 },
  leg1: { tx: 21, ty: 10, w: 22, h: 3 }, up: { tx: 21, ty: 5, w: 3, h: 5 }, leg3: { tx: 21, ty: 2, w: 10, h: 3 }, dock: { tx: 31, ty: 2, w: 16, h: 6 },
};
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
const share = (room: string, chars: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => chars.includes(ch(x, y))).length / (ROOMS[room] as TileRect).w / (ROOMS[room] as TileRect).h;
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
const BEAT_IDS = ['start', 'scoops', 'shutter_hint', 'shutter_open', 'crack_hint', 'crack_open', 'court', 'crate_hint', 'crate_cleared', 'service', 'ambush', 'level_clear'];
const SCRIPT_IDS = ['l7_start', 'l7_scoops', 'l7_shutter_hint', 'l7_shutter_done', 'l7_crack_hint', 'l7_crack_done', 'l7_court', 'l7_crate_hint', 'l7_crate_done', 'l7_service', 'l7_ambush', 'l7_clear'];
/** The mall's own tiles, and the dressing it shares with the Lab and the school: a bench, a vent grate, a pipe, a shelf, a checker floor, a table. */
const MALL = '¢"()?{}y>`£¨÷Þ';
const SHARED = 'jIBviN';

// ---------------------------------------------------------------- the map
test('stage 3.1: the map is 48 by 40, uses only legend characters, is solid all round and runs at night with the starcourt theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['3.1', 'Starcourt Mall', 'night', 'starcourt']);
  assert.ok((S.enemyMult ?? 1) >= 1 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.deepEqual(WAVES, ['amb1', 'amb2', 'amb3']);
  assert.deepEqual(S.waves, WAVES);
  const used = new Set(S.rows.join(''));
  for (const c of MALL) assert.ok(used.has(c), `the map uses the mall tile '${c}'`);
  assert.ok(![...used].some((c) => !(MALL + SHARED).includes(c)), 'and nothing but the mall tiles and the shared dressing');
  assert.equal(S.rows.join('').split('Þ').length - 1, 4, 'the lift is two tiles by two');
});

test('stage 3.1: walls are a cap row over a face row looking onto the floor below, shops and shutters sit in the face row', () => {
  const FACE = '){}?i';
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has rock or another wall above it: the cap row.
      if (FACE.includes(c) && y + 1 < grid.h && !solid(x, y + 1)) assert.ok(solid(x, y - 1), `the wall face at ${x},${y} has a cap above it`);
      if (c === '(' && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on rock, not floor`);
      if (!solid(x, y) && y > 0) assert.ok(ch(x, y - 1) !== '(', `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  const frontsOnly = (c: string): void => {
    // Over floor, or over a planter or the railing along the court's north side.
    for (const [y, row] of S.rows.entries()) for (const [x, k] of [...row].entries()) if (k === c) assert.ok(solid(x, y) && (!solid(x, y + 1) || '`y'.includes(ch(x, y + 1))), `'${c}' at ${x},${y} is a face tile over floor`);
  };
  frontsOnly('{'); frontsOnly('}'); frontsOnly('?');
  const glass = [...S.rows.join('')].filter((c) => c === '?').length;
  assert.ok(glass >= 3, 'glass doors at the entrance');
  const shops = rectTiles({ tx: 9, ty: 33, w: 18, h: 1 }).filter(([x, y]) => '{}'.includes(ch(x, y))).length;
  assert.ok(shops >= 6, `${shops} shop front tiles on the west concourse`);
});

test('stage 3.1: the goo thickens from the entrance to the dock, and the court has it in one corner', () => {
  for (const r of ['lobby', 'concourse', 'scoops', 'passage']) assert.equal(share(r, '¨'), 0, `no goo in ${r}`);
  const court = share('court', '¨'), east = share('east', '¨'), dock = share('dock', '¨');
  assert.ok(court > 0 && court < 0.2, `a corner of the court (${court.toFixed(2)})`);
  assert.ok(east > 0 && east < 0.25, `patches in the east concourse (${east.toFixed(2)})`);
  assert.ok(dock > 0.5, `most of the dock (${dock.toFixed(2)})`);
  assert.ok(dock > east && east > 0, 'thicker as you go');
  const goo = rectTiles(ROOMS.court as TileRect).filter(([x, y]) => ch(x, y) === '¨');
  assert.ok(goo.every(([x, y]) => x >= 30 && y <= 20), 'the court\'s goo is all in its north-east corner');
  assert.ok(rectTiles({ tx: 45, ty: 2, w: 2, h: 2 }).every(([x, y]) => ch(x, y) === 'Þ'), 'the lift fills the dock\'s far corner');
});

test('stage 3.1: the lights are neon on the shop fronts, the fountain, the doors and the corridor bulbs, and the three strings', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || '){}?>'.includes(ch(tx, ty)), `the light at ${tx},${ty} is on floor, a wall face or the fountain`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  const fountain = S.lights.find((l) => l.r >= 60);
  assert.ok(fountain && ch(Math.floor(fountain.x / 16), Math.floor(fountain.y / 16)) === '>', 'the widest pool is the fountain\'s');
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_entry', 'lights_court', 'lights_service']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_entry', 'lights_court', 'lights_service']);
  const open = flood(new Set(['shutter1']));
  const trig = rectTiles(rectOf('ambush'));
  const court = rectTiles(rectOf('court'));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(!trig.some(([u, v]) => u === x && v === y), `${c.prop} is outside the ambush trigger, so a retry does not wake it at once`);
    assert.ok(!court.some(([u, v]) => u === x && v === y), `${c.prop} is outside the court's doorway, so a retry does not wake it at once`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 4, 'lights_entry is at the start');
  // lights_court is before the court's doorway beat, and lights_service before the soldiers' door: so a string lit in good time never
  // saves a beat that has fired for a fight the retry would put back to sleep.
  assert.ok(prop('lights_court').ty > rectOf('court').ty, 'lights_court is on the near side of the court beat');
  assert.ok(prop('lights_service').ty > rectOf('service').ty, 'lights_service is south of the service door');
});

// ---------------------------------------------------------------- spawns
test('stage 3.1: the start and every spawn, item and patrol point is on open ground, ids are unique, and the start is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  assert.ok(inRoom('lobby', startTx, startTy), 'the level begins in the lobby');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) for (const p of e.patrol ?? []) assert.equal(solid(p.tx, p.ty), false, `${e.id} patrols through ${p.tx},${p.ty}`);
  for (const p of props.filter((q) => q.prop !== 'firebox')) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 9, `${e.id} is too close to the start`);
  for (const [x, y] of rectTiles(ROOMS.lobby as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), 'nothing hostile in the lobby');
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights' || p.prop === 'sign').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights`);
});

test('stage 3.1: the roster is worth 170 to 210 XP, in the groups the spec names, with the court and the waves asleep', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 170 && xp <= 210, `stage XP ${xp}`);
  assert.equal(xp, 207);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('melter'), kind('flayed'), kind('soldier')], [21, 7, 2]);
  assert.equal(enemies.filter((e) => e.tier === 'elite').length, 2, 'two elites');
  assert.equal(enemies.length, 30);
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['amb1', 'amb2', 'amb3', 'court', 'crowd', 'door', 'vent']);
  assert.ok(groups('vent').every((e) => e.type === 'melter' && !e.dormant && inRoom('concourse', e.tx, e.ty)), 'melting rats out of the vent, awake, in the west concourse');
  assert.ok(groups('vent').length >= 4 && groups('vent').length <= 5);
  assert.ok(groups('court').every((e) => (e.type === 'melter' || e.type === 'flayed') && e.dormant && inRoom('court', e.tx, e.ty)), 'the court sleeps');
  assert.ok(groups('court').some((e) => e.type === 'flayed') && groups('court').filter((e) => e.type === 'melter').length >= 4, 'rats and Flayed in the court');
  assert.ok(groups('court').filter((e) => e.type === 'flayed').every((e) => ch(e.tx, e.ty) === '¨'), 'the Flayed wait in the goo');
  assert.ok(groups('crowd').every((e) => e.type === 'flayed' && !e.dormant && inRoom('east', e.tx, e.ty)), 'a Flayed crowd, awake, in the east concourse');
  assert.ok(groups('crowd').some((e) => e.tier === 'elite') && groups('crowd').length >= 2, 'with an elite');
  assert.ok(groups('door').length >= 2 && groups('door').every((e) => e.type === 'soldier' && !e.dormant), 'soldiers guard the service corridor');
  assert.ok(groups('door').every((e) => inRoom('leg1', e.tx, e.ty) || inRoom('up', e.tx, e.ty) || inRoom('leg3', e.tx, e.ty)), 'inside the service corridor');
  for (const g of WAVES) {
    assert.ok(groups(g).length >= 4 && groups(g).every((e) => (e.type === 'flayed' || e.type === 'melter') && e.dormant && inRoom('dock', e.tx, e.ty)), `${g} sleeps in the dock`);
    assert.ok(groups(g).some((e) => e.type === 'flayed') && groups(g).some((e) => e.type === 'melter'), `${g} has Flayed and rats`);
    assert.ok(groups(g).filter((e) => e.type === 'flayed').every((e) => ch(e.tx, e.ty) === '¨'), `${g}'s Flayed wait in the goo`);
  }
  assert.ok(groups('amb3').some((e) => e.tier === 'elite'), 'an elite in the last wave');
  assert.ok(enemies.filter((e) => !WAVES.includes(e.group) && e.group !== 'court').every((e) => !e.dormant && !e.hidden), 'everything but the court and the waves is awake');
  const wake = rectTiles(rectOf('ambush'));
  for (const e of WAVES.flatMap((g) => groups(g))) assert.ok(!wake.some(([x, y]) => x === e.tx && y === e.ty), `${e.id} waits outside the trigger`);
  assert.ok(enemies.every((e) => ['melter', 'flayed', 'soldier'].includes(e.type)), 'only the chapter 3 enemies');
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [3, 2, 14]);
  const back = items.filter((i) => inRoom('back', i.tx, i.ty)), shop = items.filter((i) => inRoom('shop', i.tx, i.ty));
  for (const [name, cache] of [['back room', back], ['side shop', shop]] as const) {
    assert.ok(cache.some((i) => i.item === 'eggo') && cache.filter((i) => i.item === 'quarter').length >= 3, `an Eggo and quarters in the ${name}`);
  }
  assert.ok(items.some((i) => i.item === 'eggo' && (inRoom('leg3', i.tx, i.ty) || inRoom('up', i.tx, i.ty))), 'the third Eggo is before the dock');
  assert.equal(npcs.length, 1);
  const erica = npcs[0] as (typeof npcs)[number];
  assert.deepEqual([erica.id, erica.dir], ['erica', 'down']);
  assert.ok(inRoom('scoops', erica.tx, erica.ty), 'Erica is in Scoops Ahoy');
  assert.equal(ch(erica.tx, erica.ty + 1), '£', 'behind the counter');
});

// ---------------------------------------------------------------- the gates
test('stage 3.1: shutter1 fills a three-wide mouth in the wall, panel1 hangs beside it, crack1 and crate1 fill their doorways', () => {
  const sh = prop('shutter1');
  assert.deepEqual([sh.prop, sh.w, sh.h, sh.solid], ['shutter', 48, 16, true]);
  assert.equal(propTiles(sh).length, 3);
  const [lo, hi] = [propTiles(sh)[0] as [number, number], propTiles(sh).at(-1) as [number, number]];
  assert.ok(solid(lo[0] - 1, lo[1]) && solid(hi[0] + 1, hi[1]), 'shutter1 fills the mouth wall to wall');
  assert.ok(propTiles(sh).every(([x, y]) => !solid(x, y) && !solid(x, y - 1) && !solid(x, y + 1)), 'with floor under it, in front of it and behind it');
  assert.ok(inRoom('concourse', lo[0], lo[1] + 1) && inRoom('passage', lo[0], lo[1] - 1), 'the concourse south of it, the passage to the court north');
  const panel = prop('panel1');
  assert.deepEqual([panel.prop, panel.hitBy, panel.smash, panel.solid], ['firebox', 'shoot', true, undefined]);
  assert.ok(solid(panel.tx, panel.ty) && !solid(panel.tx, panel.ty + 1), 'panel1 hangs on a wall face over open floor');
  assert.equal(Math.abs(panel.tx - lo[0]), 1, 'on the wall beside the shutter');
  assert.equal(panel.ty, lo[1], 'in the same wall row');
  const crack = prop('crack1');
  assert.deepEqual([crack.prop, crack.hitBy, crack.w, crack.h, crack.solid], ['crack', 'smash', 32, 16, true]);
  assert.ok(solid(crack.tx - 1, crack.ty) && solid(crack.tx + 2, crack.ty), 'crack1 fills the back room\'s door wall to wall');
  assert.ok(propTiles(crack).every(([x, y]) => !solid(x, y)), 'with floor under it, so breaking it leaves a way in');
  assert.ok(inRoom('back', crack.tx, crack.ty - 2) && inRoom('scoops', crack.tx, crack.ty + 1), 'the back room above it, Scoops Ahoy below');
  const crate = prop('crate1');
  assert.deepEqual([crate.prop, crate.pushBy, crate.w, crate.h], ['crate', 'push', 32, 16]);
  assert.ok(solid(crate.tx - 1, crate.ty) && solid(crate.tx + 2, crate.ty), 'crate1 fills the side shop\'s door wall to wall');
  assert.ok(propTiles(crate).every(([x, y]) => !solid(x, y)), 'with floor under it');
  assert.ok(inRoom('shop', crate.tx, crate.ty - 2) && inRoom('exit', crate.tx, crate.ty + 1), 'the side shop above it, the exit corridor below');
  assert.deepEqual(props.filter((p) => !['lights', 'sign'].includes(p.prop)).map((p) => p.id), ['shutter1', 'panel1', 'crack1', 'crate1']);
});

// ---------------------------------------------------------------- reachability
test('stage 3.1: the route runs to the dock when the gates are open, and shutter1 cuts the stage after the concourse', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number][] = [
    ['the lobby', 4, 35], ['the concourse', 20, 36], ['Scoops Ahoy', 15, 30], ['the court', 25, 20], ['the exit corridor', 40, 26],
    ['the east concourse', 45, 14], ['the service corridor', 30, 11], ['the corridor\'s turn', 22, 7], ['the corridor\'s last leg', 28, 3], ['the dock', 44, 6], ['the lift', 46, 3],
  ];
  assert.equal(reach([], startTx, startTy), 1);
  for (const [name, x, y] of spots.slice(0, 3)) assert.equal(reach([], x, y), 1, `${name} is open at the start`);
  for (const [name, x, y] of spots.slice(3)) {
    assert.equal(reach([], x, y), 0, `${name} is behind shutter1`);
    assert.equal(reach(['shutter1'], x, y), 1, `${name} is reachable once shutter1 is open`);
  }
  for (const [name, x, y] of spots) assert.equal(reach(GATES, x, y), 1, `${name} is reachable`);
  const cache = (r: string): [number, number][] => rectTiles(ROOMS[r] as TileRect);
  const shut = flood(new Set(['shutter1']));
  assert.ok(cache('back').every(([x, y]) => at(shut, x, y) === 0), 'the back room is shut until crack1 is broken');
  assert.ok(cache('shop').every(([x, y]) => at(shut, x, y) === 0), 'the side shop is shut until crate1 is moved');
  assert.ok(cache('back').every(([x, y]) => at(flood(new Set(['shutter1', 'crack1'])), x, y) === 1 || solid(x, y) || ch(x, y) === 'N'), 'the back room is open after crack1');
  assert.ok(cache('shop').every(([x, y]) => at(flood(new Set(['shutter1', 'crate1'])), x, y) === 1 || solid(x, y) || ch(x, y) === 'N'), 'the side shop is open after crate1');
  assert.equal(reach(['shutter1', 'crack1'], 40, 20), 0, 'crack1 does nothing for the side shop');
  assert.equal(reach(['shutter1', 'crate1'], 15, 21), 0, 'and crate1 nothing for the back room');
});

test('stage 3.1: with every gate open nothing is boxed in, and every spawn and light string is reachable', () => {
  const open = flood(ALL);
  const blocked = kit.blocked(ALL);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) {
    assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  }
});

// ---------------------------------------------------------------- the puzzles
test('stage 3.1: three puzzles, in route order, each with a hero in the roster who opens it, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['shutter', 'crack', 'crate']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['shutter_hint', 'crack_hint', 'crate_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['panel1', 'crack1', 'crate1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['lucas', 'steve', 'eleven']);
  assert.deepEqual(S.puzzles[0]?.blocks, ['shutter1']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined));
  const roster = rosterFor('3.1');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    const target = prop(p.prop);
    const need = target.hitBy ?? target.pushBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    const able = roster.filter((h) => HERO_DEFS[h].utilities.includes(need as never));
    assert.ok(able.includes(p.hero), `${p.id}: ${p.hero} has ${need}`);
    // Only the panel can be opened by anyone: crack1 and crate1 each need one hero, and the hint never names another.
    if (p.id !== 'shutter') assert.deepEqual(able, [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
  // The panel: a shot, or anyone's basic attack up close. Its alt list names Nancy, then every other hero, so the hint always
  // names someone in the party.
  const panel = S.puzzles[0];
  assert.ok(prop('panel1').smash, 'anyone up close lights the panel');
  assert.deepEqual(roster.filter((h) => HERO_DEFS[h].utilities.includes('shoot')), ['lucas', 'nancy']);
  assert.deepEqual(panel?.alt?.map((a) => a.hero), ['nancy', 'mike', 'dustin', 'will', 'eleven', 'max', 'steve', 'robin']);
  assert.deepEqual([...(panel?.alt?.map((a) => a.hero) ?? []), 'lucas'].sort(), [...roster].sort(), 'every hero in the roster is named by the hint');
  assert.equal(panel?.alt?.[0]?.hint, 'MAYBE NANCY SHOULD TRY HER PISTOL');
  for (const a of panel?.alt?.slice(1) ?? []) assert.equal(a.hint, `MAYBE ${HERO_DEFS[a.hero].name.toUpperCase()} SHOULD HIT THE PANEL`);
  assert.ok(S.puzzles.slice(1).every((p) => p.alt === undefined), 'only the panel has an alt list');
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-7.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    for (const [hero, hint] of [[p.hero, p.hint] as const, ...(p.alt ?? []).map((a) => [a.hero, a.hint] as const)]) {
      assert.ok(fitsBox(hint, cols, 1), `"${hint}" is over one subtitle row`);
      assert.equal(hint, hint.toUpperCase());
      assert.ok(hint.includes(HERO_DEFS[hero].name.toUpperCase()), `${p.id}: ${hint} names ${hero}`);
      assert.ok(!/[0-9]/.test(hint) && !/seamless|robust|leverage|unlock|delve/i.test(hint) && !hasEmDash(hint), 'no key digits, no banned words');
    }
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-7.md`);
  }
  assert.ok(doc.includes('MAYBE NANCY SHOULD TRY HER PISTOL') && doc.includes('MAYBE MIKE SHOULD HIT THE PANEL'));
});

// ---------------------------------------------------------------- beats and scripts
test('stage 3.1: every beat has a trigger and a real script, in the spec\'s order, and the rect beats sit behind the right gates', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(ALL);
  const ids = S.beats.map((b) => b.id);
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
    else if (w.event === 'pinned') assert.fail('no boss in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('shutter_open'), { event: 'targetHit', prop: 'panel1' });
  assert.deepEqual(when('crack_open'), { event: 'propCleared', prop: 'crack1' });
  assert.deepEqual(when('crate_cleared'), { event: 'propCleared', prop: 'crate1' });
  assert.deepEqual(when('level_clear'), { cleared: 'amb3' });
  assert.deepEqual(S.beats.find((b) => b.id === 'shutter_open')?.steps, [{ t: 'open', prop: 'shutter1' }, { t: 'say', script: 'l7_shutter_done' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'court')?.steps, [{ t: 'say', script: 'l7_court' }, { t: 'wake', group: 'court' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'ambush')?.steps, [{ t: 'say', script: 'l7_ambush' }, { t: 'waves' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'level_clear')?.steps, [{ t: 'say', script: 'l7_clear' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'music' && st.t !== 'scare')), 'no music change and no scare');
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'scoops', 'shutter_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['court', 'crate_hint', 'service', 'ambush']) {
    assert.ok(through(['shutter1'], id), `${id} is reachable once shutter1 is open`);
    assert.ok(!through([], id), `${id} is not reachable with shutter1 shut`);
  }
  assert.ok(through(['shutter1'], 'crack_hint'), 'the crack hint is in Scoops Ahoy, with no gate in the way');
  assert.ok(through([], 'crack_hint'), 'the crack hint is in Scoops Ahoy at the start');
  assert.ok(rectOf('start').tx <= startTx && startTx < rectOf('start').tx + rectOf('start').w && rectOf('start').ty <= startTy, 'the start beat covers the start');
  const hint = rectOf('shutter_hint'), sh = prop('shutter1');
  assert.ok(hint.ty > sh.ty && hint.tx <= sh.tx && hint.tx + hint.w >= sh.tx + 3, 'the shutter hint stands on the concourse side, in front of the shutter');
  const cr = rectOf('crack_hint');
  assert.ok(cr.ty > prop('crack1').ty && cr.ty <= prop('crack1').ty + 3, 'the crack hint stands in Scoops Ahoy, in front of crack1');
  const ct = rectOf('crate_hint');
  assert.ok(ct.ty > prop('crate1').ty && ct.ty <= prop('crate1').ty + 3, 'the crate hint stands in the exit corridor, in front of crate1');
  assert.ok([[15, 32], [16, 32], [15, 33], [16, 33]].every(([x, y]) => rectTiles(rectOf('scoops')).some(([u, v]) => u === x && v === y)), 'the scoops beat covers the doorway');
  assert.ok(rectTiles(rectOf('ambush')).every(([x, y]) => inRoom('dock', x, y)), 'the ambush trigger is inside the dock');
});

test('director: the beats run in route order, shutter1 opens before its script, the court wakes and the three waves chain to the finish', () => {
  const { env, log } = fakeEnv({ court: 8, amb1: 3, amb2: 3, amb3: 3 }, ['mike', 'eleven', 'robin', 'nancy']);
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l7_start'], 'a rect beat fires once');
  for (const [id, script] of [['scoops', 'l7_scoops'], ['shutter_hint', 'l7_shutter_hint']] as const) assert.deepEqual(run(() => tick(id)), [`say ${script}`], id);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'panel1' }])), ['open shutter1', 'say l7_shutter_done']);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'other' }])), [], 'only the panel opens it');
  assert.deepEqual(run(() => tick('crack_hint')), ['say l7_crack_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crack1' }])), ['say l7_crack_done']);
  assert.deepEqual(run(() => tick('court')), ['say l7_court', 'wake court']);
  assert.deepEqual(run(() => tick('crate_hint')), ['say l7_crate_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crate1' }])), ['say l7_crate_done']);
  assert.deepEqual(run(() => tick('service')), ['say l7_service']);
  assert.deepEqual(run(() => tick('ambush')), ['say l7_ambush', 'wake amb1']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb1' }])), ['wake amb2']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb2' }])), ['wake amb3']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb3' }])), ['say l7_clear', 'finish']);
  assert.ok(d.finished());
});

test('stage 3.1: the 12 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to their voices', () => {
  const doc = readFileSync(new URL('../docs/level-7.md', import.meta.url), 'utf8');
  const listed = [...(/^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '').split('. ')[0]?.matchAll(/`([a-z0-9_]+)`/g) ?? []].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the twelve');
  assert.deepEqual(L7_SCRIPTS.map((s) => s.id).sort(), [...SCRIPT_IDS].sort());
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l7_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l7 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L7_SCRIPTS) {
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
  const all = L7_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  const by = (h: string): typeof all => all.filter((l) => l.who === h);
  for (const h of ['robin', 'nancy', 'erica', 'eleven']) assert.ok(by(h).length >= 4, `${h} speaks`);
  assert.ok(by('robin').filter((l) => l.text.length >= 70).length >= 2 && by('robin').some((l) => /four languages/.test(l.text)), 'Robin rambles, and gets worse under stress');
  assert.ok(by('nancy').length >= 4 && by('nancy').every((l) => l.text.length <= 72), 'Nancy is flat and short');
  assert.ok(by('nancy').some((l) => /cover me/i.test(l.text)), 'Nancy says it');
  assert.ok(by('erica').some((l) => /quarter|bill|rate|receipt|priced|pay/i.test(l.text)) && by('erica').length >= 4, 'Erica talks business');
  assert.ok(by('eleven').every((l) => l.text.length <= 44 && /[.!?]$/.test(l.text)), 'Eleven speaks in short full sentences');
  assert.ok(who('l7_scoops').has('erica') && who('l7_scoops').has('steve') && who('l7_scoops').has('robin'), 'Steve and Robin\'s shop, and Erica won\'t be left out');
  assert.ok(who('l7_service').has('nancy'), 'Nancy spots the soldiers');
  assert.ok(!all.some((l) => /\{swapTo\d\}/.test(l.text)), 'no line names a swap slot: the party is picked on the map');
  assert.match(text('l7_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l7_shutter_hint'), /\{attack\}/, 'the panel takes a hit');
  assert.match(text('l7_shutter_hint'), /slingshot|pistol/i);
  assert.match(text('l7_crack_hint'), /\{attack\}/, 'the nail bat is the basic');
  assert.match(text('l7_crate_hint'), /\{attack\}/, 'the shove is the basic');
  assert.match(text('l7_ambush'), /\{burst\}/, 'the ambush teaches the party burst');
  assert.match(text('l7_court'), /rising|spread|goo/i);
  assert.match(text('l7_service'), /soldier/i);
  assert.match(text('l7_clear'), /lift/i);
  assert.match(text('l7_clear'), /base/i);
  assert.ok(!/\b(two|three|four|five|six|seven|eight|nine|\d+) soldiers\b/i.test(all.map((l) => l.text).join(' ')), 'nobody counts the soldiers, so the roster can change without the words');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
});

// ---------------------------------------------------------------- the bot's route
test('stage 3.1: the waypoints are reachable in order, shutter1 is opened by flag, the route skips both caches and ends in the ambush', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the court and the ambush wake themselves');
    if (w.open) { assert.equal(w.open, 'shutter1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(rectTiles(rectOf('ambush')).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the ambush trigger');
  for (const room of ['back', 'shop']) {
    assert.ok(S.waypoints.every((w) => !rectTiles(ROOMS[room] as TileRect).some(([x, y]) => [x, y].join() === tileOf(w.x, w.y).join())), `the route skips the ${room}`);
  }
  // The beats whose rectangles the bot's path goes through, from the start tile on: every rect beat on the route.
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'scoops', 'shutter_hint', 'court', 'crate_hint', 'service', 'ambush']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(S.waypoints.length >= 25, `${S.waypoints.length} waypoints`);
});
