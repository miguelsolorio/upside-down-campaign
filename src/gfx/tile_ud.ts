// Chapter 4's second half: Upside Down Hawkins and the trailer's roof (stage 4.3) and Vecna's attic (stage 4.4). Flat stand-ins until
// Art paints them from the owner's picks (docs/level-12.md, docs/level-13.md): a fill and a frame. The 'flash' skin is the storm's bolt
// over 4.3's letters, the lit edges gone red; until Art paints it the stand-ins only brighten their frame.
import type { TileName } from '../core/tiles.ts';
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import type { TileCtx } from './tile_ground.ts';

const FLAT: Partial<Record<TileName, [ColorName, ColorName]>> = {
  udroad: ['night', 'shadow'], udline: ['night', 'blood1'], udwalk: ['shadow', 'dusk'], udlawn: ['ink', 'shadow'], udveins: ['ink', 'blood1'],
  udhouse: ['dusk', 'ink'], udwindow: ['dusk', 'blood0'], uddoor: ['shadow', 'ink'], udroof: ['ink', 'night'], udtrailer: ['slate', 'ink'],
  udfence: ['shadow', 'ink'], udtree: ['ink', 'blood0'], roofdeck: ['grey1', 'slate'], roofedge: ['ink', 'grey1'],
  atticroof: ['ink', 'blood0'], atticwall: ['soil0', 'ink'], atticfloor: ['soil0', 'blood0'], atticrug: ['blood0', 'ink'], atticeave: ['ink', 'soil0'],
};

/** A 4.3 or 4.4 tile, or null when `name` isn't one. */
export function udTile(name: TileName, _c: TileCtx, flash = false): Px | null {
  const flat = FLAT[name];
  if (!flat) return null;
  return new Px(16).rect(0, 0, 16, 16, flat[0]).frame(0, 0, 16, 16, flash && name.startsWith('ud') ? 'red' : flat[1]);
}
