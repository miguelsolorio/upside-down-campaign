// Variant 5, "Tape night": a quiet, mostly empty frame, like a VHS tape paused on its title card. A PLAY mark
// in the corner, a tape counter, tracking glitches that roll up the picture. START is a CRT switching off.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { hash2 } from '../../gfx/canvas.ts';
import { drawLogo, drawText } from '../../gfx/index.ts';
import { bigText, box, dither } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { drawMenuBlock, promptOn } from './core.ts';
import type { TitleDesign, TitleView } from './core.ts';
import { playTriangle } from './art.ts';
import { launchLevel, tapeClock } from './timeline.ts';

let scratch: HTMLCanvasElement | null = null;

/** Shifts each row of a band sideways by dx(row). Rows that slide away leave their old pixels behind. */
function shiftRows(ctx: Ctx, y0: number, y1: number, dx: (row: number) => number): void {
  const top = Math.max(0, y0), bottom = Math.min(SCREEN_H, y1);
  const h = bottom - top;
  if (h <= 0) return;
  scratch ??= document.createElement('canvas');
  scratch.width = SCREEN_W;
  scratch.height = h;
  const s = scratch.getContext('2d') as CanvasRenderingContext2D;
  s.drawImage(ctx.canvas, 0, top, SCREEN_W, h, 0, 0, SCREEN_W, h);
  for (let r = 0; r < h; r++) ctx.drawImage(scratch, 0, r, SCREEN_W, 1, dx(r), top + r, SCREEN_W, 1);
}

/** Text with the color fringe a tape gives it: a cyan ghost to the left, a red one to the right. */
function osd(ctx: Ctx, text: string, x: number, y: number, scale: number, align: 'left' | 'center' | 'right', color: ColorName = 'white'): void {
  bigText(ctx, text, x - 1, y, 'cyan', scale, align, false);
  bigText(ctx, text, x + 1, y, 'hot', scale, align, false);
  bigText(ctx, text, x, y, color, scale, align, false);
}

function backdrop(ctx: Ctx, t: number): void {
  box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
  // A soft, slow band of lighter picture rolling down the frame.
  const roll = Math.floor((t * 0.35) % (SCREEN_H + 60)) - 40;
  dither(ctx, 0, roll, SCREEN_W, 14, 'night', 4);
  dither(ctx, 0, roll + 14, SCREEN_W, 10, 'night', 2);
  dither(ctx, 0, roll + 24, SCREEN_W, 6, 'night', 4);
  // The logo's red light on the glass: two dithered ovals, one inside the other.
  for (let y = 54; y <= 126; y++) {
    const u = (y - 90) / 38;
    const w = Math.round(112 * Math.sqrt(Math.max(0, 1 - u * u)));
    if (w > 0) dither(ctx, 128 - w, y, w * 2, 1, 'blood0', 4);
    const w2 = Math.round(84 * Math.sqrt(Math.max(0, 1 - (u * 1.35) * (u * 1.35))));
    if (w2 > 0) dither(ctx, 128 - w2, y, w2 * 2, 1, 'blood0', 2);
  }
  // Dark in the corners.
  dither(ctx, 0, 0, SCREEN_W, 8, 'black', 2);
  dither(ctx, 0, SCREEN_H - 12, SCREEN_W, 12, 'black', 2);
  dither(ctx, 0, 0, 8, SCREEN_H, 'black', 4);
  dither(ctx, SCREEN_W - 8, 0, 8, SCREEN_H, 'black', 4);
}

/** Dashes of snow. They change every few frames, and hold still when Reduce flashing is on. */
function snow(ctx: Ctx, t: number, amount: number): void {
  const step = settings.reduceFlashing ? 0 : t >> 1;
  for (let i = 0; i < amount; i++) {
    const h = hash2(i, step, 41);
    const w = 2 + (h >> 9) % 9;
    const c: ColorName = h % 7 === 0 ? 'bone' : h % 3 === 0 ? 'grey2' : 'grey1';
    box(ctx, h % SCREEN_W, (h >> 8) % SCREEN_H, w, 1, c);
  }
}

function prompt(ctx: Ctx, v: TitleView, cx: number, y: number): number {
  const sel = v.rows[0]?.selected ?? false;
  if (promptOn(v) || !sel) osd(ctx, 'PRESS START', cx, y, 2, 'center', sel ? 'white' : 'mist');
  return 28;
}

export const vhsDesign: TitleDesign = {
  id: 5,
  name: 'Tape night',
  blurb: 'Almost nothing on screen: the logo, one prompt, a VHS PLAY mark and a tape counter. START switches the set off.',
  tradeoff: "The quietest and cheapest, with the most room around the logo. The least game-like: nothing on it says action RPG.",
  credit: { y: 202, color: 'mist' },
  tag: { x: SCREEN_W - 12, y: 32 },
  draw(ctx, v) {
    const lv = launchLevel(v.launch);
    backdrop(ctx, v.t);
    snow(ctx, v.t, 30 + Math.round(lv * 90));
    drawLogo(ctx, v.t, 128, 70);
    drawMenuBlock(ctx, v, 128, 128, { prompt, rowH: 13 });

    // The corner marks of a VCR on-screen display.
    osd(ctx, 'PLAY', 14, 10, 2, 'left');
    playTriangle(ctx, 66, 11, 12, 'white');
    drawText(ctx, 'SP', SCREEN_W - 12, 10, 'bone', { align: 'right', shadow: true });
    drawText(ctx, tapeClock(v.t), SCREEN_W - 12, 19, 'bone', { align: 'right', shadow: true });

    // Tracking trouble: a band of torn rows rolls up every few seconds, and the bottom edge always wobbles.
    const cycle = v.t % 480;
    const burst = v.launch > 0 ? 1 : cycle < 70 ? 1 : 0;
    if (burst) {
      const p = v.launch > 0 ? (v.launch * 6) % (SCREEN_H + 30) : (cycle / 70) * (SCREEN_H + 30);
      const y = Math.round(SCREEN_H + 14 - p);
      const amp = 4 + lv * 10;
      shiftRows(ctx, y - 10, y + 12, (r) => Math.round(Math.sin(r * 0.9 + v.t * 0.5) * amp * (1 - Math.abs(r - 11) / 14)));
      for (let i = 0; i < 26; i++) { const h = hash2(i, v.t, 77); box(ctx, h % SCREEN_W, y - 2 + (h >> 8) % 7, 8 + (h >> 4) % 22, 1, h % 4 ? 'grey3' : 'white'); }
    }
    if (!settings.reduceFlashing) shiftRows(ctx, SCREEN_H - 7, SCREEN_H, (r) => (hash2(r, v.t >> 1, 9) % 9) - 4 + Math.round(Math.sin(v.t / 9 + r) * 2));

    // The set switches off: the picture folds to a line, then a dot.
    if (lv > 0.35) {
      const k = Math.min(1, (lv - 0.35) / 0.55);
      const h = Math.round(k * (SCREEN_H / 2 - 1));
      box(ctx, 0, 0, SCREEN_W, h, 'black');
      box(ctx, 0, SCREEN_H - h, SCREEN_W, h, 'black');
      if (k < 1) box(ctx, 0, SCREEN_H / 2 - 1, SCREEN_W, 2, 'white');
      else {
        box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
        const w = Math.max(2, Math.round((1 - (lv - 0.9) * 10) * 40));
        box(ctx, SCREEN_W / 2 - w / 2, SCREEN_H / 2 - 1, w, 2, 'white');
      }
    }
  },
};
