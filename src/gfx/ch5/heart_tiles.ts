// The heart of the Abyss (stage 5.3): the climb through the flesh and the round arena where Vecna and the Mind Flayer wait. Three tiles in
// the family of 2.3's flesh (tile_flesh.ts), but redder and wetter, red black like a heart. heartfloor is a glossy mass of lumps
// (lit on the upper left, shaded on the lower right) with black hollows and veins that pulse; where two walls meet at its corner the
// corner is rounded off, so a floor laid in a circle is round. heartwall is the wall: seen from above it is a dark lumpy mass with veins,
// and where floor lies below it, its face, a row of curved ribs of raw cartilage with a vein running down each channel between them.
// heartrim is the arena's edge: the wall that has floor beside it, bulging toward it in a lit lip with ribs under the lip, its convex
// corners rounded so the ring of them reads as one circle. Phase 0 to 3 is the heartbeat: the lumps' lit edges and the veins flare on
// 1. The marks and the glow overlay are in heart_marks.ts. Same calling style as fleshTile: (name, ctx, phase) or null. Pure pixel work.
import type { TileCtx } from '../tile_ground.ts';
import type { ColorName } from '../palette.ts';
import { hash2 } from '../canvas.ts';
import { Px } from '../px.ts';
import { armsOf, coin, flatten, glowLines, noise, routes, variant } from '../tile_net.ts';
import type { Glow } from '../tile_net.ts';
import { near, rim } from './abyss_kit.ts';
import type { Open, Side } from './abyss_kit.ts';

export { channelMark, drawChannelMark, drawHeartGlow } from './heart_marks.ts';
export type { MarkOf } from './heart_marks.ts';

export const HEART_TILES = ['heartfloor', 'heartwall', 'heartrim'] as const;
export type HeartTile = (typeof HEART_TILES)[number];

const isWall = (n: string): boolean => n === 'heartwall' || n === 'heartrim';
const VEINS: Glow = { halo: 'black', base: 'blood1', mid: 'red', bright: 'pink' };
const sidesOf = (c: TileCtx, test: (n: string) => boolean): Open => ({ n: test(near(c, 'n')), e: test(near(c, 'e')), s: test(near(c, 's')), w: test(near(c, 'w')) });

// ---------------------------------------------------------------- the floor
/** The mass of lumps over world pixels: broad swells with smaller ones on them, so the floor runs on from tile to tile. */
const swell = (wx: number, wy: number): number => noise(wx, wy, 10, 111) * 0.7 + noise(wx, wy, 5, 112) * 0.3;
const LUMP = 0.58;

/** The flesh floor without its veins, kept dark and calm so the heroes and the boss stand out on it: red black, with broad lumps of dark red, a few black hollows, the lit edge of a lump on its upper left and its shade on the lower right. */
function mass(c: TileCtx, phase: number): Px {
  const px = new Px(16);
  const lit: ColorName = phase === 1 ? 'red' : 'blood1';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wx = c.tx * 16 + x, wy = c.ty * 16 + y, v = swell(wx, wy);
      if (v > LUMP) px.set(x, y, swell(wx - 1, wy - 1) <= LUMP && (wx + wy) % 3 !== 0 ? lit : swell(wx + 1, wy + 1) <= LUMP ? 'ink' : 'blood0');
      else px.set(x, y, v < 0.2 ? 'black' : 'ink');
    }
  }
  // Wet glints on the lumps.
  for (let i = 0; i < 2; i++) {
    const x = hash2(c.tx, c.ty, 113 + i) % 16, y = hash2(c.tx, c.ty, 123 + i) % 16;
    if (swell(c.tx * 16 + x, c.ty * 16 + y) > LUMP + 0.05) px.set(x, y, phase === 1 ? 'pink' : 'rose');
  }
  return px;
}

/** Veins that run over the floor from tile to tile and branch, pulsing with the beat. */
function veins(px: Px, c: TileCtx, phase: number): void {
  const { sides, lone } = armsOf(c, (n) => ((n as string) === 'heartfloor' ? 'peer' : 'none'), 20, 0, 9);
  if (lone && !coin(c, 117, 7)) return;
  glowLines(px, routes(sides, variant(c), lone).map((r) => flatten(r)), phase, VEINS);
}

/** The wall's mass seen from above, dark: black red lumps with crests, and a few thin veins. */
function wallMass(c: TileCtx): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = noise(c.tx * 16 + x, c.ty * 16 + y, 6, 131) * 0.65 + noise(c.tx * 16 + x, c.ty * 16 + y, 3, 132) * 0.35;
      px.set(x, y, v > 0.8 ? 'blood0' : v > 0.55 ? 'ink' : 'black');
    }
  }
  return px;
}

function floor(c: TileCtx, phase: number): Px {
  const px = mass(c, phase);
  veins(px, c, phase);
  // Shadow where a wall stands over the floor, then the corners that two walls round off.
  const w = sidesOf(c, isWall);
  if (w.n) { px.rect(0, 0, 16, 2, 'ink'); for (let x = 1; x < 16; x += 2) px.set(x, 2, 'ink'); }
  if (w.w) px.rect(0, 0, 1, 16, 'ink');
  if (w.e) px.rect(15, 0, 1, 16, 'ink');
  const rounded = (w.n && w.w) || (w.n && w.e) || (w.s && w.w) || (w.s && w.e);
  if (rounded) rim(px, { n: w.n && (w.w || w.e), s: w.s && (w.w || w.e), w: w.w && (w.n || w.s), e: w.e && (w.n || w.s) }, { ink: 'ink', lit: 'rose', dark: 'blood1' }, 1, 7, wallMass(c));
  return px;
}

