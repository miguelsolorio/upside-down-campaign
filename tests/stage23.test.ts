// Stage 2.3, the Gate, as data: the map and its rooms, the XP budget, the gates and the seals, reachability, the puzzles, the burrows
// and the defense, and the checkpoints. The beats, the scripts and the bot's route are in stage23-beats.test.ts, and the real sim and
// the whole headless runs are in stage23-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox } from '../src/core/text.ts';
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { STAGE_23 as S, ROWS } from '../src/world/stages/stage23.ts';
import { BURROWS, DEFENSE } from '../src/world/stages/stage23_data.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The rooms, as the map draws them (inclusive of every floor tile, dressing and all). */
export const ROOMS: Record<string, TileRect> = {
  mouth: { tx: 2, ty: 31, w: 8, h: 6 }, corridor: { tx: 10, ty: 32, w: 11, h: 4 }, throat: { tx: 21, ty: 33, w: 3, h: 2 },
  storage: { tx: 24, ty: 29, w: 14, h: 9 }, cache: { tx: 40, ty: 31, w: 6, h: 6 }, hallN: { tx: 31, ty: 21, w: 2, h: 8 },
  hallW: { tx: 8, ty: 19, w: 25, h: 2 }, den: { tx: 6, ty: 4, w: 18, h: 12 }, stairwell: { tx: 27, ty: 5, w: 5, h: 8 },
  chamber: { tx: 34, ty: 3, w: 12, h: 9 },
};
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
/** Share of a room's walkable tiles that are one of `chars`. */
const share = (room: string, chars: string): number => {
  const floor = rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => !solid(x, y));
  return floor.filter(([x, y]) => chars.includes(ch(x, y))).length / floor.length;
};
/** The same flood fill, over `blocked` instead of the kit's own: for the seals, which are open (not solid) in the stage data. */
function bfs(blocked: Uint8Array, from: [number, number]): Uint8Array {
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [idx(from[0], from[1])];
  seen[stack[0] as number] = 1;
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % grid.w, y = (i / grid.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const j = idx(x + dx, y + dy);
      if (x + dx < 0 || y + dy < 0 || x + dx >= grid.w || y + dy >= grid.h || seen[j] || blocked[j]) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  return seen;
}
/** Blocked tiles with crack1 and gap1 open (as in the bot's route) and each of `shut` standing as a wall. */
function withSeals(shut: string[], open: string[] = ['crack1']): Uint8Array {
  const b = kit.blocked(new Set(open));
  for (const id of shut) for (const [x, y] of propTiles(prop(id))) b[idx(x, y)] = 1;
  return b;
}

// ---------------------------------------------------------------- the map
test('stage 2.3: the map is 48 by 40, uses only legend characters, is solid all round and runs at night with the lab track', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['2.3', 'The Gate', 'night', 'lab']);
  assert.ok((S.enemyMult ?? 1) >= 0.5 && (S.enemyMult ?? 1) <= 1.3, `enemyMult ${S.enemyMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set(S.rows.join(''));
  for (const c of 'VW98!oO1234') assert.ok(used.has(c), `the map uses '${c}'`);
  assert.ok(![...used].some((c) => 'TFHlr'.includes(c)), 'nothing from the outdoors');
});

test('stage 2.3: the lab walls are a cap row over a face row looking onto floor, and the flesh thickens from the mouth to the Gate', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      if (c === 'W' || c === '3') {
        assert.ok(!solid(x, y + 1), `the wall face at ${x},${y} looks onto floor`);
        assert.ok(solid(x, y - 1), `and has a cap above it`);
      }
    }
  }
  assert.equal(share('mouth', '8!'), 0, 'lab tiles and roots at the mouth, no flesh');
  assert.ok(share('mouth', '1') > 0.2 && share('mouth', 'oO') > 0.1, 'tunnel floor into lab floor');
  const growth = ['corridor', 'storage', 'den', 'chamber'].map((r) => share(r, '8!'));
  assert.ok((growth[0] as number) > 0.1 && (growth[0] as number) < 0.5, `patches in the corridor: ${growth[0]}`);
  assert.ok((growth[1] as number) > 0.1 && (growth[1] as number) < 0.45, `patches in storage: ${growth[1]}`);
  assert.ok((growth[2] as number) > 0.6, `most of the den is flesh: ${growth[2]}`);
  assert.equal(growth[3], 1, 'all of the Gate chamber is flesh and tears');
  assert.ok(growth.every((g, i) => i === 0 || g > (growth[i - 1] as number) - 0.15), `thicker toward the Gate: ${growth.join(', ')}`);
  const tears = rectTiles(ROOMS.chamber as TileRect).filter(([x, y]) => ch(x, y) === '!').length;
  assert.ok(tears >= 12, `${tears} tears in the chamber`);
  assert.ok(S.rows.join('').split('9').length - 1 > 100, 'plenty of flesh wall');
  for (const c of 'NCM') assert.ok(S.rows.join('').includes(c), `dressing '${c}'`);
  assert.ok(rectTiles(ROOMS.storage as TileRect).filter(([x, y]) => ch(x, y) === 'N').length >= 9, 'shelves in storage');
});

test('stage 2.3: the lights are the rift, the tears and the dim lamps, each on open floor, and the three strings of lights', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  const [rift, ...rest] = S.lights;
  assert.ok(rift && inRoom('chamber', Math.floor(rift.x / 16), Math.floor(rift.y / 16)) && rift.r >= 80, 'the rift glows in the chamber, wide');
  for (const l of rest) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(!solid(tx, ty), `the light at ${tx},${ty} is on open floor`);
    assert.ok(l.r >= 24 && l.r <= 64);
  }
  for (const [x, y] of [[35, 4], [44, 4], [36, 10], [44, 10]]) {
    assert.ok(rest.some((l) => Math.floor(l.x / 16) === x && Math.floor(l.y / 16) === y), `a pool on the tear at ${x},${y}`);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_mouth', 'lights_den', 'lights_gate']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_mouth', 'lights_den', 'lights_gate']);
});

// ---------------------------------------------------------------- spawns
test('stage 2.3: the start and every spawn, item and npc is on open ground, ids are unique, and the start is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  assert.ok(inRoom('mouth', startTx, startTy), 'the level begins in the mouth');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 7, `${e.id} is too close to the start`);
  const taken = new Set([...enemies, ...items].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length, 'nothing shares a tile');
  for (const r of ['mouth']) for (const [x, y] of rectTiles(ROOMS[r] as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), 'nothing hostile at the mouth');
});

test('stage 2.3: the roster is in the spec\'s groups, and the stage pays 150 to 200 XP counting the run-time pups at 1 each', () => {
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  const kinds = (g: string): string[] => groups(g).map((e) => e.type).sort();
  assert.deepEqual(kinds('corridor'), ['demodog', 'demodog', 'vine', 'vine']);
  assert.deepEqual(kinds('storage'), ['demodog', 'demodog', 'pod', 'pod', 'pod', 'vine']);
  assert.deepEqual(kinds('boss'), ['alpha']);
  assert.equal(enemies.length, 11);
  assert.ok(groups('corridor').every((e) => inRoom('corridor', e.tx, e.ty)), 'the corridor pack is in the corridor');
  assert.ok(groups('storage').every((e) => inRoom('storage', e.tx, e.ty)), 'the storage pack is in storage');
  const alpha = enemies.find((e) => e.type === 'alpha');
  assert.deepEqual([alpha?.id, alpha?.dormant, alpha?.group], ['alpha', true, 'boss'], 'one Alpha, id alpha, asleep');
  assert.ok(alpha && inRoom('den', alpha.tx, alpha.ty), 'in the den');
  assert.ok(enemies.filter((e) => e.type !== 'alpha').every((e) => !e.dormant && !e.hidden), 'everything else is awake');
  const hallXp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  const pups = 3 * ENEMY_DEFS.alpha.x.pack + DEFENSE.waves.reduce((sum, w) => sum + w.n, 0);
  const total = hallXp + pups;
  assert.ok(total >= 150 && total <= 200, `stage XP ${total} (${hallXp} in the halls and the Alpha, ${pups} in run-time pups)`);
  assert.equal(total, 156);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  const cache = items.filter((i) => inRoom('cache', i.tx, i.ty));
  assert.ok(cache.some((i) => i.item === 'eggo') && cache.filter((i) => i.item === 'quarter').length >= 2, 'an Eggo and quarters in the cache');
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom('stairwell', i.tx, i.ty)), 'an Eggo in the stairwell');
});

// ---------------------------------------------------------------- the gates, the seals and the rift
test('stage 2.3: crack1 fills the throat, gap1 the cache doorway, and each seal a doorway of the den, one tile deep, wall to wall', () => {
  const crack = prop('crack1'), gap = prop('gap1');
  assert.deepEqual([crack.prop, crack.hitBy, crack.w, crack.h, crack.solid], ['crack', 'smash', 16, 32, true]);
  assert.deepEqual([gap.prop, gap.hitBy, gap.w, gap.h, gap.solid], ['gap', 'dash', 16, 32, true]);
  for (const p of [crack, gap]) {
    assert.equal(propTiles(p).length, 2);
    assert.ok(solid(p.tx, p.ty - 1) && solid(p.tx, p.ty + 2), `${p.id} fills its hall wall to wall`);
    assert.ok(!solid(p.tx - 1, p.ty) && !solid(p.tx + 1, p.ty), `${p.id} has floor before and after it`);
  }
  assert.ok(inRoom('throat', crack.tx, crack.ty) && inRoom('storage', crack.tx + 2, crack.ty), 'crack1 shuts the throat between the corridor and storage');
  assert.ok(inRoom('storage', gap.tx - 1, gap.ty) && inRoom('cache', gap.tx + 2, gap.ty), 'gap1 stands between storage and the cache');
  const seals = [prop('seal1'), prop('seal2')];
  for (const s of seals) {
    assert.deepEqual([s.prop, s.state, s.solid, s.hitBy, s.pushBy], ['vines', 'open', false, undefined, undefined], `${s.id}: spawned open, not solid, nothing burns it`);
    assert.equal(propTiles(s).length, 2);
  }
  const [s1, s2] = seals as [Prop, Prop];
  assert.deepEqual([s1.w, s1.h, s2.w, s2.h], [32, 16, 16, 32], 'seal1 across a north-south doorway, seal2 across an east-west one');
  assert.ok(solid(s1.tx - 1, s1.ty) && solid(s1.tx + 2, s1.ty), 'seal1 fills the south doorway wall to wall');
  assert.ok(solid(s2.tx, s2.ty - 1) && solid(s2.tx, s2.ty + 2), 'seal2 fills the east doorway wall to wall');
  assert.ok(!solid(s1.tx, s1.ty - 1) && !solid(s1.tx, s1.ty + 1) && !solid(s2.tx - 1, s2.ty) && !solid(s2.tx + 1, s2.ty), 'floor on both sides of each');
  assert.ok(inRoom('den', s1.tx, s1.ty - 2) && inRoom('hallW', s1.tx, s1.ty + 2), 'seal1 is the den\'s south doorway, from the hall');
  assert.ok(inRoom('den', s2.tx - 2, s2.ty) && inRoom('stairwell', s2.tx + 2, s2.ty), 'seal2 is the den\'s east doorway, to the stairwell');
  const rift = prop('rift');
  assert.deepEqual([rift.prop, rift.w, rift.h, rift.solid], ['rift', 64, 48, true]);
  assert.ok(propTiles(rift).every(([x, y]) => inRoom('chamber', x, y)), 'the rift is in the Gate chamber');
  assert.ok(solid(rift.tx, rift.ty - 1) && solid(rift.tx + 3, rift.ty - 1), 'on its north wall');
  assert.equal(rift.tx * 16 + 32, 40 * 16, 'in the middle of the chamber');
  assert.equal(DEFENSE.prop, 'rift');
});

// ---------------------------------------------------------------- reachability
test('stage 2.3: the route runs through crack1 to the Gate, gap1 guards only the cache, and shut seals cut the den off', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number][] = [
    ['storage', 28, 33], ['the hall north', 31, 24], ['the hall west', 20, 19], ['the den', 12, 10], ['the stairwell', 29, 8], ['the chamber', 40, 8], ['Eleven', 39, 6],
  ];
  assert.equal(reach([], startTx, startTy), 1);
  assert.equal(reach([], 12, 33), 1, 'the corridor is open at the start');
  assert.equal(reach([], 28, 33), 0, 'crack1 cuts the stage');
  for (const [name, x, y] of spots) assert.equal(reach(['crack1'], x, y), 1, `${name} is reachable once crack1 is broken`);
  assert.equal(reach(['crack1'], 43, 33), 0, 'the cache is shut until gap1 is crossed');
  assert.equal(reach(['crack1', 'gap1'], 43, 33), 1, 'and open after');
  assert.ok(rectTiles(ROOMS.cache as TileRect).every(([x, y]) => at(flood(new Set(['crack1'])), x, y) === 0 || solid(x, y)), 'nothing of the cache is reachable on the route');
  // The seals are open in the data and walkable. Shut, each stands as a wall.
  const shut1 = bfs(withSeals(['seal1']), [startTx, startTy]);
  assert.equal(at(shut1, 12, 19), 1, 'the hall west is still reachable with seal1 shut');
  assert.equal(at(shut1, 12, 10), 0, 'the den is not');
  assert.equal(at(shut1, 29, 8), 0, 'nor is the stairwell beyond it');
  const inside = bfs(withSeals(['seal1', 'seal2']), [12, 10]);
  assert.equal(at(inside, 12, 19), 0, 'from inside the den, nothing outside is reachable');
  assert.equal(at(inside, 22, 14), 1, 'the whole den is');
  assert.equal(at(inside, 29, 8), 0, 'and the east door is shut too');
});

test('stage 2.3: with every gate open nothing is boxed in, and every spawn, light string and burrow is reachable', () => {
  const open = flood(new Set(['crack1', 'gap1']));
  const blocked = kit.blocked(new Set(['crack1', 'gap1']));
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) {
    assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  }
  for (const b of BURROWS) assert.equal(open[idx(b.tx, b.ty)], 1, `the burrow at ${b.tx},${b.ty} is open floor`);
});

test('stage 2.3: nothing in the cache lies within the bot\'s reach of its route, so it never walks into gap1 after it', () => {
  // The bot walks to an Eggo, a Coke or a quarter within its reach, and gap1 is a wall to it: its path search says no way, so it skips.
  const reach: Record<string, number> = { eggo: 124, coke: 104, quarter: 44 };
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'every leg of the route has a path');
  const walked: [number, number][] = [...route.tiles].map((i) => [i % grid.w, (i / grid.w) | 0]);
  const behind = items.filter((q) => inRoom('cache', q.tx, q.ty));
  assert.ok(behind.length >= 3, 'the cache holds items');
  for (const it of behind) {
    const d = Math.min(...walked.map(([x, y]) => Math.hypot(x - it.tx, y - it.ty) * 16));
    assert.ok(d > (reach[it.item] as number), `${it.id} is ${d.toFixed(0)} px from the route`);
  }
});

// ---------------------------------------------------------------- the puzzles
test('stage 2.3: two puzzles, in route order, each with its hero, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['crack', 'gap']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['crack_hint', 'gap_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['crack1', 'gap1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['steve', 'max']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined));
  assert.deepEqual(rosterFor('2.3'), ['mike', 'dustin', 'lucas', 'will', 'max', 'steve']);
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const need = prop(p.prop).hitBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    assert.deepEqual(rosterFor('2.3').filter((h) => HERO_DEFS[h].utilities.includes(need as never)), [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-6.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-6.md`);
  }
});

