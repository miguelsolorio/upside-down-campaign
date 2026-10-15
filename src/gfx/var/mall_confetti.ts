// Mall look 5, "Confetti", after closing: 1985 at its loudest, with the lights off. Black terrazzo with neon chips in it, a zigzag of two
// tubes for the band, triangles along the top of the walls, walls that are a different bold pattern in every bay, shop signs of rainbow
// arcs, a diamond basin lit from within, a pot shaped like a cube. The chips and the tubes are the colors the night art leaves alone
// (magenta, yellow, pink), so they glow on a floor that is nearly black. See mall_kit.ts.
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import type { MC, MallSet } from './mall_kit.ts';
import { dots, leaves, rects, shade, gooTile } from './mall_paint.ts';
import type { Pt } from './mall_paint.ts';

type Kind = 'dot' | 'tri' | 'zig' | 'plus' | 'bar' | 'ring';
const SHAPES: Record<Kind, Pt[]> = {
  dot: [[0, 0]], tri: [[1, 0], [0, 1], [1, 1], [2, 1]], zig: [[0, 0], [1, 1], [2, 0], [3, 1]],
  plus: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], bar: [[0, 0], [1, 0], [2, 0]], ring: [[1, 0], [0, 1], [2, 1], [1, 2]],
};
function chip(px: Px, x: number, y: number, k: Kind, col: Paint): void { for (const [dx, dy] of SHAPES[k]) px.set(x + dx, y + dy, col); }

const CHIPS: [number, number, Kind, Paint][][] = [
  [[2, 2, 'tri', 'magenta'], [9, 3, 'zig', 'yellow'], [5, 8, 'dot', 'cyan'], [11, 10, 'plus', 'purple'], [2, 12, 'bar', 'pink']],
  [[10, 1, 'ring', 'cyan'], [3, 5, 'bar', 'yellow'], [8, 8, 'tri', 'purple'], [12, 12, 'dot', 'magenta'], [2, 11, 'zig', 'hot']],
  [[4, 3, 'plus', 'yellow'], [11, 6, 'dot', 'pink'], [2, 9, 'tri', 'cyan'], [8, 12, 'bar', 'magenta'], [12, 2, 'zig', 'purple']],
  [[6, 2, 'dot', 'cyan'], [2, 6, 'zig', 'magenta'], [10, 8, 'ring', 'yellow'], [4, 12, 'tri', 'pink'], [12, 12, 'bar', 'purple']],
];

function floor(c: MC): Px {
  const px = new Px(16).fill('night');
  px.rect(0, 0, 16, 1, 'shadow').rect(0, 0, 1, 16, 'shadow');
  for (const [x, y, k, col] of CHIPS[c.v] as [number, number, Kind, Paint][]) chip(px, x, y, k, col);
  shade(px, c, 'ink', 'ink');
  return px;
}

function band(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 0, 16, 1, 'shadow').rect(0, 15, 16, 1, 'shadow');
  for (let x = 0; x < 16; x++) {
    const t = x % 8 < 4 ? x % 8 : 8 - (x % 8);
    px.set(x, 3 + t, 'yellow').set(x, 8 + t, 'magenta');
  }
  dots(px, [[2, 14], [10, 1]], 'cyan');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('ink');
  for (const x0 of [0, 8]) for (const y0 of [1, 8]) { for (let k = 0; k < 4; k++) px.rect(x0 + 3 - k, y0 + k, 2 * k + 2, 1, k === 0 ? 'purple' : 'purple0'); }
  if (c.lipS) px.rect(0, 13, 16, 1, 'purple').rect(0, 14, 16, 2, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('purple0');
  if (c.v === 0) { for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if ((x + y) % 6 < 2) px.set(x, y, 'ink'); px.line(1, 8, 14, 8, 'cyan'); }
  else if (c.v === 1) { for (const [x, y] of [[3, 3], [11, 3], [7, 8], [3, 12], [11, 12]] as Pt[]) px.rect(x, y, 2, 2, 'magenta'); }
  else if (c.v === 2) { px.line(2, 12, 8, 2, 'yellow').line(8, 2, 14, 12, 'yellow').line(2, 12, 14, 12, 'yellow'); px.rect(7, 7, 2, 2, 'ink'); }
  else { for (const x of [3, 11]) px.ellipse(x + 0.5, 12, 3.5, 4, 'cyan').ellipse(x + 0.5, 12, 2, 2.5, 'purple0'); px.rect(0, 12, 16, 2, 'purple0'); }
  px.rect(0, 0, 16, 1, 'purple').rect(0, 14, 16, 2, 'ink');
  return px;
}

