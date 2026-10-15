// School props (stage 1.3): the fire-door release box (dark, then lit), the wall of Upside Down vines across a doorway
// (closed, then burned to stubs) and the agents' van tipped on its side. Each is one bold shape in at most five colors,
// drawn by hand: ASCII for the box, strokes for the vines and the van. The static art is cached by drawProp (and
// repainted at night like any prop); the live bits (lamp rays, embers) are drawn over it from PropView.t alone. A seal in 2.3 (id seal...)
// that stands open is low roots, drawn in props_gate.ts.
import type { PropView } from '../core/types.ts';
import { createRng } from '../core/rng.ts';
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ArtFn } from './props_lab2.ts';
import { rim } from './props_lab2.ts';
import { Px } from './px.ts';
import { transposed } from './tile_lab.ts';
import { sealRootsArt } from './props_gate.ts';

// ---------------------------------------------------------------- firebox
const BOX = [
  '................',
  '...hhhhhhhhhh...',
  '...hrrrrrrrrb...',
  '...hrllllllrb...',
  '...hrlklklkrb...',
  '...hrllllllrb...',
  '...hrrrrrrrrb...',
  '...hrrkddkrrb...',
  '...hrkddddkrb...',
  '...hrkddddkrb...',
  '...hrrkddkrrb...',
  '...hrrrrrrrrb...',
  '...hrrrwwrrrb...',
  '...hbbbbbbbbb...',
  '................',
  '................',
];

/** The release box, 16 by 16: red steel with a label strip and a round lens. Dark: a bone label and an unlit lens. Lit: the strip and the lens glow yellow. */
export function fireboxArt(lit: boolean): Px {
  const p = new Px(16, 16);
  p.art(BOX, { h: 'hot', r: 'red', b: 'blood1', k: 'ink', w: lit ? 'yellow' : 'bone', l: lit ? 'yellow' : 'bone', d: lit ? 'yellow' : 'blood1' });
  if (lit) p.rect(7, 8, 2, 2, 'hot');
  return p;
}

/** The lamp's rays, over a lit box: four dots round the lens that flicker. x and y are the top-left of its 16 by 16 body. */
export function fireboxLive(ctx: Ctx, lit: boolean, x: number, y: number, t: number, calm: boolean): void {
  if (!lit) return;
  const on = calm || ((t >> 3) & 3) !== 3;
  if (!on) return;
  for (const [dx, dy] of [[4, 7], [11, 7], [4, 10], [11, 10]] as [number, number][]) rect(ctx, x + dx, y + dy, 1, 1, 'cream');
  if (!calm && ((t >> 4) & 1) === 0) { rect(ctx, x + 7, y + 6, 2, 1, 'white'); rect(ctx, x + 7, y + 11, 2, 1, 'white'); }
}

// ---------------------------------------------------------------- vines
/** A rope along a sine from one side of the doorway to the other, with its lit edge on top and its dark edge under. */
function rope(p: Px, L: number, T: number, across: boolean, at: number, amp: number, phase: number, w: number): void {
  const pts: [number, number][] = [];
  const len = across ? L : T;
  for (let i = 0; i <= len; i++) {
    const o = Math.round(Math.sin(i * 0.42 + phase) * amp);
    pts.push(across ? [i, at + o] : [at + o, i]);
  }
  for (const [x, y] of pts) p.rect(x - (w >> 1) + 1, y - (w >> 1) + 1, w, w, 'blood0');
  for (const [x, y] of pts) p.rect(x - (w >> 1), y - (w >> 1), w, w, 'blood1');
  for (const [x, y] of pts) p.rect(x - (w >> 1), y - (w >> 1), across ? w : 1, across ? 1 : w, 'red');
}

/**
 * A wall of Upside Down vines filling the doorway, w by h. Wider than tall it is drawn flat; taller than wide it is
 * the same wall turned a quarter. Closed: red ropes woven edge to edge over a dark gap, with knots, thorns and drips,
 * and a beat that moves the lit knots. Open: burned, two charred stubs by the posts, ash on the floor and an ember.
 */
