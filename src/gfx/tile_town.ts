// The Palace Arcade and Main Street (stage 2.1, day): the arcade carpet with its scatter of neon shapes, the dark arcade
// wall with a neon tube and a poster here and there, the concrete sidewalk with its curb, and the storefronts with their
// striped awnings. Every pixel is a palette color; each tile reads its position hash so a street is not stamped, and the
// patterns that must run on across tiles (the carpet's shapes, the neon, the awning stripes) read world coordinates.
// Pure pixel work, so Node can run it. The patch and the barn are in tile_patch.ts and tile_barn.ts.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';

type Rnd = () => number;
const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

// ---------------------------------------------------------------- arcade carpet
const NEON: ColorName[] = ['magenta', 'cyan', 'yellow', 'sky', 'pink'];
/** The shapes scattered on the carpet, 5 px or less. */
const SHAPES: string[][] = [
  ['..#..', '.###.', '#####'], ['#...#', '.#.#.', '..#..'], ['.#.', '###', '.#.'], ['.#.', '#.#', '.#.'],
  ['.##.', '#..#', '.##.'], ['##.', '.##', '..#'], ['#.#', '.#.', '#.#'], ['#..#', '.##.', '#..#'],
];

/** Dark carpet with neon confetti, one shape in most 8 px cells, laid on the world grid so it runs on across tiles. */
function arcadecarpet(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16).fill('shadow');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((c.tx * 16 + x + c.ty * 16 + y) & 7) === 0 || ((x & 1) === 0 && (y & 1) === 0 && ((x + y) & 3) === 0)) px.set(x, y, 'night');
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const hv = hash2(c.tx * 2 + qx, c.ty * 2 + qy, 601);
      if (hv % 5 === 0) continue;
      const shape = SHAPES[(hv >>> 4) % SHAPES.length] as string[], col = NEON[(hv >>> 9) % NEON.length] as ColorName;
      const ox = qx * 8 + 1 + ((hv >>> 13) % 3), oy = qy * 8 + 1 + ((hv >>> 16) % 3);
      px.art(shape, { '#': col }, ox, oy);
      if ((hv >>> 19) % 5 === 0) px.set(ox + 6, oy + 1, 'purple');
    }
  }
  px.scatter(r, 'dusk', 6);
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 603) % 18;
    const x = pick(r, 3, 10), y = pick(r, 4, 10);
    if (roll === 0) px.ellipse(x + 3, y + 2, 4, 2.4, 'soil1').ellipse(x + 3, y + 2, 2.6, 1.4, 'soil2').set(x + 2, y + 1, 'soil3');
    else if (roll === 1) px.rect(x, y, 2, 2, 'amber').set(x, y, 'yellow');
    else if (roll === 2) px.rect(x, y, 5, 2, 'bone').rect(x + 1, y, 1, 2, 'red').rect(x + 3, y, 1, 2, 'red');
    else if (roll === 3) px.set(x, y, 'pink').set(x + 1, y, 'rose');
    else if (roll === 4) for (let i = 0; i < 6; i++) px.set(x + i, y + (i >> 2), 'slate');
    else if (roll === 5) px.rect(x, y, 3, 1, 'bone').set(x + 3, y, 'orange');
  }
  if (c.near.n === 'arcadewall') { px.rect(0, 0, 16, 1, 'ink'); for (let x = 0; x < 16; x++) { if (!(x & 1)) px.set(x, 1, 'ink'); if ((x & 3) === 1) px.set(x, 2, 'ink'); } }
  if (c.near.w === 'arcadewall') { px.rect(0, 0, 1, 16, 'ink'); for (let y = 0; y < 16; y += 2) px.set(1, y, 'ink'); }
  return px;
}

