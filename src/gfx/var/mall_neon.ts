// Mall look 3, "Neon", after closing: a black polished mall where the neon is the only light. Dark glossy floors with two neon tubes
// inlaid, violet walls trimmed in pink and aqua, shop signs of bent tubes over dark windows, a basin lit from under the water. The
// structure is painted in the colors the night art darkens (night, shadow, dusk, slate) and the tubes in the ones it leaves alone
// (magenta, pink, yellow), so after the night pass the signs, the band and the fountain are what you see. See mall_kit.ts.
import { Px } from '../px.ts';
import type { MC, MallSet } from './mall_kit.ts';
import { dots, leaves, rects, shade, gooTile } from './mall_paint.ts';
import type { Pt } from './mall_paint.ts';

const STREAKS: Pt[] = [[2, 12], [9, 13], [6, 9], [10, 7]];

function floor(c: MC): Px {
  const px = new Px(16).fill('dusk');
  px.rect(0, 0, 16, 1, 'night').rect(0, 0, 1, 16, 'night');
  const [x, y] = STREAKS[c.v] as Pt;
  px.line(x, y, x + 4, y - 4, 'slate').set(x + 4, y - 4, 'mist').set(x + 1, y - 1, 'mist');
  dots(px, [[12 - c.v, 3 + c.v * 2]], 'shadow');
  shade(px, c, 'night', 'night');
  return px;
}

function band(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 5, 16, 1, 'purple0').rect(0, 10, 16, 1, 'purple0');
  px.rect(0, 6, 16, 1, 'magenta').rect(0, 9, 16, 1, 'cyan');
  px.rect(0, 7, 16, 2, 'ink');
  dots(px, [[3 + c.v, 7], [11 - c.v, 8]], 'pink');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 0, 16, 2, 'purple0').rect(0, 7, 16, 2, 'purple0').rect(7, 0, 2, 16, 'night');
  dots(px, [[3, 4], [11, 12], [12, 4], [3, 12]], 'purple');
  if (c.lipS) px.rect(0, 13, 16, 1, 'purple').rect(0, 14, 16, 2, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('purple0');
  px.rect(0, 0, 16, 1, 'magenta').rect(0, 15, 16, 1, 'cyan').rect(0, 14, 16, 1, 'ink');
  px.rect(2, 3, 12, 9, 'night').frame(2, 3, 12, 9, 'dusk');
  px.line(4, 10, 9, 5, 'slate').line(8, 10, 12, 6, 'slate');
  px.rect(0, 0, 1, 16, 'ink').rect(15, 0, 1, 16, 'ink');
  dots(px, [[3 + c.v * 2, 1]], 'pink');
  return px;
}

/** The bent tubes of a sign, by variant: a wave, a ring, a zigzag, chevrons. */
function sign(px: Px, v: number): void {
  px.rect(0, 0, 16, 7, 'ink').frame(0, 0, 16, 7, 'purple0');
  if (v === 0) { for (let x = 2; x < 14; x++) px.set(x, 2 + Math.round(1.5 * Math.sin(x * 0.9)), 'cyan'); px.rect(3, 5, 10, 1, 'magenta'); }
  else if (v === 1) { px.ellipse(8, 3.5, 5.5, 2.5, 'magenta').ellipse(8, 3.5, 4.2, 1.6, 'ink'); dots(px, [[8, 3], [7, 3]], 'pink'); }
  else if (v === 2) { px.line(2, 5, 5, 1, 'yellow').line(5, 1, 8, 5, 'yellow').line(8, 5, 11, 1, 'yellow').line(11, 1, 14, 5, 'yellow'); dots(px, [[8, 5]], 'white'); }
  else { for (const x of [3, 7, 11]) px.line(x, 1, x + 2, 3, 'pink').line(x + 2, 3, x, 5, 'pink'); px.rect(2, 5, 12, 1, 'cyan'); }
}

function shop(c: MC): Px {
  const px = new Px(16).fill('ink');
  sign(px, c.v);
  px.rect(1, 8, 14, 6, 'night').frame(1, 8, 14, 6, 'slate');
  px.rect(2, 9, 12, 4, 'purple0');
  dots(px, [[4, 11], [5, 11], [4, 12], [5, 12]], 'pink');
  dots(px, [[8, 10], [9, 10], [8, 11], [9, 11]], 'yellow');
  dots(px, [[11, 11], [12, 11]], 'magenta');
  px.set(2, 9, 'mist').set(3, 9, 'slate').set(2, 10, 'slate');
  px.rect(0, 14, 16, 2, 'slate');
  return px;
}

