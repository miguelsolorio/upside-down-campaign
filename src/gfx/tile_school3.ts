// Hawkins Middle School furniture (stage 1.3): student desks with their chairs, cafeteria tables with benches, the
// serving counter and the gym bleachers. All solid. Each is painted over the floor its neighbours show (the under
// callback, handed in by tile_objects) and joins its neighbours in a run. Pure pixel work, so Node can run it.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import type { UnderFn } from './tile_lab3.ts';
import { pick } from './tile_school.ts';
import type { Rnd } from './tile_school.ts';

// ---------------------------------------------------------------- desk
/** A student desk seen from the front: laminate top with a book or a notebook on it, a wire rack under it, a plastic chair pulled out. */
function desk(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'schoolfloor');
  const v = hash2(c.tx, c.ty, 581) % 6;
  px.rect(2, 14, 12, 1, 'soil1');
  px.rect(2, 1, 12, 8, 'sand').rect(2, 1, 12, 1, 'bone').rect(2, 1, 1, 8, 'bone').rect(13, 1, 1, 8, 'soil3');
  px.rect(2, 8, 12, 2, 'soil3').rect(2, 9, 12, 1, 'soil2');
  px.rect(3, 10, 10, 3, 'soil1').rect(3, 10, 10, 1, 'soil0').rect(4, 11, 3, 2, 'blue').rect(8, 11, 4, 1, 'bone');
  px.rect(3, 10, 1, 5, 'grey2').rect(12, 10, 1, 5, 'grey2').set(3, 14, 'grey1').set(12, 14, 'grey1');
  if (v === 0) px.rect(4, 3, 5, 4, 'blue').rect(4, 3, 5, 1, 'sky').rect(4, 6, 5, 1, 'dusk').rect(9, 4, 3, 3, 'white').rect(10, 5, 1, 1, 'grey3');
  else if (v === 1) px.rect(4, 3, 7, 5, 'white').frame(4, 3, 7, 5, 'grey3').rect(5, 4, 5, 1, 'sky').rect(5, 6, 4, 1, 'grey3').rect(11, 5, 2, 1, 'amber');
  else if (v === 2) { px.rect(5, 3, 4, 4, 'red').rect(5, 3, 4, 1, 'hot').rect(10, 2, 2, 5, 'pine2').rect(10, 2, 2, 1, 'pine3'); }
  else if (v === 3) { px.rect(4, 4, 8, 3, 'white').rect(4, 4, 8, 1, 'bone').set(6, 5, 'grey3').set(9, 5, 'grey3').rect(6, 2, 1, 2, 'amber'); }
  else if (v === 4) px.rect(3, 3, 3, 4, 'teal1').rect(3, 3, 3, 1, 'cyan').rect(7, 4, 4, 3, 'white').set(8, 5, 'grey3').set(10, 5, 'grey3');
  px.scatter(r, 'soil3', 3, 3, 2, 10, 6);
  px.rect(4, 12, 8, 2, 'teal1').rect(4, 12, 8, 1, 'cyan').rect(5, 14, 1, 2, 'grey2').rect(10, 14, 1, 2, 'grey2');
  px.rect(4, 15, 8, 1, 'ink').rect(6, 15, 4, 1, 'grey1');
  return px;
}

// ---------------------------------------------------------------- table
/** A cafeteria table, a run of them: pale top with lunch trays, a plank bench in front, a steel foot. */
function table(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'checker');
  const l = c.near.w === 'table' ? 0 : 1, rr = c.near.e === 'table' ? 15 : 14;
  const w = rr - l + 1;
  px.rect(l, 1, w, 8, 'bone').rect(l, 1, w, 1, 'white').rect(l, 8, w, 1, 'grey3').rect(l, 9, w, 1, 'grey2');
  if (l) px.rect(l, 1, 1, 9, 'white').set(l, 9, 'grey3');
  if (rr < 15) px.rect(rr, 1, 1, 9, 'grey3');
  px.rect(l, 10, w, 4, 'soil3').rect(l, 10, w, 1, 'sand').rect(l, 13, w, 1, 'soil1');
  for (let x = l + 3; x < rr; x += 5) px.set(x, 11, 'soil2').set(x + 1, 12, 'soil2');
  px.rect(l + 1, 14, 2, 2, 'grey2').rect(rr - 2, 14, 2, 2, 'grey2').rect(l + 1, 15, 2, 1, 'grey1').rect(rr - 2, 15, 2, 1, 'grey1');
  const v = hash2(c.tx, c.ty, 583) % 6;
  const tray = (x: number): void => {
    px.rect(x, 3, 7, 5, 'blue').rect(x, 3, 7, 1, 'sky').rect(x, 7, 7, 1, 'dusk');
    px.rect(x + 1, 4, 3, 2, 'soil2').rect(x + 4, 4, 2, 2, 'pine3').set(x + 5, 6, 'white');
  };
  if (v === 0) tray(l + 2);
  else if (v === 1) { tray(l + 1); px.rect(rr - 4, 4, 3, 4, 'white').rect(rr - 4, 4, 3, 1, 'sky').rect(rr - 3, 5, 1, 2, 'blue'); }
  else if (v === 2) { px.rect(l + 3, 3, 4, 4, 'white').rect(l + 3, 3, 4, 1, 'sky').rect(l + 8, 4, 4, 3, 'bone').frame(l + 8, 4, 4, 3, 'grey3'); }
  else if (v === 3) { tray(l + 3); px.set(l + 1, 4, 'grey3').set(l + 2, 5, 'grey3'); }
  px.scatter(r, 'grey3', 3, l + 1, 2, w - 2, 6);
  return px;
}

