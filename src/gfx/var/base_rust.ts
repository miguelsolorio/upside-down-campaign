// Base look 4, "Rust": the Soviet base under the Brass mall, after closing. Old iron on a boiler's power. Riveted plates streaked with
// rust, lattice grating over a furnace glow, a steam pipe run along every wall with red valve wheels, wooden crates, iron lattice cells,
// and for the Key a brass steam machine with a firebox that burns. The lamps and the fire are the light. See mall_kit.ts.
import { Px } from '../px.ts';
import type { BaseSet, MC } from './mall_kit.ts';
import { cyr } from './mall_kit.ts';
import { bolt, box, dots, hazard, keypad, shade } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 1, 'grey1').rect(0, 0, 1, 16, 'grey1').rect(0, 8, 16, 1, 'grey1').rect(8, 0, 1, 16, 'grey1');
  dots(px, [[2, 2], [6, 2], [10, 2], [14, 2], [2, 10], [6, 10], [10, 10], [14, 10]], 'grey3');
  px.rect(3 + c.v * 2, 4, 4, 2, 'blood0').set(4 + c.v * 2, 6, 'blood0');
  if (c.v === 2) px.set(5, 5, 'orange');
  px.rect(9 - c.v, 12, 3, 2, 'blood0');
  shade(px, c, 'grey1', 'grey1');
  return px;
}

function grate(c: MC): Px {
  const px = new Px(16).fill('ink');
  for (let i = 0; i < 16; i += 4) px.rect(i, 0, 1, 16, 'grey3').rect(0, i, 16, 1, 'grey3');
  for (let i = 1; i < 16; i += 4) for (let j = 1; j < 16; j += 4) px.rect(i, j, 3, 3, (i * 3 + j + c.v) % 7 < 3 ? 'blood1' : 'blood0').set(i + 1, j + 1, (i * 3 + j + c.v) % 7 < 3 ? 'orange' : 'blood1');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('grey1');
  px.rect(0, 0, 16, 1, 'grey2').rect(0, 6, 16, 2, 'grey2');
  dots(px, [[2, 3], [7, 3], [12, 3], [2, 11], [7, 11], [12, 11]], 'grey3');
  px.rect(10 + (c.v & 1), 8, 1, 3, 'blood1');
  if (c.lipS) px.rect(0, 13, 16, 2, 'grey3').rect(0, 15, 16, 1, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 2, 'grey1').rect(0, 14, 16, 2, 'grey1').rect(0, 2, 1, 12, 'grey1').rect(15, 2, 1, 12, 'grey1');
  px.rect(0, 6, 16, 4, 'grey3').rect(0, 6, 16, 1, 'mist').rect(0, 9, 16, 1, 'grey1');
  for (const x of [3, 12]) px.rect(x - 1, 5, 3, 6, 'sand').rect(x - 1, 5, 3, 1, 'amber');
  if (c.v & 1) { px.disc(8, 8, 2.5, 'cream').set(8, 7, 'red').set(8, 6, 'red').set(9, 8, 'ink'); } else { px.disc(8, 8, 2.5, 'blood1').rect(5, 8, 7, 1, 'red').rect(8, 5, 1, 7, 'red'); }
  dots(px, [[3, 3], [12, 3], [3, 12], [12, 12]], 'grey3');
  return px;
}

function ammo(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(1, 1, 14, 5, 'blood1').rect(1, 6, 14, 8, 'blood0').frame(1, 1, 14, 13, 'ink');
  px.rect(1, 6, 14, 1, 'ink').rect(3, 6, 1, 8, 'ink').rect(12, 6, 1, 8, 'ink');
  for (const y of [8, 10, 12]) px.rect(4, y, 8, 1, 'blood1');
  px.rect(5, 9, 6, 1, 'amber');
  dots(px, [[3, 3], [12, 3]], 'sand');
  return px;
}

function bunk(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  box(px, 1, 1, 14, 14, 'grey3', 'ink');
  px.rect(2, 5, 12, 9, 'sand').rect(2, 5, 12, 1, 'soil3').rect(3, 2, 10, 3, 'bone').rect(3, 2, 10, 1, 'white');
  px.rect(2, 8, 12, 5, 'grey2').rect(2, 8, 12, 1, 'grey3');
  return px;
}

