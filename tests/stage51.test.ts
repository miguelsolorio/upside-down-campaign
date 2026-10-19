// Stage 5.1, Hawkins under lockdown, as data: the map and its rooms, the lights and checkpoints, the budget (300 to 360 XP, the groups and the
// clusters that never join one fight), the gates (boom1, crate1, door1), reachability (the plaza behind the boom gate, the cache behind crate1),
// the puzzles, and the bot's route. The beats and the scripts are in stage51-story.test.ts, and whole runs of the bot and the play scene in
// stage51-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { LOCKDOWN_SOLID, LOCKDOWN_TILES } from '../src/gfx/ch5/lockdown_tiles.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import { botRoute, stageKit, tileOf } from './stage-helpers.ts';
import { ROOMS, ROWS, S, at, ch, inRect, inRoom, kit, prop, propTiles, rectOf, rectTiles, solid, xpOf } from './stage51-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const nameOf = (x: number, y: number): TileName => (TILES[ch(x, y)] as { name: TileName }).name;
/** The army's props that block: the sim leaves these kinds walkable unless the spawn says solid. */
const ARMY = ['truck', 'tent', 'sandbags', 'barricade', 'barrier', 'tower', 'booth'];

// ---------------------------------------------------------------- the map
test('stage 5.1: the map is 50 by 40, uses all 18 lockdown tiles and the Lab cap, is solid all round and runs at night with the lab theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 50, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [50, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music, S.backdrop], ['5.1', 'Hawkins Lockdown', 'night', 'lab', undefined]);
  assert.ok((S.enemyMult ?? 1) > 0 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.ok((S.xpMult ?? 1) >= 1 && (S.xpMult ?? 1) <= 4, `xpMult ${S.xpMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set([...S.rows.join('')].map((c) => (TILES[c] as { name: TileName }).name));
  for (const n of LOCKDOWN_TILES) assert.ok(used.has(n), `the map uses ${n}`);
  assert.ok(used.has('labcap'), 'and the Lab cap');
  for (const n of used) assert.ok(n === 'labcap' || (LOCKDOWN_TILES as readonly string[]).includes(n), `${n} is not a lockdown tile`);
  for (const [c, d] of Object.entries(TILES)) {
    if ((LOCKDOWN_TILES as readonly string[]).includes(d.name)) assert.equal(d.solid, LOCKDOWN_SOLID.has(d.name as never), `${c} ${d.name}: solid iff LOCKDOWN_SOLID`);
  }
});

test('stage 5.1: the Lab\'s walls are a cap row over an army wall row looking onto the floor, the house fronts a roof row over a front row', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      const n = nameOf(x, y);
      if (n === 'armywall') {
        assert.equal(nameOf(x, y - 1), 'labcap', `the wall face at ${x},${y} has a cap above it`);
        assert.ok(!solid(x, y + 1) || nameOf(x, y + 1).startsWith('armycrate'), `the wall face at ${x},${y} looks onto floor (or a stack of crates against it)`);
      }
      if (n === 'lockhouse' || n === 'lockvine' || n === 'lockdoor') {
        assert.equal(nameOf(x, y - 1), 'lockroof', `the front at ${x},${y} has a roof above it`);
        assert.ok(!solid(x, y + 1), `the front at ${x},${y} looks onto the street`);
      }
      // A tile with floor under a cap has the wall face between, bar the doorway tiles: a cap that floor lies north of (the bottom edge of a room) is fine.
      if (!solid(x, y) && y > 0 && nameOf(x, y - 1) === 'labcap') assert.ok(false, `floor at ${x},${y} has a bare cap above it, so no face shows (${c})`);
    }
  }
  assert.ok(rectTiles({ tx: 1, ty: 1, w: 27, h: 1 }).every(([x, y]) => nameOf(x, y) === 'armywall'), 'the halls\' north wall faces south');
  assert.ok(rectTiles({ tx: 29, ty: 1, w: 20, h: 1 }).every(([x, y]) => nameOf(x, y) === 'armywall'), 'and the bay\'s');
  assert.ok(rectTiles({ tx: 25, ty: 17, w: 24, h: 1 }).every(([x, y]) => nameOf(x, y) === 'armywall'), 'the Lab\'s south wall faces the forecourt');
  const doors = rectTiles({ tx: 0, ty: 0, w: 50, h: 40 }).filter(([x, y]) => nameOf(x, y) === 'lockdoor');
  assert.ok(doors.length >= 6, `${doors.length} taped doors`);
  const vines = rectTiles({ tx: 0, ty: 0, w: 50, h: 40 }).filter(([x, y]) => nameOf(x, y) === 'lockvine');
  assert.ok(vines.length >= 8, `${vines.length} fronts under creeping vines`);
});

test('stage 5.1: the rooms are where the spec has them: Main Street, the plaza with its rifts and a gap, the forecourt, the gate, the S of halls and the bay', () => {
  const count = (room: string, n: TileName): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => nameOf(x, y) === n).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('street', startTx, startTy), 'the stage begins on Main Street');
  assert.ok(startTx <= 5, 'at its west end');
  // Main Street: sidewalk, lanes round a double line, sidewalk, lawn, under a row of house fronts.
  assert.ok(rectTiles({ tx: 1, ty: 33, w: 20, h: 3 }).every(([x, y]) => ['lockroad', 'lockline', 'lockstop'].includes(nameOf(x, y))), 'two lanes and the double line');
  assert.ok(rectTiles({ tx: 1, ty: 34, w: 20, h: 1 }).every(([x, y]) => nameOf(x, y) === 'lockline'), 'the line is down the middle');
  assert.ok(count('street', 'lockstop') >= 2, 'a white stop line before the checkpoint');
  assert.ok(rectTiles({ tx: 1, ty: 32, w: 17, h: 1 }).every(([x, y]) => nameOf(x, y) === 'lockwalk'), 'a sidewalk under the houses');
  assert.ok(count('street', 'locklawn') >= 10, 'and a strip of lawn');
  // The plaza: asphalt and rifts, a row of buildings across its middle and a gap five tiles wide at the east end.
  assert.ok(count('plaza', 'lockroad') + count('plaza', 'lockline') > total('plaza') * 0.5, 'the plaza is asphalt');
  const rifts = rectTiles({ tx: 0, ty: 0, w: 50, h: 40 }).filter(([x, y]) => nameOf(x, y) === 'rift0');
  assert.equal(rifts.length, 4, 'four rifts in the asphalt');
  for (const [x, y] of rifts) {
    assert.deepEqual([nameOf(x + 1, y), nameOf(x + 2, y)], ['rift1', 'rift2'], `the rift at ${x},${y} is three tiles that join`);
    assert.ok(!solid(x, y) && !solid(x + 1, y) && !solid(x + 2, y), 'and is walked over');
  }
  assert.equal(rifts.filter(([x, y]) => inRoom('plaza', x, y)).length, 3, 'three of them in the plaza');
  assert.equal(rifts.filter(([x, y]) => inRoom('forecourt', x, y)).length, 1, 'one on the forecourt');
  for (let y = 26; y <= 27; y++) {
    assert.deepEqual([...ROWS[y]?.slice(21, 43) ?? ''].map((c) => (TILES[c] as { solid: boolean }).solid), new Array(22).fill(true), `the buildings fill the square's row ${y} from the west`);
    for (let x = 43; x <= 48; x++) assert.equal(solid(x, y), false, `the gap at ${x},${y}`);
  }
  assert.ok(inRoom('gap', 45, 26) && ROOMS.gap?.w === 5, 'the gap is five tiles wide');
  // The forecourt, the gate and the halls.
  assert.ok(count('forecourt', 'lockroad') + count('forecourt', 'lockline') + count('forecourt', 'lockstop') > total('forecourt') * 0.6, 'the forecourt is a road');
  assert.deepEqual([22, 23, 24].map((x) => [nameOf(x, 16), nameOf(x, 17)]), [['armyfloor', 'armyfloor'], ['armyfloor', 'armyfloor'], ['armyfloor', 'armyfloor']], 'the gate is three tiles wide in a wall two deep');
  assert.ok(solid(21, 16) && solid(25, 16) && solid(21, 17) && solid(25, 17), 'with wall either side');
  assert.ok(count('southcorr', 'armyfloor') + count('southcorr', 'armycable') + count('southcorr', 'armycable2') + count('southcorr', 'armycrate') + count('southcorr', 'armycrate2') > total('southcorr') * 0.9, 'the south corridor is floor and cable runs');
  assert.ok(count('northcorr', 'armyfloor') + count('northcorr', 'armycable') + count('northcorr', 'armycable2') + count('northcorr', 'armycrate') + count('northcorr', 'armycrate2') > total('northcorr') * 0.9, 'and the north corridor');
  assert.ok(rectTiles(ROOMS.west as TileRect).every(([x, y]) => !solid(x, y) || nameOf(x, y).startsWith('armycrate')), 'the west connector is four wide');
  assert.ok(count('bay', 'armyfloor') + count('bay', 'armycable') + count('bay', 'armycable2') > total('bay') * 0.9, 'the bay is an open floor');
  assert.deepEqual([ROOMS.bay?.w, ROOMS.bay?.h], [20, 14], 'an arena 20 by 14');
  for (let x = 29; x <= 48; x++) assert.ok(solid(x, 1) && solid(x, 16), `the bay's walls at ${x}`);
  for (let y = 2; y <= 15; y++) assert.ok(solid(49, y) && (y === 3 || y === 4 || solid(28, y)), `the bay's side walls at ${y}`);
  assert.deepEqual([nameOf(28, 2), nameOf(28, 3), nameOf(28, 4), nameOf(28, 5)], ['armywall', 'armyfloor', 'armyfloor', 'labcap'], 'with a doorway two tiles tall in the west wall');
  assert.ok(count('cache', 'armyfloor') >= 15 && inRoom('southcorr', 12, 13), 'the cache is a small room off the south corridor');
  assert.ok(count('bay', 'armycrate') + count('bay', 'armycrate2') >= 6, 'crates stacked at the bay\'s walls');
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 5.1: the lights are lamps along the route, and the three strings are the save points in route order', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 49 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || nameOf(tx, ty) === 'armywall', `the light at ${tx},${ty} is on floor or a wall face`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_street', 'lights_square', 'lights_lab']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_street', 'lights_square', 'lights_lab']);
  const open = flood(new Set(['boom1', 'crate1']));
  // A retry from a string must not wake anything on the spot: the checkpoint is outside the beats that wake or shut.
  const triggers = ['checkpoint', 'commander'].map((id) => rectTiles(rectOf(id)));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(triggers.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the wake triggers`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 4, 'lights_street is at the start');
  assert.ok(inRoom('street', prop('lights_street').tx, prop('lights_street').ty), 'on Main Street');
  assert.ok(inRoom('plaza', prop('lights_square').tx, prop('lights_square').ty), 'lights_square is in the plaza');
  assert.ok(inRoom('northcorr', prop('lights_lab').tx, prop('lights_lab').ty), 'lights_lab is in the north corridor, before the bay');
  assert.ok(28 - (prop('lights_lab').tx + 3) >= 3, 'well short of door1');
  // Each rift has its red glow, and each tower throws its own pool.
  const rifts = rectTiles({ tx: 0, ty: 0, w: 50, h: 40 }).filter(([x, y]) => nameOf(x, y) === 'rift1');
  for (const [x, y] of rifts) assert.ok(S.lights.some((l) => Math.hypot(l.x - (x * 16 + 8), l.y - (y * 16 + 8)) < 20), `the rift at ${x},${y} glows`);
});

// ---------------------------------------------------------------- spawns
test('stage 5.1: the start and every spawn, item and patrol point is on open ground, ids are unique, and Main Street starts quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  for (const e of enemies) for (const q of e.patrol ?? []) assert.equal(solid(q.tx, q.ty), false, `${e.id}'s patrol point ${q.tx},${q.ty}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0, 'Hopper is in the party: there are no npcs');
  // Nobody is in a trooper's sight at the start (his aggro is 120 px, 7.5 tiles).
  for (const e of enemies.filter((q) => !q.dormant)) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 8, `${e.id} is too close to the start`);
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  // Nothing stands on a prop's footprint, and nothing but the lights is in the way of a lights string.
  const covered = new Set(props.flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items, ...npcs]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a prop`);
  for (const e of enemies) for (const q of e.patrol ?? []) assert.ok(!covered.has(`${q.tx},${q.ty}`), `${e.id}'s patrol point is off the props`);
});

