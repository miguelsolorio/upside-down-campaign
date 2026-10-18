// The stage 2.1 art: 13 tiles, the arcade cabinet and the hidden path, the demodog, vine, pod and Max, Will's bolt, the reveal
// shimmer and the map's land. Pure pixel work, so Node runs it: tiles and sprites are Px buffers, the effects draw through a
// recording stand-in for a canvas, and the map's land is one Px.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, FxKind, FxView } from '../src/core/types.ts';
import type { NodeState } from '../src/core/mapdata.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { PAL } from '../src/gfx/palette.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { litWindow, nightTile } from '../src/gfx/night.ts';
import { PATCH_TILES } from '../src/gfx/tile_town.ts';
import { arcadeArt, arcadeLook, hiddenArt } from '../src/gfx/props_town.ts';
import { CABINET_GAMES } from '../src/arcade/cabinets.ts';
import { DOG_H, DOG_W, composeDog, dogSpec } from '../src/gfx/actor_dog.ts';
import type { DogPose } from '../src/gfx/actor_dog.ts';
import { POD_STAGES, PLANT, composeBurst, composePod, composeVine, lashFrame, vineSpec } from '../src/gfx/actor_plant.ts';
import { composeFrame } from '../src/gfx/actor_pose.ts';
import { MAX } from '../src/gfx/data/max.ts';
import { PORTRAITS } from '../src/gfx/data/portraits.ts';
import { drawFx } from '../src/gfx/fx.ts';
import { paintLand } from '../src/gfx/map_land.ts';
import { BAND_Y, HZ, LAND, LEGS, ORDER, POS, SCREEN_H, SCREEN_W, TOP_H, hzAt } from '../src/gfx/map_geo.ts';

const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const paint = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const colors = (px: Px): Set<number> => new Set([...px.d].filter((v) => v !== 0));
const opaque = (px: Px): boolean => px.d.every((v) => v >>> 24 === 255);
const count = (px: Px, names: ColorName[]): number => { const s = new Set(names.map((n) => px32(n))); return px.d.reduce((n, v) => n + (s.has(v) ? 1 : 0), 0); };
const set5 = (...names: ColorName[]): Set<number> => new Set(names.map((n) => px32(n)));

// ---------------------------------------------------------------- tiles
test('stage 2.1 has thirteen tiles, arcadecarpet to hole, and every one is in the legend', () => {
  assert.equal(PATCH_TILES.length, 13);
  assert.equal(PATCH_TILES[0], 'arcadecarpet');
  assert.equal(PATCH_TILES[12], 'hole');
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of PATCH_TILES) assert.ok(names.has(n), n);
});

test('every 2.1 tile paints a fully opaque 16 by 16, is not a placeholder, and has a night version', () => {
  for (const name of PATCH_TILES) {
    let differs = false;
    for (let i = 0; i < 6; i++) {
      const near = i % 3 === 0 ? around(name) : i % 3 === 1 ? { n: 'grass' as TileName, e: name, s: 'dirt' as TileName, w: name } : { n: name, e: 'rot' as TileName, s: name, w: 'furrow' as TileName };
      const c = ctxAt(3 + i * 5, 2 + i * 3, near);
      const day = paint(name, c);
      assert.ok(day, `${name} paints`);
      assert.equal(day.w, 16, name);
      assert.equal(day.h, 16, name);
      assert.ok(opaque(day), `${name} is opaque`);
      assert.ok(colors(day).size >= 3, `${name} is more than a fill and a frame: ${colors(day).size} colors`);
      const night = nightTile(day, name, c);
      assert.ok(opaque(night), `${name} is opaque at night`);
      if (night.d.some((v, k) => v !== day.d[k])) differs = true;
      assert.ok(!litWindow(day, name), `${name} has no lit window`);
    }
    assert.ok(differs, `${name} has a night version that differs from the day one (the dark pit may match at its middle)`);
  }
});

