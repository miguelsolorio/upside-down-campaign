// Stage 2.2, the tunnels, as data: the map and its rooms, the budget, the four gates in route order, each gate's hero, the
// checkpoints, the beats and the 11 scripts, and the bot's route. The real sim, the hints and the headless runs of the bot are in
// stage22-play.test.ts.
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
import { L5_SCRIPTS } from '../src/story/scripts_l5.ts';
import { STAGE_22 as S, ROWS, WAVES } from '../src/world/stages/stage22.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import { fakeEnv, propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, items, props, npcs, flood, startTx, startTy } = kit;
const GAPS = ['gap1', 'gap2', 'gap3'];
/** Gaps count as crossable (Max's dash gets over them) and crack1 as broken. */
const ALL = new Set([...GAPS, 'crack1']);
/** The route's way across, with crack1 still shut: what the bot walks. */
const ROUTE = new Set(GAPS);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
const ROOMS: Record<string, TileRect> = {
  drop: { tx: 2, ty: 3, w: 10, h: 7 }, nest: { tx: 24, ty: 11, w: 12, h: 10 }, junction: { tx: 37, ty: 12, w: 6, h: 7 },
  cache: { tx: 37, ty: 5, w: 7, h: 6 }, hub: { tx: 18, ty: 30, w: 29, h: 8 }, west: { tx: 4, ty: 22, w: 6, h: 10 }, bulge: { tx: 19, ty: 24, w: 10, h: 4 },
};
const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
const share = (room: string, chars: string): number => rectTiles(ROOMS[room] as TileRect).filter(([x, y]) => chars.includes(ch(x, y))).length / (ROOMS[room] as TileRect).w / (ROOMS[room] as TileRect).h;
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
const BEAT_IDS = ['start', 'crew', 'gap_hint', 'gap_crossed', 'nest', 'crack_hint', 'crack_open', 'dart', 'hub', 'ambush', 'level_clear'];
const SCRIPT_IDS = ['l5_start', 'l5_crew', 'l5_gap_hint', 'l5_gap_done', 'l5_nest', 'l5_crack_hint', 'l5_crack_done', 'l5_dart', 'l5_hub', 'l5_ambush', 'l5_clear'];

// ---------------------------------------------------------------- the map
test('stage 2.2: the map is 48 by 40, uses only legend characters, is solid all round and runs at night with the upside theme', () => {
  assert.equal(S.rows, ROWS);
  assert.equal(S.rows.length, 40);
  for (const [y, row] of S.rows.entries()) {
    assert.equal(row.length, 48, `row ${y} is ${row.length} wide`);
    for (const c of row) assert.ok(TILES[c], `unknown tile '${c}' in row ${y}`);
  }
  assert.deepEqual([grid.w, grid.h], [48, 40]);
  for (let x = 0; x < grid.w; x++) assert.ok(solid(x, 0) && solid(x, grid.h - 1), `the top and bottom edges are solid at ${x}`);
  for (let y = 0; y < grid.h; y++) assert.ok(solid(0, y) && solid(grid.w - 1, y), `the left and right edges are solid at ${y}`);
  assert.deepEqual([S.id, S.name, S.time, S.music], ['2.2', 'The tunnels', 'night', 'upside']);
  assert.ok((S.enemyMult ?? 1) >= 1 && (S.enemyMult ?? 1) <= 1.6, `enemyMult ${S.enemyMult}`);
  assert.deepEqual(WAVES, ['amb1', 'amb2', 'amb3']);
  assert.deepEqual(S.waves, WAVES);
  const used = new Set(S.rows.join(''));
  for (const c of '1234567') assert.ok(used.has(c), `the map uses the 2.2 tile '${c}'`);
  assert.ok(![...used].some((c) => !'1234567'.includes(c)), 'and nothing but the seven tunnel tiles');
});

