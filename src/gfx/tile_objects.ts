// Solid tiles: trees, bushes, rocks, stumps, fences, the Byers house, the shed, the lamp and the mailbox. The lab walls, pipes, glass and cages are in tile_lab.ts, the lockers, benches, cabinets, shelves, mass and wall signs in tile_lab3.ts.
// Trees read their neighbours so a forest is one canopy with trunks only along its south edge.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import { groundTile, isTree, rngFor } from './tile_ground.ts';
import type { TileCtx } from './tile_ground.ts';
import type { ColorName } from './palette.ts';
import { labObject } from './tile_lab.ts';
import { lab2Object } from './tile_lab3.ts';

const GROUNDS = new Set<TileName>([
  'grass', 'grass2', 'dirt', 'trail', 'gravel', 'flowers', 'labfloor', 'labfloor2', 'hazard', 'vent',
  'tilegreen', 'carpet', 'plate', 'cable', 'drain', 'stain', 'vines',
]);
/** Floors that are a mark on another floor: an object beside one stands on the plain floor named here, unless a plain floor is also beside it. */
const MARKED: Partial<Record<TileName, TileName>> = { hazard: 'labfloor', vent: 'labfloor', cable: 'labfloor', drain: 'tilegreen', stain: 'labfloor', vines: 'carpet' };

/** The ground an object stands on: whatever its neighbours are, else the given default. */
function under(c: TileCtx, prefer: TileName): Px {
  let pick = prefer, marked: TileName | null = null;
  for (const n of [c.near.s, c.near.n, c.near.e, c.near.w]) {
    if (!GROUNDS.has(n)) continue;
    const plain = MARKED[n];
    if (plain) { marked ??= plain; continue; }
    pick = n === 'flowers' ? 'grass' : n;
    marked = null;
    break;
  }
  return groundTile(marked ?? pick, c) as Px;
}

/** A soft ground shadow: every other pixel in a flat oval. */
function groundShadow(px: Px, cx: number, y: number, rx: number): void {
  for (let i = -rx; i <= rx; i++) if ((i + y) & 1) px.set(cx + i, y, 'pine0');
}

function needle(X: number, Y: number): ColorName {
  const zig = (((X + (hash2(X >> 3, Y >> 3, 5) & 3)) & 3) < 2 ? 0 : 1);
  const yy = Y + zig;
  if (yy % 4 === 0) return (yy % 8 === 0 && (X & 3) === 0) ? 'pine3' : 'pine2';
  if (yy % 4 === 1) return 'pine0';
  return 'pine1';
}

/** Which pixels of a pine tile are canopy: an oval, stretched into the neighbouring tiles that are trees too. */
export function pineMask(c: TileCtx): Uint8Array {
  const { near } = c;
  const below = isTree(near.s), above = isTree(near.n), left = isTree(near.w), right = isTree(near.e);
  const mask = new Uint8Array(256);
  const cy = below ? 8 : 6.2, ry = below ? 9 : 6.6;
  const flip = hash2(c.tx, c.ty, 4) & 1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const a = (x + 0.5 - 8) / (flip ? 7.4 : 7.9), b = (y + 0.5 - cy) / ry;
      let on = a * a + b * b <= 1;
      if (above && y < 8 && x >= 1 && x <= 14) on = true;
      if (below && y >= 8 && x >= 1 && x <= 14) on = true;
      if (left && x < 5 && y >= 1 && y <= (below ? 15 : 12)) on = true;
      if (right && x > 10 && y >= 1 && y <= (below ? 15 : 12)) on = true;
      mask[y * 16 + x] = on ? 1 : 0;
    }
  }
  return mask;
}