test('floors you walk on come from the ground painter and the solid tiles from the object painter', () => {
  const ground: TileName[] = ['arcadecarpet', 'sidewalk', 'furrow', 'rot', 'hole'];
  for (const n of PATCH_TILES) {
    assert.equal(groundTile(n, ctxAt(4, 4, around(n))) !== null, ground.includes(n), n);
    assert.equal(TILES[Object.keys(TILES).find((k) => TILES[k]?.name === n) as string]?.solid, !ground.includes(n), `${n} solid or not`);
  }
});

test('streets, fields and halls do not look stamped: tiles vary from one position to the next', () => {
  for (const name of PATCH_TILES) {
    const seen = new Set<string>();
    for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(name, ctxAt(tx, ty, around(name))).d.join());
    assert.ok(seen.size >= 12, `${name}: ${seen.size} different tiles out of 64`);
  }
});

test('the tiles are the right stuff: neon on dark carpet, orange pumpkins, red barn, green and dead corn, red veins in the rot', () => {
  assert.ok(count(paint('arcadecarpet', ctxAt(7, 7, around('arcadecarpet'))), ['magenta', 'cyan', 'yellow', 'sky', 'pink']) >= 8, 'neon confetti');
  assert.ok(count(paint('pumpkin', ctxAt(7, 7, around('pumpkin'))), ['orange']) >= 40, 'a pumpkin is orange');
  assert.ok(count(paint('rotpumpkin', ctxAt(7, 7, around('rotpumpkin'))), ['orange']) === 0, 'a rotten one is not');
  assert.ok(count(paint('rotpumpkin', ctxAt(7, 7, around('rotpumpkin'))), ['blood1', 'red']) >= 6, 'with veins in it');
  assert.ok(count(paint('barnwall', ctxAt(7, 7, { n: 'barnwall', e: 'barnwall', s: 'dirt', w: 'barnwall' })), ['red']) >= 100, 'a red barn');
  let green = 0, dead = 0;
  for (let tx = 0; tx < 30; tx++) { const c = paint('corn', ctxAt(tx * 2, 3, around('corn'))); if (count(c, ['pine2', 'pine3']) > 20) green++; else dead++; }
  assert.ok(green >= 5 && dead >= 2, `${green} green and ${dead} dead or ripe`);
  assert.ok(count(paint('corn', ctxAt(8, 8, { n: 'corn', e: 'hole', s: 'corn', w: 'corn' })), ['pine2', 'pine3']) === 0, 'corn by the hole is dead');
  assert.ok(count(paint('rot', ctxAt(7, 7, around('rot'))), ['blood1', 'red']) >= 20, 'veins');
  assert.ok(count(paint('furrow', ctxAt(7, 7, { n: 'furrow', e: 'rot', s: 'furrow', w: 'furrow' })), ['blood1', 'soil0']) > count(paint('furrow', ctxAt(7, 7, around('furrow'))), ['blood1', 'soil0']), 'rot creeps into a furrow beside it');
});

test('the hole is a pit: black at the middle of a big one, with an earth rim, and neighbouring hole tiles join', () => {
  const lone = paint('hole', ctxAt(5, 5, around('rot')));
  assert.ok(lone.get(8, 8) !== px32('soil2') && count(lone, ['ink', 'black', 'blood0']) >= 60, `a dark middle: ${count(lone, ['ink', 'black', 'blood0'])} px`);
  assert.ok(count(lone, ['soil1', 'soil2']) >= 30, 'a rim');
  const mid = paint('hole', ctxAt(5, 5, around('hole')));
  assert.ok(count(mid, ['soil1', 'soil2']) === 0, 'no rim inside a big pit');
  const a = paint('hole', ctxAt(5, 5, { n: 'rot', e: 'hole', s: 'hole', w: 'rot' }));
  for (let y = 5; y < 16; y++) assert.equal(a.get(15, y) === px32('soil1') || a.get(15, y) === px32('soil2'), false, 'no rim on the joined edge');
});

