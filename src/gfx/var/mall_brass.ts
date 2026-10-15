// Mall look 4, "Brass", after closing: an old fashioned arcade of dark mahogany and brass, a hotel lobby gone quiet. Parquet floors with
// a brass inlay, coffered beams along the top, wood paneled walls with a brass rail, shop windows that stay warm and lit under an amber
// script sign, scissor gates over the shut shops, a tiered brass fountain, a barrel with a fig tree. The reds are the colors the night
// art leaves alone, so the wood stays warm while the blues go dark. See mall_kit.ts.
import { Px } from '../px.ts';
import type { MC, MallSet } from './mall_kit.ts';
import { dots, leaves, rects, shade, gooTile } from './mall_paint.ts';
import type { Pt } from './mall_paint.ts';

function floor(c: MC): Px {
  const px = new Px(16).fill('soil1');
  for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
    const x0 = qx * 8, y0 = qy * 8, horiz = (qx + qy + c.v) % 2 === 0;
    for (let k = 0; k < 8; k += 2) {
      if (horiz) px.rect(x0, y0 + k, 8, 1, k % 4 ? 'blood0' : 'soil2'); else px.rect(x0 + k, y0, 1, 8, k % 4 ? 'blood0' : 'soil2');
    }
  }
  px.rect(0, 0, 16, 1, 'ink').rect(0, 8, 16, 1, 'ink').rect(0, 0, 1, 16, 'ink').rect(8, 0, 1, 16, 'ink');
  shade(px, c, 'ink', 'ink');
  return px;
}

function band(c: MC): Px {
  const px = floor({ ...c, sN: false, sW: false });
  px.rect(0, 5, 16, 6, 'ink').rect(0, 5, 16, 1, 'amber').rect(0, 10, 16, 1, 'amber');
  for (const x of [2, 8, 14]) dots(px, [[x, 7], [x - 1, 8], [x, 8], [x + 1, 8], [x, 9]], 'orange');
  dots(px, [[5, 8], [11, 8]], 'yellow');
  return px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(1, 1, 14, 6, 'soil1').frame(1, 1, 14, 6, 'soil2').rect(1, 9, 14, 4, 'soil1').frame(1, 9, 14, 4, 'soil2');
  dots(px, [[8, 4], [4, 11], [12, 11]], 'sand');
  if (c.lipS) px.rect(0, 13, 16, 1, 'soil2').rect(0, 14, 16, 1, 'sand').rect(0, 15, 16, 1, 'ink');
  return px;
}

function wall(c: MC): Px {
  const px = new Px(16).fill('soil1');
  px.rect(0, 0, 16, 2, 'ink').rect(0, 2, 16, 1, 'sand');
  for (const x of [1, 9]) { px.rect(x, 4, 6, 9, 'blood0').frame(x, 4, 6, 9, 'ink'); px.rect(x + 1, 5, 4, 1, 'soil2').set(x + 5, 12, 'soil2'); }
  px.rect(0, 13, 16, 3, 'ink');
  dots(px, [[0, 3], [15, 3], [8, 3], [7, 8 + (c.v & 1)]], 'amber');
  return px;
}

function shop(c: MC): Px {
  const px = new Px(16).fill('soil1');
  px.rect(0, 0, 16, 6, 'ink');
  px.rect(0, 0, 16, 1, 'soil2');
  const y = [3, 2, 3, 2][c.v] as number;
  for (let x = 2; x < 14; x++) px.set(x, y + Math.round(1.2 * Math.sin(x * 0.8 + c.v)), 'orange');
  px.rect(3, 5, 10, 1, 'yellow');
  px.rect(1, 6, 14, 8, 'soil2').rect(2, 7, 12, 6, 'yellow');
  px.rect(2, 7, 12, 1, 'orange').rect(2, 10, 12, 1, 'orange');
  dots(px, [[4, 8], [5, 8], [8, 8], [11, 9], [12, 9], [4, 12], [8, 12], [9, 12], [12, 12]], 'cream');
  dots(px, [[6, 11], [10, 11]], 'red');
  px.rect(0, 14, 16, 2, 'ink').rect(0, 14, 16, 1, 'sand');
  return px;
}

