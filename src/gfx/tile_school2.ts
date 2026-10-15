// Hawkins Middle School walls (stage 1.3): painted cinder block with a green wainscot, the dark roof edge above it,
// the blue locker doors, the chalkboard, the trophy case and the outside brick with its windows. A hall wall is a
// schoolcap row over a face row, like the Lab. Every pixel is a palette color; the colors that stay bright at night
// (amber, yellow, red) are kept for lights, lit windows, gold and the odd extinguisher. Pure pixel work, so Node can
// run it. The floors are in tile_school.ts and the furniture in tile_school3.ts.
import type { TileName } from '../core/tiles.ts';
import { hash2, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import { isSchoolWall, pick } from './tile_school.ts';
import type { Rnd } from './tile_school.ts';

/** A lit brick window is amber at this pixel, and nowhere else on the tile; night.ts finds the light by it. */
export const WINDOW_SPOT = { x: 9, y: 6 } as const;

/** True for the pieces a wall run goes on through; anything else (floor, furniture, outdoors) is an opening. */
const joins = (n: TileName): boolean => isSchoolWall(n);

// ---------------------------------------------------------------- painted cinder block
/** The wall face: a pale painted band over a green wainscot, in 8 px blocks laid in running bond, under the cap's lip. */
export function schoolFace(c: TileCtx, r: Rnd, detail: boolean): Px {
  const px = new Px(16).fill('bone');
  for (let course = 0; course < 3; course++) {
    const y = 2 + course * 4, green = course === 2;
    const face: ColorName = green ? 'pine2' : 'bone', mortar: ColorName = green ? 'pine1' : 'grey3', lit: ColorName = green ? 'pine3' : 'white';
    const off = (course & 1) * 4;
    px.rect(0, y, 16, 4, face).rect(0, y + 3, 16, 1, mortar);
    for (let x = off; x < 16 + off; x += 8) { px.rect(x & 15, y, 1, 3, mortar).set((x + 1) & 15, y, lit); }
  }
  px.rect(0, 10, 16, 1, 'pine3');
  px.rect(0, 14, 16, 2, 'grey1').rect(0, 14, 16, 1, 'grey2');
  px.scatter(r, 'grey3', 5, 0, 2, 16, 8).scatter(r, 'pine1', 4, 0, 11, 16, 3);
  if (c.near.n === 'schoolcap') px.rect(0, 0, 16, 2, 'grey3').rect(0, 0, 16, 1, 'grey2').rect(0, 1, 16, 1, 'mist');
  else if (!joins(c.near.n)) px.rect(0, 0, 16, 1, 'white');
  if (detail) {
    const x = pick(r, 3, 8);
    switch (hash2(c.tx, c.ty, 531) % 18) {
      case 0: px.rect(x, 2, 6, 7, 'white').frame(x, 2, 6, 7, 'grey3').rect(x + 1, 3, 4, 2, 'sky').rect(x + 1, 6, 4, 1, 'grey3').rect(x + 1, 7, 3, 1, 'grey3'); break;
      case 1: px.rect(x - 1, 3, 9, 6, 'soil3').frame(x - 1, 3, 9, 6, 'soil1').rect(x, 4, 3, 3, 'white').rect(x + 4, 5, 3, 3, 'sky').set(x + 1, 4, 'grey3'); break;
      case 2: px.disc(8, 5.5, 3.6, 'grey1').disc(8, 5.5, 2.8, 'white').rect(8, 3, 1, 3, 'ink').rect(8, 5, 2, 1, 'ink'); break;
      case 3: px.rect(x, 5, 3, 8, 'red').rect(x, 5, 1, 8, 'hot').rect(x + 1, 3, 2, 2, 'ink').rect(x + 2, 7, 1, 3, 'bone'); break;
      case 4: for (let i = 0; i < 3; i++) { const dx = pick(r, 1, 14), len = pick(r, 2, 5); for (let y = 2; y < 2 + len; y++) px.set(dx, y, 'grey3'); } break;
      case 5: px.rect(x - 2, 3, 11, 5, 'blue').rect(x - 2, 5, 11, 1, 'white').rect(x - 2, 3, 11, 1, 'sky').set(x - 2, 8, 'blue').set(x + 8, 8, 'blue'); break;
      case 6: for (let i = 0; i < 4; i++) { px.set(x + i, 11 + (i & 1), 'pine1'); px.set(x + i + 5, 13, 'pine1'); } break;
      case 7: for (let y = 2; y < 10; y++) if ((y & 1) === 0 || y < 5) px.set(x, y, 'soil3'); px.set(x + 1, 8, 'soil3'); break;
      default: break;
    }
  }
  if (!joins(c.near.w)) px.rect(0, 2, 1, 12, 'grey1').rect(1, 2, 1, 12, 'grey3');
  if (!joins(c.near.e)) px.rect(15, 2, 1, 12, 'grey1').rect(14, 2, 1, 12, 'grey3');
  return px;
}

/** The roof edge seen from above: dark brown, tar seams, an air vent now and then, and a lit lip along its front. */
function cap(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('soil1');
  px.scatter(r, 'soil0', 12).scatter(r, 'soil2', 5).scatter(r, 'shadow', 3);
  const roll = hash2(c.tx, c.ty, 533) % 10;
  if (roll < 4) { for (let x = 0; x < 16; x++) if ((x & 3) < 3) px.set(x, 6, 'soil0'); }
  else if (roll === 4) px.rect(4, 3, 8, 7, 'grey2').rect(4, 3, 8, 1, 'grey3').frame(4, 3, 8, 7, 'ink').rect(5, 5, 6, 1, 'grey1').rect(5, 7, 6, 1, 'grey1');
  else if (roll === 5) px.rect(6, 2, 4, 8, 'grey1').rect(6, 2, 4, 1, 'grey2').rect(7, 3, 1, 6, 'ink');
  if (!joins(c.near.n)) px.rect(0, 0, 16, 1, 'sand').rect(0, 1, 16, 1, 'soil2');
  if (!joins(c.near.w)) px.rect(0, 0, 1, 16, 'sand').rect(1, 0, 1, 16, 'soil2');
  if (!joins(c.near.e)) px.rect(15, 0, 1, 16, 'ink').rect(14, 0, 1, 16, 'soil2');
  if (c.near.s !== 'schoolcap') px.rect(0, 13, 16, 1, 'soil2').rect(0, 14, 16, 1, 'sand').rect(0, 15, 16, 1, 'ink');
  return px;
}

// ---------------------------------------------------------------- lockers
/** Rows of blue lockers, two doors a tile: vent slits, a handle, a name plate, now and then one hanging open. */
function lockerwall(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('ink');
  for (let d = 0; d < 2; d++) {
    const x0 = d * 8, w = 7;
    const kind = hash2(c.tx * 2 + d, c.ty, 541) % 14;
    const body: ColorName = kind === 0 ? 'teal1' : kind === 1 ? 'dusk' : 'blue';
    const lit: ColorName = kind === 0 ? 'cyan' : kind === 1 ? 'slate' : 'sky';
    const shade: ColorName = kind === 0 ? 'teal0' : 'dusk';
    px.rect(x0, 2, w, 12, body).rect(x0, 2, w, 1, lit).rect(x0, 2, 1, 12, lit).rect(x0 + w - 1, 3, 1, 11, shade).rect(x0, 13, w, 1, shade);
    for (const y of [4, 6, 8]) px.rect(x0 + 2, y, w - 4, 1, 'ink');
    px.rect(x0 + w - 3, 10, 1, 2, 'bone');
    px.rect(x0 + 1, 10, 3, 2, 'bone').set(x0 + 2, 11, 'grey3');
    const odd = hash2(c.tx * 2 + d, c.ty, 542) % 13;
    if (odd === 0) { px.rect(x0 + 1, 3, w - 2, 10, 'night').rect(x0 + 1, 3, 1, 10, 'ink').rect(x0 + 3, 5, 2, 4, 'red').set(x0 + 3, 5, 'hot'); }
    else if (odd === 1) px.set(x0 + 3, 11, 'dusk').set(x0 + 4, 12, 'dusk').set(x0 + 2, 10, 'dusk').set(x0 + 4, 9, 'dusk');
    else if (odd === 2) px.rect(x0 + 2, 3, 4, 3, 'white').frame(x0 + 2, 3, 4, 3, 'ink').set(x0 + 3, 4, 'sky').set(x0 + 4, 4, 'sky');
    else if (odd === 3) px.rect(x0 + 1, 9, 1, 3, 'yellow').set(x0 + 1, 8, 'grey3');
  }
  px.rect(0, 0, 16, 2, 'dusk').rect(0, 0, 16, 1, 'ink').rect(0, 14, 16, 2, 'ink').rect(0, 14, 16, 1, 'dusk');
  px.rect(7, 2, 1, 12, 'ink');
  if (c.near.w !== 'lockerwall') px.rect(0, 2, 1, 12, 'grey1').rect(1, 2, 1, 11, 'grey3');
  px.scatter(r, 'mist', 3, 1, 3, 13, 10);
  return px;
}

// ---------------------------------------------------------------- brick
/** The outside facade: brown brick in running bond, stone coping and footing, and a window on every other column. */
function brick(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('grey3');
  for (let k = 0; k < 4; k++) {
    const y = k * 4, course = c.ty * 4 + k, off = (course & 1) * 4;
    for (let b = -1; b < 3; b++) {
      const x = b * 8 + off, tone = hash2(c.tx * 2 + b, course, 551) % 7;
      const col: ColorName = tone === 0 ? 'soil1' : tone === 1 ? 'soil3' : 'soil2';
      px.rect(x, y, 7, 3, col).rect(x, y, 7, 1, tone === 0 ? 'soil2' : 'soil3');
    }
  }
  px.scatter(r, 'soil1', 5);
  if (c.near.n !== 'brick') px.rect(0, 0, 16, 3, 'grey3').rect(0, 0, 16, 1, 'bone').rect(0, 2, 16, 1, 'grey2').rect(0, 3, 16, 1, 'soil1');
  if (c.near.s !== 'brick') px.rect(0, 13, 16, 3, 'grey2').rect(0, 13, 16, 1, 'grey3').rect(0, 15, 16, 1, 'grey1');
  const win = (c.tx & 1) === 1;
  if (win) {
    const lit = hash2(c.tx, c.ty, 553) % 3 === 0;
    px.rect(2, 1, 12, 2, 'grey3').rect(2, 1, 12, 1, 'bone');
    px.rect(2, 12, 12, 2, 'grey3').rect(2, 13, 12, 1, 'grey2');
    px.rect(3, 3, 10, 9, 'ink');
    if (lit) {
      px.rect(4, 4, 8, 7, 'amber').rect(4, 4, 8, 3, 'yellow').rect(7, 4, 1, 7, 'soil1').rect(4, 8, 8, 1, 'soil1');
      px.rect(WINDOW_SPOT.x, WINDOW_SPOT.y, 3, 1, 'amber');
      if (hash2(c.tx, c.ty, 554) % 3 === 0) px.rect(9, 9, 2, 2, 'soil1').set(9, 8, 'soil1');
    } else {
      px.rect(4, 4, 8, 7, 'teal0').rect(7, 4, 1, 7, 'night').rect(4, 8, 8, 1, 'night').set(5, 5, 'blue').set(6, 6, 'blue').set(5, 6, 'sky').set(10, 5, 'blue').set(11, 6, 'blue');
    }
  } else {
    const roll = hash2(c.tx, c.ty, 555) % 8;
    if (roll === 0) px.rect(11, 3, 2, 10, 'grey2').rect(11, 3, 1, 10, 'grey3').rect(10, 12, 4, 1, 'grey1');
    else if (roll === 1) px.rect(5, 5, 6, 5, 'grey1').frame(5, 5, 6, 5, 'grey2').rect(6, 7, 4, 1, 'ink').rect(6, 9, 4, 1, 'ink');
    else if (roll === 2) for (let i = 0; i < 9; i++) px.set(3 + (hash2(c.tx, i, 556) % 6), 4 + i, i & 1 ? 'pine1' : 'pine2').set(4 + (hash2(c.tx, i, 557) % 6), 5 + i, 'pine1');
  }
  return px;
}

// ---------------------------------------------------------------- chalkboard
const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '7': '111001010010010', '+': '000010111010000', '=': '000111000111000', H: '101101111101101', O: '111101101101111', x: '000101010101000',
};
function glyph(px: Px, ch: string, x: number, y: number, col: ColorName): void {
  const g = GLYPHS[ch] as string;
  for (let i = 0; i < 15; i++) if (g[i] === '1') px.set(x + (i % 3), y + ((i / 3) | 0), col);
}

