// Base look 3, "Alert": the Soviet base under the Neon mall, after closing. Black steel on emergency power. Red guide lines on the
// floor, mesh grating with a red glow under it, walls with a strip lamp and a row of status lights, red warning bands on the wall
// tops, a tower of glass and coils for the Key, a keypad that glows amber. See mall_kit.ts.
import { Px } from '../px.ts';
import type { BaseSet, MC } from './mall_kit.ts';
import { cyr } from './mall_kit.ts';
import { bolt, box, dots, hazard, keypad, rects, shade } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 1, 'grey1').rect(0, 0, 1, 16, 'grey1').rect(1, 1, 14, 1, 'grey3');
  if (c.v === 1 && (c.tx & 3) === 1) px.rect(0, 7, 16, 2, 'red');
  dots(px, [[2, 3], [13, 3], [2, 13], [13, 13]], 'grey1');
  shade(px, c, 'grey1', 'grey1');
  return px;
}

function grate(c: MC): Px {
  const px = new Px(16).fill('ink');
  for (let i = 0; i < 16; i += 4) px.rect(i, 0, 1, 16, 'grey3').rect(0, i, 16, 1, 'grey3');
  for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) px.rect(i, j, 3, 3, (i + j + c.v * 4) % 8 < 4 ? 'blood1' : 'blood0').set(i + 1, j + 1, (i + j + c.v * 4) % 8 < 4 ? 'hot' : 'blood1');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(0, 0, 16, 1, 'grey2').rect(0, 7, 16, 1, 'grey2');
  dots(px, [[3, 4], [12, 4], [3, 11], [12, 11]], 'grey3');
  if (c.lipS) { for (let x = 0; x < 16; x++) for (let y = 12; y < 15; y++) px.set(x, y, (x + y) % 6 < 3 ? 'red' : 'ink'); px.rect(0, 15, 16, 1, 'ink'); }
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 2, 'grey2').rect(0, 14, 16, 2, 'grey1').rect(0, 2, 1, 12, 'grey2').rect(15, 2, 1, 12, 'grey2');
  px.rect(2, 6, 12, 3, 'ink').rect(3, 7, 10, 1, 'hot').rect(3, 6, 10, 1, 'red');
  dots(px, [[3, 3], [6, 3], [9, 3]], c.v & 1 ? 'red' : 'amber');
  dots(px, [[4, 11], [11, 11]], 'grey3');
  return px;
}

function ammo(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(1, 1, 14, 5, 'grey2').rect(1, 6, 14, 8, 'grey1').frame(1, 1, 14, 13, 'ink');
  px.rect(1, 6, 14, 1, 'ink').rect(3, 6, 1, 8, 'night').rect(12, 6, 1, 8, 'night');
  rects(px, [[5, 9, 6, 2]], 'red');
  px.rect(6, 9, 4, 1, 'amber');
  dots(px, [[3, 3], [12, 3]], 'grey3');
  return px;
}

function bunk(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  box(px, 1, 1, 14, 14, 'grey3', 'ink');
  px.rect(2, 5, 12, 9, 'blood1').rect(2, 5, 12, 1, 'red').rect(3, 2, 10, 3, 'bone').rect(3, 2, 10, 1, 'white');
  px.rect(2, 9, 12, 1, 'blood0');
  return px;
}

function cell(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 0, 16, 16, 'night').rect(0, 0, 16, 2, 'grey2').rect(0, 14, 16, 2, 'grey2');
  for (const x of [2, 5, 8, 11, 14]) px.rect(x, 2, 1, 12, 'hot').rect(x - 1, 2, 1, 12, 'blood1');
  return px;
}

function machine(phase: number): Px {
  const px = new Px(64, 32);
  box(px, 0, 20, 64, 12, 'grey3', 'ink');
  px.rect(1, 21, 62, 1, 'white').rect(1, 29, 62, 2, 'grey2');
  for (let k = 0; k < 14; k++) px.set(4 + k * 4, 24, (k + phase) % 3 === 0 ? 'hot' : 'blood1').set(4 + k * 4, 27, (k + phase) % 4 === 1 ? 'amber' : 'blood1');
  box(px, 18, 4, 28, 17, 'grey2', 'ink');
  px.rect(20, 0, 3, 5, 'grey3').rect(41, 0, 3, 5, 'grey3').frame(20, 0, 3, 5, 'ink').frame(41, 0, 3, 5, 'ink');
  px.rect(25, 3, 14, 17, 'ink').frame(25, 3, 14, 17, 'grey3');
  px.rect(27, 4, 10, 15, 'blood1').rect(29, 4, 6, 15, 'hot').rect(30, 6, 4, 11, 'amber').rect(31, 8, 2, 7, 'white');
  const zig: [number, number][][] = [[[22, 1], [25, 5], [23, 8], [27, 11], [24, 14], [28, 17]], [[41, 1], [38, 6], [40, 8], [36, 12], [39, 15], [35, 18]], [[22, 1], [26, 3], [24, 9], [29, 10], [27, 15], [31, 18]]];
  const z = zig[phase % 3] as [number, number][];
  for (let i = 0; i + 1 < z.length; i++) px.line(z[i]![0], z[i]![1], z[i + 1]![0], z[i + 1]![1], 'yellow');
  box(px, 2, 8, 13, 11, 'ink', 'grey3');
  box(px, 49, 8, 13, 11, 'ink', 'grey3');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) px.set(4 + k * 3, 10 + r * 3, (r * 4 + k + phase) % 5 === 0 ? 'hot' : 'blood1').set(51 + k * 3, 10 + r * 3, (r * 4 + k + phase) % 4 === 0 ? 'amber' : 'blood1');
  return px;
}

function cipher(): Px {
  const px = new Px(32, 16);
  box(px, 0, 0, 32, 16, 'grey1', 'ink');
  hazard(px, 1, 1, 30, 3, 1, 'red', 'ink');
  px.rect(2, 5, 18, 8, 'ink');
  cyr(px, 3, 7, 'СТОП', 'amber');
  keypad(px, 21, 1, 'ink', 'grey2', 'amber', 'red');
  px.rect(2, 13, 18, 1, 'grey2');
  return px;
}

function powerbox(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'amber', 'ink');
  px.rect(4, 4, 24, 24, 'grey1').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'grey2');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'grey3');
  bolt(px, 13, 12, lit ? 'white' : 'amber');
  if (lit) {
    px.line(7, 10, 11, 14, 'cyan').line(24, 9, 21, 13, 'cyan').line(8, 24, 12, 20, 'cyan').line(23, 24, 20, 19, 'cyan');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

function breaker(lit: boolean): Px {
  const px = new Px(16).fill('grey2');
  box(px, 2, 1, 12, 14, 'grey1', 'ink');
  px.rect(3, 2, 10, 2, 'grey2').rect(5, 5, 6, 8, 'ink').rect(7, 5, 2, 8, 'night');
  if (lit) { px.rect(7, 5, 2, 4, 'hot').rect(6, 5, 4, 2, 'red'); dots(px, [[4, 4], [11, 3], [5, 9], [11, 8]], 'yellow'); px.set(12, 5, 'white'); }
  else { px.rect(7, 9, 2, 4, 'red').rect(6, 11, 4, 2, 'hot'); }
  px.rect(4, 13, 2, 1, 'amber');
  return px;
}

export const ALERT_BASE: BaseSet = { floor, grate, cap, wall, ammo, bunk, cell, machine, cipher, powerbox, breaker };