function shut(c: MC): Px {
  const px = new Px(16).fill('night');
  px.rect(0, 0, 16, 5, 'ink').frame(0, 0, 16, 5, 'blood0');
  for (let x = 2; x < 14; x++) px.set(x, 2 + Math.round(Math.sin(x * 0.8 + c.v)), 'blood1');
  for (const y0 of [6, 10]) for (let x = 0; x < 16; x++) {
    const t = x % 8 < 4 ? x % 8 : 8 - (x % 8);
    px.set(x, y0 + t, 'sand').set(x, y0 + 4 - t, 'sand');
  }
  px.rect(0, 14, 16, 2, 'ink').rect(0, 14, 16, 1, 'sand').rect(7, 12, 2, 2, 'amber');
  return px;
}

function glass(): Px {
  const px = new Px(16).fill('soil1');
  px.rect(0, 0, 16, 5, 'blood0').ellipse(8, 5, 6, 4, 'amber').ellipse(8, 5, 4, 2.5, 'orange').rect(0, 5, 16, 1, 'blood1');
  rects(px, [[7, 1, 1, 4]], 'soil1');
  px.rect(1, 6, 6, 8, 'ink').rect(9, 6, 6, 8, 'ink').frame(1, 6, 6, 8, 'soil2').frame(9, 6, 6, 8, 'soil2');
  px.line(2, 12, 4, 8, 'dusk').line(10, 12, 12, 8, 'dusk');
  px.rect(6, 9, 1, 3, 'amber').rect(9, 9, 1, 3, 'amber');
  px.rect(0, 14, 16, 2, 'ink').rect(0, 14, 16, 1, 'sand');
  return px;
}

function fountain(): Px {
  const px = new Px(32);
  px.ellipse(16, 17.5, 15.5, 13.5, 'ink').ellipse(16, 17, 15, 13, 'soil3').ellipse(16, 17, 13.5, 11.5, 'sand').ellipse(16, 17.5, 12, 10, 'blue');
  px.ellipse(16, 18, 9, 7, 'dusk').ellipse(16, 18, 8, 6, 'blue');
  px.ellipse(16, 17, 5.5, 4, 'sand').ellipse(16, 17, 4.5, 3, 'amber').ellipse(16, 17, 3, 1.8, 'blue');
  px.rect(15, 8, 2, 8, 'sand').rect(14, 7, 4, 1, 'amber');
  dots(px, [[12, 5], [19, 5], [10, 8], [21, 8], [16, 4], [13, 7], [18, 7]], 'cream');
  dots(px, [[7, 17], [25, 17], [10, 24], [22, 24]], 'yellow');
  dots(px, [[4, 14], [27, 14], [8, 9]], 'amber');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 8, 8, 7, 'soil2').rect(3, 9, 10, 5, 'soil2').rect(5, 8, 1, 7, 'soil1').rect(8, 8, 1, 7, 'soil1').rect(11, 9, 1, 5, 'soil1');
  px.rect(3, 10, 10, 1, 'sand').rect(3, 13, 10, 1, 'sand').rect(4, 7, 8, 1, 'sand');
  const tips: Pt[][] = [[[3, 1], [13, 1], [8, 0], [5, 3], [11, 3]], [[2, 2], [12, 0], [7, 0], [4, 1], [14, 3]], [[4, 0], [14, 2], [9, 0], [2, 3], [10, 1]], [[3, 2], [13, 2], [8, 1], [6, 0], [12, 3]]];
  leaves(px, 8, 7, tips[c.v] as Pt[], 'pine2', 'pine3');
  leaves(px, 8, 7, [[6, 3], [10, 3]], 'pine3', 'leaf');
  return px;
}

function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 4, r - l, 3, 'blood0').rect(l, 4, r - l, 1, 'sand');
  px.rect(l, 7, r - l, 8, 'soil2');
  for (let x = l + 2; x < r; x += 4) px.rect(x, 8, 1, 6, 'soil1');
  px.rect(l, 7, r - l, 1, 'orange').rect(l, 14, r - l, 1, 'orange');
  if (!c.kW) px.rect(l, 7, 1, 8, 'orange');
  if (!c.kE) px.rect(r - 1, 7, 1, 8, 'orange');
  if (c.tx === 2) {
    px.ellipse(8, 9.5, 2.5, 1.6, 'pink').rect(6, 11, 5, 1, 'amber');
    px.line(6, 11, 8, 13, 'amber').line(10, 11, 8, 13, 'amber');
    dots(px, [[7, 8]], 'white');
  }
  return px;
}

const goo = (c: MC): Px => gooTile(c, { body: 'mist', rim: 'ink', hi: 'bone', spec: 'pink', seed: 5.7 });

export const BRASS_MALL: MallSet = { floor, band, cap, wall, shop, shut, glass, fountain, planter, scoops, goo };