/** A green board in a wood frame over the wall, a chalk tray under it, and a few lines of science on the board. */
function chalkboard(c: TileCtx, r: Rnd): Px {
  const px = schoolFace(c, r, false);
  const l = c.near.w === 'chalkboard' ? 0 : 1, rr = c.near.e === 'chalkboard' ? 15 : 14;
  const w = rr - l + 1;
  px.rect(l, 1, w, 13, 'soil2').rect(l, 1, w, 1, 'soil3').rect(l, 13, w, 1, 'soil1');
  px.rect(l + (l ? 1 : 0), 3, w - (l ? 1 : 0) - (rr < 15 ? 1 : 0), 8, 'pine1');
  px.scatter(r, 'pine2', 9, l, 3, w, 8);
  for (let i = 0; i < 3; i++) { const x = pick(r, l + 1, rr - 6); px.rect(x, 4 + i * 3, 5, 1, 'pine2'); }
  px.rect(l, 11, w, 1, 'soil3').rect(l, 12, w, 1, 'soil1');
  px.rect(pick(r, l + 2, rr - 5), 11, 3, 1, 'white').set(pick(r, l + 2, rr - 3), 11, 'bone').rect(pick(r, l + 2, rr - 5), 10, 3, 1, 'grey2');
  const ink: ColorName = 'white';
  switch (hash2(c.tx, c.ty, 561) % 6) {
    case 0: glyph(px, '2', 3, 4, ink); glyph(px, '+', 6, 4, ink); glyph(px, '5', 9, 4, ink); glyph(px, '=', 3, 8, 'bone'); glyph(px, '7', 6, 8, 'bone'); break;
    case 1: px.ellipse(8, 7, 5, 2.4, 'pine1').set(3, 7, 'white').set(13, 7, 'white').set(8, 5, 'white').set(8, 9, 'white').set(5, 5, 'bone').set(11, 9, 'bone').rect(7, 6, 2, 2, 'white'); break;
    case 2: px.line(3, 9, 8, 4, 'white').line(8, 4, 13, 9, 'white').line(3, 9, 13, 9, 'white').set(8, 3, 'bone').set(2, 9, 'bone').set(14, 9, 'bone'); break;
    case 3: glyph(px, 'H', 3, 5, ink); glyph(px, '2', 7, 6, ink); glyph(px, 'O', 10, 5, ink); px.rect(3, 9, 10, 1, 'bone'); break;
    case 4: px.rect(2, 4, 12, 1, 'bone').rect(2, 6, 9, 1, 'bone').rect(2, 8, 11, 1, 'bone').set(13, 6, 'white'); break;
    default: px.scatter(r, 'grey3', 6, l, 3, w, 8); break;
  }
  if (l) px.rect(l, 1, 1, 13, 'soil3').rect(l, 1, 1, 1, 'sand');
  if (rr < 15) px.rect(rr, 1, 1, 13, 'soil1');
  return px;
}

