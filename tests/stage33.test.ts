// Stage 3.3, the Starcourt food court, as data: the map and its six rooms, the budget, the gates in route order, reachability (the freezer
// is behind crack1, the balcony and the court behind Eleven's crate, the court is cut off once its doors shut), the checkpoints, the
// puzzles, the bot's route, and whole headless runs of the bot through Billy and the Mind Flayer. The beats and the scripts are in
// stage33-story.test.ts, the play scene in stage33-play.test.ts, and the bosses in the real sim in billy*.test.ts and flayer*.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultParty, requiredFor, rosterFor } from '../src/core/campaign.ts';
import { TILES } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import { botRoute, playStage, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';
import { ROOMS, ROWS, S, at, ch, inRect, inRoom, kit, prop, propTiles, rectOf, rectTiles, shut, solid, xpOf } from './stage33-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
/** The food court's own tiles, and the mall dressing and kitchen furniture it shares with the other stages. */
const FOOD = 'ÀÁÆÂÃÄÇÅ';
const SHARED = '(¢")?{}y`¨÷ÞiZINC';

// ---------------------------------------------------------------- the map
test('stage 3.3: the map is 48 by 40, uses only legend characters, is solid all round and runs at night with the starcourt theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['3.3', 'The food court', 'night', 'starcourt']);
  assert.ok((S.enemyMult ?? 1) >= 1 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.deepEqual(S.waves, []);
  const used = new Set(S.rows.join(''));
  for (const c of FOOD) assert.ok(used.has(c), `the map uses the food court tile '${c}'`);
  assert.ok(![...used].some((c) => !(FOOD + SHARED).includes(c)), 'and nothing but the food court tiles and the shared mall dressing');
  assert.equal(S.rows.join('').split('Þ').length - 1, 4, 'the lift is two tiles by two');
  assert.ok(rectTiles({ tx: 2, ty: 28, w: 2, h: 2 }).every(([x, y]) => ch(x, y) === 'Þ'), 'in the service hall\'s west end');
});

test('stage 3.3: walls are a cap row over a face row, and the court\'s north wall is a stallcap row over a stall row facing the floor below', () => {
  const FACE = ')ÃÂ{}i';
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      // A face tile with floor under it has rock or another wall above it: the cap row.
      if (FACE.includes(c) && y + 1 < grid.h && !solid(x, y + 1)) assert.ok(solid(x, y - 1), `the wall face at ${x},${y} has a cap above it`);
      if (c === '(' && y + 1 < grid.h) assert.ok(solid(x, y + 1), `a cap at ${x},${y} sits on rock, not floor`);
      if (!solid(x, y) && y > 0) assert.ok(ch(x, y - 1) !== '(', `floor at ${x},${y} has a cap above it, so no face shows`);
    }
  }
  for (let x = 1; x <= 24; x++) assert.deepEqual([ch(x, 1), ch(x, 2)], ['Â', 'Ã'], `the stalls at ${x}`);
  assert.ok(rectTiles({ tx: 2, ty: 3, w: 22, h: 1 }).every(([x, y]) => !solid(x, y) && ch(x, y - 1) === 'Ã'), 'with the court\'s floor right under them');
  const stalls = rectTiles({ tx: 0, ty: 0, w: 48, h: 40 }).filter(([x, y]) => ch(x, y) === 'Ã');
  assert.equal(stalls.length, 24, 'and the stalls are only there');
});

