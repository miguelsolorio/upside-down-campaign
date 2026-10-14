// The Demogorgon's two effects. acid: a green glob lobbed through the air, then a splash where it lands. mark: a dark
// dithered ring on the floor that grows to its full size over its life, telegraphing where a glob or the leap will land.
// Drawn with pixel-snapped rects from t and life alone, like the rest of fx.ts: no alpha, fades are dithers.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { discPx, hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';

/** Frames the splash lasts at the end of a glob's life. A life this short or shorter is a bare splash. */
export const SPLASH_FRAMES = 14;
const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);

/** The glob in flight: a green blob with a lit edge, a wobble, two drops in its wake and a shadow that stays on the floor. */
function glob(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const lift = Math.round(Math.sin(p * Math.PI) * 9) + 3;
  const x = Math.round(f.x), y = Math.round(f.y);
  for (let i = -3; i <= 3; i++) if (((x + i + y) & 1) === 0) rect(ctx, x + i, y, 1, 1, 'black');
  const gy = y - lift;
  const wob = (f.t >> 3) & 1;
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 2; i++) {
    const d = 5 + i * 3 + (((f.t >> 3) + i) & 1);
    rect(ctx, x - c * d, gy - s * d * 0.5, 2 - (i >> 1), 2 - (i >> 1), i === 1 ? 'pine3' : 'pine2');
  }
  discPx(ctx, x, gy, 3, 'pine1');
  discPx(ctx, x, gy, wob ? 3 : 2, 'pine3');
  rect(ctx, x - 1, gy - 1, 2, 1, 'leaf');
  rect(ctx, x - 2 + wob, gy - 2, 1, 1, 'white');
  if (((f.t >> 3) & 3) === 0) rect(ctx, x + 2, gy + 2, 1, 1, 'pine1');
}

/** The splash: a puddle that spreads and thins to a dither, eight drops thrown outward, and a few bubbles that pop. */
function splash(ctx: Ctx, f: FxView, q: number): void {
  const R = Math.max(5, Math.round((f.w > 0 ? f.w : 28) / 2));
  const r = Math.max(2, Math.round(R * easeOut(clamp(q * 1.6))));
  const fade = q > 0.55 ? 1 - (q - 0.55) / 0.45 : 1;
  const x0 = Math.round(f.x), y0 = Math.round(f.y);
  for (let j = -r; j <= r; j++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
    for (let i = -half; i <= half; i++) {
      const x = x0 + i, y = y0 + j;
      const edge = i * i + j * j > (r - 2) * (r - 2);
      if (fade < 0.7 && ((x + y) & 1) !== 0) continue;
      if (fade < 0.35 && ((x & 1) !== 0 || (y & 1) !== 0)) continue;
      rect(ctx, x, y, 1, 1, edge ? 'pine3' : hash2(x, y, 7) % 7 === 0 ? 'leaf' : 'pine2');
    }
  }
  if (q < 0.7) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3, d = R * (0.4 + easeOut(q) * 0.9), lift = Math.sin(q * Math.PI) * 5;
      rect(ctx, x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 0.7 - lift, k & 1 ? 2 : 1, k & 1 ? 2 : 1, k & 2 ? 'leaf' : 'pine3');
    }
  }
  for (let k = 0; k < 3; k++) {
    const bx = x0 + (hash2(k, 4, 61) % (R + 1)) - (R >> 1), by = y0 + (hash2(k, 5, 61) % 5) - 2;
    if (((f.t >> 3) + k) % 3 < 2 && q > 0.2) rect(ctx, bx, by, 1, 1, 'white');
  }
}

/** acid: a glob for the first part of the life, then the splash. */
export function acid(ctx: Ctx, f: FxView, ang: number): void {
  const flight = f.life <= SPLASH_FRAMES + 6 ? 0 : f.life - SPLASH_FRAMES;
  if (f.t < flight) { glob(ctx, f, ang, clamp(f.t / Math.max(1, flight))); return; }
  splash(ctx, f, clamp((f.t - flight) / Math.max(1, f.life - flight)));
}

/**
 * mark: a ring of black dither that grows from the center to w across the life, with a faint dithered shadow inside it.
 * In the last quarter the ring thickens and goes solid, so the landing reads as close. A few red glints sit on the
 * ring so it still shows on a dark night floor.
 */
export function mark(ctx: Ctx, f: FxView, p: number): void {
  const R = Math.max(6, Math.round((f.w > 0 ? f.w : 28) / 2));
  const r = Math.max(2, Math.round(R * easeOut(clamp(p * 1.15))));
  const x0 = Math.round(f.x), y0 = Math.round(f.y);
  const thick = p > 0.75 ? 4 : 3;
  const solid = p > 0.9;
  for (let j = -r - 1; j <= r + 1; j++) {
    for (let i = -r - 1; i <= r + 1; i++) {
      const d = Math.hypot(i, j), x = x0 + i, y = y0 + j;
      if (d <= r + 0.5 && d > r - thick) {
        if (solid || ((x + y) & 1) === 0 || (d > r - 1.5 && ((x + y) & 3) !== 1)) rect(ctx, x, y, 1, 1, d > r - 1.5 ? 'black' : 'ink');
      } else if (d <= r - thick && (x & 1) === 0 && (y & 1) === 0 && ((x + y) & 7) === 0) {
        rect(ctx, x, y, 1, 1, 'black');
      }
    }
  }
  const glints = 6;
  for (let k = 0; k < glints; k++) {
    const a = (k / glints) * Math.PI * 2 + p * 0.6;
    const col: ColorName = k & 1 ? 'blood1' : 'blood0';
    rect(ctx, x0 + Math.cos(a) * (r + 1), y0 + Math.sin(a) * (r + 1), 1, 1, col);
  }
}
