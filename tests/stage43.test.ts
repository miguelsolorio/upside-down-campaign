// Stage 4.3, Upside Down Hawkins, as data: the map and its places, the roof deck and its ladder, the budget, the mirror and the clocks,
// reachability (the cross street behind mirror1, the deck behind door_roof once it shuts), the checkpoints, the puzzles and the bot's
// route. The beats and the scripts are in stage43-story.test.ts, and whole runs of the bot and the play scene in stage43-play.test.ts.
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
import type { StageData, TileRect } from '../src/world/types.ts';
import { botRoute, stageKit, tileOf } from './stage-helpers.ts';
import { PLACES, ROWS, S, at, ch, inPlace, inRect, kit, placeOf, prop, propTiles, rectOf, rectTiles, solid, xpOf } from './stage43-helpers.ts';

const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const UD = 'ëìíîïðñòĀāĂăĄą';
/** The same stage with door_roof shut, as the roof beat leaves it. */
const shut = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.id === 'door_roof' ? { ...s, solid: true } : s)) } as StageData);

// ---------------------------------------------------------------- the map
test('stage 4.3: the map is 48 by 40, uses only the Upside Down tiles, is solid all round and runs at night in the storm with the upside theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music, S.storm], ['4.3', 'Upside Down Hawkins', 'night', 'upside', true]);
  assert.ok((S.enemyMult ?? 1) > 0 && (S.enemyMult ?? 1) <= 4, `enemyMult ${S.enemyMult}`);
  assert.ok((S.xpMult ?? 1) >= 1 && (S.xpMult ?? 1) <= 4, `xpMult ${S.xpMult}`);
  assert.deepEqual(S.waves, []);
  assert.equal(S.hazards, undefined);
  assert.equal(S.memory, undefined, 'only 4.2\'s beat turns a room Blood red');
  const used = new Set(S.rows.join(''));
  for (const c of UD) assert.ok(used.has(c), `the map uses the tile '${c}'`);
  assert.ok(![...used].some((c) => !UD.includes(c)), 'and nothing but the Upside Down tiles');
  const count = (c: string): number => [...S.rows.join('')].filter((x) => x === c).length;
  assert.ok(count('ï') >= 20, 'with veins creeping over the lawns and the road');
  assert.ok(count('ă') >= 30 && count('Ă') >= 40, 'and dead trees and fences');
  assert.ok(count('ð') + count('ñ') + count('ò') >= 36, 'and two rows of houses');
});

test('stage 4.3: the roof deck is 16 by 10 inside a lip, with the trailer under it and a ladder in the middle of both', () => {
  // The deck: the arena, floor all through, and the lip a tile thick round it with a doorway two tiles wide in its south side.
  for (const [x, y] of rectTiles({ tx: 30, ty: 2, w: 16, h: 10 })) assert.equal(ch(x, y), 'Ą', `deck floor at ${x},${y}`);
  assert.deepEqual(PLACES.deck, { tx: 30, ty: 2, w: 16, h: 10 });
  for (const [x, y] of rectTiles({ tx: 29, ty: 1, w: 18, h: 12 })) {
    if (inRect(PLACES.deck as TileRect, x, y)) continue;
    assert.equal(ch(x, y), x >= 37 && x <= 38 && y === 12 ? 'Ą' : 'ą', `the lip at ${x},${y}`);
  }
  assert.ok(![...ROWS.join('')].some((c, i) => c === 'ą' && i % 48 > 46), 'the lip does not touch the map edge');
  // The trailer: a run of two rows under the lip, in two halves round the ladder.
  for (const y of [13, 14]) {
    for (let x = 29; x <= 46; x++) assert.equal(ch(x, y), x === 37 || x === 38 ? 'î' : 'ā', `the trailer at ${x},${y}`);
    assert.ok(solid(36, y) && solid(39, y), `the ladder is flanked by trailer at row ${y}`);
  }
  // The ladder: the lawn between the halves and the doorway in the lip, a column two tiles wide from the lot onto the deck.
  for (const [x, y] of rectTiles({ tx: 37, ty: 12, w: 2, h: 3 })) assert.equal(solid(x, y), false, `the ladder is open at ${x},${y}`);
  assert.equal(kit.blocked(new Set())[idx(37, 12)], 0, 'and door_roof is open at the start');
  assert.equal(shut.blocked(new Set())[idx(37, 12)], 1, 'and shuts the doorway');
  assert.ok(solid(36, 12) && solid(39, 12));
  assert.ok(kit.blocked(new Set())[idx(38, 13)] === 0 && kit.blocked(new Set())[idx(38, 15)] === 0);
});

