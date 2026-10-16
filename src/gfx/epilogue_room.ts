// Eleven's room the morning after, the still behind chapter three's epilogue, where she reads Hopper's letter
// (docs/level-9.md, "What UI builds"). Rectangles and dithers in the game's palette at 1x, laid out for a 256 by 224 frame like the
// basement's set: the wall and floor run to the edges of a wider screen (the shell), and the set sits centered in the frame.
// The dialogue box covers y 169 and below, so everything that matters is above that. `sky` is how far the night has gone:
// 0 is the dark with its last stars, 1 the grey before the sun and 2 the first color. Eleven is drawn small, seated, from rectangles.
import { BAYER4, ctx2d, makeCanvas } from './canvas.ts';
import { PAL } from './palette.ts';
import type { ColorName } from './palette.ts';

type Ctx = CanvasRenderingContext2D;
export type Sky = 0 | 1 | 2;

/** The screen's height, and where the floor starts (the baseboard is the 4 px above). */
const H = 224;
const FLOOR_Y = 88;
/** The bed's feet, and so the line Eleven's shoes rest on. The blanket she sits on is at BED_TOP. */
const BED_FEET = 111;
const BED_TOP = 96;
/** Her center column. */
const EL_X = 140;

function r(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void {
  ctx.fillStyle = PAL[c];
  ctx.fillRect(x, y, w, h);
}

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

/** Pixels from a list of [x, y] pairs. */
function dots(ctx: Ctx, pts: readonly (readonly [number, number])[], c: ColorName): void {
  ctx.fillStyle = PAL[c];
  for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1);
}

// ---------------------------------------------------------------- the shell
/** The papered wall with its pinstripes, the crown, the wainscot, the baseboard and the plank floor, across the whole screen in
 * screen px. The stripes and the plank ends line up with the frame, so the room carries on past the set without a join. */
function drawShell(ctx: Ctx, screenW: number, frameX: number): void {
  r(ctx, 0, 0, screenW, FLOOR_Y, 'dusk');
  for (let x = frameX % 8; x < screenW; x += 8) r(ctx, x, 6, 1, 66, 'shadow');
  r(ctx, 0, 0, screenW, 5, 'night');
  r(ctx, 0, 5, screenW, 1, 'slate');
  dith(ctx, 0, 6, screenW, 3, 'night', 6);
  // The wainscot under the chair rail, in panels.
  r(ctx, 0, 72, screenW, 1, 'slate');
  r(ctx, 0, 73, screenW, 11, 'shadow');
  for (let x = frameX % 16; x < screenW; x += 16) r(ctx, x, 75, 1, 7, 'dusk');
  r(ctx, 0, 84, screenW, 4, 'soil0');
  r(ctx, 0, 84, screenW, 1, 'soil1');
  // Planks run left to right, 8 px a row, with their ends staggered.
  r(ctx, 0, FLOOR_Y, screenW, H - FLOOR_Y, 'soil1');
  for (let y = FLOOR_Y, row = 0; y < H; y += 8, row++) {
    r(ctx, 0, y, screenW, 1, 'soil0');
    for (let x = frameX + ((row * 29) % 56) - 56; x < screenW; x += 56) if (x >= 0) r(ctx, x, y + 1, 1, 7, 'soil0');
  }
  dith(ctx, 0, FLOOR_Y + 1, screenW, 2, 'soil0', 8);
}

