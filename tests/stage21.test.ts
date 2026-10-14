// Stage 2.1, the Palace and the patch, as data: the map and its rooms, the budget, the four gates in route order, every gate's
// hero, the checkpoints and the bot's route. The beats, the director and the scripts are in stage21-beats.test.ts, and the real
// sim and whole runs in stage21-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILES } from '../src/core/tiles.ts';
import { rosterFor } from '../src/core/campaign.ts';
import { ENEMY_DEFS, ELITE } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { fitsBox } from '../src/core/text.ts';
import { STAGE_21 as S, ROWS, WAVES } from '../src/world/stages/stage21.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const GATES = ['vines1', 'gate1', 'hidden1'];
const ALL = new Set(GATES);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The rooms, as tile rectangles of their floors. */
const ROOMS: Record<string, TileRect> = {
  palace: { tx: 1, ty: 1, w: 17, h: 7 }, street: { tx: 1, ty: 9, w: 46, h: 5 }, rows: { tx: 2, ty: 15, w: 33, h: 8 },
  yard: { tx: 1, ty: 26, w: 22, h: 12 }, field: { tx: 24, ty: 26, w: 23, h: 4 }, hole: { tx: 24, ty: 32, w: 23, h: 6 },
};
const roomCount = (room: string, chars: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => chars.includes(ch(x, y))).length;
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
const rectOf = (id: string): TileRect => (S.beats.find((b) => b.id === id)?.when as { rect: TileRect }).rect;

// ---------------------------------------------------------------- the map
test('stage 2.1: the map is 48 by 40, uses only legend characters, is walled all round and runs by day with the Hawkins theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(grid.solid[idx(x, 0)] && grid.solid[idx(x, grid.h - 1)], 'top and bottom edges are solid');
  for (let y = 0; y < grid.h; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(grid.w - 1, y)], 'left and right edges are solid');
  assert.deepEqual([S.id, S.name, S.time, S.music], ['2.1', 'The Palace and the patch', 'day', 'hawkins']);
  assert.deepEqual(S.lights, [], 'a day stage has no light pools');
  assert.ok((S.enemyMult ?? 1) >= 1);
  assert.deepEqual(WAVES, ['amb1', 'amb2', 'amb3']);
  assert.deepEqual(S.waves, WAVES);
  const used = new Set(S.rows.join(''));
  for (const c of '+&/@^*$0[]|;<') assert.ok(used.has(c), `the map uses the 2.1 tile '${c}'`);
  for (const c of '=_l:FT.%') assert.ok(used.has(c), `the map uses '${c}'`);
});

