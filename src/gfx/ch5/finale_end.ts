// The ending (stage 5.3, docs/chapter-5.md, "The ending"): the basement in 1987 for the epilogue, and the THE END card over it. It is the
// prologue's basement (story/basement.ts), four years on, drawn in the way of epilogue_room.ts, rectangles and dithers in the game's
// palette at 1x on a 256 by 224 frame, the wall and floor running to the edges of a wider screen and the set centered in the frame
// (frameX is a multiple of 4). The dialogue box covers y 169 and below, so everything that matters is above it. The same paneled wall,
// the same rug, the same window and dragon poster and stairs, and what has changed: a Hellfire pennant on the wall and a guitar in the
// corner that nobody plays, the table with a closed campaign book on it and one die, and the party round it, Mike behind the book, Dustin
// and Lucas beside him, Will and Max at the ends, Eleven in the near chair with her back to us. drawEndingRoom paints it, endingStill
// keeps one canvas per width so a frame costs a blit, and drawTheEnd lays the card on it: the room dimmed in dither, a pool of light left
// on the table where the die lies, THE END in the big pixel type (the 5 by 7 font at 4x), and a glint that crosses the die. Pure drawing.
import { settings } from '../../core/settings.ts';
import { BAYER4, ctx2d, makeCanvas } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText } from '../font.ts';
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { PARTY, heroPx } from './finale_party.ts';

const H = 224;
const r = (ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void => { ctx.fillStyle = PAL[c]; ctx.fillRect(x, y, w, h); };
const dots = (ctx: Ctx, pts: readonly (readonly [number, number])[], c: ColorName): void => { ctx.fillStyle = PAL[c]; for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1); };

/** A Bayer dither of one color: `level` of every 16 pixels, 8 being a checkerboard. Anchored to the canvas, so it never shimmers. */
function dith(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName, level: number): void {
  ctx.fillStyle = PAL[c];
  for (let j = y; j < y + h; j++) {
    let run = -1;
    for (let i = x; i <= x + w; i++) {
      const on = i < x + w && (BAYER4[((j & 3) << 2) | (i & 3)] as number) < level;
      if (on && run < 0) run = i;
      else if (!on && run >= 0) { ctx.fillRect(run, j, i - run, 1); run = -1; }
    }
  }
}

// ---------------------------------------------------------------- the shell
/** The paneled wall with its plank seams, the beam, the baseboard and the floor with its boards, across the whole screen. The seams line up with the set's. */
function drawShell(ctx: Ctx, screenW: number, frameX: number): void {
  r(ctx, 0, 0, screenW, 90, 'soil1');
  for (let x = (frameX % 12) - 12; x < screenW; x += 12) {
    r(ctx, x, 12, 1, 74, 'soil0');
    if ((Math.round((x - frameX) / 12) & 1) === 0) r(ctx, x + 1, 12, 1, 74, 'soil2');
  }
  r(ctx, 0, 0, screenW, 10, 'ink');
  r(ctx, 0, 10, screenW, 2, 'soil0');
  r(ctx, 0, 86, screenW, 5, 'soil0');
  r(ctx, 0, 86, screenW, 1, 'soil2');
  r(ctx, 0, 91, screenW, H - 91, 'shadow');
  r(ctx, 0, 91, screenW, 2, 'night');
  for (let y = 99; y < H; y += 8) r(ctx, 0, y, screenW, 1, 'night');
}

// ---------------------------------------------------------------- on the wall
/** Rug under the table. */
function drawRug(ctx: Ctx): void {
  r(ctx, 44, 98, 168, 74, 'amber');
  r(ctx, 46, 100, 164, 70, 'blood1');
  r(ctx, 50, 104, 156, 62, 'blood0');
  for (let x = 58; x < 200; x += 12) { r(ctx, x, 101, 4, 2, 'rose'); r(ctx, x, 167, 4, 2, 'rose'); }
}

