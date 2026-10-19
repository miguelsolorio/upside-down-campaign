// Stage 5.2, the Abyss, as data: the map and its islands, the budget, the groups, the gates, reachability (the deck behind burn1, the classroom behind
// sense1, the ring behind crack1, the cache behind gap1, and the ring cut off once door1 shuts), the checkpoints, the puzzles and the bot's route. The
// beats and the scripts are at the end, and whole runs of the bot and the gates in the real sim are in stage52-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chapterOf, requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS, utilitiesAt } from '../src/heroes/defs.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { ABYSS_TILES } from '../src/gfx/ch5/abyss_tiles.ts';
import { namedFor } from '../src/world/puzzles.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, tileOf } from './stage-helpers.ts';
import { BEAT_IDS, ISLANDS, ROUTE_GATES, ROWS, S, SCRIPT_IDS, at, ch, inIsland, inRect, kit, prop, propTiles, rectOf, rectTiles, shut, solid, xpOf } from './stage52-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const HEROES = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy', 'hopper'];

// ---------------------------------------------------------------- the map
test('stage 5.2: the map is 52 by 44, uses all ten Abyss tiles and nothing else, is solid all round, and runs by day over the void with the upside theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 44);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 52, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [52, 44]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  const used = new Set([...S.rows.join('')].map((c) => (TILES[c] as { name: string }).name));
  assert.deepEqual([...used].sort(), [...ABYSS_TILES].sort(), 'every Abyss tile is on the map, the vertical bridge too, and no other');
  assert.deepEqual([S.id, S.name, S.time, S.music, S.backdrop], ['5.2', 'The Abyss', 'day', 'upside', 'abyss']);
  assert.deepEqual(S.waves, []);
  assert.deepEqual(S.lights, [], 'a day stage whose strings make their own glow');
  assert.ok((S.enemyMult ?? 1) >= 1 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.equal(S.xpMult, undefined, 'the lead sets xpMult');
  assert.ok(grid.drop && grid.drop.length === grid.solid.length, 'the stage has a void');
});

test('stage 5.2: every island is floor over a cliff row over a row of rock, with the void on every other side, and the bridges join them one lane wide', () => {
  const floor = (x: number, y: number): boolean => !solid(x, y);
  const tile = (x: number, y: number): string => (TILES[ch(x, y)] as { name: string }).name;
  const bridge = (x: number, y: number): boolean => tile(x, y) === 'abyssbridgeh' || tile(x, y) === 'abyssbridgev';
  for (const [x, y] of rectTiles({ tx: 0, ty: 0, w: 52, h: 44 })) {
    if (!floor(x, y) || bridge(x, y)) continue;
    // Island floor: south of it is more floor, or a bridge, or the cliff over the under row.
    const s = tile(x, y + 1);
    assert.ok(floor(x, y + 1) || s === 'abysscliff', `${x},${y}: floor with ${s} below`);
    if (s === 'abysscliff') assert.ok(['abyssunder', 'abyssbridgev'].includes(tile(x, y + 2)), `${x},${y + 1}: a cliff over rock`);
    // Nothing else is a drop beside it: the rim is void, rock or a bridge.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]] as const) {
      const n = tile(x + dx, y + dy);
      assert.ok(floor(x + dx, y + dy) || ['abyssgap', 'abysscliff', 'abyssunder'].includes(n), `${x},${y}: ${n} beside floor`);
    }
  }
  // The bridges: one lane, east to west or north to south, ending on island floor at both ends.
  const runs = (name: string): number[][] => {
    const out: number[][] = [];
    for (const [x, y] of rectTiles({ tx: 0, ty: 0, w: 52, h: 44 })) if (tile(x, y) === name) out.push([x, y]);
    return out;
  };
  const h = runs('abyssbridgeh'), v = runs('abyssbridgev');
  assert.deepEqual([h.length, v.length], [5 + 7, 4 + 4], 'two long bridges east and west, two shorter ones north');
  for (const [x, y] of h) assert.ok(solid(x, (y as number) - 1) && solid(x, (y as number) + 1), `a bridge east at ${x},${y} has the void either side`);
  for (const [x, y] of v) assert.ok(solid((x as number) - 1, y as number) && solid((x as number) + 1, y as number) || ['abysscliff', 'abyssunder'].includes(tile((x as number) - 1, y as number)), `a bridge north at ${x},${y} has rock or void either side`);
  assert.deepEqual([17, 18, 19, 20, 21].map((x) => tile(x, 35)).concat(tile(16, 35), tile(22, 35)), ['abyssbridgeh', 'abyssbridgeh', 'abyssbridgeh', 'abyssbridgeh', 'abyssbridgeh', 'abysslawn', 'abyssline'], 'the first bridge joins the lawn to the road');
});

