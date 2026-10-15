// Small painting helpers the tunnel looks share: a pixel trace along a polyline, a glowing vein along it, a wavy strand,
// and the shadow a wall throws on the floor beside it. No random noise: every look picks from hand made arrangements by the
// tile's variant, so a hall isn't stamped but nothing is speckle.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import type { TC } from './tunnel_kit.ts';

export type Pt = readonly [number, number];

/** Every pixel along a polyline, in order, with no repeats. */
export function trace(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Pt, b = pts[i + 1] as Pt;
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push([Math.round(a[0] + ((b[0] - a[0]) * k) / n), Math.round(a[1] + ((b[1] - a[1]) * k) / n)]);
  }
  return out;
}

export interface Glow { halo: ColorName; base: ColorName; mid: ColorName; bright: ColorName }

/** A vein along a polyline: a dim halo, a base line, and a pulse of brighter pixels that moves one step with the phase. */
export function vein(px: Px, pts: readonly Pt[], phase: number, g: Glow): void {
  const path = trace(pts);
  for (const [x, y] of path) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) px.set(x + dx, y + dy, g.halo);
  path.forEach(([x, y]) => px.set(x, y, g.base));
  path.forEach(([x, y], i) => {
    const k = (i + phase * 2) % 8;
    if (k === 0 || k === 1) px.set(x, y, g.mid);
    if (k === 1) px.set(x, y, g.bright);
  });
}

/** A strand along x with y given by a wave: top highlight, body of two rows, a shadow row under. */
export function strand(px: Px, y0: number, amp: number, shift: number, cols: [ColorName, ColorName, ColorName], thick = 2): void {
  for (let x = 0; x < 16; x++) {
    const y = Math.round(y0 + amp * Math.sin(((x + shift) / 16) * Math.PI * 2));
    px.set(x, y - 1, cols[0]);
    for (let k = 0; k < thick; k++) px.set(x, y + k, cols[1]);
    px.set(x, y + thick, cols[2]);
  }
}

/** The shadow a wall throws on the floor to its south and east: solid bands, light from the top left. */
export function shade(px: Px, c: TC, dark: ColorName, mid?: ColorName): void {
  if (c.sN) { px.rect(0, 0, 16, 2, dark); if (mid) px.rect(0, 2, 16, 1, mid); }
  if (c.sW) px.rect(0, 0, 1, 16, dark);
}

/** Rects from a list, [x, y, w, h]. */
export function rects(px: Px, list: readonly (readonly [number, number, number, number])[], col: ColorName): void {
  for (const [x, y, w, h] of list) px.rect(x, y, w, h, col);
}

/** Single pixels from a list. */
export function dots(px: Px, list: readonly Pt[], col: ColorName): void {
  for (const [x, y] of list) px.set(x, y, col);
}

/**
 * Lays a mound (a full tile of pods and membrane) over the floor with rounded, ink rimmed edges where its neighbors are open,
 * so a block of nest tiles reads as one lump and not a grid of squares.
 */
export function mound(base: Px, m: Px, c: TC, rim: ColorName = 'ink'): Px {
  const R = 4;
  const inside = (x: number, y: number): boolean => {
    if (x < 0) return c.sW;
    if (x > 15) return c.sE;
    if (y < 0) return c.sN;
    if (y > 15) return c.sS;
    const cx = Math.min(c.sW ? 99 : x, c.sE ? 99 : 15 - x), cy = Math.min(c.sN ? 99 : y, c.sS ? 99 : 15 - y);
    if (cx < 1 || cy < 1) return false;
    return !(cx < R && cy < R && (R - cx) ** 2 + (R - cy) ** 2 > R * R);
  };
  const out = new Px(16);
  out.d.set(base.d);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (inside(x, y)) out.d[y * 16 + x] = m.d[y * 16 + x] as number;
    else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) out.set(x, y, rim);
  }
  return out;
}

/** A root across the floor in one of four curves (by variant), thinner at the ends, with two twigs: cols is [hi, body, shadow]. */
export function curve(px: Px, v: number, cols: [ColorName, ColorName, ColorName]): void {
  const f = [(x: number) => 9 - 3 * Math.sin((x / 15) * Math.PI), (x: number) => 5 + 4 * Math.sin((x / 15) * Math.PI), (x: number) => 4 + x * 0.5, (x: number) => 12 - x * 0.45][v & 3] as (x: number) => number;
  for (let x = 0; x < 16; x++) {
    const y = Math.round(f(x)), t = x < 3 || x > 12 ? 1 : 2;
    px.set(x, y - 1, cols[0]);
    for (let k = 0; k < t; k++) px.set(x, y + k, cols[1]);
    px.set(x, y + t, cols[2]);
  }
  const up = v & 1 ? 1 : -1;
  for (const [x0, len, dir] of [[5, 5, up], [10, 4, -up]] as [number, number, number][]) {
    const y0 = Math.round(f(x0));
    for (let k = 1; k <= len; k++) { px.set(x0 + k, y0 + dir * k, cols[1]); if (k < len) px.set(x0 + k, y0 + dir * k - 1, cols[0]); }
    px.set(x0 + len + 1, y0 + dir * len, cols[0]);
  }
}