/** The small high window with its moon, the dragon poster and the stairs going up on the right, as the prologue has them. */
function drawWall(ctx: Ctx): void {
  r(ctx, 12, 18, 32, 28, 'soil3');
  r(ctx, 14, 20, 28, 24, 'night');
  r(ctx, 27, 20, 2, 24, 'soil3');
  r(ctx, 14, 31, 28, 2, 'soil3');
  r(ctx, 32, 23, 4, 4, 'cream');
  dots(ctx, [[18, 24], [21, 38], [38, 37], [17, 35], [33, 40]], 'bone');
  r(ctx, 148, 20, 28, 36, 'cream');
  r(ctx, 150, 22, 24, 32, 'dusk');
  r(ctx, 164, 25, 6, 6, 'yellow');
  r(ctx, 150, 46, 24, 8, 'ink');
  r(ctx, 155, 38, 12, 8, 'red');
  r(ctx, 153, 34, 7, 6, 'red');
  r(ctx, 151, 36, 3, 2, 'hot');
  r(ctx, 155, 35, 1, 1, 'yellow');
  r(ctx, 162, 31, 8, 7, 'blood1');
  r(ctx, 166, 28, 4, 4, 'blood1');
  r(ctx, 206, 22, 50, 64, 'ink');
  for (let i = 0; i < 8; i++) {
    const x = 208 + i * 6, top = 82 - i * 7;
    r(ctx, x, top, 6, 86 - top, 'soil1');
    r(ctx, x, top, 6, 2, 'soil3');
    r(ctx, x, top + 2, 1, 84 - top, 'soil0');
    r(ctx, x, top - 9, 6, 1, 'soil3');
    if ((i & 1) === 0) r(ctx, x + 2, top - 9, 1, 9, 'soil2');
  }
  r(ctx, 238, 22, 18, 2, 'amber');
  r(ctx, 240, 24, 14, 1, 'orange');
}

/** What has changed in four years: the Hellfire Club's pennant on the wall, a red banner with a skull and a flame, and Eddie's guitar leaning in the corner, its strap hanging. */
function drawKeepsakes(ctx: Ctx): void {
  r(ctx, 60, 12, 24, 2, 'soil3');
  for (let y = 0; y < 30; y++) {
    const notch = y > 24 ? y - 24 : 0;
    r(ctx, 62, 14 + y, 20, 1, 'ink');
    r(ctx, 63 + notch, 14 + y, 18 - notch * 2, 1, y < 2 || notch > 0 && notch < 6 ? 'blood0' : 'red');
  }
  r(ctx, 63, 14, 18, 1, 'hot');
  r(ctx, 69, 19, 6, 5, 'bone');
  r(ctx, 70, 24, 4, 2, 'bone');
  r(ctx, 70, 21, 1, 2, 'ink');
  r(ctx, 73, 21, 1, 2, 'ink');
  r(ctx, 71, 25, 2, 1, 'ink');
  dots(ctx, [[72, 31], [71, 32], [73, 32], [72, 33], [72, 30]], 'amber');
  // The guitar: a body and a waist in red, a pickguard, a neck up to the wall and a head on it.
  r(ctx, 17, 74, 9, 12, 'ink');
  r(ctx, 18, 75, 7, 10, 'red');
  r(ctx, 18, 75, 2, 10, 'hot');
  r(ctx, 24, 76, 1, 9, 'blood1');
  r(ctx, 17, 78, 1, 3, 'ink');
  r(ctx, 25, 78, 1, 3, 'ink');
  r(ctx, 20, 80, 3, 3, 'ink');
  r(ctx, 21, 81, 1, 1, 'bone');
  r(ctx, 20, 62, 3, 13, 'ink');
  r(ctx, 21, 62, 1, 13, 'soil2');
  r(ctx, 19, 58, 5, 5, 'ink');
  r(ctx, 20, 59, 3, 3, 'soil1');
  dots(ctx, [[20, 60], [22, 60]], 'amber');
}

// ---------------------------------------------------------------- the table
/** The table: top, front, legs and its shadow, with the map under the book and the snacks on the far end. */
function drawTable(ctx: Ctx): void {
  r(ctx, 92, 134, 72, 4, 'ink');
  dith(ctx, 90, 136, 76, 3, 'ink', 8);
  r(ctx, 92, 128, 4, 9, 'soil1');
  r(ctx, 160, 128, 4, 9, 'soil1');
  r(ctx, 92, 128, 1, 9, 'soil0');
  r(ctx, 160, 128, 1, 9, 'soil0');
  r(ctx, 88, 104, 80, 24, 'soil3');
  r(ctx, 88, 104, 80, 1, 'sand');
  r(ctx, 88, 128, 80, 3, 'soil2');
  r(ctx, 88, 131, 80, 1, 'soil0');
  for (const [gx, gy, gw] of [[96, 108, 18], [140, 124, 20], [150, 112, 12]] as const) r(ctx, gx, gy, gw, 1, 'soil2');
  // The map, rolled out and a little crumpled, and the campaign's last page showing at its corner.
  r(ctx, 96, 111, 30, 14, 'sand');
  r(ctx, 97, 112, 28, 12, 'cream');
  r(ctx, 97, 112, 28, 1, 'bone');
  for (const [px, py] of [[100, 120], [103, 119], [106, 121], [102, 122]] as const) r(ctx, px, py, 2, 2, 'pine2');
  r(ctx, 112, 116, 7, 4, 'ink');
  dots(ctx, [[114, 117], [116, 117], [115, 118]], 'hot');
  // Snacks at the far end: a bowl of chips and a can.
  r(ctx, 152, 107, 10, 4, 'grey2');
  r(ctx, 153, 108, 8, 2, 'grey1');
  for (const [cx, cy] of [[153, 105], [156, 104], [159, 105]] as const) r(ctx, cx, cy, 3, 3, 'amber');
  r(ctx, 156, 115, 4, 7, 'red');
  r(ctx, 156, 115, 4, 1, 'grey3');
  r(ctx, 157, 117, 2, 1, 'white');
}

