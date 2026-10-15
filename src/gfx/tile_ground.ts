// Ground and water tiles (the lab floors are in tile_lab.ts and tile_lab2.ts, the school floors in tile_school.ts, the arcade and street floors in tile_town.ts, the patch in tile_patch.ts). Every static tile is generated from its position hash, so no two are alike.
import type { TileName } from '../core/tiles.ts';
import { createRng } from '../core/rng.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import { labGround } from './tile_lab.ts';
import { lab2Ground } from './tile_lab2.ts';
import { schoolGround } from './tile_school.ts';
import { townGround } from './tile_town.ts';
import { patchGround } from './tile_patch.ts';
import { mallGround } from './tile_mall.ts';
import { baseGround } from './tile_base.ts';

type Rnd = () => number;

/** The four neighbours of a tile. Off-map neighbours count as the tile itself. */
export interface Near { n: TileName; e: TileName; s: TileName; w: TileName }
/** A rectangle of tiles. */
export interface TileBox { tx: number; ty: number; w: number; h: number }
/**
 * Where a tile sits in a run of its own kind: how many of its kind lie unbroken to its west and north, and how long the run is across and
 * down. It is set for the tiles that paint one big picture over a block of them (the fountain, the lift, the machine), so each tile knows
 * which piece of the picture is its own.
 */
export interface Block { ox: number; oy: number; w: number; h: number }
/** court: the gym court a tile is painted in (findCourts in tile_school.ts), so its lines frame the court. Absent elsewhere. */
export interface TileCtx {
  tx: number; ty: number; near: Near; court?: TileBox; blk?: Block;
  /** Set on a tile of a stage that has the mall in it: the school's checker is Scoops Ahoy's floor there, and goes as dim as the mall at night (night.ts). */
  mall?: boolean;
}

export const isWater = (n: TileName): boolean => n === 'shallows' || n === 'creek';
export const isTree = (n: TileName): boolean => n === 'pine' || n === 'deadtree';
const isRoad = (n: TileName): boolean => n === 'road' || n === 'roadline';

export function nameSeed(n: TileName): number {
  let s = 7;
  for (let i = 0; i < n.length; i++) s = (s * 31 + n.charCodeAt(i)) | 0;
  return s;
}

export function rngFor(c: TileCtx, name: TileName, extra = 0): Rnd {
  return createRng(hash2(c.tx, c.ty, nameSeed(name) + extra));
}

function tuft(px: Px, r: Rnd, c: ColorName): void {
  const x = 1 + Math.floor(r() * 12), y = 1 + Math.floor(r() * 13);
  px.set(x, y, c); px.set(x + 2, y, c); px.set(x + 1, y + 1, c);
}

/** A few grass blades poking in from the neighbours' side of a path tile. */
function ragged(px: Px, c: TileCtx): void {
  const sides: [TileName, number][] = [[c.near.n, 0], [c.near.e, 1], [c.near.s, 2], [c.near.w, 3]];
  for (const [nb, side] of sides) {
    const col: ColorName | null = nb === 'grass' || nb === 'flowers' ? 'pine2' : nb === 'grass2' ? 'pine1' : null;
    if (!col) continue;
    for (let i = 0; i < 16; i++) {
      const depth = hash2(c.tx * 16 + i, c.ty * 7 + side, 11) % 3;
      for (let d = 0; d < depth; d++) {
        const x = side === 0 || side === 2 ? i : side === 1 ? 15 - d : d;
        const y = side === 1 || side === 3 ? i : side === 0 ? d : 15 - d;
        px.set(x, y, d === depth - 1 && (i & 1) ? (col === 'pine2' ? 'pine3' : 'pine2') : col);
      }
    }
  }
}

function decorate(px: Px, r: Rnd, c: TileCtx, name: TileName): void {
  const roll = hash2(c.tx, c.ty, 77) % 24;
  if (name === 'grass' || name === 'grass2') {
    const x = 2 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 10);
    if (roll === 0) { px.rect(x, y, 3, 1, 'hot').set(x + 1, y + 1, 'bone'); px.set(x, y, 'red'); }
    else if (roll === 1) { px.set(x, y, 'grey2'); px.set(x + 1, y, 'grey3'); px.set(x, y + 1, 'grey1'); }
    else if (roll === 2) { px.set(x, y, 'amber'); px.set(x + 1, y + 1, 'orange'); px.set(x + 2, y, 'soil3'); }
    else if (roll === 3 && name === 'grass2') { px.rect(x, y, 4, 1, 'soil1'); px.rect(x + 1, y + 1, 3, 1, 'soil0'); }
  }
}