test('stage 2.1: every room has its own floor and dressing, and the rot thickens from the rows to the hole', () => {
  const floors: [string, string, number][] = [
    ['palace', '+Z', 0.95], ['street', '/=_l', 0.95], ['rows', '^;*$', 0.95], ['yard', ':.0', 0.95], ['field', '^;*$', 0.95], ['hole', ';<|tr', 0.95],
  ];
  for (const [room, chars, share] of floors) {
    const r = ROOMS[room] as TileRect;
    assert.ok(roomCount(room, chars) >= r.w * r.h * share, `${room} is mostly '${chars}'`);
  }
  assert.ok(roomCount('street', '/') >= 80 && roomCount('street', '=') >= 60 && roomCount('street', '_') >= 40, 'sidewalk, road and roadline');
  assert.ok(roomCount('street', 'l') >= 4, 'lamps on the street');
  assert.ok(S.rows[8]?.includes('@@@@@@@@') && S.rows[7]?.includes('%%%'), 'shop fronts along the north side, brick at the east end');
  assert.ok(roomCount('palace', 'Z') >= 4, 'a prize counter in the Palace');
  assert.ok(roomCount('rows', '*') >= 40 && roomCount('rows', '$') >= 6, 'whole and rotten pumpkins in the rows');
  assert.ok(roomCount('rows', ';') >= 50, 'rot in the rows');
  assert.ok(roomCount('yard', '0') >= 6, 'haybales in the yard');
  assert.ok(S.rows[24]?.includes(']]]]') && S.rows[25]?.includes('[[[['), 'the barn roof over the barn wall');
  assert.ok(roomCount('hole', '<') >= 25, 'the hole');
  assert.ok(roomCount('hole', ';') >= roomCount('rows', ';') * 1.4 || roomCount('hole', ';') >= 80, 'the rot is thickest at the hole');
  const corn = [...S.rows.entries()].flatMap(([y, row]) => [...row].flatMap((c, x) => (c === '|' ? [[x, y]] : []))).length;
  assert.ok(corn >= 80, `${corn} corn tiles: the walls the far field is cut through`);
  const inPatch = (x: number, y: number): boolean => y >= 14;
  for (const [y, row] of S.rows.entries()) for (const [x, c] of [...row].entries()) {
    if ('*$0;<|^[]'.includes(c)) assert.ok(inPatch(x, y), `patch tile '${c}' at ${x},${y} is outside the patch`);
    if ('+&@/'.includes(c)) assert.ok(y <= 14 || c === '&' || c === '@', `town tile '${c}' at ${x},${y} is inside the patch`);
  }
});

test('stage 2.1: the pumpkin rows zigzag: the way through is far longer than the field is wide', () => {
  // Each row of pumpkins is open at one end only, opposite ends in turn, and the block east of the lanes is solid farm.
  const gaps = (y: number): number[] => [...Array(35).keys()].filter((x) => x >= 2 && !grid.solid[idx(x, y)]);
  assert.deepEqual(gaps(17), [3, 4], 'the first row opens at the west end');
  assert.deepEqual(gaps(20), [33, 34], 'the second at the east end');
  // Breadth-first from just inside the gate to the lane down to the yard.
  const dist = new Int32Array(grid.w * grid.h).fill(-1);
  const q: number[] = [idx(40, 15)];
  dist[q[0] as number] = 0;
  const blocked = kit.blocked(new Set(['vines1', 'gate1', 'hidden1']));
  for (let i = 0; i < q.length; i++) {
    const c = q[i] as number, x = c % grid.w, y = (c / grid.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const j = idx(x + dx, y + dy);
      if (blocked[j] || dist[j] >= 0) continue;
      dist[j] = (dist[c] as number) + 1;
      q.push(j);
    }
  }
  assert.ok((dist[idx(3, 24)] as number) >= 95, `the way down to the yard is ${dist[idx(3, 24)]} tiles, for a field 33 wide`);
});

test('stage 2.1: the Palace is walled with one door onto the street, and the cabinets, Max and the lights are where the beats expect', () => {
  for (let x = 0; x <= 18; x++) assert.equal(grid.solid[idx(x, 8)], x === 8 || x === 9 ? 0 : 1, `the Palace facade at ${x}`);
  for (let y = 0; y <= 8; y++) assert.ok(grid.solid[idx(0, y)] && grid.solid[idx(18, y)], `the Palace side walls at ${y}`);
  assert.ok('+'.includes(ch(startTx, startTy)), 'the level begins in the Palace');
  const cabs = props.filter((p) => p.prop === 'arcade');
  assert.ok(cabs.length >= 8 && cabs.length <= 10, `${cabs.length} cabinets`);
  assert.equal(cabs.filter((p) => p.id === 'digdug').length, 1, 'one Dig Dug, with MADMAX on its screen');
  for (const c of cabs) assert.ok(c.solid && inRoom('palace', c.tx, c.ty), `${c.id} stands in the Palace and is solid`);
  assert.equal(npcs.length, 1);
  const max = npcs[0] as (typeof npcs)[number];
  const dig = prop('digdug');
  assert.equal(max.id, 'max', 'Max is the one npc');
  assert.ok(max.tx === dig.tx && max.ty === dig.ty + 1, 'she stands at the Dig Dug cabinet');
  assert.ok(rectTiles(rectOf('max')).some(([x, y]) => x === max.tx && y === max.ty - 1) || rectTiles(rectOf('max')).some(([x, y]) => x === max.tx && y === max.ty), 'and the max beat is next to her');
});

