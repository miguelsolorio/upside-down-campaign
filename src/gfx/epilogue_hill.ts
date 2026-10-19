// The hill road over Hawkins, the still behind chapter four's epilogue (docs/level-13.md, "The chapter end"). The night after the
// attic: a red crack in the sky above the town, the valley below it, the Lab on the far ridge, and the party sitting on the
// guardrail at a turnout with their backs to us. Rectangles and dithers in the game's palette at 1x, laid out for a 256 by 224 frame:
// the sky, the ridge, the slope and the road run out to the edges of a wider screen, and the set sits centered in the frame. The
// dialogue box covers y 169 and below, so everything that matters is above that.
// `stage` is how far the night has gone and never goes back: 0 the town with its lights on, 1 the lights going out in blocks and a
// first pair of headlights on the Lab road, 2 the lockdown arriving: a convoy, floodlights at the Lab and a helicopter's beam.
import { ctx2d, makeCanvas } from './canvas.ts';
import { dith, dots, ellipse, hash8, r, stroke } from './epilogue_kit.ts';
import type { Ctx, Stage } from './epilogue_kit.ts';
import { drawParty } from './epilogue_hill_party.ts';
import type { ColorName } from './palette.ts';

const H = 224;
/** The top of the guardrail, where the party sits. */
const RAIL_Y = 142;
/** Where the rift's crack runs, and how big its glow is in each stage. */
const CRACK_X = 175;
const GLOW: Record<Stage, number> = { 0: 1, 1: 1.25, 2: 1.5 };
/** A window or a lamp is lit when its hash is under this, so what is lit in a later stage was lit in every earlier one. */
const LIT: Record<Stage, number> = { 0: 215, 1: 70, 2: 9 };

// ---------------------------------------------------------------- the sky
/** The sky from the top to the ridge, the night going red toward the horizon, each band melting into the next through a dither. */
const SKY_BANDS: readonly (readonly [number, ColorName])[] = [
  [0, 'ink'], [12, 'night'], [30, 'shadow'], [50, 'blood0'], [72, 'blood1'],
];
const SKY_END = 100;

function drawSky(ctx: Ctx, x0: number, w: number, stage: Stage): void {
  SKY_BANDS.forEach(([y, c], i) => {
    const end = SKY_BANDS[i + 1]?.[0] ?? SKY_END;
    r(ctx, x0, y, w, end - y, c);
    const next = SKY_BANDS[i + 1]?.[1];
    if (next) for (let k = 0; k < 3; k++) dith(ctx, x0, end - 3 + k, w, 1, next, 4 + k * 4);
  });
  // Cloud banks, stretched in toward the crack.
  for (const [cx, cy, rx, ry, c, level] of [
    [112, 14, 46, 3, 'dusk', 6], [40, 26, 38, 3, 'dusk', 5], [124, 38, 52, 4, 'night', 8], [230, 30, 34, 3, 'dusk', 5],
    [60, 52, 44, 4, 'blood0', 8], [140, 60, 40, 3, 'blood1', 6], [226, 56, 36, 4, 'blood0', 8], [90, 74, 50, 3, 'blood1', 7],
  ] as const) ellipse(ctx, cx, cy, rx, ry, c, level);
  // The glow round the crack, five rings of dither melting into each other, wider each stage.
  const g = GLOW[stage];
  for (const [rx, ry, c, level] of [
    [52, 70, 'blood0', 3], [42, 62, 'blood0', 6], [32, 54, 'blood1', 4], [22, 46, 'blood1', 7], [12, 38, 'red', 5],
  ] as const) ellipse(ctx, CRACK_X, 46, rx * g, ry * g, c, level);
}

/** The crack itself: jagged, hot in the middle, with a branch for each stage after the first and a few spores adrift. */
const CRACK: readonly (readonly [number, number])[] = [[176, 0], [171, 11], [178, 23], [169, 36], [176, 48], [168, 60], [174, 72], [170, 90]];
const BRANCHES: readonly (readonly (readonly [number, number])[])[] = [
  [[176, 48], [189, 55], [196, 68]],
  [[171, 11], [160, 18], [153, 31]],
];
const SPORES: readonly (readonly [number, number])[] = [
  [158, 44], [196, 30], [150, 62], [204, 50], [184, 12], [162, 24], [210, 20], [144, 36], [192, 78], [168, 80], [220, 40], [138, 52], [200, 8], [156, 10],
];

