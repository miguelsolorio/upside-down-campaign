// A software canvas for the gfx tests that look at the pixels a draw puts down: enough 2D context for the actor, effect and sheet code
// (fillRect, drawImage, putImageData, getImageData, translate, scale and save), on 32 bit pixels, and a few ways to count what is on it.
// Importing this installs the `document` the draw code builds its bitmaps through, so import it before the gfx modules that draw. Not a test file.
import type { ColorName } from '../src/gfx/palette.ts';
import { px32 } from '../src/gfx/canvas.ts';

const packed = (s: string): number => {
  const n = parseInt(s.slice(1), 16);
  return ((255 << 24) | (((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255))) >>> 0;
};
export class FakeCanvas {
  w = 0; h = 0; px = new Uint32Array(0); g: FakeCtx | null = null;
  get width(): number { return this.w; }
  set width(v: number) { this.w = v; this.px = new Uint32Array(this.w * this.h); }
  get height(): number { return this.h; }
  set height(v: number) { this.h = v; this.px = new Uint32Array(this.w * this.h); }
  getContext(): FakeCtx { return (this.g ??= new FakeCtx(this)); }
}
/** A software 2D context: fillRect, drawImage, putImageData and getImageData onto 32 bit pixels, with translate, scale and save. */
class FakeCtx {
  fillStyle = '#000000'; imageSmoothingEnabled = false;
  canvas: FakeCanvas;
  tx = 0; ty = 0; sc = 1; stack: [number, number, number][] = [];
  constructor(canvas: FakeCanvas) { this.canvas = canvas; }
  save(): void { this.stack.push([this.tx, this.ty, this.sc]); }
  restore(): void { const s = this.stack.pop(); if (s) { this.tx = s[0]; this.ty = s[1]; this.sc = s[2]; } }
  translate(x: number, y: number): void { this.tx += x * this.sc; this.ty += y * this.sc; }
  scale(k: number): void { this.sc *= k; }
  raw(x: number, y: number, v: number): void { const c = this.canvas; if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.px[y * c.w + x] = v; }
  put(x: number, y: number, v: number): void {
    const X = Math.round(x * this.sc + this.tx), Y = Math.round(y * this.sc + this.ty);
    for (let j = 0; j < this.sc; j++) for (let i = 0; i < this.sc; i++) this.raw(X + i, Y + j, v);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    const v = packed(this.fillStyle), x0 = Math.round(x), y0 = Math.round(y);
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) this.put(i, j, v);
  }
  drawImage(img: FakeCanvas, ...a: number[]): void {
    let sx = 0, sy = 0, sw = img.w, sh = img.h, dx = a[0] as number, dy = a[1] as number;
    if (a.length === 8) [sx, sy, sw, sh, dx, dy] = a as [number, number, number, number, number, number, number, number];
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const p = img.px[(sy + j) * img.w + sx + i] as number;
      if (p >>> 24 !== 0) this.put(dx + i, dy + j, p);
    }
  }
  createImageData(w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  putImageData(img: { width: number; data: Uint8ClampedArray }, dx: number, dy: number): void {
    const u = new Uint32Array(img.data.buffer);
    for (let j = 0; j < u.length / img.width; j++) for (let i = 0; i < img.width; i++) this.raw(dx + i, dy + j, u[j * img.width + i] as number);
  }
  getImageData(x: number, y: number, w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } {
    const out = new Uint32Array(w * h), c = this.canvas;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = x + i, yy = y + j; out[j * w + i] = xx >= 0 && yy >= 0 && xx < c.w && yy < c.h ? (c.px[yy * c.w + xx] as number) : 0; }
    return { width: w, height: h, data: new Uint8ClampedArray(out.buffer) };
  }
}
Object.assign(globalThis, { document: { createElement: (): FakeCanvas => new FakeCanvas() } });
export const screen = (w = 400, h = 260): FakeCanvas => { const c = new FakeCanvas(); c.width = w; c.height = h; return c; };
export const ctxOf = (c: FakeCanvas): CanvasRenderingContext2D => c.getContext() as unknown as CanvasRenderingContext2D;
export const painted = (c: FakeCanvas): number => c.px.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
export const count = (c: FakeCanvas, ...names: ColorName[]): number => c.px.reduce((n, v) => n + (names.some((k) => px32(k) === v) ? 1 : 0), 0);
export const rows = (c: FakeCanvas): [number, number] => {
  let lo = c.h, hi = -1;
  c.px.forEach((v, i) => { if (v) { const y = (i / c.w) | 0; lo = Math.min(lo, y); hi = Math.max(hi, y); } });
  return [lo, hi];
};
export const cols = (c: FakeCanvas): [number, number] => {
  let lo = c.w, hi = -1;
  c.px.forEach((v, i) => { if (v) { const x = i % c.w; lo = Math.min(lo, x); hi = Math.max(hi, x); } });
  return [lo, hi];
};
export const same = (a: FakeCanvas, b: FakeCanvas): boolean => a.px.length === b.px.length && a.px.every((v, i) => v === b.px[i]);