// ---------------------------------------------------------------- spawns
test('stage 2.1: the start and every spawn are on walkable ground, ids are unique, and the start is quiet', () => {
  assert.equal(grid.solid[idx(startTx, startTy)], 0, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(grid.solid[idx(s.tx, s.ty)], 0, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 12, `${e.id} is too close to the start`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length);
  for (const [x, y] of rectTiles(ROOMS.palace as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), 'nothing hostile in the Palace');
});

test('stage 2.1: the roster is worth 130 to 170 XP: demodogs in the barn and the hole, vines and pods in the lanes and the corn, rats on the street', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 130 && xp <= 170, `stage XP ${xp}`);
  assert.equal(xp, 166);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('demodog'), kind('vine'), kind('pod'), kind('rat')], [13, 5, 4, 3]);
  assert.equal(enemies.length, 25);
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([groups('street').length, groups('rows').length, groups('barn').length, groups('corn').length], [3, 5, 4, 3]);
  assert.deepEqual([groups('amb1').length, groups('amb2').length, groups('amb3').length], [3, 3, 4]);
  assert.ok(groups('street').every((e) => e.type === 'rat') && groups('street').every((e) => inRoom('street', e.tx, e.ty)));
  assert.deepEqual([groups('rows').filter((e) => e.type === 'vine').length, groups('rows').filter((e) => e.type === 'pod').length], [2, 3]);
  assert.ok(groups('rows').every((e) => inRoom('rows', e.tx, e.ty) && ';^'.includes(ch(e.tx, e.ty))), 'the vines and pods are rooted in the lanes');
  assert.ok(groups('barn').filter((e) => e.type === 'demodog').length >= 3, 'a pack of three in the barn yard, before the hole');
  assert.ok(groups('barn').some((e) => e.type === 'vine') && groups('barn').every((e) => inRoom('yard', e.tx, e.ty)));
  assert.deepEqual(groups('corn').map((e) => e.type).sort(), ['pod', 'vine', 'vine']);
  assert.ok(groups('corn').filter((e) => e.type === 'vine').every((e) => e.hidden === true), 'both vines in the corn are hidden');
  assert.ok(groups('corn').every((e) => inRoom('field', e.tx, e.ty)));
  assert.ok(enemies.filter((e) => e.group !== 'corn').every((e) => !e.hidden), 'nothing else is hidden');
  for (const g of WAVES) assert.ok(groups(g).every((e) => e.type === 'demodog' && e.dormant && inRoom('hole', e.tx, e.ty)), `${g} sleeps in the hole`);
  assert.ok(enemies.filter((e) => !WAVES.includes(e.group)).every((e) => !e.dormant), 'everything before the hole is awake');
  const trig = rectOf('ambush');
  for (const e of groups('amb1').concat(groups('amb2'), groups('amb3'))) assert.ok(rectTiles(trig).some(([x, y]) => x === e.tx && y === e.ty), `${e.id} waits inside the ambush trigger`);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [3, 2, 12]);
});