// ---------------------------------------------------------------- props
test('the arcade cabinet is 16 by 24 and its look is the same every time', () => {
  for (let body = 0; body < 5; body++) {
    const p = arcadeArt(body);
    assert.equal(p.w, 16);
    assert.equal(p.h, 24);
    assert.ok(p.d.filter((v) => v !== 0).length > 200, 'a cabinet, not a few specks');
    assert.equal(p.get(5, 8), px32('black'), 'the screen is left black for the live part');
  }
  assert.deepEqual(arcadeLook('a1'), arcadeLook('a1'));
  assert.equal(arcadeLook('digdug').digdug, true);
  assert.equal(arcadeLook('a1').digdug, false);
  // Each of 2.1's cabinets shows the game it plays.
  for (const [id, game] of Object.entries(CABINET_GAMES)) assert.equal(arcadeLook(id).game, game, id);
  const looks = new Set(['a1', 'a2', 'b3', 'cab4', 'x5', 'y6', 'palace7', 'q8'].map((id) => `${arcadeLook(id).body}${arcadeLook(id).game}`));
  assert.ok(looks.size >= 4, `${looks.size} different cabinets from eight ids`);
});

test('the hidden path is a corn wall until it opens, then a dark gap between parted stalks', () => {
  const closed = hiddenArt(16, 32, 12, 1, false, 0), open = hiddenArt(16, 32, 12, 1, true, 8);
  assert.equal(closed.w, 16);
  assert.equal(closed.h, 32);
  assert.ok(closed.d.every((v) => v !== 0) && open.d.every((v) => v !== 0), 'both fill the 16 by 32');
  assert.ok(count(closed, ['pine2', 'pine3', 'sand', 'soil3', 'yellow', 'amber']) > 60, 'corn');
  assert.ok(count(open, ['soil0', 'pine0']) > count(closed, ['soil0', 'pine0']) + 60, 'a dark gap opens');
  const half = hiddenArt(16, 32, 12, 1, true, 3);
  assert.ok(count(half, ['soil0', 'pine0']) < count(open, ['soil0', 'pine0']), 'it widens as it opens');
  assert.deepEqual(hiddenArt(16, 32, 12, 1, true, 8).d, open.d, 'and is the same every time');
});

