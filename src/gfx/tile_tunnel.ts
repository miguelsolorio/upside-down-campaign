// The tunnels under Hawkins (stage 2.2), the owner's pick: Roots. A dug earth tunnel held up by roots. A dark soil floor with clods; a
// rock mass (tunnelcap) braided with roots, seen from above, and its wall face (tunnelwall) hung with curtains of roots; roots that
// creep across the floor from wall to wall; red veins that pulse; a nest of pods and membrane you walk around; and the ladder out.
// Painted in soil browns and the Upside Down's reds; the night art (night.ts) repaints the browns and leaves the reds as lights, so
// the veins glow. Nothing is random per frame: every tile is a function of where it sits, with variants so halls don't look stamped.
// Roots and veins are arms that leave the middle of a tile's sides (tile_net.ts), so a run of them is one thing. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import { armsOf, coin, flatten, glowLines, routes, stamp, stampRoute, trace, tube, variant } from './tile_net.ts';
import type { Glow, Pt, Side } from './tile_net.ts';

export const TUNNEL_TILES: TileName[] = ['tunnelfloor', 'tunnelcap', 'tunnelwall', 'roots', 'veins', 'nest', 'ladder'];

const isRock = (n: TileName): boolean => n === 'tunnelcap' || n === 'tunnelwall';
const isSolid = (n: TileName): boolean => isRock(n) || n === 'nest';

/** What a painter knows about its place: the variant (0 to 3), whether it is mirrored, which neighbors are solid and whether the wall face is right below. */
interface TC { tx: number; ty: number; v: number; flip: boolean; sN: boolean; sS: boolean; sE: boolean; sW: boolean; faceS: boolean; c: TileCtx }

function tcOf(c: TileCtx): TC {
  const n = c.near;
  return { tx: c.tx, ty: c.ty, v: variant(c), flip: coin(c, 11), sN: isSolid(n.n), sS: isSolid(n.s), sE: isSolid(n.e), sW: isSolid(n.w), faceS: n.s === 'tunnelwall', c };
}

// ---------------------------------------------------------------- floor
const CLODS: [number, number, number, number][][] = [
  [[2, 4, 4, 2], [9, 8, 5, 2], [3, 12, 6, 2]], [[10, 3, 4, 2], [2, 9, 5, 2], [8, 12, 5, 2]],
  [[1, 6, 5, 2], [8, 3, 4, 2], [10, 11, 4, 2]], [[6, 4, 5, 2], [1, 11, 4, 2], [11, 8, 4, 2]],
];
const CHIPS: Pt[][] = [[[2, 3], [10, 7], [4, 11]], [[11, 2], [3, 8], [9, 11]], [[1, 5], [9, 2], [11, 10]], [[7, 3], [2, 10], [12, 7]]];

/** Packed earth: dark clods by variant and pale chips by another, mirrored by a bit of the place hash, and now and then a stone. */
function dirt(t: TC): Px {
  const px = new Px(16).fill('soil1');
  const fx = (x: number, w = 1): number => (t.flip ? 16 - x - w : x);
  for (const [x, y, w, h] of CLODS[t.v] as [number, number, number, number][]) px.rect(fx(x, w), y, w, h, 'soil0');
  for (const [x, y] of CHIPS[hash2(t.tx, t.ty, 13) & 3] as Pt[]) px.set(fx(x), y, 'soil2');
  const h = hash2(t.tx, t.ty, 23) % 11;
  if (h === 0) { const x = 3 + (hash2(t.tx, t.ty, 24) % 8), y = 5 + (hash2(t.tx, t.ty, 25) % 6); px.rect(x, y, 3, 2, 'soil2').set(x, y, 'soil3').rect(x + 1, y + 2, 2, 1, 'soil0'); }
  return px;
}

