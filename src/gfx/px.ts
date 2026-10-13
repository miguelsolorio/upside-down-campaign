// A small RGBA pixel buffer for building tiles, props, icons and portraits at boot. No DOM until toCanvas().
import type { ColorName } from './palette.ts';
import { canvasFromPixels, px32 } from './canvas.ts';

export type Paint = ColorName | number;
const col = (c: Paint): number => (typeof c === 'number' ? c : px32(c));

export class Px {
  readonly w: number;
  readonly h: number;
  readonly d: Uint32Array;

  constructor(w: number, h: number = w) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
  }

  set(x: number, y: number, c: Paint): this {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = col(c);
    return this;
  }

  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? (this.d[y * this.w + x] as number) : 0;
  }

  fill(c: Paint): this { this.d.fill(col(c)); return this; }

  rect(x: number, y: number, w: number, h: number, c: Paint): this {
    const v = col(c);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.d[j * this.w + i] = v;
    return this;
  }

  /** 1 px frame, inside the given box. */
  frame(x: number, y: number, w: number, h: number, c: Paint): this {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c).rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Paint): this {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 400; i++) {
      this.set(x, y, c);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }

  /** Filled ellipse; the center is in pixel-edge coordinates, so (8, 8) is the middle of a 16 px tile. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Paint): this {
    const v = col(c);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry;
        if (a * a + b * b <= 1 && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v;
      }
    }
    return this;
  }

  disc(cx: number, cy: number, r: number, c: Paint): this { return this.ellipse(cx, cy, r, r, c); }

  /** n random single pixels inside a box. */
  scatter(rnd: () => number, c: Paint, n: number, x = 0, y = 0, w: number = this.w, h: number = this.h): this {
    for (let i = 0; i < n; i++) this.set(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), c);
    return this;
  }

  /** ASCII art. Characters map to colors, '.' and ' ' are skipped. */
  art(rows: readonly string[], map: Record<string, Paint>, ox = 0, oy = 0): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i] as string;
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c !== undefined) this.set(ox + i, oy + j, c);
      }
    });
    return this;
  }

  /** Copies the opaque pixels of another buffer. */
  blit(src: Px, ox: number, oy: number, flip = false): this {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const v = src.d[j * src.w + (flip ? src.w - 1 - i : i)] as number;
        const x = ox + i, y = oy + j;
        if (v && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v;
      }
    }
    return this;
  }

  /** A 1 px outline around the opaque pixels, drawn only on empty pixels, 4-neighbour. */
  outline(c: Paint): this {
    const v = col(c);
    const src = this.d.slice();
    const { w, h } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])) this.d[y * w + x] = v;
      }
    }
    return this;
  }

  toCanvas(): HTMLCanvasElement { return canvasFromPixels(this.d, this.w, this.h); }
}