test('stage 3.3: the rooms are where the spec has them, and the court is an arena 22 by 14', () => {
  const count = (room: string, c: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (room: string): number => (ROOMS[room] as TileRect).w * (ROOMS[room] as TileRect).h;
  assert.ok(inRoom('hall', startTx, startTy), 'the stage begins in the service hall');
  assert.ok(count('hall', '÷') > total('hall') * 0.7 && count('hall', 'N') >= 6, 'bare concrete, with boxes stacked on it');
  assert.ok(rectTiles({ tx: 2, ty: 26, w: 10, h: 1 }).filter(([x, y]) => ch(x, y) === 'i').length >= 6, 'pipes along the hall\'s north wall');
  assert.ok(count('kitchens', 'Ä') > total('kitchens') * 0.7, 'the kitchens are quarry floor');
  assert.ok(count('kitchens', 'Ç') >= 10 && count('kitchens', 'Z') >= 10, 'fryer lines and counters');
  assert.ok(count('freezer', 'Ä') > total('freezer') * 0.7, 'the freezer is kitchen floor too');
  assert.ok(count('concourse', '¢') > total('concourse') * 0.7 && count('concourse', '"') >= 20 && count('concourse', 'y') >= 4, 'mall floor, its band and planters');
  assert.ok(count('concourse', '¨') >= 10 && count('concourse', '¨') < 40, 'a corner of goo');
  assert.ok(rectTiles({ tx: 33, ty: 21, w: 14, h: 1 }).filter(([x, y]) => ch(x, y) === '{').length >= 5, 'shop fronts along its north wall');
  assert.ok(rectTiles(ROOMS.escalators as TileRect).every(([x, y]) => ch(x, y) === 'Å'), 'the escalators are seven tiles of ramp, two wide');
  for (let y = 15; y <= 21; y++) assert.deepEqual([ch(39, y), ch(42, y)], ['`', '`'], `rails either side at ${y}`);
  assert.ok(count('balcony', '¨') >= 25, 'the balcony is thick with goo');
  assert.ok(count('balcony', 'y') >= 3, 'planters on the lanes');
  assert.ok(rectTiles({ tx: 29, ty: 15, w: 10, h: 1 }).every(([x, y]) => ch(x, y) === '`'), 'and the rail over the concourse');
  assert.deepEqual([ROOMS.court?.w, ROOMS.court?.h], [22, 14]);
  assert.ok(count('court', 'Æ') >= 40 && count('court', 'Á') >= 40 && count('court', 'À') > total('court') * 0.5, 'food floor, its band and the patch under the skylight');
  assert.ok(count('court', 'I') >= 8 && count('court', '¨') >= 4, 'tables and a little goo');
  // Every tile of the court is walkable but the tables, which stand against the walls and leave the middle and the legs' ground clear.
  for (const [x, y] of rectTiles(ROOMS.court as TileRect)) {
    assert.ok(!solid(x, y) || ch(x, y) === 'I', `court tile ${x},${y}`);
    if (ch(x, y) === 'I') assert.ok(x <= 2 || x >= 23 || y >= 16 || (x === 2 && y === 4), `the table at ${x},${y} is against a wall`);
  }
  for (const [x, y] of rectTiles({ tx: 4, ty: 3, w: 18, h: 6 })) assert.ok(!solid(x, y), `the ground in front of the stalls at ${x},${y} is clear`);
  // The skylight's patch is in the middle of the court, and the two doorways are in its east wall with a window between.
  assert.ok(rectTiles({ tx: 8, ty: 7, w: 10, h: 6 }).every(([x, y]) => ch(x, y) === 'Æ'), 'the patch of floor under the skylight');
  for (const y of [6, 7, 12, 13]) assert.ok(!solid(24, y), `the doorway at 24,${y}`);
  for (const y of [8, 9, 10, 11]) assert.equal(ch(24, y), '?', `the window at 24,${y}`);
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 3.3: the lights are lamps over each room, the moon through the skylight is the widest, and the three strings', () => {
  assert.ok(S.lights.length >= 30, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || '){}Ã'.includes(ch(tx, ty)), `the light at ${tx},${ty} is on floor, a wall face or a stall`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  const widest = S.lights.reduce((a, b) => (b.r > a.r ? b : a));
  assert.ok(ch(Math.floor(widest.x / 16), Math.floor(widest.y / 16)) === 'Æ', 'the widest pool is the moon\'s, on the patch under the skylight');
  assert.ok(S.lights.filter((l) => Math.floor(l.y / 16) === 2 && Math.floor(l.x / 16) <= 24).length >= 4, 'menu boards on the stalls');
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_hall', 'lights_concourse', 'lights_balcony']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_hall', 'lights_concourse', 'lights_balcony']);
  const open = flood(new Set(['crack1', 'crate1']));
  const triggers = ['concourse', 'balcony', 'billy'].map((id) => rectTiles(rectOf(id)));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(triggers.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the wake triggers, so a retry does not wake anything at once`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 4, 'lights_hall is at the start');
  assert.ok(inRoom('hall', prop('lights_hall').tx, prop('lights_hall').ty), 'in the service hall');
  assert.ok(inRoom('concourse', prop('lights_concourse').tx, prop('lights_concourse').ty) && prop('lights_concourse').ty <= 24, 'lights_concourse is at the concourse\'s north end');
  // lights_balcony is past the balcony beat and short of the court: the save point for the fight, with the beat fired and the doors open.
  const lb = prop('lights_balcony');
  assert.ok(inRoom('balcony', lb.tx, lb.ty) && lb.tx + 3 <= rectOf('balcony').tx, 'lights_balcony is on the court side of the balcony beat');
  assert.ok(lb.tx <= 28 && lb.ty >= 6 && lb.ty <= 13, 'on the west lane, by the court doors');
});

// ---------------------------------------------------------------- spawns
test('stage 3.3: the start and every spawn, item and patrol point is on open ground but the Mind Flayer\'s body, ids are unique, and the start is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  const body = enemies.find((e) => e.type === 'flayer');
  for (const s of [...enemies.filter((e) => e !== body), ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  assert.equal(ch(body?.tx ?? 0, body?.ty ?? 0), 'Ã', 'the body stands in the solid stall row');
  for (const p of props) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  for (const e of enemies.filter((q) => !q.dormant)) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 9, `${e.id} is too close to the start`);
  for (const room of ['hall', 'stockroom', 'freezer']) for (const [x, y] of rectTiles(ROOMS[room] as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), `nothing hostile in the ${room}`);
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop === 'lights').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items, ...npcs]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a string of lights`);
  const hopper = npcs.find((n) => n.id === 'hopper');
  assert.equal(npcs.length, 1);
  assert.ok(hopper && inRoom('hall', hopper.tx, hopper.ty) && Math.hypot(hopper.tx - 3, hopper.ty - 29) < 3 && Math.hypot(hopper.tx - startTx, hopper.ty - startTy) < 4, 'Hopper stands by the lift, near the start');
});