test('stage 2.2: the walls are a cap row over a wall row facing the floor, and the growth thickens from the drop to the hub', () => {
  for (const [y, row] of S.rows.entries()) {
    for (const [x, c] of [...row].entries()) {
      if (c === '3') {
        assert.ok(!solid(x, y + 1), `the wall face at ${x},${y} looks onto floor`);
        assert.ok(solid(x, y - 1), `and has a cap above it`);
      }
      if (c === '2' && y + 1 < grid.h) assert.ok(solid(x, y + 1) || ch(x, y + 1) === '6', `a cap at ${x},${y} sits on rock, not floor`);
      if (!solid(x, y) && y > 0 && ch(x, y - 1) !== '6') assert.ok(solid(x, y - 1) === false || ch(x, y - 1) === '3', `floor at ${x},${y} has a wall face or floor above it`);
    }
  }
  assert.equal(share('drop', '5'), 0, 'plain roots at the drop, no veins');
  assert.ok(share('drop', '4') >= 0.3, 'roots at the drop');
  assert.ok(share('nest', '5') > 0.15 && share('nest', '6') > 0.3, 'veins and nest tiles all round in the nest');
  assert.ok(share('hub', '5') > share('nest', '5') && share('hub', '5') > 0.3, 'veins everywhere in the hub');
  assert.ok(share('cache', '5') > 0, 'veins in the cache');
  assert.ok(rectTiles({ tx: 45, ty: 36, w: 2, h: 2 }).every(([x, y]) => ch(x, y) === '7'), 'the ladder fills the hub\'s far corner');
  assert.equal(S.rows.join('').split('7').length - 1, 4);
});

test('stage 2.2: the lights are the shaft at the drop and the vein clusters, each on open floor, and the three strings', () => {
  assert.ok(S.lights.length >= 12, `${S.lights.length} pools`);
  const [shaft, ...veins] = S.lights;
  assert.ok(shaft && inRoom('drop', Math.floor(shaft.x / 16), Math.floor(shaft.y / 16)) && shaft.r >= 56, 'the shaft is in the drop and wide');
  for (const l of veins) {
    const tx = Math.floor(l.x / 16), ty = Math.floor(l.y / 16);
    assert.ok(!solid(tx, ty), `the light at ${tx},${ty} is on open floor`);
    const near = rectTiles({ tx: tx - 3, ty: ty - 3, w: 7, h: 7 }).some(([x, y]) => ch(x, y) === '5');
    assert.ok(near, `the light at ${tx},${ty} has veins within three tiles`);
    assert.ok(l.r >= 24 && l.r <= 56);
  }
  assert.deepEqual(props.filter((p) => p.prop === 'lights').map((p) => p.id), ['lights_drop', 'lights_nest', 'lights_hub']);
  assert.deepEqual(S.checkpoints.map((c) => c.prop), ['lights_drop', 'lights_nest', 'lights_hub']);
  const open = flood(ROUTE);
  const trig = rectTiles(rectOf('ambush'));
  for (const c of S.checkpoints) {
    const [x, y] = tileOf(c.x, c.y);
    const p = prop(c.prop);
    assert.equal(at(open, x, y), 1, `${c.prop}'s checkpoint is walkable`);
    assert.ok(Math.hypot(p.tx + 1 - x, p.ty - y) < 4, `${c.prop} stands close to its lights`);
    assert.ok(!trig.some(([u, v]) => u === x && v === y), `${c.prop} is outside the ambush trigger, so a retry does not wake it at once`);
    for (const [u, v] of propTiles(p)) assert.equal(solid(u, v), false, `${c.prop} stands on open ground`);
  }
  const [dx, dy] = tileOf(S.checkpoints[0]?.x ?? 0, S.checkpoints[0]?.y ?? 0);
  assert.ok(Math.hypot(dx - startTx, dy - startTy) < 6, 'lights_drop is at the start');
});

