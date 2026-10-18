// Shared by the Abyss tiles (abyss_tiles.ts, stage 5.2): which neighbors are island, bridge or drop, the island's rim cut from what lies
// past its edge (so a corner is rounded and a side is lit or shaded the same way on every tile), world-pixel noise that runs on from
// tile to tile, and a transpose for the vertical bridge. The tile names are listed here and not in core/tiles.ts, which the build
// extends when it registers them. Pure pixel work: no DOM.
import { noise } from '../tile_net.ts';
import type { Paint } from '../px.ts';
import type { TileCtx } from '../tile_ground.ts';
import { Px } from '../px.ts';

export type Side = 'n' | 'e' | 's' | 'w';
export const SIDES: Side[] = ['n', 'e', 's', 'w'];

/** The floors an island is made of: Hawkins, upside down. */
export const TOPS = ['abysslawn', 'abyssroad', 'abyssline', 'abyssporch', 'abyssclass'] as const;
export const BRIDGES = ['abyssbridgeh', 'abyssbridgev'] as const;
/** Every tile this file set paints. cliff is the rock face under an island's south edge, under the rock that tapers below it, gap the drop. */
export const ABYSS_TILES = [...TOPS, 'abysscliff', 'abyssunder', 'abyssgap', ...BRIDGES] as const;
export type AbyssTile = (typeof ABYSS_TILES)[number];

export const isTop = (n: string): boolean => (TOPS as readonly string[]).includes(n);
export const isBridge = (n: string): boolean => (BRIDGES as readonly string[]).includes(n);
/** What the eye reads as the drop: a gap, the rock under an island, or a cliff face. */
export const isDrop = (n: string): boolean => n === 'abyssgap' || n === 'abyssunder' || n === 'abysscliff';
/** Solid ground that is not a drop: an island floor, a bridge, or any other tile of the game (a house wall on an island, a vine). */
export const isLand = (n: string): boolean => !isDrop(n);

/** The name of a neighbor as a plain string, since the game's TileName does not list these tiles until the build adds them. */
export const near = (c: TileCtx, s: Side): string => c.near[s] as string;

/** World noise 0 to 1, in cells of `cell` px, that runs on from tile to tile. */
export const wn = (c: TileCtx, x: number, y: number, cell: number, salt: number): number => noise(c.tx * 16 + x, c.ty * 16 + y, cell, salt);

/** Which sides of a tile open onto the drop. */
export type Open = Record<Side, boolean>;

export interface RimColors { ink: Paint; lit: Paint; dark: Paint; inner?: Paint }

/**
 * Cuts the tile to the island's outline and draws the rim: the pixels past an open side are cleared (or, with `under`, replaced by the
 * same pixels of that picture, so the heart's floor shows in the corner a wall gives up), an open corner is chamfered, then
 * every pixel within `depth` of the edge becomes the outline (ink at the edge), the lip (lit on a north or west edge, dark on a south or
 * east one, light from the top left) and, a pixel further in, the inner shade.
 */
export function rim(px: Px, open: Open, cols: RimColors, depth = 2, chamfer = 3, under?: Px): void {
  const out = (x: number, y: number): boolean => {
    if (y < 0) return open.n;
    if (y > 15) return open.s;
    if (x < 0) return open.w;
    if (x > 15) return open.e;
    return (open.n && open.w && x + y < chamfer) || (open.n && open.e && 15 - x + y < chamfer)
      || (open.s && open.w && x + 15 - y < chamfer) || (open.s && open.e && 30 - x - y < chamfer);
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (out(x, y)) { px.d[y * 16 + x] = under ? (under.d[y * 16 + x] as number) : 0; continue; }
      let best = 9, lit = false;
      for (let d = 1; d <= depth + 1 && best > d; d++) {
        for (let dy = -d; dy <= d; dy++) {
          for (let dx = -d; dx <= d; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== d || !out(x + dx, y + dy)) continue;
            if (best > d) { best = d; lit = dx < 0 || dy < 0; }
          }
        }
      }
      if (best === 1) px.set(x, y, cols.ink);
      else if (best === 2) px.set(x, y, lit ? cols.lit : cols.dark);
      else if (best === 3 && cols.inner && !lit) px.set(x, y, cols.inner);
    }
  }
}

/** The same picture with x and y swapped, for the vertical bridge. */
export function transposed(src: Px): Px {
  const out = new Px(src.h, src.w);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) out.d[x * out.w + y] = src.d[y * src.w + x] as number;
  return out;
}