test('stage 5.2: the islands are what the spec lists: a lawn with a porch at the gate, a road with its line, a deck, a classroom and a round ring', () => {
  const count = (island: string, name: string): number => rectTiles(ISLANDS[island] as TileRect).filter(([x, y]) => (TILES[ch(x, y)] as { name: string }).name === name).length;
  const total = (island: string): number => (ISLANDS[island] as TileRect).w * (ISLANDS[island] as TileRect).h;
  assert.ok(inIsland('lawn', startTx, startTy), 'the stage begins on the lawn island');
  assert.equal(count('lawn', 'abysslawn') + count('lawn', 'abyssporch'), total('lawn'), 'the lawn island is lawn and porch all through');
  assert.ok(count('lawn', 'abyssporch') >= 9, 'with the porch at the gate\'s landing, where the start is');
  assert.equal(ch(startTx, startTy), 'ý', 'the start is on the porch');
  assert.ok(count('road', 'abyssroad') > 60 && count('road', 'abyssline') === 16, 'the road is asphalt with a lane line along its middle, 16 tiles');
  assert.ok(count('deck', 'abyssporch') === 19 * 7, 'the deck is a porch floor');
  assert.ok(count('classroom', 'abyssclass') >= 16 * 12 - 1, 'the classroom is a classroom floor');
  assert.equal(count('pad', 'abysslawn'), total('pad'), 'the cache sits on a pad of lawn');
  // The ring: round, about 18 across, one floor, with a wall of void round it but for the bridge in on the west.
  const ring = rectTiles(ISLANDS.ring as TileRect).filter(([x, y]) => !solid(x, y));
  assert.ok(ring.every(([x, y]) => ch(x, y) === 'ÿ'), 'the ring is rock-grey asphalt all through');
  const cols = new Set(ring.map(([x]) => x)), rows = new Set(ring.map(([, y]) => y));
  assert.deepEqual([cols.size, rows.size], [18, 17], 'about 18 across');
  assert.ok(ring.length > 220 && ring.length < 260, `${ring.length} tiles, a circle's worth`);
  const rowWidth = (y: number): number => ring.filter(([, v]) => v === y).length;
  assert.ok(rowWidth(11) >= 17 && rowWidth(3) <= 6 && rowWidth(19) <= 6, 'wide in the middle and narrow at the poles');
  assert.ok(ring.every(([x, y]) => Math.hypot(x + 0.5 - 40, y + 0.5 - 11.5) <= 8.6 + 1e-9), 'every floor tile is inside the circle');
  // Mirrored in x about the ring's centre, bar the entrance's tile.
  for (const [x, y] of ring) assert.ok(!solid(79 - x, y), `the ring mirrors at ${x},${y}`);
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 5.2: the strings of lights are Joyce\'s on the landing, the deck and the classroom, the save points in route order, outside the beats that wake or shut', () => {
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_landing', 'lights_bridge', 'lights_ring']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_landing', 'lights_bridge', 'lights_ring']);
  const open = flood(new Set(ROUTE_GATES));
  const triggers = [rectOf('twins')].map((r) => rectTiles(r));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(triggers.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the twins' rect`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on floor`);
  }
  assert.ok(inIsland('lawn', prop('lights_landing').tx, prop('lights_landing').ty), 'lights_landing hangs on the lawn island');
  assert.ok(Math.hypot(...(tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0).map((v, i) => v - (i === 0 ? startTx : startTy)) as [number, number])) < 4, 'at the start');
  assert.ok(inIsland('deck', prop('lights_bridge').tx, prop('lights_bridge').ty), 'lights_bridge on the deck');
  assert.ok(inIsland('classroom', prop('lights_ring').tx, prop('lights_ring').ty), 'lights_ring on the classroom\'s north-east, before the neck and the long bridge');
});