function pine(c: TileCtx): Px {
  const px = under(c, 'grass2');
  const { near } = c;
  const below = isTree(near.s), above = isTree(near.n), left = isTree(near.w), right = isTree(near.e);
  if (!below) {
    px.rect(6, 11, 4, 5, 'soil1').rect(6, 11, 1, 5, 'soil2');
    px.set(5, 15, 'soil1'); px.set(10, 15, 'soil1'); px.set(4, 15, 'soil0'); px.set(11, 15, 'soil0');
    groundShadow(px, 8, 15, 6);
  }
  const mask = pineMask(c);
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x > 15 || y > 15 ? ((x < 0 && left) || (x > 15 && right) || (y < 0 && above) || (y > 15 && below) ? 1 : 0) : (mask[y * 16 + x] as number));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!mask[y * 16 + x]) continue;
      let col = needle(c.tx * 16 + x, c.ty * 16 + y);
      if (!at(x, y + 1) || (!at(x + 1, y) && (y & 1))) col = 'pine0';
      else if (!at(x, y - 1) || !at(x - 1, y)) col = col === 'pine0' ? 'pine1' : col === 'pine1' ? 'pine2' : 'pine3';
      px.set(x, y, col);
    }
  }
  const r = rngFor(c, 'pine');
  for (let i = 0; i < 3; i++) {
    const x = 3 + Math.floor(r() * 9), y = 2 + Math.floor(r() * 8);
    if (mask[y * 16 + x]) { px.set(x, y, 'pine3'); px.set(x + 1, y, 'leaf'); }
  }
  return px;
}

function deadtree(c: TileCtx): Px {
  const px = under(c, 'grass2');
  const v = hash2(c.tx, c.ty, 6) % 3;
  const r = rngFor(c, 'deadtree');
  groundShadow(px, 8, 15, 5);
  const tr: ColorName = 'soil1', hi: ColorName = 'grey2';
  px.rect(7, 9, 3, 7, tr).rect(7, 9, 1, 7, hi);
  px.set(6, 15, tr); px.set(10, 15, tr);
  const branch = (x0: number, y0: number, x1: number, y1: number): void => { px.line(x0, y0, x1, y1, tr); px.set(x0, y0 - 1, hi); };
  if (v === 0) {
    branch(8, 10, 3, 4); branch(9, 8, 13, 2); branch(8, 12, 12, 8); branch(5, 7, 3, 7); branch(11, 5, 14, 5);
  } else if (v === 1) {
    px.rect(8, 5, 2, 5, tr).set(8, 5, hi);
    branch(8, 7, 4, 2); branch(9, 5, 13, 1); branch(8, 11, 4, 8); branch(10, 10, 14, 7); branch(4, 4, 2, 4);
  } else {
    px.rect(7, 6, 2, 4, tr);
    branch(7, 7, 4, 1); branch(8, 7, 12, 1); branch(7, 11, 3, 9); branch(9, 11, 13, 9); branch(4, 3, 2, 4); branch(12, 3, 14, 4);
  }
  px.scatter(r, 'grey3', 3, 3, 1, 10, 9);
  return px;
}

function bush(c: TileCtx): Px {
  const px = under(c, 'grass');
  const v = hash2(c.tx, c.ty, 8) % 3;
  const r = rngFor(c, 'bush');
  groundShadow(px, 8, 14, 5);
  px.ellipse(8, 9, 6.6, 5.4, 'pine1').ellipse(8, 8.4, 6, 4.8, 'pine2');
  px.ellipse(6.2, 7, 3, 2.2, 'pine3').scatter(r, 'leaf', 4, 3, 4, 6, 4);
  for (let x = 3; x < 14; x++) if (px.get(x, 13) && (x & 1)) px.set(x, 13, 'pine0');
  px.rect(4, 12, 9, 1, 'pine1');
  if (v === 2) for (let i = 0; i < 4; i++) { const x = 4 + Math.floor(r() * 8), y = 6 + Math.floor(r() * 5); px.set(x, y, 'hot'); px.set(x, y - 1, 'red'); }
  return px;
}

