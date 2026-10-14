// Hawkins Lab furniture and walls, second pass: lockers, lab benches, filing cabinets, storage shelves, a lump of
// Upside Down growth in the wall, and a wall face with a painted sign. All solid. Furniture that stands in a room is
// painted over the floor its neighbours show (the under callback, handed in by tile_objects). Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import { labFace } from './tile_lab.ts';
import { pick } from './tile_lab2.ts';
import type { Rnd } from './tile_lab2.ts';

/** Paints the floor under a piece of furniture. */
export type UnderFn = (c: TileCtx, prefer: TileName) => Px;

// ---------------------------------------------------------------- lockers
/** Rows of steel lockers: two doors a tile, vent slits, a handle, a name plate. Doors run on across neighbouring lockers. */
function locker(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('ink');
  const wEnd = c.near.w !== 'locker';
  for (let d = 0; d < 2; d++) {
    const x0 = d * 8, w = 7;
    const kind = hash2(c.tx * 2 + d, c.ty, 441) % 9;
    const body: ColorName = kind === 0 ? 'slate' : kind === 1 ? 'teal1' : 'grey2';
    const lit: ColorName = kind === 0 ? 'mist' : kind === 1 ? 'cyan' : 'grey3';
    px.rect(x0, 2, w, 12, body).rect(x0, 2, 1, 12, lit).rect(x0 + w - 1, 2, 1, 12, 'grey1');
    px.rect(x0, 2, w, 1, lit);
    for (const y of [4, 6, 8]) px.rect(x0 + 2, y, w - 4, 1, 'ink').rect(x0 + 2, y + 1, w - 4, 1, kind === 1 ? 'teal0' : 'grey1');
    px.rect(x0 + w - 3, 10, 1, 3, 'ink').set(x0 + w - 3, 10, 'bone');
    px.rect(x0 + 1, 11, 3, 2, 'bone').set(x0 + 2, 12, 'grey3');
    const odd = hash2(c.tx * 2 + d, c.ty, 442) % 12;
    if (odd === 0) { px.rect(x0 + 1, 3, w - 2, 10, 'night').rect(x0 + 1, 3, 1, 10, 'ink').set(x0 + 2, 5, 'hot'); }
    else if (odd === 1) px.set(x0 + 3, 11, 'grey1').set(x0 + 4, 12, 'grey1').set(x0 + 2, 10, 'grey1');
    else if (odd === 2) px.rect(x0 + 3, 2, 3, 3, 'yellow').frame(x0 + 3, 2, 3, 3, 'ink').set(x0 + 4, 3, 'ink');
  }
  px.rect(0, 0, 16, 2, 'grey3').rect(0, 0, 16, 1, 'bone').rect(0, 2, 16, 1, 'grey2');
  px.rect(0, 14, 16, 1, 'grey1').rect(0, 15, 16, 1, 'ink');
  px.rect(7, 2, 1, 12, 'ink');
  if (wEnd) px.rect(0, 2, 1, 12, 'grey1').rect(1, 2, 1, 12, 'grey3');
  px.scatter(r, 'grey3', 3, 1, 3, 13, 10);
  return px;
}

// ---------------------------------------------------------------- bench
const LIQUID: ColorName[] = ['cyan', 'leaf', 'hot', 'yellow', 'pink'];
const BEAKER = ['g.g', 'gcg', 'gcg', 'gcg', 'ggg'];
const FLASK = ['..g..', '..g..', '.gcg.', 'gcccg', 'ggggg'];
const BURNER = ['.y.', 'yoy', '.b.', 'ggg'];

function glass(px: Px, rows: string[], x: number, y: number, liquid: ColorName): void {
  px.art(rows, { g: 'grey2', c: liquid }, x, y);
  px.set(x + 1, y + rows.length - 1, 'grey1');
}