// ---------------------------------------------------------------- arcade wall
const INVADER = ['#.....#', '.#...#.', '.#####.', '##.#.##', '#######', '#.###.#', '#.#.#.#'];
/** The arcade wall: dark purple panels, a neon tube across it that changes color every four tiles, a poster now and then. */
function arcadewall(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('purple0');
  for (let x = 0; x < 16; x++) if (((c.tx * 16 + x) & 7) === 0) px.rect(x, 2, 1, 12, 'night');
  px.rect(0, 14, 16, 2, 'ink').rect(0, 13, 16, 1, 'shadow');
  px.rect(0, 9, 16, 1, 'night').rect(0, 10, 16, 3, 'shadow');
  px.scatter(r, 'night', 6, 0, 2, 16, 12);
  const tube: ColorName = (c.tx >> 2) & 1 ? 'cyan' : 'magenta', glow: ColorName = (c.tx >> 2) & 1 ? 'teal1' : 'purple';
  px.rect(0, 4, 16, 1, tube).rect(0, 5, 16, 1, 'white');
  for (let x = 0; x < 16; x++) { if (!(x & 1)) { px.set(x, 3, glow); px.set(x, 6, glow); } if ((x & 3) === 1) { px.set(x, 2, glow); px.set(x, 7, glow); } }
  if (c.near.n !== 'arcadewall') px.rect(0, 0, 16, 1, 'slate').rect(0, 1, 16, 1, 'dusk');
  const roll = hash2(c.tx, c.ty, 611) % 10;
  if (roll === 0) {
    px.rect(4, 8, 8, 5, 'ink').rect(5, 9, 6, 3, 'night');
    px.art(INVADER, { '#': 'leaf' }, 4, 8).rect(5, 12, 6, 1, 'yellow');
  } else if (roll === 1) {
    px.rect(5, 8, 6, 5, 'ink').frame(5, 8, 6, 5, 'yellow').rect(6, 9, 4, 3, 'hot').rect(7, 10, 2, 1, 'yellow');
  } else if (roll === 2) {
    px.rect(3, 8, 10, 5, 'ink');
    for (let i = 0; i < 4; i++) { px.rect(4 + i * 2, 9 + (i & 1), 1, 3, i & 1 ? 'hot' : 'cyan'); px.rect(5 + i * 2, 9 + (i & 1), 1, 3, 'bone'); }
  } else if (roll === 3) {
    px.rect(2, 7, 12, 1, 'dusk').rect(4, 8, 8, 1, 'shadow').set(7, 9, 'bone').set(8, 9, 'bone');
  }
  if (c.near.w !== 'arcadewall') px.rect(0, 2, 1, 12, 'ink');
  if (c.near.e !== 'arcadewall') px.rect(15, 2, 1, 12, 'ink');
  return px;
}

// ---------------------------------------------------------------- sidewalk
const isRoad = (n: TileName): boolean => n === 'road' || n === 'roadline';

/** Concrete slabs with a joint along the top and left, speckle, cracks, gum, a hopscotch now and then, and a curb on the road side. */
function sidewalk(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('grey3');
  px.scatter(r, 'bone', 9).scatter(r, 'grey2', 12).scatter(r, 'mist', 4);
  for (let i = 0; i < 3; i++) { const x0 = pick(r, 2, 11), y0 = pick(r, 3, 12); px.rect(x0, y0, pick(r, 2, 4), 1, 'grey2').rect(x0 + 1, y0 + 1, 2, 1, 'bone'); }
  px.rect(0, 0, 16, 1, 'grey2').rect(0, 1, 16, 1, 'bone').rect(0, 0, 1, 16, 'grey2').rect(1, 1, 1, 15, 'bone');
  const roll = hash2(c.tx, c.ty, 621) % 24;
  const x = pick(r, 3, 10), y = pick(r, 3, 10);
  if (roll < 3) { let cx = x, cy = 2; for (let i = 0; i < 11; i++) { px.set(cx, cy, 'grey1'); cy++; if (r() < 0.5) cx += r() < 0.5 ? 1 : -1; } }
  else if (roll === 3) px.set(x, y, 'pink').set(x + 1, y, 'rose');
  else if (roll === 4) { px.rect(x, y, 3, 2, 'soil2').set(x + 3, y + 1, 'pine2').set(x + 1, y - 1, 'soil3'); }
  else if (roll === 5) { for (let i = 0; i < 3; i++) px.frame(3, 3 + i * 4, 5, 5, 'white'); }
  else if (roll === 6) px.rect(x, y, 4, 3, 'grey2').rect(x + 1, y + 1, 2, 1, 'grey1');
  else if (roll === 7) { px.rect(x, y, 5, 1, 'soil1').rect(x + 1, y + 1, 3, 1, 'soil1'); }
  if (isRoad(c.near.s)) px.rect(0, 13, 16, 1, 'bone').rect(0, 14, 16, 1, 'grey2').rect(0, 15, 16, 1, 'grey1');
  if (isRoad(c.near.n)) px.rect(0, 0, 16, 1, 'grey1').rect(0, 1, 16, 1, 'grey2').rect(0, 2, 16, 1, 'bone');
  if (isRoad(c.near.w)) px.rect(0, 0, 1, 16, 'grey1').rect(1, 0, 1, 16, 'grey2');
  if (isRoad(c.near.e)) px.rect(15, 0, 1, 16, 'grey1').rect(14, 0, 1, 16, 'grey2');
  const grass = (n: TileName): boolean => n === 'grass' || n === 'grass2' || n === 'flowers';
  for (const [n, side] of [[c.near.n, 0], [c.near.e, 1], [c.near.s, 2], [c.near.w, 3]] as [TileName, number][]) {
    if (!grass(n)) continue;
    for (let i = 0; i < 16; i++) {
      const depth = hash2(c.tx * 16 + i, c.ty * 7 + side, 623) % 3;
      for (let d = 0; d < depth; d++) px.set(side === 0 || side === 2 ? i : side === 1 ? 15 - d : d, side === 1 || side === 3 ? i : side === 0 ? d : 15 - d, d === depth - 1 && (i & 1) ? 'pine3' : 'pine2');
    }
  }
  return px;
}