function shut(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 7, 'ink').frame(0, 0, 16, 7, 'purple0');
  px.line(3, 4, 6, 2, 'purple0').line(6, 2, 9, 4, 'purple0').line(9, 4, 12, 2, 'purple0');
  px.set(13, 1, 'red');
  for (let y = 8; y < 14; y += 2) px.rect(0, y, 16, 1, 'grey3');
  px.rect(0, 14, 16, 2, 'grey1').rect(6, 14, 4, 1, 'slate');
  if (c.v & 1) px.rect(2, 10, 3, 1, 'magenta');
  return px;
}

function glass(): Px {
  const px = new Px(16).fill('slate');
  px.rect(0, 0, 16, 4, 'night').rect(3, 1, 10, 2, 'hot').rect(4, 1, 8, 1, 'pink');
  px.rect(1, 5, 6, 9, 'ink').rect(9, 5, 6, 9, 'ink');
  px.line(2, 12, 5, 7, 'dusk').line(10, 12, 13, 7, 'dusk');
  px.rect(6, 6, 1, 7, 'cyan').rect(9, 6, 1, 7, 'cyan');
  px.rect(0, 14, 16, 2, 'night');
  return px;
}

function fountain(): Px {
  const px = new Px(32);
  px.ellipse(16, 17.5, 15.5, 13.5, 'ink').ellipse(16, 17, 15, 13, 'slate').ellipse(16, 17.5, 13.5, 11.5, 'night');
  px.ellipse(16, 18, 12, 10, 'teal1').ellipse(16, 18, 9.5, 7.5, 'cyan').ellipse(16, 18, 7, 5.5, 'teal1').ellipse(16, 18, 4.5, 3.5, 'cyan');
  px.rect(14, 10, 4, 7, 'sky').rect(15, 6, 2, 4, 'white');
  dots(px, [[12, 6], [19, 6], [10, 9], [21, 9], [16, 4], [13, 8], [18, 8]], 'sky');
  dots(px, [[6, 16], [26, 16], [9, 24], [23, 24], [16, 27]], 'white');
  rects(px, [[3, 14, 2, 1], [27, 14, 2, 1]], 'mist');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 10, 8, 5, 'night').rect(3, 9, 10, 2, 'dusk').rect(4, 14, 8, 1, 'ink').rect(10, 11, 2, 3, 'shadow');
  const tips: Pt[][] = [[[2, 3], [14, 3], [8, 0], [3, 7], [13, 7]], [[3, 2], [13, 4], [7, 0], [2, 6], [14, 7]], [[2, 4], [14, 2], [9, 0], [4, 7], [13, 6]], [[3, 3], [13, 2], [8, 1], [2, 7], [14, 6]]];
  leaves(px, 8, 9, tips[c.v] as Pt[], 'pine2', 'pine3');
  dots(px, [[3, 4], [12, 3], [8, 2], [5, 7], [11, 6], [4, 8]], 'yellow');
  dots(px, [[7, 4], [13, 6]], 'pink');
  return px;
}

function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 4, r - l, 3, 'slate').rect(l, 4, r - l, 1, 'mist');
  px.rect(l, 7, r - l, 8, 'night');
  px.rect(l, 8, r - l, 1, 'pink').rect(l, 14, r - l, 1, 'pink');
  if (!c.kW) px.rect(l, 8, 1, 7, 'pink');
  if (!c.kE) px.rect(r - 1, 8, 1, 7, 'pink');
  if (c.tx === 2) {
    px.ellipse(8, 10, 2.5, 1.6, 'pink').rect(6, 12, 5, 1, 'amber');
    px.line(6, 12, 8, 14, 'amber').line(10, 12, 8, 14, 'amber');
    dots(px, [[7, 9]], 'white');
  }
  return px;
}

const goo = (c: MC): Px => gooTile(c, { body: 'purple', rim: 'ink', hi: 'magenta', spec: 'cyan', seed: 4.1 });

export const NEON_MALL: MallSet = { floor, band, cap, wall, shop, shut, glass, fountain, planter, scoops, goo };