/** The shadow a wall throws on the floor to its south and east: solid bands, light from the top left. */
function shade(px: Px, t: TC): void {
  if (t.sN) { px.rect(0, 0, 16, 2, 'soil0'); for (let x = 1; x < 16; x += 2) px.set(x, 2, 'soil0'); }
  if (t.sW) px.rect(0, 0, 1, 16, 'soil0');
}

function floor(t: TC): Px {
  const px = dirt(t);
  shade(px, t);
  return px;
}

// ---------------------------------------------------------------- rock mass and wall face
/** Height of a root strand on row i at world column wx: two waves, so the braid is never an even ripple, and the same in every tile it runs through. */
function wave(wx: number, i: number, ty: number): number {
  const ph = (hash2(i, ty, 5) & 15) * 1.7;
  return 1.5 * Math.sin((wx / 20) * Math.PI * 2 + ph) + 0.7 * Math.sin((wx / 7.5) * Math.PI * 2 + ph * 2.1);
}

/** The top of a rock mass: horizontal strands of braided roots, lit on top, running unbroken through the tiles beside it. */
function cap(t: TC): Px {
  const px = new Px(16).fill('soil1');
  for (let i = 0; i < 3; i++) {
    const thick = 2 + (hash2(t.ty, i, 9) & 1), base = 2 + i * 5;
    for (let x = 0; x < 16; x++) {
      const y = Math.round(base + wave(t.tx * 16 + x, i, t.ty));
      px.set(x, y - 1, 'soil3');
      for (let k = 0; k < thick; k++) px.set(x, y + k, 'soil2');
      px.set(x, y + thick, 'soil1');
    }
  }
  const h = hash2(t.tx, t.ty, 27) % 6;
  if (h === 0) { const x = 2 + (hash2(t.tx, t.ty, 28) % 9), y = 2 + (hash2(t.tx, t.ty, 29) % 9); px.rect(x, y, 4, 3, 'soil0').rect(x, y, 3, 2, 'soil3').set(x, y, 'sand'); }
  else if (h === 1) { const x = 2 + (hash2(t.tx, t.ty, 30) % 11), y = 3 + (hash2(t.tx, t.ty, 31) % 9); px.rect(x, y, 2, 2, 'sand').set(x + 1, y + 1, 'soil3'); }
  if (t.faceS) px.rect(0, 14, 16, 1, 'sand').rect(0, 15, 16, 1, 'soil0');
  if (!t.sN) px.rect(0, 0, 16, 1, 'sand');
  if (!t.sW) px.rect(0, 0, 1, 16, 'sand');
  if (!t.sE) px.rect(15, 0, 1, 16, 'soil0');
  return px;
}

/** The face of the wall, looking down onto the floor: curtains of roots, each a few pixels thick, that kink and taper to a tip. */
function wall(t: TC): Px {
  const px = new Px(16).fill('soil1');
  const rootsBelow = t.c.near.s === 'roots';
  for (let i = 0; i < 4; i++) {
    const h = hash2(t.tx, i, 33 + t.ty), x0 = 1 + i * 4 + (h % 7 === 0 ? 1 : 0), kink = 5 + ((t.v + i * 3) % 6);
    // The strand nearest the middle runs on into a root on the floor below, so the two join.
    const reach = rootsBelow && i === 1 ? 16 : 12 + ((h >> 3) % 3);
    for (let y = 2; y < reach; y++) {
      const x = x0 + (y >= kink ? 1 : 0), tip = y > 12 && reach < 16;
      px.set(x - 1, y, 'soil0').set(x, y, tip ? 'soil3' : 'sand').set(x + 1, y, 'soil3').set(x + 2, y, tip ? 'soil1' : 'soil2');
    }
    px.set(x0 + 1, kink - 1, 'soil2').set(x0 + 2, kink + 2, 'soil0');
  }
  px.rect(0, 0, 16, 2, 'soil0');
  if (!rootsBelow) px.rect(0, 15, 16, 1, 'soil0');
  return px;
}

