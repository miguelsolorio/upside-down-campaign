// The basement set for the prologue: back wall, floor and rug, a table with a map, dice and snacks, a hanging lamp
// and the DM screen. Drawn with rectangles and the gfx font, in screen space (256 by 224, no camera).
// The dialogue box covers y 169 and below, so everything that matters sits above that.
import { PAL } from '../gfx/palette.ts';
import type { ColorName } from '../gfx/palette.ts';
import { drawText } from '../gfx/index.ts';

type Ctx = CanvasRenderingContext2D;

export const SCREEN_W = 256;
export const SCREEN_H = 224;

/** Feet positions for the four kids, as drawActor wants them. */
export const SEATS = {
  mike: { x: 128, y: 107 },
  dustin: { x: 82, y: 115 },
  lucas: { x: 174, y: 121 },
  will: { x: 80, y: 141 },
};
export const TABLE = { x: 88, y: 104, w: 80, h: 24 };
/** Where the die leaves Will's hand and where it comes to rest. Both are ground points on the table. */
export const DIE_FROM = { x: 92, y: 130 };
export const DIE_REST = { x: 142, y: 120 };
/** The lamp hangs over the middle of the table. */
export const LAMP_X = 128;

function r(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void {
  ctx.fillStyle = PAL[c];
  ctx.fillRect(x, y, w, h);
}
function fade(ctx: Ctx, alpha: number, draw: () => void): void {
  ctx.globalAlpha = alpha;
  draw();
  ctx.globalAlpha = 1;
}

/** Wall, floor, rug, window, poster, the party's HP board and the stairs. struck crosses Will off the board. */
export function drawRoom(ctx: Ctx, struck: boolean): void {
  // Paneled wall with plank seams, a ceiling beam and a baseboard.
  r(ctx, 0, 0, SCREEN_W, 90, 'soil1');
  for (let x = 0; x < SCREEN_W; x += 12) {
    r(ctx, x, 12, 1, 74, 'soil0');
    if (((x / 12) & 1) === 0) r(ctx, x + 1, 12, 1, 74, 'soil2');
  }
  r(ctx, 0, 0, SCREEN_W, 10, 'ink');
  r(ctx, 0, 10, SCREEN_W, 2, 'soil0');
  r(ctx, 0, 86, SCREEN_W, 5, 'soil0');
  r(ctx, 0, 86, SCREEN_W, 1, 'soil2');
  // Floor, with board lines.
  r(ctx, 0, 91, SCREEN_W, SCREEN_H - 91, 'shadow');
  r(ctx, 0, 91, SCREEN_W, 2, 'night');
  for (let y = 99; y < SCREEN_H; y += 8) r(ctx, 0, y, SCREEN_W, 1, 'night');
  // Rug under the table.
  r(ctx, 52, 98, 152, 66, 'amber');
  r(ctx, 54, 100, 148, 62, 'blood1');
  r(ctx, 58, 104, 140, 54, 'blood0');
  for (let x = 64; x < 192; x += 12) { r(ctx, x, 101, 4, 2, 'rose'); r(ctx, x, 159, 4, 2, 'rose'); }

  // Small high window with a moon.
  r(ctx, 12, 18, 32, 28, 'soil3');
  r(ctx, 14, 20, 28, 24, 'night');
  r(ctx, 27, 20, 2, 24, 'soil3');
  r(ctx, 14, 31, 28, 2, 'soil3');
  r(ctx, 32, 23, 4, 4, 'cream');
  for (const [x, y] of [[18, 24], [21, 38], [38, 37], [17, 35]] as const) r(ctx, x, y, 1, 1, 'bone');

  // Whiteboard: the party's hit points. Will's row gets crossed out after the roll.
  r(ctx, 49, 12, 66, 52, 'grey3');
  r(ctx, 51, 14, 62, 48, 'bone');
  drawText(ctx, 'PARTY HP', 82, 17, 'blood1', { align: 'center' });
  r(ctx, 54, 25, 56, 1, 'grey3');
  const rows: [string, string][] = [['MIKE', '14'], ['DUSTIN', '11'], ['LUCAS', '12'], ['WILL', struck ? '0' : '6']];
  rows.forEach(([name, hp], i) => {
    drawText(ctx, name, 55, 28 + i * 8, 'ink');
    drawText(ctx, hp, 109, 28 + i * 8, struck && i === 3 ? 'red' : 'ink', { align: 'right' });
  });
  if (struck) r(ctx, 54, 55, 57, 2, 'red');
  r(ctx, 60, 64, 40, 2, 'grey2');

  // Poster: a red dragon over a moonlit cave.
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

  // Stairs going up on the right: a dark well, eight steps, a rail and light under the door.
  r(ctx, 206, 22, 50, 64, 'ink');
  for (let i = 0; i < 8; i++) {
    const x = 208 + i * 6;
    const top = 82 - i * 7;
    r(ctx, x, top, 6, 86 - top, 'soil1');
    r(ctx, x, top, 6, 2, 'soil3');
    r(ctx, x, top + 2, 1, 84 - top, 'soil0');
    r(ctx, x, top - 9, 6, 1, 'soil3');
    if ((i & 1) === 0) r(ctx, x + 2, top - 9, 1, 9, 'soil2');
  }
  r(ctx, 238, 22, 18, 2, 'amber');
  r(ctx, 240, 24, 14, 1, 'orange');
}

/**
 * Which kids sit on a chair and which side of them the chair back is on (-1 left, 1 right).
 * The back is behind the kid, so it matches the way they face.
 */
const CHAIRS: readonly { kid: 'dustin' | 'lucas' | 'will'; back: -1 | 1 }[] = [
  { kid: 'dustin', back: -1 },
  { kid: 'will', back: -1 },
  { kid: 'lucas', back: 1 },
];

/**
 * One chair, side on, sized to the kid standing at feet x, y (a sprite about 16 tall): the seat is at hip height,
 * the back reaches the shoulders and the legs are the last three pixels down to the floor.
 */
function chair(ctx: Ctx, x: number, y: number, back: -1 | 1): void {
  const left = back < 0 ? x - 8 : x - 3;
  const backX = back < 0 ? left : left + 9;
  r(ctx, left, y - 6, 11, 3, 'soil2');
  r(ctx, left, y - 6, 11, 1, 'soil3');
  r(ctx, backX, y - 12, 2, 9, 'soil1');
  r(ctx, backX, y - 12, 2, 1, 'soil2');
  r(ctx, left, y - 3, 2, 3, 'soil1');
  r(ctx, left + 9, y - 3, 2, 3, 'soil1');
}

/** Chairs for the three kids at the sides. Drawn before the kids. */
export function drawChairs(ctx: Ctx): void {
  for (const { kid, back } of CHAIRS) chair(ctx, SEATS[kid].x, SEATS[kid].y, back);
}

/** The table: top, legs, shadow on the rug, the map, dice, snacks. The front face is 9 px high, well under a kid's 16. */
export function drawTable(ctx: Ctx): void {
  const { x, y, w } = TABLE;
  fade(ctx, 0.5, () => r(ctx, x + 4, y + 31, w - 8, 4, 'ink'));
  r(ctx, x + 4, y + 24, 4, 9, 'soil1');
  r(ctx, x + w - 8, y + 24, 4, 9, 'soil1');
  r(ctx, x + 4, y + 24, 1, 9, 'soil0');
  r(ctx, x + w - 8, y + 24, 1, 9, 'soil0');
  r(ctx, x, y, w, 24, 'soil3');
  r(ctx, x, y, w, 1, 'sand');
  r(ctx, x, y + 24, w, 3, 'soil2');
  r(ctx, x, y + 27, w, 1, 'soil0');
  for (const [gx, gy, gw] of [[96, 108, 18], [140, 125, 20], [120, 110, 12], [150, 118, 10]] as const) r(ctx, gx, gy, gw, 1, 'soil2');

  // The map: parchment, a label, a forest, a creek and a cave mouth with a red X.
  r(ctx, 94, 112, 36, 15, 'sand');
  r(ctx, 95, 113, 34, 13, 'cream');
  drawText(ctx, 'CAVE', 97, 114, 'soil1');
  for (const [px, py] of [[97, 123], [100, 122], [103, 124], [99, 125]] as const) r(ctx, px, py, 2, 2, 'pine2');
  r(ctx, 120, 121, 2, 1, 'blue');
  r(ctx, 122, 122, 3, 1, 'blue');
  r(ctx, 125, 123, 3, 1, 'blue');
  r(ctx, 108, 121, 7, 4, 'ink');
  r(ctx, 110, 122, 1, 1, 'hot');
  r(ctx, 112, 122, 1, 1, 'hot');
  r(ctx, 111, 123, 1, 1, 'hot');

  // Dice: two d6 with pips, and a few polyhedrals.
  for (const [dx, dy] of [[133, 122], [138, 126]] as const) {
    r(ctx, dx, dy, 5, 5, 'white');
    r(ctx, dx + 1, dy + 1, 1, 1, 'ink');
    r(ctx, dx + 3, dy + 3, 1, 1, 'ink');
  }
  r(ctx, 131, 126, 3, 3, 'magenta');
  r(ctx, 152, 112, 3, 3, 'cyan');
  r(ctx, 148, 125, 3, 3, 'purple');

  // Snacks: a bowl of chips, two cans and an Eggo on a plate.
  r(ctx, 150, 108, 12, 5, 'grey2');
  r(ctx, 151, 109, 10, 3, 'grey1');
  for (const [cx, cy] of [[151, 106], [154, 105], [157, 106], [160, 107]] as const) r(ctx, cx, cy, 3, 3, 'amber');
  r(ctx, 154, 106, 1, 1, 'yellow');
  r(ctx, 156, 115, 4, 7, 'red');
  r(ctx, 156, 115, 4, 1, 'grey3');
  r(ctx, 157, 117, 2, 1, 'white');
  r(ctx, 162, 117, 4, 7, 'blue');
  r(ctx, 162, 117, 4, 1, 'grey3');
  r(ctx, 163, 119, 2, 1, 'white');
  r(ctx, 148, 118, 9, 3, 'bone');
  r(ctx, 150, 117, 5, 3, 'amber');
  r(ctx, 151, 118, 3, 1, 'soil3');
}

/** The DM screen: three folded panels that hide Mike from the chest down. Drawn after Mike and the table. */
export function drawScreen(ctx: Ctx): void {
  r(ctx, 108, 98, 13, 14, 'slate');
  r(ctx, 135, 98, 13, 14, 'slate');
  r(ctx, 121, 100, 14, 13, 'dusk');
  r(ctx, 108, 98, 13, 1, 'ink');
  r(ctx, 135, 98, 13, 1, 'ink');
  r(ctx, 121, 100, 14, 1, 'ink');
  r(ctx, 121, 100, 1, 13, 'ink');
  r(ctx, 134, 100, 1, 13, 'ink');
  r(ctx, 108, 112, 40, 1, 'ink');
  // Art on the players' side: a skull, a red eye, a sword.
  r(ctx, 111, 101, 7, 6, 'bone');
  r(ctx, 112, 103, 2, 2, 'ink');
  r(ctx, 115, 103, 2, 2, 'ink');
  r(ctx, 113, 107, 3, 2, 'bone');
  r(ctx, 125, 104, 6, 3, 'red');
  r(ctx, 127, 105, 2, 1, 'yellow');
  r(ctx, 141, 101, 1, 8, 'grey3');
  r(ctx, 139, 108, 5, 1, 'amber');
}

/**
 * The hanging lamp and its light. level runs 0 (out) to 1 (on). The shade and cord are always there;
 * the cone, the bulb and the pool of light on the table scale with level. Draw it after the dim overlay.
 */
export function drawLamp(ctx: Ctx, level: number): void {
  const on = level > 0.5;
  r(ctx, LAMP_X - 1, 10, 2, 31, 'ink');
  if (level > 0) {
    fade(ctx, 0.1 * level, () => {
      for (let i = 0; i < 36; i++) {
        const half = 6 + Math.round(i * 1.2);
        r(ctx, LAMP_X - half, 52 + i * 2, half * 2, 2, 'cream');
      }
    });
    fade(ctx, 0.16 * level, () => {
      for (let j = 0; j < 7; j++) {
        const half = 38 - Math.abs(j - 3) * 4 - (j === 0 || j === 6 ? 6 : 0);
        r(ctx, LAMP_X - half, 108 + j * 3, half * 2, 3, 'yellow');
      }
    });
  }
  for (let i = 0; i < 5; i++) r(ctx, LAMP_X - (4 + i * 2), 40 + i * 2, 8 + i * 4, 2, on ? (i === 4 ? 'amber' : 'orange') : (i === 4 ? 'soil2' : 'soil1'));
  r(ctx, LAMP_X - 12, 50, 24, 1, on ? 'soil2' : 'soil0');
  r(ctx, LAMP_X - 4, 51, 8, 2, on ? 'cream' : 'grey2');
  if (level > 0.8) r(ctx, LAMP_X - 2, 53, 4, 1, 'white');
}
