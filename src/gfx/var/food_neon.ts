// Food court look 2, "Neon Strip": the court as the Confetti mall's cooler cousin. A glossy black floor with a lattice of dark purple
// diamonds and a cyan stud at each, a band of two neon tubes, black counters outlined in tube light with a lit pictogram for a menu
// board, a skylight of blue glass tiles, a dark teal kitchen and black fryers with a hot red strip. The neon is every light there is.
// See food.ts.
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import { dots, shade } from '../paint_kit.ts';
import { transposed } from '../tile_lab.ts';
import { ditherEdge, glyph, gooPaint, pickPts } from './food.ts';
import type { FoodSet, MC } from './food.ts';

function foodfloor(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.line(8, 0, 15, 7, 'purple0').line(15, 8, 8, 15, 'purple0').line(7, 15, 0, 8, 'purple0').line(0, 7, 7, 0, 'purple0');
  px.rect(7, 7, 2, 2, c.v & 1 ? 'cyan' : 'magenta');
  dots(px, pickPts(c.v, [[1, 1], [14, 14]], [[14, 1], [1, 14]], [[1, 14], [14, 1]], [[14, 14], [1, 1]]), 'teal1');
  shade(px, c, 'black', 'ink');
  return px;
}

function foodband(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 4, 16, 1, 'teal0').rect(0, 5, 16, 1, 'cyan').rect(0, 6, 16, 1, 'teal0').rect(0, 9, 16, 1, 'purple0').rect(0, 10, 16, 1, 'magenta').rect(0, 11, 16, 1, 'purple0');
  dots(px, [[3, 5], [11, 5], [7, 10], [15, 10]], 'white');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

function skyfloor(c: MC): Px {
  const px = new Px(16).fill('night');
  px.frame(1, 1, 14, 14, 'blue').frame(4, 4, 8, 8, 'blue').rect(7, 7, 2, 2, 'sky');
  dots(px, [[1, 1], [14, 1], [1, 14], [14, 14], ...pickPts(c.v, [[3, 8]], [[8, 3]], [[12, 8]], [[8, 12]])], 'sky');
  ditherEdge(px, c, 'ink', 'black');
  return px;
}

function stallcap(): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 2, 16, 9, 'purple0');
  for (let x = 0; x < 16; x++) px.set(x, 4 + (x % 8 < 4 ? x % 8 : 8 - (x % 8)), 'pink');
  px.rect(0, 12, 16, 1, 'magenta').rect(0, 13, 16, 1, 'purple0');
  return px;
}

const MAP: Record<string, Paint> = { a: 'pink', g: 'cyan', p: 'yellow', b: 'pink', c: 'yellow', r: 'hot', w: 'cyan', s: 'pink', t: 'yellow' };
function stall(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.frame(1, 0, 14, 10, 'cyan').rect(2, 1, 12, 8, 'night');
  glyph(px, c.v, 3, 2, MAP);
  px.rect(11, 3, 3, 1, 'cyan').rect(11, 5, 2, 1, 'cyan').rect(11, 7, 3, 1, 'magenta');
  px.rect(0, 10, 16, 1, 'magenta').rect(0, 11, 16, 5, 'black');
  for (let x = 2; x < 16; x += 4) px.rect(x, 12, 1, 3, 'purple');
  return px;
}

function kitchenfloor(c: MC): Px {
  const px = new Px(16).fill('teal0');
  px.rect(0, 0, 16, 1, 'teal1').rect(0, 0, 1, 16, 'teal1').rect(0, 8, 16, 1, 'teal1').rect(8, 0, 1, 16, 'teal1');
  dots(px, pickPts(c.v, [[3, 3]], [[11, 5]], [[5, 11]], [[12, 12]]), 'cyan');
  shade(px, c, 'night', 'teal0');
  return px;
}

function fryer(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(2, 2, 12, 6, 'ink').rect(3, 4, 10, 3, 'orange').rect(3, 4, 10, 1, 'amber');
  dots(px, pickPts(c.v, [[5, 5], [10, 6]], [[4, 6], [9, 5]], [[7, 5], [12, 6]], [[6, 6], [11, 5]]), 'cream');
  px.rect(0, 9, 16, 7, 'ink').rect(1, 11, 14, 1, 'hot').rect(1, 13, 14, 1, 'cyan').rect(3, 14, 2, 1, 'yellow').rect(11, 14, 2, 1, 'yellow');
  return px.frame(0, 0, 16, 16, 'black');
}

function escalator(c: MC): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) px.rect(0, y, 16, 1, y % 4 === 3 ? 'black' : y % 2 ? 'grey1' : 'ink');
  if (!c.kW) px.rect(0, 0, 1, 16, 'teal0').rect(1, 0, 1, 16, 'cyan').rect(2, 0, 1, 16, 'teal0');
  if (!c.kE) px.rect(15, 0, 1, 16, 'teal0').rect(14, 0, 1, 16, 'cyan').rect(13, 0, 1, 16, 'teal0');
  const x0 = c.kE ? 11 : 5;
  for (const y of [3, 10]) px.line(x0 - 3, y + 3, x0, y, 'magenta').line(x0, y, x0 + 3, y + 3, 'magenta');
  return px;
}

function table(): Px {
  const px = new Px(16);
  px.ellipse(3, 13, 2.5, 1.7, 'purple').ellipse(13, 13, 2.5, 1.7, 'purple').ellipse(8, 14, 4, 1.5, 'grey1').rect(7, 9, 2, 5, 'grey1');
  px.ellipse(8, 7, 7, 4.5, 'cyan').ellipse(8, 7, 6, 3.5, 'ink').rect(7, 6, 2, 2, 'pink');
  return px;
}

export const NEON: FoodSet = { foodfloor, foodband, skyfloor, stallcap, stall, kitchenfloor, fryer, escalator, table, goo: gooPaint };
