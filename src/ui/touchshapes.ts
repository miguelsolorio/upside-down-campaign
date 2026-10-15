// Smooth shapes for the touch screen's Game Boy, shared by the shell (touchdraw.ts) and the keys (touchkeys.ts).
import type { Rect } from '../core/touchlayout.ts';
import type { Vec2 } from '../core/types.ts';

export type C2D = CanvasRenderingContext2D;

export const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
export const PILL_TILT = -25 * (Math.PI / 180);
export const SLOT_TILT = -60 * (Math.PI / 180);

export function center(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A rectangle with its own radius at each corner: top left, top right, bottom right, bottom left. */
export function roundRect(ctx: C2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, tl, tr, br, bl);
}

/** The same, added to the current path, always clockwise, so two of them fill as one shape. */
export function roundRectPath(ctx: C2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): void {
  // A radius past half the box, or under zero on a window too small to lay out, would throw.
  const most = Math.max(0, Math.min(w, h) / 2);
  const fit = (r: number): number => Math.max(0, Math.min(most, r));
  [tl, tr, br, bl] = [fit(tl), fit(tr), fit(br), fit(bl)];
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export function circle(ctx: C2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** A rounded rectangle turned by `angle` about its center, for SELECT and START and the speaker slots. */
export function capsule(ctx: C2D, cx: number, cy: number, len: number, thick: number, angle: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  roundRect(ctx, -len / 2, -thick / 2, len, thick, thick / 2, thick / 2, thick / 2, thick / 2);
  ctx.restore();
}

/** A small seeded random source, so a pattern painted into the shell comes out the same on every draw. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
