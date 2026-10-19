// Vecna's attic (stage 4.4, docs/level-13.md) in the owner's pick, Vine nest (gfx/var/attic_a.ts), painted with the sheet's own look: the underside
// of the roof (the ridge on the top row, boards between rafters, a top plate over a knee wall at its foot), floorboards, the worn rug where he
// stands, and the eave as low floor along each side wall, where the cover sits. The tiles are the look's painters called with the letters
// they read (LETTER): # the roof's top row, W the roof under it and the knee wall, . floor, r rug, < the west eave and > the east one. A roof
// tile with roof above it is the wall's face (W) and not another ridge, so the side walls of a taller attic read as walls; an eave looks for
// the side the open floor is on (a run of three is one slope, dark at the wall and lighter toward the room). Painted in daytime values for the
// night pass, which leaves the reds alone.
//
// What depends on where in the room a tile is cannot be a tile: the vines hanging from the rafters into a knot over the middle, and the roots
// running over the floor from the four orbs to his feet. Those are layers (lairLayers) laid over the baked stage by tiles.ts and animated at the
// step of the pulse, anchored on the rug: the knot hangs 24 px over its top edge and the roots meet 36 px under it, with the orbs at the four
// corners (ORB_AT), which is where the sheet stood them. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { ATTIC_A } from './var/attic_a.ts';
import { knot, roots } from './var/attic_fx.ts';
import type { StageLook, TC } from './var/look_kit.ts';
import type { Pt } from './var/tunnel_paint.ts';

export const ATTIC_TILES: TileName[] = ['atticroof', 'atticwall', 'atticfloor', 'atticrug', 'atticeave'];

/** The sheet's Vine nest, the look these tiles are painted with. Found on first use: the sheet's modules reach the night pass, which reaches this file. */
let nest: StageLook | undefined;
const vineNest = (): StageLook => (nest ??= ATTIC_A.find((l) => l.slug === 'vine-nest') as StageLook);

const LETTER: Partial<Record<TileName, string>> = { atticroof: '#', atticwall: 'W', atticfloor: '.', atticrug: 'r', atticeave: '<' };
const solid = (n: TileName): boolean => n === 'atticroof' || n === 'atticwall';
const open = (n: TileName): boolean => n === 'atticfloor' || n === 'atticrug';
/** What the sheet's painters read a neighbor as: the attic's own by letter, the house's walls and caps as roof, anything else as floor. */
const read = (n: TileName): string => LETTER[n] ?? (/cap|wall/.test(n) ? '#' : '.');

/**
 * Whether the eave at (x, y) runs along the west wall, for a stage that has `at` to say what is where (the empty name past its edge): along its row
 * through the unbroken run of eaves to the wall at one end, the way the floor is not. A run between two walls, or two stretches of floor, goes to the nearer end.
 */
export function eaveWest(at: (x: number, y: number) => TileName | '', x: number, y: number): boolean {
  let l = x, r = x;
  while (at(l - 1, y) === 'atticeave') l--;
  while (at(r + 1, y) === 'atticeave') r++;
  const wall = (n: TileName | ''): boolean => n === '' || solid(n as TileName);
  const lw = wall(at(l - 1, y)), rw = wall(at(r + 1, y));
  return lw !== rw ? lw : x - l <= r - x;
}

/** The letter a tile is painted by. */
function letterOf(name: TileName, c: TileCtx): string {
  const { n, e, w } = c.near;
  switch (name) {
    case 'atticroof': return c.ty === 0 || !solid(n) ? '#' : 'W';
    case 'atticeave': {
      // The wall is on the side the open floor isn't. A bake knows the run it is in (c.west); alone, a tile guesses from its neighbors.
      const west = c.west ?? (solid(w) ? true : solid(e) ? false : open(e) ? !open(w) || !(c.tx & 1) : open(w) ? false : !(c.tx & 1));
      return west ? '<' : '>';
    }
    default: return LETTER[name] ?? '.';
  }
}

