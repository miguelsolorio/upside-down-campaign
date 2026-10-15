// Effects of level 6, drawn like fx_l78.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// pet: Dustin's Dart, a baby demodog (a pollywog grown legs), 12 by 8 px on his feet, trotting on a two frame loop. bottle: Nancy's Molotov in
// flight, h its height off the ground. fire: its pool on the floor, w its diameter. ring: the charge ring round a hero's feet while a
// Special is held (actors.ts draws it under the sprite).
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { settings } from '../core/settings.ts';
import { rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

// ---------------------------------------------------------------- pet
/** k ink, d and g the two greys, w bone, r the dusky pink of the petals. */
const PET_PAL: Record<string, ColorName> = { k: 'ink', d: 'grey2', g: 'grey3', w: 'bone', r: 'rose' };

/** Lays rows of art over another, from column ox and row oy. A '.' leaves what is under it. */
function over(base: readonly string[], top: readonly string[], ox: number, oy: number): string[] {
  const g = base.map((r) => r.split(''));
  top.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') (g[oy + j] as string[])[ox + i] = row[i] as string; });
  return g.map((r) => r.join(''));
}

/** The open head: a flower of five rose petals round a dark mouth with one bone tooth. */
const BLOOM = [
  '..kkk..',
  '.krrrk.',
  'krrkrrk',
  'krkwkrk',
  'krrkrrk',
  '.krrrk.',
  '..kkk..',
];

// Facing right, 14 wide, feet on the bottom row. Two bone spines on the back, a rose seam at the front of the bud, a tail that wags, and
// four stubby legs that trot in diagonal pairs: frame A has the rear near and front far legs down, frame B the other two.
const SIDE_A = [
  '..............',
  '....kwkwkk....',
  '...kgggggdk...',
  '.kkgggwggrdk..',
  'kddgggggggrk..',
  '.kdgggggggdk..',
  '..kdddddddk...',
  '...g.k.d.d....',
  '...d...k......',
];
const SIDE_B = [
  '..............',
  '....kwkwkk....',
  'k..kgggggdk...',
  'dkkgggwggrdk..',
  'kddgggggggrk..',
  '.kdgggggggdk..',
  '..kdddddddk...',
  '...d.d.k.g....',
  '.....k...d....',
];
/** The bite: all four feet planted wide, and the bud blown open. */
const SIDE_BITE = over([
  '..............',
  '....kwkwkk....',
  '...kgggggdk...',
  '.kkgggwgggk...',
  'kddgggggggk...',
  '.kdgggggggk...',
  '..kdddddddk...',
  '..g...d..g....',
  '..dd..kk.dd...',
], BLOOM, 7, 0);

// Facing the viewer and facing away, 11 wide.
const FRONT_A = [
  '...........',
  '...kwkwk...',
  '..kdddddk..',
  '.kddgggddk.',
  'kdgggggggdk',
  'kdgggrgggdk',
  '.kdggrggdk.',
  '..kkkkkkk..',
  '.gg.....k..',
];
const FRONT_B = [
  '...........',
  '...kwkwk...',
  '..kdddddk..',
  '.kddgggddk.',
  'kdgggggggdk',
  'kdgggrgggdk',
  '.kdggrggdk.',
  '..kkkkkkk..',
  '..k.....gg.',
];
const FRONT_BITE = over([
  '...........',
  '...kwkwk...',
  '..kdddddk..',
  '.kddgggddk.',
  'kdgggggggdk',
  'kdgggggggdk',
  '.kdgggggdk.',
  '.gkkkkkkkgk',
  '.kk.....kk.',
], BLOOM, 2, 2);
const BACK_A = [
  '...........',
  '....kkk....',
  '...kgwgk...',
  '..kkgggkk..',
  '.kdddwdddk.',
  'kddddgddddk',
  'kddddwddddk',
  '.kdddgdddk.',
  '..gkkdkkk..',
];
const BACK_B = [
  '...........',
  '....kkk....',
  '...kgwgk...',
  '..kkgggkk..',
  '.kdddwdddk.',
  'kddddgddddk',
  'kddddwddddk',
  '.kdddgdddk.',
  '..kkkdkkg..',
];
/** From behind the petals show as a rose ruff round the head. */
const BACK_BITE = over([
  '...........',
  '....kkk....',
  '...kgwgk...',
  '..kkgggkk..',
  '.kdddwdddk.',
  'kddddgddddk',
  'kddddwddddk',
  '.kdddgdddk.',
  '.gk.kdk.kg.',
], [
  '...kkkkk...',
  '..krrrrrk..',
  '.krrkgkrrk.',
  '..kkgwgkk..',
], 0, 0);

/** The art for a view: trot frame 0 or 1, or the bite. */
function petArt(dir: FxView['dir'], bite: boolean, step: number): readonly string[] {
  if (dir === 'down') return bite ? FRONT_BITE : step ? FRONT_B : FRONT_A;
  if (dir === 'up') return bite ? BACK_BITE : step ? BACK_B : BACK_A;
  return bite ? SIDE_BITE : step ? SIDE_B : SIDE_A;
}

/** Paints rows of art from (x0, y0), runs of one color as one rect. Flipped, column 0 is at x0 and the art runs left from there. */
function paintRows(ctx: Ctx, rows: readonly string[], x0: number, y0: number, flip: boolean): void {
  rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i] as string;
      let n = 1;
      while (i + n < row.length && row[i + n] === ch) n++;
      const col = PET_PAL[ch];
      if (col) rect(ctx, flip ? x0 - i - n + 1 : x0 + i, y0 + j, n, 1, col);
      i += n;
    }
  });
}

