// Mind Flayer design 4, "Lump Walker": no shape at all. A heap of two dozen lumps in flesh, bile and bruise, pocked with pustules,
// with eyes and mouths opening here and there, sagging in drips, on four legs that are far too thin for it: long pale sticks with
// big knobbed knees. A small pale head with one huge eye peers out of the heap. It looks like it should not be able to stand.
import { Px } from '../px.ts';
import type { Pt, Tone } from './flayer.ts';
import type { FlayerStyle, LegState } from './flayer.ts';
import { claw, knob, rnd, shade, tube } from './flayer.ts';

const TONES: Tone[] = [['pine0', 'pine1', 'pine2'], ['purple0', 'blood1', 'rose'], ['soil1', 'soil2', 'sand'], ['blood1', 'rose', 'pink'], ['purple0', 'purple', 'magenta']];

function body(px: Px): void {
  const blobs: { x: number; y: number; r: number; i: number }[] = [];
  for (let i = 0; i < 26; i++) blobs.push({ x: 176 + (rnd(i, 1, 9) * 2 - 1) * 78, y: 30 + (rnd(i, 2, 9) * 2 - 1) * 30, r: 11 + rnd(i, 3, 9) * 13, i });
  blobs.sort((a, b) => a.y - b.y);
  for (const b of blobs) shade(px, b.x, b.y, b.r, b.r * 0.85, TONES[b.i % 5] as Tone);
  for (let i = 0; i < 12; i++) {
    const x = 100 + Math.floor(rnd(i, 4, 9) * 150), y = 8 + Math.floor(rnd(i, 5, 9) * 58);
    if (!px.get(x, y)) continue;
    px.rect(x - 1, y - 1, 3, 3, 'ink').rect(x, y, 1, 1, 'cream').set(x - 1, y - 1, 'amber').set(x + 1, y - 1, 'amber');
  }
  for (let i = 0; i < 7; i++) {
    const x = 96 + Math.floor(rnd(i, 6, 9) * 160), y = 10 + Math.floor(rnd(i, 7, 9) * 50);
    if (!px.get(x, y)) continue;
    px.rect(x - 2, y - 2, 5, 4, 'white').rect(x - 1, y - 1, 2, 2, 'ink').line(x - 3, y - 3, x + 3, y - 3, 'blood0');
  }
  for (let i = 0; i < 4; i++) {
    const x = 110 + Math.floor(rnd(i, 8, 9) * 130), y = 14 + Math.floor(rnd(i, 9, 9) * 44);
    if (!px.get(x, y)) continue;
    px.rect(x - 4, y, 9, 3, 'ink');
    for (let k = 0; k < 4; k++) px.set(x - 3 + k * 2, y, 'bone');
  }
  for (let x = 88; x < 266; x += 2) {
    let y = 90;
    while (y > 20 && !px.get(x, y)) y--;
    if (y > 28 && rnd(x, 0, 11) > 0.55) px.rect(x, y + 1, 2, 4 + Math.floor(rnd(x, 1, 11) * 9), rnd(x, 2, 11) > 0.5 ? 'blood1' : 'blood0');
  }
}

function headPx(px: Px, x: number, y: number, down: boolean): void {
  shade(px, x, y, 15, 12, ['grey2', 'grey3', 'bone']);
  shade(px, x, y - 3, 8, 6, ['grey3', 'white', 'white']);
  px.rect(x - 2, y - 5, 4, 5, down ? 'grey2' : 'hot').rect(x - 1, y - 4, 2, 3, 'ink');
  if (down) px.line(x - 6, y - 3, x + 6, y - 3, 'ink');
  px.rect(x - 9, y + 5, 18, down ? 5 : 3, 'ink');
  for (let k = 0; k < 6; k++) px.rect(x - 8 + k * 3, y + 5, 1, 2, 'bone');
}

function leg(px: Px, pts: Pt[], st: LegState): void {
  const tone: Tone = ['grey2', 'grey3', 'bone'];
  tube(px, pts, st === 'severed' ? 5 : 3, st === 'severed' ? 4 : 1, tone);
  if (pts.length > 2) { knob(px, pts[1] as Pt, 4, ['grey3', 'bone', 'white']); px.set((pts[1] as Pt)[0], (pts[1] as Pt)[1], 'ink'); }
  knob(px, pts[0] as Pt, 3, ['grey3', 'bone', 'white']);
  if (st !== 'severed') claw(px, pts, 5, 2, st === 'warn' ? 'amber' : 'bone');
}

export const LUMP: FlayerStyle = {
  slug: 'lump', name: 'Lump Walker', cut: 'blood1', bow: 40,
  note: 'No shape at all: a heap of two dozen lumps in flesh, bile and bruise, pocked with pustules, with eyes and mouths opening here and there and drips sagging off it. It stands on four legs far too thin for it, long pale sticks with big knobbed knees, and a small pale head with one huge eye peers out of the heap.',
  roots: [[96, 62], [138, 72], [214, 72], [256, 62]],
  rest: [[38, 190], [110, 204], [242, 204], [314, 190]],
  head: [176, 72],
  body, headPx, leg,
};