/** An attic tile in Vine nest, or null when `name` isn't one. */
export function atticTile(name: TileName, c: TileCtx): Px | null {
  if (!LETTER[name]) return null;
  const tc: TC = { ch: letterOf(name, c), tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 11) & 3, n: read(c.near.n), s: read(c.near.s), e: read(c.near.e), w: read(c.near.w) };
  return vineNest().tile(tc, 0);
}

/** The attic's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function atticNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'atticroof': return v === 0 ? all(name) : { n: v === 1 ? 'atticfloor' : name, e: name, s: 'atticwall', w: name };
    case 'atticwall': return v === 0 ? { n: 'atticroof', e: name, s: 'atticfloor', w: name } : v === 1 ? { n: 'atticroof', e: 'atticeave', s: 'atticfloor', w: name } : { n: 'atticroof', e: name, s: 'atticeave', w: 'atticeave' };
    case 'atticfloor': return v === 0 ? all(name) : v === 1 ? { n: 'atticwall', e: name, s: name, w: name } : { n: 'atticwall', e: name, s: name, w: 'atticrug' };
    case 'atticrug': return v === 0 ? all(name) : v === 1 ? { n: name, e: name, s: 'atticfloor', w: 'atticfloor' } : { n: 'atticfloor', e: name, s: name, w: 'atticfloor' };
    case 'atticeave': return v === 0 ? { n: 'atticwall', e: 'atticeave', s: 'atticeave', w: 'atticroof' } : v === 1 ? { n: 'atticeave', e: 'atticeave', s: 'atticeave', w: 'atticeave' } : { n: 'atticeave', e: 'atticfloor', s: 'atticeave', w: 'atticeave' };
    default: return near;
  }
}

// ---------------------------------------------------------------- the layers
/** Where the four orbs stand, as the offsets of their feet from the rug's top left and bottom right corners: 14 px out to the side, 16 under its top edge and 8 under its bottom. */
export const ORB_AT = { x: 14, top: 16, bottom: 8 } as const;

/** A picture laid over the baked stage at (x, y), drawn at a step of the pulse (0 to 3). */
export interface LairLayer { id: string; x: number; y: number; w: number; h: number; draw(phase: number): Px }

/** The box of the rug in tiles, or null when the stage has none. `names` is the stage row by row, `cols` wide. */
function rugBox(names: readonly TileName[], cols: number): { x0: number; y0: number; x1: number; y1: number } | null {
  let box: { x0: number; y0: number; x1: number; y1: number } | null = null;
  names.forEach((n, i) => {
    if (n !== 'atticrug') return;
    const x = i % cols, y = (i / cols) | 0;
    box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
  });
  return box;
}

/**
 * The knot of vines over the rug and the roots under it, as they hang in Vine nest: the sheet's coordinates with the rug at its place, so the
 * strands start 64 px over the rug's top edge (the sheet's roof) or at the top of the stage, whichever is lower. Nothing for a stage with no rug.
 */
export function lairLayers(names: readonly TileName[], cols: number): LairLayer[] {
  const rug = rugBox(names, cols);
  if (!rug) return [];
  const W = 256, cx = ((rug.x0 + rug.x1 + 1) * 16) >> 1, top = rug.y0 * 16, bottom = (rug.y1 + 1) * 16;
  const x = cx - (W >> 1), y = Math.max(0, top - 64), drop = top - 64 - y, kc = 40 + drop;
  const feet: Pt[] = [[rug.x0 * 16 - ORB_AT.x, top + ORB_AT.top], [(rug.x1 + 1) * 16 + ORB_AT.x, top + ORB_AT.top], [rug.x0 * 16 - ORB_AT.x, bottom + ORB_AT.bottom], [(rug.x1 + 1) * 16 + ORB_AT.x, bottom + ORB_AT.bottom]];
  const local = feet.map(([fx, fy]) => [fx - x, fy - y] as Pt);
  return [
    { id: 'roots', x, y, w: W, h: 160, draw: (phase) => roots(phase, local, [128, top - y + 36], W, 160) },
    { id: 'knot', x, y, w: W, h: 100, draw: (phase) => knot(phase, 128, kc) },
  ];
}