/** A lab bench: pale top with beakers, a flask or a burner on it, and a cupboard front. */
function bench(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'labfloor');
  const l = c.near.w === 'bench' ? 0 : 1, rr = c.near.e === 'bench' ? 15 : 14;
  const w = rr - l + 1;
  px.rect(l, 0, w, 1, 'grey1').rect(l, 1, w, 8, 'bone').rect(l, 1, w, 1, 'white').rect(l, 9, w, 1, 'grey3');
  px.rect(l, 10, w, 5, 'grey2').rect(l, 10, w, 1, 'grey1');
  for (let x = l + 5; x < rr; x += 5) px.rect(x, 11, 1, 3, 'grey1');
  for (let x = l + 2; x < rr; x += 5) px.set(x + 1, 12, 'bone');
  px.rect(l, 14, w, 1, 'grey1');
  for (let x = l; x <= rr; x++) if ((x + c.ty) & 1) px.set(x, 15, 'grey3');
  if (c.near.w !== 'bench') px.rect(l, 1, 1, 14, 'grey3').rect(l, 0, 1, 1, 'grey1');
  if (c.near.e !== 'bench') px.rect(rr, 1, 1, 14, 'grey2').rect(rr, 10, 1, 5, 'grey1');
  const v = hash2(c.tx, c.ty, 451) % 5, liq = (n: number): ColorName => LIQUID[(hash2(c.tx, c.ty, 452) + n) % LIQUID.length] as ColorName;
  if (v === 0) { glass(px, BEAKER, 3, 3, liq(0)); glass(px, FLASK, 7, 3, liq(1)); glass(px, BEAKER, 12, 4, liq(2)); }
  else if (v === 1) {
    px.art(BURNER, { y: 'yellow', o: 'orange', b: 'blue', g: 'grey1' }, 3, 4);
    glass(px, FLASK, 6, 3, liq(1)); px.line(10, 4, 11, 6, 'grey2'); px.set(12, 7, 'cyan');
    glass(px, BEAKER, 12, 4, liq(3));
  } else if (v === 2) {
    px.rect(3, 6, 8, 2, 'grey2').rect(3, 6, 8, 1, 'grey3');
    for (let i = 0; i < 3; i++) { px.rect(4 + i * 2, 3, 1, 3, 'sky'); px.set(4 + i * 2, 3, liq(i)); px.rect(4 + i * 2, 4, 1, 1, liq(i)); }
    px.rect(11, 3, 3, 5, 'white').frame(11, 3, 3, 5, 'grey3').set(12, 5, 'grey3');
  } else if (v === 3) {
    glass(px, FLASK, 2, 3, liq(0)); glass(px, FLASK, 8, 3, liq(2));
    px.line(7, 6, 8, 6, 'grey3').set(12, 6, 'grey1').rect(11, 4, 3, 3, 'grey2').set(12, 5, 'hot');
  } else {
    px.rect(3, 3, 5, 6, 'white').frame(3, 3, 5, 6, 'grey3').rect(4, 5, 3, 1, 'grey3').rect(4, 7, 2, 1, 'grey3').rect(4, 3, 3, 1, 'amber');
    px.rect(10, 6, 3, 2, 'grey3').set(11, 6, 'white');
    px.scatter(r, 'grey3', 2, 2, 2, 12, 6);
  }
  return px;
}

// ---------------------------------------------------------------- cabinet
/** A filing cabinet: steel top, drawers with a handle and a label, and sometimes a drawer left open with paper showing. */
function cabinet(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'carpet');
  const l = c.near.w === 'cabinet' ? 0 : 1, rr = c.near.e === 'cabinet' ? 15 : 14;
  const w = rr - l + 1;
  const v = hash2(c.tx, c.ty, 461) % 4;
  px.rect(l, 1, w, 3, 'grey3').rect(l, 1, w, 1, 'bone').rect(l, 3, w, 1, 'grey2');
  px.rect(l, 4, w, 10, 'grey2').rect(l, 4, 1, 10, 'grey3').rect(rr, 4, 1, 10, 'grey1').rect(l, 13, w, 1, 'grey1');
  if (c.near.w !== 'cabinet') px.rect(l, 1, 1, 13, 'grey3');
  if (c.near.e !== 'cabinet') px.rect(rr, 1, 1, 13, 'grey1');
  if (v === 3) {
    px.rect(l + 2, 5, w - 4, 8, 'grey1');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = l + 3 + i * ((w - 6) >> 1), y = 6 + j * 4;
      px.rect(x, y, (w - 6) >> 1, 3, 'grey2').rect(x, y, (w - 6) >> 1, 1, 'grey3').set(x + (((w - 6) >> 1) >> 1), y + 1, 'amber');
    }
  } else {
    for (let d = 0; d < 2; d++) {
      const y = 5 + d * 4;
      px.rect(l + 1, y, w - 2, 4, 'grey2').rect(l + 1, y, w - 2, 1, 'grey3').rect(l + 1, y + 3, w - 2, 1, 'grey1');
      px.rect(l + 4, y + 1, w - 8, 1, 'ink').set(l + 4, y + 1, 'bone');
      px.rect(l + 2, y + 1, 2, 2, 'bone').set(l + 2, y + 2, 'grey3');
    }
    if (v === 1) px.rect(l + 3, 4, w - 6, 1, 'white').rect(l + 4, 3, w - 9, 1, 'bone').set(l + 3, 4, 'yellow');
    if (v === 2) { px.rect(l + 2, 1, 6, 3, 'white').rect(l + 2, 2, 5, 1, 'grey3').rect(l + 8, 2, 3, 2, 'bone').rect(l + 4, 0, 3, 1, 'bone'); }
  }
  for (let x = l; x <= rr; x++) { if ((x + c.ty) & 1) px.set(x, 14, 'ink'); else px.set(x, 15, 'ink'); }
  if (r() < 0.2) px.set(pick(r, l + 2, rr - 2), 13, 'soil3');
  return px;
}

