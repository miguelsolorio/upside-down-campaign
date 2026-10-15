// The Lab overrun (stage 2.3): the Upside Down has grown over the lab tiles. Three tiles in the same family as the tunnels' (tile_tunnel.ts).
// They are the quiet part of the picture: the heroes, the demodogs and the rift are what the eye should land on, so the flesh stays dark
// and low in contrast. fleshfloor is a wet dark mass in three near-black tones with a few thin veins; fleshwall is the same mass hanging
// in lumps from the roof edge; tear is a thin dark crack in the floor with a dim red seam that pulses. The lumps come from noise over
// world pixels, so they run on from tile to tile, and the veins are arms that meet at the sides (tile_net.ts) and lean toward the rift in
// the Gate chamber. Where the flesh meets a lab tile the edge is the tile's own, straight, with nothing bright on it. The night art
// (night.ts) steps the reds down a little and keeps the flesh to them. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import { isWally } from './tile_lab.ts';
import type { TileCtx } from './tile_ground.ts';
import { ANCHOR, SIDES, armsOf, coin, flatten, noise, routes, stamp, trace, variant } from './tile_net.ts';
import type { Pt, Side } from './tile_net.ts';

export const FLESH_TILES: TileName[] = ['fleshfloor', 'fleshwall', 'tear'];

const isFlesh = (n: TileName): boolean => n === 'fleshfloor' || n === 'fleshwall' || n === 'tear';
/** The mouth of the rift in the Gate chamber, in tiles. The veins near it lean toward it. */
const RIFT: Pt = [40, 4.5];
const PULL_REACH = 13;
const STEP: Record<Side, Pt> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/** How likely a vein is to cross the edge on a side: some everywhere, and many where the edge points at the rift and the rift is near. Both tiles of an edge get the same answer. */
function pull(c: TileCtx, s: Side): number {
  const [dx, dy] = STEP[s];
  const mx = c.tx + 0.5 + dx * 0.5, my = c.ty + 0.5 + dy * 0.5;
  const vx = RIFT[0] - mx, vy = RIFT[1] - my, d = Math.hypot(vx, vy) || 1;
  const along = Math.abs(vx * dx + vy * dy) / d;
  return 9 + 40 * along * along * Math.max(0, 1 - d / PULL_REACH);
}

/** The dark mass: soil with lumps of dark blood on it, and a few black hollows, in lumps that run on from tile to tile. A wall's foot and the side of a wall throw a shadow on it. `bare` leaves off the blood, so a crack is the only red on its tile. */
function mass(c: TileCtx, bare = false): Px {
  const px = new Px(16);
  // Around the rift, where the party fights, the blood thins out and the floor goes to plain dark earth.
  const calm = Math.max(0, 1 - Math.hypot(c.tx + 0.5 - RIFT[0], c.ty + 0.5 - RIFT[1]) / 8), lump = 0.6 + 0.2 * calm;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wx = c.tx * 16 + x, wy = c.ty * 16 + y;
      const m = noise(wx, wy, 8, 61) * 0.65 + noise(wx, wy, 4, 62) * 0.35;
      px.set(x, y, m > lump && !bare ? 'blood0' : m < 0.38 ? 'ink' : 'soil0');
    }
  }
  const wall = (n: TileName): boolean => isWally(n) || n === 'fleshwall';
  if (wall(c.near.n)) px.rect(0, 0, 16, 2, 'ink');
  if (wall(c.near.w)) px.rect(0, 0, 1, 16, 'ink');
  return px;
}

/** A vein is one pixel wide, blood-red on the mass, with a lighter pixel that creeps along it. */
function thin(px: Px, lines: readonly (readonly Pt[])[], phase: number): void {
  for (const line of lines) {
    trace(line).forEach(([x, y], i) => {
      px.set(x, y, (i + phase * 2) % 12 === 0 ? 'red' : 'blood1');
    });
  }
}

/** The veins on a flesh tile: curves to every neighbor of the family that the edge between them switches on, and now and then a branch. Many tiles have none. */
function veins(px: Px, c: TileCtx, phase: number): void {
  const v = variant(c);
  const { sides, lone } = armsOf(c, (n) => (isFlesh(n) ? 'peer' : 'none'), (s) => pull(c, s), 0, 5);
  if (lone && !coin(c, 61, 5)) return;
  const lines: Pt[][] = [];
  routes(sides, v, lone).forEach((r, k) => {
    const line = flatten(r);
    lines.push(line);
    if (k === 0 && !lone && coin(c, 85, 3)) {
      const m = line[Math.min(line.length - 1, 6)] as Pt, d = (v + k) & 1 ? 1 : -1;
      lines.push([m, [m[0] + d * 2, m[1] - 2], [m[0] + d * 3, m[1] - 3]]);
    }
  });
  thin(px, lines, phase);
}