test('stage 4.3: the places are where the spec has them: the tear, the street, the yards, the alley, the cross street, the park and the lot', () => {
  const count = (place: string, c: string): number => rectTiles(PLACES[place] as TileRect).filter(([x, y]) => ch(x, y) === c).length;
  const total = (place: string): number => (PLACES[place] as TileRect).w * (PLACES[place] as TileRect).h;
  assert.ok(inPlace('tear', startTx, startTy), 'the stage begins at the tear, in the south-west corner');
  assert.ok(startTx < 12 && startTy > 26, 'in the south-west');
  assert.ok(count('tear', 'î') > total('tear') * 0.5 && count('tear', 'ï') >= 10, 'a lawn laced with veins');
  assert.ok(count('street', 'ë') + count('street', 'ì') >= 80 && count('street', 'ì') >= 8, 'a street: a road with its center line');
  assert.ok(count('street', 'í') >= 50, 'with sidewalks either side');
  assert.ok(count('yards', 'î') >= 30, 'the first row\'s yards run along it');
  assert.ok(rectTiles({ tx: 10, ty: 28, w: 20, h: 1 }).filter(([x, y]) => 'ðñò'.includes(ch(x, y))).length >= 16, 'under the first row of houses');
  assert.ok(rectTiles({ tx: 10, ty: 18, w: 20, h: 1 }).filter(([x, y]) => 'ðñò'.includes(ch(x, y))).length >= 18, 'and a second row across the cross street');
  assert.ok(rectTiles({ tx: 10, ty: 28, w: 20, h: 1 }).some(([x, y]) => ch(x, y) === 'ò') && rectTiles({ tx: 10, ty: 18, w: 20, h: 1 }).some(([x, y]) => ch(x, y) === 'ò'), 'with doors in both');
  assert.ok(count('alley', 'ë') + count('alley', 'í') === total('alley'), 'the alley is a road two tiles wide');
  assert.ok(count('cross', 'ë') + count('cross', 'ì') >= 55 && count('cross', 'í') >= 36, 'the cross street has a road and sidewalks');
  assert.ok(count('gate', 'ë') === 3, 'the gate in the park\'s fence is three tiles wide');
  assert.ok(rectTiles({ tx: 30, ty: 15, w: 1, h: 14 }).filter(([x, y]) => ch(x, y) === 'Ă').length === 11, 'in a fence that runs the park\'s west side');
  assert.ok(rectTiles({ tx: 30, ty: 29, w: 17, h: 1 }).every(([x, y]) => ch(x, y) === 'Ă'), 'and its south');
  for (const y of [18, 25]) assert.ok(rectTiles({ tx: 31, ty: y, w: 16, h: 2 }).filter(([x, yy]) => ch(x, yy) === 'ā').length === 18, `a row of trailers at ${y}`);
  assert.ok(count('lanes', 'ā') === 0 && count('lanes', 'î') + count('lanes', 'ï') >= total('lanes') * 0.9, 'with a lane of open yard between the rows');
  assert.ok(count('lot', 'î') >= 44 && count('lot', 'ā') === 0, 'the lot in front of Eddie\'s trailer is open lawn');
  for (const place of Object.keys(PLACES)) for (const [x, y] of rectTiles(PLACES[place] as TileRect)) assert.ok(placeOf(x, y) !== null, `${x},${y} is in a place`);
});