test('stage 5.1: the roster is worth 300 to 360 XP before xpMult, in the groups the spec lists, with the three demobats in the square', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 300 && xp <= 360, `stage XP ${xp}`);
  assert.equal(xp, 308);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('trooper'), kind('agent5'), kind('demobat'), kind('commander')], [7, 6, 3, 1]);
  assert.equal(enemies.length, 17);
  assert.ok(enemies.every((e) => e.tier === undefined), 'no elites');
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['boss', 'checkpoint', 'lab', 'square', 'street']);
  const types = (g: string): string => groups(g).map((e) => e.type).sort().join(',');
  assert.equal(types('street'), 'trooper,trooper');
  assert.equal(types('checkpoint'), 'trooper,trooper,trooper');
  assert.equal(types('square'), 'agent5,agent5,demobat,demobat,demobat,trooper,trooper', 'two troopers and two agents, and the three demobats of the rift that took the third trooper\'s place');
  const bats = groups('square').filter((e) => e.type === 'demobat');
  assert.ok(bats.every((e) => !e.dormant && inRoom('forecourt', e.tx, e.ty) && ['rift0', 'rift1', 'rift2'].includes(TILES[ROWS[e.ty]?.[e.tx] ?? '']?.name ?? '')), 'the bats hover over the rift in the asphalt, awake');
  assert.equal(types('lab'), 'agent5,agent5,agent5,agent5');
  assert.equal(types('boss'), 'commander');
  assert.ok(groups('street').every((e) => !e.dormant && e.patrol?.length === 2 && inRoom('street', e.tx, e.ty)), 'two troopers on patrol on Main Street, awake');
  const cp = groups('checkpoint');
  assert.ok(cp.every((e) => e.dormant && e.dir === 'left' && e.tx > prop('boom1').tx + 3 && inRoom('plaza', e.tx, e.ty)), 'the squad sleeps east of the boom gate, behind the sandbags, until the checkpoint beat');
  for (const e of cp) assert.ok(props.some((p) => p.prop === 'sandbags' && p.tx < e.tx && Math.abs(p.ty - e.ty) <= 1), `${e.id} has sandbags west of it`);
  assert.ok(groups('lab').every((e) => !e.dormant && (inRoom('southcorr', e.tx, e.ty) || inRoom('northcorr', e.tx, e.ty))), 'the Lab agents stand in the two corridors');
  const [boss] = groups('boss');
  assert.deepEqual([boss?.id, boss?.dormant], ['commander', true]);
  assert.ok(inRoom('bay', boss?.tx ?? 0, boss?.ty ?? 0) && (boss?.tx ?? 0) >= 38, 'the Commander sleeps in the bay, far from door1');
  // The clusters: an alerted foe alerts his group within 140 px, and so on down the line (damage.ts). Square and lab are separate fights.
  const clusters = (g: string): number => {
    const pts = groups(g).map((e) => [{ x: e.tx * 16 + 8, y: e.ty * 16 + 12 }, ...(e.patrol ?? []).map((q) => ({ x: q.tx * 16 + 8, y: q.ty * 16 + 12 }))]);
    const parent = pts.map((_, i) => i);
    const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i] as number)));
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if ((pts[i] ?? []).some((a) => (pts[j] ?? []).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 140))) parent[root(i)] = root(j);
    }
    return new Set(pts.map((_, i) => root(i))).size;
  };
  assert.deepEqual(['street', 'checkpoint', 'square', 'lab'].map(clusters), [1, 1, 3, 2], 'the square is three fights, the Lab two, the street and the checkpoint one each');
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [3, 3, 12]);
  const cache = items.filter((i) => inRoom('cache', i.tx, i.ty));
  assert.ok(cache.some((i) => i.item === 'eggo') && cache.filter((i) => i.item === 'quarter').length === 2, 'an Eggo and two quarters in the cache, behind crate1');
  assert.ok(items.every((i) => !inRoom('bay', i.tx, i.ty)), 'nothing to pick up in the bay');
});

