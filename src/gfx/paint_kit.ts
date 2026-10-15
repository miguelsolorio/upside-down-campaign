// Small painting helpers the mall and base tiles share, in the sheets (gfx/var/) and in the game (tile_mall.ts, tile_base.ts, props_base.ts):
// the shadow a wall throws on the floor, stripes, a hazard border, a keypad, a pot of leaves, a puddle of goo, a bolt, and the Cyrillic of
// the cipher door. Nothing is random noise: every look picks from hand made arrangements by the tile's variant, so a floor isn't stamped
// and nothing is speckle. Pure pixel work.
import type { Paint } from './px.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';

/** What a painter knows about its place: the variant (0 to 3), which neighbors are solid, which are the same kind, and for a cap whether a wall face is right below it. */
export interface MC { tx: number; ty: number; v: number; sN: boolean; sS: boolean; sE: boolean; sW: boolean; kN: boolean; kS: boolean; kE: boolean; kW: boolean; lipS: boolean }

export type Pt = readonly [number, number];

/** The shadow a wall throws on the floor to its south and east: solid bands, light from the top left. */
export function shade(px: Px, c: MC, dark: Paint, mid?: Paint): void {
  if (c.sN) { px.rect(0, 0, 16, 2, dark); if (mid) px.rect(0, 2, 16, 1, mid); }
  if (c.sW) px.rect(0, 0, 1, 16, dark);
}

/** Single pixels from a list. */
export function dots(px: Px, list: readonly Pt[], col: Paint): void {
  for (const [x, y] of list) px.set(x, y, col);
}

/** Rects from a list, [x, y, w, h]. */
export function rects(px: Px, list: readonly (readonly [number, number, number, number])[], col: Paint): void {
  for (const [x, y, w, h] of list) px.rect(x, y, w, h, col);
}

/** Vertical stripes across a box: `a` for the first `wa` columns of each period, `b` for the rest. */
export function vstripes(px: Px, x: number, y: number, w: number, h: number, period: number, wa: number, a: Paint, b: Paint, shift = 0): void {
  for (let i = 0; i < w; i++) px.rect(x + i, y, 1, h, (i + shift) % period < wa ? a : b);
}

/** Horizontal stripes across a box. */
export function hstripes(px: Px, x: number, y: number, w: number, h: number, period: number, wa: number, a: Paint, b: Paint, shift = 0): void {
  for (let j = 0; j < h; j++) px.rect(x, y + j, w, 1, (j + shift) % period < wa ? a : b);
}

/** A diagonal warning border, `band` px wide, in two colors, round a box. The inside is left alone. */
export function hazard(px: Px, x: number, y: number, w: number, h: number, band: number, a: Paint, b: Paint): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (i >= band && i < w - band && j >= band && j < h - band) continue;
      px.set(x + i, y + j, (i + j) % 8 < 4 ? a : b);
    }
  }
}

/** A plain 1 px frame in a color on a box. */
export function box(px: Px, x: number, y: number, w: number, h: number, fill: Paint, edge: Paint): void {
  px.rect(x, y, w, h, fill).frame(x, y, w, h, edge);
}

/**
 * A keypad: a panel with a 3 by 4 grid of small keys, each key two pixels wide and three tall with a mark in it, so the
 * keys read as letters at 1x without a font. `mark` colors the marks.
 */
export function keypad(px: Px, x: number, y: number, panel: Paint, key: Paint, mark: Paint, led: Paint): void {
  px.rect(x, y, 10, 14, panel);
  px.rect(x + 1, y + 1, 8, 2, led);
  const glyphs = [[1, 0, 1], [0, 1, 0], [1, 1, 0], [0, 1, 1]];
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 3; k++) {
      const kx = x + 1 + k * 3, ky = y + 4 + r * 3;
      px.rect(kx, ky, 2, 2, key);
      if ((glyphs[(r + k) % 4] as number[])[k]) px.set(kx, ky, mark); else px.set(kx + 1, ky + 1, mark);
    }
  }
}

/** A tuft of leaves: strokes from a root out to tips, a body color and a highlight at the tips. */
export function leaves(px: Px, rx: number, ry: number, tips: readonly Pt[], body: Paint, tip: Paint): void {
  for (const [tx, ty] of tips) {
    px.line(rx, ry, tx, ty, body);
    px.set(tx, ty, tip);
  }
}

