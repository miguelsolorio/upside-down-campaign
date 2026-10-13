// Tile navigation. The sim uses a BFS flow field so chasing enemies can walk around trees.
// The bot uses A* between waypoints. Both treat a tile as walkable when the 10 x 8 foot box fits, which is
// any non-solid tile, and refuse to cut diagonal corners.
import { TILE } from '../core/config.ts';
import type { Grid } from '../core/types.ts';
import type { Nav, Pos, S } from './state.ts';
import { propBlocks } from './space.ts';

export type { Nav };
export interface Rect4 { x: number; y: number; w: number; h: number }

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function buildNav(grid: Grid, rects: Rect4[] = []): Nav {
  const blocked = new Uint8Array(grid.w * grid.h);
  blocked.set(grid.solid.subarray(0, blocked.length));
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x / TILE)), x1 = Math.min(grid.w - 1, Math.floor((r.x + r.w - 0.001) / TILE));
    const y0 = Math.max(0, Math.floor(r.y / TILE)), y1 = Math.min(grid.h - 1, Math.floor((r.y + r.h - 0.001) / TILE));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[y * grid.w + x] = 1;
  }
  return { w: grid.w, h: grid.h, blocked };
}

export function inBounds(nav: Nav, x: number, y: number): boolean { return x >= 0 && y >= 0 && x < nav.w && y < nav.h; }
export function isFree(nav: Nav, x: number, y: number): boolean { return inBounds(nav, x, y) && nav.blocked[y * nav.w + x] === 0; }

function canStep(nav: Nav, x: number, y: number, dx: number, dy: number): boolean {
  if (!isFree(nav, x + dx, y + dy)) return false;
  if (dx !== 0 && dy !== 0) return isFree(nav, x + dx, y) && isFree(nav, x, y + dy);
  return true;
}

/** Tile distance from every tile to (tx, ty). -1 for unreachable. */
export function bfs(nav: Nav, tx: number, ty: number): Int16Array {
  const n = nav.w * nav.h;
  const dist = new Int16Array(n).fill(-1);
  if (!inBounds(nav, tx, ty)) return dist;
  const q = new Int32Array(n);
  let qh = 0, qt = 0;
  dist[ty * nav.w + tx] = 0;
  q[qt++] = ty * nav.w + tx;
  while (qh < qt) {
    const i = q[qh++] as number;
    const x = i % nav.w, y = (i / nav.w) | 0;
    const d = dist[i] as number;
    for (const [dx, dy] of DIRS) {
      if (!canStep(nav, x, y, dx, dy)) continue;
      const ni = (y + dy) * nav.w + (x + dx);
      if (dist[ni] !== -1) continue;
      dist[ni] = d + 1;
      q[qt++] = ni;
    }
  }
  return dist;
}

/** The neighbor tile that gets closer to the flow target, or null when already there or cut off. */
export function flowStep(nav: Nav, dist: Int16Array, x: number, y: number): Pos | null {
  const here = inBounds(nav, x, y) ? dist[y * nav.w + x] as number : -1;
  let best: Pos | null = null;
  let bestD = here < 0 ? 32767 : here;
  for (const [dx, dy] of DIRS) {
    if (!canStep(nav, x, y, dx, dy)) continue;
    const d = dist[(y + dy) * nav.w + (x + dx)] as number;
    if (d >= 0 && d < bestD) { bestD = d; best = { x: x + dx, y: y + dy }; }
  }
  return best;
}

/** Keeps s.flow pointed at the active hero's tile. Cheap: a few thousand tiles, redone when the hero moves a tile. */
export function ensureFlow(s: S, hx: number, hy: number): Nav {
  const tx = Math.floor(hx / TILE), ty = Math.floor((hy - 4) / TILE);
  const f = s.flow;
  f.age++;
  if (f.nav === null || f.dist === null || f.tx !== tx || f.ty !== ty || f.age >= 20) {
    f.nav = buildNav(s.grid, s.props.filter(propBlocks));
    f.dist = bfs(f.nav, tx, ty);
    f.tx = tx; f.ty = ty; f.age = 0;
  }
  return f.nav;
}

/** Nearest walkable tile to (x, y), searching outward in rings. Null when the grid has none nearby. */
export function nearestFree(nav: Nav, x: number, y: number, maxR = 6): Pos | null {
  if (isFree(nav, x, y)) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isFree(nav, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

/** A* over tiles. Returns the tiles from just after the start through the goal, or null when no route exists. */
export function astar(nav: Nav, sx: number, sy: number, gx: number, gy: number): Pos[] | null {
  if (!inBounds(nav, sx, sy) || !isFree(nav, gx, gy)) return null;
  if (sx === gx && sy === gy) return [];
  const n = nav.w * nav.h;
  const g = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const hi: number[] = [];
  const hf: number[] = [];
  const push = (i: number, f: number): void => {
    let k = hi.length;
    hi.push(i); hf.push(f);
    while (k > 0) {
      const p = (k - 1) >> 1;
      if ((hf[p] as number) <= f) break;
      hi[k] = hi[p] as number; hf[k] = hf[p] as number;
      k = p;
    }
    hi[k] = i; hf[k] = f;
  };
  const pop = (): number => {
    const top = hi[0] as number;
    const li = hi.pop() as number, lf = hf.pop() as number;
    if (hi.length > 0) {
      let k = 0;
      for (;;) {
        let c = k * 2 + 1;
        if (c >= hi.length) break;
        if (c + 1 < hi.length && (hf[c + 1] as number) < (hf[c] as number)) c++;
        if ((hf[c] as number) >= lf) break;
        hi[k] = hi[c] as number; hf[k] = hf[c] as number;
        k = c;
      }
      hi[k] = li; hf[k] = lf;
    }
    return top;
  };
  const h = (x: number, y: number): number => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  const si = sy * nav.w + sx, gi = gy * nav.w + gx;
  g[si] = 0;
  push(si, h(sx, sy));
  while (hi.length > 0) {
    const i = pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === gi) break;
    const x = i % nav.w, y = (i / nav.w) | 0;
    for (const [dx, dy] of DIRS) {
      if (!canStep(nav, x, y, dx, dy)) continue;
      const ni = (y + dy) * nav.w + (x + dx);
      if (closed[ni]) continue;
      const ng = (g[i] as number) + (dx !== 0 && dy !== 0 ? 1.414 : 1);
      if (ng < (g[ni] as number)) {
        g[ni] = ng; from[ni] = i;
        push(ni, ng + h(x + dx, y + dy));
      }
    }
  }
  if (from[gi] === -1) return null;
  const out: Pos[] = [];
  for (let i = gi; i !== si; i = from[i] as number) out.push({ x: i % nav.w, y: (i / nav.w) | 0 });
  return out.reverse();
}