test('stage 4.3: every doorway on the route is two tiles wide or more, and walled on both sides', () => {
  // [x, y, w, h]: the floor the party passes through, with a solid tile either side across its width.
  const doorways: [string, number, number, number, number, 'x' | 'y'][] = [
    ['the alley', 18, 25, 2, 4, 'x'], ['the park gate', 30, 21, 1, 3, 'y'], ['the ladder', 37, 12, 2, 3, 'x'],
    ['the lane between the first row\'s trailers', 39, 18, 3, 2, 'x'], ['the lane between the second row\'s', 39, 25, 3, 2, 'x'],
  ];
  for (const [name, x, y, w, h, along] of doorways) {
    for (const [u, v] of rectTiles({ tx: x, ty: y, w, h })) assert.equal(solid(u, v), false, `${name}: ${u},${v} is open floor`);
    if (along === 'x') for (let v = y; v < y + h; v++) assert.ok(solid(x - 1, v) && solid(x + w, v), `${name} is flanked by wall at row ${v}`);
    else for (let u = x; u < x + w; u++) assert.ok(solid(u, y - 1) && solid(u, y + h), `${name} is flanked by wall at column ${u}`);
    assert.ok((along === 'x' ? w : h) >= 2, `${name} is wide enough`);
  }
  // Nothing on the map squeezes through a single tile: every open tile has an open neighbour on each axis (the props are checked on their own).
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!solid(x, y)) assert.ok((!solid(x - 1, y) || !solid(x + 1, y)) && (!solid(x, y - 1) || !solid(x, y + 1)), `${x},${y} is a dead pocket`);
  }
});

// ---------------------------------------------------------------- the lights and the checkpoints
test('stage 4.3: the lights are the tear\'s glow, lamps and the deck, and the three strings are the save points in route order, outside every wake trigger', () => {
  assert.ok(S.lights.length >= 20, `${S.lights.length} pools`);
  for (const l of S.lights) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(tx > 0 && tx < 47 && ty > 0 && ty < 39, `the light at ${tx},${ty} is inside the map`);
    assert.ok(!solid(tx, ty) || ch(tx, ty) === 'ą' || ch(tx, ty) === 'ð', `the light at ${tx},${ty} is on open ground`);
    assert.ok(l.r >= 24 && l.r <= 64, `radius ${l.r}`);
  }
  assert.ok(S.lights.some((l) => l.r >= 48 && (l.flicker ?? 0) >= 0.5 && inPlace('tear', Math.floor(l.x / 16), Math.floor(l.y / 16))), 'the tear glows red and flickers');
  assert.ok(S.lights.filter((l) => inPlace('deck', Math.floor(l.x / 16), Math.floor(l.y / 16))).length >= 4, 'and the deck has its pools');
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_tear', 'lights_park', 'lights_roof']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_tear', 'lights_park', 'lights_roof']);
  const open = flood(new Set(['mirror1']));
  // A retry from a string must not fire anything on the spot: the checkpoint is outside the beats that wake, curse or shut a door.
  const triggers = ['street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3', 'roof'].map((id) => rectTiles(rectOf(id)));
  const places = ['tear', 'lawn2', 'lot'];
  S.checkpoints.forEach((c, i) => {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(triggers.every((t) => !t.some(([u, v]) => u === x && v === y)), `${c.prop} is outside the triggers`);
    assert.ok(inPlace(places[i] as string, p.tx, p.ty) && inPlace(places[i] as string, x, y) || (i === 1 && y === 20), `${c.prop} hangs in the ${places[i]}`);
    assert.deepEqual([p.w, p.h], [48, 16]);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  });
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 6, 'lights_tear is by the start');
  assert.ok(prop('lights_park').tx + 2 < rectOf('park').tx, 'lights_park hangs before the gate');
  assert.ok(prop('lights_roof').tx + 2 < 37 && prop('lights_roof').ty >= 15, 'lights_roof hangs in the lot, clear of the ladder');
  assert.ok(Math.abs(prop('lights_roof').tx + 1 - 37.5) <= 6, 'near it');
});

