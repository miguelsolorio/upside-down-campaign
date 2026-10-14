// Variant 3, "The other side": Hawkins at night on top, and the same town hanging upside down underneath it,
// rippling and turned red. The party stands on the seam. START tears the seam open.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import { PAL } from '../../gfx/palette.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { hash2 } from '../../gfx/canvas.ts';
import { drawLogo, drawText } from '../../gfx/index.ts';
import { bigText, box, dither } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { drawMenuBlock, promptOn } from './core.ts';
import type { TitleDesign, TitleView } from './core.ts';
import { bigActor, drift, pine, stars } from './art.ts';
import { launchLevel } from './timeline.ts';

const SEAM = 112;

// The Upside Down is the same picture turned into reds, so every pixel comes from this short ramp.
const RAMP: { max: number; color: ColorName }[] = [
  { max: 0.06, color: 'ink' }, { max: 0.14, color: 'blood0' }, { max: 0.28, color: 'blood1' },
  { max: 0.5, color: 'red' }, { max: 0.88, color: 'hot' }, { max: 2, color: 'pink' },
];
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const RAMP_RGB = RAMP.map((r) => rgb(PAL[r.color]));

let baked: HTMLCanvasElement | null = null;

/** The sky, the pines, the house and the tower never change, so they are drawn once. */
function bakeTown(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SCREEN_W;
  c.height = SEAM;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  box(ctx, 0, 0, SCREEN_W, SEAM, 'ink');
  dither(ctx, 0, 34, SCREEN_W, 30, 'night', 4);
  dither(ctx, 0, 64, SCREEN_W, 26, 'night', 2);
  box(ctx, 0, 90, SCREEN_W, SEAM - 90, 'night');
  dither(ctx, 0, 84, SCREEN_W, 6, 'night', 4);
  // A thin moon.
  box(ctx, 214, 22, 6, 6, 'bone');
  box(ctx, 216, 22, 4, 5, 'night');
  box(ctx, 217, 22, 3, 2, 'night');
  // Pines along the line, a house on the left and the water tower on the right.
  for (let i = 0, x = -4; x < SCREEN_W + 8; i++, x += 11 + (hash2(i, 2, 6) % 6)) {
    if (x > 18 && x < 56) continue;
    if (x > 200 && x < 252) continue;
    pine(ctx, x, SEAM, 24 + (hash2(i, 3, 6) % 20), 'ink');
  }
  box(ctx, 20, SEAM - 22, 32, 22, 'ink');
  for (let k = 0; k < 9; k++) box(ctx, 18 + k * 2, SEAM - 22 - k, 36 - k * 4, 1, 'ink');
  box(ctx, 33, SEAM - 8, 6, 8, 'soil0');
  // Water tower. Short on purpose, so its reflection stays clear of the prompt.
  box(ctx, 212, SEAM - 30, 2, 30, 'ink');
  box(ctx, 242, SEAM - 30, 2, 30, 'ink');
  for (let k = 0; k < 30; k += 2) { box(ctx, 214 + Math.round(k * 0.5), SEAM - 30 + k, 1, 2, 'ink'); box(ctx, 241 - Math.round(k * 0.5), SEAM - 30 + k, 1, 2, 'ink'); }
  box(ctx, 208, SEAM - 52, 40, 22, 'ink');
  box(ctx, 211, SEAM - 56, 34, 4, 'ink');
  drawText(ctx, 'HAWKINS', 228, SEAM - 46, 'dusk', { align: 'center' });
  box(ctx, 227, SEAM - 62, 2, 6, 'ink');
  return c;
}

/** What moves in the town: the stars, the lit windows and the light on the tower. */
function town(ctx: Ctx, t: number): void {
  baked ??= bakeTown();
  ctx.drawImage(baked, 0, 0);
  stars(ctx, t, 0, 70, 26, 21);
  const flick = settings.reduceFlashing || (t % 220) < 200;
  box(ctx, 26, SEAM - 14, 5, 5, flick ? 'amber' : 'orange');
  box(ctx, 41, SEAM - 14, 5, 5, 'amber');
  if (settings.reduceFlashing || (t % 90) < 50) box(ctx, 227, SEAM - 64, 2, 2, 'hot');
}

const PARTY = [{ id: 'dustin', x: 80 }, { id: 'mike', x: 112 }, { id: 'eleven', x: 144 }, { id: 'lucas', x: 176 }] as const;

let held: HTMLCanvasElement | null = null;