test('stage 3.3: the roster is worth 270 to 320 XP, in its groups, with the crowd and the balcony asleep in the goo and the bosses in the court', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 270 && xp <= 320, `stage XP ${xp}`);
  assert.equal(xp, 278);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('melter'), kind('flayed'), kind('billy'), kind('flayer'), kind('flayerleg')], [8, 6, 1, 1, 4]);
  assert.ok(enemies.every((e) => ['melter', 'flayed', 'billy', 'flayer', 'flayerleg'].includes(e.type)), 'only the chapter 3 enemies, and the bosses');
  assert.equal(enemies.filter((e) => e.tier === 'elite').length, 0, 'no elites: the crowd lost its own in tuning');
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['balcony', 'boss', 'crowd', 'flayer', 'kitchen']);
  assert.ok(groups('kitchen').length === 5 && groups('kitchen').every((e) => e.type === 'melter' && !e.dormant && inRoom('kitchens', e.tx, e.ty)), 'five melting rats among the fryers, awake');
  const crowd = groups('crowd');
  assert.ok(crowd.length === 5 && crowd.every((e) => e.type === 'flayed' && e.dormant && inRoom('concourse', e.tx, e.ty) && ch(e.tx, e.ty) === '¨'), 'five Flayed in the concourse, puddles in the goo');
  const balcony = groups('balcony');
  assert.ok(balcony.length === 4 && balcony.filter((e) => e.type === 'melter').length === 3 && balcony.filter((e) => e.type === 'flayed').length === 1, 'three melting rats and a Flayed');
  assert.ok(balcony.every((e) => e.dormant && inRoom('balcony', e.tx, e.ty) && e.tx < rectOf('balcony').tx), 'dormant on the balcony, west of its beat');
  assert.ok(balcony.filter((e) => e.type === 'flayed').every((e) => ch(e.tx, e.ty) === '¨'), 'the Flayed rises out of the goo');
  const billy = groups('boss');
  assert.deepEqual([billy.length, billy[0]?.id, billy[0]?.type, billy[0]?.dormant], [1, 'billy', 'billy', true]);
  assert.ok(inRoom('court', billy[0]?.tx ?? 0, billy[0]?.ty ?? 0) && (billy[0]?.tx ?? 99) < 12, 'Billy sleeps on the court\'s west side, a long way from the doors');
  // The Mind Flayer's layout is the one in tests/flayer-helpers.ts: the body in the stall row, its legs one row below, spread along its front.
  const fl = groups('flayer');
  const b = fl.find((e) => e.id === 'flayer') as (typeof enemies)[number];
  const legs = fl.filter((e) => e.type === 'flayerleg');
  assert.ok(fl.length === 5 && fl.every((e) => e.dormant), 'the body and four legs, all dormant');
  assert.deepEqual(legs.map((l) => l.id), ['leg1', 'leg2', 'leg3', 'leg4']);
  assert.deepEqual(legs.map((l) => l.tx - b.tx), [-5, -2, 2, 5], 'the legs\' roots are spread along its front');
  assert.ok(legs.every((l) => l.ty === b.ty + 1 && inRoom('court', l.tx, l.ty)), 'on the first row of floor');
  assert.ok(b.tx >= 11 && b.tx <= 13, 'the body is in the middle of the north wall');
  // The burrows are where the Flayed it calls come up: open floor at the court\'s two sides, level with its middle.
  assert.equal(S.burrows?.length, 2);
  const sides = (S.burrows ?? []).map((q) => q.tx).sort((p, q) => p - q);
  assert.ok(sides[0] !== undefined && sides[1] !== undefined && sides[0] <= 4 && sides[1] >= 21, 'one at each side');
  for (const q of S.burrows ?? []) assert.ok(inRoom('court', q.tx, q.ty) && !solid(q.tx, q.ty) && q.ty >= 8 && q.ty <= 11, `burrow ${q.tx},${q.ty}`);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  const cache = items.filter((i) => inRoom('freezer', i.tx, i.ty));
  assert.ok(cache.some((i) => i.item === 'eggo') && cache.filter((i) => i.item === 'quarter').length >= 2, 'an Eggo and quarters in the freezer, behind crack1');
  assert.ok(items.some((i) => i.item === 'eggo' && inRoom('balcony', i.tx, i.ty)), 'an Eggo on the balcony');
  assert.ok(items.every((i) => !inRoom('court', i.tx, i.ty)), 'nothing to pick up in the arena');
});

