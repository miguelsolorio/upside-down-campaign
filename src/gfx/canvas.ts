// Low-level helpers shared by the gfx modules. Nothing here touches the DOM at import time.
import { PAL } from './palette.ts';
import type { ColorName } from './palette.ts';

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): Ctx {
  const g = c.getContext('2d') as Ctx;
  g.imageSmoothingEnabled = false;
  return g;
}

// ---------------------------------------------------------------- colors and pixels
const packedCache = new Map<ColorName, number>();
/** Opaque RGBA packed for a little-endian Uint32 view of ImageData. */
export function px32(name: ColorName): number {
  let v = packedCache.get(name);
  if (v === undefined) {
    const n = parseInt(PAL[name].slice(1), 16);
    v = (((255 << 24) | (((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255))) >>> 0);
    packedCache.set(name, v);
  }
  return v;
}

/** Turns a Uint32 pixel buffer (0 = transparent) into a canvas. */
export function canvasFromPixels(px: Uint32Array, w: number, h: number): HTMLCanvasElement {
  if (w <= 0 || h <= 0) return makeCanvas(1, 1);
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const id = g.createImageData(w, h);
  new Uint32Array(id.data.buffer).set(px);
  g.putImageData(id, 0, 0);
  return c;
}

/** Cheap integer hash for position-keyed variation. */
export function hash2(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** 0..1 float from a hash. */
export function unit(x: number, y: number, s = 0): number {
  return hash2(x, y, s) / 4294967296;
}

// ---------------------------------------------------------------- role buffers (ASCII sprite layers)
/** Copies ASCII rows into a byte buffer of char codes. '.' and ' ' are transparent. */
export function blitRows(buf: Uint8Array, bw: number, rows: readonly string[], ox: number, oy: number, flip = false): void {
  const bh = buf.length / bw;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] as string;
    const y = oy + r;
    if (y < 0 || y >= bh) continue;
    for (let c = 0; c < row.length; c++) {
      const ch = row.charCodeAt(c);
      if (ch === 46 || ch === 32) continue;
      const x = ox + (flip ? row.length - 1 - c : c);
      if (x >= 0 && x < bw) buf[y * bw + x] = ch;
    }
  }
}

/** Adds a 1 px outline (char code `k`) around every opaque pixel, 4-neighbour. */
export function outlineRoles(buf: Uint8Array, w: number, h: number, k: number): void {
  const src = buf.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1])
        || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])) buf[y * w + x] = k;
    }
  }
}

export function mirrorRoles(buf: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(buf.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + (w - 1 - x)] = buf[y * w + x] as number;
  return out;
}

// ---------------------------------------------------------------- pixel-snapped shapes on a context
export function dot(ctx: Ctx, x: number, y: number, color: ColorName, s = 1): void {
  ctx.fillStyle = PAL[color];
  ctx.fillRect(Math.round(x), Math.round(y), s, s);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: ColorName): void {
  ctx.fillStyle = PAL[color];
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Bresenham line of s by s squares. */
export function linepx(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: ColorName, s = 1): void {
  ctx.fillStyle = PAL[color];
  let x = Math.round(x0), y = Math.round(y0);
  const ex = Math.round(x1), ey = Math.round(y1);
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(x, y, s, s);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Filled disc by scanlines. */
export function discPx(ctx: Ctx, cx: number, cy: number, r: number, color: ColorName): void {
  ctx.fillStyle = PAL[color];
  const x0 = Math.round(cx), y0 = Math.round(cy);
  for (let j = -r; j <= r; j++) {
    const half = Math.floor(Math.sqrt(r * r + r * 0.8 - j * j));
    if (half >= 0) ctx.fillRect(x0 - half, y0 + j, half * 2 + 1, 1);
  }
}

/** Filled ellipse by scanlines. */
export function ellipsePx(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: ColorName): void {
  ctx.fillStyle = PAL[color];
  const x0 = Math.round(cx), y0 = Math.round(cy);
  for (let j = -ry; j <= ry; j++) {
    const k = 1 - (j * j) / (ry * ry + ry * 0.6);
    const half = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.4);
    ctx.fillRect(x0 - half, y0 + j, half * 2 + 1, 1);
  }
}

/** Arc outline, a0 to a1 radians (screen space, y down), s by s squares. */
export function arcPx(ctx: Ctx, cx: number, cy: number, r: number, a0: number, a1: number, color: ColorName, s = 1): void {
  ctx.fillStyle = PAL[color];
  const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r * 1.6));
  let lx = NaN, ly = NaN;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    if (x === lx && y === ly) continue;
    ctx.fillRect(x, y, s, s);
    lx = x; ly = y;
  }
}

export function ringPx(ctx: Ctx, cx: number, cy: number, r: number, color: ColorName, s = 1): void {
  arcPx(ctx, cx, cy, r, 0, Math.PI * 2, color, s);
}

export const BAYER4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];
