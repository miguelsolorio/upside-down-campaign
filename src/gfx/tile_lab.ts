// Hawkins Lab tiles (stage 1.2): cold floors, hazard stripes, vents, wall face and roof edge, pipes, glass, cages.
// Pale greys, teal and bone. No alpha, no gradients: every pixel is a palette color. groundTile and objectTile hand
// their names here along with the rng they already made, so the floors vary the same way the grass does. Pure pixel
// work, so Node can run it (the night test does).
import type { TileName } from '../core/tiles.ts';
import { hash2, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';

type Rnd = () => number;

const LAB_SOLID = new Set<TileName>(['labwall', 'labcap', 'pipe', 'glass', 'cage', 'wallsign', 'mass', 'locker', 'bench', 'cabinet', 'shelf']);
const WALLY = new Set<TileName>(['labwall', 'labcap', 'pipe', 'glass', 'wallsign', 'mass']);
/** True for anything a wall can end against: floors, hazard, outdoor ground. */
const isOpen = (n: TileName): boolean => !LAB_SOLID.has(n);
/** True for the wall family, which throws a shadow on the floor beside it. */
export const isWally = (n: TileName): boolean => WALLY.has(n);
const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

export function transposed(px: Px): Px {
  const out = new Px(px.h, px.w);
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) out.d[x * out.w + y] = px.d[y * px.w + x] as number;
  return out;
}

// ---------------------------------------------------------------- floor
function scuff(px: Px, r: Rnd): void {
  const x = pick(r, 2, 8), y = pick(r, 3, 12), len = pick(r, 3, 6);
  for (let i = 0; i < len; i++) px.set(x + i, y + (i > 3 ? 1 : 0), 'grey3');
  px.set(x + 1, y + 1, 'mist');
}

function stain(px: Px, r: Rnd): void {
  const x = pick(r, 3, 10), y = pick(r, 3, 10);
  px.rect(x, y, 3, 2, 'grey3').set(x + 1, y, 'mist').set(x + 3, y + 1, 'grey3').set(x, y + 2, 'grey3');
}

function crack(px: Px, r: Rnd): void {
  let x = pick(r, 3, 11), y = pick(r, 2, 4);
  for (let i = 0; i < 7; i++) {
    px.set(x, y, 'grey2');
    y++;
    if (r() < 0.55) x += r() < 0.5 ? 1 : -1;
  }
}

/** The shadow a wall throws on the floor beside it: a dithered band along the north and west edges. */
export function wallShadow(px: Px, c: TileCtx, col: ColorName = 'grey3'): void {
  if (isWally(c.near.n)) {
    px.rect(0, 0, 16, 1, col);
    for (let x = 0; x < 16; x++) { if (!(x & 1)) px.set(x, 1, col); if ((x & 3) === 1) px.set(x, 2, col); }
  }
  if (isWally(c.near.w)) {
    px.rect(0, 0, 1, 16, col);
    for (let y = 0; y < 16; y++) if (!(y & 1)) px.set(1, y, col);
  }
}

/**
 * The pale floor. split draws the 8 px sub-grid of labfloor2. bare leaves off the scuffs and stains, so the
 * same floor can sit under a vent, a window or a cage.
 */
export function labFloor(c: TileCtx, r: Rnd, split: boolean, bare = false): Px {
  const px = new Px(16).fill('bone');
  px.scatter(r, 'white', 6).scatter(r, 'grey3', 3);
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 303) % 18;
    if (roll < 4) scuff(px, r);
    else if (roll === 4) stain(px, r);
    else if (roll === 5) crack(px, r);
    else if (roll === 6) for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]] as [number, number][]) px.set(x, y, 'grey3');
  }
  px.rect(0, 0, 16, 1, 'white').rect(0, 0, 1, 16, 'white').rect(0, 15, 16, 1, 'grey3').rect(15, 0, 1, 16, 'grey3');
  if (split) {
    for (let i = 1; i < 15; i++) {
      px.set(7, i, i & 1 ? 'bone' : 'grey3').set(i, 7, i & 1 ? 'bone' : 'grey3');
      px.set(8, i, i & 1 ? 'white' : 'bone').set(i, 8, i & 1 ? 'white' : 'bone');
    }
  }
  wallShadow(px, c);
  return px;
}