// ---------------------------------------------------------------- the gates
test('stage 5.1: boom1 shuts the road at the checkpoint with the booth and a barrier beside it, crate1 the cache\'s neck, door1 the bay\'s doorway spawned open', () => {
  const b = prop('boom1');
  assert.deepEqual([b.prop, b.hitBy, b.w, b.h, b.solid, b.tx, b.ty], ['crack', 'smash', 16, 48, true, 19, 33]);
  assert.ok(Math.max(b.w ?? 0, b.h ?? 0) >= 40, 'a crack 40 px or more long is drawn as the boom gate');
  assert.deepEqual([33, 34, 35].map((y) => inRoom('street', b.tx, y)), [true, true, true], 'it spans the three tiles of road');
  const open = flood(new Set(['boom1']));
  const shut = flood(new Set());
  // Roofs shut the sidewalks and the lawn either side of the gate (tiles, so the bot's map, which does not know the army's props, sees no way
  // round it), and the booth and the barrier stand in front of them: the road is the only way east.
  for (const x of [18, 19]) for (const y of [31, 32, 36, 37]) assert.equal(nameOf(x, y), 'lockroof', `a roof at ${x},${y}`);
  assert.ok(prop('booth1').prop === 'booth' && prop('booth1').solid && prop('booth1').ty === 32 && prop('booth1').tx + 2 === 18, 'the booth stands on the north sidewalk, in front of the roofs');
  assert.ok(prop('barrier1').prop === 'barrier' && prop('barrier1').solid && prop('barrier1').ty === 36 && prop('barrier1').tx + 2 === 18, 'the barrier on the south');
  for (let y = 32; y <= 37; y++) assert.equal(shut[idx(19, y)], 0, `x 19 at ${y} is shut off by the gate`);
  for (let y = 33; y <= 35; y++) assert.equal(open[idx(19, y)], 1, `x 19 at ${y} opens with the gate`);
  for (let y = 31; y <= 37; y++) if (![33, 34, 35].includes(y)) assert.ok(solid(18, y) && solid(19, y), `${y} is solid at the gate in the tile map`);
  const c = prop('crate1');
  assert.deepEqual([c.prop, c.pushBy, c.w, c.h, c.tx, c.ty], ['crate', 'push', 32, 16, 12, 12]);
  assert.ok(solid(c.tx - 1, c.ty) && solid(c.tx + 2, c.ty), 'crate1 fills the cache\'s neck wall to wall');
  assert.ok(inRoom('cache', c.tx, c.ty - 3) && inRoom('southcorr', c.tx, c.ty + 1), 'the cache is north of it, the corridor south');
  const d = prop('door1');
  assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 32, 'open', false, 28, 3]);
  assert.ok(solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 2), 'door1 fills its doorway wall to wall');
  assert.ok(inRoom('northcorr', d.tx - 1, d.ty) && inRoom('bay', d.tx + 1, d.ty), 'and joins the north corridor and the bay');
  const towers = props.filter((p) => p.prop === 'tower');
  assert.ok(towers.length >= 5, `${towers.length} floodlight towers`);
  for (const t of towers) {
    assert.ok(t.solid && t.w === 16 && t.h === 16, `${t.id} is a one tile footprint that blocks`);
    assert.ok(nameOf(t.tx, t.ty) === 'lockwalk', `${t.id} stands on a sidewalk at the north edge of what it lights`);
  }
  const kinds = new Set(props.map((p) => p.prop));
  for (const k of ['truck', 'tent', 'sandbags', 'barricade', 'barrier', 'tower', 'booth', 'curfew', 'crack', 'crate', 'door', 'lights']) assert.ok(kinds.has(k as never), `a ${k}`);
  for (const p of props) if (ARMY.includes(p.prop)) assert.equal(p.solid, true, `${p.id} is spawned solid: the sim leaves ${p.prop} walkable by default`);
  for (const p of props.filter((q) => q.prop === 'curfew')) assert.ok(!p.solid, `${p.id} is a sign you can walk behind`);
});

