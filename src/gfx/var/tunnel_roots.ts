// Tunnel look 1, "Roots": a dug earth tunnel held up by roots. Dark soil floor with clods, a ceiling of braided roots, a wall
// face of roots hanging in curtains, red veins. Painted in soil browns and the Upside Down's reds. See tunnel_kit.ts.
import { Px } from '../px.ts';
import type { Look, TC } from './tunnel_kit.ts';
import { curve, dots, fissure, mound, rects, shade, strand, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

const RED: Glow = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'pink' };

const CLODS: [number, number, number, number][][] = [
  [[2, 4, 4, 2], [9, 8, 5, 2], [3, 12, 6, 2]], [[10, 3, 4, 2], [2, 9, 5, 2], [8, 12, 5, 2]],
  [[1, 6, 5, 2], [8, 3, 4, 2], [10, 11, 4, 2]], [[6, 4, 5, 2], [1, 11, 4, 2], [11, 8, 4, 2]],
];
const CHIPS: Pt[][] = [[[2, 3], [10, 7], [4, 11]], [[11, 2], [3, 8], [9, 11]], [[1, 5], [9, 2], [11, 10]], [[7, 3], [2, 10], [12, 7]]];

function dirt(c: TC): Px {
  const px = new Px(16).fill('soil1');
  rects(px, CLODS[c.v] as [number, number, number, number][], 'soil0');
  dots(px, CHIPS[c.v] as Pt[], 'soil2');
  return px;
}

function floor(c: TC): Px {
  const px = dirt(c);
  shade(px, c, 'soil0');
  return px;
}

function cap(c: TC): Px {
  const px = new Px(16).fill('soil1');
  [1, 6, 11].forEach((y, i) => strand(px, y + 1, 1.5 - (i & 1) * 0.5, c.v * 4 + i * 7, ['soil3', 'soil2', 'soil1'], 3));
  if (c.faceS) px.rect(0, 14, 16, 1, 'sand').rect(0, 15, 16, 1, 'soil0');
  if (!c.sN) px.rect(0, 0, 16, 1, 'sand');
  if (!c.sW) px.rect(0, 0, 1, 16, 'sand');
  if (!c.sE) px.rect(15, 0, 1, 16, 'soil0');
  return px;
}

function wall(c: TC): Px {
  const px = new Px(16).fill('soil1');
  for (let i = 0; i < 4; i++) {
    const x0 = 1 + i * 4, kink = 5 + ((c.v + i * 3) % 6);
    for (let y = 2; y < 15; y++) {
      const x = x0 + (y >= kink ? 1 : 0), tip = y > 12;
      px.set(x - 1, y, 'soil0').set(x, y, tip ? 'soil3' : 'sand').set(x + 1, y, 'soil3').set(x + 2, y, tip ? 'soil1' : 'soil2');
    }
    px.set(x0 + 1, kink - 1, 'soil2').set(x0 + 2, kink + 2, 'soil0');
  }
  px.rect(0, 0, 16, 2, 'soil0').rect(0, 15, 16, 1, 'soil0');
  return px;
}

function roots(c: TC): Px {
  const px = dirt(c);
  curve(px, c.v, ['sand', 'soil3', 'soil2']);
  shade(px, c, 'soil0');
  return px;
}

const VEINS: Pt[][][] = [
  [[[0, 8], [4, 6], [8, 9], [12, 7], [15, 8]], [[8, 9], [9, 13], [8, 15]]],
  [[[0, 8], [5, 10], [9, 7], [15, 8]], [[9, 7], [12, 3], [15, 1]]],
  [[[0, 8], [6, 8], [8, 5], [8, 0]], [[6, 8], [9, 12], [15, 12]], [[8, 5], [13, 5], [15, 8]]],
  [[[0, 8], [7, 7], [9, 10], [15, 8]], [[7, 7], [6, 3], [8, 0]]],
];

function veins(c: TC, phase: number): Px {
  const px = dirt(c);
  for (const path of VEINS[c.v] as Pt[][]) vein(px, path, phase, RED);
  shade(px, c, 'soil0');
  return px;
}

const PODS: Pt[][] = [[[4, 4], [11, 5], [7, 11]], [[5, 5], [11, 9], [4, 12]], [[8, 4], [4, 9], [12, 12]], [[11, 4], [5, 8], [10, 12]]];

function nest(c: TC): Px {
  const m = new Px(16).fill('blood0');
  for (let y = 2; y < 16; y += 5) m.line(0, y + (c.v & 1), 15, y + 2 - (c.v & 1), 'blood1');
  for (const [x, y] of PODS[c.v] as Pt[]) {
    m.ellipse(x, y + 0.6, 3.2, 3.6, 'ink').ellipse(x, y, 3, 3.4, 'blood1').ellipse(x - 0.8, y - 1, 1.3, 1.5, 'rose').set(x - 1, y - 2, 'pink');
  }
  m.line(0, 14, 7, 9, 'soil3').line(7, 9, 15, 15, 'soil3').line(0, 15, 7, 10, 'soil2');
  return mound(floor(c), m, c);
}

function gap(): Px {
  const px = new Px(16, 32);
  const L = [0, 1, 1, 0, -1, 0, 1, 0], R = [0, -1, 0, 1, 1, 0, -1, 0];
  for (let y = 0; y < 32; y++) {
    const l = 4 + (L[y & 7] as number), r = 11 + (R[(y + 3) & 7] as number);
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'sand').set(l - 2, y, 'soil3').set(l - 3, y, 'soil1').set(r + 1, y, 'soil3').set(r + 2, y, 'soil2').set(r + 3, y, 'soil0');
  }
  for (const [y, side] of [[3, 0], [9, 1], [15, 0], [21, 1], [27, 0]] as [number, number][]) {
    const x = side ? 11 : 4, dx = side ? -1 : 1;
    for (let k = 0; k < 4; k++) px.set(x + dx * k, y + (k >> 1), k === 3 ? 'sand' : 'soil3').set(x + dx * k, y + (k >> 1) + 1, 'soil1');
  }
  return px;
}

function crack(): Px {
  const px = new Px(32, 16);
  const f = { tx: 13, ty: 4, sN: true, sS: false, sE: true, sW: true, faceS: false, rockS: false };
  px.blit(wall({ ...f, v: 1 }), 0, 0).blit(wall({ ...f, v: 2 }), 16, 0);
  fissure(px, { hi: 'sand', lo: 'soil0', glow: 'hot', chip: 'soil3', chipHi: 'sand' });
  return px;
}

export const ROOTS: Look = {
  slug: 'roots', name: 'Roots', glow: [255, 120, 100],
  note: 'A dug earth tunnel held up by roots: braided roots overhead, curtains of them on the wall face, red veins in the dirt. The warmest and most natural of the five.',
  floor, cap, wall, roots, veins, nest, gap, crack,
};
