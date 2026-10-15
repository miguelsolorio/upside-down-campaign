// Props of levels 5 and 6: the drop (gap), the cracked wall (crack), the Gate (rift) and the low roots of a seal that stands open. Each
// is cached static art, repainted at night like any prop; the rift's flicker is drawn over it from PropView.t alone, so a prop is a pure
// function of its view. The art is built by pure functions that return a Px, so Node can run them.
//
// gap: a black drop across a hall with root lips on both edges, the same in both states (only Max's Skate dash crosses it). It is
//   16 by 32 across a hall that runs east and west and 32 by 16 across one that runs north and south.
// crack: a slab of rock braided with roots and split by a seam of red light; when open, a heap of rubble. It stands in a root tunnel in
//   2.2 and a lab corridor in 2.3, so it is plain rock with a glow and reads on either floor.
// rift: the Gate, 64 by 48: a tear in the wall and the floor, wet lips round a black cleft, red-hot at the edge and burning inside,
//   with veins running out from it and a spill of light on the floor. k 0 is wide open and 1 is shut to a seam.
// seal (a vines prop whose id starts with seal) standing open: nothing, but a few low roots along the edges of its doorway.
import type { PropView } from '../core/types.ts';
import { createRng } from '../core/rng.ts';
import { hash2, rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ArtFn } from './props_lab2.ts';
import { Px } from './px.ts';
import { transposed } from './tile_lab.ts';
import { trace } from './tile_net.ts';
import type { Pt } from './tile_net.ts';

// ---------------------------------------------------------------- gap
/** The drop, 16 wide by 32 tall: a black chasm with ragged edges, lips of earth that step down into it, and root stubs across the lips. */
function dropTall(): Px {
  const px = new Px(16, 32);
  const L = [0, 1, 1, 0, -1, 0, 1, 0], R = [0, -1, 0, 1, 1, 0, -1, 0];
  for (let y = 0; y < 32; y++) {
    const l = 4 + (L[y & 7] as number), r = 11 + (R[(y + 3) & 7] as number);
    px.rect(l, y, r - l + 1, 1, 'black');
    px.set(l - 1, y, 'sand').set(l - 2, y, 'soil3').set(l - 3, y, 'soil1').set(r + 1, y, 'soil3').set(r + 2, y, 'soil2').set(r + 3, y, 'soil0');
    // A glint of the red below, deep in the dark.
    if (hash2(y, 3, 91) % 7 === 0) px.set(l + 2 + (hash2(y, 4, 91) % 3), y, 'blood1');
  }
  for (const [y, side] of [[3, 0], [9, 1], [15, 0], [21, 1], [27, 0]] as [number, number][]) {
    const x = side ? 11 : 4, dx = side ? -1 : 1;
    for (let k = 0; k < 4; k++) px.set(x + dx * k, y + (k >> 1), k === 3 ? 'sand' : 'soil3').set(x + dx * k, y + (k >> 1) + 1, 'soil1');
  }
  return px;
}

/** The drop at its size: tall for a hall that runs east and west, a quarter turn of it for one that runs north and south. */
export function gapArt(w: number, h: number): Px { return h >= w ? dropTall() : transposed(dropTall()); }

// ---------------------------------------------------------------- crack
/** A slab of rock 32 long and 16 thick: strands of roots in bands, dark top and bottom rows. */
function slab(): Px {
  const px = new Px(32, 16).fill('soil1');
  for (let i = 0; i < 3; i++) {
    const base = 3 + i * 4;
    for (let x = 0; x < 32; x++) {
      const y = Math.round(base + 1.2 * Math.sin(x / 4.5 + i * 2));
      px.set(x, y - 1, 'soil3').set(x, y, 'soil2').set(x, y + 1, 'soil2').set(x, y + 2, 'soil1');
    }
  }
  for (const [x, y] of [[4, 6], [26, 9], [20, 3], [8, 12]] as Pt[]) px.set(x, y, 'sand').set(x + 1, y, 'soil3');
  px.rect(0, 0, 32, 1, 'soil0').rect(0, 15, 32, 1, 'soil0').rect(0, 0, 1, 16, 'soil0').rect(31, 0, 1, 16, 'soil0');
  return px;
}

/** The break: a zigzag cleft down the middle that opens wide in the middle with a seam of red light in it, two branches, and chips at its foot. */
function fissure(px: Px): void {
  const zig = [0, 1, 2, 1, 0, -1, -2, -1, 0, 1, 2, 1, 0, -1, -2, -1];
  for (let y = 0; y < 16; y++) {
    const xc = 16 + (zig[y] as number), hw = Math.round(1 + 1.6 * Math.sin((Math.PI * (y + 1)) / 17));
    px.rect(xc - hw, y, hw * 2 + 1, 1, 'black').set(xc - hw - 1, y, 'sand').set(xc + hw + 1, y, 'soil0').set(xc + (y % 4 < 2 ? 0 : 1), y, 'hot');
    if (hw >= 2) px.set(xc, y, 'orange');
  }
  const branches: [Pt[], number][] = [[[[14, 7], [10, 9], [6, 13]], 1], [[[18, 9], [23, 7], [27, 3]], 0]];
  for (const [pts, glowAt] of branches) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i] as Pt, b = pts[i + 1] as Pt;
      px.line(a[0], a[1] - 1, b[0], b[1] - 1, 'sand').line(a[0], a[1] + 1, b[0], b[1] + 1, 'soil0').line(a[0], a[1], b[0], b[1], 'black');
    }
    const q = pts[glowAt] as Pt;
    px.set(q[0], q[1], 'hot');
  }
  px.rect(2, 13, 6, 3, 'soil3').rect(3, 12, 3, 1, 'sand').rect(23, 13, 7, 3, 'soil3').rect(25, 12, 3, 1, 'sand').rect(11, 14, 3, 2, 'soil3').rect(19, 14, 2, 2, 'soil3');
}