test('stage 2.1: props sit where the art expects them, and each gate fills its gap', () => {
  const dressing = props.filter((p) => !['vines', 'hidden', 'gate', 'target'].includes(p.prop));
  for (const p of dressing) for (const [x, y] of propTiles(p)) assert.equal(grid.solid[idx(x, y)], 0, `${p.id} stands on open ground at ${x},${y}`);
  const vines = prop('vines1');
  assert.deepEqual([vines.prop, vines.hitBy, vines.w, vines.h, vines.solid], ['vines', 'burn', 32, 16, true]);
  assert.ok(grid.solid[idx(vines.tx - 1, vines.ty)] && grid.solid[idx(vines.tx + 2, vines.ty)], 'vines1 fills the gap in the fence, wall to wall');
  assert.equal(ch(vines.tx - 1, vines.ty), 'F');
  const gate = prop('gate1');
  assert.deepEqual([gate.prop, gate.w, gate.h], ['gate', 16, 48]);
  assert.ok(grid.solid[idx(gate.tx, gate.ty - 1)] && grid.solid[idx(gate.tx, gate.ty + 3)], 'gate1 fills the gap in the fence between the yard and the far field');
  assert.ok(propTiles(gate).every(([x, y]) => grid.solid[idx(x, y)] === 0), 'on open ground');
  const hidden = prop('hidden1');
  assert.deepEqual([hidden.prop, hidden.hitBy, hidden.w, hidden.h, hidden.solid], ['hidden', 'sense', 16, 32, true]);
  assert.ok(grid.solid[idx(hidden.tx - 1, hidden.ty)] && grid.solid[idx(hidden.tx + 1, hidden.ty)] && grid.solid[idx(hidden.tx - 1, hidden.ty + 1)], 'hidden1 stands in a corn wall');
  assert.ok(propTiles(hidden).every(([x, y]) => grid.solid[idx(x, y)] === 0), 'with a floor under it, so opening it leaves a path');
  assert.equal(ch(hidden.tx - 1, hidden.ty), '|');
  const target = prop('target1');
  assert.deepEqual([target.prop, target.hitBy], ['target', 'shoot']);
  assert.equal(ch(target.tx, target.ty), '[', 'the target hangs on the barn wall');
  assert.equal(grid.solid[idx(target.tx, target.ty + 1)], 0, 'with the yard in front of it');
  assert.equal(props.filter((p) => p.prop === 'bike').length, 2, 'two parked bikes');
  assert.equal(props.filter((p) => p.prop === 'lights').length, 3);
  assert.ok(inRoom('street', prop('trash1').tx, prop('trash1').ty), 'the trash can is on Main Street');
});

// ---------------------------------------------------------------- reachability
const streetP = [30, 11], rowsP = [20, 19], yardP = [10, 30], fieldP = [35, 28], holeP = [35, 35];

test('stage 2.1: vines1, gate1 and hidden1 cut the route in that order, with every solid prop in the way', () => {
  const reach = (open: string[], p: number[]): number => at(flood(new Set(open)), p[0] as number, p[1] as number);
  for (const p of [[startTx, startTy], streetP]) assert.equal(reach([], p), 1, `${p} is open at the start`);
  for (const p of [rowsP, yardP, fieldP, holeP]) assert.equal(reach([], p), 0, `${p} is cut off at the start`);
  assert.equal(reach(['gate1', 'hidden1'], rowsP), 0, 'the later gates do nothing before the vines');
  for (const p of [rowsP, yardP]) assert.equal(reach(['vines1'], p), 1, `${p} after the vines`);
  for (const p of [fieldP, holeP]) assert.equal(reach(['vines1'], p), 0, `${p} is still behind gate1`);
  assert.equal(reach(['vines1', 'hidden1'], fieldP), 0, 'the hidden path comes after the gate, not instead of it');
  assert.equal(reach(['vines1', 'gate1'], fieldP), 1);
  assert.equal(reach(['vines1', 'gate1'], holeP), 0, 'the corn still holds the hole');
  assert.equal(reach(GATES, holeP), 1, 'open, the route runs through to the hole');
});

