// Starcourt's food court and its back of house (stage 3.3), the owner's pick: Neon Strip (gfx/var/food_neon.ts, docs/level-9.md). The
// Confetti mall's cooler cousin: a glossy black floor with a lattice of dark purple diamonds and a stud of tube light at the heart of
// each, a band of two neon tubes, a skylight of blue glass tiles, black stall fronts outlined in tube light with a lit pictogram for a
// menu board under a zigzag awning, a dark teal kitchen with black fryers and a hot red strip, and an escalator with rails of light.
// The neon is every light there is, so the colors are the ones the night art leaves alone (cyan, magenta, pink, yellow). The painters
// share their helpers with the sheet (paint_kit.ts) and take the same context the mall's do (mcOf), so a tile's variant comes from its
// place and a floor isn't stamped: the studs change color, the corners change their dots, and now and then a bulb is dead or a tile
// cracked. A table in the court is a round tube lit one, on the court's floor. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { BAYER4, hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { Paint } from './px.ts';
import { dots, shade } from './paint_kit.ts';
import type { MC, Pt } from './paint_kit.ts';
import type { TileCtx } from './tile_ground.ts';
import { transposed } from './tile_lab.ts';
import { mcOf } from './tile_mall.ts';

export const FOOD_TILES: TileName[] = ['foodfloor', 'foodband', 'skyfloor', 'stallcap', 'stall', 'kitchenfloor', 'fryer', 'escalator'];
/** The floors: tiles you walk on, which the dressing that stands on a floor (a table, the goo) is painted over. */
export const FOOD_FLOORS = new Set<TileName>(['foodfloor', 'foodband', 'skyfloor', 'kitchenfloor']);

/** One of four lists of points by tile variant, so a floor's flecks differ from tile to tile. */
const pickPts = (v: number, ...lists: Pt[][]): Pt[] => lists[v & 3] as Pt[];
const bayer = (x: number, y: number): boolean => (BAYER4[(y & 3) * 4 + (x & 3)] as number) > 7;

/** A menu board's pictograms, 7 by 6, by stall variant: a burger, a slice of pizza, a soda, a cone. Letters map through the board's colors. */
const GLYPHS: string[][] = [
  ['.aaaaa.', 'aaaaaaa', '.ggggg.', '.ppppp.', 'bbbbbbb', '.bbbbb.'],
  ['ccccccc', '.crrcc.', '.ccrrc.', '..ccc..', '...c...', '.......'],
  ['wwwwwww', '.sssss.', '.swwws.', '.sssss.', '..sss..', '..sss..'],
  ['.ppp...', 'ppppp..', '.ppp...', '.ttt...', '..t....', '.......'],
];
const BOARD: Record<string, Paint> = { a: 'pink', g: 'cyan', p: 'yellow', b: 'pink', c: 'yellow', r: 'hot', w: 'cyan', s: 'pink', t: 'yellow' };

/** Pixels of the patch's edge where a tile of one kind meets another, dithered so the patch's edge is not a hard line. */
function ditherEdge(px: Px, c: MC, a: Paint, b: Paint): void {
  for (let i = 0; i < 16; i++) {
    for (let d = 0; d < 3; d++) {
      if ((BAYER4[((i + d) & 3) * 4 + (d & 3)] as number) / 16 >= (3 - d) / 4) continue;
      const col = bayer(i, d) ? a : b;
      if (!c.kN) px.set(i, d, col);
      if (!c.kS) px.set(i, 15 - d, col);
      if (!c.kW) px.set(d, i, col);
      if (!c.kE) px.set(15 - d, i, col);
    }
  }
}

/** The glossy black floor: a lattice of dark purple diamonds with a stud of tube light in each, and a few flecks that change from tile to tile. */
function foodfloor(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.line(8, 0, 15, 7, 'purple0').line(15, 8, 8, 15, 'purple0').line(7, 15, 0, 8, 'purple0').line(0, 7, 7, 0, 'purple0');
  // The stud: cyan or magenta tube light, a pink one now and then, and a dead bulb (dark purple) one tile in nine.
  const dead = hash2(c.tx, c.ty, 71) % 9 === 0;
  px.rect(7, 7, 2, 2, dead ? 'purple' : c.v === 2 ? 'pink' : c.v & 1 ? 'cyan' : 'magenta');
  dots(px, pickPts(c.v, [[1, 1], [14, 14]], [[14, 1], [1, 14]], [[1, 14], [14, 1], [4, 12]], [[14, 14], [1, 1], [11, 3]]), 'teal1');
  // A scuff on some tiles, a crack in one in eleven.
  if (c.v === 3) px.line(3, 11, 6, 12, 'purple');
  if (c.v === 1) px.line(10, 4, 12, 3, 'purple');
  if (hash2(c.tx, c.ty, 73) % 11 === 0) px.line(2, 13, 5, 10, 'black').line(5, 10, 6, 9, 'black').set(4, 12, 'purple0');
  shade(px, c, 'black', 'ink');
  return px;
}

/** The band: two neon tubes, teal over purple, with a few white sparks that sit differently from tile to tile. It runs across a hall or down one. */
function foodband(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 4, 16, 1, 'teal0').rect(0, 5, 16, 1, 'cyan').rect(0, 6, 16, 1, 'teal0').rect(0, 9, 16, 1, 'purple0').rect(0, 10, 16, 1, 'magenta').rect(0, 11, 16, 1, 'purple0');
  dots(px, pickPts(c.v, [[3, 5], [11, 5], [7, 10], [15, 10]], [[5, 5], [13, 5], [1, 10], [9, 10]], [[0, 5], [8, 5], [4, 10], [12, 10]], [[6, 5], [14, 5], [2, 10], [10, 10]]), 'white');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