function hazard(c: TileCtx, r: Rnd): Px {
  const px = new Px(16);
  const on = (x: number, y: number): boolean => ((x + y) & 7) < 4;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px.set(x, y, on(x, y) ? 'yellow' : 'ink');
  for (let i = 0; i < 10; i++) {
    const x = pick(r, 0, 15), y = pick(r, 0, 15);
    px.set(x, y, on(x, y) ? 'amber' : 'grey1');
  }
  px.set(pick(r, 1, 14), pick(r, 1, 14), 'cream');
  if (isWally(c.near.n)) {
    px.rect(0, 0, 16, 1, 'ink');
    for (let x = 0; x < 16; x += 2) px.set(x, 1, 'ink');
  }
  return px;
}

function vent(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, (hash2(c.tx, c.ty, 5) & 1) === 1, true);
  const cold = hash2(c.tx, c.ty, 17) % 3 === 0;
  px.rect(1, 1, 14, 14, 'grey1').rect(1, 1, 13, 13, 'grey3').rect(2, 2, 12, 12, 'grey2');
  px.rect(3, 3, 10, 10, cold ? 'teal0' : 'ink');
  for (let k = 0; k < 3; k++) {
    const y = 4 + k * 3;
    px.rect(3, y, 10, 1, 'grey3').rect(3, y + 1, 10, 1, 'grey1');
    if (cold) px.rect(3, y + 2, 10, 1, 'teal1');
  }
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as [number, number][]) px.set(x, y, 'bone');
  px.scatter(r, 'grey3', 1, 4, 3, 8, 1);
  return px;
}

// ---------------------------------------------------------------- walls
/** The painted wall face: pale panel on top, a teal band, a darker kick plate, and a baseboard. */
export function labFace(c: TileCtx, r: Rnd, detail: boolean): Px {
  const px = new Px(16).fill('grey3');
  px.scatter(r, 'bone', 7, 0, 2, 16, 7).scatter(r, 'mist', 3, 0, 2, 16, 7).scatter(r, 'grey2', 2, 0, 2, 16, 7);
  px.rect(0, 9, 16, 1, 'bone').rect(0, 10, 16, 1, 'teal1').rect(0, 11, 16, 1, 'teal0');
  px.rect(0, 12, 16, 3, 'grey2').rect(0, 12, 16, 1, 'grey3').scatter(r, 'grey1', 3, 0, 13, 16, 2);
  px.rect(0, 15, 16, 1, 'grey1');
  if (hash2(c.tx, c.ty, 307) % 4 !== 0) {
    px.rect(0, 2, 1, 13, 'grey2').rect(1, 2, 1, 7, 'bone');
    px.set(2, 3, 'grey2').set(2, 7, 'grey2');
  }
  if (c.near.n === 'labcap') px.rect(0, 0, 16, 2, 'grey2').rect(0, 0, 16, 1, 'grey1');
  else if (isOpen(c.near.n)) px.rect(0, 0, 16, 1, 'bone');
  if (detail) {
    switch (hash2(c.tx, c.ty, 311) % 14) {
      case 0: px.rect(5, 2, 6, 6, 'yellow').frame(5, 2, 6, 6, 'ink').rect(7, 3, 2, 2, 'ink').rect(7, 6, 2, 1, 'ink'); break;
      case 1: px.rect(4, 3, 8, 4, 'bone').frame(4, 3, 8, 4, 'grey2').rect(5, 4, 6, 1, 'grey1').rect(5, 5, 4, 1, 'grey2'); break;
      case 2: for (let k = 0; k < 3; k++) px.rect(4, 3 + k * 2, 8, 1, 'grey1').rect(4, 4 + k * 2, 8, 1, 'mist'); break;
      case 3: { const x = pick(r, 4, 11); for (let y = 2; y < 9; y++) if (y !== 5) px.set(x, y, 'grey2'); px.set(x, 8, 'mist'); break; }
      default: break;
    }
  }
  if (isOpen(c.near.w)) px.rect(0, 0, 1, 16, 'grey1').rect(1, 0, 1, 15, 'grey2');
  if (isOpen(c.near.e)) px.rect(15, 0, 1, 16, 'grey1').rect(14, 0, 1, 15, 'grey2');
  return px;
}

