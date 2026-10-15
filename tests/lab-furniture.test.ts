// The Lab's cage tile is for the animal lab's cage wall, and nothing else. Lockers and shelves have tiles of their own, so
// they never read as rat cages (the first pass drew them with the cage tile).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROWS } from '../src/world/stages/stage12.ts';
import { TILES } from '../src/core/tiles.ts';

/** Every tile of one kind in a box (inclusive tile coordinates), by its map character. */
function count(ch: string, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ROWS[y]?.[x] === ch) n++;
  return n;
}
const total = (ch: string): number => count(ch, 0, 0, (ROWS[0]?.length ?? 1) - 1, ROWS.length - 1);

const ANIMAL_LAB = [31, 17, 46, 27] as const;
const CORRIDOR_A = [14, 31, 27, 36] as const;
const STORAGE = [3, 3, 26, 11] as const;

test('the legend keeps cages, lockers and shelves apart', () => {
  assert.equal(TILES.c?.name, 'cage');
  assert.equal(TILES.L?.name, 'locker');
  assert.equal(TILES.N?.name, 'shelf');
});

test('every cage in the Lab stands in the animal lab', () => {
  assert.ok(total('c') > 0);
  assert.equal(count('c', ...ANIMAL_LAB), total('c'), 'a cage outside the animal lab would read as a locker or shelf drawn wrong');
});

test('corridor A is lined with lockers and the storage hall has shelves, none of them cages', () => {
  assert.ok(count('L', ...CORRIDOR_A) >= 8, 'lockers along corridor A');
  assert.equal(count('c', ...CORRIDOR_A), 0);
  assert.ok(count('N', ...STORAGE) >= 8, 'shelves in the storage hall');
  assert.equal(count('c', ...STORAGE), 0);
});
