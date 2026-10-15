// Stage 2.3 at night: the flesh is the quiet part of the picture, the cracks are thin and dark, and the Lab's own tiles are dim,
// so the party, the demodogs and the rift are what the eye lands on. Pure pixel work, so Node runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TileName } from '../src/core/tiles.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { nightTile } from '../src/gfx/night.ts';
import { groundTile } from '../src/gfx/tile_ground.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { fleshTile } from '../src/gfx/tile_flesh.ts';

const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const ctxAt = (tx: number, ty: number, near: Near): TileCtx => ({ tx, ty, near });
const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
const day = (name: TileName, c: TileCtx): Px => (groundTile(name, c) ?? objectTile(name, c)) as Px;
const count = (p: Px, names: ColorName[]): number => p.d.reduce((n, v) => n + (names.some((c) => px32(c) === v) ? 1 : 0), 0);

/** Every tile in a 9 by 9 patch of the map, painted for night. */
function patch(name: TileName, near: Near = around(name)): Px[] {
  const out: Px[] = [];
  for (let ty = 3; ty < 12; ty++) {
    for (let tx = 3; tx < 12; tx++) { const c = ctxAt(tx, ty, near); out.push(nightTile(day(name, c), name, c)); }
  }
  return out;
}
const avg = (tiles: Px[]): number => tiles.reduce((s, p) => s + p.d.reduce((a, v) => a + lum(v), 0) / 256, 0) / tiles.length;
const peak = (tiles: Px[]): number => Math.max(...tiles.map((p) => Math.max(...Array.from(p.d, lum))));

test('the flesh is dark and calm: nothing pale in it, and nothing above a dim red', () => {
  for (const name of ['fleshfloor', 'fleshwall', 'tear'] as TileName[]) {
    const tiles = patch(name);
    assert.ok(avg(tiles) < 24, `${name} averages ${avg(tiles).toFixed(1)}`);
    assert.ok(peak(tiles) < 80, `${name} peaks at ${peak(tiles).toFixed(0)}`);
    // No pale lab panel shows through the flesh, so there is nothing for a bright fleck to come from.
    const c = ctxAt(5, 4, around(name)), painted = fleshTile(name, c) as Px;
    assert.equal(count(painted, ['bone', 'white', 'grey3', 'grey2', 'mist']), 0, `${name} has no lab panel in it`);
  }
});

test('the tear is a thin dark crack with a dim red glow, not yellow shapes, and it still pulses', () => {
  for (let phase = 0; phase < 4; phase++) {
    for (let ty = 3; ty < 9; ty++) {
      for (let tx = 3; tx < 9; tx++) {
        const p = fleshTile('tear', ctxAt(tx, ty, around('tear')), phase) as Px;
        assert.equal(count(p, ['yellow', 'cream', 'orange', 'amber', 'hot', 'pink']), 0, `tear at ${tx},${ty} has no bright fire`);
        assert.ok(count(p, ['black']) >= 8, `tear at ${tx},${ty} has a crack`);
        assert.ok(count(p, ['black']) < 70, `tear at ${tx},${ty} is thin: ${count(p, ['black'])} dark pixels`);
        assert.ok(count(p, ['blood1', 'red']) >= 4, `tear at ${tx},${ty} glows`);
      }
    }
  }
  const at = (ph: number): number[] => Array.from((fleshTile('tear', ctxAt(5, 5, around('tear')), ph) as Px).d);
  assert.notDeepEqual(at(0), at(1));
});

test('the veins lean toward the rift: more of them cross the edges near it than far away, and they meet across a shared edge', () => {
  const isVein = (v: number): boolean => v === px32('blood1') || v === px32('red');
  const crossing = (x0: number, x1: number, y0: number, y1: number): number => {
    let k = 0;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if ([7, 8].some((x) => isVein((fleshTile('fleshfloor', ctxAt(tx, ty, around('fleshfloor'))) as Px).d[x] as number))) k++;
    return k;
  };
  const near = crossing(36, 43, 7, 10), far = crossing(8, 15, 20, 23);
  assert.ok(near >= far * 2, `${near} near the rift and ${far} far from it`);
  let met = 0;
  for (let ty = 10; ty < 30; ty++) {
    for (let tx = 10; tx < 30; tx++) {
      const a = fleshTile('fleshfloor', ctxAt(tx, ty, around('fleshfloor'))) as Px, b = fleshTile('fleshfloor', ctxAt(tx + 1, ty, around('fleshfloor'))) as Px;
      const east = isVein(a.d[7 * 16 + 15] as number), west = isVein(b.d[7 * 16] as number);
      if (east) { met++; assert.ok(west, `the vein at ${tx},${ty} goes on into the next tile`); }
    }
  }
  assert.ok(met >= 5, `${met} veins cross an edge`);
});

test('the Lab at night is dim: the floors sit about where the school hall does, and the walls are darker still', () => {
  for (const name of ['labfloor', 'labfloor2'] as TileName[]) {
    const tiles = patch(name);
    assert.ok(avg(tiles) < 50, `${name} averages ${avg(tiles).toFixed(1)}`);
    assert.ok(peak(tiles) < 70, `${name} peaks at ${peak(tiles).toFixed(0)}`);
  }
  for (const name of ['labwall', 'labcap'] as TileName[]) {
    const tiles = patch(name, { n: 'labcap', e: name, s: 'labfloor', w: name });
    assert.ok(avg(tiles) < 30, `${name} averages ${avg(tiles).toFixed(1)}`);
  }
  assert.ok(avg(patch('labfloor')) > avg(patch('labwall', { n: 'labcap', e: 'labwall', s: 'labfloor', w: 'labwall' })), 'the floor is still lighter than the wall');
});

test('the day Lab is untouched: night never changes the day tile, and the day floor is still pale', () => {
  const c = ctxAt(7, 7, around('labfloor'));
  const d = day('labfloor', c), before = d.d.slice();
  nightTile(d, 'labfloor', c);
  assert.deepEqual(d.d, before);
  assert.ok(d.d.reduce((s, v) => s + lum(v), 0) / 256 > 120, 'the day floor stays pale');
});

test('growth that sits against the Lab or its flesh is quiet, and the school keeps its own reds', () => {
  const brightRed = (tiles: Px[]): number => tiles.reduce((n, p) => n + count(p, ['red', 'hot', 'pink']), 0);
  const inLab = patch('mass', { n: 'labcap', e: 'fleshwall', s: 'fleshfloor', w: 'labwall' });
  const inSchool = patch('mass', { n: 'schoolcap', e: 'schoolwall', s: 'schoolfloor', w: 'schoolwall' });
  assert.equal(brightRed(inLab), 0, 'no day reds on a mass in the overrun Lab');
  assert.ok(brightRed(inSchool) > 50, 'a mass in the school is the same as ever');
  assert.ok(peak(inLab) < 110, `the mass in the Lab peaks at ${peak(inLab).toFixed(0)}`);
});