// ---------------------------------------------------------------- the gates
test('stage 3.3: crack1 shuts the freezer\'s neck, crate1 fills the escalators\' top between the rails, and door1 and door2 the court\'s two doorways, spawned open', () => {
  const c1 = prop('crack1');
  assert.deepEqual([c1.prop, c1.hitBy, c1.w, c1.h, c1.solid, c1.tx, c1.ty], ['crack', 'smash', 32, 16, true, 19, 26]);
  assert.ok(solid(c1.tx - 1, c1.ty) && solid(c1.tx + 2, c1.ty), 'crack1 fills the neck wall to wall');
  assert.ok(inRoom('freezer', c1.tx, c1.ty - 2) && inRoom('kitchens', c1.tx, c1.ty + 1), 'the freezer is north of it, the kitchens south');
  const c2 = prop('crate1');
  assert.deepEqual([c2.prop, c2.pushBy, c2.w, c2.h, c2.tx, c2.ty], ['crate', 'push', 32, 16, 40, 15]);
  assert.ok(solid(c2.tx - 1, c2.ty) && solid(c2.tx + 2, c2.ty), 'crate1 fills the ramp between its rails');
  assert.ok(inRoom('escalators', c2.tx, c2.ty) && inRoom('escalators', c2.tx, c2.ty + 3), 'on the escalators\' top row, with the ramp below it');
  assert.ok(inRoom('balcony', c2.tx, c2.ty - 1), 'and the balcony above');
  for (const [id, ty] of [['door1', 12], ['door2', 6]] as const) {
    const d = prop(id);
    assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 16, 32, 'open', false, 24, ty], id);
    assert.ok(solid(d.tx, d.ty - 1) && solid(d.tx, d.ty + 2), `${id} fills its doorway wall to wall`);
    assert.ok(inRoom('court', d.tx - 1, d.ty) && inRoom('balcony', d.tx + 1, d.ty), `${id} joins the court and the balcony`);
  }
  assert.deepEqual(props.filter((p) => p.prop !== 'lights').map((p) => p.id), ['crack1', 'crate1', 'door1', 'door2']);
});