// ---------------------------------------------------------------- spawns
test('stage 4.3: the start and every spawn, item and tile is on open ground, ids are unique, and nothing hostile is near the start', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) if (p.prop === 'clock' || p.prop === 'mirror' || p.id === 'door_roof') continue; else assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length, 'and nothing else is spawned');
  assert.equal(npcs.length, 0, 'Eddie is in the party from the start: there are no npcs');
  const taken = new Set([...enemies, ...items, ...npcs].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length + npcs.length, 'nothing shares a tile');
  const covered = new Set(props.filter((p) => p.prop !== 'mirror').flatMap((p) => propTiles(p).map(([x, y]) => `${x},${y}`)));
  for (const s of [...enemies, ...items, ...npcs]) assert.ok(!covered.has(`${s.tx},${s.ty}`), `${s.id} does not stand on a prop`);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) >= (e.type === 'demodog' || e.type === 'demobat' ? 9 : 6), `${e.id} is out of the tear's notice`);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [4, 3, 12]);
  assert.ok(items.some((i) => i.item === 'eggo' && inPlace('ladder', i.tx, i.ty)), 'an Eggo at the foot of the ladder, for the song');
});

test('stage 4.3: the foes are the spec\'s groups and the XP is 240 to 300 before xpMult', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 240 && xp <= 300, `stage XP ${xp}`);
  assert.equal(xp, 245);
  assert.deepEqual([...new Set(enemies.map((e) => e.group))].sort(), ['alley', 'bats1', 'bats2', 'park', 'street']);
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  const byType = (g: string): Record<string, number> => groups(g).reduce((m, e) => ({ ...m, [e.type]: (m[e.type] ?? 0) + 1 }), {} as Record<string, number>);
  assert.deepEqual(byType('street'), { demodog: 5, vine: 3, pod: 3 });
  assert.deepEqual(byType('bats1'), { demobat: 4 });
  assert.deepEqual(byType('alley'), { ghoul: 3 });
  assert.deepEqual(byType('park'), { demodog: 5, vine: 4, pod: 3 });
  assert.deepEqual(byType('bats2'), { demobat: 5 });
  for (const g of ['street', 'alley', 'park']) assert.ok(groups(g).every((e) => !e.dormant), `${g} is awake`);
  for (const g of ['bats1', 'bats2']) assert.ok(groups(g).every((e) => e.dormant), `${g} is dormant until its beat`);
  const elite = enemies.filter((e) => e.tier === 'elite');
  assert.deepEqual(elite.map((e) => [e.group, e.type]), [['bats2', 'demobat']], 'the one elite leads the second flock');
  assert.ok(enemies.filter((e) => e !== elite[0]).every((e) => e.tier === undefined));
  // Where they stand: the street's pack on the first row's side of the road, the flock over the road's east end, the park's pack in its lanes.
  for (const e of groups('street')) assert.ok(e.tx <= 28 && e.ty >= 29, `${e.id} is on the street`);
  for (const e of groups('bats1')) assert.ok(e.ty >= 33 && e.tx >= 20, `${e.id} hovers over the road\'s east end`);
  for (const e of [...groups('park'), ...groups('bats2')]) assert.ok(e.tx >= 31 && e.ty >= 15, `${e.id} is in the park`);
  for (const e of groups('bats2')) assert.ok(e.ty <= 17, `${e.id} hovers over the lot`);
  // The ghouls wait in mirror1 and step out on the road in front of its glass, within the alley.
  const m = prop('mirror1');
  for (const e of groups('alley')) {
    assert.equal(e.mirror, 'mirror1');
    assert.ok(e.ty === m.ty + 1 || e.ty === m.ty + 2, `${e.id} steps out south of the glass`);
    assert.ok(e.tx >= m.tx && e.tx < m.tx + 2, `${e.id} is in front of mirror1`);
    assert.ok(inPlace('alley', e.tx, e.ty), `${e.id} stands in the alley`);
  }
  for (const e of enemies.filter((q) => q.type !== 'ghoul')) assert.equal(e.mirror, undefined);
});