// ---------------------------------------------------------------- floor
function fleshFloor(c: TileCtx, phase: number): Px {
  const px = mass(c);
  veins(px, c, phase);
  return px;
}

// ---------------------------------------------------------------- wall
/** The mass hanging from the roof edge in lumps: dark creases run down between them, each lump ends in a lit lower lip, and the foot of the wall is the dark earth. */
function fleshWall(c: TileCtx, phase: number): Px {
  const px = new Px(16).fill('soil0');
  for (let x = 0; x < 16; x++) {
    const wx = c.tx * 16 + x;
    const hang = 10 + Math.round(noise(wx, c.ty * 3, 4, 63) * 5);
    const crease = noise(wx, c.ty * 5, 3, 64) < 0.34;
    for (let y = 0; y < 16; y++) {
      if (y >= hang) px.set(x, y, y === hang && !crease ? 'ink' : 'soil0');
      else if (crease && y > 1) px.set(x, y, 'ink');
      else if (y >= hang - 2) px.set(x, y, 'blood0');
    }
  }
  px.rect(0, 0, 16, 1, 'ink');
  if (coin(c, 62, 3)) veins(px, c, phase);
  return px;
}

// ---------------------------------------------------------------- tear
const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** One arm of a crack: straight pieces that jump a pixel off the line from a side's anchor (or `reach` of the way to it) to the middle, so it reads as a split and not a curve. */
function arm(c: TileCtx, side: Side, k: number, reach: number): Pt[] {
  const [dx, dy] = STEP[side], start = lerp([7, 7], ANCHOR[side], reach);
  const pts: Pt[] = [start];
  for (let i = 1; i <= 2; i++) {
    const p = lerp(start, [7, 7], i / 3), j = (hash2(c.tx, c.ty, 200 + k * 9 + i) % 5) - 2;
    pts.push([p[0] + dy * j, p[1] + dx * j]);
  }
  pts.push([7, 7]);
  return trace(pts.map((p) => [Math.round(p[0]), Math.round(p[1])] as Pt));
}

/**
 * A thin dark crack in the floor, walked over: a black split, a pixel or two wide with a ragged upper edge, that jumps its way to every
 * neighboring tear and ends in short forks on the free sides, with a dim red glow along its lower right edge that pulses with the phase.
 */
function tear(c: TileCtx, phase: number): Px {
  const px = mass(c, true);
  const { sides, lone } = armsOf(c, (n) => (n === 'tear' ? 'peer' : 'none'), 100, 0, 6);
  const path: Pt[] = [];
  sides.forEach((s, k) => path.push(...arm(c, s, k, lone ? 0.8 : 1)));
  SIDES.forEach((s, k) => { if (!sides.includes(s) && (hash2(c.tx, c.ty, 210 + k) & 1)) path.push(...arm(c, s, 4 + k, 0.8)); });
  const crack = new Uint8Array(256);
  const put = (x: number, y: number): void => { if (x >= 0 && y >= 0 && x < 16 && y < 16) crack[y * 16 + x] = 1; };
  for (const [x, y] of path) {
    put(x, y);
    if (hash2(x, y, 211 + c.tx * 3 + c.ty) & 1) put(x - 1, y);
    if (hash2(x, y, 212 + c.ty * 5 + c.tx) & 1) put(x, y - 1);
  }
  stamp(crack, 7, 7, 3);
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x > 15 || y > 15 ? 0 : (crack[y * 16 + x] as number));
  // The glow lies on the floor to the right of and below the split. A pulse of brighter red creeps along it.
  const glow: [number, number, boolean][] = [];
  path.forEach(([x, y], i) => {
    for (const [gx, gy] of [[x + 1, y], [x, y + 1]] as Pt[]) if (!at(gx, gy) && gx < 16 && gy < 16) glow.push([gx, gy, (i + phase * 2) % 8 < 3]);
  });
  for (const [x, y] of glow) px.set(x, y, 'blood1');
  for (const [x, y, hot] of glow) if (hot) px.set(x, y, 'red');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (at(x, y)) px.set(x, y, 'black');
  return px;
}

// ---------------------------------------------------------------- public
/** The overrun Lab's tiles. Null for any other tile. Phase 0 to 3 moves the pulse in the veins and the tear. */
export function fleshTile(name: TileName, c: TileCtx, phase = 0): Px | null {
  switch (name) {
    case 'fleshfloor': return fleshFloor(c, phase);
    case 'fleshwall': return fleshWall(c, phase);
    case 'tear': return tear(c, phase);
    default: return null;
  }
}
