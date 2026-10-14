// The title's scenery past its 256 px composition, for a wider screen, in front of the low red haze that title_art
// spreads along the whole horizon (so the tree line reads all the way across). Telephone poles and their wires run off
// to the left, where Will's bike lies in the grass with its lamp still on. To the right, the Hawkins water tower and a
// radio tower stand over the trees with their red lights blinking, and a fence by the field is strung with Christmas
// lights. Fireflies drift over the grass and tall pines frame the far edges.
// Everything here is placed from the frame's edges outward, so it fills whatever room there is and draws nothing at 256.
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { settings } from '../core/settings.ts';
import { drawProp } from '../gfx/index.ts';
import type { Glow } from '../gfx/index.ts';
import { hash2 } from '../gfx/canvas.ts';
import type { ColorName } from '../gfx/palette.ts';
import { Px } from '../gfx/px.ts';
import { box } from './kit.ts';
import type { Ctx } from './kit.ts';
import { HORIZON, pine } from './title_art.ts';

/** Room past the frame on each side, in px. */
const side = (): number => FRAME_X;
/** Screen x of a point given from the frame's left edge (negative is left of the frame). */
const sx = (fx: number): number => FRAME_X + fx;

/** On each pixel of the silhouette whose neighbour toward the rift is empty, a rim of its red light. */
function rimLit(p: Px, towardRight: boolean, c: ColorName): Px {
  const src = p.d.slice();
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!src[y * p.w + x]) continue;
      const nx = towardRight ? x + 1 : x - 1;
      if (nx < 0 || nx >= p.w || !src[y * p.w + nx]) p.set(x, y, c);
    }
  }
  return p;
}

/** The water tower: a tank under a pointed roof, a catwalk and four splayed legs. Lit on its left, toward the rift. */
const TOWER_W = 24, TOWER_H = 64;
let waterArt: HTMLCanvasElement | null = null;
function waterTower(): HTMLCanvasElement {
  if (waterArt) return waterArt;
  const p = new Px(TOWER_W, TOWER_H);
  for (let y = 0; y < 5; y++) p.rect(11 - y * 2, y, 2 + y * 4, 1, 'black');
  p.rect(1, 5, 22, 12, 'black').rect(0, 17, 24, 1, 'black');
  p.line(4, 18, 1, TOWER_H - 1, 'black').line(19, 18, 22, TOWER_H - 1, 'black');
  p.line(9, 18, 8, TOWER_H - 1, 'black').line(14, 18, 15, TOWER_H - 1, 'black');
  for (let y = 22; y < TOWER_H - 8; y += 14) p.line(4, y, 19, y + 12, 'black').line(19, y, 4, y + 12, 'black');
  waterArt = rimLit(p, false, 'blood1').toCanvas();
  return waterArt;
}

/** A lattice radio tower with a mast on top. Lit on its left, toward the rift. */
const RADIO_W = 15, RADIO_H = 86;
let radioArt: HTMLCanvasElement | null = null;
function radioTower(): HTMLCanvasElement {
  if (radioArt) return radioArt;
  const p = new Px(RADIO_W, RADIO_H);
  p.rect(7, 0, 1, 8, 'black');
  p.line(7, 8, 0, RADIO_H - 1, 'black').line(7, 8, 14, RADIO_H - 1, 'black');
  for (let y = 14, k = 0; y < RADIO_H - 4; y += 9, k++) {
    const half = (y - 8) * (7 / (RADIO_H - 9));
    const half2 = (y + 9 - 8) * (7 / (RADIO_H - 9));
    if (k & 1) p.line(Math.round(7 - half), y, Math.round(7 + half2), y + 9, 'black');
    else p.line(Math.round(7 + half), y, Math.round(7 - half2), y + 9, 'black');
  }
  radioArt = rimLit(p, false, 'blood0').toCanvas();
  return radioArt;
}

/** A red warning light: on for a third of each beat, or steady and dim with Reduce flashing on. */
function warning(ctx: Ctx, x: number, y: number, t: number, beat: number, phase: number): void {
  if (settings.reduceFlashing) { box(ctx, x, y, 1, 1, 'blood1'); return; }
  const on = (t + phase) % beat < beat / 3;
  box(ctx, x, y, 1, 1, on ? 'hot' : 'blood0');
  if (on) { box(ctx, x - 1, y, 1, 1, 'blood1'); box(ctx, x + 1, y, 1, 1, 'blood1'); }
}

/** The towers, behind the far tree line. Call after the sky and before the woods. */
export function skyline(ctx: Ctx, t: number): void {
  if (side() <= 0) return;
  const L = side();
  // The water tower stands just past the near pine to the right of the frame.
  if (L >= 60) {
    const x = sx(256 + 32), top = HORIZON + 2 - TOWER_H;
    ctx.drawImage(waterTower(), x, top);
    warning(ctx, x + 11, top - 1, t, 150, 0);
  }
  // The radio tower is further out, so it needs more room.
  if (L >= 124) {
    const x = sx(256 + 104), top = HORIZON + 4 - RADIO_H;
    ctx.drawImage(radioTower(), x, top);
    warning(ctx, x + 7, top - 1, t, 90, 0);
    warning(ctx, x + 7, top + 40, t, 90, 45);
  }
}

/** Screen x of each telephone pole on the left, nearest the frame first. */
function poles(): number[] {
  const out: number[] = [];
  for (let k = 0, fx = -64; sx(fx) > 4; k++, fx -= 58 + (hash2(k, 8, 9) % 9)) out.push(sx(fx));
  return out;
}
const POLE_H = 52, POLE_BASE = HORIZON + 8, ARM = 6;