// ---------------------------------------------------------------- reachability
test('stage 5.1: boom1 shuts the town square, the Lab and the bay, crate1 the cache, and door1 cuts the bay off once it shuts', () => {
  const shutDoor = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.id === 'door1' ? { ...s, solid: true } : s)) } as StageData);
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['Main Street', 10, 34, []], ['in front of the gate', 18, 34, []], ['past the gate', 22, 34, ['boom1']], ['the plaza', 35, 34, ['boom1']], ['the gap', 45, 26, ['boom1']],
    ['the forecourt', 30, 22, ['boom1']], ['the Lab\'s gate', 23, 17, ['boom1']], ['the south corridor', 10, 14, ['boom1']], ['the west connector', 3, 9, ['boom1']],
    ['the north corridor', 14, 3, ['boom1']], ['the store', 22, 8, ['boom1']], ['the bay', 38, 8, ['boom1']], ['the cache', 12, 9, ['boom1', 'crate1']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind a gate'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['boom1'], 12, 9), 0, 'the cache is shut until crate1 is pushed');
  assert.equal(reach(['crate1'], 12, 9), 0, 'and crate1 is no way past the boom gate');
  // The doors shut: the bay is cut off from the north corridor, and the corridor is the only way in.
  assert.equal(shutDoor.flood(new Set(['boom1']))[idx(38, 8)], 0, 'the bay is shut off by door1');
  assert.equal(shutDoor.flood(new Set(['boom1']))[idx(14, 3)], 1);
  assert.equal(shutDoor.flood(new Set(['boom1', 'door1']))[idx(38, 8)], 1, 'and the door open lets the party in');
  // Hopper is locked in and his smash opens the gate, so the lead can always pass.
  assert.deepEqual(rosterFor('5.1'), ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy', 'hopper']);
  assert.deepEqual(requiredFor('5.1'), ['hopper']);
  assert.ok(HERO_DEFS.hopper.utilities.includes('smash') && HERO_DEFS.steve.utilities.includes('smash'));
  assert.ok(HERO_DEFS.eleven.utilities.includes('push'));
});

