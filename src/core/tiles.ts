// Tile legend for ASCII stage maps. One character per 16x16 tile.
// gfx draws every TileName. World builds the collision Grid from `solid`.
import type { Grid } from './types.ts';

export type TileName =
  | 'grass' | 'grass2' | 'flowers' | 'dirt' | 'trail' | 'road' | 'roadline' | 'planks' | 'gravel'
  | 'shallows' | 'creek'
  | 'pine' | 'deadtree' | 'bush' | 'rock' | 'stump'
  | 'fence' | 'labfence'
  | 'housewall' | 'houseroof' | 'housedoor' | 'shedwall' | 'shedroof'
  | 'lamp' | 'mailbox'
  | 'labfloor' | 'labfloor2' | 'hazard' | 'labwall' | 'labcap' | 'vent' | 'pipe' | 'glass' | 'cage';

export interface TileDef { name: TileName; solid: boolean; animated?: boolean }

export const TILES: Record<string, TileDef> = {
  '.': { name: 'grass', solid: false },
  ',': { name: 'grass2', solid: false },
  'f': { name: 'flowers', solid: false },
  ':': { name: 'dirt', solid: false },
  '-': { name: 'trail', solid: false },
  '=': { name: 'road', solid: false },
  '_': { name: 'roadline', solid: false },
  'p': { name: 'planks', solid: false },
  'g': { name: 'gravel', solid: false },
  'w': { name: 'shallows', solid: false, animated: true },
  '~': { name: 'creek', solid: true, animated: true },
  'T': { name: 'pine', solid: true },
  't': { name: 'deadtree', solid: true },
  'b': { name: 'bush', solid: true },
  'r': { name: 'rock', solid: true },
  'k': { name: 'stump', solid: true },
  'F': { name: 'fence', solid: true },
  'X': { name: 'labfence', solid: true },
  'H': { name: 'housewall', solid: true },
  'h': { name: 'houseroof', solid: true },
  'd': { name: 'housedoor', solid: true },
  'S': { name: 'shedwall', solid: true },
  's': { name: 'shedroof', solid: true },
  'l': { name: 'lamp', solid: true },
  'm': { name: 'mailbox', solid: true },
  // Hawkins Lab (stage 1.2). Floors and the vent grate are walkable. Walls, pipes, cages and glass are not.
  // Glass is solid but see-through: hero shots fly over terrain, so a relay behind it can still be hit.
  'o': { name: 'labfloor', solid: false },
  'O': { name: 'labfloor2', solid: false },
  'z': { name: 'hazard', solid: false },
  'W': { name: 'labwall', solid: true },
  'V': { name: 'labcap', solid: true },
  'v': { name: 'vent', solid: false },
  'i': { name: 'pipe', solid: true },
  'G': { name: 'glass', solid: true },
  'c': { name: 'cage', solid: true },
};

export const TILE_NAMES = Object.values(TILES).map((d) => d.name);

/** Builds the collision grid. Throws on unknown characters or ragged rows. */
export function buildGrid(rows: string[]): Grid {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    if (row.length !== w) throw new Error(`ragged map row ${y}: ${row.length} vs ${w}`);
    for (let x = 0; x < w; x++) {
      const def = TILES[row[x] ?? ''];
      if (!def) throw new Error(`unknown tile '${row[x]}' at ${x},${y}`);
      solid[y * w + x] = def.solid ? 1 : 0;
    }
  }
  return { w, h, solid };
}

export function isSolidTile(g: Grid, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return true;
  return g.solid[ty * g.w + tx] === 1;
}