/** Copies the picture above the seam into the half below, upside down, with a ripple that grows with depth. */
function reflect(ctx: Ctx, t: number): void {
  // One snapshot of the top half. Copying rows from the screen into itself would snapshot it again for every row.
  if (!held) { held = document.createElement('canvas'); held.width = SCREEN_W; held.height = SEAM; }
  (held.getContext('2d') as CanvasRenderingContext2D).drawImage(ctx.canvas, 0, 0, SCREEN_W, SEAM, 0, 0, SCREEN_W, SEAM);
  box(ctx, 0, SEAM, SCREEN_W, SCREEN_H - SEAM, 'ink');
  for (let dy = 0; dy < SCREEN_H - SEAM; dy++) {
    const src = SEAM - 1 - dy;
    if (src < 0) break;
    const wob = settings.reduceFlashing ? 0 : Math.round(Math.sin(t / 22 + dy / 4.5) * Math.min(3, dy / 12));
    ctx.drawImage(held, 0, src, SCREEN_W, 1, wob, SEAM + dy, SCREEN_W, 1);
  }
  const img = ctx.getImageData(0, SEAM, SCREEN_W, SCREEN_H - SEAM);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.3 * (d[i] as number) + 0.59 * (d[i + 1] as number) + 0.11 * (d[i + 2] as number)) / 255;
    let k = 0;
    while (k < RAMP.length - 1 && l > (RAMP[k] as { max: number }).max) k++;
    const c = RAMP_RGB[k] as [number, number, number];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  ctx.putImageData(img, 0, SEAM);
}

function vines(ctx: Ctx, t: number): void {
  for (let i = 0; i < 11; i++) {
    const x0 = 10 + ((hash2(i, 7, 3) % 236));
    const len = 18 + (hash2(i, 8, 3) % 44);
    for (let y = 0; y < len; y++) {
      const x = x0 + Math.round(Math.sin(t / 34 + i * 1.3 + y / 9) * (1 + y / 9));
      const w = y < len * 0.5 ? 2 : 1;
      box(ctx, x, SEAM + 2 + y, w, 1, 'blood1');
      if (w === 2) box(ctx, x, SEAM + 2 + y, 1, 1, 'red');
      if (y % 11 === 6) box(ctx, x + (i & 1 ? 2 : -2), SEAM + 2 + y, 2, 1, 'blood1');
    }
    box(ctx, x0 + Math.round(Math.sin(t / 34 + i * 1.3 + len / 9) * (1 + len / 9)), SEAM + 2 + len, 1, 1, 'hot');
  }
}

/** The crack along the seam. It crackles, and at launch it opens up into white. */
function seam(ctx: Ctx, t: number, open: number): void {
  const calm = settings.reduceFlashing;
  for (let x = 0; x < SCREEN_W; x++) {
    const jag = (hash2(x >> 2, 3, 5) % 3) - 1;
    const spark = !calm && (hash2(x >> 3, t >> 2, 8) % 23) === 0;
    box(ctx, x, SEAM - 1 + jag, 1, 1, 'blood1');
    box(ctx, x, SEAM + jag, 1, 1, spark ? 'white' : 'hot');
    box(ctx, x, SEAM + 1 + jag, 1, 1, spark ? 'pink' : 'red');
  }
  if (open > 0) {
    const gap = Math.round(open * (SEAM + 8));
    box(ctx, 0, SEAM - gap - 2, SCREEN_W, 2, 'hot');
    box(ctx, 0, SEAM + gap, SCREEN_W, 2, 'hot');
    box(ctx, 0, SEAM - gap, SCREEN_W, gap * 2, open > 0.8 ? 'white' : 'cream');
    if (open < 0.8) dither(ctx, 0, SEAM - gap, SCREEN_W, gap * 2, 'white', 2);
  }
}

function prompt(ctx: Ctx, v: TitleView, cx: number, y: number): number {
  const sel = v.rows[0]?.selected ?? false;
  if (promptOn(v) || !sel) bigText(ctx, 'PRESS START', cx, y, sel ? 'white' : 'mist', 2);
  return 25;
}

export const riftDesign: TitleDesign = {
  id: 3,
  name: 'The other side',
  blurb: 'Hawkins on top, the Upside Down hanging beneath it as a rippling red reflection. START tears the seam open.',
  tradeoff: "The strongest single image and the most on theme. It reads pixels back every frame (the night stages already do) and the reflection is busy behind the prompt.",
  credit: { y: 213, color: 'red' },
  draw(ctx, v) {
    town(ctx, v.t);
    for (const p of PARTY) bigActor(ctx, p.id, p.x, SEAM, 2, v.t, { strained: p.id === 'eleven' });
    reflect(ctx, v.t);
    drift(ctx, v.t, SEAM + 4, SCREEN_H, 22, ['pink', 'hot', 'blood1', 'red'], -1, 4);
    vines(ctx, v.t);
    dither(ctx, 0, SCREEN_H - 44, SCREEN_W, 44, 'ink', 4);
    dither(ctx, 0, SCREEN_H - 20, SCREEN_W, 20, 'ink', 2);
    seam(ctx, v.t, launchLevel(v.launch));
    drawLogo(ctx, v.t, 128, 12);
    if (v.launch === 0 || launchLevel(v.launch) < 0.3) drawMenuBlock(ctx, v, 128, 158, { prompt, rowH: 13 });
    // The last frames are all light, logo included, so nothing is left to cut away from.
    if (launchLevel(v.launch) > 0.85) box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'white');
  },
};
