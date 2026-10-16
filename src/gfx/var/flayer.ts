// The kit under flayer-variations.html (docs/level-9.md): a sample food court arena, 22 by 14 tiles (352 by 224 px), with the Mind
// Flayer on its north wall, and what every design shares: the floor, the dithered shading, the tube a leg is drawn as, the warned line,
// the slam and the pool. A design (flayer_*.ts) is a body, a head, a leg and where the four legs are rooted. Each leg is a polyline from
// its root to its tip, pixel-snapped, up to 150 px long: that is what the game's gfx will draw from the sim's `aim`. No gradients and no
// alpha anywhere: shading is a three tone dither (Bayer 4x4) and smoke is pixels left out. Pure pixel work: no DOM until a Px becomes
// a canvas.
import { BAYER4, hash2 } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

export const AW = 352, AH = 224, TILE = 16;
export type Pt = [number, number];
export type LegState = 'idle' | 'warn' | 'slam' | 'severed';
/** Dark, mid and light. */
export type Tone = [ColorName, ColorName, ColorName];
export const MAX_LEG = 150;

export interface FlayerStyle {
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  /** Where the four legs are rooted along the body's front, left to right. */
  roots: Pt[];
  /** Where each tip rests on the floor when the leg is out. */
  rest: Pt[];
  /** How far the knee bows off the straight line from root to tip, in px, for a leg at full length, and how far it is lifted above that. */
  bow: number;
  lift?: number;
  /** The head's anchor while it is up. */
  head: Pt;
  /** The body without its head. Draws on a clear layer, which the kit outlines unless `smoke` is set. */
  body(px: Px): void;
  /** The head at an anchor. `down` is the head on the floor with the life gone out of it. */
  headPx(px: Px, x: number, y: number, down: boolean): void;
  /** One leg along its polyline, root first. The kit adds the cut end of a severed one. */
  leg(px: Px, pts: Pt[], st: LegState, i: number): void;
  /** No ink outline: the edge is the dither itself. */
  smoke?: boolean;
  /** Colors of the cut ends and the pools' accents. */
  cut: ColorName;
}

/** How hard to dither: Bayer threshold at a pixel, 0 to 1. */
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

/** A box filled with a dither of two colors. `level` is 0 (all `b`) to 16 (all `a`). */
export function dith(px: Px, x: number, y: number, w: number, h: number, a: ColorName, b: ColorName, level: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px.set(i, j, bayer(i, j) * 16 < level ? a : b);
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

/** A hand: `n` fingers fanned out ahead of the last point of a polyline, each `len` long, with a knuckle blob. */
export function hand(px: Px, pts: Pt[], n: number, len: number, tone: Tone): void {
  const a = pts[pts.length - 2] as Pt, b = pts[pts.length - 1] as Pt;
  const d = Math.atan2(b[1] - a[1], b[0] - a[0]);
  shade(px, b[0], b[1], 3, 3, tone);
  for (let k = 0; k < n; k++) {
    const t = d + (n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.5);
    const e: Pt = [b[0] + Math.cos(t) * len, b[1] + Math.sin(t) * len];
    px.line(b[0], b[1], e[0], e[1], tone[1]);
    px.set(e[0], e[1], tone[2]);
  }
}

/** The unit step from a to b. */
export function dir(a: Pt, b: Pt): Pt {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

/** A leg's polyline for a state. `aim` is the tip of the line it is warned on or slammed down. The knee bows up and out, and cocks high in a warn. */
export function legPts(style: FlayerStyle, i: number, st: LegState, aim: Pt | null): Pt[] {
  const bow = style.bow;
  const root = style.roots[i] as Pt, rest = style.rest[i] as Pt;
  const side = i < 2 ? -1 : 1;
  const bend = (a: Pt, b: Pt, k: number): Pt => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = dir(a, b);
    const n: Pt = [d[1], -d[0]];
    const s = n[1] <= 0 ? 1 : -1;
    return [mx + n[0] * s * k, my + n[1] * s * k];
  };
  if (st === 'severed') { const d = dir(root, rest); return [root, [root[0] + d[0] * 22, root[1] + d[1] * 22 + 4]]; }
  if (st === 'warn' && aim) {
    const d = dir(root, aim);
    const tip: Pt = [root[0] + d[0] * 46 + side * 6, root[1] + d[1] * 18 - 30];
    return [root, [root[0] + d[0] * 18 + side * 12, root[1] - 34], tip];
  }
  const lift = style.lift ?? 0;
  const up = (p: Pt): Pt => [p[0] + side * lift * 0.4, p[1] - lift];
  if (st === 'slam' && aim) return [root, up(bend(root, aim, bow * 0.3)), aim];
  return [root, up(bend(root, rest, bow)), rest];
}

/** The tip a leg slams to for a target: along the line from the root through it, `MAX_LEG` long, kept on the floor. */
export function aimTip(root: Pt, target: Pt, len = MAX_LEG): Pt {
  const d = dir(root, target);
  const k = Math.min(len, (AH - TILE - 4 - root[1]) / Math.max(0.2, d[1]));
  return [Math.round(root[0] + d[0] * k), Math.round(root[1] + d[1] * k)];
}

// ---------------------------------------------------------------- the arena
/** Plain food court floor with a pale patch under the skylight, stalls with lit menu boards on the north wall, and a wall round it. */
export function arena(): Px {
  const px = new Px(AW, AH).fill('night');
  for (let ty = 0; ty < AH / TILE; ty++) for (let tx = 0; tx < AW / TILE; tx++) px.rect(tx * TILE, ty * TILE, TILE, TILE, (tx + ty) & 1 ? 'night' : 'shadow');
  for (let y = 56; y < 152; y++) for (let x = 96; x < 256; x++) {
    const e = Math.min(x - 96, 255 - x, (y - 56) * 1.4, (151 - y) * 1.4);
    px.set(x, y, e > 8 || bayer(x, y) * 8 < e ? (((x >> 4) + (y >> 4)) & 1 ? 'dusk' : 'slate') : ((((x >> 4) + (y >> 4)) & 1) ? 'night' : 'shadow'));
  }
  px.rect(0, 0, AW, 16, 'ink').rect(0, 16, AW, 16, 'grey1');
  for (let x = 0; x < AW; x += 48) {
    px.rect(x, 0, 2, 32, 'purple0');
    px.rect(x + 14, 19, 20, 9, 'ink').rect(x + 15, 20, 18, 7, 'amber');
    for (let k = 0; k < 4; k++) px.rect(x + 17 + k * 4, 22 + (k & 1), 3, 1, 'ink').rect(x + 17 + k * 4, 25, 2, 1, 'orange');
  }
  px.rect(0, 30, AW, 2, 'purple0');
  px.rect(0, 0, TILE, AH, 'ink').rect(AW - TILE, 0, TILE, AH, 'ink').rect(0, AH - TILE, AW, TILE, 'ink');
  px.rect(TILE - 1, 32, 1, AH - 48, 'purple0').rect(AW - TILE, 32, 1, AH - 48, 'purple0').rect(TILE, AH - TILE, AW - 2 * TILE, 1, 'purple0');
  return px;
}

/** A pool of the Mind Flayer's goo, 20 px across: a dithered purple with a dark rim and a few bright specks. */
export function pool(px: Px, cx: number, cy: number, fade = 0): void {
  const rx = 20, ry = 13;
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1 || (fade && bayer(x, y) < fade * (0.3 + d))) continue;
      px.set(x, y, d > 0.8 ? 'purple0' : bayer(x, y) * 4 > 1 + (1 - d) * 2 ? 'purple' : 'purple0');
      if (d < 0.6 && rnd(x, y, 3) > 0.96) px.set(x, y, 'magenta');
    }
  }
}