// ---------------------------------------------------------------- counter
/** The serving counter: a steel top with its sneeze guard, food wells, a tray rail, and a paneled front. */
function counter(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'checker');
  const l = c.near.w === 'counter' ? 0 : 1, rr = c.near.e === 'counter' ? 15 : 14;
  const w = rr - l + 1;
  px.rect(l, 0, w, 1, 'sky').rect(l, 1, w, 1, 'cyan');
  for (let x = l + 2; x < rr; x += 7) px.rect(x, 0, 1, 4, 'bone');
  px.rect(l, 4, w, 5, 'grey3').rect(l, 4, w, 1, 'bone').rect(l, 8, w, 1, 'grey2');
  const v = hash2(c.tx, c.ty, 585) % 4;
  if (v === 3) {
    for (let i = 0; i < 3; i++) px.rect(l + 2 + i * 3, 3 - (i & 1), 3, 5, 'blue').rect(l + 2 + i * 3, 3 - (i & 1), 3, 1, 'sky');
  } else {
    const food = v === 0 ? 'pine3' : v === 1 ? 'soil2' : 'soil3';
    px.rect(l + 2, 5, w - 4, 3, 'grey1').rect(l + 3, 6, w - 6, 2, food).rect(l + 3, 6, w - 6, 1, v === 0 ? 'leaf' : 'sand');
    px.set(l + 2 + (r() < 0.5 ? 1 : w - 5), 6, 'white');
  }
  px.rect(l, 9, w, 1, 'grey1').rect(l, 10, w, 5, 'grey2').rect(l, 10, w, 1, 'grey3').rect(l, 14, w, 1, 'grey1').rect(l, 15, w, 1, 'ink');
  for (let x = l + 5; x < rr; x += 6) px.rect(x, 11, 1, 3, 'grey1').set(x + 1, 11, 'grey3');
  if (l) px.rect(l, 4, 1, 11, 'bone');
  if (rr < 15) px.rect(rr, 4, 1, 11, 'grey1');
  px.scatter(r, 'mist', 2, l + 1, 11, w - 2, 3);
  return px;
}

// ---------------------------------------------------------------- bleachers
/** Wooden bleachers in three tiers: a lit plank to sit on, a dark riser under it, steel braces between the tiers. */
function bleachers(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'gymfloor');
  const tiers: [number, number][] = [[0, 5], [5, 10], [10, 14]];
  tiers.forEach(([y, y2], i) => {
    px.rect(0, y, 16, 2, 'sand').rect(0, y, 16, 1, 'bone').rect(0, y + 1, 16, 1, 'soil3');
    px.rect(0, y + 2, 16, y2 - y - 2, 'soil2').rect(0, y + 2, 16, 1, 'soil1');
    for (let x = (i * 5 + c.tx * 3) % 7; x < 16; x += 7) px.rect(x, y, 2, 1, 'soil3');
  });
  px.rect(0, 14, 16, 1, 'soil1').rect(0, 15, 16, 1, 'soil0');
  for (const x of [3, 12]) {
    px.rect(x, 2, 1, 12, 'grey2').rect(x + 1, 2, 1, 12, 'grey1');
    for (const y of [5, 10]) px.rect(x - 1, y, 3, 1, 'grey3');
  }
  if (c.near.w !== 'bleachers') px.rect(0, 0, 1, 15, 'grey3').rect(1, 0, 1, 15, 'grey2');
  if (c.near.e !== 'bleachers') px.rect(15, 0, 1, 15, 'grey1').rect(14, 0, 1, 15, 'grey2');
  const v = hash2(c.tx, c.ty, 587) % 9;
  const x = pick(r, 5, 9);
  if (v === 0) px.rect(x, 3, 4, 2, 'blue').rect(x, 3, 4, 1, 'sky').set(x + 3, 4, 'dusk');
  else if (v === 1) px.rect(x, 7, 2, 3, 'white').set(x, 7, 'sky');
  else if (v === 2) px.rect(x, 12, 3, 2, 'bone').set(x + 1, 12, 'grey3').set(x + 3, 13, 'grey3');
  return px;
}

// ---------------------------------------------------------------- public
/** The four furniture tiles. Null for any other tile. */
export function schoolFurniture(name: TileName, c: TileCtx, r: Rnd, under: UnderFn): Px | null {
  switch (name) {
    case 'desk': return desk(c, r, under);
    case 'table': return table(c, r, under);
    case 'counter': return counter(c, r, under);
    case 'bleachers': return bleachers(c, r, under);
    default: return null;
  }
}
