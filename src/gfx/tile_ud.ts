// Chapter 4's second half: Upside Down Hawkins and the trailer's roof (stage 4.3), painted in the owner's Blue storm look by tile_udtown.ts
// (the street and the houses) and tile_udpark.ts (the trailers, the fence, the tree, the roof deck and its lip), and Vecna's attic (stage 4.4),
// painted in the owner's Vine nest look by tile_attic.ts. The 'flash' skin is the storm's bolt over 4.3's letters: the same tiles with the
// lit edges gone red and the wet road streaked bright (docs/level-12.md).
import type { TileName } from '../core/tiles.ts';
import type { Px } from './px.ts';
import { atticTile } from './tile_attic.ts';
import type { TileCtx } from './tile_ground.ts';
import { parkTile } from './tile_udpark.ts';
import { townTile } from './tile_udtown.ts';

/** A 4.3 or 4.4 tile, or null when `name` isn't one. `flash` is the bolt's bake of 4.3, `phase` the step of the veins (and the crack on the roof) that pulse. */
export function udTile(name: TileName, c: TileCtx, flash = false, phase = 0): Px | null {
  return atticTile(name, c) ?? townTile(name, c, flash, phase) ?? parkTile(name, c, flash, phase);
}