// ---------------------------------------------------------------- shelf
type Item = (px: Px, x: number, base: number, r: Rnd) => number;
const BOXES: [ColorName, ColorName][] = [['soil3', 'sand'], ['bone', 'white'], ['soil2', 'soil3'], ['grey3', 'bone']];
const JARS: [ColorName, ColorName][] = [['teal1', 'cyan'], ['soil3', 'amber'], ['blood1', 'hot'], ['pine2', 'leaf'], ['purple', 'magenta']];

const box: Item = (px, x, base, r) => {
  const w = pick(r, 3, 5), h = pick(r, 2, 4);
  const [body, top] = BOXES[pick(r, 0, BOXES.length - 1)] as [ColorName, ColorName];
  px.rect(x, base - h, w, h, body).rect(x, base - h, w, 1, top).rect(x + w - 1, base - h + 1, 1, h - 1, 'soil1');
  if (r() < 0.55) px.rect(x + 1, base - h + 2, 2, 1, r() < 0.4 ? 'yellow' : 'bone');
  return w;
};
const bottle: Item = (px, x, base, r) => {
  const h = pick(r, 2, base > 8 ? 4 : 3);
  const [body, hi] = JARS[pick(r, 0, JARS.length - 1)] as [ColorName, ColorName];
  px.rect(x, base - h, 2, h, body).set(x, base - h + 1, hi).rect(x, base - h - 1, 2, 1, 'grey1');
  return 2;
};
const jar: Item = (px, x, base, r) => {
  const [body, hi] = JARS[pick(r, 0, JARS.length - 1)] as [ColorName, ColorName];
  px.rect(x, base - 3, 3, 3, 'white').rect(x, base - 2, 3, 2, body).set(x + 1, base - 2, hi).rect(x, base - 4, 3, 1, 'grey2');
  return 3;
};
const drum: Item = (px, x, base) => {
  px.rect(x, base - 4, 4, 4, 'yellow').rect(x, base - 4, 4, 1, 'amber').rect(x, base - 2, 4, 1, 'ink').set(x + 1, base - 3, 'ink').set(x + 2, base - 3, 'ink');
  return 4;
};
const ITEMS: Item[] = [box, box, bottle, bottle, jar, drum];

/** Storage shelving: three boards, boxes, bottles and jars along them, steel uprights at the ends of a run. */
function shelf(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('grey1');
  px.scatter(r, 'night', 14);
  px.rect(0, 0, 16, 1, 'bone').rect(0, 1, 16, 1, 'grey3');
  const lvl = hash2(c.tx, c.ty, 471) % 3;
  for (const [i, base] of [6, 11, 15].entries()) {
    let x = 2;
    const sparse = (hash2(c.tx, c.ty, 472 + i) % 5) === 0;
    while (x < 13 && !sparse) {
      if (r() < 0.2) { x += 1; continue; }
      const item = ITEMS[(i === lvl ? pick(r, 0, ITEMS.length - 1) : pick(r, 0, 4))] as Item;
      x += item(px, x, base, r) + 1;
    }
    px.rect(0, base, 16, 1, 'grey3').rect(0, base + 1 > 15 ? 15 : base + 1, 16, base < 15 ? 1 : 0, 'ink');
  }
  px.rect(0, 15, 16, 1, 'ink').rect(0, 14, 16, 1, 'grey2');
  if (c.near.w !== 'shelf') px.rect(0, 0, 2, 16, 'grey2').rect(0, 0, 1, 16, 'grey3').rect(1, 2, 1, 14, 'grey1');
  if (c.near.e !== 'shelf') px.rect(14, 0, 2, 16, 'grey2').rect(14, 0, 1, 16, 'grey3').rect(15, 1, 1, 15, 'grey1');
  return px;
}