// ---------------------------------------------------------------- the window
const WIN = { x: 14, y: 10, w: 48, h: 52 };
/** The glass, from the top of the sky to the treeline. Each band melts into the next through a three row dither. */
const SKY_BANDS: Record<Sky, readonly ColorName[]> = {
  0: ['ink', 'night', 'night', 'shadow', 'dusk', 'dusk'],
  1: ['night', 'shadow', 'dusk', 'slate', 'mist', 'rose', 'rose'],
  2: ['dusk', 'slate', 'slate', 'mist', 'mist', 'pink', 'orange', 'amber'],
};
/** The last stars. By the first light there is one left. */
const STARS: Record<Sky, readonly (readonly [number, number])[]> = {
  0: [[21, 17], [29, 21], [51, 16], [45, 29], [25, 31], [55, 25], [47, 41]],
  1: [[29, 21], [51, 16], [45, 29]],
  2: [[51, 16]],
};
const STAR_COLOR: Record<Sky, ColorName> = { 0: 'white', 1: 'bone', 2: 'mist' };
/** The light the window throws on the wall beside it and on the floor: cold, then pale, then warm. */
const WALL_GLOW: Record<Sky, ColorName> = { 0: 'slate', 1: 'slate', 2: 'mist' };
const FLOOR_GLOW: Record<Sky, ColorName> = { 0: 'slate', 1: 'mist', 2: 'soil3' };
const FLOOR_LEVEL: Record<Sky, number> = { 0: 5, 1: 5, 2: 7 };
const FAR_TREES: Record<Sky, ColorName> = { 0: 'night', 1: 'shadow', 2: 'slate' };

/** A pine of height h standing on `base`, kept inside the glass from x0 to x1. */
function pine(ctx: Ctx, cx: number, base: number, h: number, c: ColorName, x0: number, x1: number): void {
  for (let k = 0; k < h; k++) {
    const half = Math.min(k >> 1, 3);
    const a = Math.max(x0, cx - half), b = Math.min(x1, cx + half + 1);
    if (b > a) r(ctx, a, base - h + k, b - a, 1, c);
  }
}

function drawWindow(ctx: Ctx, sky: Sky): void {
  const { x, y, w, h } = WIN;
  const gx = x + 3, gy = y + 3, gw = w - 6, gh = h - 6;
  // The light on the wall around the window, in three dithered rings.
  const glow = WALL_GLOW[sky];
  dith(ctx, x - 12, y - 4, w + 24, h + 14, glow, 2);
  dith(ctx, x - 6, y - 2, w + 12, h + 8, glow, 3);
  r(ctx, x - 1, y - 1, w + 2, h + 2, 'grey2');
  r(ctx, x, y, w, h, 'grey3');
  r(ctx, x + 1, y + 1, w - 2, 1, 'bone');
  r(ctx, x + 1, y + 1, 1, h - 2, 'bone');
  // The sky, band by band.
  const bands = SKY_BANDS[sky];
  const edge = (i: number): number => gy + Math.floor((i * gh) / bands.length);
  bands.forEach((c, i) => {
    r(ctx, gx, edge(i), gw, edge(i + 1) - edge(i), c);
    const next = bands[i + 1];
    if (next) for (let k = 0; k < 3; k++) dith(ctx, gx, edge(i + 1) - 3 + k, gw, 1, next, 4 + k * 4);
  });
  dots(ctx, STARS[sky], STAR_COLOR[sky]);
  // The treeline: far pines in haze, one house with its light on, near pines black, and the ground.
  const ground = gy + gh - 3;
  const x1 = gx + gw;
  for (const [cx, hh] of [[19, 6], [26, 8], [44, 9], [51, 7], [57, 6]] as const) pine(ctx, cx, ground, hh, FAR_TREES[sky], gx, x1);
  for (let k = 0; k < 4; k++) r(ctx, 33 - k - 1, ground - 9 + k, k * 2 + 3, 1, 'ink');
  r(ctx, 30, ground - 5, 8, 5, 'ink');
  if (sky < 2) r(ctx, 33, ground - 4, 2, 2, 'amber');
  for (const [cx, hh] of [[20, 4], [23, 5], [41, 5], [47, 6], [55, 5]] as const) pine(ctx, cx, ground, hh, 'ink', gx, x1);
  r(ctx, gx, ground, gw, 3, 'ink');
  // The mullions, and the sill with its shadow under.
  r(ctx, gx + 20, gy, 2, gh, 'bone');
  r(ctx, gx, gy + 22, gw, 2, 'bone');
  r(ctx, gx + 21, gy, 1, gh, 'grey3');
  r(ctx, gx, gy + 23, gw, 1, 'grey3');
  r(ctx, x - 3, y + h, w + 6, 3, 'bone');
  r(ctx, x - 3, y + h + 3, w + 6, 1, 'grey3');
  dith(ctx, x - 3, y + h + 4, w + 6, 3, 'night', 8);
}

