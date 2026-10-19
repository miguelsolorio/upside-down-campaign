// The few drawing helpers the dressed stills behind the epilogues share (epilogue_hill.ts and its party): rectangles, a Bayer dither
// of one color, single pixels, a stepped line and a stable hash for lights that go out. Everything is whole pixels in the game's palette.
import { BAYER4 } from './canvas.ts';
import { PAL } from './palette.ts';
import type { ColorName } from './palette.ts';

export type Ctx = CanvasRenderingContext2D;
/** How far a quiet scene has gone: 0, 1 and 2, never back. Each still says what each one looks like. */
export type Stage = 0 | 1 | 2;

export function r(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void {
  ctx.fillStyle = PAL[c];
  ctx.fillRect(x, y, w, h);
}

/** A Bayer dither of one color: `level` of every 16 pixels, 8 being a checkerboard. Anchored to the canvas, so it never shimmers. */
export function dith(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName, level: number): void {
  ctx.fillStyle = PAL[c];
  for (let j = y; j < y + h; j++) {
    let run = -1;
    for (let i = x; i <= x + w; i++) {
      const on = i < x + w && (BAYER4[((j & 3) << 2) | (i & 3)] as number) < level;
      if (on && run < 0) run = i;
      else if (!on && run >= 0) { ctx.fillRect(run, j, i - run, 1); run = -1; }
    }
  }
}

/** Pixels from a list of [x, y] pairs. */
export function dots(ctx: Ctx, pts: readonly (readonly [number, number])[], c: ColorName): void {
  ctx.fillStyle = PAL[c];
  for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1);
}

/** A line of `w` by `w` squares stepped between points. */
export function stroke(ctx: Ctx, pts: readonly (readonly [number, number])[], w: number, c: ColorName): void {
  ctx.fillStyle = PAL[c];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i] as readonly [number, number];
    const [x1, y1] = pts[i + 1] as readonly [number, number];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * k) / n) - (w >> 1), Math.round(y0 + ((y1 - y0) * k) / n) - (w >> 1), w, w);
  }
}

/** A dithered ellipse, a row at a time. */
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: ColorName, level: number): void {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)));
    if (half > 0) dith(ctx, cx - half, y, half * 2, 1, c, level);
  }
}

/** A stable 0 to 255 for a cell, so a window that is lit in a later state was lit in every earlier one, and on every screen. */
export function hash8(x: number, y: number): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  return (h ^ (h >>> 16)) & 255;
}