/** The campaign book, closed: a red cover with a gold border and a clasp, a dark spine on the left, the pages showing at the foot. About 20 by 13. */
function drawBook(ctx: Ctx, x: number, y: number): void {
  r(ctx, x + 1, y + 13, 20, 2, 'soil1');
  r(ctx, x, y, 20, 12, 'ink');
  r(ctx, x + 1, y + 1, 18, 10, 'blood1');
  r(ctx, x + 1, y + 1, 4, 10, 'blood0');
  r(ctx, x + 5, y + 1, 14, 1, 'red');
  r(ctx, x + 6, y + 3, 11, 6, 'amber');
  r(ctx, x + 7, y + 4, 9, 4, 'blood0');
  r(ctx, x + 10, y + 5, 3, 2, 'amber');
  r(ctx, x + 11, y + 5, 1, 2, 'yellow');
  r(ctx, x + 1, y + 11, 18, 1, 'cream');
  r(ctx, x + 1, y + 12, 19, 1, 'bone');
  r(ctx, x + 18, y + 4, 2, 3, 'amber');
  r(ctx, x + 4, y + 1, 1, 10, 'amber');
}

const DIE = [
  '...kkk...',
  '..kwwwk..',
  '.kwwlwwk.',
  'kwwlwlwwk',
  'kwlwwwlwk',
  'kwlllllwk',
  'kwwlwlwwk',
  '.kwwlwwk.',
  '..kgwgk..',
  '...kkk...',
];
const DIE_MAP: Record<string, ColorName> = { k: 'ink', w: 'white', l: 'grey3', g: 'bone' };

/** The d20 lying on the table, face up, 9 by 10, with its shadow. */
function drawDieAt(ctx: Ctx, x: number, y: number): void {
  r(ctx, x + 1, y + 10, 9, 1, 'soil1');
  r(ctx, x + 2, y + 11, 7, 1, 'soil2');
  DIE.forEach((row, j) => { for (let i = 0; i < 9; i++) { const c = DIE_MAP[row[i] as string]; if (c) r(ctx, x + i, y + j, 1, 1, c); } });
}

/** A chair back and seat seen from behind, at the feet (x, y): Eleven's, with her back to us. */
function drawChairBack(ctx: Ctx, x: number, y: number): void {
  r(ctx, x - 8, y - 9, 16, 3, 'soil2');
  r(ctx, x - 8, y - 9, 16, 1, 'soil3');
  r(ctx, x - 8, y - 6, 2, 8, 'soil1');
  r(ctx, x + 6, y - 6, 2, 8, 'soil1');
}

/** A sprite with its feet at (x, y) and a flat shadow under it. */
function seat(ctx: Ctx, p: Px, x: number, y: number): void {
  ctx.drawImage(new Px(14, 3).ellipse(7, 1.5, 7, 1.5, 'night').toCanvas(), x - 7, y - 1);
  ctx.drawImage(p.toCanvas(), x - 8, y - 14);
}

/** The hanging lamp and its light: the cord, the shade, a cone down to the table and a pool on it. */
function drawLamp(ctx: Ctx): void {
  r(ctx, 127, 10, 2, 31, 'ink');
  dith(ctx, 124, 52, 8, 4, 'cream', 4);
  for (let i = 0; i < 28; i++) { const half = 6 + Math.round(i * 1.3); dith(ctx, 128 - half, (56 + i * 1.5) | 0, half * 2, 2, 'cream', 1); }
  dith(ctx, 80, 130, 96, 14, 'yellow', 2);
  for (let i = 0; i < 5; i++) r(ctx, 128 - (4 + i * 2), 40 + i * 2, 8 + i * 4, 2, i === 4 ? 'amber' : 'orange');
  r(ctx, 116, 50, 24, 1, 'soil2');
  r(ctx, 124, 51, 8, 2, 'cream');
  r(ctx, 126, 53, 4, 1, 'white');
}