/** A dithered oval of shadow under his feet, 10 wide and 2 deep, on the same world checker the actors' shadows use. */
function floorShadow(ctx: Ctx, x: number, y: number): void {
  [10, 6].forEach((w, j) => {
    for (let i = 0; i < w; i++) {
      const px = x - (w >> 1) + i, py = y - 1 + j;
      if (((px + py) & 1) === 0) rect(ctx, px, py, 1, 1, 'black');
    }
  });
}

/**
 * Dart: a small grey pollywog on four stubby legs with a tail, trotting on a two frame loop of 8 frames a step, whatever he is doing. His
 * head is a closed bud with a rose seam. While w is 1 he bites: the bud opens into a flower of dusky pink petals round a dark mouth.
 */
export function pet(ctx: Ctx, f: FxView): void {
  const x = Math.round(f.x), y = Math.round(f.y);
  const side = f.dir !== 'down' && f.dir !== 'up';
  floorShadow(ctx, x, y);
  paintRows(ctx, petArt(f.dir, f.w > 0, (f.t >> 3) & 1), side ? (f.dir === 'left' ? x + 6 : x - 6) : x - 5, y - 9, side && f.dir === 'left');
}

// ---------------------------------------------------------------- bottle
/** A bottle held neck up, 5 by 7 around (0, 0) at its middle: a rag at the top, glass with a bright edge, the fuel at the bottom. */
const BOTTLE = [
  '..b..',
  '.kmk.',
  '.kmk.',
  'kmmmk',
  'kwmmk',
  'kaaak',
  '.kkk.',
];
const BOTTLE_PAL: Record<string, ColorName> = { b: 'bone', k: 'ink', m: 'mist', w: 'white', a: 'amber' };
/** The flame over the rag in three flickers, as [across, up, color], 2 or 3 px tall. */
const FLICKER: readonly (readonly [number, number, ColorName])[][] = [
  [[0, 1, 'cream'], [-1, 1, 'orange'], [1, 1, 'orange'], [0, 2, 'yellow'], [0, 3, 'orange']],
  [[0, 1, 'cream'], [-1, 1, 'yellow'], [1, 1, 'orange'], [0, 2, 'yellow'], [1, 3, 'red']],
  [[0, 1, 'yellow'], [-1, 1, 'orange'], [1, 1, 'yellow'], [0, 2, 'orange'], [-1, 3, 'red']],
];