// ---------------------------------------------------------------- spawns
test('stage 2.2: the start and every spawn, item and patrol point is on open ground, ids are unique, and the start is quiet', () => {
  assert.equal(solid(startTx, startTy), false, 'start tile');
  assert.ok(inRoom('drop', startTx, startTy), 'the level begins in the drop');
  for (const s of [...enemies, ...items, ...npcs]) assert.equal(solid(s.tx, s.ty), false, `${s.kind} ${s.id} at ${s.tx},${s.ty}`);
  for (const e of enemies) for (const p of e.patrol ?? []) assert.equal(solid(p.tx, p.ty), false, `${e.id} patrols through ${p.tx},${p.ty}`);
  for (const p of props) for (const [x, y] of propTiles(p)) assert.equal(solid(x, y), false, `${p.id} stands on open ground at ${x},${y}`);
  const ids = [...enemies, ...items, ...props, ...npcs].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'spawn ids are unique across enemies, items, props and npcs');
  assert.equal(S.spawns.length, ids.length);
  for (const e of enemies) assert.ok(Math.hypot(e.tx - startTx, e.ty - startTy) > 7, `${e.id} is too close to the start`);
  for (const [x, y] of rectTiles(ROOMS.drop as TileRect)) assert.ok(!enemies.some((e) => e.tx === x && e.ty === y), 'nothing hostile in the drop');
  const taken = new Set([...enemies, ...items].map((s) => `${s.tx},${s.ty}`));
  assert.equal(taken.size, enemies.length + items.length, 'nothing shares a tile');
});

test('stage 2.2: the roster is worth 130 to 170 XP, in the groups the spec names, with the waves asleep in the hub', () => {
  const xp = enemies.reduce((sum, e) => sum + xpOf(e), 0);
  assert.ok(xp >= 130 && xp <= 170, `stage XP ${xp}`);
  assert.equal(xp, 166);
  const kind = (k: string): number => enemies.filter((e) => e.type === k).length;
  assert.deepEqual([kind('demodog'), kind('vine'), kind('pod'), kind('rat')], [14, 2, 4, 0]);
  assert.equal(enemies.filter((e) => e.tier === 'elite').length, 2, 'two elites');
  const groups = (g: string): typeof enemies => enemies.filter((e) => e.group === g);
  assert.deepEqual(['halls', 'nest', 'hall2', 'hall3', 'amb1', 'amb2', 'amb3'].map((g) => groups(g).length), [3, 5, 2, 2, 2, 3, 3]);
  assert.equal(enemies.length, 20);
  assert.deepEqual(groups('halls').map((e) => e.type).sort(), ['demodog', 'demodog', 'vine']);
  assert.deepEqual(groups('nest').map((e) => e.type).sort(), ['pod', 'pod', 'pod', 'pod', 'vine']);
  assert.ok(groups('nest').every((e) => inRoom('nest', e.tx, e.ty)), 'the pods and the vine are rooted in the nest');
  assert.ok(groups('hall2').every((e) => e.type === 'demodog' && inRoom('bulge', e.tx, e.ty)), 'a pack in the long hall\'s bulge');
  assert.ok(groups('hall3').every((e) => e.type === 'demodog' && inRoom('west', e.tx, e.ty)) && groups('hall3').some((e) => e.tier === 'elite'), 'a pack with an elite in the west chamber');
  for (const g of WAVES) assert.ok(groups(g).every((e) => e.type === 'demodog' && e.dormant && inRoom('hub', e.tx, e.ty)), `${g} sleeps in the hub`);
  assert.ok(groups('amb3').some((e) => e.tier === 'elite'), 'an elite in the last wave');
  assert.ok(enemies.filter((e) => !WAVES.includes(e.group)).every((e) => !e.dormant && !e.hidden), 'everything before the hub is awake');
  const wake = rectTiles(rectOf('ambush'));
  for (const e of WAVES.flatMap((g) => groups(g))) assert.ok(!wake.some(([x, y]) => x === e.tx && y === e.ty), `${e.id} waits outside the trigger, past the last barrier`);
  const k = (n: string): number => items.filter((i) => i.item === n).length;
  assert.deepEqual([k('eggo'), k('coke'), k('quarter')], [3, 2, 12]);
  const cache = items.filter((i) => inRoom('cache', i.tx, i.ty));
  assert.ok(cache.some((i) => i.item === 'eggo') && cache.some((i) => i.item === 'coke') && cache.filter((i) => i.item === 'quarter').length >= 3, 'an Eggo, a Coke and some quarters in the cache');
});

