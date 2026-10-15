// Tunnel look 3, "Gut": the Upside Down as the inside of something alive. Wet dark floor with folds, ceiling of fat rolls of
// tissue, a wall face of ribbed pleats, sinew for roots, yellow veins, eggs in the nest. Painted in the reds and pinks that the
// night palette leaves alone, so it is the brightest of the five. See tunnel_kit.ts.
import { Px } from '../px.ts';
import type { Look, TC } from './tunnel_kit.ts';
import { curve, fissure, mound, shade, strand, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

const YELLOW: Glow = { halo: 'blood1', base: 'orange', mid: 'amber', bright: 'yellow' };

const FOLDS: Pt[][][] = [
  [[[1, 4], [5, 2], [10, 3], [14, 6]], [[2, 11], [7, 13], [13, 11]]], [[[2, 3], [7, 5], [13, 3]], [[1, 10], [5, 12], [11, 13], [15, 10]]],
  [[[0, 6], [5, 4], [9, 6], [14, 4]], [[3, 13], [8, 11], [14, 13]]], [[[2, 2], [8, 4], [14, 2]], [[0, 9], [6, 11], [10, 9], [15, 12]]],
];

function flesh(c: TC): Px {
  const px = new Px(16).fill('blood0');
  for (const path of FOLDS[c.v] as Pt[][]) {
    path.forEach((p, i) => { const q = path[i + 1]; if (q) px.line(p[0], p[1], q[0], q[1], 'blood1'); });
    const mid = path[1] as Pt;
    px.set(mid[0], mid[1] - 1, 'rose').set(mid[0] + 1, mid[1] - 1, 'rose');
  }
  px.set(4 + c.v * 2, 8, 'ink').set(5 + c.v * 2, 8, 'blood1');
  return px;
}

function floor(c: TC): Px {
  const px = flesh(c);
  shade(px, c, 'ink', 'blood0');
  return px;
}

function cap(c: TC): Px {
  const px = new Px(16).fill('blood0');
  [1, 6, 11].forEach((y, i) => {
    strand(px, y + 1, 1.5 - (i & 1) * 0.5, c.v * 4 + i * 7, ['red', 'blood1', 'blood0'], 3);
    for (let x = 2 + ((c.v + i) % 4); x < 16; x += 6) px.set(x, y, 'pink');
  });
  if (c.faceS) px.rect(0, 14, 16, 1, 'rose').rect(0, 15, 16, 1, 'blood0');
  if (!c.sN) px.rect(0, 0, 16, 1, 'rose');
  if (!c.sW) px.rect(0, 0, 1, 16, 'rose');
  return px;
}

function wall(c: TC): Px {
  const px = new Px(16).fill('blood1');
  for (let x0 = 0; x0 < 16; x0 += 4) {
    const wob = ((x0 / 4 + c.v) & 1) as number;
    for (let y = 2; y < 15; y++) {
      px.set(x0, y, 'rose').set(x0 + 1, y, 'red').set(x0 + 2, y, 'blood1').set(x0 + 3, y, 'blood0');
      if (y > 12 - wob * 2) px.set(x0, y, 'red');
    }
    px.set(x0, 4 + ((c.v + x0) % 7), 'pink');
  }
  px.rect(0, 0, 16, 2, 'blood0').rect(0, 15, 16, 1, 'ink');
  return px;
}

function roots(c: TC): Px {
  const px = flesh(c);
  curve(px, c.v, ['pink', 'rose', 'blood1']);
  shade(px, c, 'ink', 'blood0');
  return px;
}

const VEINS: Pt[][][] = [
  [[[0, 8], [4, 5], [8, 9], [12, 6], [15, 8]], [[8, 9], [9, 13], [8, 15]]],
  [[[0, 8], [5, 11], [9, 7], [15, 8]], [[9, 7], [12, 3], [15, 1]]],
  [[[0, 8], [6, 8], [8, 5], [8, 0]], [[6, 8], [9, 12], [15, 12]], [[8, 5], [13, 5], [15, 8]]],
  [[[0, 8], [7, 7], [9, 10], [15, 8]], [[7, 7], [6, 3], [8, 0]]],
];

function veins(c: TC, phase: number): Px {
  const px = flesh(c);
  for (const path of VEINS[c.v] as Pt[][]) vein(px, path, phase, YELLOW);
  shade(px, c, 'ink', 'blood0');
  return px;
}

const EGGS: Pt[][] = [[[4, 5], [11, 5], [7, 11]], [[5, 4], [11, 9], [4, 12]], [[8, 4], [4, 9], [12, 12]], [[11, 4], [5, 8], [10, 12]]];

function nest(c: TC): Px {
  const m = new Px(16).fill('blood1');
  for (let y = 3; y < 16; y += 5) m.line(0, y + (c.v & 1), 15, y + 2 - (c.v & 1), 'red').line(0, y + 1 + (c.v & 1), 15, y + 3 - (c.v & 1), 'blood0');
  for (const [x, y] of EGGS[c.v] as Pt[]) {
    m.ellipse(x, y + 0.6, 3.2, 3.8, 'ink').ellipse(x, y, 3, 3.6, 'cream').ellipse(x + 0.4, y + 0.6, 1.6, 1.8, 'amber').set(x + 1, y + 1, 'orange').set(x - 1, y - 2, 'white');
  }
  return mound(floor(c), m, c);
}

function gap(): Px {
  const px = new Px(16, 32);
  const L = [0, 1, 1, 0, 0, -1, 0, 1], R = [0, -1, 0, 1, 1, 0, -1, 0];
  for (let y = 0; y < 32; y++) {
    const l = 5 + (L[y & 7] as number), r = 10 + (R[(y + 4) & 7] as number);
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'blood0').set(l - 2, y, 'red').set(l - 3, y, 'rose').set(l - 4, y, 'pink').set(r + 1, y, 'blood0').set(r + 2, y, 'blood1').set(r + 3, y, 'red').set(r + 4, y, 'blood1');
  }
  for (const [y, side] of [[5, 0], [14, 1], [23, 0]] as [number, number][]) {
    const x = side ? 10 : 5, dx = side ? -1 : 1;
    px.set(x, y, 'ink').set(x + dx, y, 'ink').set(x, y + 1, 'ink').set(x + dx, y - 1, 'cream').set(x, y - 1, 'cream');
  }
  return px;
}

function crack(): Px {
  const px = new Px(32, 16);
  const f = { tx: 13, ty: 4, sN: true, sS: false, sE: true, sW: true, faceS: false, rockS: false };
  px.blit(wall({ ...f, v: 1 }), 0, 0).blit(wall({ ...f, v: 2 }), 16, 0);
  fissure(px, { hi: 'pink', lo: 'blood0', glow: 'yellow', chip: 'red', chipHi: 'rose' });
  return px;
}

export const GUT: Look = {
  slug: 'gut', name: 'Gut', glow: [255, 170, 120],
  note: 'The inside of something alive: wet dark floor, rolls of tissue overhead, ribbed pleats on the wall, yellow veins, eggs in the nest. The brightest of the five and the closest to the Gate.',
  floor, cap, wall, roots, veins, nest, gap, crack,
};
