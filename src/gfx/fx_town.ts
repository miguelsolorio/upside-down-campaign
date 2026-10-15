// Two effects of stage 2.1. bolt: Will's sketch bolt, a small chalky star that spins as it crawls along with a few chalk
// dots in its wake. reveal: a hidden path showing itself, a shimmer of dithered light that sweeps down the prop and twinkles.
// Drawn with pixel-snapped rects from t and life alone, like the rest of fx.ts: no alpha, fades are dithers, and nothing
// changes brightness faster than 4 Hz.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

/** The sketch bolt: a plus that turns to an x and back every few frames, bone arms round a white heart, sky chalk dots, a dotted trail. */
export function bolt(ctx: Ctx, f: FxView, ang: number): void {
  const r = clamp(Math.round((f.w > 0 ? f.w : 8) * 0.5), 3, 5);
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 4; i++) {
    if (i > 2 && ((f.t >> 3) & 1) === 1) continue;
    rect(ctx, f.x - c * (r + i * 2.4), f.y - s * (r + i * 2.4), 1, 1, i < 3 ? 'bone' : 'mist');
  }
  const x = Math.round(f.x), y = Math.round(f.y), spin = (f.t >> 3) & 1;
  rect(ctx, x - 2, y - 2, 4, 4, 'dusk');
  const arm = (dx: number, dy: number, col: ColorName): void => { for (let i = 1; i <= r; i++) if (i < r || (hash2(x + dx, y + dy, f.t >> 3) & 1)) rect(ctx, x + dx * i, y + dy * i, 1, 1, i === r ? col : 'bone'); };
  if (spin === 0) { arm(1, 0, 'white'); arm(-1, 0, 'white'); arm(0, 1, 'white'); arm(0, -1, 'white'); }
  else { arm(1, 1, 'white'); arm(-1, 1, 'white'); arm(1, -1, 'white'); arm(-1, -1, 'white'); }
  rect(ctx, x - 1, y - 1, 2, 2, 'white');
  for (const [dx, dy] of spin === 0 ? [[2, 2], [-2, 2], [2, -2], [-2, -2]] : [[2, 0], [-2, 0], [0, 2], [0, -2]]) rect(ctx, x + dx, y + dy, 1, 1, 'sky');
}

/** The shimmer: x and y are the middle of the prop, w and h its size. A bright band sweeps down it, haze lines flicker, sparks climb. */
export function reveal(ctx: Ctx, f: FxView, p: number): void {
  const W = f.w > 0 ? f.w : 16, H = f.h > 0 ? f.h : 32;
  const x0 = Math.round(f.x - W / 2), y0 = Math.round(f.y - H / 2);
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  const band = Math.round(p * 1.6 * (H + 6)) - 3;
  for (let j = 0; j < H; j++) {
    const d = Math.abs(j - band);
    for (let i = 0; i < W; i++) {
      const x = x0 + i, y = y0 + j;
      if (!keep(x, y, fade)) continue;
      if (d < 2 && ((x + y) & 1) === 0) rect(ctx, x, y, 1, 1, d === 0 ? 'white' : 'cyan');
      else if (d < 5 && ((x + y) & 3) === 0) rect(ctx, x, y, 1, 1, 'sky');
      else if ((((i + (f.t >> 3)) & 3) === 0) && ((y + (f.t >> 4)) & 3) === 0) rect(ctx, x, y, 1, 1, 'sky');
    }
  }
  for (let k = 0; k < 6; k++) {
    const hx = hash2(k, 1, 91) % W, ph = (p * 1.4 + (hash2(k, 2, 91) % 100) / 100) % 1;
    const sy = Math.round(y0 + H - ph * (H + 8)), sx = x0 + hx;
    if (ph > 0.85 || !keep(sx, sy, fade)) continue;
    rect(ctx, sx, sy, 1, 1, k & 1 ? 'white' : 'cyan');
    if (ph < 0.4) { rect(ctx, sx - 1, sy, 1, 1, 'sky'); rect(ctx, sx + 1, sy, 1, 1, 'sky'); }
  }
  const rim = fade * 0.9;
  for (let i = 0; i < W; i++) for (const y of [y0, y0 + H - 1]) if (keep(x0 + i, y, rim * 0.5) && (i & 1) === 0) rect(ctx, x0 + i, y, 1, 1, 'sky');
  for (let j = 0; j < H; j++) for (const x of [x0, x0 + W - 1]) if (keep(x, y0 + j, rim * 0.5) && (j & 1) === 0) rect(ctx, x, y0 + j, 1, 1, 'sky');
}