function rock(c: TileCtx): Px {
  const px = under(c, 'grass2');
  const v = hash2(c.tx, c.ty, 9) % 3;
  const r = rngFor(c, 'rock');
  groundShadow(px, 8, 14, 6);
  px.ellipse(8, 9.6, 6.6, 4.8, 'grey1').ellipse(8, 9, 6.2, 4.4, 'grey2');
  px.ellipse(6.4, 7.6, 3.4, 2.2, 'grey3');
  px.rect(5, 12, 7, 1, 'grey1').scatter(r, 'grey1', 3, 3, 8, 9, 4);
  if (v === 1) { px.line(8, 6, 10, 9, 'grey1'); px.set(4, 6, 'pine2'); px.set(5, 5, 'pine3'); px.set(6, 5, 'pine2'); }
  if (v === 2) { px.ellipse(12.2, 12.4, 2.4, 1.8, 'grey2').set(11, 11, 'grey3'); px.line(7, 6, 6, 9, 'grey1'); }
  return px;
}

function stump(c: TileCtx): Px {
  const px = under(c, 'grass2');
  const r = rngFor(c, 'stump');
  groundShadow(px, 8, 15, 6);
  px.rect(4, 8, 8, 6, 'soil2').rect(4, 8, 2, 6, 'soil3').rect(10, 8, 2, 6, 'soil1');
  px.rect(7, 9, 1, 5, 'soil1').rect(9, 10, 1, 4, 'soil1').set(5, 11, 'sand');
  px.rect(3, 13, 10, 1, 'soil1').set(2, 14, 'soil1').set(3, 14, 'soil1').set(12, 14, 'soil1').set(13, 14, 'soil1');
  px.ellipse(8, 8, 5, 2.6, 'soil1').ellipse(8, 7.8, 4.4, 2.1, 'sand').ellipse(8, 7.8, 2.8, 1.4, 'soil3').ellipse(8, 7.8, 1.2, 0.7, 'sand');
  px.scatter(r, 'pine2', 2, 3, 12, 10, 2);
  return px;
}

// ---------------------------------------------------------------- fences
function fence(c: TileCtx, lab: boolean): Px {
  const px = under(c, lab ? 'gravel' : 'grass');
  const same = (n: TileName): boolean => n === (lab ? 'labfence' : 'fence');
  const horiz = same(c.near.w) || same(c.near.e) || !(same(c.near.n) || same(c.near.s));
  const r = rngFor(c, lab ? 'labfence' : 'fence');
  if (!lab) {
    groundShadow(px, 8, 15, 6);
    if (horiz) {
      for (const y of [5, 9]) px.rect(0, y, 16, 2, 'soil3').rect(0, y + 1, 16, 1, 'soil2').scatter(r, 'sand', 1, 0, y, 16, 1);
      px.rect(6, 3, 4, 11, 'soil2').rect(6, 3, 1, 11, 'soil3').rect(6, 3, 4, 1, 'sand').rect(9, 4, 1, 10, 'soil1');
    } else {
      px.rect(7, 0, 2, 16, 'soil3').rect(8, 0, 1, 16, 'soil2');
      px.rect(5, 5, 6, 8, 'soil2').rect(5, 5, 1, 8, 'soil3').rect(5, 5, 6, 1, 'sand').rect(10, 6, 1, 7, 'soil1');
    }
    return px;
  }
  if (horiz) {
    for (let y = 3; y < 14; y++) for (let x = 0; x < 16; x++) if (((x + y) & 3) === 0 || ((x - y) & 3) === 0) px.set(x, y, 'grey3');
    px.rect(0, 2, 16, 1, 'grey3').rect(0, 13, 16, 1, 'grey2');
    for (let x = 1; x < 16; x += 3) { px.set(x, 1, 'grey2'); px.set(x - 1, 0, 'black'); px.set(x + 1, 0, 'black'); }
    px.rect(0, 1, 2, 14, 'grey2').rect(0, 1, 1, 14, 'grey3').rect(0, 0, 2, 1, 'grey3');
    if (hash2(c.tx, c.ty, 14) % 6 === 0) {
      px.rect(4, 5, 8, 6, 'yellow').frame(4, 5, 8, 6, 'black').rect(7, 6, 2, 3, 'ink').set(7, 9, 'ink').set(8, 9, 'ink');
      px.set(7, 10, 'yellow').set(8, 10, 'yellow');
    }
  } else {
    px.rect(5, 0, 6, 16, 'grey1');
    for (let y = 0; y < 16; y++) for (let x = 6; x < 10; x++) if (((x + y) & 3) === 0 || ((x - y) & 3) === 0) px.set(x, y, 'grey3');
    px.rect(5, 0, 1, 16, 'grey2').rect(10, 0, 1, 16, 'grey2').rect(4, 6, 8, 4, 'grey2').rect(4, 6, 8, 1, 'grey3');
  }
  return px;
}