// ---------------------------------------------------------------- spawns
test('stage 5.2: the start and every spawn, item and prop is on open ground, ids are unique, and nothing awake is near the start', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) if (p.id !== 'sense1' && p.id !== 'burn1') assert.equal(solid(x, y) && !['abyssbridgeh', 'abyssbridgev'].includes((TILES[ch(x, y)] as { name: string }).name), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0, 'no one waits to be rescued');
  for (const e of enemies.filter((q) => !q.dormant)) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 9, `${e.id} is too close to the start`);
  const taken = new Set([...enemies, ...items].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights`);
});

test('stage 5.2: the roster is worth 320 to 380 XP before xpMult, in the spec\'s groups: the lawn pack, the road, the deck, the classroom and the sleeping twins', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 320 && xp <= 380, `stage XP ${xp}`);
  assert.equal(xp, 330);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('demodog'), kind('demofoe'), kind('pod'), kind('vine'), kind('twin')], [6, 3, 2, 2, 2]);
  assert.equal(kind('demobat'), 0, 'no demobats: chapter 4 has not built them');
  assert.ok(enemies.every((e) => e.tier === undefined), 'no elites');
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['boss', 'bridge', 'classroom', 'landing', 'road']);
  const landing = groups('landing');
  assert.ok(landing.length === 3 && landing.every((e) => e.type === 'demodog' && !e.dormant && inIsland('lawn', e.tx, e.ty)), 'three demodogs on the lawn');
  const road = groups('road');
  assert.deepEqual(road.map((e) => e.type).sort(), ['demofoe', 'pod', 'pod'], 'a Demogorgon and two pods');
  assert.ok(road.every((e) => !e.dormant && inIsland('road', e.tx, e.ty)));
  const bridge = groups('bridge');
  assert.deepEqual(bridge.map((e) => e.type).sort(), ['demodog', 'demodog', 'demodog', 'vine', 'vine'], 'vines by the burn wall and three demodogs');
  assert.ok(bridge.every((e) => !e.dormant && inIsland('deck', e.tx, e.ty)), 'on the deck past the burn wall');
  const wall = prop('burn1');
  for (const v of bridge.filter((e) => e.type === 'vine')) assert.ok(Math.hypot(v.tx - wall.tx, v.ty - wall.ty) < 8, `${v.id} is near the wall`);
  const classroom = groups('classroom');
  assert.ok(classroom.length === 2 && classroom.every((e) => e.type === 'demofoe' && !e.dormant && inIsland('classroom', e.tx, e.ty)), 'two Demogorgons in the classroom');
  assert.ok(Math.hypot(classroom[0]?.tx as number - (classroom[1]?.tx as number), classroom[0]?.ty as number - (classroom[1]?.ty as number)) > 9, 'far enough apart to come one at a time');
  const boss = groups('boss');
  assert.ok(boss.length === 2 && boss.every((e) => e.type === 'twin' && e.dormant && inIsland('ring', e.tx, e.ty)), 'the twins, asleep on the ring');
  assert.ok(boss.every((e) => e.tx >= 36), 'on its far side, well clear of the way in');
  assert.ok(!enemies.some((e) => inIsland('pad', e.tx, e.ty)) && !enemies.some((e) => e.group === 'boss' && !e.dormant), 'nobody guards the cache');
});

test('stage 5.2: four Eggos, three Cokes and fourteen quarters, one Eggo, one Coke and three quarters in the cache, nothing on the ring', () => {
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 14]);
  const cache = items.filter((i) => inIsland('pad', i.tx, i.ty));
  assert.deepEqual([cache.filter((i) => i.item === 'eggo').length, cache.filter((i) => i.item === 'coke').length, cache.filter((i) => i.item === 'quarter').length], [1, 1, 3]);
  assert.ok(items.every((i) => !inIsland('ring', i.tx, i.ty)), 'nothing to pick up on the ring');
});

// ---------------------------------------------------------------- the gates
test('stage 5.2: gap1 fills the neck to the cache, burn1 shuts the bridge north, sense1 covers all of Will\'s bridge, crack1 fills the classroom\'s neck, door1 is the ring\'s way in', () => {
  const g = prop('gap1');
  assert.deepEqual([g.prop, g.hitBy, g.w, g.h, g.solid], ['gap', 'dash', 16, 32, true]);
  assert.ok(solid(g.tx, g.ty - 1) && solid(g.tx, g.ty + 2) && !solid(g.tx - 1, g.ty) && !solid(g.tx + 1, g.ty), 'gap1 fills the neck wall to wall, with the road on one side and the pad on the other');
  assert.ok(inIsland('road', g.tx - 1, g.ty) && inIsland('pad', g.tx + 1, g.ty));
  const b = prop('burn1');
  assert.deepEqual([b.prop, b.hitBy, b.w, b.h, b.solid, b.smash, b.hits], ['vines', 'burn', 16, 32, true, true, 12]);
  assert.ok(['abyssbridgev'].includes((TILES[ch(b.tx, b.ty)] as { name: string }).name) && ['abyssbridgev'].includes((TILES[ch(b.tx, b.ty + 1)] as { name: string }).name), 'burn1 is across the bridge north');
  assert.ok(inIsland('road', b.tx, b.ty + 3) && inIsland('deck', b.tx, b.ty - 2), 'with the road behind it and the deck beyond');
  const s = prop('sense1');
  assert.deepEqual([s.prop, s.hitBy, s.w, s.h, s.solid], ['hidden', 'sense', 16, 64, true]);
  assert.deepEqual(propTiles(s).map(([x, y]) => (TILES[ch(x, y)] as { name: string }).name), Array(4).fill('abyssbridgev'), 'all four tiles of the bridge are hidden');
  assert.ok(inIsland('deck', s.tx, s.ty + 4) && inIsland('classroom', s.tx, s.ty - 1), 'from the deck to the classroom');
  const c = prop('crack1');
  assert.deepEqual([c.prop, c.hitBy, c.w, c.h, c.solid, c.smash, c.hits], ['crack', 'smash', 16, 32, true, true, 12]);
  assert.ok(solid(c.tx, c.ty - 1) && solid(c.tx, c.ty + 2) && !solid(c.tx - 1, c.ty) && !solid(c.tx + 1, c.ty), 'crack1 fills the neck wall to wall');
  assert.ok(inRect(rectOf('crack_hint'), c.tx - 2, c.ty), 'and the hint beat is in front of it');
  const d = prop('door1');
  assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 48, 'open', false, 31, 10]);
  assert.ok(solid(d.tx - 1, d.ty + 1) && solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 3), 'door1 fills the ring\'s west tip, three tiles, with the bridge in front of it');
  assert.ok(inIsland('ring', d.tx + 1, d.ty + 1) && (TILES[ch(d.tx - 1, d.ty)] as { name: string }).name === 'abyssbridgeh');
  assert.deepEqual(props.filter((p) => p.prop !== 'lights').map((p) => p.id), ['gap1', 'burn1', 'sense1', 'crack1', 'door1']);
});

// ---------------------------------------------------------------- reachability
test('stage 5.2: each gate shuts a piece of the map: the deck behind burn1, the classroom behind sense1, the ring behind crack1, the cache behind gap1', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the lawn', 8, 35, []], ['the road', 30, 34, []], ['the foot of the bridge north', 24, 32, []], ['the bridge', 24, 31, []],
    ['the deck', 20, 24, ['burn1']], ['the foot of Will\'s bridge', 14, 21, ['burn1']],
    ['the classroom', 14, 12, ['burn1', 'sense1']], ['the neck before the crack', 20, 10, ['burn1', 'sense1']],
    ['the long bridge', 27, 10, ['burn1', 'sense1', 'crack1']], ['the ring', 40, 11, ['burn1', 'sense1', 'crack1']],
    ['the cache', 41, 35, ['gap1']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind a gate'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable once its gates are open`);
  }
  // Each gate is the only way: the other gates do not help.
  assert.equal(reach(['sense1', 'crack1', 'gap1'], 20, 24), 0, 'nothing but burn1 gets onto the deck');
  assert.equal(reach(['burn1', 'crack1', 'gap1'], 14, 12), 0, 'nothing but sense1 gets onto the classroom');
  assert.equal(reach(['burn1', 'sense1', 'gap1'], 40, 11), 0, 'nothing but crack1 gets onto the ring');
  assert.equal(reach(ROUTE_GATES, 41, 35), 0, 'and the route\'s gates do not get into the cache');
  // The rock fall: shut, the ring is cut off from the bridge, and the bridge from the ring.
  assert.equal(shut.flood(new Set(ROUTE_GATES))[idx(40, 11)], 0, 'the ring is shut off by door1');
  assert.equal(shut.flood(new Set(ROUTE_GATES))[idx(27, 10)], 1);
  assert.equal(shut.flood(new Set([...ROUTE_GATES, 'door1']))[idx(40, 11)], 1, 'and the door open lets the party in');
  assert.equal(shut.flood(new Set([...ROUTE_GATES, 'door1']), [40, 11])[idx(40, 11)], 1);
  assert.equal(shut.flood(new Set(ROUTE_GATES), [40, 11])[idx(27, 10)], 0, 'nobody on the ring walks back out');
});