/** The roof edge: dark steel seen from above, with a lit lip along the front that drops onto the wall face below. */
function cap(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('grey1');
  px.scatter(r, 'shadow', 8).scatter(r, 'grey2', 5).scatter(r, 'dusk', 3);
  const roll = hash2(c.tx, c.ty, 321) % 9;
  if (roll < 4) {
    for (let x = 0; x < 16; x++) if ((x & 3) < 2) px.set(x, 6, 'dusk');
  } else if (roll === 4) {
    px.rect(4, 3, 8, 7, 'grey2').rect(4, 3, 8, 1, 'grey3').frame(4, 3, 8, 7, 'ink');
    for (let y = 5; y < 9; y += 2) px.rect(5, y, 6, 1, 'grey1');
  }
  if (isOpen(c.near.n)) px.rect(0, 0, 16, 1, 'grey3').rect(0, 1, 16, 1, 'grey2');
  if (isOpen(c.near.w)) px.rect(0, 0, 1, 16, 'grey3').rect(1, 0, 1, 16, 'grey2');
  if (isOpen(c.near.e)) px.rect(15, 0, 1, 16, 'ink').rect(14, 0, 1, 16, 'grey2');
  if (c.near.s !== 'labcap') px.rect(0, 13, 16, 1, 'grey2').rect(0, 14, 16, 1, 'grey3').rect(0, 15, 16, 1, 'ink');
  return px;
}

/** A pipe lying along its length, 16 px long, with a collar in the middle. Drawn flat, then turned for a vertical run. */
function pipeBody(valve: boolean, r: Rnd): Px {
  const p = new Px(16);
  p.rect(0, 4, 16, 7, 'ink').rect(0, 5, 16, 1, 'white').rect(0, 6, 16, 2, 'bone').rect(0, 8, 16, 1, 'grey3').rect(0, 9, 16, 1, 'grey2');
  p.rect(12, 5, 2, 5, 'teal1').rect(12, 5, 2, 1, 'cyan');
  p.rect(6, 3, 4, 9, 'ink').rect(7, 4, 2, 7, 'grey3').rect(7, 4, 2, 1, 'bone').rect(7, 9, 2, 2, 'grey2');
  p.rect(1, 3, 2, 9, 'grey1').rect(1, 3, 2, 1, 'grey2');
  p.scatter(r, 'grey3', 2, 3, 6, 3, 3);
  if (valve) p.rect(7, 1, 2, 2, 'grey2').rect(5, 0, 6, 1, 'hot').rect(5, 1, 1, 1, 'red').rect(10, 1, 1, 1, 'red');
  return p;
}

function pipe(c: TileCtx, r: Rnd): Px {
  const same = (n: TileName): boolean => n === 'pipe';
  const horiz = same(c.near.w) || same(c.near.e) || !(same(c.near.n) || same(c.near.s));
  const px = labFace(c, r, false);
  const body = pipeBody(hash2(c.tx, c.ty, 337) % 6 === 0, r);
  px.blit(horiz ? body : transposed(body), 0, 0);
  return px;
}

