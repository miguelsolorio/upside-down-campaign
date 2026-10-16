// Food court look 3, "Brick Plaza": a shopping arcade's court the way the town built it. Red brick pavers laid in running bond, a band of
// brass inlay, deep green awnings with a bulb in each hem, brick fronted counters under chalkboard menus lit by a gooseneck lamp, pale
// tile in the kitchens and copper hooded fryers. At night the brick keeps its red, the brass shines and the boards are lamp lit. See food.ts.
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import { dots, shade } from '../paint_kit.ts';
import { transposed } from '../tile_lab.ts';
import { ditherEdge, glyph, gooPaint, pickPts } from './food.ts';
import type { FoodSet, MC } from './food.ts';

function bricks(px: Px, face: Paint, mortar: Paint, hi: Paint, v: number): void {
  px.fill(mortar);
  for (let r = 0; r < 4; r++) for (let b = -1; b < 2; b++) {
    const x = (r & 1) * 4 + b * 8;
    px.rect(x + 1, r * 4, 7, 3, face);
    if ((v + r + b) % 3 === 0) px.set(x + 2, r * 4, hi);
  }
}

function foodfloor(c: MC): Px {
  const px = new Px(16);
  bricks(px, 'blood0', 'ink', 'blood1', c.v);
  shade(px, c, 'ink', 'ink');
  return px;
}

function foodband(c: MC): Px {
  const px = new Px(16).fill('soil1');
  px.rect(0, 4, 16, 1, 'amber').rect(0, 11, 16, 1, 'amber').rect(0, 7, 16, 2, 'orange');
  dots(px, [[0, 6], [8, 6], [0, 9], [8, 9], [4, 7], [12, 7]], 'cream');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

function skyfloor(c: MC): Px {
  const px = new Px(16).fill('sand');
  px.rect(0, 0, 16, 1, 'bone').rect(0, 0, 1, 16, 'bone').rect(0, 8, 16, 1, 'bone').rect(8, 0, 1, 16, 'bone');
  px.rect(3, 3, 2, 2, 'mist').rect(11, 11, 2, 2, 'mist');
  dots(px, pickPts(c.v, [[6, 6], [13, 3]], [[5, 12], [10, 4]], [[2, 10], [12, 7]], [[9, 13], [4, 5]]), 'white');
  ditherEdge(px, c, 'blood0', 'blood1');
  return px;
}

function stallcap(): Px {
  const px = new Px(16).fill('ink');
  for (let s = 0; s < 4; s++) {
    const col = s & 1 ? 'pine1' : 'pine2';
    px.rect(s * 4, 1, 4, 10, col).ellipse(s * 4 + 2, 11, 2, 3.5, col);
  }
  px.rect(0, 0, 16, 1, 'amber').rect(0, 15, 16, 1, 'ink');
  dots(px, [[2, 14], [10, 14]], 'yellow');
  return px;
}

const MAP: Record<string, Paint> = { a: 'white', g: 'white', p: 'white', b: 'white', c: 'white', r: 'white', w: 'white', s: 'white', t: 'white' };
function stall(c: MC): Px {
  const px = new Px(16);
  bricks(px, 'blood1', 'blood0', 'red', c.v + 1);
  px.rect(1, 0, 14, 10, 'soil2').rect(2, 1, 12, 8, 'night');
  glyph(px, c.v, 3, 2, MAP);
  px.rect(11, 3, 3, 1, 'white').rect(11, 5, 2, 1, 'white').rect(11, 7, 3, 1, 'amber');
  px.rect(7, 0, 2, 1, 'yellow').rect(0, 10, 16, 2, 'soil3').rect(0, 10, 16, 1, 'amber').rect(0, 12, 16, 1, 'blood0');
  return px;
}

function kitchenfloor(c: MC): Px {
  const px = new Px(16).fill('bone');
  px.rect(0, 0, 16, 1, 'grey3').rect(0, 0, 1, 16, 'grey3').rect(0, 8, 16, 1, 'grey3').rect(8, 0, 1, 16, 'grey3').rect(1, 1, 3, 1, 'white').rect(9, 9, 3, 1, 'white');
  dots(px, pickPts(c.v, [[4, 5], [12, 3]], [[6, 12], [13, 11]], [[3, 11], [11, 6]], [[10, 13], [5, 3]]), 'grey3');
  shade(px, c, 'grey2', 'grey3');
  return px;
}

function fryer(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 4, 'blood1').rect(0, 3, 16, 1, 'blood0').rect(2, 4, 12, 4, 'ink').rect(3, 5, 10, 2, 'orange').rect(3, 5, 10, 1, 'amber');
  dots(px, pickPts(c.v, [[5, 6], [10, 5]], [[4, 5], [9, 6]], [[7, 6], [12, 5]], [[6, 5], [11, 6]]), 'cream');
  px.rect(0, 8, 16, 8, 'grey3').rect(0, 8, 16, 1, 'white').rect(2, 11, 12, 1, 'orange').rect(2, 12, 12, 1, 'soil3').rect(0, 14, 16, 2, 'grey1');
  return px.frame(0, 0, 16, 16, 'grey1');
}

function escalator(c: MC): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) px.rect(0, y, 16, 1, y % 4 === 3 ? 'soil0' : y % 4 < 2 ? 'soil3' : 'soil2');
  if (!c.kW) px.rect(0, 0, 3, 16, 'blood1').rect(0, 0, 1, 16, 'amber');
  if (!c.kE) px.rect(13, 0, 3, 16, 'blood1').rect(15, 0, 1, 16, 'amber');
  const x0 = c.kE ? 11 : 5;
  px.line(x0 - 3, 9, x0, 6, 'amber').line(x0, 6, x0 + 3, 9, 'amber');
  return px;
}

function table(): Px {
  const px = new Px(16);
  px.ellipse(3, 13, 2.5, 1.7, 'blood1').ellipse(13, 13, 2.5, 1.7, 'blood1').ellipse(8, 14, 4, 1.5, 'soil2').rect(7, 9, 2, 5, 'soil2');
  px.ellipse(8, 7, 7, 4.5, 'soil3').ellipse(8, 7, 5, 3, 'bone').rect(6, 5, 2, 1, 'white').rect(8, 6, 2, 2, 'red');
  return px;
}

export const BRICK: FoodSet = { foodfloor, foodband, skyfloor, stallcap, stall, kitchenfloor, fryer, escalator, table, goo: gooPaint };
