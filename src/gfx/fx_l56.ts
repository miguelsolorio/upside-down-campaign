// Effects of levels 5 and 6, drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// trail: the streak Max's Skate dash leaves, from where the roll started along the heading, w the length rolled. howl: the Alpha's
// ring, growing to w across its life. taunt: Steve's Babysit pulse, a bigger ring that grows to w and tells enemies to look at him.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { discPx, rect, ringPx, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

/** Frames after the roll ends that the streak spends thinning out (the sim sets life to the roll plus 8). */
const TRAIL_FADE = 8;

/**
 * The Skate streak: five speed lines, dashed, from the start of the roll to the board, which is at the head. The head runs out along
 * the heading as the roll goes; when it ends the streak draws in from its tail and is gone. A flick of dust sits at the start and a few
 * yellow sparks fly off the wheels.
 */
export function trail(ctx: Ctx, f: FxView, ang: number): void {
  const L = f.w > 0 ? f.w : 72, spread = f.h > 0 ? f.h : 10;
  const roll = Math.max(1, f.life - TRAIL_FADE);
  const head = L * easeOut(clamp(f.t / roll));
  const tail = f.t > roll ? L * clamp((f.t - roll) / TRAIL_FADE) : 0;
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  const lanes: [number, ColorName, number][] = [[0, 'white', 0], [-1, 'cyan', 2], [1, 'cyan', 4], [-2, 'sky', 1], [2, 'sky', 3]];
  for (const [lane, col, phase] of lanes) {
    const off = (lane * spread) / 4;
    for (let d = Math.ceil(tail); d <= head; d++) {
      // Dashes slide back along the line as the roll goes, and the outer lanes break up more than the middle.
      const run = lane === 0 ? 7 : Math.abs(lane) === 1 ? 5 : 3;
      if (((d + phase * 2 + (f.t >> 1)) % 9) >= run) continue;
      const u = d / Math.max(1, L);
      const fade = f.t > roll ? 1 : u < 0.15 ? 0.6 : 1;
      const x = f.x + c * d + px * off, y = f.y + s * d + py * off;
      if (keep(Math.round(x), Math.round(y), fade)) rect(ctx, x, y, 1, 1, col);
    }
  }
  if (f.t <= roll) {
    discPx(ctx, f.x + c * head, f.y + s * head, 1, 'white');
    for (let k = 0; k < 3; k++) {
      const d = head - 2 - unit(k, f.t >> 1, 41) * 9, o = (unit(k, f.t >> 1, 42) - 0.5) * (spread + 4);
      rect(ctx, f.x + c * d + px * o, f.y + s * d + py * o, 1, 1, k & 1 ? 'yellow' : 'cream');
    }
  }
  if (f.t < 8) for (let k = 0; k < 4; k++) rect(ctx, f.x - c * (2 + f.t * 0.4) + px * (k - 1.5) * 2, f.y - s * (2 + f.t * 0.4) + py * (k - 1.5) * 2, 2, 1, k & 1 ? 'mist' : 'bone');
}

/**
 * The Alpha's howl: a shock that runs out from its mouth, three rings thick in the cold blues of the creature, with a white front edge
 * and spokes that fly out ahead of it. It thins to a dither near the end. w is the diameter it grows to.
 */
export function howl(ctx: Ctx, f: FxView, p: number): void {
  const R = (f.w > 0 ? f.w : 96) / 2;
  const r = Math.max(2, Math.round(R * easeOut(clamp(p * 1.1))));
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  const n = Math.ceil(Math.PI * 2 * r);
  const layers: [number, ColorName, number][] = [[0, 'white', 1], [1, 'cyan', 2], [3, 'teal1', 1], [5, 'teal0', 1]];
  for (const [inset, col, th] of layers) {
    const rr = r - inset;
    if (rr < 2) continue;
    const m = Math.ceil(Math.PI * 2 * rr);
    for (let k = 0; k < m; k++) {
      const a = (k / m) * Math.PI * 2;
      const x = Math.round(f.x + Math.cos(a) * rr), y = Math.round(f.y + Math.sin(a) * rr);
      if ((inset > 2 && ((k + (f.t >> 1)) % 4) === 3) || !keep(x, y, fade - inset * 0.04)) continue;
      rect(ctx, x, y, th, th, col);
    }
  }
  if (p < 0.7) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.2, d0 = r + 2, d1 = d0 + 3 + (1 - p) * 5;
      for (let d = d0; d <= d1; d += 1) rect(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 1, 1, d > d1 - 2 ? 'white' : 'sky');
    }
  }
  if (p < 0.25) for (let k = 0; k < n; k += 3) { const a = (k / n) * Math.PI * 2; rect(ctx, f.x + Math.cos(a) * (r - 8), f.y + Math.sin(a) * (r - 8), 1, 1, 'cyan'); }
}

/**
 * Steve's Babysit pulse: a wide ring of warm gold that runs out to w, dashed and turning, with a second, thinner one close behind it,
 * so it reads as a shout. A burst of cream spokes shows at his feet at the start. It is warm where the howl is cold and thin where
 * the nova is white, so the three never read alike.
 */
export function taunt(ctx: Ctx, f: FxView, p: number): void {
  const R = (f.w > 0 ? f.w : 144) / 2;
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  const ring = (rr: number, col: ColorName, th: number, dash: number, spin: number): void => {
    if (rr < 2) return;
    const m = Math.ceil(Math.PI * 2 * rr);
    for (let k = 0; k < m; k++) {
      if (((k + spin) % (dash * 2)) >= dash) continue;
      const a = (k / m) * Math.PI * 2;
      const x = Math.round(f.x + Math.cos(a) * rr), y = Math.round(f.y + Math.sin(a) * rr);
      if (keep(x, y, fade)) rect(ctx, x, y, th, th, col);
    }
  };
  const r = Math.round(R * easeOut(clamp(p * 1.05)));
  ring(r, 'amber', 2, 7, f.t * 2);
  ring(r - 2, 'yellow', 1, 5, -f.t * 2);
  ring(Math.round(r * 0.84), 'orange', 1, 4, f.t);
  if (p < 0.3) {
    discPx(ctx, f.x, f.y, 3 - Math.floor(p * 8), 'cream');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.4, d = 4 + p * 30;
      rect(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 2, 1, k & 1 ? 'yellow' : 'cream');
    }
  }
  if (p < 0.4) ringPx(ctx, f.x, f.y, 3 + Math.floor(p * 12), 'amber', 1);
}
