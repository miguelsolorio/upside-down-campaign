// The art of the Lv 6 talents: Dustin's Dart (the 'pet' effect), Nancy's Molotov (the 'bottle' in flight and the 'fire' pool), the charge
// ring round a hero holding a Special, and the faint look of a hero hidden under Camo. The effects go to a recording stand-in; the actors
// and frames draw on a small software canvas (FakeCanvas below), so the tests can look at the pixels they put down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActorView, FxView } from '../src/core/types.ts';
import { settings } from '../src/core/settings.ts';
import { drawFx } from '../src/gfx/fx.ts';
import { chargeRing } from '../src/gfx/fx_l6.ts';
import { PAL } from '../src/gfx/palette.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { Px } from '../src/gfx/px.ts';
import { frameFor, ghostKeep, variantOf } from '../src/gfx/actor_kit.ts';
import type { Frame } from '../src/gfx/actor_kit.ts';

// ---------------------------------------------------------------- stand-ins
type Rect = [number, number, number, number, string];
/** A stand-in 2D context that records the rects it is asked to fill. */
function recorder(): { ctx: CanvasRenderingContext2D; rects: Rect[] } {
  const rects: Rect[] = [];
  const ctx = { fillStyle: '#000', fillRect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h, String(this.fillStyle)]); } };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
const named = (hex: string): string => (Object.entries(PAL).find(([, v]) => v === hex)?.[0] ?? hex);
/** What a list of rects leaves on the floor: the color name at each pixel, the last rect over it winning. */
function paint(rects: Rect[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const [x, y, w, h, c] of rects) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m.set(`${x + i},${y + j}`, named(c));
  return m;
}
const spots = (m: Map<string, string>): [number, number, string][] => [...m].map(([k, c]) => { const [x, y] = k.split(',').map(Number); return [x as number, y as number, c]; });
const fx = (kind: FxView['kind'], over: Partial<FxView> = {}): FxView => ({ kind, x: 100, y: 100, dir: 'right', angle: 0, t: 0, life: 240, w: 0, h: 0, ...over });
const draw = (f: FxView): Map<string, string> => { const r = recorder(); drawFx(r.ctx, f); return paint(r.rects); };
const same = (a: Map<string, string>, b: Map<string, string>): boolean => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const area = (m: Map<string, string>): number => m.size;
const onlyColors = (m: Map<string, string>, ok: string[]): boolean => [...m.values()].every((c) => ok.includes(c));
const extent = (m: Map<string, string>): { x0: number; x1: number; y0: number; y1: number } => {
  const s = spots(m);
  return { x0: Math.min(...s.map((p) => p[0])), x1: Math.max(...s.map((p) => p[0])), y0: Math.min(...s.map((p) => p[1])), y1: Math.max(...s.map((p) => p[1])) };
};

