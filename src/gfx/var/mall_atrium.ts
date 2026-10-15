// Mall look 1, "Atrium", by day: a sunlit 1985 mall in cream, pink and teal. Terrazzo floors with a teal and pink inlaid band, skylights
// along the top of the walls, pink stucco walls, shop windows under striped awnings, a round tiered fountain, palms in clay pots, a
// sailor striped Scoops Ahoy counter. Nothing is dark: the daylight does the lighting. See mall_kit.ts.
import { Px } from '../px.ts';
import type { MC, MallSet } from './mall_kit.ts';
import { dots, leaves, rects, shade, vstripes, gooTile } from './mall_paint.ts';
import type { Pt } from './mall_paint.ts';

const CHIPS: Pt[][] = [[[3, 4], [11, 3], [6, 11], [13, 12], [9, 7]], [[5, 3], [12, 6], [3, 10], [10, 13], [8, 8]], [[4, 6], [13, 4], [7, 12], [11, 10], [2, 13]], [[10, 3], [3, 7], [8, 10], [13, 13], [5, 14]]];

function floor(c: MC): Px {
  const px = new Px(16).fill('cream');
  px.rect(0, 0, 16, 1, 'sand').rect(0, 0, 1, 16, 'sand').rect(1, 1, 14, 1, 'white').rect(1, 1, 1, 14, 'white');
  const chips = CHIPS[c.v] as Pt[];
  chips.forEach(([x, y], i) => px.set(x, y, i & 1 ? 'teal1' : 'rose'));
  shade(px, c, 'sand', 'sand');
  return px;
}

function band(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 4, 16, 1, 'white').rect(0, 5, 16, 6, 'teal1').rect(0, 11, 16, 1, 'white').rect(0, 10, 16, 1, 'teal0');
  for (const x of [4, 12]) dots(px, [[x, 6], [x - 1, 7], [x, 7], [x + 1, 7], [x, 8]], 'pink');
  dots(px, [[4, 7], [12, 7]], 'white');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('white');
  px.rect(7, 0, 2, 16, 'bone').rect(0, 7, 16, 2, 'bone');
  for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) {
    px.rect(x as number, y as number, 6, 6, 'sky');
    px.set((x as number) + 1, (y as number) + 1, 'white').set((x as number) + 2, (y as number) + 2, 'cyan');
  }
  if (c.lipS) px.rect(0, 14, 16, 2, 'sand').rect(0, 13, 16, 1, 'bone');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('pink');
  px.rect(0, 0, 16, 2, 'rose').rect(0, 2, 16, 1, 'white');
  px.rect(0, 9, 16, 1, 'white').rect(0, 10, 16, 1, 'rose');
  px.rect(0, 13, 16, 3, 'white').rect(0, 13, 16, 1, 'sand');
  px.rect(0, 3, 1, 10, 'white').rect(15, 3, 1, 10, 'white');
  dots(px, ([[[4, 5], [10, 7], [7, 11]], [[5, 4], [11, 6], [3, 11]], [[3, 6], [9, 4], [12, 11]], [[6, 5], [12, 8], [4, 12]]] as Pt[][])[c.v] as Pt[], 'rose');
  return px;
}

function shop(c: MC): Px {
  const px = new Px(16).fill('white');
  vstripes(px, 0, 0, 16, 5, 8, 4, 'teal1', 'white', c.tx & 1 ? 4 : 0);
  for (let x = 0; x < 16; x++) if ((x + (c.tx & 1 ? 4 : 0)) % 8 < 4) px.set(x, 5, 'teal1'); else px.set(x, 5, 'white');
  px.rect(0, 6, 16, 1, 'sand');
  px.rect(1, 7, 14, 7, 'night').rect(2, 8, 12, 5, 'cream');
  px.rect(2, 12, 12, 1, 'soil3');
  px.ellipse(5.5, 9.5, 1.5, 1.5, 'skin0').rect(4, 11, 3, 1, 'rose').rect(5, 12, 1, 1, 'rose');
  px.rect(9, 10, 3, 2, 'pink').rect(10, 9, 1, 1, 'amber');
  px.set(3, 8, 'white').set(4, 8, 'white').set(2, 9, 'white');
  px.rect(0, 14, 16, 2, 'sand');
  return px;
}

