// Text drawing with the 5x7 caps font, and a 3x5 one for tight spots. One glyph atlas per color, built on first use.
import type { ColorName } from './palette.ts';
import type { TextOpts } from '../core/types.ts';
import { GLYPHS, GLYPH_ALIAS, TINY_GLYPHS } from './data/font.ts';
import { canvasFromPixels, px32 } from './canvas.ts';
import type { Ctx } from './canvas.ts';

export const GLYPH_W = 5;
export const GLYPH_H = 7;
export const ADVANCE = 6;

const ORDER = Object.keys(GLYPHS);
const INDEX = new Map<string, number>();
ORDER.forEach((k, i) => INDEX.set(k, i));
const QUESTION = INDEX.get('?') as number;

const atlases = new Map<ColorName, HTMLCanvasElement>();

function atlasFor(color: ColorName): HTMLCanvasElement {
  let a = atlases.get(color);
  if (a) return a;
  const w = ORDER.length * ADVANCE;
  const px = new Uint32Array(w * GLYPH_H);
  const c = px32(color);
  ORDER.forEach((key, gi) => {
    const rows = (GLYPHS[key] as string).split('/');
    for (let y = 0; y < GLYPH_H; y++) {
      const row = rows[y] as string;
      for (let x = 0; x < GLYPH_W; x++) if (row[x] === '#') px[y * w + gi * ADVANCE + x] = c;
    }
  });
  a = canvasFromPixels(px, w, GLYPH_H);
  atlases.set(color, a);
  return a;
}

const TIMES = INDEX.get('x') as number;
const isDigit = (s: string): boolean => s >= '0' && s <= '9';
const isLetter = (s: string): boolean => (s >= 'a' && s <= 'z') || (s >= 'A' && s <= 'Z');

/** Glyph index for the character at i, or -1 for blank space. A lowercase x beside a digit is the times sign. */
function glyphAt(text: string, i: number): number {
  const ch = text[i] as string;
  if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') return -1;
  if (ch === 'x') {
    const p = text[i - 1] ?? '';
    const n = text[i + 1] ?? '';
    if ((isDigit(n) && !isLetter(p)) || (isDigit(p) && !isLetter(n))) return TIMES;
  }
  const direct = INDEX.get(ch.toUpperCase());
  if (direct !== undefined && ch !== '\u00d7') return direct;
  const alias = GLYPH_ALIAS[ch];
  if (alias !== undefined) return INDEX.get(alias) ?? QUESTION;
  return QUESTION;
}

function put(ctx: Ctx, text: string, x: number, y: number, color: ColorName): void {
  const atlas = atlasFor(color);
  for (let i = 0; i < text.length; i++) {
    const gi = glyphAt(text, i);
    if (gi >= 0) ctx.drawImage(atlas, gi * ADVANCE, 0, GLYPH_W, GLYPH_H, x + i * ADVANCE, y, GLYPH_W, GLYPH_H);
  }
}

/** Draws one line of text. Returns its advance width. */
export function drawText(ctx: Ctx, text: string, x: number, y: number, color: ColorName = 'white', opts: TextOpts = {}): number {
  const w = textWidth(text);
  const x0 = Math.round(opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x);
  const y0 = Math.round(y);
  if (opts.shadow) put(ctx, text, x0 + 1, y0 + 1, 'ink');
  put(ctx, text, x0, y0, color);
  return w;
}

/** Advance width in px of the whole string (6 px per glyph). */
export function textWidth(text: string): number { return text.length * ADVANCE; }

// ---------------------------------------------------------------- tiny caps
export const TINY_W = 3;
export const TINY_H = 5;
export const TINY_ADVANCE = 4;

const TINY_ORDER = Object.keys(TINY_GLYPHS);
const TINY_INDEX = new Map<string, number>();
TINY_ORDER.forEach((k, i) => TINY_INDEX.set(k, i));
const TINY_QUESTION = TINY_INDEX.get('?') as number;
const tinyAtlases = new Map<ColorName, HTMLCanvasElement>();

function tinyAtlasFor(color: ColorName): HTMLCanvasElement {
  let a = tinyAtlases.get(color);
  if (a) return a;
  const w = TINY_ORDER.length * TINY_ADVANCE;
  const px = new Uint32Array(w * TINY_H);
  const c = px32(color);
  TINY_ORDER.forEach((key, gi) => {
    const rows = (TINY_GLYPHS[key] as string).split('/');
    for (let y = 0; y < TINY_H; y++) {
      const row = rows[y] as string;
      for (let x = 0; x < TINY_W; x++) if (row[x] === '#') px[y * w + gi * TINY_ADVANCE + x] = c;
    }
  });
  a = canvasFromPixels(px, w, TINY_H);
  tinyAtlases.set(color, a);
  return a;
}

/** Width in px of the ink of a string in the 3x5 font: 4 px a glyph, with no gap after the last one. */
export function tinyWidth(text: string): number { return text.length === 0 ? 0 : text.length * TINY_ADVANCE - 1; }

/** One line in the 3x5 font. Caps only, so lowercase draws as caps. Returns the ink width. */
export function drawTinyText(ctx: Ctx, text: string, x: number, y: number, color: ColorName = 'white'): number {
  const atlas = tinyAtlasFor(color);
  const x0 = Math.round(x), y0 = Math.round(y);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === ' ') continue;
    const gi = TINY_INDEX.get(ch.toUpperCase()) ?? TINY_QUESTION;
    ctx.drawImage(atlas, gi * TINY_ADVANCE, 0, TINY_W, TINY_H, x0 + i * TINY_ADVANCE, y0, TINY_W, TINY_H);
  }
  return tinyWidth(text);
}

/** Builds the atlases for the colors the game uses most, so the first frame has no hitch. */
export function warmFont(): void {
  for (const c of ['white', 'bone', 'mist', 'yellow', 'red', 'hot', 'cyan', 'amber', 'ink', 'slate'] as ColorName[]) atlasFor(c);
}
