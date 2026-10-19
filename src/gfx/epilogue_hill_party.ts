// The party on the guardrail, from behind, for chapter four's epilogue still (epilogue_hill.ts; docs/level-13.md, "The chapter end").
// Seven of them sit in a row looking down at the town, each about 16 px from the seat to the crown, told apart by hair, a hat and a
// jacket. There is a gap in the row between Dustin and Lucas with a d20 on the rail in it: Eddie's seat. The rift is up and to the
// right, so every head and shoulder takes a thin red rim on its right edge. `seat` is the y of the rail's top, where they sit.
import { dots, r } from './epilogue_kit.ts';
import type { Ctx } from './epilogue_kit.ts';
import type { ColorName } from './palette.ts';

/** What every figure shares: the torso, the arms, the neck and the head's block, then the rim light on the right. */
interface Body { x: number; body: ColorName; shade: ColorName; hair: ColorName; skin?: ColorName; head?: number; tall?: number }

function base(ctx: Ctx, seat: number, b: Body): { top: number; headTop: number } {
  const { x } = b, tall = b.tall ?? 0;
  const top = seat - 10 - tall;
  // The back and the shoulders, with a fold down the middle and the right arm in shade.
  r(ctx, x - 5, top, 10, 10 + tall, b.body);
  r(ctx, x - 6, top + 1, 12, 4, b.body);
  r(ctx, x + 1, top + 3, 1, 7 + tall, b.shade);
  r(ctx, x + 4, top + 2, 2, 8 + tall, b.shade);
  r(ctx, x - 6, top + 4, 1, 5, b.shade);
  // The neck, then the head from behind: all hair, the ears showing at its sides.
  const hy = top - 9 - (b.head ?? 0);
  r(ctx, x - 1, top - 3, 3, 3, b.skin ?? 'skin0');
  r(ctx, x - 3, hy, 7, 8, b.hair);
  r(ctx, x - 4, hy + 4, 1, 2, b.skin ?? 'skin0');
  r(ctx, x + 4, hy + 4, 1, 2, b.skin ?? 'skin0');
  // The rift's red on the edges that face it.
  r(ctx, x + 4, hy + 1, 1, 3, 'rose');
  r(ctx, x + 5, top + 1, 1, 2, 'rose');
  r(ctx, x + 6, top + 2, 1, 3, 'blood1');
  return { top, headTop: hy };
}

const robin = (ctx: Ctx, seat: number, x: number): void => {
  const f = base(ctx, seat, { x, body: 'teal1', shade: 'teal0', hair: 'sand', skin: 'skin0' });
  r(ctx, x - 3, f.headTop, 7, 1, 'cream');
  r(ctx, x - 3, f.headTop + 7, 7, 1, 'soil3');
};

const dustin = (ctx: Ctx, seat: number, x: number): void => {
  const f = base(ctx, seat, { x, body: 'pine2', shade: 'pine1', hair: 'soil2', head: -1 });
  // The curls spill out under a blue cap with its strap and its snap.
  r(ctx, x - 4, f.headTop + 3, 9, 4, 'soil2');
  r(ctx, x - 4, f.headTop, 9, 3, 'blue');
  r(ctx, x - 3, f.headTop - 1, 7, 1, 'blue');
  r(ctx, x - 2, f.headTop + 3, 5, 1, 'bone');
  dots(ctx, [[x + 4, f.headTop + 1]], 'sky');
};

const lucas = (ctx: Ctx, seat: number, x: number): void => {
  const f = base(ctx, seat, { x, body: 'soil3', shade: 'soil2', hair: 'soil0', skin: 'skin2', tall: 1 });
  // A red bandana round his head, knotted at the back with two tails.
  r(ctx, x - 3, f.headTop + 3, 7, 2, 'red');
  r(ctx, x - 1, f.headTop + 5, 3, 2, 'red');
  r(ctx, x, f.headTop + 7, 1, 1, 'blood1');
};