// ---------------------------------------------------------------- buildings
function housewall(c: TileCtx): Px {
  const px = new Px(16).fill('soil2');
  for (let y = 3; y < 16; y += 4) px.rect(0, y, 16, 1, 'soil1').rect(0, y + 1, 16, 1, 'soil3');
  const r = rngFor(c, 'housewall');
  px.scatter(r, 'soil1', 4);
  if ((c.tx & 1) === 1) {
    const lit = hash2(c.tx, c.ty, 9) % 3 !== 0;
    px.rect(3, 2, 10, 10, 'bone').rect(4, 3, 8, 8, lit ? 'amber' : 'teal0');
    if (lit) px.rect(4, 3, 8, 3, 'yellow'); else px.rect(4, 3, 3, 2, 'blue').set(5, 3, 'sky');
    px.rect(7, 3, 2, 8, 'soil1').rect(4, 7, 8, 1, 'soil1').rect(2, 12, 12, 1, 'soil0').rect(2, 11, 12, 1, 'grey3');
  }
  return px;
}

function houseroof(c: TileCtx): Px {
  const px = new Px(16).fill('grey1');
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    px.rect(0, y, 16, 1, 'grey2').rect(0, y + 3, 16, 1, 'ink');
    const off = (row & 1) * 2;
    for (let x = off; x < 16; x += 4) px.rect(x, y + 1, 1, 3, 'ink');
  }
  const r = rngFor(c, 'houseroof');
  px.scatter(r, 'grey2', 5).scatter(r, 'shadow', 5);
  return px;
}

function housedoor(_c: TileCtx): Px {
  const px = new Px(16).fill('soil2');
  for (let y = 3; y < 16; y += 4) px.rect(0, y, 16, 1, 'soil1').rect(0, y + 1, 16, 1, 'soil3');
  px.rect(2, 0, 12, 16, 'bone').rect(3, 1, 10, 15, 'soil1');
  px.rect(4, 2, 8, 4, 'teal0').rect(4, 2, 8, 1, 'amber').rect(7, 2, 2, 4, 'soil1').rect(4, 4, 8, 1, 'soil1');
  px.frame(4, 7, 8, 8, 'soil2').frame(5, 8, 6, 6, 'soil0');
  px.set(11, 11, 'amber').set(11, 12, 'yellow').rect(2, 15, 12, 1, 'grey2');
  return px;
}

function shedwall(c: TileCtx): Px {
  const px = new Px(16).fill('soil0');
  const r = rngFor(c, 'shedwall');
  for (let b = 0; b < 4; b++) {
    const x = b * 4 + 1;
    px.rect(x, 0, 3, 16, b & 1 ? 'soil1' : 'soil2').rect(x, 0, 1, 16, b & 1 ? 'soil2' : 'soil3');
    px.set(x + 1, 2, 'grey3').set(x + 1, 13, 'grey3');
    const y = 3 + Math.floor(r() * 9);
    px.set(x + 2, y, 'soil0').set(x + 2, y + 1, 'soil0');
  }
  px.rect(0, 0, 16, 1, 'soil1');
  if (hash2(c.tx, c.ty, 15) % 5 === 0) px.rect(5, 6, 3, 4, 'ink').rect(5, 6, 3, 1, 'soil0');
  return px;
}