// ---------------------------------------------------------------- actors
const DOG_COLORS = set5('ink', 'grey2', 'grey3', 'bone', 'red');
const POSES: DogPose[] = ['stand', 'stepA', 'stepB', 'crouch', 'lunge', 'hurt', 'lying'];
const bounds = (px: Px): { x0: number; x1: number; y0: number; y1: number } => {
  let x0 = px.w, x1 = -1, y0 = px.h, y1 = -1;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (px.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
};

test('every demodog pose and facing is drawn: 24 by 20, five colors, no alpha, standing on the bottom', () => {
  for (const view of ['side', 'down', 'up'] as const) {
    for (const pose of POSES) {
      for (const f of [0, 1]) {
        for (const open of [false, true]) {
          const p = composeDog(view, pose, f, open);
          assert.equal(p.w, DOG_W);
          assert.equal(p.h, DOG_H);
          assert.ok(p.d.every((v) => v === 0 || v >>> 24 === 255), `${view} ${pose}: no alpha`);
          assert.ok([...colors(p)].every((v) => DOG_COLORS.has(v)), `${view} ${pose}: only the five colors`);
          assert.ok(p.d.filter((v) => v !== 0).length > 90, `${view} ${pose}: drawn`);
          if (pose !== 'lunge' && pose !== 'lying') assert.ok(bounds(p).y1 >= DOG_H - 2, `${view} ${pose} stands on the ground`);
        }
      }
    }
  }
  const b = bounds(composeDog('side', 'stand', 0, false));
  assert.ok(b.x1 - b.x0 + 1 >= 18 && b.y1 - b.y0 + 1 <= 19, 'low and long: wider than tall, smaller than the Demogorgon');
});

test('a demodog has a red petal mouth only when it lunges, and a faceless head otherwise', () => {
  const red = px32('red');
  for (const view of ['side', 'down'] as const) {
    assert.ok(!colors(composeDog(view, 'stand', 0, false)).has(red), `${view}: no red at rest`);
    assert.ok(colors(composeDog(view, 'lunge', 0, true)).has(red), `${view}: red when it lunges`);
  }
  assert.equal(dogSpec({ dir: 'right', anim: 'dash', alert: false, t: 0 }).open, true);
  assert.equal(dogSpec({ dir: 'right', anim: 'attack', alert: true, t: 0 }).open, false);
});

test('the sim picks the demodog frame: walk, wind-up under the alert, lunge, recover, hurt, ko', () => {
  const v = (over: Partial<Pick<ActorView, 'dir' | 'anim' | 'alert' | 't'>>): Pick<ActorView, 'dir' | 'anim' | 'alert' | 't'> => ({ dir: 'down', anim: 'walk', alert: false, t: 0, ...over });
  assert.equal(dogSpec(v({ anim: 'walk', t: 0 })).pose, 'stepA');
  assert.equal(dogSpec(v({ anim: 'walk', t: 12 })).pose, 'stepB');
  assert.equal(dogSpec(v({ anim: 'attack', alert: true })).pose, 'crouch');
  assert.equal(dogSpec(v({ anim: 'dash' })).pose, 'lunge');
  assert.equal(dogSpec(v({ anim: 'idle' })).pose, 'stand');
  assert.equal(dogSpec(v({ anim: 'hurt' })).pose, 'hurt');
  assert.equal(dogSpec(v({ anim: 'ko' })).pose, 'lying');
  assert.equal(dogSpec(v({ dir: 'left' })).flip, true);
  assert.notDeepEqual(composeDog('side', 'crouch', 0, false).d, composeDog('side', 'crouch', 1, false).d, 'the wind-up shakes');
});

test('the vine coils, rears, lashes, hurts and wilts, in five colors on a 16 by 16 cell', () => {
  const allowed = set5('ink', 'blood0', 'blood1', 'red', 'hot');
  for (const view of ['down', 'up', 'side'] as const) {
    for (const pose of ['coil', 'rear', 'lash', 'hurt', 'wilt'] as const) {
      const p = composeVine(view, pose, 0);
      assert.equal(p.w, PLANT);
      assert.equal(p.h, PLANT);
      assert.ok([...colors(p)].every((c) => allowed.has(c)), `${view} ${pose}: ${[...colors(p)].length} colors`);
      assert.ok(p.d.filter((c) => c !== 0).length > 40);
    }
  }
  const tall = (px: Px): number => bounds(px).y1 - bounds(px).y0;
  assert.ok(tall(composeVine('side', 'rear', 0)) >= tall(composeVine('side', 'coil', 0)), 'it rears up');
  assert.ok(tall(composeVine('side', 'wilt', 0)) < tall(composeVine('side', 'coil', 0)) - 3, 'and wilts low');
  assert.equal(vineSpec({ dir: 'right', anim: 'attack', alert: true, t: 4 }).pose, 'rear');
  assert.equal(vineSpec({ dir: 'right', anim: 'attack', alert: false, t: 34 }).pose, 'lash');
  assert.equal(vineSpec({ dir: 'right', anim: 'ko', alert: false, t: 0 }).pose, 'wilt');
  assert.equal(lashFrame({ anim: 'attack', alert: true, t: 20, hidden: false }), -1, 'no whip while it winds up');
  assert.equal(lashFrame({ anim: 'attack', alert: false, t: 33, hidden: false }), 3, 'a whip once the lash lands');
  assert.equal(lashFrame({ anim: 'idle', alert: false, t: 33, hidden: false }), -1);
});

test('the pod swells wider and taller through its stages, shakes when taut, then bursts into shards and a husk', () => {
  const allowed = set5('ink', 'blood0', 'blood1', 'red', 'hot');
  let last = 0;
  for (let s = 0; s < POD_STAGES; s++) {
    const p = composePod(s, 0), b = bounds(p);
    assert.equal(p.w, PLANT);
    assert.ok([...colors(p)].every((c) => allowed.has(c)), `stage ${s}`);
    const area = p.d.filter((v) => v !== 0).length;
    assert.ok(area >= last, `stage ${s} is not smaller than the one before`);
    last = area;
    assert.ok(b.y1 - b.y0 >= 4);
  }
  const rest = composePod(0, 0), taut = composePod(POD_STAGES - 1, 0);
  assert.ok(taut.d.filter((v) => v !== 0).length > rest.d.filter((v) => v !== 0).length * 1.5, 'taut is much bigger than at rest');
  assert.notDeepEqual(composePod(6, 1).d, composePod(6, -1).d, 'it trembles');
  const shards = composeBurst(2), husk = composeBurst(12);
  assert.ok(colors(shards).has(px32('pink')), 'spores in the burst');
  assert.ok(husk.d.filter((v) => v !== 0).length < taut.d.filter((v) => v !== 0).length, 'a husk is low');
  assert.ok([...colors(composeBurst(1))].length <= 5 && [...colors(husk)].length <= 5, 'five colors');
});

test('Max has her own sprite: red hair, a skateboard, all four ways and every anim, and her own portrait', () => {
  assert.equal(MAX.id, 'max');
  assert.equal(MAX.pal.h, 'orange');
  for (const view of ['down', 'up', 'side'] as const) {
    for (const [anim, frames] of [['idle', 2], ['walk', 4], ['attack', 2], ['hurt', 1], ['ko', 1]] as const) {
      for (let f = 0; f < frames; f++) {
        const buf = composeFrame(MAX, view, anim, f);
        assert.equal(buf.length, 256);
        assert.ok(buf.some((v) => v === 'h'.charCodeAt(0)) || anim === 'ko', `${view} ${anim}: red hair shows`);
      }
    }
  }
  const board = composeFrame(MAX, 'down', 'idle', 0);
  assert.ok(board.some((v) => v === 'x'.charCodeAt(0)) && board.some((v) => v === 'g'.charCodeAt(0)), 'a board with wheels at her side');
  assert.notEqual(PORTRAITS.max, PORTRAITS.will, 'her portrait is no longer Will\'s');
  assert.equal(PORTRAITS.max.pal.h, 'orange');
  assert.notEqual(PORTRAITS.max.bg, PORTRAITS.will.bg);
});

// ---------------------------------------------------------------- effects
/** A stand-in for a canvas context that records every filled pixel. */
function recorder(): { ctx: never; pixels: Map<string, string>; names: Set<string> } {
  const pixels = new Map<string, string>();
  const byHex = new Map<string, string>(Object.entries(PAL).map(([k, v]) => [v, k]));
  const names = new Set<string>();
  const ctx = {
    fillStyle: '#000000',
    fillRect(x: number, y: number, w: number, h: number): void {
      const name = byHex.get(this.fillStyle) ?? this.fillStyle;
      names.add(name);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pixels.set(`${x + i},${y + j}`, name);
    },
  };
  return { ctx: ctx as never, pixels, names };
}
const fxView = (kind: FxKind, t: number, life: number, angle = 0, w = 8, h = 8): FxView => ({ kind, x: 100, y: 100, dir: 'right', angle, t, life, w, h });
const extent = (pixels: Map<string, string>): number => {
  let r = 0;
  for (const k of pixels.keys()) { const [x, y] = k.split(',').map(Number) as [number, number]; r = Math.max(r, Math.hypot(x - 100, y - 100)); }
  return r;
};

test('the bolt is a small chalk star that turns and trails dots, in every heading', () => {
  const sizes: number[] = [];
  for (let k = 0; k < 8; k++) {
    const r = recorder();
    drawFx(r.ctx, fxView('bolt', 4, 160, (k * Math.PI) / 4));
    assert.ok(r.pixels.size >= 12 && r.pixels.size <= 70, `a small star: ${r.pixels.size} px`);
    assert.ok(r.names.has('white') && r.names.has('bone'), 'chalk white and bone');
    sizes.push(extent(r.pixels));
  }
  assert.ok(Math.max(...sizes) <= 16, `it stays small: ${Math.max(...sizes).toFixed(1)}`);
  const plus = recorder(), cross = recorder();
  drawFx(plus.ctx, fxView('bolt', 0, 160));
  drawFx(cross.ctx, fxView('bolt', 8, 160));
  assert.notDeepEqual([...plus.pixels.keys()].sort(), [...cross.pixels.keys()].sort(), 'it turns from a plus to an x');
});

test('the reveal is a shimmer over the prop that sweeps down it and fades out', () => {
  const start = recorder(), mid = recorder(), end = recorder();
  drawFx(start.ctx, fxView('reveal', 2, 40, 0, 16, 32));
  drawFx(mid.ctx, fxView('reveal', 20, 40, 0, 16, 32));
  drawFx(end.ctx, fxView('reveal', 39, 40, 0, 16, 32));
  for (const r of [start, mid]) {
    assert.ok(r.pixels.size > 30, `${r.pixels.size} px`);
    for (const k of r.pixels.keys()) { const [x, y] = k.split(',').map(Number) as [number, number]; assert.ok(x >= 92 && x < 108 && y >= 80 && y < 116, `over the prop: ${k}`); }
    assert.ok([...r.names].every((n) => ['white', 'cyan', 'sky'].includes(n)), `light colors: ${[...r.names].join()}`);
  }
  assert.ok(end.pixels.size < mid.pixels.size, 'it fades');
  assert.notDeepEqual([...start.pixels.keys()].sort(), [...mid.pixels.keys()].sort(), 'the band moves');
});

// ---------------------------------------------------------------- the map
/** The states of the first nodes; the rest of the map (chapter 3) is locked. */
const states = (...s: NodeState[]): Record<string, NodeState> => Object.fromEntries(ORDER.map((id, i) => [id, s[i] ?? 'locked']));
const SCHOOLED = states('cleared', 'cleared', 'cleared', 'open', 'locked', 'locked');
const FRESH = states('open', 'locked', 'locked', 'locked', 'locked', 'locked');
const rows = (px: Px, y0: number, y1: number, names: ColorName[]): number => {
  const s = set5(...names);
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < SCREEN_W; x++) if (s.has(px.get(x, y))) n++;
  return n;
};

