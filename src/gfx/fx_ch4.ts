// The effects of level 11 (docs/level-11.md), drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are
// dithers. riff: Eddie's sound ring, x, y its center and w its diameter, the small one where his swing lands (28 px) and each pulse of the solo
// (up to 80): a white flash, then a ring of hot red that widens and thins with an echo behind it and a spoke of power chord at each corner of
// the compass. chime: a ring off a grandfather clock's face, w its diameter: bone rings, a little wrong, that wobble out of true and ring
// twice. walkman: notes round Max as she plays her Walkman, w the spread: a handful of notes in her tape's colors that rise and wind round
// her and thin out. And the small glass: a mirror breaking or a ghoul coming apart, a burst of shards thrown out and dropped to the floor
// (the same `glass` effect the Mind Flayer's skylight uses, at its small sizes). Pure pixel work: nothing here uses alpha.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

/** The widest an effect is drawn with the small glass: anything wider is the skylight (fx_l9.ts). */
export const SMALL_GLASS = 48;

/** A ring of single pixels, every pixel kept by the fade. `wob` bends its radius by up to that many px, a little different in each quarter. */
function ring(ctx: Ctx, cx: number, cy: number, r: number, color: ColorName, fade: number, wob = 0, seed = 0): void {
  if (r < 1) return;
  const n = Math.max(12, Math.ceil(r * 7));
  let lx = NaN, ly = NaN;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r + (wob ? Math.round(Math.sin(a * 2 + seed) * wob) : 0);
    const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
    if ((x === lx && y === ly) || !keep(x, y, fade)) continue;
    rect(ctx, x, y, 1, 1, color);
    lx = x; ly = y;
  }
}

// ---------------------------------------------------------------- riff
/** The sound ring: a flash at the heart for the first frames, then a ring two px thick, white at its edge going hot and then red as it widens, with an echo ring behind it and four spokes of the chord. */
export function riff(ctx: Ctx, f: FxView, p: number): void {
  const x = Math.round(f.x), y = Math.round(f.y), R = Math.max(5, (f.w > 0 ? f.w : 28) / 2);
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  if (p < 0.25) {
    const s = Math.max(1, Math.round(R * 0.22 * (1 - p * 3)));
    rect(ctx, x - s, y, s * 2 + 1, 1, 'white');
    rect(ctx, x, y - s, 1, s * 2 + 1, 'white');
    rect(ctx, x - 1, y - 1, 3, 3, 'cream');
  }
  const r = R * (0.25 + 0.75 * easeOut(clamp(p * 1.25)));
  const edge: ColorName = p < 0.3 ? 'white' : p < 0.6 ? 'hot' : 'red';
  ring(ctx, x, y, r, edge, fade);
  ring(ctx, x, y, r - 1, p < 0.3 ? 'hot' : 'red', fade);
  if (p > 0.15) ring(ctx, x, y, r * 0.62, 'blood1', fade * 0.7);
  if (p > 0.3) ring(ctx, x, y, r * 0.3, 'blood1', fade * 0.5);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4, len = Math.max(2, Math.round(R * 0.16));
    for (let i = 0; i < len; i++) {
      const d = r + 1 + i * 0.9, sx = Math.round(x + Math.cos(a) * d), sy = Math.round(y + Math.sin(a) * d);
      if (keep(sx, sy, fade)) rect(ctx, sx, sy, 1, 1, i === 0 ? 'white' : 'hot');
    }
  }
}

// ---------------------------------------------------------------- chime
/** One ring off the clock's face, in bone: it widens to w, wobbling a pixel out of true, and thins to a dither; a second one follows a few frames behind in mist. */
export function chime(ctx: Ctx, f: FxView, p: number): void {
  const x = Math.round(f.x), y = Math.round(f.y), R = Math.max(6, (f.w > 0 ? f.w : 40) / 2);
  const fade = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
  if (p < 0.2) {
    const s = 1 + Math.round(3 * (1 - p / 0.2));
    rect(ctx, x - s, y, s * 2 + 1, 1, 'cream');
    rect(ctx, x, y - s, 1, s * 2 + 1, 'cream');
  }
  ring(ctx, x, y, 3 + (R - 3) * easeOut(p), p < 0.35 ? 'white' : 'bone', fade, 1, 0.4);
  ring(ctx, x, y, 2 + (R - 4) * easeOut(clamp(p - 0.18)), 'mist', fade * 0.8, 1, 2.1);
  const ticks = 4;
  for (let k = 0; k < ticks; k++) {
    const a = (k * Math.PI * 2) / ticks + 0.4, d = R * easeOut(p) + 2, sx = Math.round(x + Math.cos(a) * d), sy = Math.round(y + Math.sin(a) * d);
    if (p < 0.6 && keep(sx, sy, fade)) rect(ctx, sx, sy, 1, 1, 'cream');
  }
}

