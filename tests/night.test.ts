// The night art: tiles repainted in a night palette with a few night-only details. Pure pixel work, so Node runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { Px } from '../src/gfx/px.ts';
import { groundTile, waterTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { litWindow, nightSprite, nightTile, nightWater } from '../src/gfx/night.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';

const pack = (c: readonly [number, number, number]): number => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
const RIM = pack([160, 70, 140]);
const SPORE = pack([255, 150, 210]);
const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
const count = (px: Px, v: number): number => px.d.reduce((n, d) => n + (d === v ? 1 : 0), 0);

const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const day = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const NAMES = [...new Set(Object.values(TILES).map((t) => t.name))].filter((n) => n !== 'creek' && n !== 'shallows');

test('every land tile has a night version of the same size, fully painted', () => {
  for (const name of NAMES) {
    const c = ctxAt(5, 4, around(name === 'pine' || name === 'deadtree' || name === 'bush' ? 'grass2' : name));
    const d = day(name, c);
    const n = nightTile(d, name, c);
    assert.equal(n.w, 16, name);
    assert.equal(n.h, 16, name);
    assert.ok(n.d.every((v) => v >>> 24 === 255), `${name} has no see-through pixels`);
  }
});

test('a night tile never changes its day tile, and is the same every time', () => {
  const c = ctxAt(9, 11, around('grass'));
  const d = day('grass', c);
  const before = d.d.slice();
  const a = nightTile(d, 'grass', c), b = nightTile(d, 'grass', c);
  assert.deepEqual(d.d, before);
  assert.deepEqual(a.d, b.d);
});

test('ground, trees and earth get darker at night', () => {
  for (const name of ['grass', 'grass2', 'trail', 'dirt', 'gravel', 'road'] as TileName[]) {
    const c = ctxAt(7, 7, around(name));
    const d = day(name, c), n = nightTile(d, name, c);
    const avg = (p: Px): number => p.d.reduce((s, v) => s + lum(v), 0) / 256;
    assert.ok(avg(n) < avg(d) * 0.7, `${name}: ${avg(n).toFixed(0)} against ${avg(d).toFixed(0)}`);
  }
});

test('lights stay lights: the lamp glass and a lit window keep their colors', () => {
  const lampC = ctxAt(12, 35, around('grass'));
  const lamp = day('lamp', lampC), lampNight = nightTile(lamp, 'lamp', lampC);
  for (const glow of ['amber', 'yellow', 'cream'] as ColorName[]) {
    assert.ok(count(lamp, px32(glow)) > 0, `the day lamp has ${glow}`);
    assert.equal(count(lampNight, px32(glow)), count(lamp, px32(glow)), `${glow} is untouched`);
  }
  let seen = 0;
  for (let tx = 1; tx < 22; tx += 2) {
    const c = ctxAt(tx, 28, around('housewall'));
    const wall = day('housewall', c);
    if (!litWindow(wall, 'housewall')) continue;
    seen++;
    assert.equal(count(nightTile(wall, 'housewall', c), px32('amber')), count(wall, px32('amber')), `window at ${tx}`);
  }
  assert.ok(seen > 0, 'the house has lit windows to test');
});

test('only a lit house window counts as a window', () => {
  let lit = 0, dark = 0;
  for (let tx = 1; tx < 40; tx++) {
    const wall = day('housewall', ctxAt(tx, 28, around('housewall')));
    if (litWindow(wall, 'housewall')) lit++; else dark++;
    assert.ok(!litWindow(wall, 'trail'), 'another tile is never a window');
  }
  assert.ok(lit > 0 && dark > 0, `${lit} lit, ${dark} not`);
});

test('the edge of a forest gets a rim light, and the middle of one does not', () => {
  const lone = ctxAt(5, 5, around('grass2'));
  const edge = nightTile(day('pine', lone), 'pine', lone);
  assert.ok(count(edge, RIM) >= 6, `rim pixels on a lone pine: ${count(edge, RIM)}`);
  const deep = ctxAt(5, 5, around('pine'));
  assert.equal(count(nightTile(day('pine', deep), 'pine', deep), RIM), 0, 'no rim inside the trees');
});

test('trees are darker than the grass beside them', () => {
  const grass = ctxAt(6, 6, around('grass'));
  const tree = ctxAt(6, 6, around('pine'));
  const avg = (p: Px): number => p.d.reduce((s, v) => s + lum(v), 0) / 256;
  assert.ok(avg(nightTile(day('pine', tree), 'pine', tree)) < avg(nightTile(day('grass', grass), 'grass', grass)));
});

test('spores drift over the ground in about one tile in five', () => {
  let tiles = 0, spored = 0;
  for (let ty = 0; ty < 20; ty++) {
    for (let tx = 0; tx < 20; tx++) {
      const c = ctxAt(tx, ty, around('grass'));
      tiles++;
      if (count(nightTile(day('grass', c), 'grass', c), SPORE) > 0) spored++;
    }
  }
  assert.ok(spored / tiles > 0.1 && spored / tiles < 0.35, `${spored} of ${tiles}`);
});

test('night water has moon glints, none of the day blues, and a glint that moves', () => {
  const frames = [0, 1, 2, 3].map((f) => nightWater(waterTile(true, 1, f, 0), true, 1, f));
  for (const w of frames) {
    assert.equal(count(w, px32('teal1')), 0, 'no day teal left');
    assert.ok(w.d.every((v) => v >>> 24 === 255));
  }
  assert.notDeepEqual(frames[0]?.d, frames[1]?.d, 'the water moves');
  const glint = pack([255, 180, 225]);
  assert.ok(frames.some((w) => count(w, glint) > 0), 'a glint shows on some frame');
});

test('props are repainted too, with the same size', () => {
  const sprite = new Px(6, 4).fill('soil2').rect(1, 1, 2, 2, 'yellow');
  const n = nightSprite(sprite);
  assert.equal(n.w, 6);
  assert.equal(n.h, 4);
  assert.notEqual(n.get(0, 0), sprite.get(0, 0), 'the wood is repainted');
  assert.equal(n.get(1, 1), px32('yellow'), 'the light is not');
});

test('stage data says what light it is in', () => {
  assert.equal(STAGE_11.time, 'night');
});