// ---------------------------------------------------------------- the mirror, the clocks and the door
test('stage 4.3: mirror1 closes the alley, three clocks stand free, and door_roof is open in the lip until the roof beat', () => {
  const m = prop('mirror1');
  assert.deepEqual([m.prop, m.hitBy, m.w, m.h, m.solid, m.tx, m.ty], ['mirror', 'riff', 32, 16, true, 18, 25]);
  assert.ok(solid(m.tx - 1, m.ty) && solid(m.tx + 2, m.ty) && !solid(m.tx, m.ty) && !solid(m.tx + 1, m.ty), 'it fills the alley wall to wall');
  assert.ok(inPlace('alley', m.tx, m.ty) && inPlace('alley', m.tx + 1, m.ty), 'two tiles wide, the alley\'s width');
  const clocks = props.filter((p) => p.prop === 'clock');
  assert.deepEqual(clocks.map((c) => c.id), ['clock1', 'clock2', 'clock3']);
  for (const c of clocks) {
    assert.deepEqual([c.hitBy, c.w, c.h, c.solid, c.hits], ['riff', 16, 32, true, 3], c.id);
    for (const [x, y] of propTiles(c)) assert.equal(solid(x, y), false, `${c.id} stands on open ground at ${x},${y}`);
  }
  assert.deepEqual([prop('clock1').tx, prop('clock1').ty], [13, 29]);
  assert.ok(inPlace('yards', 13, 29) && inPlace('yards', 13, 30), 'clock1 stands in the first house\'s yard, against its front');
  assert.ok(rectTiles({ tx: 17, ty: 23, w: 4, h: 2 }).some(([x, y]) => x === prop('clock2').tx && y === prop('clock2').ty) && inPlace('cross', 20, 24), 'clock2 stands on the corner where the alley comes out');
  assert.ok(solid(20, 25), 'against the second house');
  assert.ok(inPlace('lanes', prop('clock3').tx, prop('clock3').ty), 'clock3 stands in the park\'s middle lane');
  // Each one leaves a way round it at least two tiles wide.
  const blocked = kit.blocked(new Set(['mirror1']));
  for (const c of clocks) {
    const free = (dx: number, dy: number): number => {
      let n = 0;
      for (let k = 1; k <= 3; k++) if (!blocked[idx(c.tx + dx * k, c.ty + dy * k)]) n++; else break;
      return n;
    };
    const rows = [-1, 0, 1, 2].filter((dy) => !blocked[idx(c.tx - 1, c.ty + dy)] && !blocked[idx(c.tx + 1, c.ty + dy)]).length;
    assert.ok(rows >= 2, `${c.id} has room either side`);
    assert.ok(free(-1, 0) + free(1, 0) >= 2, `${c.id}'s neighbours are open`);
  }
  const d = prop('door_roof');
  assert.deepEqual([d.prop, d.w, d.h, d.state, d.solid, d.tx, d.ty], ['door', 32, 16, 'open', false, 37, 12]);
  assert.deepEqual(props.filter((p) => p.prop !== 'lights').map((p) => p.id), ['mirror1', 'clock1', 'clock2', 'clock3', 'door_roof']);
});