/** A software canvas, enough for the actor code: fillRect, drawImage and putImageData onto 32 bit pixels. */
const packed = (s: string): number => {
  const n = parseInt(s.slice(1), 16);
  return ((255 << 24) | (((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255))) >>> 0;
};
class FakeCanvas {
  w = 0; h = 0; px = new Uint32Array(0); g: FakeCtx | null = null;
  get width(): number { return this.w; }
  set width(v: number) { this.w = v; this.px = new Uint32Array(this.w * this.h); }
  get height(): number { return this.h; }
  set height(v: number) { this.h = v; this.px = new Uint32Array(this.w * this.h); }
  getContext(): FakeCtx { return (this.g ??= new FakeCtx(this)); }
}
class FakeCtx {
  fillStyle = '#000000'; imageSmoothingEnabled = false;
  canvas: FakeCanvas;
  constructor(canvas: FakeCanvas) { this.canvas = canvas; }
  put(x: number, y: number, v: number): void { const c = this.canvas; if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.px[y * c.w + x] = v; }
  fillRect(x: number, y: number, w: number, h: number): void {
    const v = packed(this.fillStyle), x0 = Math.round(x), y0 = Math.round(y);
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) this.put(i, j, v);
  }
  drawImage(img: FakeCanvas, ...a: number[]): void {
    let sx = 0, sy = 0, sw = img.w, sh = img.h, dx = a[0] as number, dy = a[1] as number;
    if (a.length === 8) [sx, sy, sw, sh, dx, dy] = a as [number, number, number, number, number, number, number, number];
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const p = img.px[(sy + j) * img.w + sx + i] as number;
      if (p >>> 24 !== 0) this.put(dx + i, dy + j, p);
    }
  }
  createImageData(w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  putImageData(img: { width: number; data: Uint8ClampedArray }, dx: number, dy: number): void {
    const u = new Uint32Array(img.data.buffer);
    for (let j = 0; j < u.length / img.width; j++) for (let i = 0; i < img.width; i++) this.put(dx + i, dy + j, u[j * img.width + i] as number);
  }
}
Object.assign(globalThis, { document: { createElement: (): FakeCanvas => new FakeCanvas() } });
const screen = (w = 64, h = 64): FakeCanvas => { const c = new FakeCanvas(); c.width = w; c.height = h; return c; };
const painted = (c: FakeCanvas, below = 1e9): number => c.px.reduce((n, v, i) => n + (v !== 0 && ((i / c.w) | 0) < below ? 1 : 0), 0);
const count = (c: FakeCanvas, ...names: ColorName[]): number => c.px.reduce((n, v) => n + (names.some((k) => px32(k) === v) ? 1 : 0), 0);

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');

// ---------------------------------------------------------------- Dart
const PET_COLORS = ['ink', 'grey2', 'grey3', 'bone', 'rose', 'black'];
const bodyOf = (m: Map<string, string>): Map<string, string> => new Map([...m].filter(([, c]) => c !== 'black'));

test('Dart is a small grey pollywog on four legs, 14 by 9 at most with his feet on y, in a few colors over a floor shadow', () => {
  for (const dir of ['right', 'left', 'down', 'up'] as const) {
    for (const w of [0, 1]) {
      const m = draw(fx('pet', { dir, w, t: 3, life: 720 }));
      assert.ok(m.size > 50 && m.size < 160, `${dir} w${w}: ${m.size} pixels`);
      assert.ok(onlyColors(m, PET_COLORS), `${dir} w${w}: ${[...new Set(m.values())].join()}`);
      const e = extent(bodyOf(m));
      assert.ok(e.x1 - e.x0 + 1 <= 14 && e.y1 - e.y0 + 1 <= 9, `${dir} w${w}: ${e.x1 - e.x0 + 1} by ${e.y1 - e.y0 + 1}`);
      assert.ok(e.y1 <= 99 && e.y0 >= 90, 'feet on the row above y');
      assert.ok(e.x0 >= 92 && e.x1 <= 108, 'around x');
      const shadow = spots(m).filter((p) => p[2] === 'black');
      assert.ok(shadow.length >= 4 && shadow.every((p) => p[1] >= 99 && p[1] <= 100 && Math.abs(p[0] - 100) <= 5), 'a small dither of shadow under him');
      assert.ok([...m.values()].filter((c) => c !== 'black' && c !== 'ink').length > 20, 'and a body, not just an outline');
    }
  }
  const side = extent(bodyOf(draw(fx('pet', { w: 0 }))));
  assert.ok(side.x1 - side.x0 + 1 >= 11 && side.x1 - side.x0 + 1 <= 12 && side.y1 - side.y0 + 1 >= 7, 'about 12 by 8 facing right');
});

