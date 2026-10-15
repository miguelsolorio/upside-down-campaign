// Mall look 2, "Chrome", by day: the new mall as an ad would draw it, cool and bright. Big white plates with a blue inlaid band of
// chevrons, steel panel walls, fluorescent light strips along the top, arched windows lit magenta, sliding doors, a square basin with
// a chrome column, chrome planters, a diner counter in pink and aqua. No warm colors but the shop windows. See mall_kit.ts.
import { Px } from '../px.ts';
import type { MC, MallSet } from './mall_kit.ts';
import { dots, hstripes, leaves, rects, shade, gooTile } from './mall_paint.ts';
import type { Pt } from './mall_paint.ts';

const SPARKS: Pt[] = [[2, 6], [10, 5], [5, 12], [11, 11]];

function floor(c: MC): Px {
  const px = new Px(16).fill('bone');
  px.rect(0, 0, 16, 1, 'mist').rect(0, 8, 16, 1, 'mist').rect(0, 0, 1, 16, 'mist').rect(8, 0, 1, 16, 'mist');
  rects(px, [[1, 1, 6, 1], [9, 1, 6, 1], [1, 9, 6, 1], [9, 9, 6, 1], [1, 1, 1, 6], [9, 1, 1, 6], [1, 9, 1, 6], [9, 9, 1, 6]], 'white');
  const [x, y] = SPARKS[c.v] as Pt;
  px.line(x, y, x + 3, y - 3, 'sky').set(x + 3, y - 3, 'white');
  shade(px, c, 'mist', 'mist');
  return px;
}

function band(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 4, 16, 8, 'blue').rect(0, 4, 16, 1, 'white').rect(0, 11, 16, 1, 'dusk').rect(0, 5, 16, 1, 'sky');
  for (const x of [1, 5, 9, 13]) dots(px, [[x, 6], [x + 1, 7], [x + 2, 8], [x + 1, 9], [x, 10]], 'cyan');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 1, 'white').rect(0, 15, 16, 1, 'mist');
  px.rect(1, 4, 14, 3, 'white').rect(2, 5, 12, 1, 'cream').rect(1, 10, 14, 3, 'white').rect(2, 11, 12, 1, 'cream');
  dots(px, [[0, 6], [15, 6], [0, 12], [15, 12]], 'mist');
  if (c.lipS) px.rect(0, 13, 16, 2, 'mist').rect(0, 15, 16, 1, 'dusk');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('grey3');
  for (let x = 0; x < 16; x += 4) px.rect(x, 0, 1, 14, 'white').rect(x + 1, 0, 2, 14, 'grey3').rect(x + 3, 0, 1, 14, 'mist');
  px.rect(0, 6, 16, 3, 'blue').rect(0, 6, 16, 1, 'sky').rect(0, 8, 16, 1, 'dusk');
  px.rect(0, 14, 16, 2, 'dusk').rect(0, 14, 16, 1, 'slate');
  dots(px, [[(c.v * 4 + 2) % 16, 3], [(c.v * 4 + 2) % 16, 11]], 'cyan');
  return px;
}

function shop(c: MC): Px {
  const px = new Px(16).fill('white');
  px.rect(0, 0, 16, 5, 'blue').rect(0, 4, 16, 1, 'cyan');
  for (const x of [2, 6, 10]) px.rect(x + (c.v & 1), 1, 3, 2, 'white');
  px.rect(1, 6, 14, 8, 'dusk');
  px.rect(2, 7, 12, 7, 'purple').ellipse(8, 11.5, 6, 4.5, 'purple');
  px.rect(2, 7, 12, 2, 'mist');
  px.rect(3, 9, 10, 5, 'purple');
  dots(px, [[4, 10], [5, 10], [4, 11]], 'pink');
  dots(px, [[8, 11], [9, 11], [8, 12], [9, 12]], 'cyan');
  dots(px, [[11, 10], [12, 10], [11, 11]], 'magenta');
  px.set(3, 8, 'white').set(4, 8, 'white');
  px.rect(0, 14, 16, 2, 'mist');
  return px;
}

