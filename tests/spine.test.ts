import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_NAMES, PAL } from '../src/gfx/palette.ts';
import { TILES, buildGrid, isSolidTile } from '../src/core/tiles.ts';
import { fitsBox, hasEmDash, wrapText, EM_DASH } from '../src/core/text.ts';
import { createRng } from '../src/core/rng.ts';

test('palette is all valid hex colors', () => {
  assert.ok(COLOR_NAMES.length >= 40);
  for (const n of COLOR_NAMES) assert.match(PAL[n], /^#[0-9a-f]{6}$/);
});

test('tile legend builds a grid and marks solids', () => {
  const g = buildGrid(['TT..', 'T.-~']);
  assert.equal(g.w, 4);
  assert.equal(g.h, 2);
  assert.equal(isSolidTile(g, 0, 0), true);
  assert.equal(isSolidTile(g, 2, 0), false);
  assert.equal(isSolidTile(g, 3, 1), true);
  assert.equal(isSolidTile(g, -1, 0), true);
  assert.throws(() => buildGrid(['T?']));
  assert.throws(() => buildGrid(['TT', 'T']));
  assert.ok(Object.keys(TILES).length >= 24);
});

test('text helpers wrap and flag em dashes', () => {
  assert.deepEqual(wrapText('one two three', 7), ['one two', 'three']);
  assert.equal(fitsBox('short line'), true);
  assert.equal(fitsBox('x'.repeat(200)), false);
  assert.equal(hasEmDash(`a${EM_DASH}b`), true);
  assert.equal(hasEmDash('a, b'), false);
});

test('rng is deterministic', () => {
  const a = createRng(7);
  const b = createRng(7);
  assert.equal(a(), b());
  assert.notEqual(createRng(7)(), createRng(8)());
});