function drawRift(ctx: Ctx, stage: Stage): void {
  const lines = [CRACK, ...BRANCHES.slice(0, stage)];
  for (const [w, c] of [[7, 'blood1'], [5, 'red'], [3, 'hot'], [1, 'cream']] as const) {
    for (const pts of lines) stroke(ctx, pts, pts === CRACK ? w : Math.max(1, w - 2), c);
  }
  dots(ctx, SPORES.slice(0, 6 + stage * 4), 'hot');
  dots(ctx, SPORES.filter((_, i) => i % 3 === 0).slice(0, 2 + stage), 'amber');
}

// ---------------------------------------------------------------- the ridge, the Lab and the valley
/** A pine of height h standing on `base`. */
function pine(ctx: Ctx, cx: number, base: number, h: number, wmax: number, c: ColorName): void {
  for (let k = 0; k < h; k++) {
    const half = Math.round((k / h) * wmax) + (k % 5 === 4 ? 1 : 0);
    r(ctx, cx - half, base - h + k, half * 2 + 1, 1, c);
  }
}

function drawRidge(ctx: Ctx, x0: number, w: number): void {
  // The far ridge in haze with the red of the sky on its edge, then pines along it.
  for (let x = x0; x < x0 + w; x++) {
    const y = 92 + Math.round(3 * Math.sin(x / 17) + 2 * Math.sin(x / 6 + 1));
    r(ctx, x, y, 1, 104 - y, 'night');
    r(ctx, x, y, 1, 1, 'blood1');
  }
  for (let x = Math.floor(x0 / 9) * 9; x < x0 + w; x += 9) {
    if (x >= 190 && x < 240) continue;
    pine(ctx, x + (hash8(x, 9) % 3), 98, 5 + (hash8(x, 3) % 4), 2, 'ink');
  }
}

/** The Lab: a long block, a cooling tower and a stack with its aviation light, with the red of the crack on their left edges. */
function drawLab(ctx: Ctx, stage: Stage): void {
  r(ctx, 196, 90, 42, 11, 'shadow');
  r(ctx, 196, 90, 42, 1, 'slate');
  r(ctx, 196, 90, 1, 11, 'blood1');
  dith(ctx, 197, 91, 40, 10, 'dusk', 4);
  // The cooling tower, narrower at the waist.
  for (let y = 66; y < 100; y++) {
    const half = 5 + Math.abs(Math.round(((y - 80) * 3) / 14));
    r(ctx, 208 - half, y, half * 2, 1, 'shadow');
    r(ctx, 208 - half, y, 1, 1, 'blood1');
    r(ctx, 208 + half - 2, y, 2, 1, 'night');
  }
  r(ctx, 203, 66, 11, 1, 'slate');
  // The stack and its light, blinking red all night.
  r(ctx, 226, 72, 4, 28, 'shadow');
  r(ctx, 226, 72, 1, 28, 'blood1');
  r(ctx, 225, 70, 6, 2, 'slate');
  dots(ctx, [[227, 68]], 'hot');
  // The windows: dark at first, a few lit by stage 1, every one by stage 2.
  const lit = stage === 0 ? 0 : stage === 1 ? 100 : 256;
  for (let x = 200; x < 236; x += 4) if (hash8(x, 50) < lit) r(ctx, x, 94, 2, 2, 'amber');
}

/** A dark house with a roof, `windows` lit by the stage's threshold. */
function house(ctx: Ctx, x: number, base: number, w: number, h: number, stage: Stage): void {
  r(ctx, x, base - h, w, h, 'shadow');
  r(ctx, x, base - h, 1, h, 'dusk');
  for (let k = 0; k < 3; k++) r(ctx, x - 1 + k, base - h - 1 - k, w + 2 - k * 2, 1, 'dusk');
  r(ctx, x + w - 1, base - h, 1, h, 'night');
  for (let wx = x + 2; wx + 1 < x + w - 1; wx += 3) if (hash8(wx, base) < LIT[stage]) r(ctx, wx, base - h + 2, 1, 2, 'amber');
}

