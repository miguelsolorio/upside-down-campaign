// Design 5, "Joyce's wall": the bulbs, the geometry of the string of lights, and the drippy black capitals.
import { Px } from '../px.ts';
import type { ColorName } from '../palette.ts';
import { hash2 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText, ADVANCE } from '../font.ts';
import { GLYPHS } from '../data/font.ts';

// ---------------------------------------------------------------- where the string hangs
/** Nails the wire hangs from, left to right, and how high each one is. The string sinks as it goes. */
export const NAIL_X = [0, 43, 85, 128, 171, 213, 256];
export const NAIL_Y = [22, 30, 38, 46, 54, 62, 70];
export const SAG = 16;

/** The row the wire passes through in column x. */
export function wireY(x: number): number {
  let k = 0;
  while (k < 5 && x >= (NAIL_X[k + 1] as number)) k++;
  const x0 = NAIL_X[k] as number, x1 = NAIL_X[k + 1] as number, u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return (NAIL_Y[k] as number) + ((NAIL_Y[k + 1] as number) - (NAIL_Y[k] as number)) * u + SAG * 4 * u * (1 - u);
}

/** Center column of stage i's bulb: the middle of its swag. */
export const bulbX = (i: number): number => Math.round(((NAIL_X[i] as number) + (NAIL_X[i + 1] as number)) / 2);
/** Top row of stage i's bulb: where the socket meets the wire. */
export const bulbY = (i: number): number => Math.round(wireY(bulbX(i)));
/** The row the token walks on, on the runner under the wall. */
export const FLOOR_Y = 154;

// ---------------------------------------------------------------- bulbs
/** The bulb color of each stage, in the order of a real string: red, orange, yellow, green, blue, magenta. */
export const BULB: ColorName[] = ['hot', 'orange', 'yellow', 'leaf', 'sky', 'magenta'];
export const FILLER: ColorName[] = ['hot', 'yellow', 'leaf', 'sky'];

const LIGHT: Partial<Record<ColorName, ColorName>> = { hot: 'pink', orange: 'amber', yellow: 'cream', leaf: 'cream', sky: 'white', magenta: 'pink', pink: 'white', amber: 'yellow' };
const DARK: Partial<Record<ColorName, ColorName>> = { hot: 'red', orange: 'soil2', yellow: 'amber', leaf: 'pine3', sky: 'blue', magenta: 'purple', red: 'blood1', amber: 'orange', pine3: 'pine2', blue: 'dusk', purple: 'purple0', soil2: 'soil1' };

/** Glass, glint and shade for a bulb of color `c` at brightness 0 (dark glass) to 3 (burning). */
export function glass(c: ColorName, level: number): { c: ColorName; h: ColorName; d: ColorName } {
  const lit = { c, h: LIGHT[c] ?? 'white', d: DARK[c] ?? 'ink' };
  if (level <= 0) return { c: 'grey1', h: 'grey2', d: 'night' };
  if (level === 1) return { c: lit.d, h: c, d: DARK[lit.d] ?? 'ink' };
  if (level === 2) return lit;
  return { c: lit.h, h: 'white', d: c };
}

const BIG = [
  '..kggk..',
  '..kGGk..',
  '.kccccK.',
  'kchhccdk',
  'kchcccdk',
  'kcccccdk',
  'kcccccdk',
  '.kcccdk.',
  '..kcdk..',
  '...kk...',
];
const SMALL = [
  '.GG.',
  '.cc.',
  'chcd',
  'cccd',
  '.cd.',
];

const cache = new Map<string, HTMLCanvasElement>();

/** The big bulb, 8 by 10, with a 1 px black outline. */
export function bigBulb(c: ColorName, level: number): HTMLCanvasElement {
  const key = `B${c}${level}`;
  let s = cache.get(key);
  if (!s) {
    const g = glass(c, level);
    s = new Px(8, 10).art(BIG, { k: 'ink', K: 'ink', g: 'grey3', G: 'grey2', c: g.c, h: g.h, d: g.d }).toCanvas();
    cache.set(key, s);
  }
  return s;
}

