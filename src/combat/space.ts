// Collision, line of sight and small geometry helpers. All world coordinates are px.
import { TILE } from '../core/config.ts';
import { isSolidTile } from '../core/tiles.ts';
import type { Pos, Prop, S } from './state.ts';

/** Collision box: 10 wide by 8 tall, centered on x and ending at y. */
export const FOOT_W = 10;
export const FOOT_H = 8;
/** Hurt box: 12 wide by 14 tall, centered on x and ending at y. */
export const HURT_W = 12;
export const HURT_H = 14;
/** Distance from an actor's feet up to the middle of its hurt box. */
export const BODY_Y = 7;

export function propBlocks(p: Prop): boolean { return p.solid && p.state !== 'open'; }

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** True when the 10 x 8 foot box with bottom-center (x, y) overlaps a solid tile or a solid prop. */
export function footBlocked(s: S, x: number, y: number): boolean {
  const l = x - FOOT_W / 2, r = x + FOOT_W / 2, t = y - FOOT_H, b = y;
  const tx0 = Math.floor(l / TILE), tx1 = Math.floor((r - 0.001) / TILE);
  const ty0 = Math.floor(t / TILE), ty1 = Math.floor((b - 0.001) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) if (isSolidTile(s.grid, tx, ty)) return true;
  }
  for (const p of s.props) {
    if (propBlocks(p) && rectsOverlap(l, t, FOOT_W, FOOT_H, p.x, p.y, p.w, p.h)) return true;
  }
  return false;
}

export function pointSolid(s: S, x: number, y: number): boolean {
  if (isSolidTile(s.grid, Math.floor(x / TILE), Math.floor(y / TILE))) return true;
  for (const p of s.props) {
    if (propBlocks(p) && x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return true;
  }
  return false;
}

/** Clear line between two ground points, sampled every four px. */
export function los(s: S, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.ceil(dist(x0, y0, x1, y1) / 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (pointSolid(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function moveAxis(s: S, b: Pos, dx: number, dy: number, escape: boolean, assist: boolean): number {
  let rem = Math.abs(dx !== 0 ? dx : dy);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  let moved = 0;
  let nudges = 0;
  while (rem > 1e-6) {
    const step = Math.min(1, rem);
    rem -= step;
    const nx = b.x + sx * step, ny = b.y + sy * step;
    if (escape || !footBlocked(s, nx, ny)) {
      b.x = nx; b.y = ny; moved += step;
      continue;
    }
    if (assist && nudges < 8) {
      // Corner assist: slide a half px sideways toward whichever side clears the obstacle within four px.
      let nudged = false;
      for (let off = 1; off <= 4 && !nudged; off++) {
        for (const sg of [-1, 1]) {
          const cx = sx !== 0 ? nx : b.x + sg * off;
          const cy = sx !== 0 ? b.y + sg * off : ny;
          if (footBlocked(s, cx, cy)) continue;
          const px = sx !== 0 ? b.x : b.x + sg * 0.5;
          const py = sx !== 0 ? b.y + sg * 0.5 : b.y;
          if (footBlocked(s, px, py)) continue;
          b.x = px; b.y = py;
          nudged = true;
          break;
        }
      }
      if (nudged) { nudges++; continue; }
    }
    break;
  }
  return moved;
}

/**
 * Moves a body by (dx, dy) with axis-separated collision, one px at a time, so it ends flush against walls.
 * A body that starts inside a solid may move freely until it is out. Returns the distance moved.
 * assist nudges the body around tile corners when it pushes straight into one.
 */
export function moveBody(s: S, b: Pos, dx: number, dy: number, assist = false): number {
  const escape = footBlocked(s, b.x, b.y);
  const a = assist && Math.abs(dy) < 0.01;
  const c = assist && Math.abs(dx) < 0.01;
  let moved = 0;
  if (dx !== 0) moved += moveAxis(s, b, dx, 0, escape, a);
  if (dy !== 0) moved += moveAxis(s, b, 0, dy, escape, c);
  return moved;
}

/** Closest point on a rect to (px, py). */
export function nearestOnRect(p: { x: number; y: number; w: number; h: number }, px: number, py: number): Pos {
  return { x: Math.max(p.x, Math.min(px, p.x + p.w)), y: Math.max(p.y, Math.min(py, p.y + p.h)) };
}

/** Distance from a point to the segment (ax, ay)-(bx, by). */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  if (l2 === 0) return dist(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return dist(px, py, ax + vx * t, ay + vy * t);
}

function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (cy - ay) * (bx - ax) - (by - ay) * (cx - ax);
}

/** True when segment a-b crosses segment c-d. */
export function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = ccw(ax, ay, bx, by, cx, cy), d2 = ccw(ax, ay, bx, by, dx, dy);
  const d3 = ccw(cx, cy, dx, dy, ax, ay), d4 = ccw(cx, cy, dx, dy, bx, by);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
