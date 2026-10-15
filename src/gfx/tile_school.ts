// Hawkins Middle School floors (stage 1.3): the hall linoleum, the cafeteria checker and the gym court. Warm browns in
// the halls, bone and slate in the cafeteria, boards and white paint in the gym. No alpha, no gradients: every pixel is
// a palette color, and none of the three uses a color the night remap leaves bright, so the floors go dark with the
// rest of the stage. Each tile reads its position hash, so a hall is not stamped. Pure pixel work, so Node can run it.
// The wall faces are in tile_school2.ts and the furniture in tile_school3.ts.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';

export type Rnd = () => number;
export const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

/** The 13 school tiles, floors first, then walls, then furniture. */
export const SCHOOL_TILES: readonly TileName[] = [
  'schoolfloor', 'checker', 'gymfloor', 'schoolwall', 'schoolcap', 'lockerwall', 'chalkboard', 'trophy', 'brick', 'desk', 'table', 'counter', 'bleachers',
];

/** Wall faces and roof edges: they throw a shadow on the floor beside them. */
const WALLS = new Set<TileName>(['schoolwall', 'schoolcap', 'lockerwall', 'chalkboard', 'trophy', 'brick']);
export const isSchoolWall = (n: TileName): boolean => WALLS.has(n);

/** The shadow a wall throws on the floor: a dithered band along the north and west edges. */
export function schoolShadow(px: Px, c: TileCtx, col: ColorName): void {
  if (isSchoolWall(c.near.n)) {
    px.rect(0, 0, 16, 1, col);
    for (let x = 0; x < 16; x++) { if (!(x & 1)) px.set(x, 1, col); if ((x & 3) === 1) px.set(x, 2, col); }
  }
  if (isSchoolWall(c.near.w)) {
    px.rect(0, 0, 1, 16, col);
    for (let y = 0; y < 16; y++) if (!(y & 1)) px.set(1, y, col);
  }
}

// ---------------------------------------------------------------- hall linoleum
/** Brown linoleum in 16 px squares laid in running bond, so the joints step from row to row. Speckled, waxed, scuffed. */
function schoolfloor(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16).fill('soil3');
  px.scatter(r, 'sand', 9).scatter(r, 'soil2', 8).scatter(r, 'soil1', 3);
  const sx = (c.ty & 1) === 0 ? 0 : 8;
  px.rect(0, 0, 16, 1, 'soil2').rect(0, 1, 16, 1, 'sand');
  px.rect(sx, 0, 1, 16, 'soil2').rect(sx + 1, 1, 1, 15, 'sand');
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 501) % 22;
    const x = pick(r, 3, 9), y = pick(r, 4, 11);
    if (roll < 3) {
      for (let i = 0; i < 6; i++) px.set(x + i, y + (i >> 1), 'soil1');
      px.set(x + 1, y + 1, 'soil2');
    } else if (roll === 3) {
      px.rect(x, y, 5, 4, 'bone').rect(x, y + 1, 4, 1, 'grey3').rect(x, y + 3, 5, 1, 'grey3').set(x + 5, y + 4, 'soil2').set(x + 1, y + 4, 'soil2');
    } else if (roll === 4) {
      let cx = pick(r, 3, 10), cy = pick(r, 3, 5);
      for (let i = 0; i < 8; i++) { px.set(cx, cy, 'soil1'); cy++; if (r() < 0.5) cx += r() < 0.5 ? 1 : -1; }
    } else if (roll === 5 || roll === 6) {
      for (let i = 0; i < 8; i++) px.set(x + i, y - (i >> 1), 'sand').set(x + i + 1, y - (i >> 1), 'sand');
    } else if (roll === 7) {
      px.ellipse(x + 3, y + 2, 4.4, 2.6, 'teal1').ellipse(x + 3, y + 2, 3.2, 1.6, 'blue').set(x + 1, y + 1, 'sky').set(x + 2, y + 1, 'sky');
    } else if (roll === 8) {
      px.rect(x, y, 3, 3, 'soil1').rect(x + 1, y, 1, 3, 'soil2').set(x + 3, y + 3, 'soil1');
    } else if (roll === 9) {
      for (const [dx, dy] of [[0, 0], [5, 3], [9, 1]] as [number, number][]) px.set(x + dx, y + dy, 'soil1').set(x + dx + 1, y + dy, 'soil1');
    }
  }
  schoolShadow(px, c, 'soil2');
  return px;
}

