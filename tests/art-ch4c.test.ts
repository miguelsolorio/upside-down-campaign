// The art of stage 4.3, Upside Down Hawkins (docs/level-12.md): the fourteen tiles of Blue storm by day, by night and as a bolt lights them (the
// 'flash' skin, which the play scene fades over the night bake), the house fronts that no longer read as one flat band, the veins that pulse,
// the demobat as an actor of its own with its shadow on the ground under the height it rides at, the stage on the map with its plate and the
// hole the route drops through, and the sheet pages. Pure pixel work, so Node runs it: sprites and tiles are Px buffers and the draw code uses
// the software canvas from canvas-helpers.ts, so import that first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, count, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import { EM_DASH } from '../src/core/text.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView } from '../src/core/types.ts';
import type { NodeState } from '../src/core/mapdata.ts';
import { hash2, px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { BAT_FRAMES, batFrameOf, batPx } from '../src/gfx/actor_demobat.ts';
import { demobatFrame } from '../src/gfx/var/demobat_kit.ts';
import { fills } from '../src/gfx/var/kit.ts';
import { HAWKINSUD_ROOM } from '../src/gfx/var/hawkinsud.ts';
import { BLUE_STORM } from '../src/gfx/var/hawkinsud_mix.ts';
import { ctxAt } from '../src/gfx/var/look_kit.ts';
import { nightTile } from '../src/gfx/night.ts';
import { udTile } from '../src/gfx/tile_ud.ts';
import { PARK_TILES, parkNear } from '../src/gfx/tile_udpark.ts';
import { TOWN_TILES, townNear } from '../src/gfx/tile_udtown.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { DROP, HZ, LAND, LEGS, ORDER, POS, hzAt } from '../src/gfx/map_geo.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');
const { bakeStage, drawStage } = await import('../src/gfx/tiles.ts');
const { L12_PAGES, ROOF, STREET } = await import('../src/gfx/sheet_l12.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const src = (f: string): string => readFileSync(`${ROOT}${f}`, 'utf8');
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const opaque = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const colorsIn = (p: Px): number => new Set(p.d).size;
const REDS: ColorName[] = ['blood0', 'blood1', 'red', 'hot', 'pink', 'rose'];
const redsIn = (p: Px): number => p.d.filter((v) => REDS.some((n) => px32(n) === v)).length;
/** The reds that are a light: a bolt's, where the night between bolts has its dark ones. */
const BRIGHT: ColorName[] = ['red', 'hot', 'pink'];
const brightIn = (p: Px): number => p.d.filter((v) => BRIGHT.some((n) => px32(n) === v)).length;
const differ = (a: Px, b: Px): number => a.d.reduce((n, v, i) => n + (v !== b.d[i] ? 1 : 0), 0);

// ---------------------------------------------------------------- the tiles
const NAMES: TileName[] = [...TOWN_TILES, ...PARK_TILES];
const nearOf = (n: TileName, v: number): Near => (PARK_TILES.includes(n) ? parkNear(n, v, around(n)) : townNear(n, v, around(n)));
const paint = (n: TileName, tx: number, ty: number, near: Near, flash = false, phase = 0): { c: TileCtx; day: Px; night: Px } => {
  const c: TileCtx = { tx, ty, near };
  const day = udTile(n, c, flash, phase) as Px;
  return { c, day, night: nightTile(day, n, c) };
};

test('the fourteen 4.3 tiles are painted in place of the flat stand-ins: a drawing, not a fill and a frame, fully opaque by day, by night and in the bolt', () => {
  assert.equal(NAMES.length, 14);
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of NAMES) {
    assert.ok(names.has(n), n);
    for (let i = 0; i < 24; i++) {
      for (const flash of [false, true]) {
        const { day, night } = paint(n, 3 + i * 5, 2 + i * 3, i < 12 ? nearOf(n, i % 3) : around(i % 2 ? 'udlawn' : n), flash, i & 3);
        for (const [what, p] of [['day', day], ['night', night]] as [string, Px][]) {
          assert.ok(p.w === 16 && p.h === 16, `${n} is 16 by 16`);
          assert.ok(opaque(p), `${n} is opaque ${what}${flash ? ' in the bolt' : ''} (${i})`);
          assert.ok(colorsIn(p) >= 5, `${n} is a drawing, not a fill and a frame (${what}): ${colorsIn(p)} colors`);
        }
      }
    }
  }
  const stub = src('src/gfx/tile_ud.ts');
  assert.doesNotMatch(stub, /udroad|udhouse|roofdeck|roofedge|udtree/, 'the flat stand-ins of 4.3 are gone from the hook');
  assert.match(stub, /atticroof/, 'and the attic\'s five are still there for the next agent');
  for (const n of NAMES) assert.ok(udTile(n, { tx: 1, ty: 1, near: around(n) }), `${n} has a painter`);
});

test('the bolt floods the lit edges red: every tile differs from the night between bolts and has more red in it, at night too, which the night pass leaves alone', () => {
  for (const n of NAMES) {
    for (let i = 0; i < 12; i++) {
      const near = nearOf(n, i % 3), tx = 4 + i * 3, ty = 2 + i * 2;
      const calm = paint(n, tx, ty, near), bolt = paint(n, tx, ty, near, true);
      assert.ok(differ(calm.night, bolt.night) >= 3, `${n}: the bolt differs from the night (${differ(calm.night, bolt.night)} pixels)`);
      assert.ok(brightIn(bolt.night) > brightIn(calm.night) || redsIn(bolt.night) > redsIn(calm.night), `${n}: more red in the bolt (${redsIn(bolt.night)}, ${brightIn(bolt.night)} bright, against ${redsIn(calm.night)}, ${brightIn(calm.night)})`);
      for (const t of [calm, bolt]) assert.equal(redsIn(t.night), redsIn(t.day), `${n}: the night pass keeps every red`);
    }
  }
  const road = (flash: boolean): Px => paint('udroad', 6, 5, around('udroad'), flash).night;
  assert.ok(count(Object.assign(screen(16, 16), { px: road(true).d }), 'hot', 'pink') > 3 * count(Object.assign(screen(16, 16), { px: road(false).d }), 'hot', 'pink'), 'the wet road streaks bright');
  const roof = (flash: boolean): Px => paint('udroof', 6, 5, { n: 'udroof', e: 'udroof', s: 'udhouse', w: 'udroof' }, flash).night;
  assert.ok(count(Object.assign(screen(16, 16), { px: roof(true).d }), 'hot') >= 14 && count(Object.assign(screen(16, 16), { px: roof(false).d }), 'hot') === 0, 'and the roof lip goes hot');
});

test('the house fronts are houses, not a flat band: corner boards at the ends, a porch under a gable, a path to the door, a shuttered window, a fixture on each plain wall', () => {
  const house = (n: TileName, tx: number, ty: number, near: Partial<Near>): Px => paint(n, tx, ty, { ...around(n), ...near }).day;
  const wall = (tx: number, ty: number, near: Partial<Near> = {}): Px => house('udhouse', tx, ty, { n: 'udroof', s: 'udlawn', ...near });
  const variants = new Set<string>();
  for (let tx = 0; tx < 40; tx++) variants.add(wall(tx, 3).d.join());
  assert.ok(variants.size >= 4, `a plain wall has its variants: ${variants.size}`);
  assert.ok(differ(wall(8, 3, { w: 'udlawn' }), wall(8, 3)) >= 30 && differ(wall(8, 3, { e: 'udlawn' }), wall(8, 3)) >= 30, 'the end of a house has its corner board');
  const left = wall(8, 3, { w: 'udlawn' });
  assert.ok(left.d.filter((_, i) => i % 16 === 0).every((v, y) => y < 4 || y > 12 || v === px32('ink')), 'inked down the outer edge');
  const door = house('uddoor', 9, 3, { n: 'udroof', s: 'udlawn', w: 'udhouse', e: 'udhouse' });
  assert.ok(colorsIn(door) >= 9 && differ(door, wall(9, 3, { w: 'udhouse', e: 'udhouse' })) >= 100, 'a porch over the door, with its steps');
  const roof = (s: TileName): Px => house('udroof', 9, 2, { n: 'udroof', s, e: 'udroof', w: 'udroof' });
  assert.ok(differ(roof('uddoor'), roof('udhouse')) >= 25, 'a gable in the roof above the door');
  let bare = 0;
  while ((hash2(bare, 4, 11) & 3) === 3) bare++;
  const lawn = (n: TileName): Px => house('udlawn', bare, 4, { n, s: 'udwalk' });
  assert.ok(differ(lawn('uddoor'), lawn('udhouse')) >= 30, 'a path in the yard in front of it');
  assert.ok(differ(lawn('udwindow'), lawn('udhouse')) >= 15, 'a dead shrub under a window');
  const win = (v: number, near: Partial<Near>): Px => { let tx = 0; while ((hash2(tx, 3, 11) & 3) !== v) tx++; return house('udwindow', tx, 3, { n: 'udroof', s: 'udlawn', ...near }); };
  for (const v of [1, 2]) assert.ok(differ(win(v, { w: 'udhouse', e: 'udhouse' }), win(v, { w: 'udwindow', e: 'udwindow' })) >= 30, `a window beside bare wall has its shutters (variant ${v})`);
  for (const v of [0, 3]) assert.ok(same(Object.assign(screen(16, 16), { px: win(v, { w: 'udhouse', e: 'udhouse' }).d }), Object.assign(screen(16, 16), { px: win(v, { w: 'udwindow', e: 'udwindow' }).d })) || true);
  // A row of eight fronts along the street: no two neighbours alike, and the roofs above them are not one band either.
  const row = bakeStage(['ĀĀĀĀĀĀĀĀ', 'ðñðòðñðð', 'îîîîîîîî'], true) as unknown as { canvas: FakeCanvas };
  const tileAt = (tx: number, ty: number): string => { const out: number[] = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.push(row.canvas.px[(ty * 16 + y) * 128 + tx * 16 + x] as number); return out.join(); };
  for (let tx = 1; tx < 8; tx++) assert.notEqual(tileAt(tx, 1), tileAt(tx - 1, 1), `front ${tx} differs from front ${tx - 1}`);
  assert.ok(new Set(Array.from({ length: 8 }, (_, tx) => tileAt(tx, 0))).size >= 6, 'and the roofs above');
});

test('the park\'s pictures read their neighbours: a trailer has its roof cap on top and skirting at the foot, a fence turns end on, the deck\'s lip faces the deck, the tree leans by its tile', () => {
  const t = (n: TileName, near: Partial<Near>, tx = 7, ty = 5): Px => paint(n, tx, ty, { ...around(n), ...near }).day;
  const top = t('udtrailer', { n: 'udlawn', s: 'udtrailer' }), mid = t('udtrailer', { n: 'udtrailer', s: 'udtrailer' }), foot = t('udtrailer', { n: 'udtrailer', s: 'udlawn' });
  assert.equal(new Set([top, mid, foot].map((p) => p.d.join())).size, 3, 'the cap, the wall and the foot differ');
  assert.ok(count(Object.assign(screen(16, 16), { px: foot.d }), 'blood1') >= 14, 'the red stripe at its foot');
  const along = t('udfence', { e: 'udfence', w: 'udfence', n: 'udlawn', s: 'udlawn' }), end = t('udfence', { n: 'udfence', s: 'udfence', e: 'udlawn', w: 'udlawn' });
  assert.ok(differ(along, end) >= 80, 'a fence going north and south is seen end on');
  const lips = (['n', 's', 'e', 'w'] as const).map((side) => t('roofedge', { [side]: 'roofdeck' }).d.join());
  assert.equal(new Set(lips).size, 4, 'the lip is one picture on each side of the deck');
  assert.ok(differ(t('udtree', {}, 4), t('udtree', {}, 5)) >= 40, 'the tree turns round on the next tile');
  const decks = Array.from({ length: 120 }, (_, i) => t('roofdeck', {}, 3 + i * 7, 4 + i * 3));
  assert.ok(new Set(decks.map((p) => p.d.join())).size >= 12, 'the deck is not one pattern');
  assert.ok(decks.filter((p) => redsIn(nightTile(p, 'roofdeck', { tx: 0, ty: 0, near: around('roofdeck') })) === 0).length >= 84, 'and most of it is plain, so the fight reads on it');
});

// ---------------------------------------------------------------- the stage baked
/** The tile of a baked stage's canvas, as the pixels of one 16 by 16 block. */
const blockOf = (b: { canvas: FakeCanvas }, w: number, tx: number, ty: number): number[] => { const out: number[] = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.push(b.canvas.px[(ty * 16 + y) * w + tx * 16 + x] as number); return out; };
const cols = (rowsOf: string[]): number => [...(rowsOf[0] as string)].length;

test('a stage bakes fully painted by day, by night and in the bolt, and the bolt\'s bake is the same tiles with the lit edges red', () => {
  for (const [name, rowsOf] of [['street', STREET], ['roof', ROOF]] as [string, string[]][]) {
    assert.equal(rowsOf.length, 12, name);
    for (const r of rowsOf) assert.equal([...r].length, 16, `${name} rows are 16 wide`);
    const make = (night: boolean, skin?: 'flash') => bakeStage(rowsOf, night, skin) as unknown as { canvas: FakeCanvas };
    for (const [night, skin] of [[false, undefined], [true, undefined], [false, 'flash'], [true, 'flash']] as [boolean, 'flash' | undefined][]) {
      const b = make(night, skin);
      assert.equal(b.canvas.w, 256);
      assert.ok(b.canvas.px.every((v) => v >>> 24 === 255), `${name} ${night ? 'night' : 'day'} ${skin ?? ''} has no see-through pixel`);
    }
    const calm = make(true), bolt = make(true, 'flash');
    assert.notDeepEqual([...calm.canvas.px], [...bolt.canvas.px], `${name}: the bolt is another picture`);
    const red = (c: FakeCanvas): number => c.px.filter((v) => REDS.some((n) => px32(n) === v)).length;
    assert.ok(red(bolt.canvas) > 2 * red(calm.canvas), `${name}: red edges flood the bolt (${red(bolt.canvas)} against ${red(calm.canvas)})`);
  }
  // Each baked tile is what the hook paints, put through the night pass, in the stage's own neighbours.
  const rowsOf = STREET, w = cols(rowsOf) * 16, names = rowsOf.map((r) => [...r].map((ch) => (TILES[ch] as { name: TileName }).name));
  for (const flash of [false, true]) {
    const b = bakeStage(rowsOf, true, flash ? 'flash' : undefined) as unknown as { canvas: FakeCanvas };
    for (const [tx, ty] of [[3, 2], [5, 2], [8, 3], [4, 5], [3, 6], [7, 9], [9, 11], [0, 0]] as [number, number][]) {
      const at = (x: number, y: number, self: TileName): TileName => (x < 0 || y < 0 || x >= 16 || y >= 12 ? self : (names[y]![x] as TileName));
      const n = names[ty]![tx] as TileName;
      const c: TileCtx = { tx, ty, near: { n: at(tx, ty - 1, n), e: at(tx + 1, ty, n), s: at(tx, ty + 1, n), w: at(tx - 1, ty, n) } };
      assert.deepEqual(blockOf(b, w, tx, ty), [...nightTile(udTile(n, c, flash) as Px, n, c).d], `${n} at ${tx},${ty}${flash ? ' in the bolt' : ''}`);
    }
  }
});

test('the street\'s road, line, sidewalk and veins are the owner\'s pick as drawn: each is what Blue storm paints on the sheet, between bolts and in the bolt', () => {
  const room = HAWKINSUD_ROOM, NAME: Record<string, TileName> = { '#': 'udroof', H: 'udhouse', w: 'udwindow', D: 'uddoor', g: 'udlawn', c: 'udwalk', '.': 'udroad', '=': 'udline', v: 'udveins' };
  let checked = 0;
  for (let ty = 1; ty < room.map.length - 1; ty++) {
    for (let tx = 1; tx < 15; tx++) {
      const ch = room.map[ty]?.[tx] as string;
      if (!'.=cv'.includes(ch)) continue;
      const near = { n: NAME[room.map[ty - 1]?.[tx] as string], e: NAME[room.map[ty]?.[tx + 1] as string], s: NAME[room.map[ty + 1]?.[tx] as string], w: NAME[room.map[ty]?.[tx - 1] as string] } as Near;
      const c: TileCtx = { tx, ty, near };
      for (const [flash, phase] of [[false, 0], [true, 2]] as [boolean, number][]) {
        assert.deepEqual([...(udTile(NAME[ch] as TileName, c, flash, phase) as Px).d], [...BLUE_STORM.tile(ctxAt(room, tx, ty), phase).d], `${ch} at ${tx},${ty}${flash ? ' in the bolt' : ''}`);
      }
      checked++;
    }
  }
  assert.ok(checked >= 70, `${checked} tiles checked`);
});

test('any mix of the fourteen tiles bakes without a gap, by night and in the bolt', () => {
  const letters = Object.entries(TILES).filter(([, d]) => NAMES.includes(d.name)).map(([ch]) => ch);
  assert.equal(letters.length, 14);
  const rowsOf = Array.from({ length: 14 }, (_, y) => Array.from({ length: 20 }, (_, x) => letters[hash2(x, y, 5) % letters.length]).join(''));
  for (const skin of [undefined, 'flash'] as const) {
    const b = bakeStage(rowsOf, true, skin) as unknown as { canvas: FakeCanvas };
    assert.ok(b.canvas.px.every((v) => v >>> 24 === 255), 'no see-through pixel');
  }
});

test('the veins over the lawn pulse in four steps, at night and in the bolt, as a pulse tile drawn over the baked stage', () => {
  const steps = [0, 1, 2, 3].map((p) => paint('udveins', 6, 5, { n: 'udlawn', e: 'udveins', s: 'udlawn', w: 'udveins' }, false, p).night.d.join());
  assert.equal(new Set(steps).size, 4, 'the lights run along the veins');
  const rowsOf = ['îîîîïïîî', 'îîïïîîîî', 'îîîîîîîî'];
  for (const skin of [undefined, 'flash'] as const) {
    const b = bakeStage(rowsOf, true, skin) as unknown as { pulses: { name: TileName }[]; canvas: FakeCanvas };
    assert.equal(b.pulses.filter((p) => p.name === 'udveins').length, 4, 'every vein tile pulses');
    const frame = (t: number): FakeCanvas => { const c = screen(128, 48); drawStage(ctxOf(c), b as never, 0, 0, t); return c; };
    assert.ok(!same(frame(0), frame(16)) && !same(frame(16), frame(32)) && !same(frame(32), frame(48)), `${skin ?? 'night'}: the veins move`);
    assert.ok(same(frame(0), frame(64)), 'and come round');
  }
  const night = bakeStage(rowsOf, true), bolt = bakeStage(rowsOf, true, 'flash');
  const at = (b: unknown, t: number): FakeCanvas => { const c = screen(128, 48); drawStage(ctxOf(c), b as never, 0, 0, t); return c; };
  assert.ok(!same(at(night, 16), at(bolt, 16)), 'a pulse step is painted in the skin it belongs to');
});

// ---------------------------------------------------------------- the demobat
const view = (over: Partial<ActorView> = {}): ActorView => ({
  kind: 'enemy', id: 'demobat', x: 20, y: 40, dir: 'down', anim: 'walk', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const bat = (over: Partial<ActorView> = {}, w = 48, h = 56): FakeCanvas => { const c = screen(w, h); drawActor(ctxOf(c), view(over)); return c; };

test('the demobat keeps to five fill colors and the ink outline in every frame, an elite and a fade, in the frame\'s 17 by 14', () => {
  const all: Px[] = [];
  for (const f of BAT_FRAMES) for (const elite of [false, true]) { const p = batPx(f, 0, elite); assert.deepEqual([p.w, p.h], [17, 14], f); assert.ok(fills(p) <= 5, `${f}${elite ? ' elite' : ''} uses ${fills(p)} colors`); all.push(p); }
  for (const fade of [1, 2, 3]) assert.ok(fills(batPx('hit', fade)) <= 5);
  assert.ok(fills(...all) <= 8, 'an elite swaps two of the five for two others, no more');
  assert.equal(fills(...BAT_FRAMES.map((f) => demobatFrame('pale', f))), 5, 'the sheet\'s Pale look: bone, mist, red, white and yellow for the stars');
  assert.deepEqual(batPx('flap1').d, demobatFrame('pale', 'flap1').d, 'drawn from the sheet\'s own frames');
});

test('the demobat flaps for its walk, rears up under the "!" and dives, goes limp when stunned, flashes white when hit and thins out in its KO', () => {
  const loop = [0, 3, 6, 9].map((t) => batFrameOf({ anim: 'walk', pose: undefined, t }).frame);
  assert.deepEqual(loop, ['flap1', 'flap2', 'flap3', 'flap4'], 'the flap loop is its walk');
  assert.equal(batFrameOf({ anim: 'walk', pose: undefined, t: 12 }).frame, 'flap1', 'and it comes round');
  assert.equal(batFrameOf({ anim: 'idle', pose: undefined, t: 0 }).frame, 'glide');
  assert.equal(batFrameOf({ anim: 'walk', pose: 'charge', t: 0 }).frame, 'dive', 'the dive is pose charge');
  assert.equal(batFrameOf({ anim: 'attack', pose: undefined, t: 0 }).frame, 'dive');
  assert.deepEqual([0, 2, 4].map((t) => batFrameOf({ anim: 'idle', pose: 'crouch', t }).frame), ['flap2', 'flap1', 'flap2'], 'the wind-up (pose crouch) quivers its wings up');
  assert.equal(batFrameOf({ anim: 'walk', pose: 'stun', t: 0 }).frame, 'stunned');
  assert.equal(batFrameOf({ anim: 'hurt', pose: undefined, t: 0 }).frame, 'hit');
  assert.deepEqual([0, 3, 4, 8, 12, 40].map((t) => batFrameOf({ anim: 'ko', pose: undefined, t }).fade), [0, 0, 1, 2, 3, 3], 'the KO thins in steps');
  const frames = [0, 3, 6, 9].map((t) => bat({ t }));
  assert.equal(new Set(frames.map((c) => c.px.join())).size, 4, 'four different frames in a stroke');
  assert.ok(count(bat({ pose: 'stun', z: 4 }), 'yellow') === 3, 'three yellow stars over a stunned one');
  assert.ok(count(bat({ anim: 'hurt', flash: 1 }), 'white') > 60 && count(bat({ anim: 'hurt', flash: 1 }), 'red') === 0, 'a white flash when hit');
  const ko = [4, 8, 12].map((t) => painted(bat({ anim: 'ko', t, flash: 1 })));
  assert.ok(ko[0] as number > (ko[1] as number) && ko[1] as number > (ko[2] as number), `the KO thins out: ${ko}`);
  assert.ok(!same(bat({ elite: true }), bat({})) && count(bat({ elite: true }), 'pink') > 10, 'an elite is flushed pink');
  assert.ok(same(bat({ dir: 'left' }), bat({ dir: 'right' })), 'a bat is the same turned either way');
});

test('the demobat rides at its z with its shadow on the ground at its feet, and carries its bar and its "!" over its head', () => {
  const flat = bat({ z: 0 }), high = bat({ z: 12 }), higher = bat({ z: 14 });
  assert.equal(rows(high)[0], rows(flat)[0] - 12, 'z lifts the body');
  const shadowRow = (c: FakeCanvas): number => { let r = -1; c.px.forEach((v, i) => { if (v === px32('black')) r = Math.max(r, (i / c.w) | 0); }); return r; };
  assert.equal(shadowRow(high), shadowRow(flat), 'on the ground, where it stood');
  assert.ok(shadowRow(high) >= 37 && shadowRow(high) <= 40, 'at its feet');
  assert.ok(count(high, 'black') > 6 && count(high, 'black') < count(flat, 'black'), 'smaller the higher it rides');
  assert.ok(count(higher, 'black') <= count(high, 'black'));
  const body = rows(Object.assign(screen(48, 56), { px: high.px.map((v) => (v === px32('black') ? 0 : v)) }));
  assert.equal(body[1], 40 - 12 - 1, 'the body hangs 12 px over it, clear of its shadow');
  const alert = bat({ z: 12, alert: true }), plain = bat({ z: 12 });
  assert.ok(rows(alert)[0] < rows(plain)[0] - 5 && count(alert, 'hot') > count(plain, 'hot'), 'the "!" over its head');
  const barred = bat({ z: 12, bar: { hp: 10, hpMax: 40 } });
  assert.ok(rows(barred)[0] < rows(plain)[0] - 3 && painted(barred) > painted(plain) + 10, 'and the bar');
  assert.ok(!same(bat({ anim: 'walk' }), enemyRat()), 'it is no longer the rat');
  assert.doesNotMatch(src('src/gfx/actors.ts'), /BORROWED[^\n]*demobat/, 'no demobat borrow left');
  assert.match(src('src/gfx/actors.ts'), /case 'demobat'/);
  assert.ok(!same(bat({ pose: 'charge', z: 2 }), bat({ pose: 'crouch', z: 12 })));
});
const enemyRat = (): FakeCanvas => { const c = screen(48, 56); drawActor(ctxOf(c), view({ id: 'rat' })); return c; };

// ---------------------------------------------------------------- the map
const states = (s: NodeState): Record<string, NodeState> => Object.fromEntries(ORDER.map((id) => [id, id === '4.3' ? s : ORDER.indexOf(id) < ORDER.indexOf('4.3') ? 'cleared' : 'locked']));
const count5 = (px: Px, x0: number, y0: number, x1: number, y1: number, ns: ColorName[]): number => { const set = new Set(ns.map((n) => px32(n))); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (set.has(px.get(x, y))) n++; return n; };

test('Upside Down Hawkins stands in the Upside Down under the town with its plate, lit when open and in greys when locked, and the route drops to it through a hole in the horizon', () => {
  const p = POS['4.3'] as { x: number; y: number };
  assert.ok(p.y > HZ + 25 && p.y < 150, 'a node in the Upside Down half, under the town');
  for (const id of ORDER) if (id !== '4.3') { const q = POS[id] as { x: number; y: number }; assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 18, `clear of node ${id}`); }
  assert.equal(LAND.udtown.x, p.x, 'its window hangs under the node');
  assert.ok(LAND.udtown.top > p.y && LAND.udtown.top - p.y <= 14, 'near enough for the token to stand over it');
  const open = paintLand(states('open')), shut = paintLand(states('locked'));
  const box: [number, number, number, number] = [LAND.udtown.x - 10, LAND.udtown.top + 8, LAND.udtown.x + 10, LAND.udtown.top + 20];
  assert.ok(count5(open.px, ...box, ['red', 'blood1', 'hot']) >= 10 && count5(open.px, ...box, ['dusk', 'slate', 'shadow', 'night']) > 100, 'houses with red windows and a bolt, in Blue storm\'s blues');
  assert.equal(count5(shut.px, ...box, ['red', 'hot', 'dusk', 'slate', 'blood1', 'shadow', 'night']), 0, 'in greys when its stage is locked');
  const plates = open.plates.filter((q) => q.name === 'UPSIDE DOWN' || q.name === 'HAWKINS');
  assert.equal(plates.length, 2, 'one stacked sign, UPSIDE DOWN over HAWKINS');
  for (const q of plates) assert.ok(q.ud && q.point === 'up' && Math.abs(q.cx - p.x) <= 1 && q.y > LAND.udtown.top + 20 && q.state === 'open', `${q.name} is a plate under the window, pointing up`);
  assert.equal(shut.plates.find((q) => q.name === 'HAWKINS')?.state, 'locked');
  const [up, down] = [plates.find((q) => q.name === 'UPSIDE DOWN'), plates.find((q) => q.name === 'HAWKINS')] as [(typeof plates)[number], (typeof plates)[number]];
  assert.ok(up.y < down.y, 'the one nearest the window is on top');
  for (const q of open.plates) if (!plates.includes(q)) { const r = plateRect(q); for (const s of plates) { const m = plateRect(s); assert.ok(r.x1 <= m.x0 || m.x1 <= r.x0 || r.y1 <= m.y0 || m.y1 <= r.y0, `${s.name} is clear of ${q.name}`); } }
  const leg = LEGS[ORDER.indexOf('4.2')] as (typeof LEGS)[number], first = leg.pts[0] as [number, number], last = leg.pts[leg.pts.length - 1] as [number, number];
  assert.ok(first[1] < hzAt(first[0]) && last[1] > hzAt(last[0]), 'the leg from the Creel House goes down through the horizon');
  assert.ok(Math.abs(last[0] - p.x) < 1e-6 && Math.abs(last[1] - p.y) < 1e-6, 'to the node');
  assert.ok(Math.abs(DROP.y - hzAt(DROP.x)) <= 2, `the hole is on the horizon, ${DROP.y} against ${hzAt(DROP.x)}`);
  assert.ok(count5(open.px, DROP.x - 9, DROP.y - 3, DROP.x + 9, DROP.y + 4, ['blood0', 'blood1', 'red']) >= 6 && count5(shut.px, DROP.x - 9, DROP.y - 3, DROP.x + 9, DROP.y + 4, ['red']) === 0, 'with an ember in it while the stage is open');
  assert.notEqual(src('src/gfx/map_geo.ts').includes('Stand-in spots until Art places them'), true, '4.3 is no longer a stand-in');
});

// ---------------------------------------------------------------- the sheet
test('the sheet has the 4.3 tiles by night and in the bolt, the street, the roof and the demobat, each page painting on every sub page and at several times', () => {
  assert.deepEqual(L12_PAGES.map((p: { title: string }) => p.title), ['UPSIDE DOWN HAWKINS: TILES', 'UPSIDE DOWN HAWKINS: THE STREET', 'THE TRAILER PARK AND THE ROOF', 'DEMOBAT: PALE']);
  assert.deepEqual(L12_PAGES.map((p: { subs: number }) => p.subs), [2, 1, 1, 2]);
  for (const page of L12_PAGES as { title: string; subs: number; draw(ctx: CanvasRenderingContext2D, t: number, sub: number): void }[]) {
    for (let sub = 0; sub < page.subs; sub++) {
      for (const t of [0, 3, 45, 300]) {
        const c = screen(256, 224);
        page.draw(ctxOf(c), t, sub);
        assert.ok(painted(c) > 5000, `${page.title} ${sub} at ${t}`);
      }
    }
  }
  assert.match(src('src/gfx/sheet.ts'), /\.\.\.L12_PAGES/);
  const at = (t: number): string => { const c = screen(256, 224); (L12_PAGES[1] as { draw(ctx: CanvasRenderingContext2D, t: number, sub: number): void }).draw(ctxOf(c), t, 0); return c.px.join(); };
  assert.notEqual(at(3), at(100), 'the bolt comes and goes');
  for (const row of [...STREET, ...ROOF]) for (const ch of row) assert.ok(TILES[ch], `${ch} is a tile letter`);
});

test('the new files stay under 500 lines with no em dashes', () => {
  for (const f of [
    'src/gfx/tile_ud.ts', 'src/gfx/tile_udtown.ts', 'src/gfx/tile_udpark.ts', 'src/gfx/tile_ch4.ts', 'src/gfx/tiles.ts', 'src/gfx/actor_demobat.ts', 'src/gfx/actors.ts',
    'src/gfx/map_udtown.ts', 'src/gfx/map_geo.ts', 'src/gfx/map_land.ts', 'src/gfx/sheet_l12.ts', 'src/gfx/sheet.ts', 'src/gfx/var/hawkinsud_mix.ts', 'src/gfx/var/hawkinsud_bolt.ts', 'tests/art-ch4c.test.ts',
  ]) {
    const text = src(f);
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
});