/** A heap of broken rock, w by h, for a crack that has been smashed: slabs piled up in the middle with a dark rim round each, and chips thrown out round them. The floor shows between. */
function rubble(w: number, h: number): Px {
  const px = new Px(w, h), r = createRng(w * 31 + h * 7);
  const cx = w / 2, cy = h * 0.6, rx = w * 0.4, ry = Math.max(4, h * 0.26);
  const chunk = (x: number, y: number, sz: number, tone: number): void => {
    px.rect(x - 1, y - 1, sz + 2, sz + 1, 'ink').rect(x, y, sz, sz - 1, tone ? 'soil2' : 'soil3').rect(x, y, sz, 1, 'sand').rect(x, y + sz - 1, sz, 1, 'soil0');
  };
  // The heap, back to front: the ones lower on the screen cover the ones above.
  const heap: [number, number, number, number][] = [];
  for (let i = 0; i < Math.round((w * h) / 40) + 4; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    heap.push([Math.round(cx + Math.cos(a) * rx * d), Math.round(cy + Math.sin(a) * ry * d), 3 + Math.floor(r() * 3 * (1 - d * 0.5)), i & 1]);
  }
  heap.sort((a, b) => a[1] - b[1]);
  for (const [x, y, sz, tone] of heap) chunk(x, y, sz, tone);
  for (let i = 0; i < 8; i++) px.set(Math.round(cx + (r() - 0.5) * w * 0.9), Math.round(cy + (r() - 0.5) * h * 0.9), i & 1 ? 'soil3' : 'bone');
  return px;
}

/** A cracked rock wall across a passage, closed, or the rubble it breaks into. Closed it fills its w by h; a tall one is the wide one turned a quarter. */
export function crackArt(w: number, h: number, open: boolean): Px {
  if (open) return rubble(w, h);
  const px = slab();
  fissure(px);
  return h > w ? transposed(px) : px;
}

// ---------------------------------------------------------------- rift
/** How many steps k is quantized to when the art is built: a closing Gate is cached at eleven widths. */
export const RIFT_STEPS = 10;

const JAG = [0, 1, 0, -1, 1, 0, -1, 0, 1, -1];

/** The rim of a vein, drawn out from a point on the lip across the floor or the wall. */
function tendril(px: Px, from: Pt, to: Pt, bow: number): void {
  const mid: Pt = [(from[0] + to[0]) / 2 + bow, (from[1] + to[1]) / 2 - Math.abs(bow) / 2];
  const line = trace([[Math.round(from[0]), Math.round(from[1])], [Math.round(mid[0]), Math.round(mid[1])], [Math.round(to[0]), Math.round(to[1])]]);
  line.forEach(([x, y], i) => px.set(x, y, i % 5 === 3 ? 'red' : 'blood1'));
}

/**
 * The Gate. kq is how shut it is in steps of 1 over RIFT_STEPS (0 wide open, RIFT_STEPS a seam) and pulse 0 to 3 is a slow breath: the
 * cleft swells a pixel and the fire inside it shifts. A cleft, wide in the middle of its height and pointed at the ends, runs from the wall
 * down onto the floor; its lips are wet flesh with teeth; veins run out of it; the floor in front of it is lit in dithered steps.
 */