test('stage 5.1: with every gate open nothing is boxed in, and every spawn and string of lights is reachable', () => {
  const gates = new Set(['boom1', 'crate1']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ROOMS)) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
  // The nav grid and the bot pass cleanly: every doorway and neck on the route is two tiles wide or more, and the army's props leave room.
  const wide = (cells: [number, number][]): void => { for (const [x, y] of cells) assert.equal(open[idx(x, y)], 1, `the gap at ${x},${y} is open`); };
  wide([[18, 33], [18, 34], [18, 35], [20, 33], [20, 34], [20, 35], [22, 34], [23, 34]]);
  wide([[43, 26], [44, 26], [43, 27], [44, 27], [43, 28], [44, 28]]);
  wide([[22, 16], [23, 16], [22, 17], [23, 17], [23, 18], [24, 18], [28, 3], [28, 4], [27, 3], [27, 4], [29, 3], [29, 4], [12, 11], [13, 11], [12, 12], [13, 12]]);
  const crateOnly = flood(new Set(['boom1']));
  assert.equal(crateOnly[idx(12, 12)], 0, 'crate1 stands in the neck');
});

// ---------------------------------------------------------------- the puzzles
test('stage 5.1: two puzzles: boom1 for Steve, with Hopper\'s fist as the other way, and the cache\'s crate for Eleven; the hints are one subtitle row', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['boom', 'crate']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['checkpoint', 'cache_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['boom1', 'crate1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['steve', 'eleven']);
  assert.deepEqual(S.puzzles[0]?.alt?.map((a) => a.hero), ['hopper'], 'Hopper is locked in, so the gate is always live');
  assert.equal(S.puzzles[1]?.alt, undefined);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined && p.blocks === undefined));
  const roster = rosterFor('5.1');
  const cols = Math.floor((256 - 16) / 6);
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    for (const who of [p.hero, ...(p.alt ?? []).map((a) => a.hero)]) {
      assert.ok(roster.includes(who), `${p.id}: ${who} can be in the party`);
      assert.ok(HERO_DEFS[who].utilities.includes(prop(p.prop).hitBy ?? (prop(p.prop).pushBy ?? 'smash')), `${p.id}: ${who} has what ${p.prop} asks for`);
    }
    for (const h of [{ hero: p.hero, hint: p.hint }, ...(p.alt ?? [])]) {
      assert.ok(fitsBox(h.hint, cols, 1), `"${h.hint}" is over one subtitle row`);
      assert.equal(h.hint, h.hint.toUpperCase());
      assert.ok(h.hint.includes(HERO_DEFS[h.hero].name.toUpperCase()), `${p.id}: ${h.hint} names ${h.hero}`);
      assert.ok(!/[0-9]/.test(h.hint) && !/seamless|robust|leverage|unlock|delve/i.test(h.hint) && !hasEmDash(h.hint), 'no key digits, no banned words');
    }
  }
  assert.ok(requiredFor('5.1').includes(S.puzzles[0]?.alt?.[0]?.hero as never), 'a locked-in hero can open the only gate on the route');
  assert.ok(!requiredFor('5.1').includes(S.puzzles[1]?.hero as never), 'while the cache waits on a hero who may be benched');
});