// ---------------------------------------------------------------- reachability
test('stage 3.3: crack1 shuts the freezer, Eleven\'s crate shuts the balcony and the court, and the doors cut the court off', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the service hall', 5, 31, []], ['the stockroom', 5, 21, []], ['the kitchens', 20, 31, []], ['the concourse', 40, 30, []], ['the escalators\' foot', 41, 20, []],
    ['the freezer', 20, 21, ['crack1']], ['the balcony', 41, 13, ['crate1']], ['the top lane', 43, 3, ['crate1']], ['the west lane', 26, 10, ['crate1']],
    ['the court', 12, 10, ['crate1']], ['under the stalls', 12, 3, ['crate1']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind a gate'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['crack1'], 12, 10), 0, 'the freezer is no way round the crate');
  assert.equal(reach(['crate1'], 20, 21), 0, 'nor the crate a way into the freezer');
  // The doors shut: the court is cut off from the balcony, and the balcony is the only way in.
  const closed = shut.flood(new Set(['crate1']));
  assert.equal(closed[idx(12, 10)], 0, 'the court is shut off by its doors');
  assert.equal(closed[idx(26, 10)], 1);
  assert.equal(shut.flood(new Set(['crate1', 'door1']))[idx(12, 10)], 1, 'and one door open lets the party in');
  assert.equal(shut.flood(new Set(['crate1', 'door2']))[idx(12, 10)], 1);
  // The party cannot get up to the balcony without Eleven's shove, so she is on the route.
  assert.deepEqual(requiredFor('3.3'), ['eleven']);
  assert.ok(HERO_DEFS.eleven.utilities.includes('push'));
  assert.deepEqual(rosterFor('3.3').filter((h) => HERO_DEFS[h].utilities.includes('push')), ['eleven'], 'only Eleven can push');
});

test('stage 3.3: with every gate open nothing is boxed in, and every spawn, burrow and string of lights is reachable', () => {
  const gates = new Set(['crack1', 'crate1']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies.filter((e) => e.type !== 'flayer'), ...items, ...npcs]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const q of S.burrows ?? []) assert.equal(open[idx(q.tx, q.ty)], 1, 'a burrow is reachable');
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const room of Object.keys(ROOMS)) assert.ok(rectTiles(ROOMS[room] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${room} is reachable`);
  // The only gates between the start and the court are the crate and the doors, and the freezer is the only dead end behind a gate.
  assert.equal(at(flood(new Set(['crate1'])), 20, 21), 0);
});

// ---------------------------------------------------------------- the puzzles
test('stage 3.3: three puzzles, each with a hero in the roster who has what the prop asks for, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['crack', 'crate', 'reach']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['crack_hint', 'crate_hint', 'billy_down']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['crack1', 'crate1', 'billy']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['steve', 'eleven', 'eleven']);
  assert.deepEqual(S.puzzles.map((p) => p.enemy), [undefined, undefined, true]);
  assert.ok(S.puzzles.every((p) => p.alt === undefined && p.blocks === undefined));
  const roster = rosterFor('3.3');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    if (p.enemy) assert.ok(enemies.some((e) => e.id === p.prop), `${p.id}: ${p.prop} is an enemy spawn`);
    else assert.ok(HERO_DEFS[p.hero].utilities.includes(prop(p.prop).hitBy ?? prop(p.prop).pushBy as NonNullable<Prop['hitBy']>), `${p.id}: ${p.hero} has what ${p.prop} asks for`);
  }
  assert.ok(HERO_DEFS.steve.utilities.includes('smash'));
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-9.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: ${p.hint} names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint) && !hasEmDash(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-9.md`);
  }
});