// ---------------------------------------------------------------- window and cage
/** An observation window: the pale floor of the room behind, tinted blue, in a steel frame, with a few streaks of glare. */
function glass(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, (hash2(c.tx, c.ty, 5) & 1) === 1, true);
  const pairs: [ColorName, ColorName][] = [['bone', 'mist'], ['white', 'bone'], ['grey3', 'slate']];
  const tint = new Map<number, number>(pairs.map(([a, b]) => [px32(a), px32(b)] as [number, number]));
  for (let i = 0; i < 256; i++) { const m = tint.get(px.d[i] as number); if (m !== undefined) px.d[i] = m; }
  px.rect(0, 3, 16, 1, 'slate');
  for (let x = 1; x < 16; x += 2) px.set(x, 4, 'slate');
  const o = hash2(c.tx, c.ty, 331) % 5;
  for (let k = 0; k < 5; k++) {
    px.set(3 + o + k, 11 - k, 'bone');
    if (k > 0 && k < 4) px.set(4 + o + k, 11 - k, 'white');
  }
  px.set(11 - (o >> 1), 6, 'sky').set(12 - (o >> 1), 5, 'sky');
  px.rect(0, 0, 16, 2, 'grey1').rect(0, 2, 16, 1, 'grey3');
  px.rect(0, 13, 16, 1, 'bone').rect(0, 14, 16, 1, 'grey3').rect(0, 15, 16, 1, 'grey1');
  if (c.near.w !== 'glass') px.rect(0, 3, 1, 10, 'grey2').rect(1, 3, 1, 10, 'grey3');
  else px.rect(0, 3, 1, 10, 'slate');
  if (c.near.e !== 'glass') px.rect(15, 3, 1, 10, 'grey1').rect(14, 3, 1, 10, 'grey2');
  return px;
}

/** A rat cage on the lab floor: steel frame, dark inside, bars, a tray with bedding, and sometimes eyes. */
function cage(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, (hash2(c.tx, c.ty, 5) & 1) === 1, true);
  px.rect(1, 14, 14, 1, 'grey3');
  for (let x = 2; x < 14; x += 2) px.set(x, 15, 'grey3');
  px.rect(1, 2, 14, 12, 'grey2').rect(1, 2, 14, 1, 'white').rect(1, 3, 14, 1, 'grey3').rect(1, 2, 1, 12, 'grey3');
  px.rect(2, 4, 12, 8, 'night');
  for (const x of [3, 6, 9, 12]) px.rect(x, 4, 1, 8, 'grey3').set(x, 4, 'bone');
  px.rect(2, 10, 12, 2, 'dusk');
  for (let x = 2; x < 14; x++) if ((x + c.tx) & 1) px.set(x, 10, 'sand');
  px.set(5, 11, 'soil3').set(10, 11, 'sand');
  px.rect(0, 12, 16, 2, 'grey2').rect(0, 12, 16, 1, 'bone').rect(0, 13, 16, 1, 'grey1');
  px.rect(14, 6, 1, 3, 'yellow');
  const v = hash2(c.tx, c.ty, 347) % 4;
  if (v === 0) px.set(4, 7, 'hot').set(5, 7, 'hot').set(4, 8, 'blood1').set(5, 8, 'blood1');
  else if (v === 1) px.rect(10, 5, 2, 4, 'cyan').set(10, 5, 'white').set(10, 9, 'grey3');
  else if (v === 2) px.rect(7, 8, 2, 2, 'pink').set(7, 7, 'rose').set(8, 7, 'rose');
  return px;
}

// ---------------------------------------------------------------- public
/** Lab floors, hazard stripes and the vent. Null for any other tile. */
export function labGround(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'labfloor': return labFloor(c, r, false);
    case 'labfloor2': return labFloor(c, r, true);
    case 'hazard': return hazard(c, r);
    case 'vent': return vent(c, r);
    default: return null;
  }
}

/** Lab walls, pipes, windows and cages. Null for any other tile. */
export function labObject(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'labwall': return labFace(c, r, true);
    case 'labcap': return cap(c, r);
    case 'pipe': return pipe(c, r);
    case 'glass': return glass(c, r);
    case 'cage': return cage(c, r);
    default: return null;
  }
}
