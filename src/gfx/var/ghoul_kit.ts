// What the four Creel ghouls share (ghoul-variations.html, stage 4.2). A ghoul is drawn by hand in a 22 by 26 frame with its
// feet on row 24, limbs stroked between joints and a head drawn from art rows, the way vecna_kit.ts draws Vecna, then outlined
// in ink. The eight poses are the same for every design: in the glass, stepping out, stand, the two frames of its drift (its
// walk), the lunge, hurt and shatter. The first two are laid over the room's own mirror: the frame has the mirror's tile in it,
// at the place the mirror has in the Abandoned look of the Creel House, so a sprite of those two poses has only the ghoul in it
// and the ink of the dark glass. This file has the strokes and the shard cutter for the death.
// Pure pixel work: no DOM.
import type { ColorName } from '../palette.ts';
import { hash2 } from '../canvas.ts';
import { Px } from '../px.ts';

export const W = 22, H = 26, FEET = 24;
export type Pt = readonly [number, number];
export type Tri = readonly [Pt, Pt, Pt];
export type GPose = 'glass' | 'step' | 'stand' | 'driftA' | 'driftB' | 'lunge' | 'hurt' | 'shatter';
export const GPOSES: GPose[] = ['glass', 'step', 'stand', 'driftA', 'driftB', 'lunge', 'hurt', 'shatter'];
export const POSE_NAMES: Record<GPose, string> = {
  glass: 'IN THE GLASS', step: 'STEPPING OUT', stand: 'STAND', driftA: 'DRIFT A', driftB: 'DRIFT B', lunge: 'LUNGE', hurt: 'HURT', shatter: 'SHATTER',
};

export interface GhoulOpt {
  slug: string;
  name: string;
  note: string;
  /** One frame, 22 by 26, outlined. */
  draw(pose: GPose, phase?: number): Px;
}

/** The glass of the room's mirror in a frame (6 by 9), and the mirror's frame (10 by 13) whose top left is MIRROR. */
export const GLASS = { x0: 8, y0: 3, x1: 13, y1: 11 } as const;
/** The tile of the room's mirror starts this many px in from the left of a frame (and at its top). */
export const TILE_X = 3;

/** A stroke from a to b, w px wide (offset across the longer axis). */
export function seg(px: Px, a: Pt, b: Pt, w: number, col: ColorName): void {
  const flat = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  for (let k = 0; k < w; k++) px.line(a[0] + (flat ? 0 : k), a[1] + (flat ? k : 0), b[0] + (flat ? 0 : k), b[1] + (flat ? k : 0), col);
}

/** A run of strokes through points. */
export function chain(px: Px, pts: readonly Pt[], w: number, col: ColorName): void {
  for (let i = 0; i + 1 < pts.length; i++) seg(px, pts[i] as Pt, pts[i + 1] as Pt, w, col);
}

/** A filled triangle. */
export function tri(px: Px, a: Pt, b: Pt, c: Pt, col: ColorName): void {
  const x0 = Math.floor(Math.min(a[0], b[0], c[0])), x1 = Math.ceil(Math.max(a[0], b[0], c[0]));
  const y0 = Math.floor(Math.min(a[1], b[1], c[1])), y1 = Math.ceil(Math.max(a[1], b[1], c[1]));
  const e = (p: Pt, q: Pt, x: number, y: number): number => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const s = [e(a, b, x + 0.5, y + 0.5), e(b, c, x + 0.5, y + 0.5), e(c, a, x + 0.5, y + 0.5)];
      if (s.every((v) => v >= 0) || s.every((v) => v <= 0)) px.set(x, y, col);
    }
  }
}

/** Draws on a scratch buffer, then copies only the pixels that land on something already there: cracks, shade, a rim. */
export function over(px: Px, draw: (p: Px) => void): void {
  const t = new Px(px.w, px.h);
  draw(t);
  for (let i = 0; i < t.d.length; i++) if (t.d[i] && px.d[i]) px.d[i] = t.d[i] as number;
}

/** The same frame, mirrored left to right. */
export function flip(src: Px): Px {
  return new Px(src.w, src.h).blit(src, 0, 0, true);
}

/** Rows moved sideways: row y is shifted by dx(y) px. */
export function shear(src: Px, dx: (y: number) => number): Px {
  const out = new Px(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.d[y * src.w + x] as number; if (v) out.set(x + Math.round(dx(y)), y, v); }
  return out;
}

/** A piece of a shattering figure: its seed, and how far its piece moves. */
export type Seed = readonly [x: number, y: number, dx: number, dy: number];

/** The figure cut into shards (every pixel goes to its nearest seed) and each shard moved by its seed's offset. */
export function burst(src: Px, seeds: readonly Seed[]): Px {
  const out = new Px(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const v = src.d[y * src.w + x] as number;
      if (!v) continue;
      let best = 1e9, s = seeds[0] as Seed;
      for (const q of seeds) { const d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < best) { best = d; s = q; } }
      const nx = x + s[2], ny = y + s[3];
      if (nx >= 0 && ny >= 0 && nx < out.w && ny < out.h) out.d[ny * out.w + nx] = v;
    }
  }
  return out;
}

/**
 * The death: the figure cut into about n shards on a loose grid, each flung out from the middle and dropped toward the floor, the
 * ones that were high falling furthest, so it ends as a spray of pieces over a heap.
 */
export function shards(src: Px, step = 5, seed = 3): Px {
  const seeds: Seed[] = [];
  for (let gy = 2; gy < 26; gy += step) {
    for (let gx = 1; gx < 22; gx += step) {
      const h = hash2(gx, gy, seed), sx = gx + (h & 3), sy = gy + ((h >> 2) & 3);
      const out = Math.round((sx - 11) * 0.6) + ((h >> 4) & 1) - ((h >> 5) & 1);
      seeds.push([sx, sy, out, Math.max(0, Math.round((FEET - sy) * 0.55) + ((h >> 6) & 1) - 1)]);
    }
  }
  return burst(src, seeds);
}

/**
 * The finished frame. The figure is outlined; in the glass it is cut off at the glass's edge and laid on its dark (ink); stepping
 * out it comes over the frame, so it gets its outline and the glass behind it is dark.
 */
export function finish(pose: GPose, fig: Px): Px {
  if (pose !== 'glass' && pose !== 'step') return fig.outline('ink');
  const out = new Px(W, H).rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0 + 1, GLASS.y1 - GLASS.y0 + 1, 'ink');
  if (pose === 'step') return out.blit(fig.outline('ink'), 0, 0);
  const cut = new Px(W, H);
  for (let y = GLASS.y0; y <= GLASS.y1; y++) for (let x = GLASS.x0; x <= GLASS.x1; x++) cut.d[y * W + x] = fig.d[y * W + x] as number;
  return out.blit(cut, 0, 0);
}
