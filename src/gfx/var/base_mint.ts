// Base look 5, "Mint": the Soviet base under the Confetti mall, after closing. A hospital in sea green tile: checkered floors, tiled
// walls, ceiling lamps set in the wall tops, quilted padded cells, white cots with a red cross, barrels, and for the Key a mainframe of
// three cabinets with spinning tape reels. Clean and calm, which is the unsettling part. See mall_kit.ts.
import { Px } from '../px.ts';
import type { BaseSet, MC } from './mall_kit.ts';
import { cyr } from './mall_kit.ts';
import { bolt, box, dots, hazard, keypad, shade } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('pine3');
  px.rect(0, 0, 8, 8, 'pine2').rect(8, 8, 8, 8, 'pine2');
  px.rect(0, 0, 16, 1, 'pine1').rect(0, 8, 16, 1, 'pine1').rect(0, 0, 1, 16, 'pine1').rect(8, 0, 1, 16, 'pine1');
  dots(px, [[3 + c.v, 3], [12 - c.v, 12]], 'leaf');
  shade(px, c, 'pine1', 'pine1');
  return px;
}

function grate(): Px {
  const px = new Px(16).fill('pine1');
  for (let y = 1; y < 16; y += 3) px.rect(1, y, 14, 2, 'ink');
  px.rect(0, 0, 16, 1, 'leaf').rect(0, 15, 16, 1, 'pine2');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('pine1');
  px.rect(0, 0, 16, 1, 'pine3').rect(0, 7, 16, 1, 'pine3');
  dots(px, [[3, 4], [12, 4], [3, 11], [12, 11]], 'pine3');
  if (c.lipS) px.rect(0, 13, 16, 2, 'leaf').rect(0, 15, 16, 1, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('leaf');
  for (let y = 0; y < 16; y += 4) px.rect(0, y, 16, 1, 'pine3');
  for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) px.rect(x, y, 1, 4, 'pine3');
  px.rect(0, 0, 16, 2, 'pine2').rect(0, 14, 16, 2, 'pine1').rect(0, 7, 16, 2, 'cream');
  px.rect(3, 10, 10, 2, 'cream').rect(3, 10, 10, 1, 'white');
  if (c.v & 1) { px.rect(5, 3, 6, 3, 'white').rect(6, 4, 4, 1, 'sky'); }
  return px;
}

function ammo(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  for (const x of [4.5, 11.5]) {
    px.ellipse(x, 8, 4, 6.3, 'ink').ellipse(x, 8, 3.4, 5.7, 'mist').ellipse(x, 7.5, 2.4, 4.2, 'bone');
    px.rect(Math.round(x) - 3, 7, 6, 2, 'yellow');
  }
  return px;
}

function bunk(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  box(px, 1, 1, 14, 14, 'mist', 'ink');
  px.rect(3, 2, 10, 4, 'white').rect(3, 5, 10, 1, 'bone');
  px.rect(2, 7, 12, 7, 'leaf').rect(2, 7, 12, 1, 'cream').rect(2, 13, 12, 1, 'pine3');
  px.rect(7, 9, 2, 3, 'red').rect(6, 10, 4, 1, 'red');
  return px;
}

function cell(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 0, 16, 16, 'leaf');
  for (let i = 0; i < 16; i += 4) for (let j = 0; j < 16; j += 4) px.set(i + 2, j + 2, 'pine3').set(i + 1, j + 1, 'pine2').set(i + 3, j + 3, 'pine2').set(i + 1, j + 3, 'pine2').set(i + 3, j + 1, 'pine2');
  px.rect(0, 0, 16, 1, 'pine1').rect(0, 15, 16, 1, 'pine1');
  px.rect(5, 4, 6, 3, 'ink').frame(5, 4, 6, 3, 'bone').rect(7, 4, 1, 3, 'bone');
  px.rect(7, 11, 2, 2, 'bone');
  return px;
}

function machine(phase: number): Px {
  const px = new Px(64, 32);
  for (const x of [1, 43]) {
    box(px, x, 4, 20, 26, 'mist', 'ink');
    px.rect(x + 2, 6, 16, 6, 'ink');
    for (let k = 0; k < 6; k++) px.set(x + 3 + k * 2, 8, (k + phase) % 3 === 0 ? 'amber' : (k + phase) % 3 === 1 ? 'red' : 'cyan').set(x + 3 + k * 2, 10, (k + phase) % 2 ? 'cyan' : 'amber');
    px.rect(x + 2, 14, 16, 14, 'slate');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) px.set(x + 3 + k * 4, 16 + r * 4, (r + k + phase) % 4 === 0 ? 'yellow' : 'dusk');
  }
  box(px, 22, 2, 20, 28, 'bone', 'ink');
  px.rect(24, 4, 16, 3, 'cream').rect(24, 27, 16, 2, 'mist');
  for (const rx of [28, 36]) {
    px.disc(rx, 12, 5.5, 'ink').disc(rx, 12, 4.5, 'slate').disc(rx, 12, 1.5, 'white');
    const a = (phase & 1) ? [[0, -4], [3, 3], [-3, 3]] : [[0, 4], [3, -3], [-3, -3]];
    for (const [dx, dy] of a as [number, number][]) px.line(rx, 12, rx + dx, 12 + dy, 'bone');
  }
  px.rect(24, 19, 16, 6, 'ink');
  for (let k = 0; k < 6; k++) px.set(25 + k * 3, 21, (k + phase) % 3 === 0 ? 'amber' : (k + phase) % 3 === 1 ? 'cyan' : 'red').set(25 + k * 3, 23, (k + phase) % 2 ? 'cyan' : 'amber');
  return px;
}

function cipher(): Px {
  const px = new Px(32, 16);
  box(px, 0, 0, 32, 16, 'bone', 'ink');
  px.rect(1, 1, 30, 1, 'white').rect(1, 14, 30, 1, 'mist');
  px.rect(2, 3, 18, 9, 'cream').frame(2, 3, 18, 9, 'mist');
  cyr(px, 3, 5, 'СТОП', 'ink');
  px.rect(3, 11, 16, 1, 'red');
  keypad(px, 21, 1, 'mist', 'white', 'ink', 'red');
  return px;
}

function powerbox(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'yellow', 'ink');
  px.rect(4, 4, 24, 24, 'pine2').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'pine1');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'leaf');
  bolt(px, 13, 12, lit ? 'white' : 'yellow');
  if (lit) {
    px.line(7, 10, 11, 14, 'cyan').line(24, 9, 21, 13, 'cyan').line(8, 24, 12, 20, 'cyan').line(23, 24, 20, 19, 'cyan');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

function breaker(lit: boolean): Px {
  const px = new Px(16).fill('leaf');
  box(px, 2, 1, 12, 14, 'pine3', 'ink');
  px.rect(3, 2, 10, 2, 'pine2').rect(5, 5, 6, 8, 'pine1').rect(7, 5, 2, 8, 'ink');
  if (lit) { px.rect(7, 5, 2, 4, 'white').rect(6, 5, 4, 2, 'red'); dots(px, [[4, 4], [11, 3], [5, 9], [11, 8]], 'yellow'); px.set(12, 5, 'cyan'); }
  else { px.rect(7, 9, 2, 4, 'white').rect(6, 11, 4, 2, 'red'); }
  px.rect(4, 13, 2, 1, 'cream');
  return px;
}

export const MINT_BASE: BaseSet = { floor, grate, cap, wall, ammo, bunk, cell, machine, cipher, powerbox, breaker };