// ---------------------------------------------------------------- the bot's route
test('stage 5.1: the waypoints are reachable in order, boom1 is opened by flag, the route skips the cache and ends in the commander trigger', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the squad and the Commander wake themselves');
    if (w.open) { assert.equal(w.open, 'boom1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const flagged = S.waypoints.findIndex((w) => w.open);
  const [fx, fy] = tileOf(S.waypoints[flagged]?.x ?? 0, S.waypoints[flagged]?.y ?? 0);
  assert.ok(inRoom('street', fx, fy) && prop('boom1').tx - fx <= 3, 'boom1 is opened from the road, a couple of tiles short of it');
  assert.ok(inRect(rectOf('checkpoint'), fx, fy), 'inside the checkpoint beat\'s tiles, so the beat fires before the open');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('commander'), lx, ly), 'the last waypoint is inside the commander trigger');
  assert.ok(S.waypoints.every((w) => !inRoom('cache', ...tileOf(w.x, w.y))), 'the route skips the cache');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'checkpoint', 'square', 'commander']) assert.ok(crossed(id), `the bot walks through ${id}`);
  // The bot's nav grid knows tiles and a few kinds of furniture, not the army's props: its path must never cross one.
  const blocked = kit.blocked(new Set(['boom1']));
  for (const t of route.tiles) assert.equal(blocked[t], 0, `the bot's path crosses a solid prop or wall at ${t % grid.w},${Math.floor(t / grid.w)}`);
  const rooms = ['street', 'plaza', 'gap', 'forecourt', 'gate', 'southcorr', 'west', 'northcorr', 'bay'];
  for (const r of rooms) assert.ok(rectTiles(ROOMS[r] as TileRect).some(([x, y]) => route.tiles.has(idx(x, y))), `the route goes through the ${r}`);
  assert.ok(!rectTiles(ROOMS.store as TileRect).some(([x, y]) => route.tiles.has(idx(x, y))) && !rectTiles(ROOMS.cache as TileRect).some(([x, y]) => route.tiles.has(idx(x, y))), 'and past the store and the cache');
  assert.ok(S.waypoints.length >= 20, `${S.waypoints.length} waypoints`);
  // Lights are on the way: the bot passes within two tiles of each string.
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    assert.ok(rectTiles({ tx: x - 2, ty: y - 2, w: 5, h: 5 }).some(([u, v]) => route.tiles.has(idx(u, v))), `${c.prop} is near the route`);
  }
});