/** Walkable ground and the road family. Returns null for tiles that are not ground. */
export function groundTile(name: TileName, c: TileCtx): Px | null {
  const px = new Px(16);
  const r = rngFor(c, name);
  switch (name) {
    case 'grass':
      px.fill('pine2').scatter(r, 'pine1', 6).scatter(r, 'pine3', 10);
      for (let i = 0; i < 3; i++) tuft(px, r, 'pine3');
      decorate(px, r, c, name);
      return px;
    case 'grass2':
      px.fill('pine1').scatter(r, 'pine0', 9).scatter(r, 'pine2', 7).scatter(r, 'soil1', 2);
      for (let i = 0; i < 2; i++) tuft(px, r, 'pine2');
      decorate(px, r, c, name);
      return px;
    case 'flowers': {
      px.fill('pine2').scatter(r, 'pine1', 6).scatter(r, 'pine3', 8);
      const petals: ColorName[] = ['white', 'pink', 'yellow', 'magenta'];
      const pick = petals[hash2(c.tx, c.ty, 3) % 4] as ColorName;
      for (let i = 0; i < 4; i++) {
        const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 12);
        px.set(x, y + 1, 'pine3');
        px.set(x, y, i % 2 ? pick : 'white');
        px.set(x + 1, y, 'yellow');
      }
      return px;
    }
    case 'dirt':
      px.fill('soil2').scatter(r, 'soil1', 14).scatter(r, 'soil3', 10);
      px.set(3 + Math.floor(r() * 9), 3 + Math.floor(r() * 9), 'grey2');
      px.set(2 + Math.floor(r() * 10), 4 + Math.floor(r() * 9), 'mist');
      ragged(px, c);
      return px;
    case 'trail':
      px.fill('soil3').scatter(r, 'sand', 18).scatter(r, 'soil2', 12);
      px.set(2 + Math.floor(r() * 11), 2 + Math.floor(r() * 11), 'soil1');
      ragged(px, c);
      return px;
    case 'road':
    case 'roadline': {
      px.fill('grey1').scatter(r, 'grey2', 20).scatter(r, 'ink', 5);
      if (r() < 0.25) {
        let x = 2 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 10);
        for (let i = 0; i < 5; i++) { px.set(x, y, 'black'); x += r() < 0.5 ? 1 : 0; y += r() < 0.6 ? 1 : 0; }
      }
      if (name === 'roadline') {
        const hRun = isRoad(c.near.e) && isRoad(c.near.w), vRun = isRoad(c.near.n) && isRoad(c.near.s);
        const horiz = hRun || !vRun;
        if (horiz) px.rect(2, 7, 11, 2, 'amber').rect(2, 7, 11, 1, 'yellow');
        else px.rect(7, 2, 2, 11, 'amber').rect(7, 2, 1, 11, 'yellow');
      }
      return px;
    }
    case 'planks': {
      // Boards run across the direction of travel: a bridge over water gets rails on its water sides.
      const waterNS = isWater(c.near.n) || isWater(c.near.s);
      const waterEW = isWater(c.near.e) || isWater(c.near.w);
      const vertical = waterNS && !waterEW;
      px.fill('soil1');
      const joint = Math.floor(r() * 16);
      for (let b = 0; b < 4; b++) {
        const o = b * 4;
        for (let i = 0; i < 16; i++) {
          const j = (i + (b & 1) * 7 + joint) % 16;
          const lit = j < 15;
          if (vertical) { px.set(o, i, 'soil2'); px.set(o + 1, i, lit ? 'soil3' : 'soil2'); px.set(o + 2, i, 'soil3'); px.set(o + 3, i, 'soil2'); }
          else { px.set(i, o, 'soil2'); px.set(i, o + 1, lit ? 'sand' : 'soil3'); px.set(i, o + 2, 'soil3'); px.set(i, o + 3, 'soil2'); }
        }
      }
      px.scatter(r, 'soil1', 6);
      for (let b = 0; b < 4; b++) { if (vertical) { px.set(b * 4 + 1, 2, 'grey2'); px.set(b * 4 + 1, 13, 'grey2'); } else { px.set(2, b * 4 + 1, 'grey2'); px.set(13, b * 4 + 1, 'grey2'); } }
      if (isWater(c.near.n) && vertical) px.rect(0, 0, 16, 2, 'soil1').rect(0, 2, 16, 1, 'soil3');
      if (isWater(c.near.s) && vertical) px.rect(0, 14, 16, 2, 'soil1').rect(0, 13, 16, 1, 'soil3');
      if (isWater(c.near.w) && waterEW) px.rect(0, 0, 2, 16, 'soil1').rect(2, 0, 1, 16, 'soil3');
      if (isWater(c.near.e) && waterEW) px.rect(14, 0, 2, 16, 'soil1').rect(13, 0, 1, 16, 'soil3');
      return px;
    }
    case 'gravel':
      px.fill('grey2').scatter(r, 'grey1', 12).scatter(r, 'grey3', 14);
      for (let i = 0; i < 5; i++) { const x = 1 + Math.floor(r() * 13), y = Math.floor(r() * 15); px.set(x, y, 'mist'); px.set(x + 1, y, 'grey3'); px.set(x, y + 1, 'grey1'); }
      return px;
    case 'labfloor':
    case 'labfloor2':
    case 'hazard':
    case 'vent':
      return labGround(name, c, r);
    case 'tilegreen':
    case 'carpet':
    case 'plate':
    case 'cable':
    case 'drain':
    case 'stain':
    case 'vines':
      return lab2Ground(name, c, r, (n) => groundTile(n, c));
    case 'schoolfloor':
    case 'checker':
    case 'gymfloor':
      return schoolGround(name, c, r);
    case 'arcadecarpet':
    case 'sidewalk':
      return townGround(name, c, r);
    case 'furrow':
    case 'rot':
    case 'hole':
      return patchGround(name, c, r);
    case 'mallfloor':
    case 'mallband':
    case 'servicefloor':
      return mallGround(name, c);
    case 'basefloor':
    case 'basegrate':
    case 'keyfloor':
      return baseGround(name, c);
    default:
      return null;
  }
}

