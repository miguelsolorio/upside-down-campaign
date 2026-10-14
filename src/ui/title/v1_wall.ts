// Variant 1, "Right here": Joyce's wall is the whole screen. Christmas lights swag across the top, the wall
// spells RIGHT HERE one letter at a time and then RUN, and the prompt is spelled out in the same letters and bulbs.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { drawAlphabetWall, drawIcon, drawLogo, drawText } from '../../gfx/index.ts';
import { box, dither, outline } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { drawMenuBlock, fadeOut, promptOn } from './core.ts';
import type { TitleDesign, TitleView } from './core.ts';
import { drift, lightString } from './art.ts';
import { launchLevel, wallMessageLit } from './timeline.ts';

const BULB = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'] as const;
const LETTER: ColorName[] = ['hot', 'yellow', 'leaf', 'sky'];
const PANEL = { x: 36, y: 76, w: 184, h: 56 };

function wallpaper(ctx: Ctx): void {
  box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'night');
  for (let x = 0; x < SCREEN_W; x += 8) box(ctx, x, 0, 1, SCREEN_H, 'shadow');
  // Small flowers in a staggered grid, the way a 1983 kitchen would have had them.
  for (let y = 6; y < SCREEN_H; y += 16) {
    for (let x = 4 + ((y >> 4) & 1) * 8; x < SCREEN_W; x += 16) {
      box(ctx, x, y, 2, 2, 'dusk');
      box(ctx, x - 1, y + 1, 1, 1, 'shadow');
      box(ctx, x + 2, y, 1, 1, 'shadow');
    }
  }
  // The room is dark at the edges and the lights make the middle brighter.
  dither(ctx, 0, 0, SCREEN_W, 10, 'ink', 4);
  dither(ctx, 0, SCREEN_H - 44, SCREEN_W, 44, 'ink', 4);
  dither(ctx, 0, SCREEN_H - 20, SCREEN_W, 20, 'ink', 2);
  dither(ctx, 0, 0, 10, SCREEN_H, 'ink', 4);
  dither(ctx, SCREEN_W - 10, 0, 10, SCREEN_H, 'ink', 4);
}

function panel(ctx: Ctx): void {
  const { x, y, w, h } = PANEL;
  box(ctx, x - 2, y - 2, w + 4, h + 4, 'ink');
  box(ctx, x, y, w, h, 'soil0');
  for (let px = x + 4; px < x + w; px += 8) box(ctx, px, y + 1, 1, h - 2, 'soil1');
  for (let py = y + 5; py < y + h - 2; py += 12) {
    for (let px = x + 8 + (((py - y) / 12) & 1) * 8; px < x + w - 4; px += 16) box(ctx, px, py, 2, 2, 'soil2');
  }
  outline(ctx, x, y, w, h, 'soil1');
  outline(ctx, x - 1, y - 1, w + 2, h + 2, 'soil2');
}

/** PRESS START in wall letters, a bulb under each, the bulbs chasing along the row. */
function bulbPrompt(ctx: Ctx, v: TitleView, cx: number, y: number): number {
  const text = 'PRESS START';
  const pitch = 12;
  const x0 = Math.round(cx - (text.length * pitch) / 2);
  const selected = (v.rows[0]?.selected ?? false) || v.launch > 0;
  const go = v.launch > 0;
  box(ctx, x0 + 2, y + 9, text.length * pitch - 4, 1, 'grey1');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    const x = x0 + i * pitch;
    const k = i & 3;
    if (ch === ' ') { box(ctx, x, y + 9, pitch, 1, 'grey2'); continue; }
    box(ctx, x, y + 9, pitch, 1, 'grey2');
    const wave = settings.reduceFlashing ? true : ((((v.t >> 2) - i) % 14) + 14) % 14 < 5;
    const lit = go ? ((v.launch + i) & 3) !== 0 : selected && (wave || !promptOn(v));
    const color: ColorName = go ? 'white' : lit ? (LETTER[k] as ColorName) : selected ? 'mist' : 'slate';
    drawText(ctx, ch, x + 3, y, color, { shadow: true });
    drawIcon(ctx, lit ? (BULB[k] as typeof BULB[number]) : 'bulbOff', x + 2, y + 9, v.t + i * 13);
  }
  return 26;
}

export const wallDesign: TitleDesign = {
  id: 1,
  name: 'Right here',
  blurb: "Joyce's wall fills the screen. It spells RIGHT HERE, then RUN, and the prompt lights up the same way.",
  tradeoff: "Closest to the screen you have now, so the safest pick. It leans on the show's best-known moment and adds the least that is new.",
  tag: { x: SCREEN_W - 5, y: 15 },
  draw(ctx, v) {
    wallpaper(ctx);
    drift(ctx, v.t, 14, SCREEN_H - 20, 16, ['blood1', 'blood0'], -1, 3);
    lightString(ctx, -6, 134, 0, 8, v.t, { chase: true });
    lightString(ctx, 122, SCREEN_W + 6, 0, 8, v.t + 40, { chase: true });
    drawLogo(ctx, v.t, 128, 26);
    panel(ctx);
    drawAlphabetWall(ctx, PANEL.x + 14, PANEL.y + 9, v.launch > 0 ? 'RUN' : wallMessageLit(v.t), v.t);
    drawMenuBlock(ctx, v, 128, 156, { prompt: bulbPrompt });
    fadeOut(ctx, launchLevel(v.launch) > 0.5 ? (launchLevel(v.launch) - 0.5) * 2 : 0);
  },
};
