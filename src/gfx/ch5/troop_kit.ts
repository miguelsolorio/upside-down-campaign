// Shared by the trooper and the Commander (chapter 5, docs/chapter-5.md): the small tools both foes are composed with. A frame is a
// role buffer, one char code per pixel (0 = empty, 'k' = the ink outline), exactly as actor_foes.ts and actor_grigori.ts make them, so
// the later build can hand either to the same atlas code. Here: rows written by column, strokes, the clear riot shield, the muzzle
// flash, a fallen sprite laid on its side, and the step from roles to a painted Px. Pure: no DOM.
import type { View } from '../data/types.ts';
import { mirrorRoles, outlineRoles, px32 } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

export type { View } from '../data/types.ts';
export type Pt = readonly [number, number];
export interface Rect { x: number; y: number; w: number; h: number }
/** The four ways a foe faces on screen: left is the right profile mirrored. */
export type Dir = 'down' | 'up' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['down', 'up', 'left', 'right'];
export const viewOf = (d: Dir): View => (d === 'down' ? 'down' : d === 'up' ? 'up' : 'side');

export const code = (c: string): number => c.charCodeAt(0);
export const INK = code('k');

/** A row of a part: `s` laid at column x0 of a `w` wide cell, dots elsewhere. */
export function R(x0: number, s: string, w = 16): string {
  return '.'.repeat(x0) + s + '.'.repeat(Math.max(0, w - x0 - s.length));
}

export function put(buf: Uint8Array, C: number, x: number, y: number, ch: string, over = true): void {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= C || y >= C) return;
  if (over || !buf[y * C + x]) buf[y * C + x] = code(ch);
}

/** Copies a layer's opaque pixels onto a buffer. Ink never covers a pixel that is already painted. */
export function over(dst: Uint8Array, src: Uint8Array): void {
  for (let i = 0; i < src.length; i++) if (src[i] && !(src[i] === INK && dst[i])) dst[i] = src[i] as number;
}

/** A filled box of one role. */
export function fill(buf: Uint8Array, C: number, r: Rect, ch: string, keep = false): void {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) put(buf, C, x, y, ch, !keep);
}

/** A 1 px Bresenham stroke. */
export function stroke(buf: Uint8Array, C: number, a: Pt, b: Pt, ch: string, keep = false): void {
  let x = Math.round(a[0]), y = Math.round(a[1]);
  const ex = Math.round(b[0]), ey = Math.round(b[1]);
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 80; i++) {
    put(buf, C, x, y, ch, !keep);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Writes rows of a part at (dx, y + dy). */
export function rows(buf: Uint8Array, C: number, y: number, list: readonly string[], dx = 0, dy = 0): void {
  list.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i] as string;
      if (ch !== '.' && ch !== ' ') put(buf, C, i + dx, y + j + dy, ch);
    }
  });
}

/** Adds the 1 px ink outline round every opaque pixel. */
export function outline(buf: Uint8Array, C: number): void { outlineRoles(buf, C, C, INK); }

export function rotate(buf: Uint8Array, C: number, ccw: boolean): Uint8Array {
  const out = new Uint8Array(C * C);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const v = buf[y * C + x] as number;
    if (v) out[(ccw ? C - 1 - x : x) * C + (ccw ? y : C - 1 - y)] = v;
  }
  return out;
}