// ---------------------------------------------------------------- storefront
const AWNINGS: [ColorName, ColorName][] = [['red', 'bone'], ['blue', 'white'], ['pine2', 'bone'], ['orange', 'bone'], ['purple', 'bone']];
const GOODS: ColorName[] = ['amber', 'pink', 'cyan', 'leaf', 'hot', 'yellow', 'sand', 'sky'];

/** A shop front under a striped awning that runs on across the tiles: display window, goods on shelves, and a door now and then. */
function storefront(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('soil1');
  const [a, b] = AWNINGS[hash2(c.tx >> 2, c.ty, 631) % AWNINGS.length] as [ColorName, ColorName];
  for (let x = 0; x < 16; x++) {
    const stripe = ((c.tx * 16 + x) >> 2) & 1;
    px.rect(x, 0, 1, 5, stripe ? b : a);
    if ((x & 3) === 1 || (x & 3) === 2) px.set(x, 5, stripe ? b : a);
    px.set(x, 4, stripe ? 'grey3' : a === 'red' ? 'blood1' : 'dusk');
  }
  px.rect(0, 6, 16, 1, 'shadow');
  const door = hash2(c.tx, c.ty, 633) % 7 === 0 && c.near.w === 'storefront' && c.near.e === 'storefront';
  if (door) {
    px.rect(2, 7, 12, 9, 'soil2').frame(2, 7, 12, 9, 'soil0').rect(4, 8, 8, 4, 'sky').rect(4, 8, 8, 1, 'white').rect(7, 8, 1, 4, 'soil1');
    px.rect(4, 13, 8, 2, 'soil3').rect(10, 12, 1, 1, 'amber').rect(5, 6, 6, 1, 'bone').rect(6, 6, 2, 1, 'hot');
    return px;
  }
  px.rect(1, 7, 14, 7, 'sky').rect(1, 7, 14, 1, 'white');
  px.rect(1, 11, 14, 1, 'blue').rect(1, 12, 14, 2, 'dusk');
  for (let x = 2; x < 14; x += 3) {
    const h = 1 + (hash2(c.tx * 5 + x, c.ty, 635) % 3);
    px.rect(x, 12 - h, 2, h, GOODS[hash2(c.tx, x, 637) % GOODS.length] as ColorName);
  }
  for (let x = 2; x < 14; x += 3) if (hash2(c.tx, x, 639) % 3 === 0) px.rect(x, 8, 2, 2, GOODS[hash2(x, c.tx, 641) % GOODS.length] as ColorName);
  const g = pick(r, 3, 6);
  for (let i = 0; i < 4; i++) px.set(g + i, 12 - i - 1 + 1, 'white');
  px.rect(0, 7, 1, 7, 'soil2').rect(15, 7, 1, 7, 'soil2').rect(0, 14, 16, 2, 'grey2').rect(0, 14, 16, 1, 'grey3');
  return px;
}

// ---------------------------------------------------------------- public
/** The 13 tiles of stage 2.1, in the order the sheet shows them: the arcade and the street, the patch, the barn and the field. */
export const PATCH_TILES: readonly TileName[] = [
  'arcadecarpet', 'arcadewall', 'sidewalk', 'storefront', 'furrow', 'pumpkin', 'rotpumpkin', 'haybale', 'barnwall', 'barnroof', 'corn', 'rot', 'hole',
];

/** The walkable town tiles: the arcade carpet and the sidewalk. Null for any other tile. */
export function townGround(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'arcadecarpet': return arcadecarpet(c, r);
    case 'sidewalk': return sidewalk(c, r);
    default: return null;
  }
}

/** The solid town tiles: the arcade wall and the storefront. Null for any other tile. */
export function townObject(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'arcadewall': return arcadewall(c, r);
    case 'storefront': return storefront(c, r);
    default: return null;
  }
}