/** A wire hanging between two points, sagging in the middle. */
function wire(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, sag: number): void {
  const a = Math.min(x0, x1), b = Math.max(x0, x1);
  for (let x = a; x <= b; x++) {
    const f = (x - x0) / (x1 - x0 || 1);
    box(ctx, x, Math.round(y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag), 1, 1, 'night');
  }
}

/** Telephone poles along the left, a fence strung with Christmas lights on the right. Call after the ground. */
export function sideProps(ctx: Ctx, t: number): void {
  if (side() <= 0) return;
  const L = side();
  // Poles: dark posts with a cross arm, lit on the right by the rift, and two wires running back to the woods.
  const xs = poles();
  const armY = POLE_BASE - POLE_H + 4;
  xs.forEach((x, i) => {
    box(ctx, x, POLE_BASE - POLE_H, 2, POLE_H, 'black');
    box(ctx, x + 2, POLE_BASE - POLE_H + 1, 1, POLE_H - 1, 'blood0');
    box(ctx, x - ARM, armY, ARM * 2 + 2, 1, 'black');
    box(ctx, x - ARM, armY - 1, 1, 1, 'grey1');
    box(ctx, x + ARM + 1, armY - 1, 1, 1, 'grey1');
    const toward = i === 0 ? sx(-18) : (xs[i - 1] as number);
    wire(ctx, x + ARM + 1, armY, toward - ARM, armY, i === 0 ? 3 : 5);
    wire(ctx, x + ARM + 1, armY + 3, toward - ARM, armY + 3, i === 0 ? 3 : 5);
  });
  const last = xs[xs.length - 1];
  if (last !== undefined && last - ARM > 0) {
    wire(ctx, 0, armY + 2, last - ARM, armY, 4);
    wire(ctx, 0, armY + 5, last - ARM, armY + 3, 4);
  }

  // The fence by the field to the right, with a string of bulbs drooping between its posts.
  const len = Math.min(88, L - 40);
  if (len >= 22) {
    const x0 = sx(256 + 34), base = 172, top = 160;
    box(ctx, x0, top + 3, len, 1, 'soil1');
    box(ctx, x0, top + 8, len, 1, 'soil1');
    const COLORS: ColorName[] = ['red', 'amber', 'leaf', 'sky', 'magenta'];
    const posts: number[] = [];
    for (let x = x0; x <= x0 + len; x += 11) posts.push(x);
    for (const x of posts) { box(ctx, x, top, 2, base - top, 'soil0'); box(ctx, x, top, 2, 1, 'soil2'); }
    let n = 0;
    for (let i = 0; i + 1 < posts.length; i++) {
      const a = (posts[i] as number) + 1, b = (posts[i + 1] as number) + 1;
      for (let x = a; x < b; x++) {
        const f = (x - a) / (b - a);
        const y = top - 1 + Math.round(Math.sin(f * Math.PI) * 3);
        box(ctx, x, y, 1, 1, 'grey1');
        if ((x - a) % 4 === 2) {
          const color = COLORS[n % COLORS.length] as ColorName;
          const dark = !settings.reduceFlashing && hash2(n, (t >> 4) + n, 21) % 11 === 0;
          box(ctx, x, y + 1, 1, 2, dark ? 'grey1' : color);
          n++;
        }
      }
    }
  }
}

/** Will's bike in the grass left of the frame, lamp still on, tall pines at the screen's edges, and fireflies over the
 * grass on both sides. Call last, so the near things cover the far ones. */
export function sideGround(ctx: Ctx, t: number): void {
  if (side() <= 0) return;
  const L = side();
  // With room to spare, the nearest pines of all frame the screen's edges.
  if (L >= 150) {
    pine(ctx, 8, 186, 116, 'ink');
    pine(ctx, SCREEN_W - 8, 186, 116, 'ink');
  }
  if (L >= 210) {
    pine(ctx, 34, 180, 100, 'ink');
    pine(ctx, SCREEN_W - 34, 180, 100, 'ink');
  }
  if (L >= 64) {
    const b = bike();
    drawProp(ctx, { id: 'title-bike', kind: 'bike', x: b.x, y: b.y, w: 16, h: 12, state: 'off', t: 0 }, true);
    box(ctx, b.x + 13, b.y + 1, 1, 1, 'cream');
  }
  // Fireflies only where the frame's own scene isn't.
  const n = Math.floor(L / 14);
  for (const right of [false, true]) {
    for (let i = 0; i < n; i++) {
      const s = hash2(i, right ? 2 : 1, 77);
      const blink = settings.reduceFlashing || ((t + (s % 240)) % 240) < 150;
      if (!blink) continue;
      const fx = 8 + (s % Math.max(1, L - 16));
      const x = Math.round((right ? sx(256) + fx : sx(-fx)) + Math.sin(t / 70 + i) * 3);
      const y = Math.round(HORIZON + 8 + ((s >> 8) % 44) + Math.sin(t / 50 + i * 1.7) * 2);
      box(ctx, x, y, 1, 1, ((t >> 3) + i) % 5 === 0 ? 'cream' : 'yellow');
    }
  }
}

/** Top-left of the bike, in screen px. */
function bike(): { x: number; y: number } {
  return { x: sx(-60), y: SCREEN_H - 30 };
}

/** The pool of light the bike's lamp throws on the grass, for paintGlow. None at 256. */
export function sideLights(): Glow[] {
  if (side() < 64) return [];
  const b = bike();
  const out: Glow[] = [{ x: b.x + 26, y: b.y + 8, r: 22, k: 0.75, flicker: 0.1 }];
  if (side() - 40 >= 22) out.push({ x: sx(256 + 34) + Math.min(88, side() - 40) / 2, y: 162, r: 26, k: 0.55, flicker: 0.25 });
  return out;
}