/** Vein routes by variant: each starts at the middle of a side, so tiles side by side join. Shared by the looks that draw veins as lines. */
export const VEIN_PATHS: Pt[][][] = [
  [[[0, 8], [4, 6], [8, 9], [12, 7], [15, 8]], [[8, 9], [9, 13], [8, 15]]],
  [[[0, 8], [5, 10], [9, 7], [15, 8]], [[9, 7], [12, 3], [15, 1]]],
  [[[0, 8], [6, 8], [8, 5], [8, 0]], [[6, 8], [9, 12], [15, 12]], [[8, 5], [13, 5], [15, 8]]],
  [[[0, 8], [7, 7], [9, 10], [15, 8]], [[7, 7], [6, 3], [8, 0]]],
];

/** Where three pods sit in a nest tile, by variant. */
export const POD_SPOTS: Pt[][] = [[[4, 5], [11, 5], [7, 11]], [[5, 4], [11, 9], [4, 12]], [[8, 4], [4, 9], [12, 12]], [[11, 4], [5, 8], [10, 12]]];

/**
 * A honeycomb of cells 8 wide and 6 tall, laid out in world pixels so it runs unbroken from tile to tile. Each pixel is a
 * border (near the line between two cells), a lit rim (the upper left of a cell's edge), or fill.
 */
export function hexes(px: Px, c: TC, fill: ColorName, border: ColorName, hi?: ColorName): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wx = c.tx * 16 + x, wy = c.ty * 16 + y;
      let d1 = 1e9, d2 = 1e9, rx = 0, ry = 0;
      for (let j = Math.floor(wy / 6) - 1; j <= Math.floor(wy / 6) + 1; j++) {
        const off = (j & 1) * 4 + 4;
        for (let i = Math.round((wx - off) / 8) - 1; i <= Math.round((wx - off) / 8) + 1; i++) {
          const dx = wx + 0.5 - (8 * i + off), dy = wy + 0.5 - (6 * j + 3), d = Math.hypot(dx, dy * 1.35);
          if (d < d1) { d2 = d1; d1 = d; rx = dx; ry = dy; } else if (d < d2) d2 = d;
        }
      }
      const e = d2 - d1;
      px.set(x, y, e < 1.5 ? border : hi && e < 2.7 && rx + ry < 0 ? hi : fill);
    }
  }
}

export interface CrackCols { hi: ColorName; lo: ColorName; glow: ColorName; chip: ColorName; chipHi: ColorName }

/** The break in a cracked wall (32 by 16, over two wall tiles): a zigzag fissure that opens wide in the middle with a seam of light down it, two branches, and rubble. */
export function fissure(px: Px, k: CrackCols): void {
  const zig = [0, 1, 2, 1, 0, -1, -2, -1, 0, 1, 2, 1, 0, -1, -2, -1];
  for (let y = 0; y < 16; y++) {
    const xc = 16 + (zig[y] as number), hw = Math.round(1 + 1.6 * Math.sin((Math.PI * (y + 1)) / 17));
    px.rect(xc - hw, y, hw * 2 + 1, 1, 'black').set(xc - hw - 1, y, k.hi).set(xc + hw + 1, y, k.lo).set(xc + (y % 4 < 2 ? 0 : 1), y, k.glow);
  }
  for (const [pts, glowAt] of [[[[14, 7], [10, 9], [6, 13]], 1], [[[18, 9], [23, 7], [27, 3]], 0]] as [number[][], number][]) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i] as number[], b = pts[i + 1] as number[];
      px.line(a[0] as number, (a[1] as number) - 1, b[0] as number, (b[1] as number) - 1, k.hi).line(a[0] as number, (a[1] as number) + 1, b[0] as number, (b[1] as number) + 1, k.lo).line(a[0] as number, a[1] as number, b[0] as number, b[1] as number, 'black');
    }
    const q = pts[glowAt] as number[];
    px.set(q[0] as number, q[1] as number, k.glow);
  }
  px.rect(2, 13, 6, 3, k.chip).rect(3, 12, 3, 1, k.chipHi).rect(23, 13, 7, 3, k.chip).rect(25, 12, 3, 1, k.chipHi).rect(11, 14, 3, 2, k.chip).rect(19, 14, 2, 2, k.chip);
}
