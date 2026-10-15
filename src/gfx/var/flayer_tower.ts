// Mind Flayer design 2, "Body Tower": a stepped heap of melded bodies, the people it took, pale and grey and rosy, fused
// into one pyramid that climbs the north wall and runs on up through the ceiling. Ribs, arms and small faces show in it, and
// a great pale face looks out of the lowest tier. The legs are bundles of arms that end in hands.
import { Px } from '../px.ts';
import type { Pt, Tone } from './flayer.ts';
import type { FlayerStyle, LegState } from './flayer.ts';
import { along, hand, knob, rnd, shade, tube } from './flayer.ts';

const TONES: Tone[] = [['grey2', 'grey3', 'bone'], ['soil2', 'skin2', 'skin1'], ['blood1', 'rose', 'pink'], ['dusk', 'mist', 'bone'], ['soil3', 'skin1', 'skin0']];
/** The people, a pyramid of them from the top row down; the lower rows are in front. */
const ROWS: { y: number; xs: number[] }[] = [
  { y: 2, xs: [150, 202] }, { y: 22, xs: [124, 176, 228] }, { y: 44, xs: [104, 140, 176, 212, 248] }, { y: 66, xs: [86, 116, 146, 206, 236, 266] },
];

function person(px: Px, x: number, y: number, id: number): void {
  const t = TONES[Math.floor(rnd(id, 3, 5) * TONES.length)] as Tone, hx = x + Math.round((rnd(id, 1, 5) - 0.5) * 8), hy = y - 15;
  const side = id & 1 ? 1 : -1;
  shade(px, x, y, 14, 17, t);
  for (const o of [-5, 0, 5]) px.line(x + o - 3, y + 8, x + o + 3, y + 8 - (o === 0 ? 3 : 1), 'blood0');
  tube(px, [[x + side * 11, y - 8], [x + side * 16, y + 4], [x + side * 14, y + 16]], 4, 3, t);
  shade(px, hx, hy, 7, 7, [t[1], t[2], t[2]]);
  px.rect(hx - 4, hy - 2, 2, 3, 'ink').rect(hx + 2, hy - 2, 2, 3, 'ink').rect(hx - 1, hy + 2, 3, 4, 'ink');
}

function body(px: Px): void {
  let id = 0;
  for (const r of ROWS) for (const x of r.xs) person(px, x, r.y + Math.round((rnd(id, 2, 5) - 0.5) * 5), id++);
}

function headPx(px: Px, x: number, y: number, down: boolean): void {
  shade(px, x, y, 26, 22, ['grey3', 'bone', 'white']);
  for (const s of [-1, 1]) {
    shade(px, x + s * 10, y - 5, 6, 7, ['ink', 'ink', 'grey1']);
    if (down) px.rect(x + s * 10 - 5, y - 5, 10, 2, 'ink'); else px.rect(x + s * 10 - 3, y - 7, 6, 6, 'white').rect(x + s * 10 - 1, y - 5, 2, 2, 'ink');
  }
  px.rect(x - 1, y + 1, 3, 5, 'grey2');
  shade(px, x, y + 12, 9, down ? 10 : 8, ['ink', 'ink', 'blood0']);
  for (let k = 0; k < 6; k++) px.rect(x - 8 + k * 3, y + 6, 2, 3, 'white');
  if (down) { px.rect(x - 3, y + 14, 6, 8, 'hot'); px.rect(x - 1, y + 14, 2, 8, 'red'); }
  for (let k = 0; k < 9; k++) px.line(x - 20 + k * 5, y - 20, x - 22 + k * 5, y - 24 - (k & 1) * 3, 'grey2');
}

function leg(px: Px, pts: Pt[], st: LegState): void {
  const tone: Tone = ['soil2', 'skin2', 'skin1'];
  tube(px, pts, 10, st === 'severed' ? 8 : 5, tone);
  const path = along(pts);
  for (let k = 3; k < path.length - 3; k += 5) { const q = path[k]!; px.set(q.x - 1, q.y, 'blood1').set(q.x + 1, q.y + 1, 'blood1'); }
  if (pts.length > 2) knob(px, pts[1] as Pt, 5, tone);
  if (st !== 'severed') hand(px, pts, 5, 8, ['skin2', 'skin1', 'skin0']);
}

export const TOWER: FlayerStyle = {
  slug: 'tower', name: 'Body Tower', cut: 'blood1', bow: 22,
  note: 'A stepped heap of melded bodies, pale and grey and rosy, fused into one pyramid that climbs the wall and runs up through the ceiling. Ribs, arms and small faces show in it. A great pale face looks out of the lowest tier, and the legs are bundles of arms ending in hands.',
  roots: [[100, 86], [140, 92], [212, 92], [252, 86]],
  rest: [[60, 190], [116, 204], [236, 204], [292, 190]],
  head: [176, 68],
  body, headPx, leg,
};
