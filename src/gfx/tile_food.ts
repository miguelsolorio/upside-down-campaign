// Starcourt's food court and its back of house (stage 3.3): the court's floor, its band and the patch under the skylight, the
// stalls, the kitchens and the escalator. Flat stand-ins until Art paints them from the owner's pick on
// foodcourt-variations.html (docs/level-9.md): a fill and a frame.
import type { TileName } from '../core/tiles.ts';
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import type { TileCtx } from './tile_ground.ts';

export const FOOD_TILES: TileName[] = ['foodfloor', 'foodband', 'skyfloor', 'stallcap', 'stall', 'kitchenfloor', 'fryer', 'escalator'];

const FLAT: Partial<Record<TileName, [ColorName, ColorName]>> = {
  foodfloor: ['bone', 'mist'], foodband: ['magenta', 'pink'], skyfloor: ['night', 'blue'], stallcap: ['ink', 'purple0'],
  stall: ['red', 'yellow'], kitchenfloor: ['blood0', 'rose'], fryer: ['grey3', 'white'], escalator: ['grey2', 'grey3'],
};

/** A food court tile, or null when `name` isn't one. */
export function foodTile(name: TileName, _c: TileCtx): Px | null {
  const flat = FLAT[name];
  return flat ? new Px(16).rect(0, 0, 16, 16, flat[0]).frame(0, 0, 16, 16, flat[1]) : null;
}