/** The window's light on the floor: four panes, thrown long and to the right. */
function drawShaft(ctx: Ctx, sky: Sky): void {
  const c = FLOOR_GLOW[sky];
  for (let y = FLOOR_Y + 3; y < 166; y++) {
    const u = (y - FLOOR_Y) / 78;
    const left = Math.round(24 + u * 76);
    const half = 19;
    const gap = y > 118 && y < 124;
    if (gap) continue;
    for (const [a, b] of [[left, left + half - 1], [left + half + 1, left + half * 2]] as const) {
      dith(ctx, a, y, b - a, 1, c, FLOOR_LEVEL[sky]);
    }
  }
}

// ---------------------------------------------------------------- boxes
/** A moving box seen from above and the front: a front face w by h and a top face `top` tall behind it, with its tape. */
function cardboard(ctx: Ctx, x: number, y: number, w: number, h: number, top = 6): void {
  r(ctx, x + 1, y + h, w, 2, 'soil0');
  dith(ctx, x + 2, y + h + 2, w - 1, 2, 'soil0', 6);
  r(ctx, x, y, w, h, 'soil3');
  r(ctx, x + w - 2, y, 2, h, 'soil2');
  r(ctx, x, y + h - 1, w, 1, 'soil2');
  r(ctx, x, y, 1, h, 'sand');
  r(ctx, x, y - top, w, top, 'sand');
  r(ctx, x + w - 2, y - top, 2, top, 'soil3');
  r(ctx, x, y - top, w, 1, 'cream');
  r(ctx, x + (w >> 1), y - top + 1, 1, top - 1, 'soil3');
  // The tape runs over the top and down the front.
  r(ctx, x + (w >> 1) - 2, y - top, 4, top, 'cream');
  r(ctx, x + (w >> 1) - 2, y, 4, Math.round(h * 0.55), 'cream');
  r(ctx, x + (w >> 1) - 2, y + Math.round(h * 0.55) - 1, 4, 1, 'bone');
  // A flap line across the top of the front.
  r(ctx, x + 1, y, w - 3, 1, 'soil2');
}

/** A white label with marker strokes on it, at x, y. */
function label(ctx: Ctx, x: number, y: number, w: number, lines: readonly number[]): void {
  r(ctx, x, y, w, lines.length * 3 + 2, 'bone');
  r(ctx, x, y + lines.length * 3 + 2, w, 1, 'grey3');
  lines.forEach((len, i) => r(ctx, x + 2, y + 2 + i * 3, Math.min(len, w - 4), 1, 'ink'));
}

/** The right-hand stack against the wall. */
function drawStack(ctx: Ctx): void {
  cardboard(ctx, 204, 92, 32, 19, 6);
  label(ctx, 210, 99, 14, [8, 10]);
  cardboard(ctx, 209, 74, 24, 12, 6);
  label(ctx, 224, 77, 6, [3]);
  cardboard(ctx, 238, 98, 16, 13, 5);
  r(ctx, 241, 104, 8, 1, 'ink');
  r(ctx, 241, 106, 6, 1, 'ink');
}