// ---------------------------------------------------------------- roots on the floor
/** A root's width along its length: three at the edges, swelling to four in the middle, and thinning to a point where it ends in the open. */
const girth = (free: boolean) => (u: number): number => (free ? (u > 0.72 ? 1 : u > 0.55 ? 2 : 3) : u > 0.3 && u < 0.7 ? 4 : 3);

/** Bare roots spread at the foot of a wall where a root grows into it: a bar along the wall, and two fingers that run on along its base. */
function buttress(mask: Uint8Array, side: Side): void {
  const horiz = side === 'n' || side === 's', at = side === 'n' || side === 'w' ? 0 : 15, dir = at === 0 ? 1 : -1;
  const put = (a: number, b: number): void => (horiz ? stamp(mask, a, at + b * dir, 1) : stamp(mask, at + b * dir, a, 1));
  for (let a = 5; a <= 10; a++) put(a, 0);
  for (let a = 6; a <= 9; a++) put(a, 1);
  for (const a of [3, 4, 11, 12]) put(a, 0);
  put(2, 1); put(13, 1);
}

/**
 * Roots that creep across the floor and join the walls. Each tile's roots are curves that leave the middle of its sides, toward every
 * neighbor that is a root (when the edge between them is on) or a wall, so a run of them is one root running from wall to wall: bowed
 * and S-shaped by the variant, three px thick and swelling in the middle, lit from the top left, with a shadow on the dirt and a twig here and there.
 * Where one meets a wall it spreads into a foot of bare roots. A root with nothing beside it tapers out from one edge.
 */
function roots(t: TC): Px {
  const px = floor(t);
  const { sides, lone } = armsOf(t.c, (n) => (n === 'roots' ? 'peer' : isRock(n) ? 'wall' : 'none'), 72, 60, 3);
  const mask = new Uint8Array(256), twigs = new Uint8Array(256);
  const rs = routes(sides, t.v, lone);
  rs.forEach((r, k) => {
    stampRoute(mask, r, girth(r.freeEnd));
    if (coin(t.c, 40 + k, 2)) {
      const p = r.pts[7 + (t.v & 1) * 4] as Pt, up = (t.v + k) & 1 ? 1 : -1;
      for (const [x, y] of trace([[Math.round(p[0]), Math.round(p[1])], [Math.round(p[0]) + up * 2, Math.round(p[1]) + 2], [Math.round(p[0]) + up * 4, Math.round(p[1]) + 3]])) twigs[y * 16 + x] = 1;
    }
  });
  if (!lone) for (const side of sides) if (isRock(t.c.near[side])) buttress(mask, side);
  tube(px, mask, 'soil3', 'sand', 'soil2', 'soil0');
  for (let i = 0; i < 256; i++) if (twigs[i] && !mask[i]) px.set(i % 16, (i / 16) | 0, 'soil3');
  return px;
}

// ---------------------------------------------------------------- veins
/** The colors of a vein: a dim halo, a base line, and a brighter pulse that moves along it. */
const RED: Glow = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'pink' };

/** Red veins running through the dirt toward every neighbor that is a vein or a nest, as curves that join from tile to tile, with a branch off one. Phase 0 to 3 moves the pulse. */
function veins(t: TC, phase: number): Px {
  const px = floor(t);
  const { sides, lone } = armsOf(t.c, (n) => (n === 'veins' || n === 'nest' ? 'peer' : 'none'), 90, 80, 4);
  const lines: Pt[][] = [];
  routes(sides, t.v, lone).forEach((r, k) => {
    const line = flatten(r);
    lines.push(line);
    if (k === 0 || coin(t.c, 50 + k, 3)) {
      const m = line[Math.min(line.length - 1, 6)] as Pt, d = (t.v + k) & 1 ? 1 : -1;
      lines.push([m, [m[0] + d * 2, m[1] - 2], [m[0] + d * 4, m[1] - 3]]);
    }
  });
  glowLines(px, lines, phase, RED);
  return px;
}