test('the land of the map is the whole 256 by 224 screen, opaque, and the same every time', () => {
  const a = paintLand(SCHOOLED).px, b = paintLand(SCHOOLED).px;
  assert.equal(a.w, SCREEN_W);
  assert.equal(a.h, SCREEN_H);
  assert.ok(opaque(a), 'no see-through pixels');
  assert.deepEqual(a.d, b.d);
});

test('below the horizon the same land hangs in the Upside Down palette: no sky, no green, only ink, purple and blood', () => {
  const land = paintLand(SCHOOLED).px;
  assert.ok(rows(land, TOP_H, 30, ['blue', 'sky']) > 1500, 'Hawkins has its sky');
  assert.ok(rows(land, 40, HZ - 6, ['pine2', 'pine3', 'leaf']) > 2500, 'and its green');
  assert.equal(rows(land, HZ + 8, BAND_Y, ['blue', 'sky', 'cream', 'leaf', 'pine2', 'pine3', 'pine1', 'pine0', 'orange', 'amber']), 0);
  assert.ok(rows(land, HZ + 8, BAND_Y, ['ink', 'night', 'purple0', 'purple', 'blood0', 'blood1']) > 0.85 * 256 * (BAND_Y - HZ - 8));
});

test('a locked place is dimmed to greys and an open one keeps its colors', () => {
  const open = paintLand(states('cleared', 'cleared', 'cleared', 'open', 'locked', 'locked')).px, locked = paintLand(FRESH).px;
  // The school's brick: red-brown when its stage is open, grey when locked. The patch's pumpkins likewise.
  const brick = ['soil2', 'soil1', 'blood1', 'blood0'], pumpkins = ['orange', 'red', 'amber'];
  const sch = (px: Px): number => { let n = 0; for (let y = 52; y < 79; y++) for (let x = 135; x < 165; x++) if (set5(...brick).has(px.get(x, y))) n++; return n; };
  assert.ok(sch(open) > 150, `the open school has its bricks: ${sch(open)}`);
  assert.ok(sch(locked) < 20, `the locked school does not: ${sch(locked)}`);
  assert.ok(rows(open, 70, 98, pumpkins) > 40 && rows(locked, 70, 98, pumpkins) === 0, 'pumpkins in color or not at all');
  assert.ok(count(locked, ['pine1', 'pine2', 'pine3']) > 4000, 'the woods are still green');
});

