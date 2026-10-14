// The Hawkins Middle School art (stage 1.3): 13 tiles, three props, the Demogorgon and its two effects. Pure pixel
// work, so Node runs it: tiles and sprites are Px buffers, and the effects draw through a recording stand-in for a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, FxKind, FxView } from '../src/core/types.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { PAL } from '../src/gfx/palette.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { litWindow, nightTile } from '../src/gfx/night.ts';
import { SCHOOL_TILES } from '../src/gfx/tile_school.ts';
import { DEMO_H, DEMO_W, composeDemo, demoPx, demoSpec } from '../src/gfx/actor_demo.ts';
import type { PoseName } from '../src/gfx/actor_demo.ts';
import { fireboxArt, vanTippedArt, vinesArt } from '../src/gfx/props_school.ts';
import { drawFx } from '../src/gfx/fx.ts';

const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const paint = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const colors = (px: Px): Set<number> => new Set([...px.d].filter((v) => v !== 0));
const opaque = (px: Px): boolean => px.d.every((v) => v >>> 24 === 255);
/** Neighbours a school tile has in a real hall: a roof edge above a wall run, a floor below it. */
const hall = (n: TileName): Near => ({ n: 'schoolcap', e: n, s: 'schoolfloor', w: n });
const FLOORS: TileName[] = ['schoolfloor', 'checker', 'gymfloor'];

test('the school has thirteen tiles and every one is in the legend', () => {
  assert.equal(SCHOOL_TILES.length, 13);
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of SCHOOL_TILES) assert.ok(names.has(n), n);
});

test('every school tile paints a fully opaque 16 by 16, is not the flat placeholder, and has a night version', () => {
  for (const name of SCHOOL_TILES) {
    for (let i = 0; i < 6; i++) {
      const near = i % 3 === 0 ? around(name) : i % 3 === 1 ? hall(name) : { n: name, e: 'schoolwall' as TileName, s: name, w: 'lockerwall' as TileName };
      const c = ctxAt(3 + i * 5, 2 + i * 3, near);
      const day = paint(name, c);
      assert.ok(day, `${name} paints`);
      assert.equal(day.w, 16, name);
      assert.equal(day.h, 16, name);
      assert.ok(opaque(day), `${name} is opaque`);
      assert.ok(colors(day).size >= 3, `${name} is more than a fill and a frame: ${colors(day).size} colors`);
      const night = nightTile(day, name, c);
      assert.equal(night.w, 16, name);
      assert.ok(opaque(night), `${name} is opaque at night`);
      assert.notDeepEqual(night.d, day.d, `${name} has a night version that differs from the day one`);
      assert.deepEqual(night.d, nightTile(day, name, c).d, `${name} at night is the same every time`);
    }
  }
});

test('the 2.1 stand-ins survive: those tiles still paint through the object painter', () => {
  const rest: TileName[] = ['arcadecarpet', 'arcadewall', 'sidewalk', 'storefront', 'furrow', 'pumpkin', 'rotpumpkin', 'haybale', 'barnwall', 'barnroof', 'corn', 'rot', 'hole'];
  for (const n of rest) {
    const px = objectTile(n, ctxAt(4, 4, around(n)));
    assert.ok(px && opaque(px), n);
    assert.ok(opaque(nightTile(px, n, ctxAt(4, 4, around(n)))), `${n} at night`);
  }
});

test('halls do not look stamped: floors and walls vary from tile to tile', () => {
  for (const name of SCHOOL_TILES) {
    if (name === 'bleachers') continue;
    const seen = new Set<string>();
    for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(name, ctxAt(tx, ty, name === 'schoolfloor' ? around(name) : hall(name))).d.join());
    assert.ok(seen.size >= (FLOORS.includes(name) ? 12 : 16), `${name}: ${seen.size} different tiles out of 64`);
  }
});