function shedroof(c: TileCtx): Px {
  const px = new Px(16);
  const cols: ColorName[] = ['grey3', 'grey2', 'slate'];
  for (let x = 0; x < 16; x++) px.rect(x, 0, 1, 16, cols[x % 3] as ColorName);
  const r = rngFor(c, 'shedroof');
  px.rect(0, 0, 16, 1, 'mist').rect(0, 14, 16, 2, 'grey1');
  if (hash2(c.tx, c.ty, 16) % 3 === 0) { px.rect(3, 4, 3, 5, 'soil3').rect(4, 5, 2, 3, 'orange').scatter(r, 'soil2', 3, 3, 4, 3, 5); }
  px.scatter(r, 'mist', 4).scatter(r, 'dusk', 4);
  return px;
}

// ---------------------------------------------------------------- lamp and mailbox
function lamp(c: TileCtx): Px {
  const px = under(c, 'grass');
  groundShadow(px, 8, 15, 5);
  px.rect(5, 13, 6, 3, 'grey1').rect(5, 13, 6, 1, 'grey2');
  px.rect(7, 5, 2, 9, 'grey2').rect(7, 5, 1, 9, 'grey3');
  px.rect(4, 0, 8, 2, 'grey1').rect(4, 0, 8, 1, 'grey2');
  px.rect(4, 2, 8, 4, 'amber').rect(5, 3, 6, 2, 'yellow').rect(7, 3, 2, 2, 'cream');
  px.rect(4, 2, 1, 4, 'grey1').rect(11, 2, 1, 4, 'grey1').rect(5, 6, 6, 1, 'grey1');
  for (const [x, y] of [[2, 3], [13, 3], [3, 6], [12, 6], [8, 8]] as [number, number][]) if ((x + y) & 1) px.set(x, y, 'cream');
  return px;
}

function mailbox(c: TileCtx): Px {
  const px = under(c, 'grass');
  groundShadow(px, 8, 15, 5);
  px.rect(7, 8, 2, 8, 'soil2').rect(7, 8, 1, 8, 'soil3').rect(5, 14, 6, 1, 'soil1');
  px.rect(3, 3, 10, 6, 'dusk').rect(3, 3, 10, 2, 'blue').rect(3, 3, 10, 1, 'sky').rect(3, 8, 10, 1, 'night');
  px.rect(12, 1, 2, 5, 'hot').rect(12, 1, 2, 1, 'pink').rect(13, 5, 1, 4, 'grey2');
  px.rect(5, 6, 4, 1, 'bone');
  return px;
}

export function objectTile(name: TileName, c: TileCtx): Px | null {
  switch (name) {
    case 'pine': return pine(c);
    case 'deadtree': return deadtree(c);
    case 'bush': return bush(c);
    case 'rock': return rock(c);
    case 'stump': return stump(c);
    case 'fence': return fence(c, false);
    case 'labfence': return fence(c, true);
    case 'housewall': return housewall(c);
    case 'houseroof': return houseroof(c);
    case 'housedoor': return housedoor(c);
    case 'shedwall': return shedwall(c);
    case 'shedroof': return shedroof(c);
    case 'lamp': return lamp(c);
    case 'mailbox': return mailbox(c);
    case 'labwall':
    case 'labcap':
    case 'pipe':
    case 'glass':
    case 'cage':
      return labObject(name, c, rngFor(c, name));
    case 'locker':
    case 'bench':
    case 'cabinet':
    case 'shelf':
    case 'mass':
    case 'wallsign':
      return lab2Object(name, c, rngFor(c, name), under);
    default: return null;
  }
}

