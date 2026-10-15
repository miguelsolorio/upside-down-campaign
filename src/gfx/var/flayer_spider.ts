// Mind Flayer design 1, "Meat Spider": a spider made of raw meat. A huge red abdomen hung across the north wall, ridged like a
// side of beef and studded with blisters and bristles, a small fanged head under it, and four tall jointed legs whose knees
// rise high above the body and come down on the floor in claws. The silhouette is the legs: sharp angles and wide spread.
import { Px } from '../px.ts';
import type { Pt, Tone } from './flayer.ts';
import type { FlayerStyle, LegState } from './flayer.ts';
import { along, bayer, claw, knob, rnd, shade, tube } from './flayer.ts';

const MEAT: Tone = ['blood1', 'red', 'rose'], LIMB: Tone = ['blood0', 'blood1', 'red'];

function body(px: Px): void {
  shade(px, 176, 26, 96, 56, MEAT, -0.05);
  // the ridges: curved bands across the back, darker, with the fat showing between them
  for (let k = 0; k < 6; k++) {
    const y0 = 10 + k * 11;
    for (let x = 84; x < 270; x++) {
      const y = Math.round(y0 + 7 * Math.sin((x - 176) * 0.018) * (k + 1) * 0.35 + ((x - 176) * (x - 176)) / 1900);
      if (px.get(x, y) && rnd(x, k, 1) > 0.12) { px.set(x, y, 'blood0'); if (px.get(x, y + 1)) px.set(x, y + 1, bayer(x, y) < 0.5 ? 'blood1' : 'blood0'); }
      if (px.get(x, y - 2) && (x + k) % 5 === 0) px.set(x, y - 2, 'pink');
    }
  }
  const blisters: Pt[] = [[116, 34], [140, 20], [160, 44], [196, 40], [214, 22], [236, 38], [128, 52], [226, 56], [100, 46], [176, 14], [250, 48]];
  blisters.forEach(([x, y], i) => { knob(px, [x, y], 4 + (i % 3), ['blood1', 'hot', 'pink']); px.set(x - 1, y - 1, 'white'); });
  for (let x = 90; x < 264; x += 3) {
    const y = Math.round(26 + 56 * Math.sqrt(Math.max(0, 1 - ((x - 176) / 96) ** 2)));
    if (y < 83 && rnd(x, 0, 2) > 0.3) px.line(x, y, x + (x < 176 ? -1 : 1), y + 3 + Math.floor(rnd(x, 1, 2) * 3), 'rose');
  }
}

function headPx(px: Px, x: number, y: number, down: boolean): void {
  px.rect(x - 22, y + 4, 4, 11, 'bone').rect(x + 18, y + 4, 4, 11, 'bone');
  shade(px, x, y, 26, 18, ['blood1', 'rose', 'pink']);
  px.rect(x - 14, y - 7, 28, 7, 'blood1');
  const eyes: Pt[] = [[-10, -5], [-4, -7], [4, -7], [10, -5]];
  for (const [ex, ey] of eyes) { shade(px, x + ex, y + ey, 3, 3, ['ink', 'ink', 'ink']); px.set(x + ex, y + ey, down ? 'grey2' : 'amber').set(x + ex + 1, y + ey, down ? 'grey2' : 'yellow'); }
  px.rect(x - 12, y + 6, 24, 7, 'ink');
  for (let k = 0; k < 5; k++) px.rect(x - 11 + k * 5, y + 6, 2, down ? 3 : 5, 'bone');
  px.rect(x - 8, y + 12, 3, down ? 7 : 4, 'bone').rect(x + 5, y + 12, 3, down ? 7 : 4, 'bone');
  if (down) for (let k = 0; k < 4; k++) px.rect(x - 4 + k * 3, y + 14, 1, 4 + k, 'cream');
}

function leg(px: Px, pts: Pt[], st: LegState): void {
  tube(px, pts, st === 'severed' ? 7 : 6, st === 'severed' ? 6 : 2, LIMB);
  if (pts.length > 2) knob(px, pts[1] as Pt, 5, ['blood1', 'hot', 'pink']);
  if (st !== 'severed') {
    const p = along(pts);
    for (let k = 4; k < p.length - 4; k += 7) { const q = p[k]!; px.line(q.x, q.y, q.x + (q.x < 176 ? -3 : 3), q.y - 2, 'rose'); }
    claw(px, pts, 7, 3, st === 'warn' ? 'amber' : 'bone');
  }
}

export const SPIDER: FlayerStyle = {
  slug: 'spider', name: 'Meat Spider', cut: 'blood1', bow: 40, lift: 30,
  note: 'A spider of raw meat: a huge ridged abdomen across the wall studded with blisters and bristles, a small fanged head, and four tall jointed legs whose knees rise over the body and come down in claws. The silhouette is all legs.',
  roots: [[96, 58], [134, 76], [218, 76], [256, 58]],
  rest: [[40, 186], [100, 200], [252, 200], [312, 186]],
  head: [176, 72],
  body, headPx, leg,
};