/** Neighbour bits for water banks: 1 north, 2 east, 4 south, 8 west is land. */
export function bankMask(near: Near): number {
  return (isWater(near.n) ? 0 : 1) | (isWater(near.e) ? 0 : 2) | (isWater(near.s) ? 0 : 4) | (isWater(near.w) ? 0 : 8);
}

/** One frame of creek (deep) or shallows. Ripples slide 4 px per frame and wrap, so neighbours join up. */
export function waterTile(deep: boolean, variant: number, frame: number, banks: number): Px {
  const px = new Px(16);
  const r = createRng(variant * 977 + (deep ? 13 : 5));
  px.fill(deep ? 'teal0' : 'teal1');
  if (!deep) {
    const rs = createRng(variant * 31 + 9);
    px.scatter(rs, 'sand', 4, 0, 6, 16, 10).scatter(rs, 'soil3', 3, 0, 6, 16, 10).scatter(rs, 'teal0', 3);
  }
  const dashes = deep ? 4 : 3;
  for (let i = 0; i < dashes; i++) {
    const y = 1 + Math.floor(r() * 14), x0 = Math.floor(r() * 16), len = 3 + Math.floor(r() * 3);
    for (let k = 0; k < len; k++) px.set((x0 + frame * 4 + k) & 15, y, deep ? 'teal1' : 'cyan');
    if (deep && (frame + i) % 4 === 0) { px.set((x0 + frame * 4 + 1) & 15, y - 1, 'cyan'); px.set((x0 + frame * 4 + 2) & 15, y - 1, 'sky'); }
  }
  const bank: ColorName = deep ? 'soil1' : 'sand';
  const rim: ColorName = deep ? 'soil0' : 'soil3';
  for (let side = 0; side < 4; side++) {
    if (!(banks & (1 << side))) continue;
    for (let i = 0; i < 16; i++) {
      const depth = 1 + (hash2(i, side, variant) % 2);
      for (let d = 0; d < depth + 1; d++) {
        const x = side === 0 || side === 2 ? i : side === 1 ? 15 - d : d;
        const y = side === 1 || side === 3 ? i : side === 0 ? d : 15 - d;
        px.set(x, y, d < depth ? bank : rim);
      }
      if ((i + frame * 2) % 5 === 0) {
        const d = depth + 1;
        const x = side === 0 || side === 2 ? i : side === 1 ? 15 - d : d;
        const y = side === 1 || side === 3 ? i : side === 0 ? d : 15 - d;
        px.set(x, y, 'mist');
      }
    }
  }
  return px;
}