// ---------------------------------------------------------------- the gates
test('stage 2.2: each gap fills its hall wall to wall, one tile deep, and crack1 fills the dead end\'s mouth', () => {
  const gap = (id: string): Prop => prop(id);
  for (const id of GAPS) {
    const g = gap(id);
    assert.deepEqual([g.prop, g.hitBy, g.solid], ['gap', 'dash', true], id);
    const eastWest = g.w === 16;
    assert.deepEqual([g.w, g.h], eastWest ? [16, 32] : [32, 16], `${id} is one tile deep across a hall two tiles wide`);
    assert.equal(propTiles(g).length, 2);
    for (const [x, y] of propTiles(g)) {
      assert.equal(solid(x, y), false, `${id} stands on floor`);
      assert.equal(ch(x, y), '1', `${id} stands on plain floor`);
      // The hall runs along one axis: both sides of it are rock, and open floor lies before and after the drop.
      const side = eastWest ? [[x, y - 1], [x, y + 1]] : [[x - 1, y], [x + 1, y]];
      const along = eastWest ? [[x - 1, y], [x + 1, y]] : [[x, y - 1], [x, y + 1]];
      const [lo, hi] = [propTiles(g)[0] as [number, number], propTiles(g).at(-1) as [number, number]];
      const out = side.filter(([u, v]) => !propTiles(g).some(([a, b]) => a === u && b === v));
      assert.ok(out.every(([u, v]) => solid(u as number, v as number)), `${id} fills the hall wall to wall at ${x},${y}`);
      assert.ok(along.every(([u, v]) => propTiles(g).some(([a, b]) => a === u && b === v) || !solid(u as number, v as number)), `${id} has floor before and after it`);
      assert.ok(lo && hi);
    }
  }
  assert.deepEqual(GAPS.map((id) => [gap(id).w, gap(id).h]), [[16, 32], [32, 16], [16, 32]], 'gap2 is the one across the hall that runs south');
  const crack = prop('crack1');
  assert.deepEqual([crack.prop, crack.hitBy, crack.w, crack.h, crack.solid], ['crack', 'smash', 32, 16, true]);
  assert.ok(solid(crack.tx - 1, crack.ty) && solid(crack.tx + 2, crack.ty), 'crack1 fills the dead end\'s mouth wall to wall');
  assert.ok(propTiles(crack).every(([x, y]) => !solid(x, y)), 'with floor under it, so breaking it leaves a way in');
  assert.ok(inRoom('cache', crack.tx, crack.ty - 1) && inRoom('junction', crack.tx, crack.ty + 1), 'the cache above it, the junction below');
});

// ---------------------------------------------------------------- reachability
test('stage 2.2: the route runs to the hub when gaps count as crossable and gates as open, and each gap and the crack cut it in order', () => {
  const reach = (open: string[], x: number, y: number): number => at(flood(new Set(open)), x, y);
  const spots: [string, number, number][] = [
    ['the root halls', 8, 13], ['the nest', 30, 13], ['the junction', 40, 14], ['the east hall below gap2', 44, 21], ['the west chamber', 7, 28], ['the hub', 28, 34], ['the ladder', 45, 36],
  ];
  assert.equal(reach([], startTx, startTy), 1);
  assert.equal(reach([], 8, 13), 1, 'the root halls are open at the start');
  assert.equal(reach([], 30, 13), 0, 'gap1 cuts the stage');
  assert.equal(reach(['gap2', 'gap3'], 30, 13), 0, 'the later gaps do nothing before the first');
  assert.equal(reach(['gap1'], 30, 13), 1);
  assert.equal(reach(['gap1'], 44, 22), 0, 'gap2 is next');
  assert.equal(reach(['gap1', 'gap2'], 44, 22), 1);
  assert.equal(reach(['gap1', 'gap2'], 28, 34), 0, 'and gap3 holds the way west to the hub');
  assert.equal(reach(['gap1', 'gap3'], 28, 34), 0, 'gap3 does not stand in for gap2');
  for (const [name, x, y] of spots) assert.equal(reach([...GAPS], x, y), 1, `${name} is reachable`);
  const cache = rectTiles(ROOMS.cache as TileRect);
  assert.ok(cache.every(([x, y]) => at(flood(ROUTE), x, y) === 0), 'the cache is shut until crack1 is broken');
  assert.ok(cache.every(([x, y]) => at(flood(ALL), x, y) === 1 || solid(x, y) || ch(x, y) === '6'), 'and open after');
});