function cell(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 0, 16, 16, 'night').rect(0, 0, 16, 2, 'grey3').rect(0, 14, 16, 2, 'grey3');
  for (let k = 0; k < 14; k++) px.set(1 + k, 2 + (k % 6) * 2, 'grey3').set(14 - k, 2 + (k % 6) * 2, 'grey3').set(1 + k, 3 + (k % 6) * 2, 'grey3').set(14 - k, 3 + (k % 6) * 2, 'grey3');
  px.rect(7, 7, 2, 3, 'amber');
  return px;
}

function machine(phase: number): Px {
  const px = new Px(64, 32);
  px.rect(10, 6, 38, 16, 'ink').ellipse(10, 14, 6, 8.5, 'ink').ellipse(48, 14, 6, 8.5, 'ink');
  px.rect(10, 7, 38, 14, 'sand').ellipse(10, 14, 5, 7.5, 'sand').ellipse(48, 14, 5, 7.5, 'sand');
  px.rect(10, 7, 38, 2, 'amber').rect(10, 19, 38, 2, 'soil3');
  for (const x of [16, 28, 40]) px.rect(x, 6, 3, 16, 'soil3').rect(x, 6, 1, 16, 'amber');
  px.rect(20, 1, 10, 6, 'soil3').rect(20, 1, 10, 1, 'sand').frame(20, 1, 10, 6, 'ink');
  px.rect(38, 0, 4, 7, 'grey3').rect(38, 0, 1, 7, 'mist').frame(38, 0, 4, 7, 'ink');
  px.disc(25, 14, 3.5, 'cream').frame(21, 10, 9, 9, 'sand'); px.set(25, 14, 'red').set(25 + (phase & 1) * 2, 12, 'red');
  px.disc(56, 14, 7.5, 'ink').disc(56, 14, 6.5, 'grey3').disc(56, 14, 4.5, 'ink').disc(56, 14, 1.5, 'amber');
  const sp: [number, number][][] = [[[0, -4], [4, 0]], [[3, -3], [3, 3]], [[0, -4], [4, 0]], [[3, -3], [3, 3]]];
  for (const [dx, dy] of sp[phase & 3] as [number, number][]) px.line(56 - dx, 14 - dy, 56 + dx, 14 + dy, 'grey3');
  px.rect(10, 22, 30, 10, 'ink').frame(10, 22, 30, 10, 'sand');
  px.rect(12, 24, 12, 7, 'blood1').rect(13, 25, 10, 6, 'orange').rect(14, 26, 8, 5, 'yellow').rect(16 + (phase & 1), 27, 3, 3, 'white');
  dots(px, [[28, 25], [32, 25], [36, 25], [28, 28], [32, 28], [36, 28]], 'amber');
  return px;
}

function cipher(): Px {
  const px = new Px(32, 16);
  box(px, 0, 0, 32, 16, 'grey3', 'ink');
  dots(px, [[2, 2], [29, 2], [2, 13], [29, 13]], 'grey1');
  px.rect(2, 3, 18, 9, 'sand').frame(2, 3, 18, 9, 'soil3').rect(3, 4, 16, 7, 'ink');
  cyr(px, 3, 5, 'СТОП', 'amber');
  px.rect(3, 11, 16, 1, 'blood1');
  keypad(px, 21, 1, 'sand', 'soil3', 'amber', 'red');
  return px;
}

function powerbox(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'orange', 'ink');
  px.rect(4, 4, 24, 24, 'grey2').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'grey1');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'sand');
  bolt(px, 13, 12, lit ? 'white' : 'orange');
  if (lit) {
    px.line(7, 10, 11, 14, 'yellow').line(24, 9, 21, 13, 'yellow').line(8, 24, 12, 20, 'yellow').line(23, 24, 20, 19, 'yellow');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

function breaker(lit: boolean): Px {
  const px = new Px(16).fill('grey2');
  box(px, 2, 1, 12, 14, 'blood0', 'ink');
  px.rect(4, 3, 8, 2, 'sand').rect(4, 11, 8, 2, 'sand').rect(7, 5, 2, 6, 'ink');
  if (lit) { px.rect(7, 3, 2, 5, 'amber').rect(6, 3, 4, 2, 'red'); dots(px, [[4, 6], [11, 5], [5, 9], [11, 8]], 'yellow'); px.set(12, 7, 'white'); }
  else { px.rect(7, 7, 2, 5, 'amber').rect(6, 10, 4, 2, 'red'); }
  return px;
}

export const RUST_BASE: BaseSet = { floor, grate, cap, wall, ammo, bunk, cell, machine, cipher, powerbox, breaker };
