// Shared by the three variation sheets (heroes2-variations.html, alpha-variations.html, tunnel-variations.html): paints role
// buffers with a palette, counts colors, and draws zoomed sprites and labels onto a card canvas. Nothing here runs at import
// time, so Node can load the pure parts for checks.
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { px32 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText } from '../font.ts';
import { Px } from '../px.ts';

/** One char code per pixel, 0 empty, 107 ('k') the ink outline. */
export type Roles = Uint8Array;
export type Pal = Record<string, ColorName>;

const INK = px32('ink');

/** Paints a role buffer. An unmapped role is left out and reported by `unmapped`, so a typo can't hide. */
export function paintRoles(buf: Roles, w: number, pal: Pal): Px {
  const out = new Px(w, buf.length / w);
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i] as number;
    if (!v) continue;
    const name = v === 107 ? 'ink' : pal[String.fromCharCode(v)];
    if (name) out.d[i] = px32(name);
  }
  return out;
}

/** The role letters in a buffer that the palette doesn't name. */
export function unmapped(buf: Roles, pal: Pal): string[] {
  const bad = new Set<string>();
  for (const v of buf) if (v && v !== 107 && !pal[String.fromCharCode(v)]) bad.add(String.fromCharCode(v));
  return [...bad];
}

/** Distinct colors in a Px, not counting the ink outline. The sheets keep every sprite to five. */
export function fills(...parts: Px[]): number {
  const seen = new Set<number>();
  for (const p of parts) for (const v of p.d) if (v && v !== INK) seen.add(v);
  return seen.size;
}

/** An empty card canvas filled with a palette color. */
export function cardCanvas(w: number, h: number, bg: ColorName): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d') as Ctx;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL[bg];
  g.fillRect(0, 0, w, h);
  return { c, g };
}

/** A Px at k times its size, nearest neighbor. */
export function zoom(g: Ctx, p: Px, x: number, y: number, k: number): void {
  g.imageSmoothingEnabled = false;
  g.drawImage(p.toCanvas(), x, y, p.w * k, p.h * k);
}

/** A Px at its own size. */
export function flat(g: Ctx, p: Px, x: number, y: number): void {
  g.imageSmoothingEnabled = false;
  g.drawImage(p.toCanvas(), x, y);
}

/** A label in the game's 5x7 font, drawn at 1x. */
export function label(g: Ctx, text: string, x: number, y: number, color: ColorName = 'mist'): void {
  drawText(g, text, x, y, color);
}

/** A floor line under a sprite so it stands on something at 1x: a flat dark oval, no dither. */
export function floorOval(g: Ctx, cx: number, y: number, w: number, color: ColorName = 'black'): void {
  const p = new Px(w, 3).ellipse(w / 2, 1.5, w / 2, 1.5, color);
  flat(g, p, Math.round(cx - w / 2), y);
}