test('Dart trots on a two frame loop of 8 frames a step, and his bite frame shows the head open in rose petals', () => {
  for (const dir of ['right', 'left', 'down', 'up'] as const) {
    const step = (t: number, w = 0): Map<string, string> => draw(fx('pet', { dir, t, w, life: 720 }));
    assert.ok(same(step(0), step(7)), `${dir}: one frame for 8 frames`);
    assert.ok(!same(step(0), step(8)), `${dir}: the next step is a different frame`);
    assert.ok(same(step(0), step(16)) && same(step(8), step(24)), `${dir}: a loop of two`);
    const bite = step(0, 1);
    assert.ok(!same(bite, step(0)) && !same(bite, step(8)), `${dir}: the bite is its own frame`);
    assert.ok(same(bite, step(8, 1)) && same(bite, step(100, 1)), `${dir}: and holds for as long as w is 1`);
    const rose = (m: Map<string, string>): number => [...m.values()].filter((c) => c === 'rose').length;
    assert.ok(rose(bite) >= rose(step(0)) + 8, `${dir}: petals, ${rose(bite)} against ${rose(step(0))}`);
  }
});

test('Dart faces the way he runs: left is right turned about his feet, and up, down and across all differ', () => {
  for (const w of [0, 1]) for (const t of [0, 8]) {
    const r = bodyOf(draw(fx('pet', { dir: 'right', t, w, life: 720 }))), l = bodyOf(draw(fx('pet', { dir: 'left', t, w, life: 720 })));
    const turned = new Map(spots(r).map(([x, y, c]) => [`${200 - x},${y}`, c] as [string, string]));
    assert.ok(same(l, turned), `t${t} w${w}: the mirror image`);
    assert.ok(!same(l, r));
  }
  // His head and its rose seam are at the front: more rose on the right of x facing right, on the left facing left.
  const rose = (dir: 'left' | 'right'): number => spots(bodyOf(draw(fx('pet', { dir, life: 720 })))).filter((p) => p[2] === 'rose').reduce((n, p) => n + Math.sign(p[0] - 99.5), 0);
  assert.ok(rose('right') > 0 && rose('left') < 0, `${rose('right')} and ${rose('left')}`);
  const views = (['right', 'down', 'up'] as const).map((dir) => draw(fx('pet', { dir, life: 720 })));
  assert.ok(!same(views[0] as Map<string, string>, views[1] as Map<string, string>) && !same(views[1] as Map<string, string>, views[2] as Map<string, string>) && !same(views[0] as Map<string, string>, views[2] as Map<string, string>));
});

// ---------------------------------------------------------------- Molotov
const FLAME = ['cream', 'yellow', 'orange', 'red'];
test('the bottle in flight is a 5 by 7 glass bottle with a burning rag and a flame 3 px tall, h px above (x, y), tumbling through four poses', () => {
  const at = (t: number, h = 12): Map<string, string> => draw(fx('bottle', { t, h, life: 22 }));
  const m = at(0);
  assert.ok(m.size >= 28 && m.size <= 56, `${m.size} pixels`);
  assert.ok(onlyColors(m, ['ink', 'mist', 'white', 'amber', 'bone', 'cream', 'orange', 'yellow', 'red', 'black']), [...new Set(m.values())].join());
  const body = new Map([...m].filter(([, c]) => !FLAME.includes(c) && c !== 'black'));
  const e = extent(body), flame = spots(m).filter((p) => FLAME.includes(p[2]));
  assert.deepEqual([e.x1 - e.x0 + 1, e.y1 - e.y0 + 1], [5, 7], 'the bottle');
  assert.ok(e.y0 >= 100 - 12 - 4 && e.y1 <= 100 - 12 + 3, 'h above the floor');
  assert.ok(flame.length >= 4 && Math.max(...flame.map((p) => e.y0 - p[1])) <= 3 && flame.every((p) => p[1] < e.y0), 'a flame 3 px tall over the rag');
  assert.ok(spots(m).some((p) => p[2] === 'black' && p[1] === 100), 'and a speck of shadow on the floor');
  // Four poses, 3 frames each, back where it began after twelve: the neck and the flame turn up, right, down, left.
  const side = (t: number): [number, number] => { const s = spots(at(t)).filter((p) => FLAME.includes(p[2])); return [s.reduce((n, p) => n + p[0], 0) / s.length - 100, s.reduce((n, p) => n + p[1], 0) / s.length - 88]; };
  const [up, right, down, left] = [side(0), side(3), side(6), side(9)];
  assert.ok(up[1] < -4 && Math.abs(up[0]) < 2 && right[0] > 4 && Math.abs(right[1]) < 2 && down[1] > 4 && left[0] < -4, 'the flame goes round: up, right, down, left');
  const poses = [0, 3, 6, 9].map((t) => at(t));
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(!same(poses[a] as Map<string, string>, poses[b] as Map<string, string>), `poses ${a} and ${b} differ`);
  assert.ok(same(at(0), at(12)) && same(at(1), at(13)), 'a turn every 12 frames');
  assert.ok(!same(at(0), at(2)), 'the flame flickers');
  assert.ok(extent(bodyOf(at(0, 20))).y1 < extent(bodyOf(at(0, 4))).y1, 'and is higher when h is more');
});