// ---------------------------------------------------------------- burrows, the defense and the checkpoints
test('stage 2.3: four burrows at the den\'s edges for the howls and four on the tears for the defense, Eleven and Hopper under the rift', () => {
  const den = BURROWS.filter((b) => inRoom('den', b.tx, b.ty)), gate = BURROWS.filter((b) => inRoom('chamber', b.tx, b.ty));
  assert.deepEqual([den.length, gate.length, BURROWS.length], [4, 4, 8]);
  for (const b of den) {
    const edge = Math.min(b.tx - 6, 23 - b.tx, b.ty - 4, 15 - b.ty);
    assert.ok(edge <= 2, `the den burrow at ${b.tx},${b.ty} is at the den's edge`);
    assert.ok(!'NCM'.includes(ch(b.tx, b.ty)), 'on open floor, not under dressing');
  }
  for (const b of gate) assert.equal(ch(b.tx, b.ty), '!', `the chamber burrow at ${b.tx},${b.ty} is on a tear`);
  const eleven = npcs.find((n) => n.id === 'eleven'), hopper = npcs.find((n) => n.id === 'hopper');
  assert.ok(eleven && hopper, 'both npcs');
  const rift = prop('rift');
  for (const n of [eleven, hopper]) {
    assert.ok(n && n.ty === rift.ty + 3 && n.tx >= rift.tx && n.tx < rift.tx + 4 && n.dir === 'up', `${n?.id} stands under the rift, facing it`);
  }
  // A defense wave comes up from the burrows nearest Eleven, and a howl from the nearest the Alpha: the sim picks by distance.
  const dist = (b: { tx: number; ty: number }, x: number, y: number): number => Math.hypot(b.tx * 16 + 8 - x, b.ty * 16 + 12 - y);
  const e = eleven as NonNullable<typeof eleven>;
  const ex = e.tx * 16 + 8, ey = e.ty * 16 + 12;
  const near = Math.min(...BURROWS.map((b) => dist(b, ex, ey)));
  assert.ok(gate.every((b) => dist(b, ex, ey) <= near + 128), 'every tear is within a wave\'s reach of Eleven');
  assert.ok(den.every((b) => dist(b, ex, ey) > near + 128), 'and no den burrow is');
  const a = enemies.find((q) => q.type === 'alpha') as NonNullable<(typeof enemies)[number]>;
  const byAlpha = [...BURROWS].sort((p, q) => dist(p, a.tx * 16 + 8, a.ty * 16 + 12) - dist(q, a.tx * 16 + 8, a.ty * 16 + 12)).slice(0, 3);
  assert.ok(byAlpha.every((b) => inRoom('den', b.tx, b.ty)), 'the three nearest the Alpha are the den\'s');
});