test('the floors are warm, pale and slate, and board wood, and the gym has white lines at the walls', () => {
  const count = (px: Px, names: ColorName[]): number => { const s = new Set(names.map((n) => px32(n))); return px.d.reduce((n, v) => n + (s.has(v) ? 1 : 0), 0); };
  assert.ok(count(paint('schoolfloor', ctxAt(7, 7, around('schoolfloor'))), ['soil3', 'sand', 'soil2']) >= 200, 'brown linoleum');
  assert.ok(count(paint('checker', ctxAt(7, 7, around('checker'))), ['bone', 'slate', 'white', 'mist', 'dusk', 'grey3']) >= 230, 'bone and slate');
  const edge = paint('gymfloor', ctxAt(7, 7, { n: 'schoolwall', e: 'gymfloor', s: 'gymfloor', w: 'gymfloor' }));
  const inner = paint('gymfloor', ctxAt(7, 7, around('gymfloor')));
  assert.ok(count(edge, ['white']) >= 28, 'a boundary line along the wall');
  assert.equal(count(inner, ['white']), 0, 'no line in the middle of the court');
});

test('the brick facade has lit windows that litWindow finds, and the rest do not count', () => {
  let lit = 0, dark = 0;
  for (let tx = 0; tx < 40; tx++) {
    const c = ctxAt(tx, 1, { n: 'brick', e: 'brick', s: 'gravel', w: 'brick' });
    const day = paint('brick', c);
    const found = litWindow(day, 'brick');
    if (found) {
      lit++;
      const night = nightTile(day, 'brick', c);
      assert.equal(night.get(9, 6), px32('amber'), 'the window keeps its light at night');
    } else dark++;
    assert.ok(!litWindow(day, 'schoolwall'), 'only brick has windows');
  }
  assert.ok(lit >= 3 && dark >= 20, `${lit} lit, ${dark} not`);
  for (const n of SCHOOL_TILES.filter((t) => t !== 'brick')) assert.ok(!litWindow(paint(n, ctxAt(5, 5, around(n))), n), n);
});

// ---------------------------------------------------------------- props
test('the firebox is dark, then lit, in five colors, and fills the same box', () => {
  const dark = fireboxArt(false), lit = fireboxArt(true);
  assert.equal(dark.w, 16);
  assert.equal(lit.h, 16);
  assert.ok(colors(dark).size <= 5 && colors(lit).size <= 5, `${colors(dark).size} and ${colors(lit).size} colors`);
  assert.ok(colors(dark).has(px32('red')) && colors(lit).has(px32('red')), 'red steel both ways');
  assert.ok(!colors(dark).has(px32('yellow')) && colors(lit).has(px32('yellow')), 'only the lit one glows');
  assert.notDeepEqual(dark.d, lit.d);
});

test('the vines fill the doorway when closed and are mostly gone when open, either way round', () => {
  for (const [w, h] of [[32, 16], [16, 32], [48, 16]] as [number, number][]) {
    for (const beat of [0, 1]) {
      const closed = vinesArt(w, h, false, beat), open = vinesArt(w, h, true, beat);
      assert.equal(closed.w, w);
      assert.equal(closed.h, h);
      assert.equal(open.w, w);
      assert.ok(closed.d.every((v) => v !== 0), `closed ${w} by ${h} covers the doorway`);
      assert.ok(open.d.filter((v) => v !== 0).length < w * h * 0.25, `open ${w} by ${h} is mostly empty`);
      assert.ok(open.d.some((v) => v !== 0), 'but the stubs are there');
      assert.ok(colors(closed).size <= 5, `${colors(closed).size} colors`);
    }
  }
  assert.notDeepEqual(vinesArt(32, 16, false, 0).d, vinesArt(32, 16, false, 1).d, 'the knots beat');
});

test('the van lies on its side when it is open: same size, five colors, wheels along the far edge', () => {
  for (const [w, h] of [[32, 16], [48, 28], [32, 22]] as [number, number][]) {
    const p = vanTippedArt(w, h);
    assert.equal(p.w, w);
    assert.equal(p.h, h);
    assert.ok(colors(p).size <= 5, `${colors(p).size} colors`);
    assert.ok(p.d.filter((v) => v !== 0).length > w * h * 0.5, 'a van, not a few specks');
    const b = bounds(p), crown = Array.from({ length: w }, (_, x) => p.get(x, b.y0)).filter((v) => v !== 0).length;
    assert.ok(crown >= 2 && crown <= 12, `two tires stick up along the far edge: ${crown} px in the top row`);
  }
});