function shut(c: MC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 3, 'white').rect(0, 3, 16, 1, 'mist');
  for (let y = 5; y < 13; y += 3) for (let x = 1 + ((y / 3) & 1) * 2; x < 15; x += 4) px.set(x, y, 'grey2').set(x + 1, y, 'grey2');
  for (let y = 4; y < 14; y += 3) px.rect(0, y, 16, 1, 'mist');
  px.rect(0, 13, 16, 3, 'mist').rect(5, 13, 6, 1, 'white').rect(0, 15, 16, 1, 'dusk');
  if (c.v & 2) dots(px, [[13, 2]], 'red');
  return px;
}

function glass(): Px {
  const px = new Px(16).fill('white');
  px.rect(0, 0, 16, 4, 'blue').rect(7, 1, 2, 2, 'red');
  px.rect(1, 5, 5, 9, 'sky').rect(10, 5, 5, 9, 'sky').rect(6, 5, 4, 9, 'mist');
  px.frame(1, 5, 5, 9, 'mist').frame(10, 5, 5, 9, 'mist');
  px.line(2, 12, 4, 7, 'white').line(11, 12, 13, 7, 'white');
  px.rect(5, 8, 1, 4, 'grey2').rect(10, 8, 1, 4, 'grey2');
  px.rect(0, 14, 16, 2, 'dusk').rect(2, 14, 12, 1, 'blue');
  return px;
}

function fountain(): Px {
  const px = new Px(32);
  px.rect(2, 3, 28, 27, 'ink').rect(3, 3, 26, 26, 'white').rect(3, 3, 26, 1, 'bone').rect(4, 5, 24, 23, 'mist').rect(5, 6, 22, 21, 'blue');
  px.frame(7, 8, 18, 17, 'sky').frame(10, 11, 12, 11, 'cyan').frame(8, 9, 16, 15, 'blue');
  px.rect(13, 14, 6, 5, 'white').rect(14, 13, 4, 7, 'white');
  for (const [x, y] of [[16, 11], [16, 21], [11, 16], [21, 16]] as [number, number][]) px.rect(x - 1, y - 1, 2, 2, 'cyan');
  dots(px, [[13, 12], [19, 12], [13, 20], [19, 20], [9, 14], [23, 14], [9, 19], [23, 19]], 'white');
  px.rect(3, 28, 26, 1, 'grey3');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 8, 8, 7, 'grey3').rect(4, 8, 2, 7, 'white').rect(10, 8, 2, 7, 'mist').rect(3, 7, 10, 2, 'white').rect(3, 7, 10, 1, 'bone').rect(4, 14, 8, 1, 'dusk');
  const tips: Pt[][] = [[[3, 1], [13, 1], [8, 0], [5, 2], [11, 2]], [[2, 2], [12, 0], [7, 0], [4, 1], [14, 3]], [[4, 0], [14, 2], [9, 0], [2, 3], [10, 1]], [[3, 2], [13, 2], [8, 1], [6, 0], [12, 3]]];
  leaves(px, 8, 7, tips[c.v] as Pt[], 'pine2', 'pine3');
  leaves(px, 8, 7, [[7, 2], [10, 3]], 'pine3', 'leaf');
  return px;
}

function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 3, r - l, 3, 'white').rect(l, 6, r - l, 1, 'grey3');
  hstripes(px, l, 7, r - l, 8, 4, 2, 'pink', 'cyan');
  px.rect(l, 7, r - l, 1, 'white').rect(l, 14, r - l, 1, 'grey3').rect(l, 15, r - l, 1, 'dusk');
  if (!c.kW) px.rect(0, 4, 1, 11, 'ink');
  if (!c.kE) px.rect(15, 4, 1, 11, 'ink');
  if (c.tx === 2) { px.rect(6, 0, 4, 3, 'pink').rect(7, 3, 2, 1, 'amber'); dots(px, [[7, 0]], 'white'); }
  return px;
}

const goo = (c: MC): Px => gooTile(c, { body: 'purple0', rim: 'ink', hi: 'purple', spec: 'magenta', seed: 2.9 });

export const CHROME_MALL: MallSet = { floor, band, cap, wall, shop, shut, glass, fountain, planter, scoops, goo };
