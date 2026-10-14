// The Hawkins Lab art: nine tiles, the door and the console. Pure pixel work, so Node runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TileName } from '../src/core/tiles.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { nightTile } from '../src/gfx/night.ts';
import { consoleArt, doorArt } from '../src/gfx/props_lab.ts';

const LAB: TileName[] = ['labfloor', 'labfloor2', 'hazard', 'labwall', 'labcap', 'vent', 'pipe', 'glass', 'cage'];
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const paint = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const count = (px: Px, colors: ColorName[]): number => {
  const set = new Set(colors.map((c) => px32(c)));
  return px.d.reduce((n, v) => n + (set.has(v) ? 1 : 0), 0);
};
const GREEN: ColorName[] = ['pine0', 'pine1', 'pine2', 'pine3', 'leaf'];

test('every lab tile is painted, 16 by 16, with no see-through pixels, by day and at night', () => {
  for (const name of LAB) {
    for (let i = 0; i < 6; i++) {
      const c = ctxAt(3 + i * 5, 2 + i * 3, i % 2 ? around(name) : { n: 'labcap', e: 'labfloor', s: 'labwall', w: 'labfloor' });
      const day = paint(name, c);
      assert.ok(day, name);
      assert.equal(day.w, 16, name);
      assert.equal(day.h, 16, name);
      assert.ok(day.d.every((v) => v >>> 24 === 255), `${name} is opaque`);
      const night = nightTile(day, name, c);
      assert.ok(night.d.every((v) => v >>> 24 === 255), `${name} is opaque at night`);
    }
  }
});

test('lab tiles use no grass colors, and the glass and the cage sit on a floor', () => {
  for (const name of LAB) {
    assert.equal(count(paint(name, ctxAt(7, 9, around(name))), GREEN), 0, `${name} has no green`);
  }
  const lamp = paint('lamp', ctxAt(7, 9, around('labfloor')));
  const onGrass = paint('lamp', ctxAt(7, 9, around('grass')));
  assert.ok(count(onGrass, GREEN) > 60 && count(lamp, GREEN) < 12, 'a lamp by a lab floor stands on the floor');
});

test('floors vary from tile to tile, so a room is not stamped', () => {
  for (const name of ['labfloor', 'labfloor2'] as TileName[]) {
    const seen = new Set<string>();
    for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(name, ctxAt(tx, ty, around(name))).d.join());
    assert.ok(seen.size >= 40, `${name}: ${seen.size} different tiles out of 64`);
  }
  const a = paint('labfloor', ctxAt(3, 3, around('labfloor'))), b = paint('labfloor2', ctxAt(3, 3, around('labfloor2')));
  assert.notDeepEqual(a.d, b.d, 'the two floors differ');
});

test('the hazard tile is mostly yellow and black stripes', () => {
  const px = paint('hazard', ctxAt(4, 4, around('hazard')));
  assert.ok(count(px, ['yellow', 'amber']) >= 100, 'yellow');
  assert.ok(count(px, ['ink', 'grey1']) >= 100, 'black');
});

test('a wall reads as roof edge over wall face: the cap is dark and the face is pale', () => {
  const lum = (px: Px): number => px.d.reduce((s, v) => s + 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255), 0) / 256;
  const cap = paint('labcap', ctxAt(5, 5, { n: 'labcap', e: 'labcap', s: 'labwall', w: 'labcap' }));
  const face = paint('labwall', ctxAt(5, 6, { n: 'labcap', e: 'labwall', s: 'labfloor', w: 'labwall' }));
  assert.ok(lum(cap) < lum(face) * 0.6, 'the cap is the darker one');
});

test('the door fills its doorway at any size, closed or open', () => {
  for (const [w, h] of [[32, 16], [16, 32], [48, 16], [16, 48]] as [number, number][]) {
    const closed = doorArt(w, h, false), open = doorArt(w, h, true);
    assert.equal(closed.w, w);
    assert.equal(closed.h, h);
    assert.equal(open.w, w);
    assert.equal(open.h, h);
    const full = closed.d.filter((v) => v !== 0).length;
    const half = open.d.filter((v) => v !== 0).length;
    assert.ok(full === w * h, `a closed ${w} by ${h} door covers its doorway`);
    assert.ok(half < full * 0.8, `an open ${w} by ${h} door leaves the way clear`);
  }
});

test('the console is 16 by 16 and looks different lit and dark', () => {
  const dark = consoleArt(false), lit = consoleArt(true);
  assert.equal(dark.w, 16);
  assert.equal(lit.h, 16);
  assert.equal(count(dark, ['leaf', 'cyan']), 0, 'a dark console has no green or teal light');
  assert.ok(count(lit, ['leaf', 'cyan', 'teal1']) >= 12, 'a lit console shows teal and green');
  assert.notDeepEqual(dark.d, lit.d);
});
