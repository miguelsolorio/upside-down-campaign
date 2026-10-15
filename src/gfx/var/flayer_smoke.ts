// Mind Flayer design 5, "Smoke Shadow": a cloud of purple-black smoke across the north wall, the way the thing first shows over the town.
// Nothing has an ink outline: the edge is pixels left out, thinning in a Bayer dither into wisps, with swirls through it and two
// hot eyes in a vague crest. The legs are tendrils that wave down from the cloud and end in a hard pale spike. Solid only where it hurts.
import { Px } from '../px.ts';
import type { Pt } from './flayer.ts';
import type { FlayerStyle, LegState } from './flayer.ts';
import { along, bayer, rnd, shade, tube } from './flayer.ts';

/** The cloud: a core that is solid, a band that dithers out, and a few loose specks beyond. */
function cloud(px: Px, cx: number, cy: number, rx: number, ry: number, seed: number, drip: number): void {
  for (let y = Math.max(0, cy - ry * 1.5); y < cy + ry * 1.7; y++) {
    for (let x = cx - rx * 1.4; x < cx + rx * 1.4; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = Math.hypot(nx, ny), th = Math.atan2(ny, nx);
      let R = 0.8 + 0.1 * Math.sin(3 * th + seed) + 0.07 * Math.sin(7 * th) + 0.05 * Math.sin(13 * th + 2);
      if (ny > 0) R += drip * ny * (0.5 + 0.5 * Math.sin(x * 0.21 + seed));
      if (d > R * 1.3) continue;
      if (d < R * 0.72) {
        const s = Math.sin(x * 0.09 + y * 0.05 + 2 * Math.sin(y * 0.11 + seed));
        px.set(x, y, Math.abs(s) < 0.07 ? 'purple' : bayer(x, y) < 0.18 && d > R * 0.5 ? 'night' : 'purple0');
      } else if (d < R) px.set(x, y, bayer(x, y) < (R - d) / (R * 0.28) ? 'purple0' : (nx + ny < 0 && bayer(x, y) > 0.8 ? 'purple' : 'night'));
      else if (rnd(x, y, 7) < ((R * 1.3 - d) / (R * 0.3)) * 0.22) px.set(x, y, bayer(x, y) < 0.5 ? 'purple0' : 'night');
    }
  }
}

function body(px: Px): void { cloud(px, 176, 30, 100, 56, 1, 0.32); }

function headPx(px: Px, x: number, y: number, down: boolean): void {
  cloud(px, x, y, 26, 18, 4, 0.2);
  for (const s of [-1, 1]) { px.rect(x + s * 9 - 2, y - 5, 5, 3, down ? 'grey2' : 'hot'); px.rect(x + s * 9 - 1, y - 4, 2, 1, down ? 'mist' : 'amber'); }
  for (let k = 0; k < 7; k++) { const tx = x - 10 + k * 3.4; px.line(tx, y + 4, tx + 1, y + 4 + (k & 1 ? 3 : 5) + (down ? 3 : 0), 'bone'); }
  shade(px, x, y + 14, 5, 3, ['purple0', 'purple0', 'purple']);
}

function leg(px: Px, pts: Pt[], st: LegState): void {
  const path = along(pts);
  const wave: Pt[] = path.filter((_, k) => k % 6 === 0 || k === path.length - 1).map((p, k): Pt => [p.x + Math.sin(k * 0.9) * (st === 'severed' ? 1 : 5) * (1 - p.t * 0.5), p.y]);
  tube(px, wave, st === 'severed' ? 9 : 8, st === 'severed' ? 8 : 2, ['night', 'purple0', 'purple']);
  for (const p of path) if (rnd(p.x, p.y, 13) < 0.32) { const o = (rnd(p.x, p.y, 14) - 0.5) * (12 - 9 * p.t); px.set(p.x + o, p.y + (rnd(p.y, p.x, 15) - 0.5) * 6, 'purple0'); }
  if (st !== 'severed') {
    const tip = pts[pts.length - 1] as Pt, a = pts[pts.length - 2] as Pt;
    const d = Math.hypot(tip[0] - a[0], tip[1] - a[1]) || 1, ux = (tip[0] - a[0]) / d, uy = (tip[1] - a[1]) / d;
    px.line(tip[0] - ux * 4, tip[1] - uy * 4, tip[0] + ux * 9, tip[1] + uy * 9, st === 'warn' ? 'amber' : 'bone');
    px.set(tip[0] + ux * 10, tip[1] + uy * 10, 'white');
  }
}

export const SMOKE: FlayerStyle = {
  slug: 'smoke', name: 'Smoke Shadow', cut: 'purple', bow: 24, smoke: true,
  note: 'A cloud of purple-black smoke across the wall, the way it first looks over the town. There is no outline: the edge is pixels left out, thinning in a dither into wisps, with swirls through it and two hot eyes in a vague crest. The legs are tendrils that wave down from the cloud and end in a hard pale spike.',
  roots: [[100, 66], [140, 80], [212, 80], [252, 66]],
  rest: [[44, 190], [104, 204], [248, 204], [308, 190]],
  head: [176, 70],
  body, headPx, leg,
};