/**
 * Nancy's Molotov in flight: a glass bottle with a burning rag, tumbling end over end through four poses, three frames each, the flame
 * flickering over the rag. It is drawn h above (x, y), with a speck of shadow on the floor under it.
 */
export function bottle(ctx: Ctx, f: FxView): void {
  const cx = Math.round(f.x), cy = Math.round(f.y - f.h), turn = (f.t / 3 | 0) & 3;
  // A turn of a quarter clockwise sends the neck from up to right to down to left: (a, b) goes to (-b, a) each time.
  const spin = (a: number, b: number): [number, number] => (turn === 0 ? [a, b] : turn === 1 ? [-b, a] : turn === 2 ? [-a, -b] : [b, -a]);
  const gx = Math.round(f.x), gy = Math.round(f.y);
  rect(ctx, gx - 1, gy, 3, 1, 'black');
  BOTTLE.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = BOTTLE_PAL[row[i] as string];
      if (!col) continue;
      const [dx, dy] = spin(i - 2, j - 3);
      rect(ctx, cx + dx, cy + dy, 1, 1, col);
    }
  });
  for (const [across, up, col] of FLICKER[(f.t >> 1) % 3] as (readonly [number, number, ColorName])[]) {
    const [dx, dy] = spin(across, -3 - up);
    rect(ctx, cx + dx, cy + dy, 1, 1, col);
  }
}

// ---------------------------------------------------------------- fire
/** One pixel of the pool: its color, or null outside the flames. d is the squared distance from the middle, 0 there and 1 at the rim. */
function poolColor(i: number, j: number, d: number, t: number): ColorName | null {
  const wob = 1 + 0.16 * (unit(i >> 1, (j >> 1) + 3, 80 + ((t >> 2) & 3)) - 0.5) + 0.06 * Math.sin(Math.atan2(j * 2, i) * 4 + t * 0.15);
  if (d > wob) return null;
  const heat = 1 - Math.sqrt(d) + 0.4 * (unit(i, j, 84 + ((t >> 1) & 3)) - 0.5);
  if (heat < 0.12) return (i + j) & 1 ? 'red' : 'hot';
  if (heat < 0.34) return 'red';
  if (heat < 0.5) return 'orange';
  if (heat < 0.8) return 'amber';
  return heat > 1.02 ? 'cream' : 'yellow';
}

/**
 * The Molotov's pool: a flat ellipse w wide and w/2 tall of fire, a red rim round orange and amber with a yellow heart, flickering every
 * other frame, and sparse tongues rising 3 to 6 px that come up, sway and go out where they stood. It grows in over 6 frames and for the last
 * fifth of its life it shrinks and thins to embers.
 */
