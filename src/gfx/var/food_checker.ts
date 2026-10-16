// Food court look 1, "Checker Diner": the court as a roadside diner would do it. A red and black checkerboard floor, a chrome band with
// a red stripe in it, red and dark red striped awnings with scalloped hems, light boxes for menu boards over red counters with chrome
// tops, a red quarry floor in the kitchens and steel fryers glowing orange. At night the reds hold their color and the chrome goes
// blue grey, so the boards are the only warm light. See food.ts.
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import { dots, shade } from '../paint_kit.ts';
import { transposed } from '../tile_lab.ts';
import { ditherEdge, glyph, gooPaint, pickPts } from './food.ts';
import type { FoodSet, MC } from './food.ts';

const checker = (px: Px, a: Paint, b: Paint): Px => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) px.rect(i * 8, j * 8, 8, 8, (i + j) & 1 ? b : a); return px; };

function foodfloor(c: MC): Px {
  const px = checker(new Px(16), 'ink', 'blood1');
  px.rect(1, 1, 2, 1, 'red').rect(9, 9, 2, 1, 'red');
  dots(px, pickPts(c.v, [[4, 12]], [[13, 5]], [[6, 3]], [[11, 13]]), 'grey1');
  shade(px, c, 'ink', 'blood0');
  return px;
}

function foodband(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 3, 16, 10, 'grey3').rect(0, 3, 16, 1, 'white').rect(0, 12, 16, 1, 'grey2').rect(0, 7, 16, 2, 'red').rect(0, 7, 16, 1, 'hot');
  dots(px, [[3, 5], [11, 5], [3, 10], [11, 10]], 'white');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

function skyfloor(c: MC): Px {
  const px = checker(new Px(16).fill('mist'), 'mist', 'bone');
  dots(px, pickPts(c.v, [[3, 3], [7, 7]], [[10, 2], [2, 13]], [[4, 11], [13, 4]], [[12, 12], [9, 9]]), 'white');
  ditherEdge(px, c, 'ink', 'blood1');
  return px;
}

function stallcap(): Px {
  const px = new Px(16).fill('ink');
  for (let s = 0; s < 4; s++) {
    const col = s & 1 ? 'blood1' : 'red';
    px.rect(s * 4, 0, 4, 11, col).ellipse(s * 4 + 2, 11, 2, 3.5, col);
  }
  px.rect(0, 0, 16, 1, 'ink').rect(0, 15, 16, 1, 'ink');
  return px;
}

const MAP: Record<string, Paint> = { a: 'red', g: 'ink', p: 'blood1', b: 'red', c: 'red', r: 'ink', w: 'ink', s: 'red', t: 'ink' };
function stall(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(1, 0, 14, 9, 'grey3').rect(2, 1, 12, 7, 'amber').rect(2, 1, 12, 1, 'yellow');
  glyph(px, c.v, 3, 2, MAP);
  px.rect(11, 3, 3, 1, 'ink').rect(11, 5, 2, 1, 'ink').rect(11, 7, 3, 1, 'red');
  px.rect(0, 9, 16, 2, 'grey3').rect(0, 9, 16, 1, 'white').rect(0, 11, 16, 3, 'red').rect(0, 14, 16, 2, 'blood1');
  for (let x = 2; x < 16; x += 4) px.rect(x, 11, 1, 3, 'grey3');
  return px;
}

function kitchenfloor(c: MC): Px {
  const px = new Px(16).fill('blood1');
  px.rect(0, 0, 16, 1, 'blood0').rect(0, 0, 1, 16, 'blood0').rect(0, 8, 16, 1, 'blood0').rect(8, 0, 1, 16, 'blood0');
  dots(px, pickPts(c.v, [[3, 3], [11, 5]], [[5, 11], [13, 3]], [[12, 12], [4, 5]], [[2, 9], [10, 13]]), 'red');
  shade(px, c, 'blood0', 'blood0');
  return px;
}

function fryer(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(2, 2, 12, 6, 'ink').rect(3, 3, 10, 4, 'orange').rect(3, 3, 10, 1, 'amber');
  dots(px, pickPts(c.v, [[5, 5], [9, 4], [11, 6]], [[4, 4], [8, 6], [12, 5]], [[6, 4], [10, 5], [5, 6]], [[7, 5], [11, 4], [4, 6]]), 'cream');
  px.rect(0, 8, 16, 8, 'grey3').rect(0, 8, 16, 1, 'white').rect(3, 11, 2, 2, 'red').rect(7, 11, 2, 2, 'amber').rect(11, 11, 2, 2, 'red').rect(0, 14, 16, 2, 'grey1');
  return px.frame(0, 0, 16, 16, 'grey1');
}

function escalator(c: MC): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) px.rect(0, y, 16, 1, y % 4 === 3 ? 'ink' : y % 4 < 2 ? 'grey3' : 'grey2');
  if (!c.kW) px.rect(0, 0, 2, 16, 'yellow').rect(2, 0, 1, 16, 'ink');
  if (!c.kE) px.rect(14, 0, 2, 16, 'yellow').rect(13, 0, 1, 16, 'ink');
  const x0 = c.kE ? 12 : 4;
  px.line(x0 - 3, 9, x0, 6, 'ink').line(x0, 6, x0 + 3, 9, 'ink');
  return px;
}

function table(): Px {
  const px = new Px(16);
  px.ellipse(3, 13, 2.5, 1.7, 'blood1').ellipse(13, 13, 2.5, 1.7, 'blood1').ellipse(8, 14, 4, 1.5, 'grey2').rect(7, 9, 2, 5, 'grey3');
  px.ellipse(8, 7, 7, 4.5, 'grey3').ellipse(8, 7, 6, 3.5, 'red').rect(5, 5, 3, 1, 'hot');
  return px;
}

export const CHECKER: FoodSet = { foodfloor, foodband, skyfloor, stallcap, stall, kitchenfloor, fryer, escalator, table, goo: gooPaint };