// ---------------------------------------------------------------- reachability
test('stage 4.3: mirror1 shuts the way on, nothing is reachable early, and door_roof shuts the deck behind the party', () => {
  const reach = (gates: string[], x: number, y: number, kk = kit): number => at(kk.flood(new Set(gates)), x, y);
  const spots: [string, number, number, string[]][] = [
    ['the tear', 4, 29, []], ['the street', 20, 34, []], ['the yards', 22, 30, []], ['the alley\'s south end', 18, 29, []], ['the road below the glass', 19, 27, []],
    ['the cross street above the glass', 18, 24, ['mirror1']], ['the cross street', 25, 22, ['mirror1']], ['the second row\'s lawn', 15, 19, ['mirror1']], ['the gate', 30, 22, ['mirror1']],
    ['the lanes', 36, 23, ['mirror1']], ['the south lane', 40, 27, ['mirror1']], ['the lot', 38, 16, ['mirror1']], ['the ladder', 38, 13, ['mirror1']], ['the deck', 38, 7, ['mirror1']],
  ];
  for (const [name, x, y, gates] of spots) {
    assert.equal(reach([], x, y), gates.length === 0 ? 1 : 0, `${name} is ${gates.length === 0 ? 'open at the start' : 'behind mirror1'}`);
    assert.equal(reach(gates, x, y), 1, `${name} is reachable`);
  }
  assert.equal(reach(['mirror1'], 38, 7, shut), 0, 'the deck is closed once door_roof shuts');
  assert.equal(reach(['mirror1', 'door_roof'], 38, 7, shut), 1, 'and opens with it');
  assert.equal(reach(['mirror1'], 38, 13, shut), 1, 'the ladder stays on the near side');
  // Eddie opens the gate, and he is locked into the party.
  assert.deepEqual(requiredFor('4.3'), ['eddie']);
  assert.ok(rosterFor('4.3').includes('eddie'));
  assert.ok(HERO_DEFS.eddie.utilities.includes('riff'));
});

test('stage 4.3: with mirror1 open nothing is boxed in, and every spawn, light and place is reachable', () => {
  const gates = new Set(['mirror1']);
  const open = flood(gates);
  const blocked = kit.blocked(gates);
  for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
    if (!blocked[idx(x, y)]) assert.equal(open[idx(x, y)], 1, `walkable tile ${x},${y} is cut off from the route`);
  }
  for (const s of [...enemies, ...items]) assert.equal(open[idx(s.tx, s.ty)], 1, `${s.id} at ${s.tx},${s.ty} is reachable`);
  for (const p of props.filter((q) => q.prop === 'lights')) assert.ok(rectTiles({ tx: p.tx - 1, ty: p.ty - 1, w: 5, h: 3 }).some(([x, y]) => open[idx(x, y)] === 1), `${p.id} has open ground next to it`);
  for (const place of Object.keys(PLACES)) assert.ok(rectTiles(PLACES[place] as TileRect).some(([x, y]) => open[idx(x, y)] === 1), `${place} is reachable`);
  // The clocks are solid for good: the lanes, the corner and the yard stay one place round them.
  for (const id of ['clock1', 'clock2', 'clock3']) assert.ok(blocked[idx(prop(id).tx, prop(id).ty)] === 1);
  // The roof's burrows are on the deck, spread over it.
  const b = S.burrows ?? [];
  assert.ok(b.length >= 6 && new Set(b.map((p) => `${p.tx},${p.ty}`)).size === b.length, `${b.length} burrows`);
  for (const p of b) assert.ok(inPlace('deck', p.tx, p.ty) && !solid(p.tx, p.ty), `the burrow at ${p.tx},${p.ty} is on the deck`);
  assert.ok(b.some((p) => p.tx <= 32) && b.some((p) => p.tx >= 43) && b.some((p) => p.ty <= 3) && b.some((p) => p.ty >= 10), 'at its ends and sides');
});