test('stage 5.2: with every gate open nothing is boxed in, and every spawn and string of lights is reachable', () => {
  const gates = new Set([...ROUTE_GATES, 'gap1']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ISLANDS)) assert.ok(rectTiles(ISLANDS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
  // Every island is one piece with the gates open, and so is the whole of it: the void splits nothing that has floor.
  let floors = 0;
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) if (!blocked[idx(x, y)]) floors++;
  assert.ok(floors > 600, `${floors} floor tiles`);
});

// ---------------------------------------------------------------- the puzzles
test('stage 5.2: four puzzles in route order, each hint the spec\'s, one subtitle row, and always a hero in the party to name', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['burn', 'gap', 'sense', 'crack']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['burn_hint', 'gap_hint', 'sense_hint', 'crack_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['burn1', 'gap1', 'sense1', 'crack1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['dustin', 'max', 'will', 'steve']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined && p.blocks === undefined));
  const roster = rosterFor('5.2');
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-15.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(prop(p.prop).hitBy ?? 'smash') || p.id === 'gap', `${p.id}: ${p.hero} has what ${p.prop} asks for`);
    for (const h of [{ hero: p.hero, hint: p.hint }, ...(p.alt ?? [])]) {
      assert.ok(fitsBox(h.hint, cols, 1), `"${h.hint}" is over one subtitle row`);
      assert.equal(h.hint, h.hint.toUpperCase());
      assert.ok(h.hint.includes(HERO_DEFS[h.hero].name.toUpperCase()), `${p.id}: ${h.hint} names ${h.hero}`);
      assert.ok(!/[0-9]/.test(h.hint) && !/seamless|robust|leverage|unlock|delve/i.test(h.hint) && !hasEmDash(h.hint), 'no key digits, no banned words');
    }
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-15.md`);
    for (const a of p.alt?.slice(0, 2) ?? []) if (!/HACK AT|BREAK THE WALL/.test(a.hint)) assert.ok(doc.includes(a.hint), `${p.id}: ${a.hint} is in docs/level-15.md`);
  }
  // The route's two shared gates name a hero for any party of four: the gate's own heroes first, then whoever else is there.
  const [burn, , , crack] = S.puzzles;
  assert.deepEqual(burn?.alt?.slice(0, 1).map((a) => a.hero), ['nancy']);
  assert.deepEqual(crack?.alt?.slice(0, 1).map((a) => a.hero), ['hopper']);
  for (const p of [burn, crack]) assert.deepEqual([...new Set([p?.hero, ...(p?.alt ?? []).map((a) => a.hero)])].sort(), [...HEROES].sort(), `${p?.id}: the hint can name anyone`);
  for (const pick of [['mike', 'dustin', 'robin', 'will'], ['lucas', 'eleven', 'max', 'will'], ['steve', 'hopper', 'nancy', 'will'], ['mike', 'lucas', 'robin', 'will']] as const) {
    for (const p of [burn, crack]) assert.ok(p && namedFor(p, pick), `${p?.id}: ${pick.join()} has someone to name`);
  }
  assert.equal(namedFor(burn as never, ['mike', 'dustin', 'robin', 'will'])?.hero, 'dustin');
  assert.equal(namedFor(burn as never, ['mike', 'nancy', 'robin', 'will'])?.hero, 'nancy');
  assert.equal(namedFor(crack as never, ['mike', 'dustin', 'robin', 'will'])?.hero, 'mike', 'a party without Steve or Hopper is told to break the wall itself');
  assert.equal(namedFor(crack as never, ['mike', 'hopper', 'robin', 'will'])?.hero, 'hopper');
  assert.equal(namedFor(S.puzzles[2] as never, ['mike', 'dustin', 'robin', 'will'])?.hero, 'will');
  // The heroes who solve the gates outright: Dustin and Nancy (from Lv 6) burn, Steve and Hopper smash, Max dashes, Will senses.
  assert.ok(utilitiesAt('dustin', 9).includes('burn') && utilitiesAt('nancy', 7).includes('burn') && !utilitiesAt('nancy', 5).includes('burn'));
  assert.ok(HERO_DEFS.steve.utilities.includes('smash') && HERO_DEFS.hopper.utilities.includes('smash') && HERO_DEFS.max.utilities.includes('dash') && HERO_DEFS.will.utilities.includes('sense'));
  assert.deepEqual(requiredFor('5.2'), ['will'], 'Will is locked in, so sense1 never waits on a hero who is not there');
});

// ---------------------------------------------------------------- the bot's route
test('stage 5.2: the waypoints are on floor, reachable in order, each of the three gates is opened by flag, the route skips the cache and ends in the twins\' rect', () => {
  const open = new Set<string>();
  const flags: string[] = [];
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground, not the void`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'the route crosses no gap');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing');
    if (w.open) { flags.push(w.open); open.add(w.open); }
  });
  assert.deepEqual(flags, ROUTE_GATES, 'burn1, sense1 and crack1, in route order, and never gap1');
  // Each gate is opened from the near side, inside its hint beat, a couple of tiles short.
  const beatOf: Record<string, string> = { burn1: 'burn_hint', sense1: 'sense_hint', crack1: 'crack_hint' };
  for (const [i, w] of S.waypoints.entries()) {
    if (!w.open) continue;
    const [fx, fy] = tileOf(w.x, w.y);
    const p = prop(w.open);
    assert.ok(Math.hypot(fx - p.tx, fy - p.ty) <= 4, `${w.open} is opened from close by (waypoint ${i})`);
    assert.ok(inRect(rectOf(beatOf[w.open] as string), fx, fy), `${w.open} is opened inside ${beatOf[w.open]}, so the hint fires first`);
  }
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('twins'), lx, ly), 'the last waypoint is inside the twins\' rect');
  assert.ok(S.waypoints.every((w) => !inIsland('pad', ...tileOf(w.x, w.y))), 'the route skips the cache');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  for (const t of route.tiles) assert.equal(grid.solid[t], 0, 'no path tile is a wall');
  for (const t of route.tiles) assert.ok(!grid.drop?.[t], `no path tile is the void (${t % grid.w},${(t / grid.w) | 0})`);
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'burn_hint', 'sense_hint', 'crack_hint', 'twins']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(!crossed('gap_hint'), 'but not to the cache\'s gap');
  assert.ok(S.waypoints.length >= 25, `${S.waypoints.length} waypoints`);
});