// ---------------------------------------------------------------- the bed and Eleven
function drawBed(ctx: Ctx): void {
  r(ctx, 82, BED_FEET, 110, 3, 'soil0');
  dith(ctx, 82, BED_FEET + 3, 110, 2, 'soil0', 8);
  // The frame: a rail, the headboard on the left and the footboard on the right.
  r(ctx, 87, 106, 100, 5, 'soil2');
  r(ctx, 87, 106, 100, 1, 'soil3');
  r(ctx, 87, 110, 100, 1, 'soil1');
  r(ctx, 80, 64, 8, BED_FEET - 64, 'soil2');
  r(ctx, 80, 64, 2, BED_FEET - 64, 'soil3');
  r(ctx, 86, 64, 2, BED_FEET - 64, 'soil1');
  r(ctx, 79, 62, 10, 3, 'soil3');
  r(ctx, 186, 88, 7, BED_FEET - 88, 'soil2');
  r(ctx, 186, 88, 2, BED_FEET - 88, 'soil3');
  r(ctx, 191, 88, 2, BED_FEET - 88, 'soil1');
  r(ctx, 185, 86, 9, 3, 'soil3');
  // The mattress and the blanket over it, hanging in folds. The pillow is against the headboard.
  r(ctx, 88, 102, 98, 4, 'bone');
  r(ctx, 88, 105, 98, 1, 'grey3');
  r(ctx, 88, BED_TOP, 98, 6, 'rose');
  r(ctx, 88, BED_TOP, 98, 1, 'pink');
  for (const x of [113, 168]) r(ctx, x, BED_TOP + 2, 1, 3, 'blood1');
  r(ctx, 88, BED_TOP + 5, 98, 1, 'blood1');
  for (const x of [100, 124, 176]) r(ctx, x, BED_TOP + 1, 6, 1, 'pink');
  r(ctx, 89, 88, 19, 8, 'white');
  r(ctx, 89, 94, 19, 2, 'bone');
  r(ctx, 90, 88, 17, 1, 'bone');
  r(ctx, 98, 90, 3, 1, 'bone');
}

/** The envelope she opened, on the blanket beside her. */
function drawEnvelope(ctx: Ctx): void {
  const x = EL_X + 14, y = BED_TOP - 6;
  r(ctx, x, y, 10, 6, 'bone');
  r(ctx, x, y + 5, 10, 1, 'grey3');
  for (let i = 0; i < 4; i++) { r(ctx, x + 1 + i, y + 1 + i, 1, 1, 'grey3'); r(ctx, x + 8 - i, y + 1 + i, 1, 1, 'grey3'); }
  r(ctx, x + 7, y + 1, 2, 2, 'red');
}

/** Eleven, seated on the blanket with Hopper's letter open in her lap, head bowed. About 22 px from her hair to the blanket. */
function drawEleven(ctx: Ctx): void {
  const x = EL_X, hy = BED_TOP;
  // Legs hang over the edge: shins, white socks and sneakers.
  r(ctx, x - 5, hy + 3, 2, 8, 'skin0');
  r(ctx, x + 2, hy + 3, 2, 8, 'skin0');
  r(ctx, x - 5, hy + 8, 2, 3, 'white');
  r(ctx, x + 2, hy + 8, 2, 3, 'white');
  r(ctx, x - 6, hy + 11, 4, 3, 'bone');
  r(ctx, x + 1, hy + 11, 4, 3, 'bone');
  r(ctx, x - 6, hy + 14, 4, 1, 'grey2');
  r(ctx, x + 1, hy + 14, 4, 1, 'grey2');
  // Her dress: the skirt spread over the edge, the bodice above, short sleeves and a white collar.
  r(ctx, x - 7, hy - 1, 14, 5, 'pink');
  r(ctx, x - 7, hy + 3, 14, 1, 'rose');
  r(ctx, x - 5, hy - 8, 10, 8, 'pink');
  r(ctx, x + 3, hy - 8, 2, 8, 'rose');
  r(ctx, x - 3, hy - 8, 6, 1, 'white');
  r(ctx, x - 2, hy - 7, 4, 1, 'white');
  r(ctx, x - 7, hy - 7, 2, 3, 'pink');
  r(ctx, x + 5, hy - 7, 2, 3, 'rose');
  // Arms down to the letter, hands at its sides.
  r(ctx, x - 7, hy - 4, 2, 5, 'skin0');
  r(ctx, x + 5, hy - 4, 2, 5, 'skin1');
  // The letter in her lap: cream, with a fold and lines of Hopper's handwriting.
  r(ctx, x - 5, hy - 4, 10, 9, 'cream');
  r(ctx, x + 3, hy - 4, 2, 9, 'bone');
  r(ctx, x - 1, hy - 4, 1, 9, 'bone');
  r(ctx, x - 5, hy + 4, 10, 1, 'sand');
  for (const [dy, len] of [[-2, 7], [0, 8], [2, 5]] as const) r(ctx, x - 4, hy + dy, len, 1, 'soil1');
  r(ctx, x - 7, hy + 1, 3, 2, 'skin0');
  r(ctx, x + 4, hy + 1, 3, 2, 'skin1');
  // Her head, bowed: a bob of brown hair around a face looking down, one tear.
  r(ctx, x - 4, hy - 22, 8, 1, 'soil2');
  r(ctx, x - 5, hy - 21, 10, 1, 'soil2');
  r(ctx, x - 6, hy - 20, 12, 10, 'soil2');
  r(ctx, x - 6, hy - 20, 2, 10, 'soil1');
  r(ctx, x - 6, hy - 10, 2, 1, 'soil2');
  r(ctx, x + 4, hy - 10, 2, 1, 'soil2');
  r(ctx, x - 3, hy - 21, 4, 1, 'soil3');
  r(ctx, x - 4, hy - 16, 8, 6, 'skin0');
  r(ctx, x - 3, hy - 14, 2, 1, 'ink');
  r(ctx, x + 1, hy - 14, 2, 1, 'ink');
  r(ctx, x - 4, hy - 13, 1, 1, 'rose');
  r(ctx, x + 3, hy - 13, 1, 1, 'rose');
  r(ctx, x - 1, hy - 12, 2, 1, 'rose');
  r(ctx, x + 2, hy - 13, 1, 2, 'sky');
  r(ctx, x - 1, hy - 10, 2, 2, 'skin1');
}

