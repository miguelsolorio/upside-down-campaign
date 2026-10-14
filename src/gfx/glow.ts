// Painted light pools for night stages. Around each real light (a lamp, a lit window, a string of bulbs, a
// floodlight, the lantern) the ground is lifted and warmed in four dithered steps. It is a decal around the
// light, drawn after the tiles and before the sprites, so nothing else on the screen is dimmed or covered.
// Every pixel is lifted by a whole step, so the pools stay in the pixel-art look with no alpha gradients.
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { settings } from '../core/settings.ts';
import { BAYER4, hash2 } from './canvas.ts';
import type { Ctx } from './canvas.ts';

/** A pool of light. x and y are in SCREEN px, so the world area starts at VIEW_TOP. */
export interface Glow {
  x: number;
  y: number;
  /** Radius in px. */
  r: number;
  /** Strength: 1 is the usual, more makes the pool brighter and reach further into the dither. */
  k?: number;
  /** How much the radius jitters. 0 is steady. */
  flicker?: number;
}

const W = SCREEN_W;
const H = SCREEN_H - VIEW_TOP;
const N = W * H;
const step = new Uint8Array(N);
/** How much brighter each step is: 0 is untouched, 4 is the heart of the pool. */
const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
/** The color a light adds: amber, so the pools read as warm against the green woods. */
const WARM = [255, 190, 90];

/** Paints the pools onto what is already on the canvas. level scales every pool, for a stutter or a fade. */
export function paintGlow(ctx: Ctx, lights: readonly Glow[], t: number, level = 1): void {
  if (lights.length === 0 || level <= 0) return;
  step.fill(0);
  const calm = settings.reduceFlashing;
  lights.forEach((L, li) => {
    const jitter = !calm && L.flicker ? ((hash2(li, (t / 3) | 0, 31) % 200) - 100) / 100 : 0;
    const R = Math.round(L.r * (1 + (L.flicker ?? 0) * 0.14 * jitter));
    if (R < 2) return;
    const cx = Math.round(L.x), cy = Math.round(L.y) - VIEW_TOP;
    const x0 = Math.max(0, cx - R), x1 = Math.min(W - 1, cx + R);
    const y0 = Math.max(0, cy - R), y1 = Math.min(H - 1, cy + R);
    const k = (L.k ?? 1) * level * 4;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= R) continue;
        const f = 1 - d / R;
        const q = f * f * (3 - 2 * f) * k, lo = Math.floor(q);
        // Ordered dither between steps: a Bayer threshold decides whether this pixel rounds up.
        const s = Math.min(4, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        const i = y * W + x;
        if (s > (step[i] as number)) step[i] = s;
      }
    }
  });
  const img = ctx.getImageData(0, VIEW_TOP, W, H);
  const px = img.data;
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const s = step[i] as number;
    if (s === 0) continue;
    const lift = LIFT[s] as number;
    px[p] = Math.min(255, (px[p] as number) * (1 + lift) + (WARM[0] as number) * lift * 0.2);
    px[p + 1] = Math.min(255, (px[p + 1] as number) * (1 + lift) + (WARM[1] as number) * lift * 0.2);
    px[p + 2] = Math.min(255, (px[p + 2] as number) * (1 + lift) + (WARM[2] as number) * lift * 0.2);
  }
  ctx.putImageData(img, 0, VIEW_TOP);
}
