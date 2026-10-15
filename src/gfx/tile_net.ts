// Shared by the tunnel tiles (tile_tunnel.ts) and the overrun Lab's (tile_flesh.ts): growth that runs from tile to tile. A root, a vein
// or a tear is drawn as arms that leave the middle of a tile's sides, so two tiles that both have an arm toward each other meet at
// the shared edge, and a run of tiles reads as one thing creeping across the floor. An arm only goes toward a neighbor that is part
// of the same growth or a wall it can grow into, so nothing starts in the open and stops dead at a tile's edge. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';

export type Pt = readonly [number, number];
export type Side = 'n' | 'e' | 's' | 'w';
export const SIDES: Side[] = ['n', 'e', 's', 'w'];
/** Where an arm meets a side: the middle of it. A 3 px brush centered here covers the pixel before and after. */
export const ANCHOR: Record<Side, Pt> = { n: [7, 0], e: [15, 7], s: [7, 15], w: [0, 7] };

/** The variant of a tile (0 to 3) and a second, independent bit, both from its place on the map. */
export const variant = (c: TileCtx, salt = 7): number => hash2(c.tx, c.ty, salt) & 3;
export const coin = (c: TileCtx, salt: number, odds = 2): boolean => hash2(c.tx, c.ty, salt) % odds === 0;

/** Every pixel along a polyline, in order, with no repeats. */
export function trace(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Pt, b = pts[i + 1] as Pt;
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push([Math.round(a[0] + ((b[0] - a[0]) * k) / n), Math.round(a[1] + ((b[1] - a[1]) * k) / n)]);
  }
  return out;
}

/** The neighbor on a side of a tile. */
export const nearOf = (c: TileCtx, s: Side): TileName => c.near[s];

/** What a neighbor is to a growth: more of it (an edge both tiles agree on), something it grows into (a wall), or nothing. */
export type Link = 'peer' | 'wall' | 'none';

/** True for the edge between this tile and its neighbor on a side, from a hash both tiles compute alike, so each decides the same way. */
function edgeHash(c: TileCtx, side: Side, salt: number): number {
  const [x, y, kind] = side === 'n' ? [c.tx, c.ty - 1, 1] : side === 's' ? [c.tx, c.ty, 1] : side === 'w' ? [c.tx - 1, c.ty, 2] : [c.tx, c.ty, 2];
  return hash2(x, y, salt * 7 + kind) % 100;
}

/**
 * The sides a growth leaves by. Toward a peer only when the edge between the two tiles is switched on (decided the same from either
 * side, so the arm is there on both or neither), which makes a branching network and not a lattice; toward a wall by the tile's own
 * hash, since a wall draws nothing back. When nothing is switched on one side is chosen from the tile's place, and `lone` tells the
 * caller so it can taper that arm short of the edge. `peers` may be a function of the side, which must give the same answer for both tiles
 * of an edge (take it from the edge's own place), so a growth can be denser or lean one way in one part of the map.
 */
export function armsOf(c: TileCtx, link: (n: TileName) => Link, peers: number | ((s: Side) => number) = 65, walls = 55, salt = 3): { sides: Side[]; lone: boolean } {
  const sides = SIDES.filter((s) => {
    const k = link(nearOf(c, s));
    if (k === 'none') return false;
    return k === 'peer' ? edgeHash(c, s, salt) < (typeof peers === 'number' ? peers : peers(s)) : hash2(c.tx, c.ty, 90 + salt * 5 + SIDES.indexOf(s)) % 100 < walls;
  });
  if (sides.length) return { sides, lone: false };
  return { sides: [SIDES[hash2(c.tx, c.ty, 19) & 3] as Side], lone: true };
}

const CENTER: Pt = [7.5, 7.5];
const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** A cubic curve through four control points, sampled n times. */
function cubic(a: Pt, b: Pt, c: Pt, d: Pt, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
  }
  return out;
}

/** A curve from a to b that bows by `o` px across, or swings to one side and back when `s` is set, as a root does. */
function through(a: Pt, b: Pt, o: number, s: boolean): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, p: Pt = [-dy / n, dx / n];
  return cubic(a, add(lerp(a, b, 0.33), p, o), add(lerp(a, b, 0.67), p, s ? -o : o), b);
}

/** One way a growth goes through a tile: its points, and which ends are free (they taper to a tip). */
export interface Route { pts: Pt[]; freeStart: boolean; freeEnd: boolean }

/**
 * How a growth runs through a tile that has these arms. One arm is a root that tapers to a tip inside the tile. Two are joined by one
 * smooth curve, bowed or S-shaped by the variant. Three are a curve between an opposite pair with the third running into the middle of
 * it. Four are two curves that cross. With no arm touching an edge (`lone`) it is a short free piece in the middle. The curves start
 * and end on the side anchors, so the pieces in neighboring tiles join.
 */