test('the fire is a flat ellipse of flames w wide and w/2 tall, a red rim round orange and yellow, with tongues above it', () => {
  const m = draw(fx('fire', { t: 60, w: 48, h: 24 }));
  assert.ok(onlyColors(m, ['red', 'hot', 'orange', 'amber', 'yellow', 'cream']), [...new Set(m.values())].join());
  for (const c of ['red', 'orange', 'yellow']) assert.ok([...m.values()].includes(c), `has ${c}`);
  const e = extent(m);
  assert.ok(e.x1 - e.x0 + 1 >= 42 && e.x1 - e.x0 + 1 <= 49, `${e.x1 - e.x0 + 1} wide`);
  assert.ok(e.y1 - e.y0 + 1 >= 22 && e.y1 - e.y0 + 1 <= 24 + 7, `${e.y1 - e.y0 + 1} tall with the tongues`);
  assert.ok(e.y1 <= 100 + 13 && e.x0 >= 100 - 25 && e.x1 <= 100 + 25, 'centered on (x, y)');
  // The rim is red and the middle is hot.
  const ring = spots(m).filter((p) => Math.hypot((p[0] - 100) / 24, (p[1] - 100) / 12) > 0.9 && p[1] > 95), mid = spots(m).filter((p) => Math.hypot((p[0] - 100) / 24, (p[1] - 100) / 12) < 0.35);
  assert.ok(ring.filter((p) => p[2] === 'red' || p[2] === 'hot').length > ring.length * 0.6, 'a red rim');
  assert.ok(mid.filter((p) => p[2] === 'yellow' || p[2] === 'amber' || p[2] === 'cream').length > mid.length * 0.6, 'a yellow heart');
  // Tongues: flame above the top of the pool, 3 to 6 px of it.
  const tops = spots(m).filter((p) => p[1] < 100 - 12);
  assert.ok(tops.length >= 3 && Math.min(...tops.map((p) => p[1])) >= 100 - 12 - 7, `${tops.length} px of tongue above the rim`);
  assert.equal(draw(fx('fire', { t: 60, w: 0, h: 0 })).size, m.size, 'w 0 means the default 48');
  assert.ok(area(draw(fx('fire', { t: 60, w: 24, h: 12 }))) < area(m) * 0.4, 'and w sets the size');
  assert.ok(!same(draw(fx('fire', { t: 60, w: 48 })), draw(fx('fire', { t: 62, w: 48 }))), 'it flickers');
  assert.ok(same(draw(fx('fire', { t: 60, w: 48 })), draw(fx('fire', { t: 60, w: 48 }))), 'the same every time');
});