// ---------------------------------------------------------------- mass
/** A swelling of Upside Down flesh pushing out of the wall: bumps with dark creases between them, red veins, and veins creeping out over the wall. */
function mass(c: TileCtx, r: Rnd): Px {
  const px = labFace(c, r, false);
  const m = new Uint8Array(256);
  const cx = 7.5 + (hash2(c.tx, c.ty, 481) % 3) - 1, cy = 8 + (hash2(c.tx, c.ty, 482) % 3) - 1;
  const lobes: [number, number, number][] = [[cx, cy, 4.6 + r() * 0.8]];
  const n = pick(r, 5, 6), a0 = r() * 6.28;
  for (let i = 0; i < n; i++) { const a = a0 + (i * 6.283) / n + r() * 0.4; const d = 4 + r() * 1.2; lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.95, 2.4 + r() * 1.2]); }
  const dist = (x: number, y: number): [number, number] => {
    let d1 = 9, d2 = 9;
    for (const [lx, ly, lr] of lobes) { const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly) / lr; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return [d1, d2];
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let on = dist(x, y)[0] <= 1;
      if (c.near.e === 'mass' && x >= cx && y >= 4 && y <= 12) on = true;
      if (c.near.w === 'mass' && x <= cx && y >= 4 && y <= 12) on = true;
      if (c.near.n === 'mass' && y <= cy && x >= 4 && x <= 11) on = true;
      if (c.near.s === 'mass' && y >= cy && x >= 4 && x <= 11) on = true;
      if (y < 2 && c.near.n !== 'mass') on = false;
      if (on) m[y * 16 + x] = 1;
    }
  }
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < 16 && y < 16 && m[y * 16 + x] === 1;
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.28, ca = Math.cos(a), sa = Math.sin(a);
    let x = cx + ca * 5, y = cy + sa * 5;
    for (let k = 0; k < 9; k++) {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi > 15 || yi > 15) break;
      if (!at(xi, yi)) px.set(xi, yi, i < 3 ? 'blood1' : 'ink');
      if (i < 3 && k % 3 === 0 && !at(xi, yi)) px.set(xi, yi, 'red');
      x += ca + (r() - 0.5) * 0.9; y += sa + (r() - 0.5) * 0.9;
    }
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (at(x, y)) continue;
      if (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1)) px.set(x, y, 'ink');
    }
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!at(x, y)) continue;
      const [d1, d2] = dist(x, y);
      const under = !at(x, y + 1) || !at(x + 1, y), top = !at(x, y - 1) || !at(x - 1, y);
      let col: ColorName = 'blood1';
      if (d2 - d1 < 0.2 && d2 < 1.25) col = 'blood0';
      else if (under || (x + y - cx - cy > 6 && ((x + y) & 1) === 0)) col = 'blood0';
      else if (top || (d1 < 0.55 && x + y < cx + cy + 1 && ((x + y) & 1) === 0)) col = 'red';
      else if ((hash2(x, y, 483) % 11) === 0) col = 'blood0';
      px.set(x, y, col);
    }
  }
  for (const [lx, ly, lr] of lobes) {
    const x = Math.round(lx - lr * 0.35), y = Math.round(ly - lr * 0.4);
    if (at(x, y) && at(x + 1, y)) px.set(x, y, 'hot').set(x + 1, y, 'red');
  }
  for (let v = 0; v < 3; v++) {
    let x = Math.round(cx + pick(r, -2, 2)), y = Math.round(cy + pick(r, -2, 2));
    for (let i = 0; i < pick(r, 4, 7); i++) {
      if (at(x, y) && at(x + 1, y) && at(x, y + 1)) px.set(x, y, v === 0 ? 'hot' : 'blood0');
      x += pick(r, -1, 1); y += r() < 0.6 ? 1 : 0;
    }
  }
  px.set(Math.round(cx - 2), Math.round(cy - 3), 'pink').set(Math.round(cx - 1), Math.round(cy - 3), 'rose');
  if (!at(7, 15) && !at(8, 15)) for (const x of [pick(r, 3, 6), pick(r, 9, 12)]) px.set(x, 15, 'blood0').set(x, 14, 'blood1');
  return px;
}