test('Starcourt Mall, the food court and the base\'s bunker are drawn, in color when their stage is open and in greys when it is locked', () => {
  const some = (px: Px, x0: number, y0: number, x1: number, y1: number, names: ColorName[]): number => {
    const set = set5(...names);
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (set.has(px.get(x, y))) n++;
    return n;
  };
  const mallBox: [number, number, number, number] = [LAND.mall.x - 21, LAND.mall.base - 27, LAND.mall.x + 21, LAND.mall.base + 1];
  const foodBox: [number, number, number, number] = [LAND.food.x - 15, LAND.food.base - 17, LAND.food.x + 15, LAND.food.base + 1];
  const bunkBox: [number, number, number, number] = [LAND.bunker.x - 13, hzAt(LAND.bunker.x) - 18, LAND.bunker.x + 13, hzAt(LAND.bunker.x) + 1];
  const neon: ColorName[] = ['magenta', 'purple0', 'yellow', 'cyan'];
  const open = paintLand(states('cleared', 'cleared', 'cleared', 'cleared', 'cleared', 'cleared', 'open', 'open', 'open')).px;
  const shut = paintLand(FRESH).px;
  assert.ok(some(open, ...mallBox, neon) > 150, `the open mall has its neon: ${some(open, ...mallBox, neon)}`);
  assert.ok(some(shut, ...mallBox, neon) < 10, 'the locked one is grey');
  assert.ok(some(open, ...foodBox, ['cyan', 'sky']) > 40, 'a food court in glass when its stage is open');
  assert.equal(some(shut, ...foodBox, ['cyan', 'magenta']), 0, 'and locked inside the mall, in greys');
  assert.ok(some(open, ...bunkBox, ['red', 'blood1']) >= 3, 'the bunker has its red star');
  assert.equal(some(shut, ...bunkBox, ['red', 'blood1', 'hot']), 0, 'and is grey when locked');
  // The base is underground but not in the Upside Down: its bunker is on the horizon in Hawkins' own colors, not the palette of the veins.
  assert.ok(some(open, ...bunkBox, ['grey2', 'grey3']) > 60);
});