test('the fire grows in over its first 6 frames and, for the last fifth of its life, shrinks and thins to embers', () => {
  const at = (t: number): number => area(draw(fx('fire', { t, w: 48, life: 240 })));
  assert.ok(at(0) < at(2) && at(2) < at(4) && at(4) < at(6), `${[0, 2, 4, 6].map(at).join(', ')}`);
  assert.ok(at(1) < at(6) * 0.4 && at(6) > at(60) * 0.85, 'the first frames are small and the 6th is nearly full');
  assert.ok(at(150) > at(60) * 0.85 && at(190) > at(60) * 0.85, 'it holds its size until the last fifth');
  const tail = [200, 215, 230, 239].map(at);
  assert.ok(tail[0] as number < at(60) * 0.9 && tail.every((v, i) => i === 0 || v < (tail[i - 1] as number)), `${tail.join(', ')}`);
  assert.ok(at(239) < at(60) * 0.2, `${at(239)} at the end against ${at(60)}`);
  const e = extent(draw(fx('fire', { t: 239, w: 48, life: 240 })));
  assert.ok(e.x1 - e.x0 + 1 < 30, 'and it is smaller');
  // Embers: a dither, so most of what is left stands apart from the rest.
  const left = draw(fx('fire', { t: 239, w: 48, life: 240 }));
  assert.ok(spots(left).filter(([x, y]) => left.has(`${x + 1},${y}`)).length < left.size * 0.2, 'thinned to a dither');
});

// ---------------------------------------------------------------- the charge ring
const ringAt = (charge: number, t = 0): Map<string, string> => { const r = recorder(); chargeRing(r.ctx, 100, 100, charge, t); return paint(r.rects); };
const lit = (m: Map<string, string>): [number, number, string][] => spots(m).filter((p) => ['cyan', 'sky', 'white'].includes(p[2]));

test('the charge ring is an ellipse 20 by 8 round the feet that fills clockwise from the top as charge goes up, in cyan and sky', () => {
  const full = ringAt(1), quarter = ringAt(0.25);
  assert.ok(lit(full).length > lit(quarter).length * 2.5, `${lit(full).length} lit at 1 against ${lit(quarter).length} at 0.25`);
  assert.ok(area(full) > area(quarter), 'and more drawn at all');
  const e = extent(new Map(lit(full).map(([x, y, c]) => [`${x},${y}`, c] as [string, string])));
  assert.deepEqual([e.x1 - e.x0 + 1, e.y1 - e.y0 + 1], [20, 8], 'about 20 by 8');
  assert.ok(e.x0 >= 100 - 10 && e.x1 <= 100 + 9 && e.y0 >= 100 - 5 && e.y1 <= 100 + 2, 'round the feet');
  assert.equal(ringAt(0.001, 3).size > 0, true, 'the empty ring still shows its track');
  assert.ok(onlyColors(quarter, ['cyan', 'sky', 'ink', 'dusk']), [...new Set(quarter.values())].join());
  // Clockwise from 12 o'clock: the first quarter lies top right, half way takes in the bottom right, then it closes up the left.
  assert.ok(lit(quarter).every(([x, y]) => x >= 100 && y <= 99), 'a quarter is the top right');
  assert.ok(lit(ringAt(0.5)).some(([x, y]) => x >= 100 && y >= 100) && lit(ringAt(0.5)).every(([x]) => x >= 98), 'a half is the right side');
  assert.ok(lit(ringAt(0.75)).some(([x, y]) => x < 95 && y >= 99) && !lit(ringAt(0.75)).some(([x, y]) => x < 95 && y < 98), 'three quarters has the bottom, not yet the top left');
  const counts = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((c) => lit(ringAt(c)).length);
  assert.ok(counts.every((n, i) => i === 0 || n >= (counts[i - 1] as number)) && counts[6] as number > (counts[0] as number) * 4, `fills in order: ${counts.join(', ')}`);
  // Segments: eight, told apart by color, and with gaps before each until it is full.
  assert.ok(new Set(lit(ringAt(0.9)).map((p) => p[2])).size === 2 && lit(ringAt(1)).length > lit(ringAt(0.95)).length, 'cyan and sky in turn, and the last gap closes');
  const ink = (m: Map<string, string>): number => [...m.values()].filter((c) => c === 'ink').length;
  assert.ok(ink(ringAt(1)) >= lit(ringAt(1)).length * 0.7, 'with an ink edge under it, to read on a light floor');
});

