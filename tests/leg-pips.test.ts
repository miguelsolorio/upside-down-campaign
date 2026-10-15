// The Mind Flayer's leg pips under the boss bar (docs/level-9.md, "The Mind Flayer"): where each pip goes and how full it is,
// for a boss hit in parts. Pure layout, so no canvas is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_BAR_W, MAX_PIPS, NEXT_DY, NEXT_DY_PIPS, PIP_DY, PIP_GAP, PIP_H, PIP_W, bossLayout } from '../src/ui/hudlayout.ts';

const TOP = 20;

test('four legs: four pips in a row under the bar, centered, each in its own place', () => {
  const lay = bossLayout(256, TOP, [1, 0.5, 0.25, 1]);
  assert.equal(lay.x, 40, 'the bar is 176 wide, centered');
  assert.equal(lay.y, TOP + 2);
  assert.equal(lay.pips.length, 4);
  lay.pips.forEach((p, i) => {
    assert.equal(p.w, PIP_W);
    assert.equal(p.h, PIP_H);
    assert.equal(p.y, lay.y + PIP_DY, 'one row, a pixel under the bar frame and its own');
    if (i > 0) assert.equal(p.x, (lay.pips[i - 1] as { x: number; w: number }).x + PIP_W + PIP_GAP, 'a gap between pips');
  });
  const first = lay.pips[0] as { x: number };
  const last = lay.pips[3] as { x: number; w: number };
  assert.equal(first.x + (last.x + last.w - first.x) / 2, 128, 'centered on the screen');
  assert.ok(first.x >= lay.x && last.x + last.w <= lay.x + BOSS_BAR_W, 'under the bar, not wider than it');
});

test('a pip fills with its leg\'s share of HP, at least a pixel while any is left, nothing when it is severed', () => {
  const lay = bossLayout(256, TOP, [1, 0.5, 0, 1 / 140]);
  assert.deepEqual(lay.pips.map((p) => p.fill), [PIP_W, PIP_W / 2, 0, 1]);
  assert.deepEqual(lay.pips.map((p) => p.severed), [false, false, true, false]);
  assert.deepEqual(lay.pips.map((p) => p.share), [1, 0.5, 0, 1 / 140]);
});

test('every share at 0: the four pips are all there, empty and dim', () => {
  const lay = bossLayout(256, TOP, [0, 0, 0, 0]);
  assert.equal(lay.pips.length, 4, 'a severed leg still has its pip');
  for (const p of lay.pips) {
    assert.equal(p.fill, 0);
    assert.equal(p.severed, true);
  }
});

test('no parts, or an empty list: no pips, and a bar under the boss bar sits where it always did', () => {
  for (const parts of [undefined, []] as const) {
    const lay = bossLayout(256, TOP, parts);
    assert.deepEqual(lay.pips, []);
    assert.equal(lay.nextY, lay.y + NEXT_DY);
    assert.equal(lay.nextY, lay.y + 12);
  }
});

test('with pips, a bar stacked under the boss bar clears them', () => {
  const lay = bossLayout(256, TOP, [1, 1, 1, 1]);
  assert.equal(lay.nextY, lay.y + NEXT_DY_PIPS);
  const pipFrameBottom = lay.y + PIP_DY + PIP_H;
  assert.ok(lay.nextY - 1 > pipFrameBottom + 1, 'the next bar\'s frame starts a pixel below the pips\' frame');
});

test('a share that is not a number, or is out of range, is clamped', () => {
  const lay = bossLayout(256, TOP, [Number.NaN, -0.3, 2]);
  assert.deepEqual(lay.pips.map((p) => p.share), [0, 0, 1]);
  assert.deepEqual(lay.pips.map((p) => p.fill), [0, 0, PIP_W]);
});

test('the pips stay centered under the bar on every screen width and strip height', () => {
  for (const [w, top] of [[256, 20], [320, 26], [384, 26], [1024, 26]] as const) {
    const lay = bossLayout(w, top, [1, 1, 1, 1]);
    assert.equal(lay.x * 2 + BOSS_BAR_W, w, `the bar is centered at ${w}`);
    const a = lay.pips[0] as { x: number };
    const z = lay.pips[3] as { x: number; w: number };
    assert.equal(a.x + z.x + z.w, w, `the pips are centered at ${w}`);
    assert.equal(lay.y, top + 2);
    assert.equal((lay.pips[0] as { y: number }).y, top + 2 + PIP_DY);
  }
});

test('one part is one pip in the middle; many parts narrow to stay under the bar, and none past the cap are shown', () => {
  const one = bossLayout(256, TOP, [0.8]);
  assert.equal(one.pips.length, 1);
  assert.equal((one.pips[0] as { x: number; w: number }).x * 2 + PIP_W, 256);

  const many = bossLayout(256, TOP, new Array<number>(MAX_PIPS + 3).fill(1));
  assert.equal(many.pips.length, MAX_PIPS);
  const a = many.pips[0] as { x: number; w: number };
  const z = many.pips[MAX_PIPS - 1] as { x: number; w: number };
  assert.ok(a.w <= PIP_W && a.w >= 1);
  assert.ok(a.x >= many.x && z.x + z.w <= many.x + BOSS_BAR_W, 'inside the bar\'s width');
});
