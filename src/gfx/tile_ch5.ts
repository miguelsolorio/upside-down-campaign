// Chapter 5's tiles: Hawkins under lockdown (stage 5.1), the Abyss (stage 5.2) and the heart of it (stage 5.3). The painters are drawn in
// src/gfx/ch5/ (lockdown_tiles.ts, abyss_tiles.ts, heart_tiles.ts); this file is where the game's tile drawing reaches them, in one place:
// `ch5Tile` paints a tile of theirs or says it is not (null), `isCh5Pulse` lists the ones that move with the pulse (the rift's glow, the
// Abyss's veins, the heartbeat), and `nightName` is what a lockdown tile is called in the town's own names, for the night pass. A lockdown
// tile reads its neighbors as the town's names too (a road beside a road line), so those are mapped before it is painted. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import type { Px } from './px.ts';
import { rngFor } from './tile_ground.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { CORE, LOCKDOWN_TILES, lockdownGround, lockdownObject } from './ch5/lockdown_tiles.ts';
import type { LockdownTile } from './ch5/lockdown_tiles.ts';
import { ABYSS_TILES, abyssTile } from './ch5/abyss_tiles.ts';
import { HEART_TILES, heartTile } from './ch5/heart_tiles.ts';

const LOCKDOWN = new Set<string>(LOCKDOWN_TILES);
/** The tiles whose picture changes with the phase of the pulse. The rift glows, the island tops and rock carry veins and drips, the heart beats. */
const PULSES = new Set<string>(['rift0', 'rift1', 'rift2', ...ABYSS_TILES.filter((n) => n !== 'abyssgap' && n !== 'abyssbridgeh' && n !== 'abyssbridgev'), ...HEART_TILES]);

/** A tile in the town's own names: the lockdown ones by CORE, every other tile as it is. */
export const nightName = (name: TileName): TileName => (LOCKDOWN.has(name) ? CORE[name as LockdownTile] : name);

export const isCh5Pulse = (name: TileName): boolean => PULSES.has(name);

const coreNear = (n: Near): Near => ({ n: nightName(n.n), e: nightName(n.e), s: nightName(n.s), w: nightName(n.w) });

/**
 * One chapter 5 tile at a step of the pulse (0 is the baked picture), or null when `name` isn't one. The rift's halo swells on steps 1 and
 * 2; the Abyss and the heart take the step as it is.
 */
export function ch5Tile(name: TileName, c: TileCtx, phase = 0): Px | null {
  if (LOCKDOWN.has(name)) {
    const tc: TileCtx = { ...c, near: coreNear(c.near) };
    const r = rngFor(tc, name);
    return lockdownGround(name as LockdownTile, tc, r, phase === 1 || phase === 2) ?? lockdownObject(name as LockdownTile, tc, r);
  }
  return abyssTile(name, c, phase) ?? heartTile(name, c, phase);
}