function shut(c: MC): Px {
  const px = new Px(16).fill('bone');
  px.rect(0, 0, 16, 3, 'rose').rect(0, 3, 16, 1, 'white');
  for (let y = 5; y < 13; y += 2) px.rect(0, y, 16, 1, 'grey3').rect(0, y + 1, 16, 1, 'white');
  px.rect(0, 13, 16, 2, 'grey3').rect(6, 13, 4, 1, 'amber').rect(0, 15, 16, 1, 'sand');
  px.rect(0, 0, 1, 16, 'sand').rect(15, 0, 1, 16, 'sand');
  if (c.v & 1) dots(px, [[3, 8], [4, 8]], 'pink');
  return px;
}

function glass(): Px {
  const px = new Px(16).fill('white');
  px.rect(0, 0, 16, 4, 'rose').rect(0, 4, 16, 1, 'bone');
  px.rect(1, 5, 6, 9, 'sky').rect(9, 5, 6, 9, 'sky');
  px.line(2, 12, 5, 6, 'white').line(10, 12, 13, 6, 'white');
  dots(px, [[3, 6], [11, 6]], 'cyan');
  px.rect(6, 8, 1, 3, 'amber').rect(9, 8, 1, 3, 'amber');
  px.rect(0, 14, 16, 2, 'sand');
  return px;
}

function fountain(): Px {
  const px = new Px(32);
  px.ellipse(16, 17.5, 15.5, 13.5, 'ink').ellipse(16, 17, 15, 13, 'pink').ellipse(16, 17, 13.5, 11.5, 'white').ellipse(16, 17.5, 12, 10, 'sky');
  px.ellipse(16, 18, 9.5, 7.5, 'cyan').ellipse(16, 18.5, 7.5, 5.5, 'sky');
  px.ellipse(16, 18, 5, 3.5, 'white').rect(14, 8, 4, 9, 'white').rect(15, 5, 2, 3, 'cyan');
  rects(px, [[12, 4, 1, 3], [19, 4, 1, 3], [10, 8, 1, 3], [21, 8, 1, 3]], 'cyan');
  dots(px, [[11, 3], [20, 3], [9, 7], [22, 7], [16, 3], [13, 6], [18, 6]], 'white');
  dots(px, [[8, 20], [24, 20], [12, 24], [20, 23], [16, 26]], 'white');
  px.rect(3, 14, 3, 1, 'rose').rect(26, 14, 3, 1, 'rose');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 10, 8, 5, 'soil3').rect(3, 9, 10, 2, 'soil2').rect(10, 11, 2, 4, 'soil2').rect(4, 14, 8, 1, 'soil1');
  px.rect(3, 9, 10, 1, 'sand');
  const tips: Pt[][] = [[[2, 3], [14, 3], [8, 0], [3, 7], [13, 7]], [[3, 2], [13, 4], [7, 0], [2, 6], [14, 7]], [[2, 4], [14, 2], [9, 0], [4, 7], [13, 6]], [[3, 3], [13, 2], [8, 1], [2, 7], [14, 6]]];
  leaves(px, 8, 9, tips[c.v] as Pt[], 'pine3', 'leaf');
  leaves(px, 8, 9, [[6, 3], [11, 4]], 'pine2', 'pine3');
  return px;
}

function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 3, r - l, 3, 'bone').rect(l, 6, r - l, 1, 'grey3');
  px.rect(l, 7, r - l, 1, 'red');
  vstripes(px, l, 8, r - l, 7, 4, 2, 'blue', 'white', c.tx);
  px.rect(l, 15, r - l, 1, 'dusk');
  if (!c.kW) px.rect(0, 4, 1, 11, 'ink');
  if (!c.kE) px.rect(15, 4, 1, 11, 'ink');
  if (c.tx === 2) { px.rect(6, 1, 4, 3, 'pink').rect(7, 0, 2, 1, 'pink').rect(7, 4, 2, 1, 'sand'); dots(px, [[7, 1]], 'white'); }
  return px;
}

const goo = (c: MC): Px => gooTile(c, { body: 'blood1', rim: 'blood0', hi: 'rose', spec: 'pink', seed: 1.3 });

export const ATRIUM_MALL: MallSet = { floor, band, cap, wall, shop, shut, glass, fountain, planter, scoops, goo };