// ---------------------------------------------------------------- nest
const PODS: Pt[][] = [[[4, 4], [11, 5], [7, 11]], [[5, 5], [11, 9], [4, 12]], [[8, 4], [4, 9], [12, 12]], [[11, 4], [5, 8], [10, 12]]];

/** Lays a mound of pods and membrane over the floor, with rounded, ink rimmed edges where its neighbors are open, so a block of nest reads as one lump. */
function mound(base: Px, m: Px, t: TC): Px {
  const R = 4;
  const inside = (x: number, y: number): boolean => {
    if (x < 0) return t.sW;
    if (x > 15) return t.sE;
    if (y < 0) return t.sN;
    if (y > 15) return t.sS;
    const cx = Math.min(t.sW ? 99 : x, t.sE ? 99 : 15 - x), cy = Math.min(t.sN ? 99 : y, t.sS ? 99 : 15 - y);
    if (cx < 1 || cy < 1) return false;
    return !(cx < R && cy < R && (R - cx) ** 2 + (R - cy) ** 2 > R * R);
  };
  const out = new Px(16);
  out.d.set(base.d);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (inside(x, y)) out.d[y * 16 + x] = m.d[y * 16 + x] as number;
    else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) out.set(x, y, 'ink');
  }
  return out;
}

/** A clump of glossy pods in red membrane with roots running through it. Solid: you walk around it. */
function nest(t: TC): Px {
  const m = new Px(16).fill('blood0');
  const o = hash2(t.tx, t.ty, 19) & 3;
  for (let y = 2; y < 16; y += 5) m.line(0, y + (o & 1), 15, y + 2 - (o & 1), 'blood1');
  for (const [x0, y] of PODS[hash2(t.tx, t.ty, 17) & 3] as Pt[]) {
    const x = t.flip ? 15 - x0 : x0;
    m.ellipse(x, y + 0.6, 3.2, 3.6, 'ink').ellipse(x, y, 3, 3.4, 'blood1').ellipse(x - 0.8, y - 1, 1.3, 1.5, 'rose').set(x - 1, y - 2, 'pink');
  }
  const d = o >> 1;
  m.line(0, 14 - d, 7, 9, 'soil3').line(7, 9, 15, 15 - d, 'soil3').line(0, 15, 7, 10 + d, 'soil2');
  return mound(floor(t), m, t);
}

// ---------------------------------------------------------------- ladder
/** The way out: a wooden ladder up a shaft, in a pool of pale light from above. It is walkable, so it lies flat on the floor. */
function ladder(t: TC): Px {
  const px = floor(t);
  px.rect(2, 0, 12, 16, 'soil0');
  px.rect(3, 0, 10, 16, 'soil1');
  for (const x of [3, 11]) {
    px.rect(x, 0, 2, 16, 'soil2').rect(x, 0, 1, 16, 'soil3').rect(x + 1, 0, 1, 16, 'soil1');
    px.set(x, 0, 'cream').set(x, 15, 'sand');
  }
  for (let y = 1 + (hash2(t.tx, t.ty, 62) & 3); y < 15; y += 4) { px.rect(5, y, 6, 2, 'soil3').rect(5, y, 6, 1, 'sand').rect(5, y + 2, 6, 1, 'soil0'); }
  if (coin(t.c, 61, 2)) px.set(7, 8, 'cream');
  return px;
}

// ---------------------------------------------------------------- public
/** The tunnel tiles. Null for any other tile. Phase 0 to 3 moves the pulse in the veins. */
export function tunnelTile(name: TileName, c: TileCtx, phase = 0): Px | null {
  const t = tcOf(c);
  switch (name) {
    case 'tunnelfloor': return floor(t);
    case 'tunnelcap': return cap(t);
    case 'tunnelwall': return wall(t);
    case 'roots': return roots(t);
    case 'veins': return veins(t, phase);
    case 'nest': return nest(t);
    case 'ladder': return ladder(t);
    default: return null;
  }
}
