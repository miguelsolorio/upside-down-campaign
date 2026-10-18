// Chapter 4's tiles: the Kamchatka camp and the pit (stage 4.1) are painted from the owner's picks in tile_camp.ts and tile_pit.ts; the
// Hellfire Club (stage 4.2) in its Storm look in tile_club.ts, and the Creel House in tile_creel.ts, Abandoned and, in memory, Blood red.
// `memory` paints the Creel House's letters in its Blood red skin (bakeStage(rows, night, 'memory')); every other tile is the same in it.
import type { TileName } from '../core/tiles.ts';
import type { Px } from './px.ts';
import { campTile } from './tile_camp.ts';
import { clubTile } from './tile_club.ts';
import { creelTile } from './tile_creel.ts';
import { pitTile } from './tile_pit.ts';
import type { TileCtx } from './tile_ground.ts';

/** A chapter 4 tile, or null when `name` isn't one. `phase` is the step of a club tile that moves (the window's rain and lightning, the table's candles); the default is the one the stage is baked with. */
export function ch4Tile(name: TileName, c: TileCtx, memory = false, phase?: number): Px | null {
  return campTile(name, c) ?? pitTile(name, c) ?? clubTile(name, c, phase) ?? creelTile(name, c, memory);
}
