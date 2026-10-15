// Tunnel look 5, "Hive": every surface is a honeycomb of cells, as if the tunnels were grown and not dug. Dark plates underfoot,
// near black cells for the ceiling, bright purple cells on the wall face, magenta veins, pods in cups. The most alien. Painted
// in the purples the night palette leaves bright. See tunnel_kit.ts.
import { Px } from '../px.ts';
import type { Look, TC } from './tunnel_kit.ts';
import { POD_SPOTS, VEIN_PATHS, curve, fissure, hexes, mound, shade, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

const MAGENTA: Glow = { halo: 'purple0', base: 'purple', mid: 'magenta', bright: 'pink' };

function plates(c: TC): Px {
  const px = new Px(16);
  hexes(px, c, 'purple0', 'ink', 'purple');
  return px;
}

function floor(c: TC): Px {
  const px = plates(c);
  shade(px, c, 'ink');
  return px;
}

function cap(c: TC): Px {
  const px = new Px(16);
  hexes(px, c, 'ink', 'purple0', 'purple0');
  if (c.faceS) px.rect(0, 14, 16, 1, 'purple').rect(0, 15, 16, 1, 'ink');
  if (!c.sN) px.rect(0, 0, 16, 1, 'purple');
  if (!c.sW) px.rect(0, 0, 1, 16, 'purple');
  return px;
}

function wall(c: TC): Px {
  const px = new Px(16);
  hexes(px, { ...c, ty: c.ty * 2 }, 'purple', 'purple0', 'magenta');
  px.rect(0, 0, 16, 2, 'ink').rect(0, 14, 16, 2, 'ink');
  return px;
}

function roots(c: TC): Px {
  const px = plates(c);
  curve(px, c.v, ['pink', 'purple', 'purple0']);
  shade(px, c, 'ink');
  return px;
}

function veins(c: TC, phase: number): Px {
  const px = plates(c);
  for (const path of VEIN_PATHS[c.v] as Pt[][]) vein(px, path, phase, MAGENTA);
  shade(px, c, 'ink');
  return px;
}

function nest(c: TC): Px {
  const m = new Px(16);
  hexes(m, c, 'purple0', 'ink', 'purple');
  for (const [x, y] of POD_SPOTS[c.v] as Pt[]) {
    m.ellipse(x, y + 0.6, 3.8, 3.8, 'ink').ellipse(x, y, 3.6, 3.6, 'purple').ellipse(x, y - 0.4, 2.8, 2.8, 'rose').ellipse(x - 0.8, y - 1, 1.2, 1.4, 'pink').set(x - 1, y - 2, 'white').set(x + 1, y + 1, 'magenta');
  }
  return mound(floor(c), m, c);
}

function gap(): Px {
  const px = new Px(16, 32);
  const L = [0, 0, 2, 2, 0, 0, -2, -2], R = [0, 0, -2, -2, 0, 0, 2, 2];
  for (let y = 0; y < 32; y++) {
    const l = 5 + (L[(y >> 1) & 7] as number) / 2, r = 10 + (R[((y >> 1) + 3) & 7] as number) / 2;
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'magenta').set(l - 2, y, 'purple').set(l - 3, y, 'purple0').set(l - 4, y, 'purple').set(r + 1, y, 'magenta').set(r + 2, y, 'purple').set(r + 3, y, 'purple0').set(r + 4, y, 'ink');
  }
  px.rect(1, 6, 2, 1, 'ink').rect(13, 18, 2, 1, 'ink').rect(0, 25, 2, 1, 'ink');
  return px;
}

function crack(): Px {
  const px = new Px(32, 16);
  const f = { tx: 13, ty: 4, sN: true, sS: false, sE: true, sW: true, faceS: false, rockS: false };
  px.blit(wall({ ...f, v: 1 }), 0, 0).blit(wall({ ...f, v: 2 }), 16, 0);
  fissure(px, { hi: 'pink', lo: 'purple0', glow: 'magenta', chip: 'purple', chipHi: 'magenta' });
  return px;
}

export const HIVE: Look = {
  slug: 'hive', name: 'Hive', glow: [255, 110, 230],
  note: 'Honeycomb everywhere, as if the tunnels were grown: dark plates underfoot, black cells overhead, bright purple cells on the wall face, magenta veins, pods in cups. The most alien.',
  floor, cap, wall, roots, veins, nest, gap, crack,
};