// ---------------------------------------------------------------- the string of lights
/** Christmas lights on a box, unplugged: the wire in loops over the top, the bulbs dull and dark, and the plug on the floor
 * under an empty outlet. */
function drawLights(ctx: Ctx): void {
  const bx = 22, by = 104, bw = 40, bh = 20;
  // The empty outlet in the wall above the baseboard, and the plug it is not in.
  r(ctx, 70, 74, 6, 9, 'bone');
  r(ctx, 70, 82, 6, 1, 'grey3');
  for (const y of [76, 80]) { r(ctx, 72, y, 1, 2, 'ink'); r(ctx, 74, y, 1, 2, 'ink'); }
  cardboard(ctx, bx, by, bw, bh, 8);
  label(ctx, bx + 5, by + 10, 14, [6, 9]);
  // Wire across the top face, down the right edge and along the floor to the plug.
  const wire: readonly (readonly [number, number])[] = [
    [bx + 3, by - 3], [bx + 8, by - 6], [bx + 14, by - 3], [bx + 20, by - 6], [bx + 26, by - 3], [bx + 32, by - 6], [bx + 37, by - 3],
  ];
  for (let i = 0; i + 1 < wire.length; i++) {
    const [x0, y0] = wire[i] as readonly [number, number];
    const [x1, y1] = wire[i + 1] as readonly [number, number];
    const dx = x1 - x0;
    for (let k = 0; k <= dx; k++) r(ctx, x0 + k, Math.round(y0 + ((y1 - y0) * k) / dx), 1, 1, 'pine1');
  }
  const cols: readonly ColorName[] = ['blood1', 'pine2', 'teal1', 'soil2', 'purple'];
  wire.forEach(([wx, wy], i) => {
    if (i === 0 || i === wire.length - 1) return;
    const c = cols[i % cols.length] as ColorName;
    r(ctx, wx, wy, 1, 1, 'ink');
    r(ctx, wx - 1, wy + 1, 3, 3, c);
    r(ctx, wx - 1, wy + 1, 1, 1, 'mist');
  });
  // Between the loops, one more bulb each, so the string is a dozen bulbs and not five.
  for (const [wx, wy, k] of [[bx + 11, by - 5, 1], [bx + 17, by - 5, 3], [bx + 23, by - 5, 4], [bx + 29, by - 5, 0]] as const) {
    r(ctx, wx, wy, 1, 1, 'ink');
    r(ctx, wx - 1, wy + 1, 3, 3, cols[k] as ColorName);
    r(ctx, wx - 1, wy + 1, 1, 1, 'mist');
  }
  // The cord hangs over the right edge, down the box and out across the floor to the plug lying under the outlet.
  r(ctx, bx + bw - 3, by - 3, 1, 8, 'pine1');
  r(ctx, bx + bw - 2, by + 5, 1, 17, 'pine1');
  for (let x = 74; x < bx + bw - 1; x++) r(ctx, x, by + 21 + ((x >> 2) & 1), 1, 1, 'pine1');
  r(ctx, 66, by + 19, 8, 5, 'bone');
  r(ctx, 66, by + 23, 8, 1, 'grey3');
  r(ctx, 62, by + 20, 4, 1, 'grey3');
  r(ctx, 62, by + 22, 4, 1, 'grey3');
}