// ---------------------------------------------------------------- the puzzles
test('stage 4.3: four puzzles, each with Eddie, who has what the prop asks for, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['mirror', 'clock1', 'clock2', 'clock3']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['mirror_hint', 'clock1', 'clock2', 'clock3']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['mirror1', 'clock1', 'clock2', 'clock3']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['eddie', 'eddie', 'eddie', 'eddie']);
  assert.deepEqual(S.puzzles.map((p) => p.hint), ['MAYBE EDDIE SHOULD PLAY IT A RIFF', ...Array(3).fill('MAYBE EDDIE CAN SHATTER THE CLOCK')]);
  assert.ok(S.puzzles.every((p) => p.alt === undefined && p.blocks === undefined && p.enemy === undefined));
  const roster = rosterFor('4.3');
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    assert.ok(roster.includes(p.hero), `${p.id}: ${p.hero} can be in the party`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(prop(p.prop).hitBy ?? 'riff'), `${p.id}: ${p.hero} has what ${p.prop} asks for`);
  }
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-12.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: ${p.hint} names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint) && !hasEmDash(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-12.md`);
  }
});

test('stage 4.3: each clock\'s hint shows before the fourth chime, because the hint clock is shorter than three gaps between chimes', () => {
  assert.ok(HINT_AFTER < 3 * CHIME_FRAMES, `${HINT_AFTER} frames to a hint, ${3 * CHIME_FRAMES} to the fourth chime`);
  assert.ok(HINT_AFTER <= 2 * CHIME_FRAMES - 60, 'the hint is up by the second chime, with ten seconds left');
  for (const id of ['clock1', 'clock2', 'clock3']) {
    const clock = prop(id);
    const view: PropView = { id, kind: 'clock', x: clock.tx * 16, y: clock.ty * 16, w: 16, h: 32, state: 'closed', t: 0 };
    const tracker = createPuzzleTracker(S.puzzles);
    const near = { x: clock.tx * 16 - 24, y: clock.ty * 16 + 20 };
    const tick = (busy: boolean): void => tracker.tick({ hasFired: (b) => b === id, busy, props: [view], hero: near, party: ['mike', 'dustin', 'robin', 'eddie'] });
    for (let f = 0; f < 200; f++) tick(true);
    assert.equal(tracker.highlight(), null, `${id}: the dialogue holds the clock`);
    for (let f = 0; f < HINT_AFTER - 1; f++) tick(false);
    assert.equal(tracker.highlight(), null, `${id}: not a frame early`);
    tick(false);
    assert.equal(tracker.highlight()?.id, id);
    assert.equal(tracker.highlight()?.hero, 'eddie');
  }
});

// ---------------------------------------------------------------- the bot's route
test('stage 4.3: the waypoints are reachable in order, mirror1 is opened by flag inside the street\'s hint, and the route ends on the deck inside the roof beat', () => {
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
  assert.ok(fx >= 18 && fx <= 19 && fy > 25 && fy - 25 <= 7, 'mirror1 is opened from the road below it');
  assert.ok(S.waypoints.slice(0, flagged).some((w) => inRect(rectOf('mirror_hint'), ...tileOf(w.x, w.y))), 'after a waypoint inside the hint beat\'s tiles, so the hint fires before the open');
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(inRect(rectOf('roof'), lx, ly) && inPlace('deck', lx, ly), 'the last waypoint is on the deck, inside the roof beat');
  const route = botRoute(S, kit);
  assert.equal(route.missing, null, 'the bot finds a path between every pair of waypoints');
  const crossed = (id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => route.tiles.has(idx(x, y)));
  for (const id of ['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3', 'roof']) assert.ok(crossed(id), `the bot walks through ${id}`);
  assert.ok(S.waypoints.length >= 25, `${S.waypoints.length} waypoints`);
  // The route is the spec's: south-west to the street's east, the alley north, the cross street east, the lanes, the lot, the ladder.
  const place = S.waypoints.map((w) => placeOf(...tileOf(w.x, w.y)));
  const first = (p: string): number => place.indexOf(p);
  assert.ok(first('tear') < first('street') && first('street') < first('alley') && first('alley') < first('cross') && first('cross') < first('lanes') && first('lanes') < first('lot') && first('lot') < first('deck'));
});