// ---------------------------------------------------------------- the Demogorgon
const POSES: PoseName[] = ['stand', 'stepA', 'stepB', 'windup', 'strike', 'hurt', 'charge', 'stun', 'spit', 'crouch', 'air', 'lying'];
const bounds = (px: Px): { x0: number; x1: number; y0: number; y1: number } => {
  let x0 = px.w, x1 = -1, y0 = px.h, y1 = -1;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (px.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
};

test('every Demogorgon pose, facing and petal state is drawn: 32 by 36, five colors, no alpha', () => {
  const allowed = new Set((['ink', 'grey2', 'grey3', 'bone', 'red'] as ColorName[]).map((n) => px32(n)));
  for (const view of ['down', 'up', 'side'] as const) {
    for (const pose of POSES) {
      for (const f of [0, 1]) {
        const shut = composeDemo(view, pose, f, false), open = composeDemo(view, pose, f, true);
        for (const [label, px] of [['shut', shut], ['open', open]] as [string, Px][]) {
          assert.equal(px.w, DEMO_W);
          assert.equal(px.h, DEMO_H);
          assert.ok(px.d.every((v) => v === 0 || v >>> 24 === 255), `${view} ${pose} ${label}: no alpha`);
          assert.ok([...colors(px)].every((v) => allowed.has(v)), `${view} ${pose} ${label}: only the five colors`);
          assert.ok(px.d.filter((v) => v !== 0).length > 120, `${view} ${pose} ${label}: drawn`);
        }
        assert.notDeepEqual(shut.d, open.d, `${view} ${pose}: the petals change the picture`);
        assert.ok(!colors(shut).has(px32('red')), `${view} ${pose}: faceless and no red while the petals are shut`);
      }
    }
  }
});

test('a standing Demogorgon is about 24 wide and 32 tall with its feet on the bottom, and the petals open the flower', () => {
  for (const view of ['down', 'up', 'side'] as const) {
    const b = bounds(composeDemo(view, 'stand', 0, false));
    assert.ok(b.y1 - b.y0 + 1 >= 30 && b.y1 - b.y0 + 1 <= 36, `${view} height ${b.y1 - b.y0 + 1}`);
    assert.ok(b.y1 >= 34, `${view} stands on the ground`);
    assert.ok(b.x1 - b.x0 + 1 >= 14 && b.x1 - b.x0 + 1 <= 30, `${view} width ${b.x1 - b.x0 + 1}`);
  }
  const shut = bounds(composeDemo('down', 'stand', 0, false)), open = bounds(composeDemo('down', 'stand', 0, true));
  assert.ok(open.x1 - open.x0 > shut.x1 - shut.x0 - 1, 'the open head is at least as wide');
  assert.ok(colors(composeDemo('down', 'stand', 0, true)).has(px32('red')), 'red inside the petals');
});

test('the sim picks the pose: charge, stun, spit, leap (crouched on the ground, airborne above it), pinned', () => {
  const v = (over: Partial<ActorView>): Pick<ActorView, 'dir' | 'anim' | 'pose' | 'petals' | 't' | 'z' | 'alert'> => ({ dir: 'down', anim: 'walk', pose: undefined, petals: false, t: 0, z: 0, alert: false, ...over });
  assert.equal(demoSpec(v({ pose: 'charge' })).pose, 'charge');
  assert.equal(demoSpec(v({ pose: 'stun' })).pose, 'stun');
  assert.equal(demoSpec(v({ pose: 'spit' })).pose, 'spit');
  assert.equal(demoSpec(v({ pose: 'leap', z: 0 })).pose, 'crouch');
  assert.equal(demoSpec(v({ pose: 'leap', z: 9 })).pose, 'air');
  assert.equal(demoSpec(v({ pose: 'pinned' })).pose, 'lying');
  assert.equal(demoSpec(v({ anim: 'ko' })).pose, 'lying');
  assert.equal(demoSpec(v({ anim: 'attack', alert: true })).pose, 'windup');
  assert.equal(demoSpec(v({ anim: 'attack' })).pose, 'strike');
  assert.equal(demoSpec(v({ anim: 'walk', t: 0 })).pose, 'stepA');
  assert.equal(demoSpec(v({ anim: 'walk', t: 14 })).pose, 'stepB');
  assert.equal(demoSpec(v({ dir: 'left' })).flip, true);
  assert.equal(demoSpec(v({ dir: 'left' })).view, 'side');
  assert.equal(demoSpec(v({ dir: 'up', petals: true })).open, true);
  const stun = [0, 16].map((t) => demoPx(demoSpec(v({ pose: 'stun', t }))).d.join());
  assert.notEqual(stun[0], stun[1], 'the head lolls from one side to the other');
});

test('a left facing Demogorgon is the right facing one flipped', () => {
  const r = demoPx(demoSpec({ dir: 'right', anim: 'idle', pose: undefined, petals: true, t: 0, z: 0, alert: false }));
  const l = demoPx(demoSpec({ dir: 'left', anim: 'idle', pose: undefined, petals: true, t: 0, z: 0, alert: false }));
  for (let y = 0; y < DEMO_H; y++) for (let x = 0; x < DEMO_W; x++) assert.equal(l.get(x, y), r.get(DEMO_W - 1 - x, y));
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
const fxView = (kind: FxKind, t: number, life: number, w = 28): FxView => ({ kind, x: 100, y: 100, dir: 'right', angle: 0.4, t, life, w, h: 0 });
const extent = (pixels: Map<string, string>): number => {
  let r = 0;
  for (const k of pixels.keys()) { const [x, y] = k.split(',').map(Number) as [number, number]; r = Math.max(r, Math.hypot(x - 100, y - 100)); }
  return r;
};

test('acid is a green glob in flight and a splash at the end of its life', () => {
  const flight = recorder(), end = recorder(), early = recorder();
  drawFx(flight.ctx, fxView('acid', 20, 54));
  drawFx(end.ctx, fxView('acid', 48, 54));
  drawFx(early.ctx, fxView('acid', 2, 54));
  assert.ok(flight.pixels.size >= 20 && flight.pixels.size < 90, `a glob is small: ${flight.pixels.size} px`);
  assert.ok(flight.names.has('pine3') && flight.names.has('leaf'), 'green');
  assert.ok(end.pixels.size > flight.pixels.size * 3, `a splash spreads: ${end.pixels.size} against ${flight.pixels.size}`);
  assert.ok(extent(end.pixels) >= 8 && extent(end.pixels) <= 22, `splash reaches about its 14 px: ${extent(end.pixels).toFixed(1)}`);
  assert.ok(early.pixels.size > 0);
  const bare = recorder();
  drawFx(bare.ctx, fxView('acid', 3, 14));
  assert.ok(bare.pixels.size > 40, 'a short life is a bare splash');
});

test('mark is a dark dithered ring on the floor that grows over its life', () => {
  const sizes = [4, 14, 26, 40].map((t) => { const r = recorder(); drawFx(r.ctx, fxView('mark', t, 45)); return { t, r: extent(r.pixels), n: r.pixels.size, names: r.names }; });
  for (let i = 1; i < sizes.length; i++) assert.ok((sizes[i] as { r: number }).r >= (sizes[i - 1] as { r: number }).r, `the ring grows at ${sizes[i]?.t}`);
  const last = sizes[3] as { r: number; names: Set<string> };
  assert.ok(last.r >= 12 && last.r <= 17, `it ends about 14 px out: ${last.r.toFixed(1)}`);
  assert.ok([...last.names].every((n) => ['black', 'ink', 'blood0', 'blood1'].includes(n)), `dark colors only: ${[...last.names].join()}`);
  const wide = recorder();
  drawFx(wide.ctx, fxView('mark', 45, 45, 80));
  assert.ok(extent(wide.pixels) >= 36, 'w sets the final size');
  const ring = recorder();
  drawFx(ring.ctx, fxView('mark', 30, 45));
  const total = Math.PI * (extent(ring.pixels) + 1) ** 2;
  assert.ok(ring.pixels.size < total * 0.75, 'dithered, not a solid disc');
});
