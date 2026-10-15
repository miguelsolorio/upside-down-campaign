// Mind Flayer design 3, "Arm Crown": a round red core with a screaming face in it and a crown of pale arms fanned out round it,
// seventeen of them, tipped with open hands, filling the wall like a sunburst. The legs are the longest arms. The silhouette is
// radial: spokes, not mass.
import { Px } from '../px.ts';
import type { Pt, Tone } from './flayer.ts';
import type { FlayerStyle, LegState } from './flayer.ts';
import { hand, knob, shade, tube } from './flayer.ts';

const PIVOT: Pt = [176, 56];

function body(px: Px): void {
  for (const back of [true, false]) {
    for (let k = back ? 0 : 1; k < 17; k += 2) {
      const a = -Math.PI + ((k + 0.5) / 17) * Math.PI, u: Pt = [Math.cos(a), Math.sin(a)];
      const L = Math.min(back ? 94 : 82, (PIVOT[1] - 4) / Math.max(0.16, -u[1]));
      const sway = (k % 4 < 2 ? 1 : -1) * 7;
      const p = (r: number, o = 0): Pt => [PIVOT[0] + u[0] * r - u[1] * o, PIVOT[1] + u[1] * r + u[0] * o];
      const pts: Pt[] = [p(32), p(32 + (L - 32) * 0.55, sway), p(L)];
      const tone: Tone = back ? ['grey1', 'grey2', 'grey3'] : ['grey2', 'grey3', 'bone'];
      tube(px, pts, 5, 2, tone);
      hand(px, pts, 4, back ? 4 : 5, tone);
    }
  }
  shade(px, PIVOT[0], PIVOT[1], 48, 42, ['blood0', 'blood1', 'red']);
  for (let k = 0; k < 5; k++) for (let x = 130; x < 224; x++) {
    const y = Math.round(PIVOT[1] - 30 + k * 12 + ((x - 176) * (x - 176)) / 160);
    if (px.get(x, y) && (x + k) % 4 !== 0) px.set(x, y, 'blood0');
  }
}

function headPx(px: Px, x: number, y: number, down: boolean): void {
  shade(px, x, y, 24, 20, ['grey3', 'bone', 'white']);
  for (const s of [-1, 1]) { shade(px, x + s * 9, y - 5, 5, 6, ['ink', 'ink', 'grey1']); if (down) px.rect(x + s * 9 - 4, y - 5, 8, 2, 'ink'); else px.rect(x + s * 9 - 1, y - 5, 3, 3, 'hot'); }
  px.line(x - 14, y - 12, x - 5, y - 9, 'ink').line(x + 14, y - 12, x + 5, y - 9, 'ink');
  shade(px, x, y + 10, 11, down ? 11 : 9, ['ink', 'ink', 'blood0']);
  for (let k = 0; k < 7; k++) px.rect(x - 9 + k * 3, y + 3, 2, 4, 'white');
  if (down) px.rect(x - 3, y + 14, 6, 8, 'hot');
}

function leg(px: Px, pts: Pt[], st: LegState): void {
  const tone: Tone = ['grey2', 'grey3', 'bone'];
  tube(px, pts, st === 'severed' ? 8 : 6, st === 'severed' ? 7 : 3, tone);
  if (pts.length > 2) knob(px, pts[1] as Pt, 4, tone);
  if (st !== 'severed') hand(px, pts, 5, st === 'warn' ? 8 : 9, ['grey3', 'bone', 'white']);
}

export const CROWN: FlayerStyle = {
  slug: 'crown', name: 'Arm Crown', cut: 'blood1', bow: 20,
  note: 'A round red core with a screaming face in it, and a crown of seventeen pale arms fanned out round it, each tipped with an open hand, so it fills the wall like a sunburst. The four legs are the longest arms. Spokes, not mass.',
  roots: [[130, 84], [154, 94], [198, 94], [222, 84]],
  rest: [[54, 178], [110, 204], [242, 204], [298, 178]],
  head: [176, 56],
  body, headPx, leg,
};