export function riftArt(w: number, h: number, kq: number, pulse: number): Px {
  const px = new Px(w, h), open = 1 - kq / RIFT_STEPS;
  const cx = w >> 1, top = 3, bot = h - 4, span = bot - top;
  const swell = open > 0.05 ? [0, 1, 2, 1][pulse & 3] as number : 0;
  const hwAt = (y: number): number => {
    const u = (y - top) / span;
    if (u < 0 || u > 1) return -1;
    return open * ((w * 0.2) * Math.pow(Math.sin(Math.PI * u), 0.85) + swell * Math.sin(Math.PI * u));
  };
  // Light spilled on the floor: dithered steps that widen with the rift.
  const lx = w * 0.12 + open * w * 0.3, ly = 11;
  for (let y = h - ly * 1.5 | 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (lx + 4), dy = (y - (h - ly + 2)) / ly, d = dx * dx + dy * dy;
      if (d > 1 || ((x + y) & 1) !== 0) continue;
      px.set(x, y, d < 0.45 ? 'red' : 'blood1');
    }
  }
  // Veins running out over the wall and the floor.
  if (open > 0.15) {
    tendril(px, [cx - 12, top + 14], [4, top + 8], -3); tendril(px, [cx + 12, top + 14], [w - 5, top + 9], 3);
    tendril(px, [cx - 10, top + 28], [6, h - 6], -4); tendril(px, [cx + 10, top + 28], [w - 7, h - 5], 4);
    tendril(px, [cx - 6, top + 8], [cx - 22, 1], -2); tendril(px, [cx + 6, top + 8], [cx + 22, 2], 2);
  }
  // The lips, then the cleft, row by row.
  for (let y = top - 1; y <= bot + 1; y++) {
    const hw = Math.max(hwAt(y), 0), j = JAG[(y + 3) & 7] as number, jr = JAG[(y + 6) % 10] as number;
    const l = Math.round(cx - hw) + j, r = Math.round(cx + hw) + jr, lip = open > 0.05 ? 3 : 1;
    for (let k = 1; k <= lip; k++) { px.set(l - k, y, k === 1 ? 'hot' : k === 2 ? 'blood1' : 'blood0'); px.set(r + k, y, k === 1 ? 'hot' : k === 2 ? 'blood1' : 'blood0'); }
    if (open > 0.3 && (y + (pulse & 1)) % 4 === 0) { px.set(l - lip - 1, y, 'blood1'); px.set(r + lip + 1, y, 'blood1'); }
    if (r - l >= 0) px.rect(l, y, r - l + 1, 1, 'black');
    if (r - l >= 3) {
      px.set(l, y, 'orange').set(r, y, 'orange');
      if (r - l >= 6 && (y + pulse) % 3 === 0) px.set(l + 1, y, 'yellow').set(r - 1, y, 'yellow');
    }
    // A sliver of the red beyond, deep in the cleft.
    if (r - l >= 8 && hash2(y, 5, 97) % 5 === 0) px.set(cx + (hash2(y, 6, 97) % 5) - 2, y, 'blood0');
  }
  // Shut to a seam: one hot line with a bright core that breathes.
  if (open < 0.2) for (let y = top; y <= bot; y++) { const x = cx + (JAG[(y + 3) & 7] as number); px.set(x, y, (y + pulse * 3) % 6 < 2 ? 'yellow' : 'hot'); }
  return px;
}

// ---------------------------------------------------------------- seal roots
/** The low roots of an open seal: a few thin roots creeping out from the two posts of its doorway, so the way looks grown over but is clear. */
export function sealRootsArt(w: number, h: number): Px {
  const horiz = w >= h, L = horiz ? w : h, T = horiz ? h : w;
  const px = new Px(L, T), r = createRng(L * 17 + T);
  for (const side of [0, 1]) {
    for (let k = 0; k < 2; k++) {
      const y0 = 2 + Math.floor(((k + 0.5) * (T - 4)) / 2), x0 = side ? L - 1 : 0, dir = side ? -1 : 1, len = 7 + Math.floor(r() * 6);
      const pts: Pt[] = [[x0, y0], [x0 + dir * (len >> 1), y0 + (r() < 0.5 ? -1 : 1)], [x0 + dir * len, y0 + Math.round((r() - 0.5) * 3)]];
      trace(pts).forEach(([x, y], i, a) => { px.set(x, y - 1, 'sand'); px.set(x, y, i > a.length - 3 ? 'soil3' : 'soil2'); px.set(x, y + 1, 'soil0'); });
    }
  }
  return horiz ? px : transposed(px);
}

// ---------------------------------------------------------------- public
/** Draws a gap, a crack, a rift or a seal's roots. Returns false for anything else. */
export function drawGateProp(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  switch (v.kind) {
    case 'gap': ctx.drawImage(art(`gap${w}x${h}`, () => gapArt(w, h)), x, y); return true;
    case 'crack': {
      const open = v.state === 'open';
      ctx.drawImage(art(`crack${w}x${h}${open}`, () => crackArt(w, h, open)), x, y);
      return true;
    }
    case 'rift': {
      const kq = Math.max(0, Math.min(RIFT_STEPS, Math.round((v.k ?? 0) * RIFT_STEPS)));
      const pulse = calm ? 0 : (v.t >> 5) & 3;
      ctx.drawImage(art(`rift${w}x${h}${kq}${pulse}`, () => riftArt(w, h, kq, pulse)), x, y);
      if (!calm && kq < RIFT_STEPS) {
        // Sparks thrown off the rim: a few cream pixels that jump about the cleft every few frames.
        const cx = x + (w >> 1), n = 5;
        for (let i = 0; i < n; i++) {
          const u = unit(i, v.t >> 3, 98), s = unit(i, v.t >> 3, 99) < 0.5 ? -1 : 1;
          const sy = y + 6 + Math.round(u * (h - 14)), sx = cx + s * Math.round((0.1 + 0.25 * (1 - kq / RIFT_STEPS)) * w * Math.sin(Math.PI * u) + 1);
          rect(ctx, sx, sy, 1, 1, i & 1 ? 'cream' : 'yellow');
        }
      }
      return true;
    }
    default: return false;
  }
}