export function routes(sides: Side[], v: number, lone: boolean): Route[] {
  const o = (v & 1 ? 3 : -3), s = (v & 2) !== 0;
  const free = (pts: Pt[], a: boolean, b: boolean): Route => ({ pts, freeStart: a, freeEnd: b });
  if (lone) {
    const side = sides[0] as Side, a = lerp(ANCHOR[side], CENTER, 0.45), b = lerp(ANCHOR[side], CENTER, 1.2);
    return [free(through(a, [b[0] + (v & 1 ? 2 : -2), b[1]], o, s), true, true)];
  }
  if (sides.length === 1) {
    const a = ANCHOR[sides[0] as Side], tip = lerp(a, CENTER, 1.15);
    return [free(through(a, add(tip, [v & 1 ? 2 : -2, v & 2 ? 2 : -2]), o, s), false, true)];
  }
  const opposite = (x: Side, y: Side): boolean => (x === 'n' && y === 's') || (x === 's' && y === 'n') || (x === 'e' && y === 'w') || (x === 'w' && y === 'e');
  const arc = (x: Side, y: Side): Route => {
    const a = ANCHOR[x], b = ANCHOR[y];
    return free(opposite(x, y) ? through(a, b, o, s) : cubic(a, lerp(a, CENTER, 0.6), lerp(b, CENTER, 0.6), b), false, false);
  };
  if (sides.length === 2) return [arc(sides[0] as Side, sides[1] as Side)];
  if (sides.length === 3) {
    const pair = sides.find((x) => sides.some((y) => opposite(x, y))) as Side;
    const mate = sides.find((y) => opposite(pair, y)) as Side;
    const other = sides.find((x) => x !== pair && x !== mate) as Side;
    const main = arc(pair, mate), at = main.pts[9] as Pt;
    return [main, free(through(ANCHOR[other], at, o / 2, false), false, false)];
  }
  return [arc('n', 's'), arc('w', 'e')];
}

/** The points of a route rounded to pixels, and joined into a polyline of whole pixels. */
export const flatten = (r: Route): Pt[] => trace(r.pts.map((p) => [Math.round(p[0]), Math.round(p[1])] as Pt));

/** Stamps a square brush of w px centered on a pixel (an even brush leans toward the bottom right). */
export function stamp(mask: Uint8Array, x: number, y: number, w: number): void {
  const lo = -Math.floor((w - 1) / 2);
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const xx = x + lo + i, yy = y + lo + j;
    if (xx >= 0 && yy >= 0 && xx < 16 && yy < 16) mask[yy * 16 + xx] = 1;
  }
}

/** Draws a route in a mask with a brush whose width may change along it: thick(u) takes 0 at the start to 1 at the end. */
export function stampRoute(mask: Uint8Array, r: Route, thick: (u: number) => number): void {
  const path = flatten(r);
  path.forEach(([x, y], i) => stamp(mask, x, y, thick(path.length > 1 ? i / (path.length - 1) : 0)));
}

/**
 * Paints a mask as a lit tube, lit from the top left: a highlight along an empty pixel above or to the left, the dark color along
 * one below or to the right, the body color between, and a drop shadow on the floor under it. The same shading for an arm in any direction.
 */
export function tube(px: Px, mask: Uint8Array, body: ColorName, hi: ColorName, lo: ColorName, drop: ColorName | null): void {
  // Past the tile's edge the tube is taken to run on, so an arm that leaves a side is lit the same on both sides of it.
  const at = (x: number, y: number): number => (mask[Math.max(0, Math.min(15, y)) * 16 + Math.max(0, Math.min(15, x))] as number);
  if (drop) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!mask[y * 16 + x] && (at(x, y - 1) || at(x - 1, y))) px.set(x, y, drop);
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!mask[y * 16 + x]) continue;
      px.set(x, y, !at(x, y - 1) || !at(x - 1, y) ? hi : !at(x, y + 1) || !at(x + 1, y) ? lo : body);
    }
  }
}

/** The colors of a glowing line: a dim halo round it, the base line, and a pulse that moves along it in two steps. */
export interface Glow { halo: ColorName; base: ColorName; mid: ColorName; bright: ColorName }

/** Paints routes as glowing lines: every halo first, then every base line, then the pulse, so a crossing never loses its line. Phase 0 to 3 moves the pulse. */
export function glowLines(px: Px, routes: readonly (readonly Pt[])[], phase: number, g: Glow): void {
  const paths = routes.map((r) => trace(r));
  for (const path of paths) for (const [x, y] of path) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) px.set(x + dx, y + dy, g.halo);
  for (const path of paths) for (const [x, y] of path) px.set(x, y, g.base);
  for (const path of paths) {
    path.forEach(([x, y], i) => {
      const k = (i + phase * 2) % 8;
      if (k === 0 || k === 1) px.set(x, y, g.mid);
      if (k === 1) px.set(x, y, g.bright);
    });
  }
}

/** Smooth noise from 0 to 1 over world pixels, in cells of `cell` px: a flesh patch or a drip's length that runs on from tile to tile. */
export function noise(wx: number, wy: number, cell: number, salt: number): number {
  const gx = Math.floor(wx / cell), gy = Math.floor(wy / cell), fx = wx / cell - gx, fy = wy / cell - gy;
  const h = (x: number, y: number): number => hash2(x, y, salt) / 4294967296;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = h(gx, gy) + (h(gx + 1, gy) - h(gx, gy)) * sx, bot = h(gx, gy + 1) + (h(gx + 1, gy + 1) - h(gx, gy + 1)) * sx;
  return top + (bot - top) * sy;
}