// ---------------------------------------------------------------- wall sign
const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', R: '110101110101101',
};
function glyph(px: Px, ch: string, x: number, y: number, col: ColorName): void {
  const g = GLYPHS[ch] as string;
  for (let i = 0; i < 15; i++) if (g[i] === '1') px.set(x + (i % 3), y + ((i / 3) | 0), col);
}

/** A wall face with a painted sign: a wing number on a plate, stenciled digits, a hazard triangle, a stop disc, an arrow or a wing letter. */
function wallsign(c: TileCtx, r: Rnd): Px {
  const px = labFace(c, r, false);
  const n = 10 + ((c.tx * 7 + c.ty * 3) % 40);
  const digits = String(n);
  switch (hash2(c.tx, c.ty, 491) % 6) {
    case 0:
      px.rect(3, 2, 10, 7, 'yellow').frame(3, 2, 10, 7, 'ink').rect(4, 3, 8, 1, 'amber');
      glyph(px, digits[0] as string, 4, 3, 'ink'); glyph(px, digits[1] as string, 8, 3, 'ink');
      px.rect(4, 8, 8, 1, 'amber');
      break;
    case 1:
      glyph(px, digits[0] as string, 4, 3, 'ink'); glyph(px, digits[1] as string, 9, 3, 'ink');
      glyph(px, digits[0] as string, 3, 2, 'yellow'); glyph(px, digits[1] as string, 8, 2, 'yellow');
      px.rect(3, 8, 10, 1, 'yellow');
      break;
    case 2:
      for (const [y, x0, w] of [[2, 7, 2], [3, 6, 4], [4, 6, 4], [5, 5, 6], [6, 5, 6], [7, 4, 8], [8, 4, 8]] as [number, number, number][]) {
        px.rect(x0, y, w, 1, y === 8 ? 'ink' : 'yellow').set(x0, y, 'ink').set(x0 + w - 1, y, 'ink');
      }
      px.rect(7, 4, 2, 2, 'ink').rect(7, 7, 2, 1, 'ink');
      break;
    case 3:
      px.disc(8, 5.5, 4, 'ink').disc(8, 5.5, 3.2, 'red').rect(5, 5, 6, 2, 'bone').rect(4, 5, 1, 2, 'ink');
      px.set(6, 3, 'hot').set(7, 3, 'hot');
      break;
    case 4: {
      const dir = hash2(c.tx, c.ty, 492) % 3;
      px.rect(2, 2, 12, 7, 'teal0').frame(2, 2, 12, 7, 'cyan');
      if (dir === 0) { px.rect(4, 5, 7, 1, 'white').set(10, 4, 'white').set(10, 6, 'white').set(11, 5, 'white'); }
      else if (dir === 1) { px.rect(5, 5, 7, 1, 'white').set(5, 4, 'white').set(5, 6, 'white').set(4, 5, 'white'); }
      else { px.rect(8, 4, 1, 4, 'white').set(7, 5, 'white').set(9, 5, 'white').set(6, 6, 'white').set(10, 6, 'white'); }
      break;
    }
    default: {
      const ch = 'ABCDR'[hash2(c.tx, c.ty, 493) % 5] as string;
      px.rect(3, 2, 10, 7, 'bone').frame(3, 2, 10, 7, 'ink').rect(4, 3, 8, 1, 'red');
      glyph(px, ch, 4, 4, 'ink'); glyph(px, digits[1] as string, 8, 4, 'ink');
      break;
    }
  }
  return px;
}

// ---------------------------------------------------------------- public
/** The furniture and wall tiles of the second pass. Null for any other tile. */
export function lab2Object(name: TileName, c: TileCtx, r: Rnd, under: UnderFn): Px | null {
  switch (name) {
    case 'locker': return locker(c, r);
    case 'bench': return bench(c, r, under);
    case 'cabinet': return cabinet(c, r, under);
    case 'shelf': return shelf(c, r);
    case 'mass': return mass(c, r);
    case 'wallsign': return wallsign(c, r);
    default: return null;
  }
}