/** The warned line: from the leg's root along the floor to the tip, dashed in red with an X at the end. */
export function warnLine(px: Px, root: Pt, tip: Pt): void {
  const path = along([root, tip]);
  path.forEach((p, k) => {
    if (p.y < 32) return;
    if (k % 6 < 4) { px.set(p.x, p.y, 'hot'); px.set(p.x + 1, p.y, 'red'); px.set(p.x, p.y + 1, 'red'); }
  });
  for (const [dx, dy] of [[-4, -4], [4, 4], [-4, 4], [4, -4]] as Pt[]) px.line(tip[0], tip[1], tip[0] + dx, tip[1] + dy, 'hot');
  px.line(tip[0] - 3, tip[1] - 3, tip[0] - 4, tip[1] - 4, 'amber').set(tip[0], tip[1], 'white');
}

/** The slam: a ring and eight spokes where the tip lands. */
export function slamFx(px: Px, p: Pt): void {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    px.line(p[0] + c * 6, p[1] + s * 4, p[0] + c * (k & 1 ? 11 : 15), p[1] + s * (k & 1 ? 7 : 10), k & 1 ? 'amber' : 'white');
  }
  for (let y = -6; y <= 6; y++) for (let x = -10; x <= 10; x++) {
    const d = (x * x) / 100 + (y * y) / 36;
    if (d > 0.7 && d < 1 && bayer(p[0] + x, p[1] + y) < 0.6) px.set(p[0] + x, p[1] + y, 'cream');
  }
}

/** The dark ragged hole the head leaves in the body when it is down. */
export function socket(px: Px, x: number, y: number, r: number): void {
  shade(px, x, y, r, r * 0.8, ['blood0', 'blood0', 'blood1']);
  for (let a = 0; a < 20; a++) { const t = (a / 20) * Math.PI * 2; px.set(x + Math.cos(t) * (r + 1), y + Math.sin(t) * (r * 0.8 + 1), a & 1 ? 'hot' : 'red'); }
}

/** The cut end of a severed leg: a ring of raw flesh round a pale core. */
export function cutEnd(px: Px, p: Pt, r: number, c: ColorName): void {
  shade(px, p[0], p[1], r, r, [c, c, 'hot']);
  px.set(p[0], p[1], 'bone').set(p[0] + 1, p[1], 'bone').set(p[0], p[1] + 1, 'blood0');
}
