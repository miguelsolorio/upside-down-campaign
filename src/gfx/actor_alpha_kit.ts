// Drawing helpers for the Demodog Alpha (actor_alpha.ts), in the style of actor_dog.ts: a body of shaded lumps, thin jointed legs, bone
// spikes, and a head that is a shut bud or a small flower of petals round a black mouth. The Stalker is four fill colors and the ink
// outline: D shade, G body, B bone and highlight, R the flesh inside the mouth. Pure pixel work: no DOM.
import type { ColorName } from './palette.ts';
import { blob } from './actor_demo_head.ts';
import { Px } from './px.ts';

export type Pt = readonly [number, number];
export interface Cols { D: ColorName; G: ColorName; B: ColorName; R: ColorName }
export const K: ColorName = 'ink';
/** The Stalker: cold blue chitin with a cyan shine and bone inside the mouth. */
export const STALKER: Cols = { D: 'teal0', G: 'teal1', B: 'cyan', R: 'bone' };

/** A shaded lump: shade offset down and right, the body color, a bright highlight up and left. */
export function lump(px: Px, cx: number, cy: number, rx: number, ry: number, c: Cols, lit = true): void {
  px.ellipse(cx + 0.5, cy + 0.6, rx, ry, c.D).ellipse(cx, cy, rx, ry, c.G);
  if (lit) px.ellipse(cx - rx * 0.3, cy - ry * 0.35, Math.min(rx * 0.38, 2.2), Math.min(ry * 0.32, 1.6), c.B);
}

/** A polyline w pixels wide, drawn as w parallel lines. The last one is the edge color when there is one, for a shaded side. */
export function limb(px: Px, pts: readonly Pt[], col: ColorName, w = 1, edge?: ColorName): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Pt, b = pts[i + 1] as Pt;
    const steep = Math.abs(b[1] - a[1]) >= Math.abs(b[0] - a[0]);
    for (let k = w - 1; k >= 0; k--) {
      const ox = steep ? k : 0, oy = steep ? 0 : k;
      px.line(a[0] + ox, a[1] + oy, b[0] + ox, b[1] + oy, k === w - 1 && w > 1 && edge ? edge : col);
    }
  }
}

/** A leg: hip, knee, foot, with a bright knee and a bone toe. Far legs are in the shade. */
export function stilt(px: Px, hip: Pt, knee: Pt, foot: Pt, c: Cols, far: boolean): void {
  limb(px, [hip, knee, foot], far ? c.D : c.G, 1);
  if (!far) px.set(knee[0], knee[1] - 1, c.B);
  px.set(foot[0] + 1, foot[1], c.B);
}

/** Bone spikes along a line from a to b, pointing up by the given length. */
export function spikes(px: Px, a: Pt, b: Pt, n: number, c: Cols, len = 1): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
    for (let k = 1; k <= len; k++) px.set(x, y - k, k === len ? c.B : c.G);
  }
}

/** The shut head: a pointed bud with one bright seam, lit up and left. */
export function bud(px: Px, cx: number, cy: number, ang: number, a: number, b: number, c: Cols): void {
  blob(px, cx + 0.5, cy + 0.5, ang, a, b, c.D);
  blob(px, cx, cy, ang, a, b, c.G);
  px.set(Math.round(cx - a * 0.4), Math.round(cy - b * 0.5), c.B);
}

/**
 * The open head: n petals round a black mouth. sx squeezes it sideways (1 faces you, 0.5 is turned away), tilt turns it, and
 * size is the petal reach. A petal is dark behind, mid on top and flesh inside, with a bone tooth in the mouth.
 */
export function bloom(px: Px, cx: number, cy: number, size: number, n: number, sx: number, tilt: number, c: Cols): void {
  for (let i = 0; i < n; i++) {
    const a = tilt + (i * Math.PI * 2) / n;
    const dx = Math.cos(a) * sx, dy = Math.sin(a), ang = Math.atan2(dy, dx), len = Math.hypot(dx, dy);
    const x0 = cx + (dx / len) * size * 0.95 * len, y0 = cy + (dy / len) * size * 0.95 * len;
    blob(px, x0 + 0.4, y0 + 0.4, ang, size * 0.78, size * 0.42, c.D);
    blob(px, x0, y0, ang, size * 0.78, size * 0.42, c.G);
    blob(px, x0, y0, ang, size * 0.5, size * 0.22, c.R);
  }
  px.ellipse(cx, cy, size * 0.45 * (0.55 + 0.45 * sx), size * 0.45, K);
  px.set(Math.round(cx - 1 + sx), Math.round(cy - 1), c.B);
}