// ---------------------------------------------------------------- cafeteria checker
/** Bone and slate squares, 8 px, laid on the world grid so they run on across tiles. Trays, peas and milk get spilled. */
function checker(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16);
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const x = qx * 8, y = qy * 8;
      const dark = ((c.tx * 2 + qx + c.ty * 2 + qy) & 1) === 1;
      px.rect(x, y, 8, 8, dark ? 'slate' : 'bone');
      if (dark) px.rect(x, y + 7, 8, 1, 'dusk').rect(x + 7, y, 1, 8, 'dusk').rect(x, y, 7, 1, 'mist').rect(x, y, 1, 7, 'mist');
      else px.rect(x, y, 7, 1, 'white').rect(x, y, 1, 7, 'white').rect(x, y + 7, 8, 1, 'grey3').rect(x + 7, y, 1, 8, 'grey3');
    }
  }
  px.scatter(r, 'grey3', 4, 0, 0, 16, 16).scatter(r, 'dusk', 4);
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 511) % 20;
    const x = pick(r, 3, 9), y = pick(r, 3, 10);
    if (roll === 0) {
      px.ellipse(x + 3, y + 2, 4.4, 2.6, 'pine2').set(x + 2, y + 1, 'pine3').set(x + 4, y + 2, 'leaf').set(x + 6, y + 3, 'pine1').set(x + 1, y + 3, 'pine1');
    } else if (roll === 1) {
      px.rect(x, y, 8, 5, 'grey2').rect(x, y, 8, 1, 'grey3').frame(x, y, 8, 5, 'grey1').rect(x + 1, y + 2, 3, 2, 'soil2').rect(x + 5, y + 2, 2, 2, 'pine3');
    } else if (roll === 2) {
      px.ellipse(x + 3, y + 2, 4, 2.4, 'white').ellipse(x + 3, y + 2, 2.4, 1.2, 'bone').set(x + 8, y + 4, 'white');
    } else if (roll === 3) {
      px.rect(x, y, 4, 4, 'white').rect(x, y, 4, 1, 'grey3').rect(x + 1, y + 2, 2, 1, 'grey3').set(x + 4, y + 4, 'grey3');
    } else if (roll === 4) {
      for (let i = 0; i < 6; i++) px.set(x + i, y + (i >> 1), 'grey2');
    } else if (roll === 5) {
      px.rect(x, y, 3, 3, 'soil3').set(x + 1, y + 1, 'soil2').set(x + 3, y + 2, 'soil3');
    }
  }
  schoolShadow(px, c, 'grey3');
  return px;
}

// ---------------------------------------------------------------- gym court
/**
 * Maple boards, 4 px wide, laid across the tile with their end joints stepping from board to board. Paint is white:
 * a boundary line 2 px in from every wall, and a half-court line down every twelfth column.
 */
function gymfloor(c: TileCtx, r: Rnd): Px {
  const px = new Px(16);
  for (let k = 0; k < 4; k++) {
    const y = k * 4, row = c.ty * 4 + k;
    const tone: ColorName = hash2(row, 0, 521) % 3 === 0 ? 'soil2' : 'soil3';
    px.rect(0, y, 16, 4, tone).rect(0, y, 16, 1, tone === 'soil3' ? 'sand' : 'soil3').rect(0, y + 3, 16, 1, 'soil2');
    const j0 = hash2(row, 1, 522) % 40;
    for (let x = 0; x < 16; x++) if (((c.tx * 16 + x - j0) % 40 + 40) % 40 === 0) px.rect(x, y, 1, 4, 'soil1').rect(x + 1, y, 1, 3, 'sand');
  }
  for (let i = 0; i < 7; i++) {
    const x = pick(r, 0, 12), y = pick(r, 0, 3) * 4 + pick(r, 1, 2);
    px.rect(x, y, pick(r, 2, 4), 1, r() < 0.5 ? 'soil2' : 'sand');
  }
  schoolShadow(px, c, 'soil1');
  const white = (x: number, y: number, w: number, h: number): void => { px.rect(x, y, w, h, 'white'); };
  if (c.near.n !== 'gymfloor') white(0, 2, 16, 2);
  if (c.near.s !== 'gymfloor') white(0, 12, 16, 2);
  if (c.near.w !== 'gymfloor') white(2, 0, 2, 16);
  if (c.near.e !== 'gymfloor') white(12, 0, 2, 16);
  if (c.tx % 12 === 5) white(7, 0, 2, 16);
  if (hash2(c.tx, c.ty, 523) % 18 === 0) {
    const x = pick(r, 3, 9), y = pick(r, 4, 10);
    for (let i = 0; i < 5; i++) px.set(x + i, y + (i >> 1), 'soil1');
  }
  return px;
}

// ---------------------------------------------------------------- public
/** The three school floors. `bare` leaves off the scuffs and spills, so the same floor can sit under furniture. */
export function schoolGround(name: TileName, c: TileCtx, r: Rnd, bare = false): Px | null {
  switch (name) {
    case 'schoolfloor': return schoolfloor(c, r, bare);
    case 'checker': return checker(c, r, bare);
    case 'gymfloor': return gymfloor(c, r);
    default: return null;
  }
}