function drawTown(ctx: Ctx, x0: number, w: number, stage: Stage): void {
  r(ctx, x0, 100, w, 40, 'night');
  dith(ctx, x0, 100, w, 6, 'shadow', 4);
  // The water tower on its legs, on the near hill at the left.
  r(ctx, 36, 96, 1, 12, 'ink');
  r(ctx, 49, 96, 1, 12, 'ink');
  r(ctx, 37, 100, 12, 1, 'ink');
  r(ctx, 34, 86, 18, 10, 'shadow');
  r(ctx, 34, 86, 18, 1, 'dusk');
  r(ctx, 34, 89, 18, 1, 'ink');
  r(ctx, 34, 86, 1, 10, 'blood1');
  for (let k = 0; k < 4; k++) r(ctx, 41 - k * 2, 82 + k, 4 + k * 4, 1, 'dusk');
  // Three rows of roofs, the nearest the biggest; the rows are streets with their lamps between.
  for (const [base, step, size] of [[110, 14, 0], [120, 16, 1], [131, 19, 2]] as const) {
    for (let x = Math.floor(x0 / step) * step - step; x < x0 + w; x += step) {
      const jx = x + (hash8(x, base) % 5);
      if (jx > 30 && jx < 52 && base === 110) continue;
      house(ctx, jx, base, 8 + size * 2 + (hash8(x, 1) % 3), 4 + size, stage);
    }
    for (let x = Math.floor(x0 / 6) * 6; x < x0 + w; x += 6) if (hash8(x >> 5, base) < LIT[stage] + 25) r(ctx, x, base + 2, 1, 1, 'cream');
  }
}

// ---------------------------------------------------------------- the Lab road and the lockdown
/** The road down from the Lab: a pale ribbon over the valley's edge, as the points a convoy follows. */
const ROAD: readonly (readonly [number, number])[] = [[220, 101], [226, 108], [238, 113], [244, 120], [256, 127]];

function drawRoad(ctx: Ctx, stage: Stage): void {
  stroke(ctx, ROAD, 2, 'slate');
  stroke(ctx, ROAD, 1, 'dusk');
  // Headlights climbing it: a pair as soon as stage 1, a convoy in stage 2, each pair with its glow on the road.
  const pairs: readonly (readonly [number, number])[] = [[226, 108], [222, 104], [234, 111], [241, 116], [246, 121], [252, 125], [230, 109]];
  for (const [x, y] of pairs.slice(0, stage === 0 ? 0 : stage === 1 ? 1 : 7)) {
    ellipse(ctx, x + 1, y + 1, 4, 2, 'amber', 4);
    dots(ctx, [[x, y], [x + 2, y]], 'cream');
  }
}

/** The helicopter and its beam, and the floodlights at the Lab, which come with the lockdown. */
function drawLockdown(ctx: Ctx): void {
  for (const x of [200, 236]) {
    for (let y = 56; y < 90; y++) dith(ctx, x - 2 - Math.floor((90 - y) / 4), y, 5 + Math.floor((90 - y) / 2), 1, 'bone', 3);
    r(ctx, x - 1, 88, 3, 2, 'cream');
  }
  // The helicopter low over the town, its beam on a roof.
  const hx = 96, hy = 78;
  for (let y = hy + 3; y < 118; y++) dith(ctx, hx - 1 - Math.floor((y - hy) / 6), y, 3 + Math.floor((y - hy) / 3), 1, 'cream', 4);
  ellipse(ctx, hx, 117, 10, 3, 'cream', 8);
  r(ctx, hx - 5, hy, 11, 3, 'ink');
  r(ctx, hx + 6, hy, 6, 1, 'ink');
  r(ctx, hx + 11, hy - 2, 1, 3, 'ink');
  r(ctx, hx - 8, hy - 2, 17, 1, 'grey2');
  dots(ctx, [[hx + 11, hy - 2], [hx - 5, hy + 3]], 'hot');
}

