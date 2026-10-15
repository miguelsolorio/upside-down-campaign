// Held things for the heroes who carry one: Steve's nail bat, swung in the attack, and Max's skateboard, swung in her attack and
// ridden in her Skate dash. A paper-doll frame is 16 by 16 and a swung bat is longer than the arm that holds it, so the gear is
// drawn on a wider scratch buffer (WIDE, with MARGIN px all round) and `crop` slides the 16 by 16 window over the finished
// figure until the whole swing fits, by up to three px across and two up or down. Everything is role letters, like the rest of
// the composer: g the bat's handle, G its barrel, n a nail; x the deck, y the grip tape, g the wheels. Pure: no DOM.
import type { ArmPose, Part, View, WeaponKind } from './data/types.ts';
import { blitRows, outlineRoles } from './canvas.ts';

export const CELL = 16;
export const MARGIN = 4;
export const WIDE = CELL + MARGIN * 2;
const code = (c: string): number => c.charCodeAt(0);

/** Where the front hand goes (from the front shoulder), which way the held thing points and how many cells long it is, in cell px. */
export interface Aim { rx: number; ry: number; dx: number; dy: number; len: number }
const A = (rx: number, ry: number, dx: number, dy: number, len: number): Aim => ({ rx, ry, dx, dy, len });

const NAIL_BAT: Record<View, Partial<Record<ArmPose, Aim>>> = {
  // Cocked up behind the shoulder, then out level at the end of the swing.
  side: { windup: A(-2, 0, -0.35, -1, 6), strike: A(1, 1, 1, 0.1, 7) },
  // Held up beside the head, then swung across the body.
  down: { windup: A(2, -1, 0.25, -1, 6), strike: A(-1, 2, -1, 0.45, 6) },
  up: { windup: A(2, -1, 0.25, -1, 6), strike: A(-1, 1, -1, -0.55, 6) },
};
const BOARD: Record<View, Partial<Record<ArmPose, Aim>>> = {
  // Swung like a bat: back and low behind her, then out level in front. From the front it is raised clear of the headphones, then swept across.
  side: { windup: A(-3, 2, -1, 0.1, 6), strike: A(1, 1, 1, 0.1, 7) },
  down: { windup: A(5, -2, 0.1, -1, 6), strike: A(-1, 2, -1, 0.3, 7) },
  up: { windup: A(5, -2, 0.1, -1, 6), strike: A(-1, 1, -1, -0.45, 7) },
};

/** True for the weapons this file draws. */
export const isGear = (w: WeaponKind): boolean => w === 'nailbat' || w === 'board';

/** The aim for a weapon in an arm pose, or null. */
export function aimOf(weapon: WeaponKind, view: View, pose: ArmPose): Aim | null {
  const table = weapon === 'nailbat' ? NAIL_BAT : weapon === 'board' ? BOARD : null;
  return table?.[view][pose] ?? null;
}

export type Wide = Uint8Array;
export const newWide = (): Wide => new Uint8Array(WIDE * WIDE);

function put(w: Wide, x: number, y: number, ch: string): void {
  x += MARGIN; y += MARGIN;
  if (x >= 0 && x < WIDE && y >= 0 && y < WIDE) w[y * WIDE + x] = code(ch);
}

/** Copies a 16 by 16 role buffer into the middle of a wide one. */
export function lift(buf: Uint8Array): Wide {
  const w = newWide();
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) w[(y + MARGIN) * WIDE + x + MARGIN] = buf[y * CELL + x] as number;
  return w;
}

/** Cells along a heading from the hand: i steps out, and the unit sideways step. */
function along(hand: readonly [number, number], a: Aim): { at: (i: number, side?: number) => [number, number]; } {
  const n = Math.hypot(a.dx, a.dy) || 1, ux = a.dx / n, uy = a.dy / n;
  return { at: (i, side = 0) => [Math.round(hand[0] + ux * i - uy * side), Math.round(hand[1] + uy * i + ux * side)] };
}