test('stage 2.3: the defense is the spec\'s, 45 seconds on Eleven, with its waves in order from the first frame to the last seven seconds', () => {
  assert.equal(S.defense, DEFENSE);
  assert.equal(S.burrows, BURROWS);
  assert.deepEqual([DEFENSE.npc, DEFENSE.frames, DEFENSE.prop], ['eleven', 2700, 'rift']);
  assert.ok(DEFENSE.hp >= 80 && DEFENSE.hp <= 500, `Eleven's HP ${DEFENSE.hp}`);
  const ats = DEFENSE.waves.map((w) => w.at / 60);
  assert.deepEqual([...ats], [...ats].sort((x, y) => x - y), 'in order');
  assert.deepEqual([...new Set(ats)], [0, 6, 12, 18, 24, 31, 38], 'at 0, 6, 12, 18, 24, 31 and 38 seconds');
  assert.ok(DEFENSE.waves.every((w) => w.type === 'demodog' && w.at < DEFENSE.frames), 'demodogs, all before the clock runs out');
  assert.equal(DEFENSE.waves.filter((w) => w.tier === 'elite').length, 1, 'one elite');
  assert.equal(DEFENSE.waves.find((w) => w.tier === 'elite')?.at, 24 * 60, 'at 24 seconds');
  assert.equal(DEFENSE.waves.reduce((n, w) => n + w.n, 0), 17, 'seventeen in all: sparse, so the party keeps up');
  assert.ok(DEFENSE.waves.every((w) => w.n >= 1 && w.n <= 3), 'no wave bigger than three');
});

test('stage 2.3: three checkpoints beside their lights, on open floor, clear of the beats that a retry must not set off', () => {
  const open = flood(new Set(['crack1', 'gap1']));
  const rectOf = (id: string): TileRect => (S.beats.find((b) => b.id === id)?.when as { rect: TileRect }).rect;
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    for (const [bx, by] of propTiles(p)) assert.equal(solid(bx, by), false, `${c.prop} stands on open ground`);
    for (const id of ['alpha', 'gate', 'defend']) {
      assert.ok(!rectTiles(rectOf(id)).some(([u, v]) => u === x && v === y), `${c.prop} is outside the ${id} trigger, so a retry does not set it off at once`);
    }
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 6, 'lights_mouth is at the start');
  const [gx, gy] = tileOf(S.checkpoints[2]?.x ?? 0, S.checkpoints[2]?.y ?? 0);
  assert.ok(inRoom('stairwell', gx, gy), 'lights_gate is in the stairwell, past the den');
  const [nx, ny] = tileOf(S.checkpoints[1]?.x ?? 0, S.checkpoints[1]?.y ?? 0);
  assert.ok(inRoom('hallW', nx, ny), 'lights_den is in the hall, outside the den\'s doors');
});