// ---------------------------------------------------------------- the bot's route
test('stage 3.3: the waypoints are reachable in order, crate1 is opened by flag, the route skips the freezer and ends in the billy trigger', () => {
  const open = new Set<string>();
  let opened = 0;
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gates before it are open`);
    assert.equal(w.dash, undefined, 'no gaps in this stage');
    assert.equal(w.wake, undefined, 'and the bot wakes nothing: the crowd, the balcony and the bosses wake themselves');
    if (w.open) { assert.equal(w.open, 'crate1', 'the only gate the bot opens by flag'); open.add(w.open); opened++; }
  });
  assert.equal(opened, 1);
  const flagged = S.waypoints.findIndex((w) => w.open);
  const [fx, fy] = tileOf(S.waypoints[flagged]?.x ?? 0, S.waypoints[flagged]?.y ?? 0);
  assert.ok(inRoom('escalators', fx, fy) && fy >= 16 && fy - 15 <= 3, 'crate1 is opened from the ramp, a couple of tiles short of it');
  assert.ok(inRect(rectOf('crate_hint'), fx, fy), 'inside the hint beat\'s tiles, so the hint fires before the open');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('billy'), lx, ly), 'the last waypoint is inside the billy trigger');
  assert.ok(S.waypoints.every((w) => !inRoom('freezer', ...tileOf(w.x, w.y)) && !inRoom('stockroom', ...tileOf(w.x, w.y))), 'the route skips the freezer and the stockroom');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'kitchen', 'concourse', 'crate_hint', 'sour', 'balcony', 'billy']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(!crossed('crack_hint'), 'but not to the freezer\'s door');
  assert.ok(S.waypoints.length >= 20, `${S.waypoints.length} waypoints`);
});

// ---------------------------------------------------------------- whole runs
test('stage 3.3: the bot clears the stage on kid with the party a real run brings, through every beat in order, Billy and the Mind Flayer included', () => {
  const party = defaultParty('3.3');
  assert.deepEqual(party.map((p) => p.id), ['mike', 'dustin', 'robin', 'eleven'], 'Mike leads with Dustin, Robin and Eleven');
  const order = ['l9_start', 'l9_kitchen', 'l9_concourse', 'l9_crate_hint', 'l9_crate_done', 'l9_sour', 'l9_balcony', 'l9_billy', 'l9_billy_down', 'l9_billy_freed', 'l9_clear'];
  // Kid is the floor that tuning (S.enemyMult) cannot push out of reach; the numbers on chief and for a careless bot are in the report of
  // node scripts/measure-stage.ts 3.3.
  for (const seed of [1, 2]) {
    const run = playStage(S, seed, party, 30000, 'kid');
    assert.ok(run.done && !run.allDown, `seed ${seed} clears`);
    assert.deepEqual(run.said, order, `seed ${seed}: every beat, in order`);
    assert.deepEqual(run.steps, ['open door1', 'open door2'], 'the bot opens no gate by the director and the clear opens the doors');
    assert.ok(run.xp >= 278, `seed ${seed}: ${run.xp} XP, with the Flayed it called on top`);
    assert.ok(run.frames > 60 * 60 && run.frames < 60 * 480, `seed ${seed}: ${(run.frames / 60).toFixed(0)} s`);
  }
});

test('stage 3.3: a retry from the string before the crate, with the crate kept open and the rats and the crowd dead, still walks into the court and clears', () => {
  // The crate stays open across a retry, so crate_done (an event beat) never fires again: the chain after it waits on the ramp's hint beat.
  const cp = S.checkpoints[1] as (typeof S.checkpoints)[number];
  const gone = enemies.filter((e) => e.group === 'kitchen' || e.group === 'crowd').map((e) => e.id);
  const grid2 = stageGrid(S);
  const sim = createSim(simOptions(S, grid2, {
    party: defaultParty('3.3'), start: { x: cp.x, y: cp.y }, seed: 7, difficulty: 'kid', skipSpawns: gone, openProps: ['lights_hall', 'lights_concourse', 'crate1'],
  }));
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (_id, done) => done(), scare: (done) => done(), open: (id) => sim.openProp(id), jingle: () => undefined, finish: () => undefined,
  });
  dir.restore({ fired: ['start', 'kitchen', 'concourse'], cleared: ['crowd'] });
  const bot = createBot({ grid: grid2, waypoints: routeFrom(S.waypoints, cp) });
  for (let f = 0; f < 30000 && !dir.finished(); f++) {
    dir.events(sim.step(bot.next(sim)));
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  assert.ok(dir.finished(), 'the stage is cleared');
  for (const id of ['crate_hint', 'sour', 'balcony', 'billy', 'billy_freed', 'level_clear']) assert.ok(dir.hasFired(id), `${id} fired`);
  assert.ok(!dir.hasFired('crate_done'), 'although crate_done never did');
});