/** A lightning bolt, 7 tall, by its top left. */
export function bolt(px: Px, x: number, y: number, col: Paint): void {
  dots(px, [[x + 3, y], [x + 2, y + 1], [x + 1, y + 2], [x + 2, y + 2], [x + 3, y + 2], [x + 2, y + 3], [x + 1, y + 4], [x, y + 5], [x + 1, y + 5], [x, y + 6]], col);
}

export interface GooStyle { body: Paint; rim: Paint; hi: Paint; spec: Paint; seed: number }

/**
 * A puddle of the Flayed's goo with an organic edge that runs unbroken from tile to tile: it is cut from a smooth field laid out in
 * world pixels, so two goo tiles side by side are one puddle, and it thins toward every side that has no goo beyond it. The rim is
 * a darker line round the edge, the wet patches are a lighter color, and a few bubbles catch the light.
 */
export function gooTile(c: MC, st: GooStyle): Px {
  const px = new Px(16);
  const s = st.seed;
  const field = (wx: number, wy: number): number => 0.5 + 0.22 * Math.sin(wx * 0.29 + s) + 0.22 * Math.sin(wy * 0.33 + s * 1.7) + 0.16 * Math.sin((wx + wy) * 0.23 + s * 0.6) + 0.1 * Math.sin((wx - wy) * 0.41 + s);
  const inside = new Uint8Array(256), f = new Float32Array(256);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wx = c.tx * 16 + x, wy = c.ty * 16 + y;
      let pen = 0;
      if (!c.kW) pen += Math.max(0, (6 - x) / 6);
      if (!c.kE) pen += Math.max(0, (6 - (15 - x)) / 6);
      if (!c.kN) pen += Math.max(0, (6 - y) / 6);
      if (!c.kS) pen += Math.max(0, (6 - (15 - y)) / 6);
      f[y * 16 + x] = field(wx, wy) - pen * 0.5;
      inside[y * 16 + x] = f[y * 16 + x]! > 0.4 ? 1 : 0;
    }
  }
  const at = (x: number, y: number): number => (x < 0 ? (c.kW ? 1 : 0) : x > 15 ? (c.kE ? 1 : 0) : y < 0 ? (c.kN ? 1 : 0) : y > 15 ? (c.kS ? 1 : 0) : (inside[y * 16 + x] as number));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!inside[y * 16 + x]) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      const v = f[y * 16 + x] as number;
      px.set(x, y, edge ? st.rim : v > 0.78 ? st.hi : st.body);
      if (!edge && v > 0.7 && (hash2(c.tx * 16 + x, c.ty * 16 + y, s * 10) & 15) === 0) px.set(x, y, st.spec);
    }
  }
  return px;
}

/** Pale blocks of the Cyrillic the cipher door shows: 3 by 5 glyphs for the letters of СТОП, ВХОД-free so no foot is needed. */
export const CYR: Record<string, string[]> = {
  С: ['###', '#..', '#..', '#..', '###'], Т: ['###', '.#.', '.#.', '.#.', '.#.'], О: ['###', '#.#', '#.#', '#.#', '###'], П: ['###', '#.#', '#.#', '#.#', '#.#'],
  А: ['.#.', '#.#', '###', '#.#', '#.#'], Х: ['#.#', '#.#', '.#.', '#.#', '#.#'], В: ['##.', '#.#', '##.', '#.#', '##.'], З: ['##.', '..#', '.#.', '..#', '##.'],
  К: ['#.#', '#.#', '##.', '#.#', '#.#'], Р: ['##.', '#.#', '##.', '#..', '#..'], Е: ['###', '#..', '##.', '#..', '###'], Л: ['.##', '#.#', '#.#', '#.#', '#.#'],
  Г: ['###', '#..', '#..', '#..', '#..'], Ж: ['#.#', '.#.', '###', '.#.', '#.#'],
};

/** Draws a Cyrillic word in 3 by 5 glyphs, one pixel apart. */
export function cyr(px: Px, x: number, y: number, word: string, col: Parameters<Px['set']>[2]): number {
  let cx = x;
  for (const ch of word) {
    const g = CYR[ch];
    if (!g) continue;
    g.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') px.set(cx + i, y + j, col); });
    cx += 4;
  }
  return cx - x - 1;
}