/** The patch under the skylight: blue glass in nested frames with a bright stud, dithered into the floor at its edges. */
function skyfloor(c: MC): Px {
  const px = new Px(16).fill('night');
  px.frame(1, 1, 14, 14, 'blue').frame(4, 4, 8, 8, 'blue').rect(7, 7, 2, 2, 'sky');
  dots(px, [[1, 1], [14, 1], [1, 14], [14, 14], ...pickPts(c.v, [[3, 8]], [[8, 3]], [[12, 8]], [[8, 12]])], 'sky');
  ditherEdge(px, c, 'ink', 'black');
  return px;
}

/** The awning over a stall: a purple band with a zigzag of pink along it, a magenta hem. */
function stallcap(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 2, 16, 9, 'purple0');
  for (let x = 0; x < 16; x++) px.set(x, 4 + (x % 8 < 4 ? x % 8 : 8 - (x % 8)), 'pink');
  px.rect(0, 12, 16, 1, 'magenta').rect(0, 13, 16, 1, 'purple0');
  if (c.v === 2) dots(px, [[3, 8], [12, 7]], 'cyan');
  return px;
}

/** A stall front: a menu board lit in tube light with a pictogram (a burger, a slice, a soda, a cone by variant), over a black counter with a magenta lip. */
function stall(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.frame(1, 0, 14, 10, 'cyan').rect(2, 1, 12, 8, 'night');
  px.art(GLYPHS[c.v & 3] as string[], BOARD, 3, 2);
  px.rect(11, 3, 3, 1, 'cyan').rect(11, 5, 2, 1, 'cyan').rect(11, 7, 3, 1, 'magenta');
  px.rect(0, 10, 16, 1, 'magenta').rect(0, 11, 16, 5, 'black');
  for (let x = 2; x < 16; x += 4) px.rect(x, 12, 1, 3, 'purple');
  return px;
}

/** The kitchen's floor: dark teal quarry in four squares with a lighter grout, and a cyan fleck or two. */
function kitchenfloor(c: MC): Px {
  const px = new Px(16).fill('teal0');
  px.rect(0, 0, 16, 1, 'teal1').rect(0, 0, 1, 16, 'teal1').rect(0, 8, 16, 1, 'teal1').rect(8, 0, 1, 16, 'teal1');
  dots(px, pickPts(c.v, [[3, 3]], [[11, 5]], [[5, 11]], [[12, 12]]), 'cyan');
  if (hash2(c.tx, c.ty, 79) % 7 === 0) px.rect(10, 11, 3, 2, 'night').set(11, 11, 'teal1');
  shade(px, c, 'night', 'teal0');
  return px;
}

/** A fryer line: a steel hood over a vat of glowing oil, a black front with a hot red strip and a cyan one. */
function fryer(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(2, 2, 12, 6, 'ink').rect(3, 4, 10, 3, 'orange').rect(3, 4, 10, 1, 'amber');
  dots(px, pickPts(c.v, [[5, 5], [10, 6]], [[4, 6], [9, 5]], [[7, 5], [12, 6]], [[6, 6], [11, 5]]), 'cream');
  px.rect(0, 9, 16, 7, 'ink').rect(1, 11, 14, 1, 'hot').rect(1, 13, 14, 1, 'cyan').rect(3, 14, 2, 1, 'yellow').rect(11, 14, 2, 1, 'yellow');
  return px.frame(0, 0, 16, 16, 'black');
}

/** The escalator: dark steps with a ridge, rails of tube light on the open sides, and magenta chevrons pointing the way up. */
function escalator(c: MC): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) px.rect(0, y, 16, 1, y % 4 === 3 ? 'black' : y % 2 ? 'grey1' : 'ink');
  if (!c.kW) px.rect(0, 0, 1, 16, 'teal0').rect(1, 0, 1, 16, 'cyan').rect(2, 0, 1, 16, 'teal0');
  if (!c.kE) px.rect(15, 0, 1, 16, 'teal0').rect(14, 0, 1, 16, 'cyan').rect(13, 0, 1, 16, 'teal0');
  const x0 = c.kE ? 11 : 5;
  for (const y of [3, 10]) px.line(x0 - 3, y + 3, x0, y, 'magenta').line(x0, y, x0 + 3, y + 3, 'magenta');
  return px;
}

/** A table in the court: a round top ringed in cyan tube light, a pink stud at its heart, on a grey stem and purple feet. */
function table(): Px {
  const px = new Px(16);
  px.ellipse(3, 13, 2.5, 1.7, 'purple').ellipse(13, 13, 2.5, 1.7, 'purple').ellipse(8, 14, 4, 1.5, 'grey1').rect(7, 9, 2, 5, 'grey1');
  px.ellipse(8, 7, 7, 4.5, 'cyan').ellipse(8, 7, 6, 3.5, 'ink').rect(7, 6, 2, 2, 'pink');
  return px;
}

const PAINT: Partial<Record<TileName, (c: MC) => Px>> = { foodfloor, foodband, skyfloor, stallcap, stall, kitchenfloor, fryer, escalator };

/** A food court tile, or null when `name` isn't one. */
export function foodTile(name: TileName, c: TileCtx): Px | null {
  const paint = PAINT[name];
  return paint ? paint(mcOf(c, name)) : null;
}

/** The tiles around this one are the court's: a table beside them is in the court, not in a school. */
export const inCourt = (c: TileCtx): boolean => Object.values(c.near).some((n) => n === 'foodfloor' || n === 'foodband' || n === 'skyfloor');

/** A table in the court, standing on the court's floor. */
export function foodTable(c: TileCtx): Px {
  return (foodTile('foodfloor', c) as Px).blit(table(), 0, 0);
}