test('a full ring flashes white and a held steady one stays white when flashing is reduced', () => {
  const white = (m: Map<string, string>): number => lit(m).filter((p) => p[2] === 'white').length;
  const a = ringAt(1, 0), b = ringAt(1, 8);
  assert.ok(white(a) === lit(a).length && white(b) === 0 && lit(b).length > 0, 'white, then cyan and sky');
  assert.notDeepEqual([...a], [...b]);
  assert.ok(white(ringAt(0.8, 0)) === 0, 'only a full ring is white');
  settings.reduceFlashing = true;
  try { assert.ok(white(ringAt(1, 0)) === lit(ringAt(1, 0)).length && white(ringAt(1, 8)) === lit(ringAt(1, 8)).length, 'white all the time'); } finally { settings.reduceFlashing = false; }
});

const hero = (id: 'lucas' | 'mike' | 'nancy', over: Partial<ActorView> = {}): ActorView => ({
  kind: 'hero', id, x: 32, y: 48, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const seen = (v: ActorView): FakeCanvas => { const c = screen(); drawActor(c.getContext() as never, v); return c; };

test('an active hero holding a Special has the ring round his feet, under the sprite; a bar-less, ring-less hero draws as before', () => {
  const none = seen(hero('mike')), q = seen(hero('mike', { charge: 0.25 })), full = seen(hero('mike', { charge: 1 })), zero = seen(hero('mike', { charge: 0 }));
  assert.equal(painted(zero), painted(none), 'charge 0 draws nothing');
  assert.ok(count(full, 'cyan', 'sky', 'white') > count(q, 'cyan', 'sky', 'white') && count(q, 'cyan', 'sky', 'white') >= 4, 'more of it as charge goes up');
  assert.equal(count(none, 'cyan', 'sky'), 0);
  // The sprite is drawn over the ring: every pixel the sprite covers is the same with and without the ring.
  const sprite = seen(hero('mike')), withRing = seen(hero('mike', { charge: 0.5 }));
  let differs = 0, ringed = 0;
  for (let i = 0; i < sprite.px.length; i++) {
    if (sprite.px[i] !== withRing.px[i]) { differs++; if ([px32('cyan'), px32('sky'), px32('ink'), px32('dusk')].includes(withRing.px[i] as number)) ringed++; }
  }
  assert.ok(differs > 0 && ringed === differs, `only ring colors differ: ${differs}, ${ringed}`);
  // Round the feet: the ring's pixels lie within 10 px across and from 5 above to 2 below the feet (32, 48).
  for (let i = 0; i < withRing.px.length; i++) {
    if (sprite.px[i] === withRing.px[i]) continue;
    const x = i % withRing.w, y = (i / withRing.w) | 0;
    assert.ok(x >= 32 - 10 && x <= 32 + 9 && y >= 48 - 5 && y <= 48 + 3, `${x},${y}`);
  }
  // Not drawn for an enemy, and not while the sprite blinks away.
  assert.equal(painted(seen({ ...hero('mike', { charge: 1 }), kind: 'enemy' })), painted(seen({ ...hero('mike'), kind: 'enemy' })));
  assert.equal(painted(seen(hero('mike', { charge: 1, blink: true }))), 0);
});

// ---------------------------------------------------------------- hidden
test('a hidden hero is half dither with his whole outline kept, a hidden enemy a thin ghost: the same sprite keeps more as a hero', () => {
  const src = new Px(16, 16).ellipse(8, 9, 6, 6, 'grey3').ellipse(6, 7, 2, 2, 'bone').outline('ink');
  const cache = (): Map<string, Frame> => new Map();
  const solid = (f: Frame): Px => { const c = f.img as unknown as FakeCanvas; const p = new Px(c.w, c.h); p.d.set(c.px); return p; };
  const n = (p: Px): number => p.d.filter((v) => v !== 0).length;
  const inkOf = (p: Px): number => p.d.filter((v) => v === px32('ink')).length;
  const whole = solid(frameFor(cache(), 's', src, { flash: 0, tint: null }));
  const faintHero = solid(frameFor(cache(), 's', src, { flash: 0, tint: null, hidden: true, kind: 'hero' }));
  const ghost = solid(frameFor(cache(), 's', src, { flash: 0, tint: null, hidden: true, kind: 'enemy' }));
  const noKind = solid(frameFor(cache(), 's', src, { flash: 0, tint: null, hidden: true }));
  assert.equal(n(whole), n(src), 'a frame with no look keeps every pixel');
  assert.ok(n(faintHero) > n(ghost) * 2, `${n(faintHero)} for the hero against ${n(ghost)} for the enemy`);
  assert.ok(n(faintHero) < n(whole) * 0.8 && n(faintHero) > n(whole) * 0.45, `${n(faintHero)} of ${n(whole)}: about half`);
  assert.equal(inkOf(faintHero), inkOf(whole), 'the whole outline stays');
  assert.ok(n(ghost) < n(whole) * 0.3 && n(ghost) > 0, 'the enemy is a thin ghost');
  assert.deepEqual(Array.from(noKind.d), Array.from(ghost.d), 'a hidden view with no kind is the enemy ghost, as before');
  // The enemy's ghost is the quarter checker it always was.
  const quarter = src.d.map((v, i) => (v && ((i % 16) + ((i / 16) | 0)) % 2 === 0 && (i % 16) % 2 === 0 ? v : 0));
  assert.deepEqual(Array.from(ghost.d), Array.from(quarter));
  // And the rule they share.
  assert.ok(ghostKeep(true, 3, 4, true) && ghostKeep(true, 2, 4, false) && !ghostKeep(true, 3, 4, false), 'a hero keeps ink and a checker');
  assert.ok(!ghostKeep(false, 3, 4, true) && ghostKeep(false, 2, 4, false) && !ghostKeep(false, 3, 3, false), 'an enemy keeps one in four, ink or not');
  assert.equal(variantOf({ flash: 0, tint: null, hidden: true, kind: 'hero' }), 'hh');
  assert.equal(variantOf({ flash: 0, tint: null, hidden: true, kind: 'enemy' }), 'h');
  assert.equal(variantOf({ flash: 0, tint: null, hidden: true }), 'h');
  assert.equal(variantOf({ flash: 0, tint: null, kind: 'hero' }), 'n', 'only a hidden hero is faint');
});

test('Lucas under his Camo is drawn faint but clear: about half his pixels and all of his outline; a hidden rat is drawn as it was', () => {
  const lucas = (hidden?: boolean): FakeCanvas => seen(hero('lucas', { hidden, anim: 'idle', dir: 'down' }));
  const body = (c: FakeCanvas): number => painted(c, 48 - 3);
  const whole = lucas(), faint = lucas(true);
  assert.ok(body(faint) < body(whole) * 0.8 && body(faint) > body(whole) * 0.4, `${body(faint)} of ${body(whole)}`);
  assert.equal(count(faint, 'ink') >= count(whole, 'ink') - 1, true, 'the outline stays');
  assert.ok(painted(faint) > 20, 'and the shadow under him');
  const moving = seen(hero('lucas', { hidden: true, anim: 'walk', dir: 'right', t: 5 }));
  assert.ok(body(moving) > 40, 'faint in every pose');
  // A hidden hero holding a Special still shows the ring.
  assert.ok(count(seen(hero('lucas', { hidden: true, charge: 1 })), 'cyan', 'sky', 'white') > 10);
  // Enemies stay as they are: a rat is no fainter when hidden, a demodog is the thin ghost it was.
  const foe = (id: 'rat' | 'demodog', hidden: boolean): FakeCanvas => seen({ ...hero('mike'), kind: 'enemy', id, hidden } as ActorView);
  assert.equal(painted(foe('rat', true)), painted(foe('rat', false)));
  assert.ok(painted(foe('demodog', true)) < painted(foe('demodog', false)) * 0.4, 'a hidden demodog is a thin ghost');
});