function shop(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.ellipse(8, 7, 7.5, 6.5, 'magenta').ellipse(8, 7, 5.5, 4.5, 'yellow').ellipse(8, 7, 3.5, 2.5, 'cyan').ellipse(8, 7, 1.8, 1.2, 'ink');
  px.rect(0, 7, 16, 9, 'ink');
  px.rect(1, 8, 14, 6, 'night').frame(1, 8, 14, 6, 'purple');
  px.line(3, 13, 6, 9, 'hot').line(6, 9, 9, 13, 'hot').line(3, 13, 9, 13, 'hot');
  dots(px, [[11, 10], [12, 10], [11, 11], [12, 11]], 'yellow');
  dots(px, [[13, 12], [10, 13]], 'cyan');
  if (c.v & 1) dots(px, [[8, 11]], 'pink');
  px.rect(0, 14, 16, 2, 'purple0');
  return px;
}

function shut(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 7, 'ink').frame(0, 0, 16, 7, 'purple0');
  px.ellipse(8, 7, 6, 5, 'purple0').ellipse(8, 7, 4, 3, 'ink').rect(0, 7, 16, 9, 'grey2');
  for (let y = 8; y < 14; y += 2) px.rect(0, y, 16, 1, 'grey3');
  for (let x = 0; x < 16; x++) px.set(x, 9 + (x % 4 < 2 ? 0 : 1), 'magenta');
  dots(px, [[3, 12], [11, 12]], 'yellow');
  px.rect(0, 14, 16, 2, 'grey1');
  if (c.v & 2) px.set(13, 1, 'red');
  return px;
}

function glass(): Px {
  const px = new Px(16).fill('purple0');
  px.rect(0, 0, 16, 4, 'night').rect(3, 1, 10, 2, 'hot').rect(4, 1, 8, 1, 'pink');
  px.rect(1, 5, 6, 9, 'ink').rect(9, 5, 6, 9, 'ink');
  px.line(2, 12, 4, 6, 'cyan').line(4, 6, 6, 12, 'cyan').line(2, 12, 6, 12, 'cyan');
  px.frame(10, 7, 4, 4, 'yellow').rect(11, 8, 2, 2, 'yellow');
  px.rect(0, 14, 16, 2, 'ink').rect(7, 5, 2, 9, 'purple');
  return px;
}

function fountain(): Px {
  const px = new Px(32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.abs(x - 15.5) + Math.abs(y - 17) * 1.15;
    if (d > 15.5) continue;
    px.set(x, y, d > 14.2 ? 'ink' : d > 12.4 ? 'purple' : d > 10.8 ? 'night' : d > 3.6 ? (Math.floor(d) % 4 < 2 ? 'cyan' : 'blue') : d > 1.6 ? 'yellow' : 'white');
  }
  px.rect(15, 5, 2, 9, 'yellow').rect(14, 5, 4, 1, 'white').rect(15, 3, 2, 2, 'cyan');
  dots(px, [[12, 6], [19, 6], [11, 8], [20, 8], [16, 2]], 'pink');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 9, 8, 6, 'magenta').rect(4, 8, 8, 2, 'purple').frame(4, 8, 8, 7, 'ink').rect(4, 9, 8, 1, 'pink');
  px.rect(9, 10, 3, 4, 'purple0');
  const tips: Pt[][] = [[[4, 1], [7, 0], [10, 1], [12, 3], [3, 4]], [[3, 2], [8, 0], [12, 2], [13, 5], [5, 3]], [[5, 0], [9, 1], [11, 0], [3, 3], [13, 4]], [[4, 2], [7, 1], [11, 1], [2, 5], [13, 3]]];
  leaves(px, 8, 8, tips[c.v] as Pt[], 'pine3', 'yellow');
  return px;
}

function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 4, r - l, 3, 'slate').rect(l, 4, r - l, 1, 'mist');
  px.rect(l, 7, r - l, 8, 'purple0');
  for (let x = l; x < r; x++) px.set(x, 9 + ((x + c.tx * 3) % 4 < 2 ? 0 : 1), 'yellow');
  rects(px, [[l, 14, r - l, 1, ]], 'purple');
  dots(px, [[l + 2, 12], [l + 8, 12], [l + 12, 12]], 'cyan');
  if (c.tx === 2) { px.ellipse(8, 10.5, 2.4, 1.6, 'pink').line(6, 12, 8, 14, 'yellow').line(10, 12, 8, 14, 'yellow').rect(6, 12, 5, 1, 'yellow'); dots(px, [[7, 9]], 'white'); }
  return px;
}

const goo = (c: MC): Px => gooTile(c, { body: 'purple', rim: 'ink', hi: 'magenta', spec: 'yellow', seed: 0.4 });

export const CONFETTI_MALL: MallSet = { floor, band, cap, wall, shop, shut, glass, fountain, planter, scoops, goo };
