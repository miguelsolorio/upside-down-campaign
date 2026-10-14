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
  | 'labfloor' | 'labfloor2' | 'hazard' | 'labwall' | 'labcap' | 'vent' | 'pipe' | 'glass' | 'cage'
  // Lab dressing, so each room has its own look. Floors, cables, drains, stains and creeping vines are walkable.
  | 'locker' | 'bench' | 'cabinet' | 'shelf' | 'cable' | 'drain' | 'stain' | 'vines' | 'mass'
  | 'tilegreen' | 'carpet' | 'wallsign' | 'plate'
  // Hawkins Middle School (stage 1.3, night).
  | 'schoolfloor' | 'checker' | 'gymfloor' | 'schoolwall' | 'schoolcap' | 'lockerwall' | 'desk' | 'chalkboard'
  | 'trophy' | 'table' | 'counter' | 'bleachers' | 'brick'
  // The Palace Arcade, Main Street and Merrill's pumpkin patch (stage 2.1, day).
  | 'arcadecarpet' | 'arcadewall' | 'sidewalk' | 'storefront' | 'furrow' | 'pumpkin' | 'rotpumpkin' | 'haybale'
  | 'barnwall' | 'barnroof' | 'corn' | 'rot' | 'hole';

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
  // Lab dressing. A locker, bench, cabinet or shelf is furniture you walk around. A mass is Upside Down growth
  // that has swollen out of the wall. Vines creep across the floor and can be walked through.
  'L': { name: 'locker', solid: true },
  'B': { name: 'bench', solid: true },
  'C': { name: 'cabinet', solid: true },
  'N': { name: 'shelf', solid: true },
  'q': { name: 'cable', solid: false },
  'D': { name: 'drain', solid: false },
  'x': { name: 'stain', solid: false },
  'U': { name: 'vines', solid: false },
  'M': { name: 'mass', solid: true },
  // Room floors: green tile for the animal lab, dark carpet for the records wing, a metal plate under a hazard.
  'a': { name: 'tilegreen', solid: false },
  'e': { name: 'carpet', solid: false },
  'E': { name: 'plate', solid: false },
  // A wall face with a painted sign or number on it. Solid like any wall.
  'Y': { name: 'wallsign', solid: true },
  // Hawkins Middle School (stage 1.3). Walls are a schoolcap row over a schoolwall row, like the Lab. Lockers,
  // chalkboards and the trophy case are wall faces. Desks, tables, the counter and the bleachers are furniture.
  'n': { name: 'schoolfloor', solid: false },
  'j': { name: 'checker', solid: false },
  'u': { name: 'gymfloor', solid: false },
  'J': { name: 'schoolwall', solid: true },
  'K': { name: 'schoolcap', solid: true },
  'A': { name: 'lockerwall', solid: true },
  'P': { name: 'desk', solid: true },
  'Q': { name: 'chalkboard', solid: true },
  'R': { name: 'trophy', solid: true },
  'I': { name: 'table', solid: true },
  'Z': { name: 'counter', solid: true },
  '#': { name: 'bleachers', solid: true },
  '%': { name: 'brick', solid: true },
  // Stage 2.1: the arcade, Main Street, the pumpkin patch. Furrows, rot and the hole are walkable.
  '+': { name: 'arcadecarpet', solid: false },
  '&': { name: 'arcadewall', solid: true },
  '/': { name: 'sidewalk', solid: false },
  '@': { name: 'storefront', solid: true },
  '^': { name: 'furrow', solid: false },
  '*': { name: 'pumpkin', solid: true },
  '$': { name: 'rotpumpkin', solid: true },
  '0': { name: 'haybale', solid: true },
  '[': { name: 'barnwall', solid: true },
  ']': { name: 'barnroof', solid: true },
  '|': { name: 'corn', solid: true },
  ';': { name: 'rot', solid: false },
  '<': { name: 'hole', solid: false },
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