test('stage 2.1: with every gate open nothing is boxed in, and every spawn is reachable', () => {
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

test('stage 2.1: nothing worth a detour lies within the bot\'s pickup reach on the far side of a shut gate', () => {
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

test('stage 2.1: three lights, each reachable and lit before a hard stretch', () => {
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_palace', 'lights_patch', 'lights_field']);
  for (const c of S.checkpoints) {
    assert.ok(props.some((p) => p.id === c.prop && p.prop === 'lights'));
    const [x, y] = tileOf(c.x, c.y);
    assert.equal(at(flood(ALL), x, y), 1, `checkpoint ${c.prop} is walkable`);
    const p = prop(c.prop);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
  }
  const tile = (i: number): [number, number] => tileOf(S.checkpoints[i]?.x ?? 0, S.checkpoints[i]?.y ?? 0);
  const [lx, ly] = tile(0), [px_, py] = tile(1), [fx, fy] = tile(2);
  assert.ok(at(flood(new Set()), lx, ly) && Math.hypot(lx - startTx, ly - startTy) < 6, 'lights_palace is at the start');
  assert.ok(!at(flood(new Set()), px_, py) && at(flood(new Set(['vines1'])), px_, py), 'lights_patch is just inside the vines');
  assert.ok(Math.hypot(px_ - (prop('vines1').tx + 1), py - prop('vines1').ty) < 6);
  assert.ok(!at(flood(new Set(['vines1', 'gate1'])), fx, fy) && at(flood(ALL), fx, fy), 'lights_field is behind the hidden path');
  assert.ok(Math.hypot(fx - (prop('hidden1').tx), fy - prop('hidden1').ty) < 6, 'and just past it');
  assert.ok(!rectTiles(rectOf('ambush')).some(([x, y]) => x === fx && y === fy), 'lights_field is outside the ambush trigger, so a retry does not wake it at once');
});

// ---------------------------------------------------------------- the gates and their heroes
test('stage 2.1: every gate has a hero in the party who opens it, and the puzzles name that hero and their hint', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['vines', 'target', 'hidden']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['vines_hint', 'target_hint', 'sense_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['vines1', 'target1', 'hidden1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['dustin', 'lucas', 'will']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined));
  assert.deepEqual(rosterFor('2.1'), ['mike', 'dustin', 'lucas', 'will'], 'Eleven is not in the party');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const target = props.find((x) => x.id === p.prop);
    assert.ok(target, `${p.id}: prop ${p.prop} exists`);
    const need = target?.hitBy ?? target?.pushBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    // The swap has to matter: of the heroes in the party, exactly one can do it, and it is the one the hint names.
    const can = rosterFor('2.1').filter((h) => HERO_DEFS[h].utilities.includes(need as never));
    assert.deepEqual(can, [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
  for (const g of GATES) assert.ok(S.puzzles.some((p) => p.prop === g || p.blocks?.includes(g)), `${g} belongs to a puzzle`);
  assert.deepEqual(S.puzzles.find((p) => p.id === 'target')?.blocks, ['gate1']);
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-4.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-4.md`);
  }
});

// ---------------------------------------------------------------- the bot
test('stage 2.1: the bot waypoints are reachable in order and flag the three gates, ending inside the ambush trigger', () => {
  const open = new Set<string>();
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y}`);
    if (w.open) open.add(w.open);
  });
  assert.deepEqual(S.waypoints.flatMap((w) => (w.open ? [w.open] : [])), GATES, 'the bot opens vines1, gate1 and hidden1 in route order');
  assert.deepEqual(S.waypoints.flatMap((w) => (w.wake ? [w.wake] : [])), [], 'the ambush wakes itself');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot has a path between every pair of waypoints');
  assert.ok(route.tiles.size >= 190, `the route is ${route.tiles.size} tiles long`);
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(rectTiles(rectOf('ambush')).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the ambush trigger');
  for (const w of S.waypoints.filter((q) => q.open)) {
    const g = prop(w.open as string);
    const [x, y] = tileOf(w.x, w.y);
    assert.ok(Math.hypot(x - g.tx, y - g.ty) < 8, `${w.open} is opened close by`);
  }
});
