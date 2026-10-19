// Text with an ink outline round it, for anything that floats over the world: damage numbers, +quarters, LEVEL UP, the controls in the
// corner. Ink on two sides (a shadow) is not enough on the Lab's white floors or over a white slash, where white on white is 1:1.
// Each string in each color is built once as a small canvas, so a frame draws it with one drawImage instead of six passes of glyphs.
import { ctx2d, makeCanvas } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { GLYPH_H, drawText, textWidth } from './font.ts';
import type { ColorName } from './palette.ts';

/** The ink round the text: every side but the top left, the way the top line outlines its words. */
const OUTLINE: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]];
const cache = new Map<string, HTMLCanvasElement>();
/** Numbers and the few words that float make a few hundred strings; past this the cache starts over, which costs a frame of rebuilding. */
const MAX_STRINGS = 600;

function build(text: string, color: ColorName): HTMLCanvasElement {
  const c = makeCanvas(textWidth(text) + 2, GLYPH_H + 2);
  const g = ctx2d(c);
  for (const [dx, dy] of OUTLINE) drawText(g, text, 1 + dx, 1 + dy, 'ink');
  drawText(g, text, 1, 1, color);
  return c;
}

/** Draws the text at x, y as drawText places it (x is the left edge, or the middle with align 'center'). Returns its advance width. */
export function outlinedText(ctx: Ctx, text: string, x: number, y: number, color: ColorName, align: 'left' | 'center' = 'left'): number {
  const w = textWidth(text);
  if (w === 0) return 0;
  const key = `${color}|${text}`;
  let c = cache.get(key);
  if (!c) {
    if (cache.size >= MAX_STRINGS) cache.clear();
    c = build(text, color);
    cache.set(key, c);
  }
  ctx.drawImage(c, Math.round(align === 'center' ? x - w / 2 : x) - 1, Math.round(y) - 1);
  return w;
}