export function fire(ctx: Ctx, f: FxView): void {
  const W = f.w > 0 ? f.w : 48;
  const grow = easeOut(clamp(f.t / 6));
  const die = f.life > 0 ? clamp((f.life - f.t) / (f.life * 0.2)) : 1;
  const rx = (W / 2) * grow * (0.45 + 0.55 * die), ry = rx / 2;
  if (rx < 1) return;
  const cx = Math.round(f.x), cy = Math.round(f.y), dens = 0.3 + 0.7 * die;
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
    let run = 0, start = 0, last: ColorName | null = null;
    const flush = (end: number): void => { if (last && run > 0) rect(ctx, cx + start, cy + j, end - start, 1, last); run = 0; last = null; };
    for (let i = -Math.ceil(rx); i <= Math.ceil(rx) + 1; i++) {
      const col = i > Math.ceil(rx) ? null : poolColor(i, j, (i * i) / (rx * rx) + (j * j) / (ry * ry), f.t);
      const on = col !== null && keep(cx + i, cy + j, dens);
      if (!on || col !== last) { flush(i); if (on) { start = i; last = col; run = 1; } } else run++;
    }
  }
  // Tongues: each lives a cycle of 22 frames, rising and falling, then starts again somewhere else in the pool.
  const n = Math.round((W / 6) * die), tongues: [number, number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const age = f.t + k * 5, cycle = (age / 22) | 0, u = (age % 22) / 22;
    if (u < 0.1 || u > 0.92) continue;
    // Their feet lie toward the back of the pool, so the flames show above its rim.
    const by = (unit(k, cycle, 87) * 1.3 - 0.9) * ry, bx = (unit(k, cycle, 86) * 2 - 1) * rx * 0.85 * Math.sqrt(Math.max(0, 1 - (by * by) / (ry * ry)));
    tongues.push([Math.round(bx), Math.round(by), 3 + Math.round(3 * Math.sin(u * Math.PI) * die), k]);
  }
  tongues.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, h, k] of tongues) {
    const sway = Math.round(Math.sin(f.t * 0.3 + k * 1.7));
    for (let i = 0; i < h; i++) {
      const u = i / h, col: ColorName = u < 0.3 ? 'yellow' : u < 0.6 ? 'amber' : u < 0.85 ? 'orange' : 'red';
      const x = cx + bx + (i >= h >> 1 ? sway : 0);
      rect(ctx, x, cy + by - 1 - i, i < h / 2 ? 2 : 1, 1, col);
    }
  }
}

// ---------------------------------------------------------------- ring
const RING_RX = 9.5, RING_RY = 3.5, RING_SEGMENTS = 8;
/** The pixels of the ring, clockwise from the top: [across, down, how far round it is, 0 to 1], relative to the sprite's feet. */
let ringPixels: [number, number, number][] | null = null;
function ringAt(): [number, number, number][] {
  if (ringPixels) return ringPixels;
  const out: [number, number, number][] = [], seen = new Set<number>();
  const steps = 240;
  for (let s = 0; s < steps; s++) {
    const a = -Math.PI / 2 + (s / steps) * Math.PI * 2;
    // The sprite is 16 wide, so its middle is half a pixel left of the feet column.
    const dx = Math.round(-0.5 + Math.cos(a) * RING_RX), dy = Math.round(-1.5 + Math.sin(a) * RING_RY), key = dx * 64 + dy;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([dx, dy, s / steps]);
  }
  ringPixels = out;
  return out;
}

/**
 * The charge ring round a hero's feet, an ellipse 20 by 8, drawn under the sprite while a Special is held. It fills clockwise from the top
 * as charge goes 0 to 1: lit pixels in cyan and sky, eight segments told apart by their colors and by a gap, with a dither of dark track
 * where it is still empty and an ink edge under it so it reads on a light floor. Full, it is one ring that flashes white.
 */
export function chargeRing(ctx: Ctx, cx: number, cy: number, charge: number, t: number): void {
  const c = clamp(charge), full = c >= 1;
  const flash = full && (settings.reduceFlashing || ((t >> 3) & 1) === 0);
  const segs: number[] = [], lit: boolean[] = [];
  let last = -1;
  for (const [, , u] of ringAt()) {
    const seg = Math.min(RING_SEGMENTS - 1, (u * RING_SEGMENTS) | 0);
    // The first pixel of each segment is the gap before it, until the ring is full.
    segs.push(seg);
    lit.push(full || (u < c && seg === last));
    last = seg;
  }
  const px = ringAt();
  px.forEach(([dx, dy], i) => {
    const x = cx + dx, y = cy + dy;
    if (lit[i]) rect(ctx, x, y + 1, 1, 1, 'ink');
    else if (!full && ((x + y) & 1) === 0 && (px[i] as [number, number, number])[2] >= c) rect(ctx, x, y, 1, 1, 'dusk');
  });
  px.forEach(([dx, dy], i) => { if (lit[i]) rect(ctx, cx + dx, cy + dy, 1, 1, flash ? 'white' : (segs[i] as number) & 1 ? 'sky' : 'cyan'); });
}