test('the nodes sit between the bars, and the route starts and ends on them without gaps', () => {
  for (const id of ORDER) {
    const n = POS[id] as { x: number; y: number };
    assert.ok(n.y > TOP_H + 8 && n.y < BAND_Y - 8, `${id} sits between the bars`);
  }
  LEGS.forEach((leg, i) => {
    const a = POS[ORDER[i] as string] as { x: number; y: number }, b = POS[ORDER[i + 1] as string] as { x: number; y: number };
    assert.deepEqual(leg.pts[0], [a.x, a.y]);
    assert.ok(Math.hypot((leg.pts[leg.pts.length - 1] as number[])[0]! - b.x, (leg.pts[leg.pts.length - 1] as number[])[1]! - b.y) < 1e-9);
    assert.ok(leg.len > Math.hypot(b.x - a.x, b.y - a.y), 'longer than a straight line');
    for (let k = 1; k < leg.pts.length; k++) assert.ok(Math.hypot((leg.pts[k] as number[])[0]! - (leg.pts[k - 1] as number[])[0]!, (leg.pts[k] as number[])[1]! - (leg.pts[k - 1] as number[])[1]!) <= 1, 'no gaps in the route');
  });
});

test('every sign plate names its place and sits clear of the bars', () => {
  const plates = paintLand(SCHOOLED).plates;
  assert.deepEqual(plates.map((p) => p.name).sort(), ['ABYSS', 'BASE', 'FOOD COURT', 'GATE', 'KAMCHATKA', 'LAB', 'LOCKDOWN', 'MIRKWOOD', 'PATCH', 'SCHOOL', 'STARCOURT', 'TUNNELS']);
  for (const p of plates) assert.ok(p.y > TOP_H + 4 && p.y + 9 < BAND_Y - 4, `${p.name}`);
});
