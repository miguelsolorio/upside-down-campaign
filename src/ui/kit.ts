// Small drawing helpers shared by the UI scenes. Nothing here touches the DOM until a function is called.
import { PAL } from '../gfx/palette.ts';
import type { ColorName } from '../gfx/palette.ts';
import { drawText } from '../gfx/index.ts';
import { settings } from '../core/settings.ts';
import { rampIndex } from './format.ts';

export type Ctx = CanvasRenderingContext2D;

export function box(ctx: Ctx, x: number, y: number, w: number, h: number, color: ColorName): void {
  ctx.fillStyle = PAL[color];
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** One pixel outline. */
export function outline(ctx: Ctx, x: number, y: number, w: number, h: number, color: ColorName): void {
  box(ctx, x, y, w, 1, color);
  box(ctx, x, y + h - 1, w, 1, color);
  box(ctx, x, y + 1, 1, h - 2, color);
  box(ctx, x + w - 1, y + 1, 1, h - 2, color);
}

export function clipped(ctx: Ctx, x: number, y: number, w: number, h: number, fn: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

const patterns = new Map<string, CanvasPattern>();
/**
 * A dither of one color: density 2 is a checkerboard (half the pixels), 4 is one pixel in four.
 * The pattern is anchored to the canvas origin, so it never shimmers. Used instead of alpha, to stay inside the palette.
 */
export function dither(ctx: Ctx, x: number, y: number, w: number, h: number, color: ColorName, density: 2 | 4 = 2): void {
  const key = `${color}${density}`;
  let p = patterns.get(key);
  if (!p) {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const cc = c.getContext('2d') as CanvasRenderingContext2D;
    cc.fillStyle = PAL[color];
    cc.fillRect(0, 0, 1, 1);
    if (density === 2) cc.fillRect(1, 1, 1, 1);
    p = ctx.createPattern(c, 'repeat') as CanvasPattern;
    patterns.set(key, p);
  }
  ctx.fillStyle = p;
  ctx.fillRect(x, y, w, h);
}

/** Text drawn at a whole-number scale: 2 makes the 5 by 7 glyphs 10 by 14. x is the anchor for the given alignment. */
export function bigText(
  ctx: Ctx, text: string, x: number, y: number, color: ColorName, scale = 2,
  align: 'left' | 'center' | 'right' = 'center', shadow = true,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  drawText(ctx, text, x / scale, y / scale, color, { align, shadow });
  ctx.restore();
}

// The font has no greater-than sign, so the "LV 3 > 4" arrow is drawn here: 5 by 7, one pixel stroke like the font.
const GT: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [2, 4], [1, 5], [0, 6]];
export function drawGt(ctx: Ctx, x: number, y: number, color: ColorName): void {
  for (const [dx, dy] of GT) box(ctx, x + dx, y + dy, 1, 1, color);
}

/** Dark to light steps. Fades are palette steps, not alpha. */
export const RAMP_BONE: ColorName[] = ['ink', 'night', 'shadow', 'dusk', 'slate', 'mist', 'bone', 'white'];
export const RAMP_RED: ColorName[] = ['ink', 'blood0', 'blood1', 'red', 'hot', 'pink'];
export const RAMP_GOLD: ColorName[] = ['ink', 'soil0', 'soil1', 'soil2', 'orange', 'amber', 'yellow', 'cream'];
export function rampAt(ramp: ColorName[], a: number): ColorName {
  return ramp[rampIndex(ramp.length, a)] as ColorName;
}

/** True for `on` frames out of every `period`. Always true when Reduce flashing is on, so prompts stay visible. */
export function blinkOn(t: number, period: number, on: number): boolean {
  return settings.reduceFlashing || t % period < on;
}

/** The bar of ten segments the volume rows use. */
export function segments(ctx: Ctx, x: number, y: number, lit: number, color: ColorName): void {
  for (let i = 0; i < 10; i++) box(ctx, x + i * 5, y, 4, 5, i < lit ? color : 'grey1');
}