/** A bat: a thin handle, then a barrel two wide with a nail sticking out on each side of it, so it reads as a nail bat at any angle. */
function nailBat(w: Wide, hand: readonly [number, number], a: Aim): void {
  const { at } = along(hand, a);
  const n = a.len, from = n - 3;
  for (let i = 1; i <= n; i++) {
    const [x, y] = at(i);
    put(w, x, y, i >= from ? 'G' : 'g');
    if (i >= from) { const [bx, by] = at(i, 1); put(w, bx, by, 'G'); }
  }
  for (const [i, side] of [[n - 2, 2], [n, -1]] as [number, number][]) { const [x, y] = at(i, side); put(w, x, y, 'n'); }
}

/** A board swung edge on: a deck two thick and two wheels on one side. */
function board(w: Wide, hand: readonly [number, number], a: Aim): void {
  const { at } = along(hand, a);
  for (let i = 1; i <= a.len; i++) {
    const [x, y] = at(i);
    put(w, x, y, 'x');
    const [gx, gy] = at(i, 1);
    put(w, gx, gy, 'x');
  }
  for (const i of [2, a.len - 1]) { const [x, y] = at(i, -1); put(w, x, y, 'g'); }
}

/** Draws the weapon in the front hand. The hand is in cell coordinates. */
export function drawGear(w: Wide, weapon: WeaponKind, hand: readonly [number, number], a: Aim): void {
  if (weapon === 'nailbat') nailBat(w, hand, a);
  else if (weapon === 'board') board(w, hand, a);
}

// ---------------------------------------------------------------- the dash: she rides it
/** Crouched legs for the roll, feet apart on the deck. The upper body stays put, so the board sits two rows above the cell's floor. */
const DASH_LEGS: Record<View, Part> = {
  side: { y: 11, rows: ['....qpppppp.....', '....ff....fff...'] },
  down: { y: 11, rows: ['....pp....pp....', '....ff....ff....'] },
  up: { y: 11, rows: ['....pp....pp....', '....ff....ff....'] },
};
const DECK: Record<View, string[]> = {
  side: ['..xxxxxxxxxxxx..', '....gg....gg....'],
  down: ['...xxxxxxxxxx...', '...gg......gg...'],
  up: ['...xxxxxxxxxx...', '...gg......gg...'],
};

/** The legs for a dash and the board under them (one part: the deck row, then the wheels). */
export function dashParts(view: View): { legs: Part; board: Part } {
  return { legs: DASH_LEGS[view], board: { y: 13, rows: DECK[view] } };
}

/** Lays rows into a wide buffer at the cell's coordinates. */
export function blitWide(w: Wide, part: Part): void {
  blitRows(w, WIDE, part.rows.map((r) => '.'.repeat(MARGIN) + r + '.'.repeat(MARGIN)), 0, part.y + MARGIN);
}

/** Outlines a wide buffer and returns the 16 by 16 window over it that holds the figure, slid by up to three px across and two down. */
export function crop(w: Wide): Uint8Array {
  outlineRoles(w, WIDE, WIDE, code('k'));
  let minX = WIDE, maxX = -1, minY = WIDE, maxY = -1;
  for (let y = 0; y < WIDE; y++) for (let x = 0; x < WIDE; x++) if (w[y * WIDE + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  let wx = MARGIN, wy = MARGIN;
  if (maxX > wx + CELL - 1) wx = Math.min(maxX - CELL + 1, MARGIN + 3);
  if (minX < wx) wx = Math.max(minX, MARGIN - 3);
  if (maxY > wy + CELL - 1) wy = Math.min(maxY - CELL + 1, MARGIN + 2);
  if (minY < wy) wy = Math.max(minY, MARGIN - 2);
  const out = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) out[y * CELL + x] = w[(y + wy) * WIDE + x + wx] as number;
  return out;
}
