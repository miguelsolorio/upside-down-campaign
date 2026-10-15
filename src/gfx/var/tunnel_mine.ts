// Tunnel look 4, "Mine": the tunnels as someone dug and shored them. Packed dirt with cart ruts, a ceiling of nailed planks,
// a wall face of boards between timber posts, ore glowing amber in the seams, husks of pods in the nest. The one made by hands,
// so it is the most orderly. Painted in soil and sand. See tunnel_kit.ts.
import { Px } from '../px.ts';
import type { Look, TC } from './tunnel_kit.ts';
import { POD_SPOTS, VEIN_PATHS, curve, dots, fissure, mound, shade, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

const ORE: Glow = { halo: 'soil0', base: 'orange', mid: 'amber', bright: 'yellow' };
const PEBBLES: Pt[][] = [[[3, 8], [11, 2], [8, 14]], [[12, 7], [2, 3], [6, 14]], [[5, 7], [13, 13], [9, 2]], [[9, 8], [2, 13], [13, 3]]];

function dirt(c: TC): Px {
  const px = new Px(16).fill('soil1');
  const y = [4, 3, 5, 4][c.v] as number, y2 = [11, 10, 12, 10][c.v] as number;
  for (const r of [y, y2]) px.rect(0, r - 1, 16, 1, 'soil2').rect(0, r, 16, 2, 'soil0');
  for (const [x, yy] of PEBBLES[c.v] as Pt[]) px.rect(x, yy, 2, 1, 'soil3').set(x, yy + 1, 'soil0');
  return px;
}

function floor(c: TC): Px {
  const px = dirt(c);
  shade(px, c, 'soil0');
  return px;
}

function cap(c: TC): Px {
  const px = new Px(16).fill('soil0');
  [0, 5, 10].forEach((y, i) => {
    px.rect(0, y, 16, 5, 'soil3').rect(0, y, 16, 1, 'sand').rect(0, y + 4, 16, 1, 'soil1');
    const jx = (c.v * 5 + i * 6) % 14 + 1;
    px.rect(jx, y, 1, 5, 'soil0').set(jx + 2, y + 2, 'sand').set(jx - 2, y + 2, 'sand');
  });
  px.rect(0, 15, 16, 1, 'soil0');
  if (c.faceS) px.rect(0, 13, 16, 2, 'sand').rect(0, 15, 16, 1, 'soil0');
  if (!c.sN) px.rect(0, 0, 16, 1, 'sand');
  if (!c.sW) px.rect(0, 0, 1, 16, 'sand');
  return px;
}

function wall(c: TC): Px {
  const px = new Px(16).fill('soil0');
  [2, 6, 10].forEach((y, i) => {
    px.rect(0, y, 16, 3, 'soil2').rect(0, y, 16, 1, 'soil3').rect(0, y + 2, 16, 1, 'soil1');
    px.rect((c.v * 5 + i * 7) % 15 + 1, y, 1, 3, 'soil0');
  });
  px.rect(0, 14, 16, 2, 'soil0');
  const left = (c.tx & 1) === 0, x0 = left ? 0 : 13;
  px.rect(x0, 2, 3, 13, 'soil3').rect(x0, 2, 1, 13, 'sand').rect(x0 + 2, 2, 1, 13, 'soil1').set(x0 + 1, 7, 'soil1').set(x0 + 1, 11, 'soil1');
  px.rect(0, 0, 16, 2, 'soil3').rect(0, 0, 16, 1, 'sand').rect(0, 1, 16, 1, 'soil1');
  return px;
}

function roots(c: TC): Px {
  const px = dirt(c);
  curve(px, c.v, ['sand', 'soil3', 'soil2']);
  shade(px, c, 'soil0');
  return px;
}

function veins(c: TC, phase: number): Px {
  const px = dirt(c);
  for (const path of VEIN_PATHS[c.v] as Pt[][]) vein(px, path, phase, ORE);
  dots(px, [[VEIN_PATHS[c.v]?.[0]?.[2] ?? [8, 8]][0] as Pt], 'yellow');
  shade(px, c, 'soil0');
  return px;
}

function nest(c: TC): Px {
  const m = new Px(16).fill('soil2');
  for (let y = 3; y < 16; y += 5) m.line(0, y + (c.v & 1), 15, y + 2 - (c.v & 1), 'soil3').line(0, y + 1 + (c.v & 1), 15, y + 3 - (c.v & 1), 'soil0');
  for (const [x, y] of POD_SPOTS[c.v] as Pt[]) {
    m.ellipse(x, y + 0.6, 3.2, 3.8, 'ink').ellipse(x, y, 3, 3.6, 'soil3').ellipse(x - 0.8, y - 1, 1.4, 1.6, 'sand');
    m.line(x + 1, y - 2, x, y + 1, 'orange').set(x, y + 1, 'amber').set(x + 1, y + 2, 'orange');
  }
  return mound(floor(c), m, c);
}

function gap(): Px {
  const px = new Px(16, 32);
  const L = [0, 0, 1, 0, -1, 0, 0, 1], R = [0, -1, 0, 0, 1, 0, -1, 0];
  for (let y = 0; y < 32; y++) {
    const l = 4 + (L[y & 7] as number), r = 11 + (R[(y + 2) & 7] as number);
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'sand').set(l - 2, y, 'soil3').set(l - 3, y, 'soil2').set(r + 1, y, 'soil3').set(r + 2, y, 'soil2').set(r + 3, y, 'soil1');
  }
  for (const [y, side] of [[7, 0], [14, 1], [21, 0]] as [number, number][]) {
    const x = side ? 11 : 4, dx = side ? -1 : 1;
    for (let k = 0; k < 4 + (y & 1); k++) px.set(x + dx * k, y, 'soil3').set(x + dx * k, y + 1, 'soil1').set(x + dx * k, y - 1, k % 2 ? 'soil3' : 'sand');
    px.set(x + dx * 5, y + 2, 'soil3');
  }
  return px;
}

function crack(): Px {
  const px = new Px(32, 16);
  const f = { tx: 13, ty: 4, sN: true, sS: false, sE: true, sW: true, faceS: false, rockS: false };
  px.blit(wall({ ...f, v: 1 }), 0, 0).blit(wall({ ...f, v: 2 }), 16, 0);
  fissure(px, { hi: 'sand', lo: 'soil1', glow: 'amber', chip: 'soil3', chipHi: 'sand' });
  return px;
}

export const MINE: Look = {
  slug: 'mine', name: 'Mine', glow: [255, 180, 80],
  note: 'A tunnel somebody shored up: planks overhead, boards between timber posts, cart ruts in the dirt, ore glowing amber, husks for pods. The most orderly, and the only one with straight lines.',
  floor, cap, wall, roots, veins, nest, gap, crack,
};
