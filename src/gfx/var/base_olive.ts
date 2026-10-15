// Base look 1, "Olive": the Soviet base under the Atrium mall, by day. Army green steel, grey concrete with yellow lane paint, wooden
// crates stencilled in sand, a red star on the wall, a machine with a hot white core. Plain and well lit, like a place that has
// been running for years. See mall_kit.ts.
import { Px } from '../px.ts';
import type { BaseSet, MC } from './mall_kit.ts';
import { cyr } from './mall_kit.ts';
import { bolt, box, dots, hazard, keypad, rects, shade } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 1, 'grey2').rect(0, 0, 1, 16, 'grey2');
  if (c.v === 0 && (c.ty & 1) === 1) { px.rect(1, 7, 6, 2, 'yellow').rect(9, 7, 6, 2, 'yellow'); }
  dots(px, ([[[4, 3], [12, 12]], [[10, 4], [3, 11]], [[6, 12], [13, 3]], [[3, 4], [11, 11]]] as [number, number][][])[c.v] as [number, number][], 'grey2');
  shade(px, c, 'grey2', 'grey2');
  return px;
}

function grate(): Px {
  const px = new Px(16).fill('grey1');
  for (let i = 0; i < 16; i += 4) px.rect(i, 0, 1, 16, 'grey3').rect(0, i, 16, 1, 'grey3');
  for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) px.rect(i, j, 3, 3, 'night');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('pine0');
  px.rect(0, 0, 16, 1, 'pine1');
  dots(px, [[2, 4], [8, 4], [14, 4], [2, 10], [8, 10], [14, 10]], 'pine2');
  if (c.lipS) px.rect(0, 13, 16, 2, 'pine1').rect(0, 15, 16, 1, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('pine1');
  px.rect(0, 0, 16, 2, 'pine0').rect(0, 6, 16, 4, 'pine2').rect(0, 14, 16, 2, 'pine0');
  px.rect(0, 2, 1, 12, 'pine0').rect(15, 2, 1, 12, 'pine0');
  dots(px, [[3, 4], [8, 4], [12, 4], [3, 12], [8, 12], [12, 12]], 'pine3');
  if (c.v === 1) {
    dots(px, [[8, 6], [7, 7], [8, 7], [9, 7], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [7, 9], [9, 9]], 'red');
  }
  return px;
}

function ammo(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(1, 1, 14, 5, 'pine3').rect(1, 6, 14, 8, 'pine2').frame(1, 1, 14, 13, 'pine0');
  px.rect(1, 6, 14, 1, 'pine0').rect(3, 6, 1, 8, 'pine1').rect(12, 6, 1, 8, 'pine1');
  rects(px, [[4, 9, 3, 1], [8, 9, 4, 1], [4, 11, 5, 1], [10, 11, 2, 1]], 'sand');
  dots(px, [[3, 3], [12, 3]], 'pine1');
  px.rect(1, 14, 14, 1, 'soil1');
  return px;
}

function bunk(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  box(px, 1, 1, 14, 14, 'grey2', 'ink');
  px.rect(2, 5, 12, 9, 'pine2').rect(2, 5, 12, 1, 'pine3').rect(3, 2, 10, 3, 'bone').rect(3, 2, 10, 1, 'white');
  px.rect(2, 9, 12, 1, 'pine1').rect(2, 13, 12, 1, 'pine1');
  return px;
}

function cell(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 0, 16, 16, 'night').rect(0, 0, 16, 2, 'grey2').rect(0, 14, 16, 2, 'grey2');
  for (const x of [1, 4, 7, 10, 13]) px.rect(x, 2, 2, 12, 'grey3').rect(x + 1, 2, 1, 12, 'grey2');
  px.rect(0, 7, 16, 1, 'grey2');
  return px;
}

function machine(phase: number): Px {
  const px = new Px(64, 32);
  box(px, 0, 4, 64, 28, 'grey2', 'ink');
  px.rect(1, 5, 62, 2, 'grey3').rect(1, 28, 62, 3, 'grey1');
  box(px, 3, 10, 16, 15, 'grey1', 'ink');
  box(px, 45, 10, 16, 15, 'grey1', 'ink');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    px.set(5 + k * 3, 12 + r * 4, (r + k + phase) % 3 === 0 ? 'hot' : 'pine3').set(47 + k * 3, 12 + r * 4, (r + k + phase) % 2 ? 'amber' : 'pine3');
  }
  px.rect(5, 23, 12, 1, 'bone').rect(47, 23, 12, 1, 'bone');
  px.rect(22, 0, 20, 30, 'ink').frame(22, 0, 20, 30, 'grey3');
  px.ellipse(32, 14, 7 + (phase & 1), 11, 'blood1').ellipse(32, 14, 5, 9, 'hot').ellipse(32, 14, 3, 6, 'amber').ellipse(32, 14, 1.5, 3, 'white');
  px.rect(22, 2, 20, 2, 'grey2').rect(22, 26, 20, 2, 'grey2');
  px.rect(19, 18, 3, 4, 'ink').rect(42, 18, 3, 4, 'ink');
  return px;
}

function cipher(): Px {
  const px = new Px(32, 16);
  box(px, 0, 0, 32, 16, 'grey2', 'ink');
  px.rect(1, 1, 30, 1, 'grey3').rect(1, 14, 30, 1, 'grey1');
  px.rect(2, 3, 18, 8, 'ink');
  cyr(px, 3, 5, 'СТОП', 'red');
  keypad(px, 21, 1, 'grey1', 'bone', 'ink', 'red');
  px.rect(2, 12, 18, 2, 'yellow');
  dots(px, [[4, 12], [8, 12], [12, 12], [16, 12]], 'ink');
  return px;
}

function powerbox(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'yellow', 'ink');
  px.rect(4, 4, 24, 24, 'grey1').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'grey2');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'grey3');
  bolt(px, 13, 12, lit ? 'white' : 'yellow');
  if (lit) {
    px.line(7, 10, 11, 14, 'cyan').line(24, 9, 21, 13, 'cyan').line(8, 24, 12, 20, 'cyan').line(23, 24, 20, 19, 'cyan');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

function breaker(lit: boolean): Px {
  const px = new Px(16).fill('pine1');
  box(px, 2, 1, 12, 14, 'grey2', 'ink');
  px.rect(3, 2, 10, 2, 'grey3').rect(4, 4, 8, 1, 'ink');
  px.rect(5, 5, 6, 8, 'grey1').rect(7, 5, 2, 8, 'ink');
  if (lit) { px.rect(7, 5, 2, 4, 'red').rect(6, 5, 4, 2, 'hot'); dots(px, [[4, 4], [11, 3], [5, 9], [11, 8]], 'yellow'); px.set(12, 5, 'white'); }
  else { px.rect(7, 9, 2, 4, 'red').rect(6, 11, 4, 2, 'hot'); }
  px.rect(4, 13, 2, 1, 'yellow');
  return px;
}

export const OLIVE_BASE: BaseSet = { floor, grate, cap, wall, ammo, bunk, cell, machine, cipher, powerbox, breaker };