// ---------------------------------------------------------------- trophy case
const CUP = ['yaaaaaa', '.aaaaa.', '..aaa..', '...a...', '..sss..'];
/** A glass case set in the wall: wood frame, dark inside, a cup or two on the top shelf, a ball and a plaque below, a glint on the glass. */
function trophy(c: TileCtx, r: Rnd): Px {
  const px = schoolFace(c, r, false);
  const l = c.near.w === 'trophy' ? 0 : 1, rr = c.near.e === 'trophy' ? 15 : 14;
  const w = rr - l + 1;
  px.rect(l, 1, w, 13, 'soil2').rect(l, 1, w, 1, 'soil3').rect(l, 13, w, 1, 'soil1');
  const ix = l + (l ? 1 : 0), iw = w - (l ? 1 : 0) - (rr < 15 ? 1 : 0);
  px.rect(ix, 2, iw, 11, 'night').rect(ix, 2, iw, 1, 'shadow');
  px.rect(ix, 7, iw, 1, 'soil3').rect(ix, 8, iw, 1, 'soil1').rect(ix, 12, iw, 1, 'soil3');
  const jx = (hash2(c.tx, c.ty, 572) % 3) - 1;
  const cup = (x: number): void => { px.art(CUP, { a: 'amber', y: 'yellow', s: 'soil3' }, x + jx, 2); };
  const ball = (x: number): void => { px.disc(x, 10.2, 1.9, 'orange').set(x - 1, 9, 'amber'); };
  const plaque = (x: number, n: number): void => { px.rect(x, 9, n, 3, 'bone').frame(x, 9, n, 3, 'grey2').set(x + 1, 10, 'sky'); };
  switch (hash2(c.tx, c.ty, 571) % 4) {
    case 0: cup(l + 2); px.rect(l + 10, 3, 3, 4, 'bone').frame(l + 10, 3, 3, 4, 'grey2').set(l + 11, 4, 'sky'); ball(l + 10); plaque(l + 3, 4); break;
    case 1: for (let i = 0; i < 3; i++) px.rect(l + 3 + i * 4, 4, 2, 3, 'amber').set(l + 3 + i * 4, 4, 'yellow'); px.rect(l + 3, 9, 9, 2, 'red').rect(l + 3, 9, 9, 1, 'hot').rect(l + 7, 9, 1, 2, 'white'); break;
    case 2: cup(l + 1); cup(l + 7); ball(l + 4); ball(l + 9); break;
    default: px.rect(l + 2, 3, 10, 4, 'bone').frame(l + 2, 3, 10, 4, 'grey2').rect(l + 3, 4, 8, 2, 'mist').set(l + 5, 4, 'soil1').set(l + 8, 5, 'soil1'); plaque(l + 5, 5); break;
  }
  const g = hash2(c.tx, c.ty, 573) % 5;
  for (let i = 0; i < 4; i++) px.set(ix + 1 + g + i, 6 - i, i === 0 ? 'white' : 'mist');
  px.scatter(r, 'mist', 3, ix, 2, iw, 10);
  if (l) px.rect(l, 1, 1, 13, 'soil3');
  if (rr < 15) px.rect(rr, 1, 1, 13, 'soil1');
  return px;
}

// ---------------------------------------------------------------- public
/** The six wall tiles. Null for any other tile. */
export function schoolWall(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'schoolwall': return schoolFace(c, r, true);
    case 'schoolcap': return cap(c, r);
    case 'lockerwall': return lockerwall(c, r);
    case 'chalkboard': return chalkboard(c, r);
    case 'trophy': return trophy(c, r);
    case 'brick': return brick(c, r);
    default: return null;
  }
}

/** True when a brick tile has a lit window. Used by night.ts to find the lights. */
export const hasLitWindow = (day: Px): boolean => day.get(WINDOW_SPOT.x, WINDOW_SPOT.y) === px32('amber');