const max = (ctx: Ctx, seat: number, x: number): void => {
  const f = base(ctx, seat, { x, body: 'purple', shade: 'purple0', hair: 'orange', head: 0, skin: 'skin0' });
  // Long red hair down her back and over the hood, and the Walkman's headphones across her crown.
  r(ctx, x - 4, f.headTop + 1, 9, 7, 'orange');
  r(ctx, x - 3, f.headTop + 8, 7, 6, 'orange');
  r(ctx, x + 2, f.headTop + 8, 2, 6, 'amber');
  r(ctx, x - 3, f.headTop, 7, 1, 'grey3');
  r(ctx, x - 5, f.headTop + 3, 2, 4, 'ink');
  r(ctx, x + 4, f.headTop + 3, 2, 4, 'ink');
  r(ctx, x - 5, f.headTop + 3, 1, 1, 'grey2');
  // The Walkman on her belt, with its red light.
  r(ctx, x + 3, seat - 4, 4, 3, 'grey2');
  r(ctx, x + 3, seat - 4, 4, 1, 'grey3');
  dots(ctx, [[x + 6, seat - 3]], 'hot');
};

const will = (ctx: Ctx, seat: number, x: number): void => {
  // His head is tipped back a little, looking at the crack: a taller neck, the bowl cut's fringe at the nape.
  const f = base(ctx, seat, { x, body: 'blue', shade: 'purple0', hair: 'soil1', head: 1, skin: 'skin0' });
  r(ctx, x - 3, f.headTop + 8, 7, 1, 'soil1');
  r(ctx, x - 2, f.headTop - 1, 5, 1, 'soil1');
  r(ctx, x - 1, f.headTop + 3, 3, 1, 'soil2');
};

const mike = (ctx: Ctx, seat: number, x: number): void => {
  const f = base(ctx, seat, { x, body: 'red', shade: 'blood1', hair: 'soil0', tall: 1 });
  // Striped shirt, and hair that sticks up at the crown.
  for (let k = 0; k < 3; k++) r(ctx, x - 5, f.top + 2 + k * 3, 10, 1, 'bone');
  dots(ctx, [[x - 2, f.headTop - 1], [x + 1, f.headTop - 1], [x + 3, f.headTop]], 'soil0');
  r(ctx, x - 3, f.headTop + 2, 7, 1, 'soil1');
};

const eleven = (ctx: Ctx, seat: number, x: number): void => {
  // Smaller, her head on Mike's shoulder (a pixel toward him), in the pink dress and the brown bob of the bedroom.
  const f = base(ctx, seat, { x, body: 'pink', shade: 'rose', hair: 'soil2', head: -3, tall: -1 });
  r(ctx, x - 4, f.headTop + 2, 9, 7, 'soil2');
  r(ctx, x - 4, f.headTop + 2, 1, 7, 'soil1');
  r(ctx, x - 1, f.headTop, 3, 1, 'soil3');
  r(ctx, x - 5, f.top + 4, 1, 4, 'pink');
};

/** Eddie's seat: a d20 left on the rail, bone with a red face, a glint at its top left and a rim of the rift's red on the right. */
function d20(ctx: Ctx, seat: number, x: number): void {
  r(ctx, x - 3, seat - 7, 7, 7, 'bone');
  r(ctx, x - 2, seat - 8, 5, 1, 'bone');
  r(ctx, x - 1, seat - 9, 3, 1, 'bone');
  r(ctx, x - 4, seat - 6, 1, 5, 'bone');
  r(ctx, x + 4, seat - 6, 1, 5, 'grey3');
  r(ctx, x - 1, seat - 5, 3, 3, 'red');
  r(ctx, x, seat - 6, 1, 1, 'red');
  r(ctx, x - 2, seat - 3, 5, 1, 'grey3');
  r(ctx, x - 2, seat - 7, 1, 1, 'white');
  r(ctx, x + 3, seat - 7, 1, 5, 'rose');
  r(ctx, x - 3, seat - 1, 7, 1, 'grey3');
}

/** Centers of the seven, left to right, with Eddie's gap at 108. */
export const SEATS = { robin: 80, dustin: 94, eddie: 108, lucas: 122, max: 136, will: 150, mike: 164, eleven: 176 } as const;

/** The whole row, sitting on a rail whose top is at y `seat`. */
export function drawParty(ctx: Ctx, seat: number): void {
  robin(ctx, seat, SEATS.robin);
  dustin(ctx, seat, SEATS.dustin);
  d20(ctx, seat, SEATS.eddie);
  lucas(ctx, seat, SEATS.lucas);
  max(ctx, seat, SEATS.max);
  will(ctx, seat, SEATS.will);
  mike(ctx, seat, SEATS.mike);
  eleven(ctx, seat, SEATS.eleven);
}