// ---------------------------------------------------------------- walkman
/** A note: a head two px wide, a stem up from its right edge and a flag. (x, y) is the top of the stem. */
function note(ctx: Ctx, x: number, y: number, col: ColorName, flag: boolean): void {
  rect(ctx, x + 1, y, 1, 4, col);
  rect(ctx, x - 1, y + 3, 2, 2, col);
  if (flag) rect(ctx, x + 2, y, 1, 2, col);
}

const TAPE: ColorName[] = ['pink', 'cyan', 'yellow', 'white', 'magenta', 'sky'];

/** Notes round Max: each starts at the middle of the tape and winds out on its own spiral, rising as it goes, spreading to w and thinning out. */
export function walkman(ctx: Ctx, f: FxView, p: number): void {
  const x = f.x, y = f.y, W = (f.w > 0 ? f.w : 48) / 2, fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  for (let i = 0; i < 6; i++) {
    const born = i * 0.07, q = clamp((p - born) / (1 - born));
    if (q <= 0) continue;
    const a = (i / 6) * Math.PI * 2 + q * 2.4 * (i & 1 ? -1 : 1) + unit(i, 1, 41), d = 4 + (W - 4) * easeOut(q) * (0.7 + 0.3 * unit(i, 2, 41));
    const nx = Math.round(x + Math.cos(a) * d), ny = Math.round(y + Math.sin(a) * d * 0.6 - q * 12);
    if (!keep(nx, ny, fade)) continue;
    note(ctx, nx, ny, TAPE[i] as ColorName, i % 3 !== 1);
    if (q < 0.25) rect(ctx, nx + 3, ny - 1, 1, 1, 'white');
  }
}

// ---------------------------------------------------------------- the small glass
const SHARD: ColorName[] = ['white', 'sky', 'cyan', 'bone'];

/**
 * A mirror or a ghoul breaking: a flash of white at the middle, then twenty shards thrown out across w, each up and over and down to the
 * floor, where they lie a moment and thin away. (x, y) is the middle of what broke.
 */
export function smallGlass(ctx: Ctx, f: FxView, p: number): void {
  const x = Math.round(f.x), y = Math.round(f.y), W = Math.max(12, (f.w > 0 ? f.w : 16) * 0.75);
  const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
  if (p < 0.22) {
    const s = Math.max(2, Math.round(W * 0.35 * (1 - p / 0.22)));
    for (let j = -s; j <= s; j++) { const w = s - Math.abs(j); rect(ctx, x - w, y + j, w * 2 + 1, 1, Math.abs(j) < 2 ? 'white' : 'sky'); }
  }
  for (let i = 0; i < 20; i++) {
    const side = unit(i, 1, 77) * 2 - 1, out = side * W * easeOut(clamp(p * 1.5)), launch = 6 + unit(i, 2, 77) * 12;
    const q = clamp(p * 1.3), arc = Math.sin(q * Math.PI * 0.62) * launch, floor = 8 + unit(i, 3, 77) * 12;
    const sx = Math.round(x + out), sy = Math.round(Math.min(y + floor, y - arc + q * q * (floor + launch)));
    if (!keep(sx, sy, fade)) continue;
    const landed = sy >= y + floor - 1, c = SHARD[i & 3] as ColorName;
    if (landed) rect(ctx, sx, sy, 3, 1, c);
    else { rect(ctx, sx, sy, 2, 2, c); rect(ctx, sx + 1, sy, 1, 1, 'white'); }
  }
}
