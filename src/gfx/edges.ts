// The dark at the sides of a wide screen. Past the clear band the picture fades to black in four dithered steps,
// so a wide monitor gets a wider canvas without showing more of the level. No alpha: every pixel is black or not.
import { SCREEN_W } from '../core/config.ts';
import { BAYER4, canvasFromPixels, px32 } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { PAL } from './palette.ts';

/** How far the fade reaches before it is solid black. */
export const FADE_W = 32;

const ramps = new Map<string, HTMLCanvasElement>();
/** A ramp `w` wide and `h` tall, solid at its outer side. `w` is a multiple of 4, so it is four equal steps. */
function ramp(w: number, h: number, left: boolean): HTMLCanvasElement {
  const key = `${w}:${h}:${left ? 'l' : 'r'}`;
  const hit = ramps.get(key);
  if (hit) return hit;
  const px = new Uint32Array(w * h);
  const black = px32('black');
  for (let x = 0; x < w; x++) {
    const out = left ? w - 1 - x : x;
    // 4, 8, 12 then 16 of every 16 pixels, counting out from the band.
    const density = (Math.floor((out * 4) / w) + 1) * 4;
    for (let y = 0; y < h; y++) {
      if ((BAYER4[(y & 3) * 4 + (x & 3)] as number) < density) px[y * w + x] = black;
    }
  }
  const c = canvasFromPixels(px, w, h);
  ramps.set(key, c);
  return c;
}

/**
 * Fades everything left of x0 and right of x1, between y and y + h, to black. x0, x1 and y must be multiples of 4
 * so the dither lines up with the rest of the screen. A side narrower than FADE_W gets the whole fade squeezed in,
 * so it still ends in black at the edge.
 */
export function drawSideFade(ctx: Ctx, x0: number, x1: number, y: number, h: number): void {
  ctx.fillStyle = PAL.black;
  const lw = Math.min(FADE_W, Math.floor(x0 / 4) * 4);
  if (lw > 0) {
    ctx.fillRect(0, y, x0 - lw, h);
    ctx.drawImage(ramp(lw, h, true), x0 - lw, y);
  }
  const rw = Math.min(FADE_W, Math.floor((SCREEN_W - x1) / 4) * 4);
  if (rw > 0) {
    ctx.drawImage(ramp(rw, h, false), x1, y);
    ctx.fillRect(x1 + rw, y, SCREEN_W - x1 - rw, h);
  }
}