// ---------------------------------------------------------------- the turnout
function drawSlope(ctx: Ctx, x0: number, w: number): void {
  r(ctx, x0, 132, w, 24, 'pine0');
  dith(ctx, x0, 132, w, 8, 'night', 6);
  for (let x = Math.floor(x0 / 3) * 3; x < x0 + w; x += 3) {
    const v = hash8(x, 77);
    if (v < 120) r(ctx, x, 133 + (v % 7), 1, 2, 'pine1');
  }
  // Big pines framing the picture at the frame's two edges.
  for (const [cx, base, h, wmax] of [[8, 150, 62, 11], [26, 150, 46, 9], [248, 150, 66, 11], [230, 150, 40, 8]] as const) {
    pine(ctx, cx, base, h, wmax, 'pine0');
    r(ctx, cx + 1, base - h + 4, 1, h - 4, 'ink');
    r(ctx, cx - 1, base, 3, 6, 'soil0');
  }
}

function drawRoadway(ctx: Ctx, x0: number, w: number): void {
  // The asphalt apron under the rail, the rift's red on its right half and the long yellow edge line.
  r(ctx, x0, 150, w, H - 150, 'grey1');
  dith(ctx, x0, 150, w, 8, 'ink', 6);
  ellipse(ctx, CRACK_X, 163, 62, 8, 'blood1', 3);
  r(ctx, x0, 160, w, 1, 'grey2');
  dith(ctx, x0, 161, w, 1, 'grey2', 8);
  // The guardrail: the rail with its top catching the red, the posts under it and their shadows on the road.
  r(ctx, x0, RAIL_Y, w, 4, 'grey2');
  r(ctx, x0, RAIL_Y, w, 1, 'grey3');
  r(ctx, x0, RAIL_Y + 3, w, 1, 'grey1');
  dith(ctx, CRACK_X - 40, RAIL_Y, 130, 1, 'rose', 6);
  for (let x = x0 + (((4 - x0) % 16) + 16) % 16; x < x0 + w; x += 16) {
    r(ctx, x, RAIL_Y + 4, 3, 8, 'grey1');
    r(ctx, x, RAIL_Y + 4, 1, 8, 'grey2');
    r(ctx, x + 3, RAIL_Y + 4, 1, 8, 'ink');
    r(ctx, x - 1, RAIL_Y + 12, 6, 1, 'ink');
  }
}

/** The set, in frame px (0 to 256), over the sides that run out to the screen's edges. */
function drawSet(ctx: Ctx, x0: number, w: number, stage: Stage): void {
  r(ctx, x0, 0, w, H, 'ink');
  drawSky(ctx, x0, w, stage);
  drawRift(ctx, stage);
  drawRidge(ctx, x0, w);
  drawLab(ctx, stage);
  drawTown(ctx, x0, w, stage);
  drawRoad(ctx, stage);
  if (stage === 2) drawLockdown(ctx);
  drawSlope(ctx, x0, w);
  drawRoadway(ctx, x0, w);
  drawParty(ctx, RAIL_Y);
}

/**
 * The whole still on a screen `screenW` wide, the set centered at `frameX`. The caller fades the sides out (drawSideFade).
 * `frameX` is a multiple of 4, so the dithers line up with the screen's.
 */
export function drawEpilogueHill(ctx: Ctx, screenW: number, frameX: number, stage: Stage): void {
  ctx.save();
  ctx.translate(frameX, 0);
  drawSet(ctx, -frameX, screenW, stage);
  ctx.restore();
}

const stills = new Map<Stage, HTMLCanvasElement>();
let stillFor = '';
/** The still drawn once into a canvas per stage, so a frame costs one blit. A window resize starts the set over. */
export function hillStill(screenW: number, frameX: number, stage: Stage): HTMLCanvasElement {
  const size = `${screenW}:${frameX}`;
  if (size !== stillFor) { stills.clear(); stillFor = size; }
  let c = stills.get(stage);
  if (!c) {
    c = makeCanvas(screenW, H);
    drawEpilogueHill(ctx2d(c), screenW, frameX, stage);
    stills.set(stage, c);
  }
  return c;
}