test('stage 2.2: with every gap and gate open nothing is boxed in, and every spawn and light string is reachable', () => {
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

test('stage 2.2: nothing worth a detour lies across a drop from the route, where the bot would walk into it', () => {
  // The bot walks to an Eggo, a Coke or a quarter within its reach without checking the way, and a gap is a wall to it.
  const reach: Record<string, number> = { eggo: 124, coke: 104, quarter: 44 };
  const open = new Set<string>();
  for (const id of GAPS) {
    const before = flood(open);
    const after = flood(new Set([...open, id]));
    const near: [number, number][] = [];
    for (let i = 0; i < before.length; i++) if (before[i]) near.push([i % grid.w, (i / grid.w) | 0]);
    for (const it of items.filter((q) => after[idx(q.tx, q.ty)] && !before[idx(q.tx, q.ty)])) {
      const d = Math.min(...near.map(([x, y]) => Math.hypot(x - it.tx, y - it.ty) * 16));
      // Only the shut side counts: the straight line to it is through the drop.
      assert.ok(d > (reach[it.item] as number) || Math.hypot(it.tx - prop(id).tx, it.ty - prop(id).ty) > 9, `${it.id} is ${d.toFixed(0)} px from the route on the near side of ${id}`);
    }
    open.add(id);
  }
});

// ---------------------------------------------------------------- the puzzles
test('stage 2.2: two puzzles, in route order, each with its hero in the party, and the hints are the spec\'s', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['gap', 'crack']);
  assert.deepEqual(S.puzzles.map((p) => p.beat), ['gap_hint', 'crack_hint']);
  assert.deepEqual(S.puzzles.map((p) => p.prop), ['gap1', 'crack1']);
  assert.deepEqual(S.puzzles.map((p) => p.hero), ['max', 'steve']);
  assert.ok(S.puzzles.every((p) => p.enemy === undefined));
  assert.deepEqual(rosterFor('2.2'), ['mike', 'dustin', 'lucas', 'will', 'max', 'steve']);
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const target = prop(p.prop);
    const need = target.hitBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    // Of the heroes who can play the stage, exactly one can do it, and it is the one the hint names.
    assert.deepEqual(rosterFor('2.2').filter((h) => HERO_DEFS[h].utilities.includes(need as never)), [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
  assert.ok(!S.puzzles.some((p) => p.prop === 'gap2' || p.prop === 'gap3'), 'only gap1 has a puzzle: the first one teaches it');
  const cols = Math.floor((256 - 16) / 6);
  const doc = readFileSync(new URL('../docs/level-5.md', import.meta.url), 'utf8');
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is over one subtitle row`);
    assert.equal(p.hint, p.hint.toUpperCase());
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!/[0-9]/.test(p.hint) && !/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no key digits, no banned words');
    assert.ok(doc.includes(p.hint), `${p.id}: the hint is the one in docs/level-5.md`);
  }
});

// ---------------------------------------------------------------- beats and scripts
test('stage 2.2: every beat has a trigger and a real script, in the spec\'s order, and the rect beats sit behind the right gaps', () => {
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
  assert.deepEqual(when('gap_crossed'), { event: 'propCleared', prop: 'gap1' });
  assert.deepEqual(when('crack_open'), { event: 'propCleared', prop: 'crack1' });
  assert.deepEqual(when('level_clear'), { cleared: 'amb3' });
  assert.deepEqual(S.beats.find((b) => b.id === 'ambush')?.steps, [{ t: 'say', script: 'l5_ambush' }, { t: 'waves' }]);
  assert.deepEqual(S.beats.find((b) => b.id === 'level_clear')?.steps, [{ t: 'say', script: 'l5_clear' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'music' && st.t !== 'scare' && st.t !== 'open')), 'no music change, no scare, no gate opened by a beat');
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  const behind: [string, string[], string[]][] = [['nest', ['gap1'], []], ['crack_hint', ['gap1'], []], ['dart', ['gap1', 'gap2'], ['gap1']], ['hub', GAPS, ['gap1', 'gap2']], ['ambush', GAPS, ['gap1', 'gap2']]];
  for (const id of ['start', 'crew', 'gap_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const [id, needed, fewer] of behind) {
    assert.ok(through(needed, id), `${id} is reachable once ${needed.join(', ')} is open`);
    assert.ok(!through(fewer, id), `${id} is not reachable with only ${fewer.join(', ') || 'nothing'} open`);
  }
  assert.ok(rectOf('start').tx <= startTx && startTx < rectOf('start').tx + rectOf('start').w && rectOf('start').ty <= startTy, 'the start beat covers the start');
  const hint = rectOf('gap_hint');
  const g1 = prop('gap1');
  assert.ok(hint.tx + hint.w <= g1.tx && hint.ty <= g1.ty && g1.ty < hint.ty + hint.h + 1, 'the gap hint stands on the near side of gap1');
  const cr = rectOf('crack_hint');
  assert.ok(cr.ty + cr.h <= prop('crack1').ty + 3 && cr.ty > prop('crack1').ty, 'the crack hint stands in the junction, in front of crack1');
});

test('director: the beats run in route order, and the three waves chain to the finish', () => {
  const { env, log } = fakeEnv({ amb1: 2, amb2: 3, amb3: 3 }, ['mike', 'dustin', 'max', 'steve']);
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l5_start'], 'a rect beat fires once');
  for (const [id, script] of [['crew', 'l5_crew'], ['gap_hint', 'l5_gap_hint']] as const) assert.deepEqual(run(() => tick(id)), [`say ${script}`], id);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'gap1' }])), ['say l5_gap_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'gap2' }])), [], 'gap2 and gap3 say nothing');
  for (const [id, script] of [['nest', 'l5_nest'], ['crack_hint', 'l5_crack_hint']] as const) assert.deepEqual(run(() => tick(id)), [`say ${script}`], id);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crack1' }])), ['say l5_crack_done']);
  for (const [id, script] of [['dart', 'l5_dart'], ['hub', 'l5_hub']] as const) assert.deepEqual(run(() => tick(id)), [`say ${script}`], id);
  assert.deepEqual(run(() => tick('ambush')), ['say l5_ambush', 'wake amb1']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb1' }])), ['wake amb2']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb2' }])), ['wake amb3']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb3' }])), ['say l5_clear', 'finish']);
  assert.ok(d.finished());
});

test('stage 2.2: the 11 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to their voices', () => {
  const doc = readFileSync(new URL('../docs/level-5.md', import.meta.url), 'utf8');
  const listed = [...(/^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '').split('. ')[0]?.matchAll(/`([a-z0-9_]+)`/g) ?? []].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the eleven');
  assert.deepEqual(L5_SCRIPTS.map((s) => s.id).sort(), [...SCRIPT_IDS].sort());
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l5_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l5 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L5_SCRIPTS) {
        assert.ok(s.lines.length >= 2 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
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
  const all = L5_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  assert.ok(all.some((l) => l.who === 'max') && all.some((l) => l.who === 'steve'), 'Max and Steve speak');
  const max = all.filter((l) => l.who === 'max');
  assert.ok(max.length >= 6 && max.every((l) => l.text.length <= 70), 'Max has short lines');
  assert.ok(all.filter((l) => l.who === 'steve').some((l) => /behind me/i.test(l.text)), 'Steve says it');
  assert.ok(who('l5_crew').has('steve') && who('l5_crew').has('max'), 'Steve takes charge and Max will not be told');
  assert.ok(all.every((l) => l.who !== 'eleven' && l.who !== 'joyce'), 'neither Eleven nor Joyce is here');
  assert.ok(!all.some((l) => /eleven|\b(gone|died|vanish|disappear)\b|dead(?! end)|where she/i.test(l.text)), 'nobody names Eleven or says where she is');
  assert.ok(!all.some((l) => /\{swapTo\d\}/.test(l.text)), 'no line names a swap slot: the party is picked on the map');
  assert.match(text('l5_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l5_gap_hint'), /\{special\}/, 'the dash is the special');
  assert.match(text('l5_gap_hint'), /dash/i);
  assert.match(text('l5_crack_hint'), /\{attack\}/, 'the nail bat is the basic');
  assert.match(text('l5_ambush'), /\{burst\}/, 'the ambush teaches the party burst');
  assert.match(text('l5_nest'), /pods?/i);
  assert.match(text('l5_clear'), /Lab/);
  assert.match(text('l5_clear'), /Gate/);
  assert.match(text('l5_dart'), /Dart/, 'Dart is named');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
});

// ---------------------------------------------------------------- the bot's route
test('stage 2.2: the waypoints are reachable in order, the three dashes sit three tiles short of their gaps, and the last is in the ambush', () => {
  const open = new Set<string>();
  const dashes: number[] = [];
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(open)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once the gaps before it are crossed`);
    assert.equal(w.open, undefined, 'the bot opens nothing by flag');
    assert.equal(w.wake, undefined, 'and wakes nothing: the ambush wakes itself');
    if (w.dash) {
      dashes.push(i);
      const gap = GAPS[open.size] as string;
      open.add(gap);
      // In line with the next waypoint, so the roll runs straight, and the gap lies between them.
      const [nx, ny] = tileOf(S.waypoints[i + 1]?.x ?? 0, S.waypoints[i + 1]?.y ?? 0);
      const g = prop(gap);
      const along = g.w === 16 ? 'x' : 'y';
      assert.equal(along === 'x' ? ny : nx, along === 'x' ? y : x, `${gap}: the next waypoint is straight across`);
      const [a, b, gt] = along === 'x' ? [x, nx, g.tx] : [y, ny, g.ty];
      assert.ok(Math.min(a, b) < gt && gt < Math.max(a, b), `${gap} lies between its waypoints`);
      assert.ok(Math.abs(a - gt) >= 2 && Math.abs(a - gt) <= 3, `${gap}: the dash waypoint is two or three tiles short, not ${Math.abs(a - gt)}`);
      // Open floor for the whole roll, a gap aside: 72 px is four and a half tiles.
      const dir = Math.sign(b - a);
      for (let k = 1; k <= 5; k++) {
        const tx = along === 'x' ? a + dir * k : x, ty = along === 'x' ? y : a + dir * k;
        const onGap = propTiles(g).some(([u, v]) => u === tx && v === ty);
        assert.ok(onGap || !solid(tx, ty), `${gap}: the roll's ${k}th tile is clear`);
      }
    }
  });
  assert.deepEqual(dashes.length, 3, 'one dash waypoint for each gap');
  assert.equal(open.size, 3);
  const [lx, ly] = tileOf(S.waypoints.at(-1)?.x ?? 0, S.waypoints.at(-1)?.y ?? 0);
  assert.ok(rectTiles(rectOf('ambush')).some(([x, y]) => x === lx && y === ly), 'the last waypoint is inside the ambush trigger');
  const cache = ROOMS.cache as TileRect;
  assert.ok(S.waypoints.every((w) => !rectTiles(cache).some(([x, y]) => [x, y].join() === tileOf(w.x, w.y).join())), 'the route skips the cache');
  assert.ok(S.waypoints.length >= 40, `${S.waypoints.length} waypoints`);
});
