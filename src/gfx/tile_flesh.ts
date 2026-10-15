// The Lab overrun (stage 2.3): the Upside Down has grown over the lab tiles. Three tiles in the same family as the tunnels' (tile_tunnel.ts),
// dark flesh and red veins over the pale lab panels they replace. fleshfloor is the lab floor eaten by a wet dark mass that stops in
// islands of bare panel; fleshwall is a lab wall face with the flesh hanging over it from the roof edge; tear is a glowing crack in the
// floor beside the Gate. The patches come from noise over world pixels, so they run on from tile to tile, and the veins are arms that
// meet at the sides (tile_net.ts). The night art leaves the reds and the Gate's fire as lights and repaints the lab panels. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import { labFace, labFloor } from './tile_lab.ts';
import type { TileCtx } from './tile_ground.ts';
import { rngFor } from './tile_ground.ts';
import { armsOf, coin, flatten, glowLines, noise, routes, stamp, stampRoute, variant } from './tile_net.ts';
import type { Glow, Pt, Route } from './tile_net.ts';

export const FLESH_TILES: TileName[] = ['fleshfloor', 'fleshwall', 'tear'];

const isFlesh = (n: TileName): boolean => n === 'fleshfloor' || n === 'fleshwall' || n === 'tear';
const VEIN: Glow = { halo: 'blood1', base: 'red', mid: 'hot', bright: 'pink' };

/** Dark flesh over a pale tile: a wet mass in two reds with a lit rim where it ends, a shadow it throws on what it covers, and now and then a glint. */
function overlay(px: Px, c: TileCtx, covered: (x: number, y: number) => boolean): void {
  const on = (x: number, y: number): boolean => (x < 0 || y < 0 || x > 15 || y > 15 ? covered(x, y) : covered(x, y));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (on(x, y)) continue;
      // Bare panel next to the mass sits in its shadow: dark to the right and below it.
      if (on(x - 1, y) || on(x, y - 1)) px.set(x, y, 'ink');
    }
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!on(x, y)) continue;
      const wx = c.tx * 16 + x, wy = c.ty * 16 + y;
      const m = noise(wx, wy, 5, 71);
      const edge = !on(x + 1, y) || !on(x, y + 1) || !on(x - 1, y) || !on(x, y - 1);
      px.set(x, y, edge ? 'blood1' : m > 0.62 ? 'blood1' : 'blood0');
      if (!edge && m > 0.8 && ((x + y) & 1) === 0) px.set(x, y, 'red');
    }
  }
  for (let i = 0; i < 2; i++) {
    const x = hash2(c.tx, c.ty, 73 + i) % 14 + 1, y = hash2(c.tx, c.ty, 77 + i) % 14 + 1;
    if (on(x, y) && on(x + 1, y) && on(x, y + 1)) px.set(x, y, 'rose').set(x + 1, y, 'pink');
  }
}

/** The veins on a flesh tile: curves to every neighbor of the family that the edge between them switches on, and a branch off one of them. */
function veins(px: Px, c: TileCtx, phase: number): void {
  const v = variant(c);
  const { sides, lone } = armsOf(c, (n) => (isFlesh(n) ? 'peer' : 'none'), 42, 0, 5);
  const lines: Pt[][] = [];
  routes(sides, v, lone).forEach((r, k) => {
    const line = flatten(r);
    lines.push(line);
    if (k === 0 && coin(c, 85, 2)) {
      const m = line[Math.min(line.length - 1, 6)] as Pt, d = (v + k) & 1 ? 1 : -1;
      lines.push([m, [m[0] + d * 2, m[1] - 2], [m[0] + d * 4, m[1] - 3]]);
    }
  });
  glowLines(px, lines, phase, VEIN);
}

// ---------------------------------------------------------------- floor
function fleshFloor(c: TileCtx, phase: number): Px {
  const px = labFloor(c, rngFor(c, 'fleshfloor'), coin(c, 5, 2), true);
  overlay(px, c, (x, y) => noise(c.tx * 16 + x, c.ty * 16 + y, 6, 61) < 0.76);
  veins(px, c, phase);
  return px;
}

// ---------------------------------------------------------------- wall
/** The lab wall face with the flesh hanging over it from the roof edge in lumps, so the tile is mostly eaten and the kick plate peeks out between the drips. */
function fleshWall(c: TileCtx, phase: number): Px {
  const px = labFace(c, rngFor(c, 'fleshwall'), false);
  const hang = (x: number): number => 8 + Math.round(noise(c.tx * 16 + x, c.ty * 3, 4, 63) * 7);
  overlay(px, c, (x, y) => y < hang(x));
  veins(px, c, phase);
  px.rect(0, 0, 16, 1, 'blood0');
  return px;
}

// ---------------------------------------------------------------- tear
/** The colors of the Gate's fire: a cleft of black with a red-hot rim, a core that burns orange and flares to yellow and cream. */
const FIRE = { rim: 'hot', core: 'orange', flare: 'yellow', spark: 'cream' } as const;

/** A glowing crack in the floor, walked over: a jagged cleft that runs to every neighboring tear, ragged edges lit red-hot, a burning core that pulses with the phase. */
function tear(c: TileCtx, phase: number): Px {
  const px = labFloor(c, rngFor(c, 'tear'), coin(c, 5, 2), true);
  overlay(px, c, (x, y) => noise(c.tx * 16 + x, c.ty * 16 + y, 6, 61) < 0.88);
  const v = variant(c);
  const { sides, lone } = armsOf(c, (n) => (n === 'tear' ? 'peer' : 'none'), 100, 0, 6);
  const cleft = new Uint8Array(256), line = new Uint8Array(256);
  routes(sides, v, lone).forEach((r) => {
    // The cleft is ragged: every few pixels along it jumps a pixel off the line.
    const jag: Pt[] = r.pts.map((p, i) => (i === 0 || i === r.pts.length - 1 ? p : [p[0] + ((i * 5 + v) % 3) - 1, p[1] + ((i * 3 + v) % 3) - 1] as Pt));
    const ragged: Route = { ...r, pts: jag };
    stampRoute(cleft, ragged, () => 3);
    for (const [x, y] of flatten(ragged)) line[y * 16 + x] = 1;
  });
  stamp(cleft, 7, 7, lone ? 3 : 4);
  line[7 * 16 + 7] = 1;
  const at = (m: Uint8Array, x: number, y: number): number => (x < 0 || y < 0 || x > 15 || y > 15 ? 0 : (m[y * 16 + x] as number));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (at(cleft, x, y)) { px.set(x, y, 'black'); continue; }
      if (at(cleft, x - 1, y) || at(cleft, x + 1, y) || at(cleft, x, y - 1) || at(cleft, x, y + 1)) px.set(x, y, FIRE.rim);
    }
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!at(line, x, y)) continue;
      const k = (x + y * 2 + phase * 2) % 8;
      px.set(x, y, k < 3 ? FIRE.flare : FIRE.core);
      if (k === 0) px.set(x, y, FIRE.spark);
    }
  }
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