// ---------------------------------------------------------------- the beats and the words
test('stage 5.2: the beats are the spec\'s, the twins drop door1, switch to clock and wake the pair, the clear finishes, and every script exists in words that fit', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS);
  const twins = S.beats.find((b) => b.id === 'twins');
  assert.deepEqual(twins?.steps, [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l15_twins' }, { t: 'wake', group: 'boss' }]);
  const r = rectOf('twins');
  assert.ok(r.tx >= prop('door1').tx + 3 && inIsland('ring', r.tx, r.ty + 1), 'three tiles clear of door1, on the ring, so nobody stands in the rock fall');
  const clear = S.beats.find((b) => b.id === 'level_clear');
  assert.deepEqual(clear?.when, { cleared: 'boss' });
  assert.deepEqual(clear?.steps.at(-1), { t: 'finish' });
  assert.deepEqual(S.beats.find((b) => b.id === 'burn_done')?.when, { event: 'propCleared', prop: 'burn1' });
  assert.deepEqual(S.beats.find((b) => b.id === 'sense_done')?.when, { event: 'propCleared', prop: 'sense1' });
  assert.deepEqual(S.beats.find((b) => b.id === 'crack_done')?.when, { event: 'propCleared', prop: 'crack1' });
  const said = S.beats.flatMap((b) => b.steps.flatMap((s) => (s.t === 'say' ? [s.script] : [])));
  assert.deepEqual(said, SCRIPT_IDS);
  for (const sid of said) {
    assert.ok(sid.startsWith('l15_'), sid);
    const script = SCRIPTS[sid];
    assert.ok(script && script.lines.length >= 1, `${sid} exists`);
    for (const l of script.lines) {
      assert.ok(fitsBox(l.text) && !hasEmDash(l.text), `${sid}: ${l.text}`);
      assert.ok(['narrator', 'will'].includes(l.who), `${sid}: only the narrator and Will speak, ${l.who} may not be in the party`);
    }
  }
  assert.equal(chapterOf('5.2'), 5);
  assert.match(SCRIPTS.l15_burn_hint?.lines.map((l) => l.text).join(' ') ?? '', /\{attack\}/, 'the fallback is a swing');
  assert.match(SCRIPTS.l15_gap_hint?.lines.map((l) => l.text).join(' ') ?? '', /\{special\}/, 'the dash is the special');
});