/** The set, in frame px (0 to 256), over the shell. */
function drawSet(ctx: Ctx): void {
  drawRug(ctx);
  drawWall(ctx);
  drawKeepsakes(ctx);
  const far = 107;
  seat(ctx, heroPx(PARTY.dustin, 'down'), 100, far);
  seat(ctx, heroPx(PARTY.lucas, 'down'), 156, far);
  seat(ctx, heroPx(PARTY.mike, 'down'), 128, far);
  seat(ctx, heroPx(PARTY.will, 'right'), 78, 126);
  seat(ctx, heroPx(PARTY.max, 'left'), 178, 126);
  drawTable(ctx);
  drawBook(ctx, 118, 112);
  drawDieAt(ctx, 144, 114);
  drawChairBack(ctx, 128, 154);
  seat(ctx, heroPx(PARTY.eleven, 'up'), 128, 150);
  drawChairBack(ctx, 128, 154);
  drawLamp(ctx);
}

/** The whole room on a screen `screenW` wide, the set centered at `frameX`. */
export function drawEndingRoom(ctx: Ctx, screenW: number, frameX: number): void {
  drawShell(ctx, screenW, frameX);
  ctx.save();
  ctx.translate(frameX, 0);
  drawSet(ctx);
  ctx.restore();
}

let still: { c: HTMLCanvasElement; key: string } | null = null;
/** The room drawn once into a canvas for a screen this wide, so a frame costs one blit. */
export function endingStill(screenW: number, frameX: number): HTMLCanvasElement {
  const key = `${screenW}:${frameX}`;
  if (still?.key === key) return still.c;
  const c = makeCanvas(screenW, H);
  drawEndingRoom(ctx2d(c), screenW, frameX);
  still = { c, key };
  return c;
}

// ---------------------------------------------------------------- the card
const STEPS = 6;
const dims = new Map<string, HTMLCanvasElement>();

/** The dimming, in dither: dark everywhere but a pool round the table, ink thickening to black at the corners. `step` 1 to STEPS scales it up from nothing. */
function dimLayer(screenW: number, frameX: number, step: number): HTMLCanvasElement {
  const key = `${screenW}:${frameX}:${step}`;
  let c = dims.get(key);
  if (c) return c;
  const px = new Px(screenW, H), cx = frameX + 128, cy = 118, k = step / STEPS;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < screenW; x++) {
      const d = Math.hypot((x - cx) / 1.5, y - cy) / 70, v = Math.min(0.9, 0.34 + Math.max(0, d - 0.3) * 0.5) * k, b = ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;
      if (b < v) px.set(x, y, v > 0.7 && b < v - 0.55 ? 'black' : 'ink');
    }
  }
  c = px.toCanvas();
  dims.set(key, c);
  return c;
}

/** Text at a whole-number scale, the way the UI's bigText draws it: the 5 by 7 font scaled up. */
function big(ctx: Ctx, text: string, x: number, y: number, color: ColorName, scale: number): void {
  ctx.save();
  ctx.scale(scale, scale);
  drawText(ctx, text, x / scale, y / scale, color, { align: 'center' });
  ctx.restore();
}

const RAMP: ColorName[] = ['ink', 'night', 'shadow', 'dusk', 'slate', 'mist', 'bone', 'white'];

/**
 * The THE END card over the basement: the room dimmed, the table still lit, THE END in the big pixel type with a red shadow, and a glint
 * crossing the die. `level` 0 to 1 fades the dimming and the title in, in steps. t drives the glint, which holds still when flashing is reduced.
 */
export function drawTheEnd(ctx: Ctx, screenW: number, frameX: number, t = 0, level = 1): void {
  ctx.drawImage(endingStill(screenW, frameX), 0, 0);
  const step = Math.round(Math.max(0, Math.min(1, level)) * STEPS);
  if (step === 0) return;
  ctx.drawImage(dimLayer(screenW, frameX, step), 0, 0);
  // The die and the book stay bright on the table: they are drawn again over the dimming's pool, with a glint across the die.
  ctx.save();
  ctx.translate(frameX, 0);
  const g = settings.reduceFlashing ? 3 : (t >> 2) % 24;
  drawBook(ctx, 118, 112);
  drawDieAt(ctx, 144, 114);
  if (g < 7) { r(ctx, 145 + g, 115 + (g >> 1), 1, 1, 'white'); if (g > 1 && g < 6) r(ctx, 145 + g - 1, 115 + (g >> 1), 3, 1, 'white'); }
  ctx.restore();
  const face = RAMP[Math.min(RAMP.length - 1, Math.round(Math.min(1, level) * (RAMP.length - 1)))] as ColorName;
  big(ctx, 'THE END', frameX + 132, 50, step < 3 ? 'blood0' : 'blood1', 4);
  big(ctx, 'THE END', frameX + 128, 46, face, 4);
}