/** The small filler bulb, 4 by 5. */
export function smallBulb(c: ColorName, level: number): HTMLCanvasElement {
  const key = `S${c}${level}`;
  let s = cache.get(key);
  if (!s) {
    const g = glass(c, level);
    s = new Px(4, 5).art(SMALL, { G: 'grey2', c: g.c, h: g.h, d: g.d }).toCanvas();
    cache.set(key, s);
  }
  return s;
}

/** Light thrown on whatever is near: a dithered halo around (cx, cy), thicker near the glass. Pixels that sit on `skip` are left alone. */
export function halo(p: Px, cx: number, cy: number, r: number, c: ColorName, strong: boolean): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.1);
      if (d > r || d < 3) continue;
      if (d <= r * 0.55) { if (((x + y) & 1) === 0 && (strong || ((x >> 1) + (y >> 1)) % 2 === 0)) p.set(x, y, c); }
      else if ((x & 1) === 0 && (y & 1) === 0 && (strong || ((x >> 1) + (y >> 1)) % 2 === 0)) p.set(x, y, c);
    }
  }
}

const sprites = new Map<string, Px>();
/** A halo as its own sprite, (2r + 1) square, for the bulbs that change from frame to frame. */
export function haloSprite(c: ColorName, r: number, strong: boolean): Px {
  const key = `H${c}${r}${strong ? 1 : 0}`;
  let s = sprites.get(key);
  if (!s) { s = new Px(r * 2 + 1); halo(s, r, r, r, c, strong); sprites.set(key, s); }
  return s;
}

/** A pool of colored light on the floor, 39 by 15, centered on its middle. */
export function poolSprite(c: ColorName, strong: boolean): Px {
  const key = `P${c}${strong ? 1 : 0}`;
  let s = sprites.get(key);
  if (!s) {
    s = new Px(39, 15);
    for (let y = 0; y < 15; y++) for (let x = 0; x < 39; x++) {
      const d = ((x - 19) / 18) ** 2 + ((y - 7) / 6.5) ** 2;
      if (d > 1) continue;
      if (d < 0.45) { if (((x + y) & 1) === 0 && (strong || (x >> 1) % 2 === 0)) s.set(x, y, c); }
      else if ((x & 1) === 0 && (y & 1) === 0) s.set(x, y, c);
    }
    sprites.set(key, s);
  }
  return s;
}

const canv = new Map<Px, HTMLCanvasElement>();
/** The sprite as a canvas, built once. */
export function asCanvas(p: Px): HTMLCanvasElement {
  let c = canv.get(p);
  if (!c) { c = p.toCanvas(); canv.set(p, c); }
  return c;
}

// ---------------------------------------------------------------- the painted words
/** Black capitals with a few drips running down from the bottoms of the letters. Returns the text's width. */
export function paint(ctx: Ctx, text: string, cx: number, y: number, seed: number): number {
  const w = text.length * ADVANCE - 1;
  const x0 = Math.round(cx - w / 2);
  drawText(ctx, text, x0, y, 'black');
  ctx.fillStyle = '#000000';
  for (let i = 0; i < text.length; i++) {
    const rows = (GLYPHS[text[i] as string] ?? '').split('/');
    const bottom = rows[6] ?? '';
    const cols: number[] = [];
    for (let c = 0; c < 5; c++) if (bottom[c] === '#') cols.push(c);
    if (cols.length === 0) continue;
    const h = hash2(i, seed, 71);
    if (h % 4 === 0) continue;
    const col = cols[(h >> 3) % cols.length] as number, len = 3 + ((h >> 7) % 8);
    const dx = x0 + i * ADVANCE + col;
    ctx.fillRect(dx, y + 7, 1, len);
    if (len > 4) ctx.fillRect(dx - (h & 1 ? 1 : 0), y + 7 + len - 1, 2, 2);
    if ((h >> 11) % 4 === 0) { const c2 = cols[(h >> 13) % cols.length] as number; if (c2 !== col) ctx.fillRect(x0 + i * ADVANCE + c2, y + 7, 1, 2 + ((h >> 17) % 3)); }
  }
  return w;
}