export function vinesArt(w: number, h: number, open: boolean, beat: number): Px {
  const horiz = w >= h;
  const L = horiz ? w : h, T = horiz ? h : w;
  const p = new Px(L, T);
  const r = createRng(L * 53 + T * 7 + (open ? 1 : 0));
  if (open) {
    for (const side of [0, 1]) {
      const x0 = side ? L - 1 : 0, dir = side ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        const y = 1 + Math.floor(((k + 0.5) * (T - 2)) / 3), len = 3 + Math.floor(r() * 4);
        for (let i = 0; i < len; i++) { const yy = y + (i > 1 ? (r() < 0.5 ? 0 : 1) : 0); p.rect(x0 + dir * i, yy, 1, 2, i < 2 ? 'ink' : 'blood0'); }
        p.set(x0 + dir * (len - 1), y, 'grey1');
      }
    }
    p.scatter(r, 'grey1', 7, 5, 1, L - 10, T - 2).scatter(r, 'grey2', 3, 5, 1, L - 10, T - 2);
    p.set(2 + beat * (L - 5), T >> 1, 'orange');
    return horiz ? p : transposed(p);
  }
  p.fill('ink');
  p.scatter(r, 'blood0', Math.round((L * T) / 12));
  const phase = r() * 6;
  const cols = Math.max(3, Math.round(L / 8));
  for (let i = 0; i < cols; i++) rope(p, L, T, false, 3 + Math.round((i * (L - 7)) / (cols - 1)), 1.8, phase + i * 1.7, 4);
  for (const [k, y] of [Math.round(T * 0.2), Math.round(T * 0.52), Math.round(T * 0.84)].entries()) rope(p, L, T, true, y, 1.4, phase * 0.5 + k * 2.3, 4);
  for (let i = 0; i < cols; i++) {
    const x = 3 + Math.round((i * (L - 7)) / (cols - 1)), y = Math.round(T * (i & 1 ? 0.52 : 0.2));
    p.rect(x - 1, y - 1, 3, 3, 'blood1').rect(x - 1, y - 1, 2, 2, ((i + beat) & 1) === 0 ? 'hot' : 'red').set(x + 1, y + 1, 'blood0');
  }
  for (let i = 0; i < 5; i++) {
    const x = 3 + Math.floor(r() * (L - 6)), y = Math.floor(r() * (T - 2));
    p.line(x, y, x + (r() < 0.5 ? -2 : 2), y - 2, 'red').set(x, y, 'hot');
  }
  for (let i = 0; i < Math.max(2, L >> 3); i++) {
    const x = 2 + Math.floor(r() * (L - 4)), len = 2 + Math.floor(r() * 3);
    for (let y = T - len; y < T; y++) p.set(x, y, y === T - 1 ? 'red' : 'blood1');
  }
  p.rect(0, 0, 1, T, 'blood0').rect(L - 1, 0, 1, T, 'blood0');
  return horiz ? p : transposed(p);
}

// ---------------------------------------------------------------- van on its side
/**
 * The van after Eleven shoves it over, w by h: rolled onto its side, toward the camera, so the wheels stick up along the
 * far edge over a strip of grey chassis, the side panel with its windows and blue stripe faces the sky, and the roof edge
 * runs along the near edge over a dither of shadow.
 */
export function vanTippedArt(w: number, h: number): Px {
  const p = new Px(w, h);
  const top = Math.max(5, Math.round(h * 0.34)), roof = h - 4;
  p.rect(1, top, w - 2, roof - top, 'bone').rect(1, top, w - 2, 1, 'grey3');
  const wy = top + 2, wh = Math.max(2, ((roof - top) >> 1) - 1);
  const cab = Math.floor(w * 0.22);
  p.rect(w - 2 - cab, wy, cab - 1, wh + 1, 'ink').set(w - 2 - cab, wy, 'grey3');
  for (const x0 of [Math.floor(w * 0.12), Math.floor(w * 0.4)]) p.rect(x0, wy, Math.floor(w * 0.2), wh, 'ink').set(x0, wy, 'grey3');
  p.rect(Math.floor(w * 0.64), top + 1, 1, roof - top - 2, 'grey3');
  p.rect(1, roof - 2, w - 2, 1, 'blue');
  p.rect(1, roof - 1, w - 2, 1, 'grey3').rect(1, roof, w - 2, 2, 'grey2').rect(1, roof + 1, w - 2, 1, 'ink');
  p.rect(1, top - 2, w - 2, 2, 'grey2').rect(1, top - 2, w - 2, 1, 'ink').rect(Math.floor(w * 0.3), top - 2, Math.floor(w * 0.4), 1, 'grey3');
  for (const cx of [Math.floor(w * 0.22), Math.floor(w * 0.78)]) {
    p.disc(cx + 0.5, top - 0.5, 3.6, 'ink').disc(cx + 0.5, top - 0.5, 2.4, 'grey3').disc(cx + 0.5, top - 0.5, 1, 'grey2');
  }
  for (let x = 2; x < w - 2; x++) if ((x & 1) === 0) p.set(x, h - 1, 'ink');
  return p;
}

// ---------------------------------------------------------------- public
/** Draws a firebox or a vine wall. Returns false for any other kind. */
export function drawSchoolProp(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  if (v.kind === 'firebox') {
    const lit = v.state === 'lit' || v.state === 'open';
    const cx = x + ((w - 16) >> 1), cy = y + (h - 16);
    ctx.drawImage(art(`firebox${lit}`, () => rim(fireboxArt(lit))), cx - 1, cy - 1);
    fireboxLive(ctx, lit, cx, cy, v.t, calm);
    return true;
  }
  if (v.kind === 'vines') {
    const open = v.state === 'open';
    // A seal (stage 2.3) that stands open was never burned: low roots along its doorway, and the way is clear.
    if (open && v.id.startsWith('seal')) { ctx.drawImage(art(`seal${w}x${h}`, () => sealRootsArt(w, h)), x, y); return true; }
    const beat = calm || open ? 0 : (v.t >> 5) & 1;
    const ember = open && !calm ? (v.t >> 4) & 1 : 0;
    ctx.drawImage(art(`vines${w}x${h}${open}${open ? ember : beat}`, () => vinesArt(w, h, open, open ? ember : beat)), x, y);
    return true;
  }
  return false;
}
