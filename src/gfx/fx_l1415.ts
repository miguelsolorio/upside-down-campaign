// The effect of the Abyss (docs/level-15.md), drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// fall: a twin Demogorgon going over the edge into the void. x, y the edge it went over, w its width, life the fall. A red flash along the lip, a
// ring of dust off it, chunks of the edge breaking away and tumbling down at their own speeds, and streaks falling past under it that grow
// longer and redder as the drop picks up speed. The twin itself is drawn dropping and shrinking by its pose (actor_twin.ts).
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

const ROCK: ColorName[] = ['soil3', 'sand', 'soil2', 'grey3', 'soil1'];
const STREAK: ColorName[] = ['blood1', 'red', 'hot'];

/** The fall. */
export function fall(ctx: Ctx, f: FxView, p: number): void {
  const W = f.w > 0 ? f.w : 24, x0 = Math.round(f.x - W / 2), y = Math.round(f.y);
  const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
  // The flash along the lip: hot red, thinning in the first quarter.
  if (p < 0.25) {
    rect(ctx, x0, y, W, 1, 'white');
    rect(ctx, x0 + 1, y + 1, W - 2, 1, p < 0.12 ? 'hot' : 'red');
  }
  // Dust off the lip: a ring of specks that spreads and rises a little.
  if (p < 0.5) {
    const r = 3 + 11 * Math.sqrt(p * 2);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2, px = Math.round(f.x + Math.cos(a) * r * (W / 24)), py = Math.round(y - 1 + Math.sin(a) * r * 0.35 - p * 6);
      if ((i & 1) === 0 && keep(px, py, 1 - p * 2)) rect(ctx, px, py, 1, 1, i % 4 === 0 ? 'white' : 'bone');
    }
  }
  // Chunks of the edge: they let go one after another, then fall faster and faster, drifting a little, and thin out.
  for (let k = 0; k < 9; k++) {
    const delay = unit(k, 2, 150) * 0.3, q = clamp((p - delay) / (1 - delay));
    if (q <= 0) continue;
    const cx = x0 + Math.round(unit(k, 1, 150) * (W - 2)) + Math.round((unit(k, 3, 150) - 0.5) * 6 * q);
    const cy = y + 1 + Math.round(q * q * (26 + unit(k, 4, 150) * 12));
    if (!keep(cx, cy, fade)) continue;
    const big = k % 3 === 0 ? 2 : 1;
    rect(ctx, cx, cy, big, big, ROCK[k % ROCK.length] as ColorName);
    if (big === 2) rect(ctx, cx, cy + 1, 2, 1, 'soil1');
  }
  // Streaks falling past: short at first, then long and hot as the drop speeds up.
  if (p > 0.1 && p < 0.85) {
    const q = clamp((p - 0.1) / 0.75);
    for (let k = 0; k < 5; k++) {
      const sx = x0 + 2 + Math.round(((k + 0.5) / 5) * (W - 4)) + (k & 1), len = 2 + Math.round(q * 9) + (k % 3);
      const top = y + 3 + Math.round(q * q * 24) + (k % 2) * 3;
      for (let i = 0; i < len; i++) if (keep(sx, top + i, fade)) rect(ctx, sx, top + i, 1, 1, STREAK[Math.min(2, Math.floor((i / len) * 3))] as ColorName);
    }
  }
}
