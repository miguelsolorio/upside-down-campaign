// The barn and the corn (stage 2.1, day): red plank walls with white trim and a braced door, a rust red metal roof, and
// the walls of corn the far field is cut through. All solid. The corn is green, ripe or dead by position (and dead beside
// the rot and the hole), and its stalks stand on a world grid so a wall of it is one thicket. Pure pixel work, so Node can
// run it. The patch tiles are in tile_patch.ts.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';

type Rnd = () => number;
const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
const isBarn = (n: TileName): boolean => n === 'barnwall' || n === 'barnroof';

// ---------------------------------------------------------------- barn wall
/** Red boards 4 px wide with dark seams, knots and sun fade, white trim at the eaves and the sill, and a braced double door every few tiles. */
function barnwall(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('red');
  for (let x = 0; x < 16; x += 4) { px.rect(x + 3, 0, 1, 16, 'blood1'); px.rect(x, 0, 1, 16, hash2(c.tx * 4 + (x >> 2), 0, 641) % 4 === 0 ? 'blood1' : 'red'); }
  px.scatter(r, 'blood1', 9).scatter(r, 'hot', 3, 0, 2, 16, 12).scatter(r, 'soil2', 3);
  for (let i = 0; i < 2; i++) { const x = pick(r, 1, 13), y = pick(r, 4, 11); px.set(x, y, 'blood0').set(x + 1, y, 'blood1'); }
  if (!isBarn(c.near.n)) px.rect(0, 0, 16, 2, 'bone').rect(0, 2, 16, 1, 'blood0');
  px.rect(0, 14, 16, 2, 'bone').rect(0, 13, 16, 1, 'blood0').rect(0, 15, 16, 1, 'grey3');
  const pair = c.tx >> 1;
  if (hash2(pair, c.ty, 643) % 5 === 0 && c.near.s !== 'barnwall') {
    const left = (c.tx & 1) === 0;
    px.rect(0, 4, 16, 9, 'red').rect(0, 3, 16, 1, 'bone').rect(0, 13, 16, 1, 'bone');
    for (let x = 3; x < 16; x += 4) px.rect(x, 4, 1, 9, 'blood1');
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      px.set(i, Math.round(left ? 4 + t * 4 : 8 - t * 4), 'bone').set(i, Math.round(left ? 12 - t * 4 : 8 + t * 4), 'bone');
    }
    px.rect(left ? 0 : 15, 3, 1, 11, 'bone').rect(left ? 15 : 0, 3, 1, 11, left ? 'blood1' : 'bone');
    if (left) px.rect(13, 7, 2, 3, 'grey2').set(13, 7, 'grey3'); else px.rect(1, 7, 2, 3, 'grey2').set(1, 7, 'grey3');
  }
  if (c.near.w !== 'barnwall') px.rect(0, 0, 1, 14, 'bone');
  if (c.near.e !== 'barnwall') px.rect(15, 0, 1, 14, 'bone');
  return px;
}

// ---------------------------------------------------------------- barn roof
/** A rust red metal roof from above: ribs that run down the slope, rust streaks, a ridge cap and an eave that throws a shadow. */
function barnroof(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('blood0');
  for (let x = 0; x < 16; x++) {
    const k = (c.tx * 16 + x) & 3;
    px.rect(x, 0, 1, 16, k === 0 ? 'blood1' : k === 1 ? 'blood1' : 'blood0');
    if (k === 0) for (let y = 0; y < 16; y += 4) px.set(x, y + (hash2(x, y, 651) % 3), 'red');
  }
  px.scatter(r, 'soil2', 6).scatter(r, 'soil1', 5).scatter(r, 'grey2', 2);
  for (let i = 0; i < 2; i++) { const x = pick(r, 1, 14), y = pick(r, 2, 8); for (let k = 0; k < pick(r, 3, 6); k++) px.set(x, y + k, 'soil2'); }
  if (hash2(c.tx, c.ty, 653) % 9 === 0) px.rect(pick(r, 3, 9), pick(r, 3, 9), 4, 3, 'pine1').set(5, 5, 'pine2');
  if (!isBarn(c.near.n) || c.near.n === 'barnwall') px.rect(0, 0, 16, 1, 'red').rect(0, 1, 16, 2, 'hot').rect(0, 3, 16, 1, 'blood1');
  if (c.near.s !== 'barnroof') { px.rect(0, 12, 16, 1, 'red').rect(0, 13, 16, 1, 'blood1'); for (let x = 0; x < 16; x++) { px.set(x, 14, x & 1 ? 'ink' : 'blood0'); px.set(x, 15, 'ink'); } }
  if (c.near.w !== 'barnroof') px.rect(0, 0, 1, 16, 'red').rect(1, 0, 1, 16, 'blood1');
  if (c.near.e !== 'barnroof') px.rect(15, 0, 1, 16, 'ink').rect(14, 0, 1, 16, 'blood0');
  return px;
}