// ---------------------------------------------------------------- the wall
/** The face of the wall: ribs of cartilage, each bowed a little and lit on its left, in channels of dark flesh with a vein down each. */
function face(c: TileCtx, phase: number): Px {
  const px = new Px(16).fill('blood0');
  for (let x = 0; x < 16; x++) {
    const wx = c.tx * 16 + x, k = Math.floor(wx / 8), lx = wx % 8;
    // The channel between two ribs: crevices of black and a vein that creeps down it.
    if (lx === 0 || lx === 7) for (let y = 0; y < 16; y++) if ((y + k) % 3 !== 0) px.set(x, y, 'ink');
    const dir = k % 2 === 0 ? 1 : -1;
    for (let y = 1; y < 14; y++) {
      const bow = Math.round(1.3 * Math.sin((Math.PI * (y - 1)) / 12)) * dir;
      const half = y <= 1 || y >= 13 ? 1 : y === 2 || y === 12 ? 1.5 : 2;
      const off = lx - (3.5 + bow);
      if (Math.abs(off) <= half) px.set(x, y, off <= -half + 0.5 ? 'pink' : off >= half - 0.5 ? 'blood1' : y % 5 === 0 ? 'blood1' : 'rose');
      else if (Math.abs(off) <= half + 1) px.set(x, y, 'ink');
    }
  }
  // A vein in each channel, with a pulse of light moving down it.
  for (let k = Math.floor((c.tx * 16) / 8); k <= Math.floor((c.tx * 16 + 15) / 8); k++) {
    const x = k * 8 + (k % 2 === 0 ? 7 : 0) - c.tx * 16;
    if (x < 0 || x > 15) continue;
    for (let y = 2; y < 15; y++) if ((y + k) % 3 === 0) px.set(x, y, (y + phase * 3 + k) % 12 < 2 ? (phase === 1 ? 'hot' : 'red') : 'blood1');
  }
  px.rect(0, 0, 16, 2, 'ink');
  px.rect(0, 14, 16, 2, 'ink');
  for (let x = 2; x < 16; x += 4) px.set(x + (hash2(c.tx, c.ty, 133) & 1), 15, 'blood0');
  if (!isWall(near(c, 'w'))) px.rect(0, 0, 1, 16, 'ink');
  if (!isWall(near(c, 'e'))) px.rect(15, 0, 1, 16, 'ink');
  return px;
}

function wall(c: TileCtx, phase: number): Px {
  if (!isWall(near(c, 's'))) return face(c, phase);
  const px = wallMass(c);
  const { sides, lone } = armsOf(c, (n) => (isWall(n as string) ? 'peer' : 'none'), 26, 0, 11);
  if (!lone || coin(c, 134, 4)) glowLines(px, routes(sides, variant(c), lone).map((r) => flatten(r)), phase, { halo: 'black', base: 'blood1', mid: 'red', bright: 'hot' });
  return px;
}

// ---------------------------------------------------------------- the arena's edge
/** The ribs of the ridge: bars of cartilage across it, 3 px wide every 6, lit on the left, from the lip to the far side of the tile, along every side that has floor. */
function ribs(px: Px, open: Open, c: TileCtx): void {
  const along: Record<Side, (i: number, d: number) => [number, number]> = { n: (i, d) => [i, d], s: (i, d) => [i, 15 - d], w: (i, d) => [d, i], e: (i, d) => [15 - d, i] };
  for (const s of ['n', 's', 'w', 'e'] as const) {
    if (!open[s]) continue;
    for (let i = 0; i < 16; i++) {
      const wi = (s === 'n' || s === 's' ? c.tx : c.ty) * 16 + i, k = wi % 6;
      for (let d = 3; d <= 14; d++) {
        const [x, y] = along[s](i, d);
        if (x < 0 || y < 0 || x > 15 || y > 15) continue;
        const end = d >= 13;
        px.set(x, y, k === 0 ? (end ? 'red' : 'rose') : k === 1 ? (end ? 'blood1' : 'red') : k === 2 ? 'blood1' : k === 3 ? 'ink' : 'blood0');
      }
    }
  }
}

/** The arena's edge: a ridge with ribs across it, lit toward a north or west floor and dark toward a south or east one, its convex corners rounded off into the floor. */
function edge(c: TileCtx, phase: number): Px {
  const px = wallMass(c);
  const open = sidesOf(c, (n) => !isWall(n));
  ribs(px, open, c);
  rim(px, open, { ink: 'ink', lit: phase === 1 ? 'pink' : 'rose', dark: 'red', inner: 'blood0' }, 2, 7, mass(c, phase));
  return px;
}

// ---------------------------------------------------------------- public
/** The heart's tiles. Null for any other tile. Phase 0 to 3 is the heartbeat, as fleshTile's is the pulse. */
export function heartTile(name: string, c: TileCtx, phase = 0): Px | null {
  switch (name as HeartTile) {
    case 'heartfloor': return floor(c, phase);
    case 'heartwall': return wall(c, phase);
    case 'heartrim': return edge(c, phase);
    default: return null;
  }
}
