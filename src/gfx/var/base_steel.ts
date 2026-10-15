// Base look 2, "Steel": the Soviet base under the Chrome mall, by day. A cold clean lab of blue grey steel: diamond plate floors,
// perforated grating, panel walls with a cyan light strip along the top, glass cells, a rack machine with a glowing cylinder, a door
// with a screen. It looks newer than it is. See mall_kit.ts.
import { Px } from '../px.ts';
import type { BaseSet, MC } from './mall_kit.ts';
import { cyr } from './mall_kit.ts';
import { bolt, box, dots, hazard, keypad, shade } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('slate');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x = i * 4 + (j & 1) * 2, y = j * 4;
    px.set(x, y, 'mist').set(x + 1, y + 1, 'mist').set(x + 1, y, 'dusk').set(x + 2, y + 1, 'dusk');
  }
  px.rect(0, 0, 16, 1, 'dusk').rect(0, 0, 1, 16, 'dusk');
  shade(px, c, 'dusk', 'dusk');
  return px;
}

function grate(): Px {
  const px = new Px(16).fill('dusk');
  for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) px.rect(i, j, 2, 2, 'night').set(i, j, 'ink');
  px.rect(0, 0, 16, 1, 'mist').rect(0, 15, 16, 1, 'slate');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('dusk');
  px.rect(0, 0, 16, 1, 'slate').rect(0, 5, 16, 3, 'night').rect(0, 6, 16, 1, 'cyan').rect(4, 6, 8, 1, 'white');
  dots(px, [[2, 11], [13, 11]], 'mist');
  if (c.lipS) px.rect(0, 13, 16, 2, 'slate').rect(0, 15, 16, 1, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('slate');
  px.rect(0, 0, 16, 2, 'mist').rect(0, 14, 16, 2, 'dusk').rect(0, 2, 1, 12, 'mist').rect(15, 2, 1, 12, 'dusk');
  if (c.v & 1) { px.rect(3, 4, 10, 7, 'night').frame(3, 4, 10, 7, 'mist'); px.line(4, 9, 7, 6, 'cyan').line(7, 6, 9, 8, 'cyan').line(9, 8, 12, 5, 'cyan'); }
  else { px.rect(3, 5, 10, 5, 'dusk'); for (let y = 6; y < 10; y += 2) px.rect(4, y, 8, 1, 'night'); }
  dots(px, [[2, 3], [13, 3], [2, 12], [13, 12]], c.v & 2 ? 'cyan' : 'mist');
  return px;
}

function ammo(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(1, 1, 14, 5, 'mist').rect(1, 6, 14, 8, 'dusk').frame(1, 1, 14, 13, 'ink');
  px.rect(1, 6, 14, 1, 'ink').rect(4, 8, 8, 3, 'night').rect(4, 8, 8, 1, 'yellow');
  px.rect(6, 10, 4, 1, 'yellow');
  dots(px, [[3, 3], [12, 3]], 'white');
  return px;
}

function bunk(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  box(px, 1, 1, 14, 14, 'mist', 'ink');
  px.rect(2, 5, 12, 9, 'sky').rect(2, 5, 12, 1, 'white').rect(3, 2, 10, 3, 'white').rect(3, 2, 10, 1, 'bone');
  for (let x = 4; x < 14; x += 4) px.rect(x, 6, 1, 8, 'blue');
  return px;
}

function cell(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 0, 16, 16, 'mist').rect(1, 1, 14, 14, 'sky').rect(7, 1, 2, 14, 'mist');
  px.line(2, 12, 5, 4, 'white').line(10, 12, 13, 4, 'white').set(3, 5, 'cyan').set(11, 5, 'cyan');
  px.rect(0, 14, 16, 2, 'dusk').rect(6, 8, 1, 2, 'ink').rect(9, 8, 1, 2, 'ink');
  return px;
}

function machine(phase: number): Px {
  const px = new Px(64, 32);
  for (const x of [1, 43]) {
    box(px, x, 2, 20, 28, 'dusk', 'ink');
    for (let r = 0; r < 6; r++) {
      px.rect(x + 2, 4 + r * 4, 16, 3, 'night');
      for (let k = 0; k < 5; k++) px.set(x + 3 + k * 3, 5 + r * 4, (r + k + phase) % 3 === 0 ? 'cyan' : (r * 5 + k + phase) % 7 === 0 ? 'red' : 'slate');
    }
  }
  box(px, 22, 0, 20, 32, 'slate', 'ink');
  px.rect(24, 2, 16, 4, 'mist').rect(24, 26, 16, 4, 'mist');
  px.rect(26, 6, 12, 20, 'night').frame(26, 6, 12, 20, 'white');
  px.ellipse(32, 16, 4 + (phase & 1) * 0.5, 9, 'teal1').ellipse(32, 16, 3, 7.5, 'cyan').ellipse(32, 16, 1.5, 5, 'white');
  return px;
}

function cipher(): Px {
  const px = new Px(32, 16);
  box(px, 0, 0, 32, 16, 'mist', 'ink');
  px.rect(1, 1, 30, 1, 'white').rect(1, 14, 30, 1, 'slate');
  px.rect(2, 3, 18, 9, 'night').frame(2, 3, 18, 9, 'dusk');
  cyr(px, 3, 5, 'СТОП', 'cyan');
  px.rect(3, 11, 16, 1, 'teal1');
  keypad(px, 21, 1, 'dusk', 'white', 'ink', 'cyan');
  return px;
}

function powerbox(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'yellow', 'ink');
  px.rect(4, 4, 24, 24, 'slate').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'dusk');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'white');
  bolt(px, 13, 12, lit ? 'white' : 'yellow');
  if (lit) {
    px.line(7, 10, 11, 14, 'cyan').line(24, 9, 21, 13, 'cyan').line(8, 24, 12, 20, 'cyan').line(23, 24, 20, 19, 'cyan');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

function breaker(lit: boolean): Px {
  const px = new Px(16).fill('slate');
  box(px, 2, 1, 12, 14, 'mist', 'ink');
  px.rect(3, 2, 10, 2, 'white').rect(5, 5, 6, 8, 'dusk').rect(7, 5, 2, 8, 'night');
  if (lit) { px.rect(7, 5, 2, 4, 'white').rect(6, 5, 4, 2, 'red'); dots(px, [[4, 4], [11, 3], [5, 9], [11, 8]], 'yellow'); px.set(12, 5, 'cyan'); }
  else { px.rect(7, 9, 2, 4, 'white').rect(6, 11, 4, 2, 'red'); }
  px.rect(4, 13, 2, 1, 'cyan');
  return px;
}

export const STEEL_BASE: BaseSet = { floor, grate, cap, wall, ammo, bunk, cell, machine, cipher, powerbox, breaker };