// ---------------------------------------------------------------- the rest of the room
/** Where the posters were: paler patches in the paper, a corner of tape left on each. */
function drawGhosts(ctx: Ctx): void {
  for (const [x, y, w, h] of [[98, 14, 22, 30], [126, 24, 16, 22], [150, 18, 10, 13], [150, 36, 10, 13]] as const) {
    r(ctx, x, y, w, h, 'dusk');
    dith(ctx, x, y, w, h, 'slate', 5);
    r(ctx, x, y, 2, 1, 'bone');
    r(ctx, x + w - 2, y, 2, 1, 'bone');
    r(ctx, x, y + h - 1, 1, 1, 'mist');
  }
  dots(ctx, [[110, 14]], 'grey3');
}

/** Boxes on the floor in front of the bed: one open with the blanket folded in it, one small with the tape on top. */
function drawForeground(ctx: Ctx): void {
  cardboard(ctx, 12, 150, 36, 18, 7);
  label(ctx, 17, 157, 13, [7, 5]);
  cardboard(ctx, 198, 144, 32, 18, 7);
  r(ctx, 200, 134, 28, 4, 'rose');
  r(ctx, 200, 134, 28, 1, 'pink');
  r(ctx, 204, 129, 8, 6, 'soil3');
  r(ctx, 204, 129, 8, 1, 'sand');
  cardboard(ctx, 140, 136, 22, 11, 5);
  // A roll of tape on top of it.
  r(ctx, 146, 128, 7, 3, 'cream');
  r(ctx, 148, 129, 3, 1, 'soil3');
  // Sneakers by the bed, side by side.
  for (const x of [100, 108]) {
    r(ctx, x, 122, 6, 3, 'white');
    r(ctx, x, 125, 6, 1, 'grey2');
    r(ctx, x + 4, 121, 2, 1, 'white');
    r(ctx, x + 1, 123, 2, 1, 'red');
  }
}

/** The set, in frame px (0 to 256), over the shell. */
function drawSet(ctx: Ctx, sky: Sky): void {
  drawGhosts(ctx);
  drawWindow(ctx, sky);
  drawShaft(ctx, sky);
  drawStack(ctx);
  drawBed(ctx);
  drawEleven(ctx);
  drawEnvelope(ctx);
  drawLights(ctx);
  drawForeground(ctx);
}

/**
 * The whole still on a screen `screenW` wide, the set centered at `frameX`. The caller fades the sides out
 * (drawSideFade). `frameX` is a multiple of 4, so the dithers line up with the screen's.
 */
export function drawEpilogueRoom(ctx: Ctx, screenW: number, frameX: number, sky: Sky): void {
  drawShell(ctx, screenW, frameX);
  ctx.save();
  ctx.translate(frameX, 0);
  drawSet(ctx, sky);
  ctx.restore();
}

const stills = new Map<Sky, HTMLCanvasElement>();
let stillFor = '';
/** The still drawn once into a canvas per sky, so a frame costs one blit. A window resize starts the set over, so the canvases of
 * the widths passed through are never kept. */
export function epilogueStill(screenW: number, frameX: number, sky: Sky): HTMLCanvasElement {
  const size = `${screenW}:${frameX}`;
  if (size !== stillFor) { stills.clear(); stillFor = size; }
  let c = stills.get(sky);
  if (!c) {
    c = makeCanvas(screenW, H);
    drawEpilogueRoom(ctx2d(c), screenW, frameX, sky);
    stills.set(sky, c);
  }
  return c;
}