/** Moves the opaque pixels so they rest on row C - 2 and sit centered. */
export function settle(buf: Uint8Array, C: number): Uint8Array {
  let minX = C, maxX = -1, maxY = -1;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (buf[y * C + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (maxY < 0) return buf;
  const sx = Math.round((C - 1 - (maxX - minX)) / 2) - minX, sy = C - 2 - maxY;
  const out = new Uint8Array(C * C);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const v = buf[y * C + x] as number, nx = x + sx, ny = y + sy;
    if (v && nx >= 0 && nx < C && ny >= 0 && ny < C) out[ny * C + nx] = v;
  }
  return out;
}

/** A rect moved by (dx, dy) and kept inside the cell, one px in from every edge, so its rim is never cut off. */
export function fit(r: Rect, dx: number, dy: number, C: number): Rect {
  return { ...r, x: Math.max(1, Math.min(C - 1 - r.w, r.x + dx)), y: Math.max(1, Math.min(C - 1 - r.h, r.y + dy)) };
}

// ---------------------------------------------------------------- the clear riot shield
export interface ShieldLook {
  /** Role of the lit top and left edge, of the shaded bottom and right edge, of the glints. */
  lit: string; edge: string; glint: string;
  /** A trim band across the middle, or none. */
  band?: string;
  /** Cracked: a jagged break from a corner, a chip gone from it, and the lit edge dulled. */
  crack?: { lit: string; line: string };
}

/**
 * The shield in its own layer: a frame with its corners cut, lit on the top and left, shaded on the bottom and right, one or two
 * diagonal glints inside, and a dark rim outside. The inside stays empty, so whatever is behind the shield shows through it.
 */
export function shieldLayer(C: number, r: Rect, look: ShieldLook): Uint8Array {
  const sb = new Uint8Array(C * C);
  const x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
  const cracked = look.crack !== undefined;
  for (let y = r.y; y <= y1; y++) {
    for (let x = r.x; x <= x1; x++) {
      const ex = x === r.x || x === x1, ey = y === r.y || y === y1;
      if (ex && ey) continue;
      const litEdge = x === r.x || y === r.y;
      if (ex || ey) put(sb, C, x, y, litEdge ? (cracked ? (look.crack as { lit: string }).lit : look.lit) : look.edge);
      else if (r.w > 4 && r.h > 6) {
        const a = x - r.x + y - r.y;
        if ((a === 4 && y - r.y <= 4) || (a === 6 && y - r.y <= 2)) put(sb, C, x, y, look.glint);
      }
    }
  }
  if (look.band && r.h >= 10) for (let x = r.x + 1; x < x1; x++) { put(sb, C, x, r.y + (r.h >> 1), look.band); put(sb, C, x, r.y + (r.h >> 1) + 1, look.band); }
  if (look.crack) {
    // A fracture from the top edge to the bottom one that drifts left, thick in places, with a branch each way, and a chip gone from the top right corner.
    const c = look.crack;
    const kink = [0, -1, -1, 0, 1];
    let x = r.x + Math.round(r.w * 0.66), mid: Pt = [x, y1];
    for (let i = 0; i <= r.h - 1; i++) {
      const y = r.y + i;
      put(sb, C, x, y, c.line);
      if (i % 3 === 0) put(sb, C, x + 1, y, c.line);
      if (i === r.h >> 1) mid = [x, y];
      x += kink[i % 5] as number;
    }
    stroke(sb, C, mid, [mid[0] - Math.min(5, r.w >> 1), mid[1] + 3], c.line);
    stroke(sb, C, mid, [mid[0] + Math.min(3, r.w >> 2), mid[1] - 3], c.line);
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1], [0, 2], [-2, 0]] as Pt[]) sb[(r.y + dy) * C + (x1 + dx)] = 0;
    put(sb, C, x1 - 2, r.y + 1, c.line); put(sb, C, x1 - 1, r.y + 2, c.line);
  }
  const frame = sb.slice();
  for (let y = 0; y < C; y++) {
    for (let x = 0; x < C; x++) {
      if (frame[y * C + x]) continue;
      if (x > r.x && x < x1 && y > r.y && y < y1) continue;
      if ((x > 0 && frame[y * C + x - 1]) || (x < C - 1 && frame[y * C + x + 1]) || (y > 0 && frame[(y - 1) * C + x]) || (y < C - 1 && frame[(y + 1) * C + x])) sb[y * C + x] = INK;
    }
  }
  return sb;
}

/** A muzzle flash: a star about its center, `size` 1 or 2, the outer flames of one role and the core of another. The center is kept far enough in that the star is never cut off. */
export function flash(buf: Uint8Array, C: number, at: Pt, size: number, flame: string, core: string): void {
  const r = size > 1 ? 2 : 1;
  const x = Math.max(r, Math.min(C - 1 - r, at[0])), y = Math.max(r, Math.min(C - 1 - r, at[1]));
  put(buf, C, x, y, core);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) put(buf, C, x + dx, y + dy, size > 1 ? core : flame);
  if (size > 1) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]] as Pt[]) put(buf, C, x + dx, y + dy, flame);
}

// ---------------------------------------------------------------- roles to pixels
/** A role buffer painted with a palette. 'k' is the ink outline; an unmapped role is left out (the test names them). */
export function toPx(buf: Uint8Array, C: number, pal: Record<string, ColorName>): Px {
  const out = new Px(C);
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i] as number;
    if (!v) continue;
    const name = v === INK ? 'ink' : pal[String.fromCharCode(v)];
    if (name) out.d[i] = px32(name);
  }
  return out;
}

/** The role letters in a buffer that a palette doesn't name. */
export function unmapped(buf: Uint8Array, pal: Record<string, ColorName>): string[] {
  const bad = new Set<string>();
  for (const v of buf) if (v && v !== INK && !pal[String.fromCharCode(v)]) bad.add(String.fromCharCode(v));
  return [...bad];
}

/** A composed side view for a direction: left is the right profile mirrored, as the atlases do. */
export function faced(make: (v: View) => Uint8Array, d: Dir, C: number): Uint8Array {
  const buf = make(viewOf(d));
  return d === 'left' ? mirrorRoles(buf, C, C) : buf;
}
