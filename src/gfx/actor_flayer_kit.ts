// Drawing helpers for the Mind Flayer (actor_flayer.ts), from the owner's pick, Meat Spider (gfx/var/flayer.ts): a three tone dither for
// shading (Bayer 4x4, no gradients, no alpha), a pixel-snapped tube that tapers along a polyline, a ball joint, a claw, and the cut end
// of a severed leg. Pure pixel work: no DOM until a Px becomes a canvas.
import { BAYER4, hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';

export type Pt = [number, number];
/** Dark, mid and light. */
export type Tone = [ColorName, ColorName, ColorName];

/** The raw meat of the body and the darker flesh of the legs. */
export const MEAT: Tone = ['blood1', 'red', 'rose'];
export const LIMB: Tone = ['blood0', 'blood1', 'red'];
export const KNOB: Tone = ['blood1', 'hot', 'pink'];

/** Bayer threshold at a pixel, 0 to 1. */
export const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;
export const rnd = (x: number, y: number, s = 0): number => hash2(x, y, s) / 4294967296;

/** A filled ellipse of three tones: light from the top left, the bands blended by a Bayer dither. `bias` lifts or sinks the light. */
export function shade(px: Px, cx: number, cy: number, rx: number, ry: number, tone: Tone, bias = 0): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const t = Math.max(0, Math.min(1, 0.5 - (nx * 0.55 + ny * 0.8) * 0.37 + bias)) * 2;
      px.set(x, y, tone[Math.min(2, Math.floor(t + bayer(x, y)))] as ColorName);
    }
  }
}

/** A brush: a w by w square centered on a pixel. */
function brush(px: Px, x: number, y: number, w: number, c: ColorName): void {
  const o = Math.floor((w - 1) / 2);
  px.rect(Math.round(x) - o, Math.round(y) - o, w, w, c);
}

/** Points along a polyline, one px apart, each with how far along it is (0 to 1). */
export function along(pts: Pt[]): { x: number; y: number; t: number }[] {
  const segs = pts.slice(1).map((b, i) => ({ a: pts[i] as Pt, b, len: Math.hypot(b[0] - (pts[i] as Pt)[0], b[1] - (pts[i] as Pt)[1]) }));
  const total = segs.reduce((s, q) => s + q.len, 0) || 1;
  const out: { x: number; y: number; t: number }[] = [];
  let run = 0;
  for (const q of segs) {
    const n = Math.max(1, Math.ceil(q.len));
    for (let k = 0; k < n; k++) out.push({ x: q.a[0] + ((q.b[0] - q.a[0]) * k) / n, y: q.a[1] + ((q.b[1] - q.a[1]) * k) / n, t: (run + (q.len * k) / n) / total });
    run += q.len;
  }
  const last = pts[pts.length - 1] as Pt;
  out.push({ x: last[0], y: last[1], t: 1 });
  return out;
}

/** A tapering pixel-snapped tube along a polyline: width w0 at the root to w1 at the tip, a dark edge below, a light edge above. */
export function tube(px: Px, pts: Pt[], w0: number, w1: number, tone: Tone): void {
  const path = along(pts);
  const wAt = (t: number): number => Math.max(1, Math.round(w0 + (w1 - w0) * t));
  for (const p of path) { const w = wAt(p.t); if (w >= 3) brush(px, p.x + 1, p.y + 1, w, tone[0]); }
  for (const p of path) brush(px, p.x, p.y, wAt(p.t), tone[1]);
  for (const p of path) { const w = wAt(p.t); if (w >= 3) brush(px, p.x - Math.floor(w / 4), p.y - Math.floor(w / 4), Math.max(1, w - 2), tone[2]); }
}

/** A ball joint or a lump: a small three tone ellipse. */
export const knob = (px: Px, p: Pt, r: number, tone: Tone): void => shade(px, p[0], p[1], r, r, tone);

/** A claw: a few px past the tip, in the direction of the last segment. */
export function claw(px: Px, pts: Pt[], len: number, w: number, c: ColorName): void {
  const a = pts[pts.length - 2] as Pt, b = pts[pts.length - 1] as Pt;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
  for (let i = 0; i < len; i++) brush(px, b[0] + ux * i, b[1] + uy * i, Math.max(1, Math.round(w * (1 - i / len))), c);
}

/** The unit step from a to b, straight down when they are one point. */
export function dir(a: Pt, b: Pt): Pt {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return d < 0.5 ? [0, 1] : [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

/** The cut end of a severed leg: a ring of raw flesh round a pale core. */
export function cutEnd(px: Px, p: Pt, r: number): void {
  shade(px, p[0], p[1], r, r, ['blood1', 'blood1', 'hot']);
  px.set(p[0], p[1], 'bone').set(p[0] + 1, p[1], 'bone').set(p[0], p[1] + 1, 'blood0');
}

/** The dark ragged hole the head leaves in the body when it is down. */
export function socket(px: Px, x: number, y: number, r: number): void {
  shade(px, x, y, r, r * 0.8, ['blood0', 'blood0', 'blood1']);
  for (let a = 0; a < 20; a++) { const t = (a / 20) * Math.PI * 2; px.set(x + Math.cos(t) * (r + 1), y + Math.sin(t) * (r * 0.8 + 1), a & 1 ? 'hot' : 'red'); }
}
