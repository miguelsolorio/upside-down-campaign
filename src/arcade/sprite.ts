// Tiny sprites for the cabinet games, written as rows of characters with a palette color per character ('.' is
// clear). A sprite turns into a canvas on its first draw, once per turn and mirror, so step() and Node tests never touch
// the DOM. Also the score and lives readouts every cart shares.
import { canvasFromPixels, px32, rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawText, drawTinyText, textWidth, tinyWidth } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import { FIELD } from './types.ts';

/** Quarter turns clockwise: 0 as drawn, 1 a quarter turn, 2 upside down, 3 three quarters. */
export type Turn = 0 | 1 | 2 | 3;

export interface Sprite {
  readonly w: number;
  readonly h: number;
  /** Draws with the top-left at (x, y). A quarter turn swaps w and h. `flip` mirrors left to right before turning. */
  draw(ctx: Ctx, x: number, y: number, turn?: Turn, flip?: boolean): void;
}

export function sprite(rows: readonly string[], colors: Readonly<Record<string, ColorName>>): Sprite {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cache = new Map<number, HTMLCanvasElement>();
  const build = (turn: Turn, flip: boolean): HTMLCanvasElement => {
    const ow = turn & 1 ? h : w, oh = turn & 1 ? w : h;
    const px = new Uint32Array(ow * oh);
    for (let y = 0; y < h; y++) {
      const row = rows[y] as string;
      for (let x = 0; x < w; x++) {
        const c = colors[row[x] ?? '.'];
        if (!c) continue;
        const sx = flip ? w - 1 - x : x;
        const [tx, ty] = turn === 0 ? [sx, y] : turn === 1 ? [h - 1 - y, sx] : turn === 2 ? [w - 1 - sx, h - 1 - y] : [y, w - 1 - sx];
        px[ty * ow + tx] = px32(c);
      }
    }
    return canvasFromPixels(px, ow, oh);
  };
  return {
    w, h,
    draw(ctx, x, y, turn = 0, flip = false) {
      const key = turn * 2 + (flip ? 1 : 0);
      let c = cache.get(key);
      if (!c) { c = build(turn, flip); cache.set(key, c); }
      ctx.drawImage(c, Math.round(x), Math.round(y));
    },
  };
}

/** The score top-left and the best score top-right, in the 3 by 5 font on a black strip 7 px tall. */
export function drawScoreLine(ctx: Ctx, ox: number, oy: number, score: number, best: number): void {
  rect(ctx, ox, oy, FIELD, 7, 'black');
  drawTinyText(ctx, `1UP ${score}`, ox + 2, oy + 1, 'white');
  const hi = `HI ${Math.max(score, best)}`;
  drawTinyText(ctx, hi, ox + FIELD - 2 - tinyWidth(hi), oy + 1, 'hot');
}

/** One small mark per spare life along the bottom-left of the field. */
export function drawLives(ctx: Ctx, ox: number, oy: number, spare: number, icon: Sprite): void {
  for (let i = 0; i < Math.min(spare, 6); i++) icon.draw(ctx, ox + 2 + i * (icon.w + 2), oy + FIELD - icon.h - 1);
}

/** A line in the 5 by 7 font centered on the field at row y, on its own black strip so it reads over anything. The
 * 3 by 5 font has no punctuation, so banners use this one. */
export function drawBanner(ctx: Ctx, ox: number, oy: number, y: number, text: string, color: ColorName): void {
  const w = textWidth(text) - 1;
  const x = ox + Math.round((FIELD - w) / 2);
  rect(ctx, x - 3, oy + y - 2, w + 6, 11, 'black');
  drawText(ctx, text, x, oy + y, color);
}
