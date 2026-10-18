// Chapter 4's tiles: the Kamchatka camp and the pit (stage 4.1) are painted from the owner's picks in tile_camp.ts and tile_pit.ts; the
// Hellfire Club and the Creel House (stage 4.2) are flat stand-ins until Art paints them (docs/level-11.md): a fill and a frame. `memory`
// paints the Creel House's letters in its Blood red skin (bakeStage(rows, night, 'memory')).
import type { TileName } from '../core/tiles.ts';
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import { campTile } from './tile_camp.ts';
import { pitTile } from './tile_pit.ts';
import type { TileCtx } from './tile_ground.ts';

const FLAT: Partial<Record<TileName, [ColorName, ColorName]>> = {
  clubcap: ['ink', 'dusk'], clubwall: ['dusk', 'night'], clubboard: ['teal0', 'soil1'], clubposter: ['red', 'bone'], clubwindow: ['blue', 'night'],
  clubdoor: ['soil1', 'soil0'], clubshelf: ['soil0', 'red'], clubfloor: ['grey2', 'grey3'], clubdesk: ['soil2', 'soil1'], dndtable: ['red', 'ink'],
  creelcap: ['ink', 'night'], creelwall: ['slate', 'dusk'], creelwin: ['night', 'blue'], creelfloor: ['soil1', 'soil0'], creelrug: ['blood0', 'soil0'],
  creelhole: ['ink', 'black'], creelstairs: ['soil0', 'soil1'], creelfurn: ['bone', 'grey3'],
};

/** The memory skin's colors for the Creel House: deep red damask, near black wood. */
const MEMORY: Partial<Record<TileName, [ColorName, ColorName]>> = {
  creelcap: ['ink', 'blood0'], creelwall: ['blood1', 'blood0'], creelwin: ['blood0', 'red'], creelfloor: ['ink', 'blood0'],
  creelrug: ['red', 'blood1'], creelhole: ['black', 'ink'], creelstairs: ['ink', 'blood0'], creelfurn: ['blood0', 'red'],
};

/** A chapter 4 tile, or null when `name` isn't one. */
export function ch4Tile(name: TileName, c: TileCtx, memory = false): Px | null {
  const painted = campTile(name, c) ?? pitTile(name, c);
  if (painted) return painted;
  const flat = (memory ? MEMORY[name] : undefined) ?? FLAT[name];
  return flat ? new Px(16).rect(0, 0, 16, 16, flat[0]).frame(0, 0, 16, 16, flat[1]) : null;
}