// ---------------------------------------------------------------- corn
/** Green, ripe or dead corn: stalks on a world grid with leaves, ears and tassels, standing in furrows that show along the bottom. */
function corn(c: TileCtx, r: Rnd): Px {
  const near = [c.near.n, c.near.e, c.near.s, c.near.w];
  const dead = near.some((n) => n === 'hole' || n === 'rot') || hash2(c.tx >> 1, c.ty >> 1, 661) % 7 === 0;
  const ripe = !dead && hash2(c.tx >> 1, c.ty >> 1, 663) % 3 === 0;
  const stalk: ColorName = dead ? 'soil3' : ripe ? 'sand' : 'pine2';
  const lit: ColorName = dead ? 'sand' : ripe ? 'yellow' : 'pine3';
  const leaf: ColorName = dead ? 'soil2' : ripe ? 'soil3' : 'pine3';
  const hi: ColorName = dead ? 'sand' : ripe ? 'cream' : 'leaf';
  const px = new Px(16).fill(dead ? 'soil1' : 'pine0');
  px.scatter(r, dead ? 'soil0' : 'pine1', 26);
  px.rect(0, 13, 16, 3, 'soil1').scatter(r, 'soil2', 5, 0, 13, 16, 3).scatter(r, 'soil0', 4, 0, 13, 16, 3);
  for (let gx = 0; gx < 16; gx++) {
    const col = c.tx * 16 + gx;
    if ((col & 3) !== 1) continue;
    const jit = hash2(col, 0, 665) % 3, top = jit;
    px.rect(gx, top + 1, 1, 13 - top, stalk).rect(gx + 1, top + 2, 1, 12 - top, leaf === stalk ? 'soil1' : 'pine1');
    px.set(gx, top + 1, lit);
    for (let k = 0; k < 4; k++) {
      const dx = (k + (col >> 2)) & 1 ? 1 : -1, y = top + 2 + k * 3, len = k === 3 ? 4 : 5;
      for (let i = 1; i <= len; i++) px.set(gx + dx * i, y + Math.floor(i * (dead ? 0.9 : 0.55)), i === len ? hi : i === 1 ? stalk : leaf);
    }
    if ((hash2(col, 2, 669) % 3) !== 0) {
      const ey = top + 6 + (hash2(col, 3, 671) % 3), ex = gx + ((col >> 2) & 1 ? 1 : -2);
      px.rect(ex, ey, 2, 3, dead ? 'soil2' : 'amber').rect(ex, ey, 1, 3, dead ? 'soil3' : 'yellow').rect(ex, ey + 3, 2, 1, dead ? 'soil1' : 'pine2');
    }
    if (top < 2) px.set(gx - 1, top, 'sand').set(gx + 1, top, 'sand').set(gx, top - 1, 'bone');
    px.set(gx, 14, 'soil0').set(gx + 1, 14, 'soil1');
  }
  return px;
}
// ---------------------------------------------------------------- public
/** The barn and corn tiles. Null for any other tile. */
export function barnObject(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'barnwall': return barnwall(c, r);
    case 'barnroof': return barnroof(c, r);
    case 'corn': return corn(c, r);
    default: return null;
  }
}
