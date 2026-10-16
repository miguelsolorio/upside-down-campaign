// The rig under the demobats (demobat_kit.ts): the types a design is written in, and the wing painter. A wing is drawn as a
// silhouette mask of its left half, 8 columns by up to 11 rows, the last column the middle of the bat: '#' is membrane and '*'
// the end of a finger, where a rib runs to from the shoulder (it may reach past the membrane as a spike). The painter turns the
// mask into half-art rows in the design's own letters: membrane, ribs, the leading edge (the top pixel of each column) and the
// trailing edge (the bottom one). Pure: no DOM.
import type { ColorName } from '../palette.ts';

/** The mask space: 8 columns, the last the middle of the bat, by MH rows. */
export const MH = 11;

export type Pt = readonly [number, number];
export type Art = readonly string[];
export type Pose = 'up' | 'mid' | 'mid2' | 'down' | 'glide' | 'dive' | 'stun';
export type Masks = Record<Pose, Art>;

export interface WingStyle {
  /** Letters for the membrane, the ribs, the leading edge and the trailing edge, and the end of a finger. */
  m: string; v: string; e: string; t: string; end: string;
  /** Spike: pixels a rib runs on past its end. Cut: take the lowest pixel off every column that doesn't end a finger. */
  spike?: number; cut?: boolean;
  /** Ribs run the whole way to their end even where there is no membrane, so a finger can stand out of the web. */
  reach?: boolean;
  shoulder?: Pt;
}

export interface Look {
  /** Letter to color. 'k' is ink drawn inside the sprite; 'w' (the flash) and 'y' (the stars) are the same in every design. */
  pal: Record<string, ColorName>;
  masks: Masks;
  wing: WingStyle;
  body: Art;
  closed: Art;
  open: Art;
  /** The tail's letters: the stem, then the barbed end. */
  tail: readonly [string, string];
}

/** Pixels on a line, both ends included. */
export function lineTo(a: Pt, b: Pt): Pt[] {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  return Array.from({ length: n + 1 }, (_, i) => [Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n)] as Pt);
}

/** Paints a wing mask into half-art rows (8 columns by MH). */
export function wingArt(mask: Art, st: WingStyle): string[] {
  const grid: string[][] = Array.from({ length: MH }, (_, y) => Array.from({ length: 8 }, (_, x) => mask[y]?.[x] ?? '.'));
  const has = (x: number, y: number): boolean => grid[y]?.[x] === '#' || grid[y]?.[x] === '*';
  const ends: Pt[] = [];
  grid.forEach((row, y) => row.forEach((c, x) => { if (c === '*') ends.push([x, y]); }));
  if (st.cut) {
    for (let x = 0; x < 6; x++) {
      let low = -1;
      for (let y = 0; y < MH; y++) if (has(x, y)) low = y;
      if (low < 0 || grid[low]![x] === '*' || ends.some(([ex]) => Math.abs(ex - x) <= 1)) continue;
      if (has(x, low - 2)) grid[low]![x] = '.';
    }
  }
  const out: string[][] = grid.map((row) => row.map((c) => (c === '#' || c === '*' ? st.m : '.')));
  const sh = st.shoulder ?? [6, 4];
  const put = (x: number, y: number, c: string): void => { if (x >= 0 && x < 8 && y >= 0 && y < MH) (out[y] as string[])[x] = c; };
  for (const e of ends) {
    for (const [x, y] of lineTo(sh, e)) if (st.reach || has(x, y)) put(x, y, st.v);
    const dx = e[0] - sh[0], dy = e[1] - sh[1], len = Math.hypot(dx, dy) || 1;
    for (let s = 1; s <= (st.spike ?? 0); s++) put(Math.round(e[0] + (dx / len) * s), Math.round(e[1] + (dy / len) * s), st.v);
    put(e[0], e[1], st.end);
  }
  for (let x = 0; x < 8; x++) {
    let top = -1, low = -1;
    for (let y = 0; y < MH; y++) if (has(x, y)) { if (top < 0) top = y; low = y; }
    if (top < 0) continue;
    if (out[top]![x] === st.m) put(x, top, st.e);
    if (out[low]![x] === st.m && low !== top) put(x, low, st.t);
  }
  return out.map((r) => r.join(''));
}
