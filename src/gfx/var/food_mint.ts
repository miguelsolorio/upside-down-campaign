// Food court look 4, "Mint Parlor": a 1985 ice cream parlor grown to a food court, all pastels, so cheerful it is wrong in the dark. A
// sea green terrazzo floor flecked with pink, a band of pink scallops, pink and cream menu boards over sea green counters, a skylight of
// pale tile, aqua tile in the kitchens, pink fryers. At night the greens sink and the pinks and creams stay lit, so the court looks
// like a sweet shop with its lights on and nobody in it. See food.ts.
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import { dots, shade } from '../paint_kit.ts';
import { transposed } from '../tile_lab.ts';
import { ditherEdge, glyph, gooPaint, pickPts } from './food.ts';
import type { FoodSet, MC } from './food.ts';

function foodfloor(c: MC): Px {
  const px = new Px(16).fill('teal1');
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if ((i + j) & 1) px.rect(i * 8, j * 8, 8, 8, 'teal0');
  dots(px, pickPts(c.v, [[3, 4], [12, 11], [9, 2]], [[5, 12], [13, 5], [2, 9]], [[10, 6], [3, 13], [14, 1]], [[7, 3], [1, 7], [11, 14]]), 'pink');
  shade(px, c, 'night', 'teal0');
  return px;
}

function foodband(c: MC): Px {
  const px = new Px(16).fill('teal0');
  px.rect(0, 3, 16, 7, 'pink').rect(0, 3, 16, 1, 'cream');
  for (let s = 0; s < 4; s++) px.ellipse(s * 4 + 2, 10, 2, 2.5, 'pink').set(s * 4 + 2, 6, 'rose');
  px.rect(0, 13, 16, 1, 'rose');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

function skyfloor(c: MC): Px {
  const px = new Px(16).fill('white');
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if ((i + j) & 1) px.rect(i * 8, j * 8, 8, 8, 'sky');
  dots(px, pickPts(c.v, [[4, 4], [11, 11]], [[10, 3], [3, 12]], [[6, 9], [13, 6]], [[2, 6], [9, 13]]), 'cyan');
  ditherEdge(px, c, 'teal0', 'teal1');
  return px;
}

function stallcap(): Px {
  const px = new Px(16).fill('teal1');
  px.rect(0, 0, 16, 1, 'cyan').rect(0, 11, 16, 1, 'teal0');
  for (let s = 0; s < 4; s++) { px.ellipse(s * 4 + 2, 10, 2.5, 4, 'pink').set(s * 4 + 2, 9, 'cream'); }
  px.rect(0, 15, 16, 1, 'ink');
  return px;
}

const MAP: Record<string, Paint> = { a: 'rose', g: 'teal1', p: 'blood1', b: 'rose', c: 'rose', r: 'blood1', w: 'teal1', s: 'rose', t: 'teal1' };
function stall(c: MC): Px {
  const px = new Px(16).fill('teal0');
  px.rect(1, 0, 14, 10, 'pink').rect(2, 1, 12, 8, 'cream');
  glyph(px, c.v, 3, 2, MAP);
  px.rect(11, 3, 3, 1, 'rose').rect(11, 5, 2, 1, 'rose').rect(11, 7, 3, 1, 'teal1');
  px.rect(0, 10, 16, 2, 'cyan').rect(0, 12, 16, 4, 'teal1');
  for (let x = 1; x < 16; x += 3) px.rect(x, 12, 1, 3, 'pink');
  return px;
}

function kitchenfloor(c: MC): Px {
  const px = new Px(16).fill('teal1');
  px.rect(0, 0, 16, 1, 'teal0').rect(0, 0, 1, 16, 'teal0').rect(0, 8, 16, 1, 'teal0').rect(8, 0, 1, 16, 'teal0');
  dots(px, pickPts(c.v, [[3, 3], [11, 11]], [[12, 4], [4, 12]], [[5, 5], [13, 13]], [[10, 3], [3, 10]]), 'cyan');
  shade(px, c, 'night', 'teal0');
  return px;
}

function fryer(c: MC): Px {
  const px = new Px(16).fill('pink');
  px.rect(2, 2, 12, 6, 'ink').rect(3, 4, 10, 3, 'yellow').rect(3, 4, 10, 1, 'cream');
  dots(px, pickPts(c.v, [[5, 5], [10, 6]], [[4, 6], [9, 5]], [[7, 5], [12, 6]], [[6, 6], [11, 5]]), 'orange');
  px.rect(0, 9, 16, 7, 'rose').rect(0, 9, 16, 1, 'pink').rect(3, 11, 2, 2, 'cream').rect(7, 11, 2, 2, 'cyan').rect(11, 11, 2, 2, 'cream').rect(0, 14, 16, 2, 'blood1');
  return px.frame(0, 0, 16, 16, 'blood1');
}

function escalator(c: MC): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) px.rect(0, y, 16, 1, y % 4 === 3 ? 'teal0' : y % 4 < 2 ? 'teal1' : 'night');
  if (!c.kW) px.rect(0, 0, 3, 16, 'pink').rect(2, 0, 1, 16, 'rose');
  if (!c.kE) px.rect(13, 0, 3, 16, 'pink').rect(13, 0, 1, 16, 'rose');
  const x0 = c.kE ? 11 : 5;
  px.line(x0 - 3, 9, x0, 6, 'cream').line(x0, 6, x0 + 3, 9, 'cream');
  return px;
}

function table(): Px {
  const px = new Px(16);
  px.ellipse(3, 13, 2.5, 1.7, 'teal1').ellipse(13, 13, 2.5, 1.7, 'teal1').ellipse(8, 14, 4, 1.5, 'cyan').rect(7, 9, 2, 5, 'cyan');
  px.ellipse(8, 7, 7, 4.5, 'pink').ellipse(8, 7, 5.5, 3.5, 'cream').rect(5, 5, 3, 1, 'white').rect(9, 7, 2, 1, 'rose');
  return px;
}

export const MINT: FoodSet = { foodfloor, foodband, skyfloor, stallcap, stall, kitchenfloor, fryer, escalator, table, goo: gooPaint };
