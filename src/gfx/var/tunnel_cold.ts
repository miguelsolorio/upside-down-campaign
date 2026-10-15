// Tunnel look 2, "Cold": cut stone gone blue and wet. Flagstone floor, boulders for a ceiling, stacked blocks for the wall
// face with moss running down, cyan veins in the cracks. Painted in grey, slate and teal, which the night palette turns to
// deep blue, so the cyan glow is the only bright thing. See tunnel_kit.ts.
import { Px } from '../px.ts';
import type { Look, TC } from './tunnel_kit.ts';
import { curve, dots, fissure, mound, shade, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

const CYAN: Glow = { halo: 'teal0', base: 'teal1', mid: 'cyan', bright: 'white' };

const ROWS: number[][][] = [[[0, 8], [0, 8]], [[0, 5, 11], [3, 9, 14]], [[0, 10], [0, 4, 9, 13]], [[0, 6, 12], [0, 8]]];

/** Flagstones in two courses, a bevel on the lit sides and a joint all round. */
function slabs(px: Px, v: number, face: 'shadow' | 'dusk', hi: 'dusk' | 'slate', joint: 'night' | 'ink'): void {
  px.fill(joint);
  (ROWS[v & 3] as number[][]).forEach((xs, r) => {
    xs.forEach((x0, i) => {
      const x1 = (xs[i + 1] ?? 16 + (xs[0] as number)) - 1, y0 = r * 8;
      for (let x = Math.max(0, x0 + 1); x <= Math.min(15, x1 - 1); x++) for (let y = y0 + 1; y < y0 + 8; y++) px.set(x, y, face);
      px.rect(Math.max(0, x0 + 1), y0 + 1, Math.max(0, Math.min(15, x1 - 1) - Math.max(0, x0 + 1) + 1), 1, hi);
      px.rect(Math.max(0, x0 + 1), y0 + 1, 1, 6, hi);
    });
  });
}

function floor(c: TC): Px {
  const px = new Px(16);
  slabs(px, c.v, 'shadow', 'dusk', 'night');
  dots(px, [([[3, 6], [12, 2], [6, 13], [10, 10]] as Pt[])[c.v] as Pt], 'teal1');
  px.rect(((c.v * 5) % 10) + 2, 6 + (c.v & 1) * 8, 3, 1, 'teal0');
  shade(px, c, 'night');
  return px;
}

const BOULDERS: Pt[][] = [[[4, 4], [12, 5], [8, 12]], [[5, 5], [12, 10], [4, 12]], [[8, 4], [3, 9], [12, 12]], [[11, 4], [4, 8], [10, 12]]];

function cap(c: TC): Px {
  const px = new Px(16).fill('night');
  for (const [x, y] of BOULDERS[c.v] as Pt[]) {
    px.ellipse(x + 0.5, y + 0.8, 5, 4, 'ink').ellipse(x, y, 4.8, 3.8, 'shadow').ellipse(x - 0.6, y - 0.6, 3.6, 2.8, 'dusk').ellipse(x - 1.6, y - 1.4, 1.6, 1.1, 'slate');
  }
  if (c.faceS) px.rect(0, 14, 16, 1, 'mist').rect(0, 15, 16, 1, 'night');
  if (!c.sN) px.rect(0, 0, 16, 1, 'slate');
  if (!c.sW) px.rect(0, 0, 1, 16, 'slate');
  return px;
}

function wall(c: TC): Px {
  const px = new Px(16).fill('dusk');
  for (let r = 0; r < 3; r++) {
    const y = 2 + r * 4, off = (c.v + r * 2) % 3 * 3 + (r & 1) * 4;
    px.rect(0, y, 16, 1, 'mist').rect(0, y + 3, 16, 1, 'shadow');
    for (const x of [off % 8, (off % 8) + 8]) px.rect(x, y, 1, 4, 'night');
    px.rect(((off + 3) % 8) + 2, y + 1, 2, 1, 'slate');
  }
  px.rect(0, 0, 16, 2, 'night').rect(0, 14, 16, 2, 'night');
  for (const x of [(c.v * 4 + 2) % 14 + 1, (c.v * 5 + 9) % 14 + 1]) { px.set(x, 8, 'teal1').set(x, 9, 'teal1').set(x, 10, 'teal0').set(x, 11, 'teal1').set(x, 12, 'teal1').set(x, 13, 'teal0'); }
  return px;
}

function roots(c: TC): Px {
  const px = new Px(16);
  slabs(px, c.v, 'shadow', 'dusk', 'night');
  curve(px, c.v, ['bone', 'mist', 'slate']);
  shade(px, c, 'night');
  return px;
}

const VEINS: Pt[][][] = [
  [[[0, 8], [3, 8], [6, 12], [10, 12], [15, 8]], [[6, 12], [5, 15]]],
  [[[0, 8], [5, 4], [9, 4], [10, 8], [15, 8]], [[10, 8], [12, 12], [15, 13]]],
  [[[0, 8], [5, 9], [8, 6], [8, 0]], [[5, 9], [9, 13], [15, 12]], [[8, 6], [12, 7], [15, 8]]],
  [[[0, 8], [4, 5], [8, 8], [12, 9], [15, 8]], [[8, 8], [8, 12], [10, 15]]],
];

function veins(c: TC, phase: number): Px {
  const px = new Px(16);
  slabs(px, c.v, 'shadow', 'dusk', 'night');
  for (const path of VEINS[c.v] as Pt[][]) vein(px, path, phase, CYAN);
  shade(px, c, 'night');
  return px;
}

const PODS: Pt[][] = [[[4, 5], [11, 5], [7, 11]], [[5, 4], [11, 9], [4, 12]], [[8, 4], [4, 9], [12, 12]], [[11, 4], [5, 8], [10, 12]]];

function nest(c: TC): Px {
  const m = new Px(16).fill('teal0');
  for (let y = 3; y < 16; y += 5) m.line(0, y + (c.v & 1), 15, y + 1, 'teal1');
  for (const [x, y] of PODS[c.v] as Pt[]) {
    m.ellipse(x, y + 0.6, 3.4, 3.6, 'ink').ellipse(x, y, 3.2, 3.4, 'blue').ellipse(x - 0.5, y - 0.8, 2, 2.2, 'sky').set(x - 1, y - 2, 'white').set(x + 1, y + 1, 'cyan');
  }
  return mound(floor(c), m, c);
}

function gap(): Px {
  const px = new Px(16, 32);
  const L = [0, 0, 1, 1, 0, -1, 0, 0], R = [0, -1, -1, 0, 0, 1, 1, 0];
  for (let y = 0; y < 32; y++) {
    const l = 4 + (L[y & 7] as number), r = 11 + (R[(y + 5) & 7] as number);
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'mist').set(l - 2, y, 'slate').set(l - 3, y, 'dusk').set(r + 1, y, 'slate').set(r + 2, y, 'dusk').set(r + 3, y, 'shadow');
  }
  for (const [y, side] of [[2, 0], [10, 1], [17, 0], [25, 1]] as [number, number][]) {
    const x = side ? 11 : 4, dx = side ? -1 : 1;
    px.set(x, y, 'teal1').set(x, y + 1, 'teal1').set(x, y + 2, 'teal0').set(x + dx, y + 1, 'teal0');
  }
  px.rect(1, 12, 2, 2, 'mist').rect(13, 20, 2, 2, 'slate');
  return px;
}

function crack(): Px {
  const px = new Px(32, 16);
  const f = { tx: 13, ty: 4, sN: true, sS: false, sE: true, sW: true, faceS: false, rockS: false };
  px.blit(wall({ ...f, v: 1 }), 0, 0).blit(wall({ ...f, v: 2 }), 16, 0);
  fissure(px, { hi: 'mist', lo: 'night', glow: 'cyan', chip: 'slate', chipHi: 'mist' });
  return px;
}

export const COLD: Look = {
  slug: 'cold', name: 'Cold', glow: [100, 200, 240],
  note: 'Cut stone gone blue and wet: flagstones, boulders overhead, a wall of stacked blocks with moss running down, cyan light in the cracks. The calmest and the most readable.',
  floor, cap, wall, roots, veins, nest, gap, crack,
};
