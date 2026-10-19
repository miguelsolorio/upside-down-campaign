// The two props the Abyss dresses its own way (src/gfx/props_abyss.ts, docs/level-15.md): Will's hidden bridge, a veil over the bridge's tiles that
// leaves one pixel in four until he opens it, and the rock fall across the ring's way in. They wear the look only while stage 5.2 is up (looks.ts),
// and every other stage draws the corn wall and the Lab's steel door as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCanvas, ctxOf, painted, same, screen } from './canvas-helpers.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { PAL } from '../src/gfx/palette.ts';
import type { PropKind, PropState, PropView } from '../src/core/types.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawProp } = await import('../src/gfx/props.ts');
const { inAbyss, setLookStage } = await import('../src/gfx/looks.ts');
const { rockFallArt, veilArt } = await import('../src/gfx/props_abyss.ts');

const prop = (kind: PropKind, w: number, h: number, state: PropState = 'closed', t = 0): PropView => ({ id: kind, kind, x: 8, y: 8, w, h, state, t });
const drawP = (p: PropView): FakeCanvas => { const c = screen(40, 80); drawProp(ctxOf(c), p); return c; };
const PALETTE = new Set(Object.keys(PAL).map((k) => px32(k as keyof typeof PAL)));

test('the look is on for stage 5.2 and nowhere else, and follows setLookStage', () => {
  for (const [id, on] of [['5.2', true], ['5.1', false], ['1.1', false], ['2.1', false], ['4.2', false]] as const) {
    setLookStage(id);
    assert.equal(inAbyss(), on, id);
  }
  setLookStage('1.1');
});

test('Will\'s bridge: shut, a veil over all four tiles that leaves about one pixel in four clear; open, nothing, so the bridge under it shows', () => {
  const veil = veilArt(16, 64, 0);
  const dark = veil.d.filter((v) => v !== 0).length;
  assert.ok(dark > 16 * 64 * 0.65 && dark < 16 * 64 * 0.85, `${dark} of 1024 pixels are veiled`);
  assert.ok(veil.d.every((v) => v === 0 || PALETTE.has(v)), 'palette colors only');
  assert.notDeepEqual(Array.from(veilArt(16, 64, 1).d), Array.from(veil.d), 'the pattern slides a row, so the dark drifts');
  setLookStage('5.2');
  const shut = drawP(prop('hidden', 16, 64));
  assert.ok(painted(shut) > 16 * 64 * 0.65, 'the shut prop draws the veil');
  assert.equal(painted(drawP(prop('hidden', 16, 64, 'open'))), 0, 'the open one draws nothing');
  assert.ok(same(drawP(prop('hidden', 16, 64, 'closed', 0)), drawP(prop('hidden', 16, 64, 'closed', 5))), 'still at first, and a row lower only after half a second');
  setLookStage('1.1');
  const corn = drawP(prop('hidden', 16, 64));
  assert.ok(!same(corn, shut), 'every other stage still draws the corn wall');
});

test('the rock fall: shut, grey boulders heaped over the way with the red of the void in their cracks; open, a few stones at the edges', () => {
  const shut = rockFallArt(16, 48, false), open = rockFallArt(16, 48, true);
  assert.ok(shut.d.filter((v) => v !== 0).length > 16 * 48 * 0.85, 'the way is shut solid');
  assert.ok(open.d.filter((v) => v !== 0).length <= 16, 'a few stones lie where it was');
  for (const px of [shut, open]) assert.ok(px.d.every((v) => v === 0 || PALETTE.has(v)), 'palette colors only');
  assert.ok(shut.d.some((v) => v === px32('red') || v === px32('blood1')), 'with red in the cracks');
  setLookStage('5.2');
  const door = (state: PropState): FakeCanvas => drawP(prop('door', 16, 48, state));
  assert.ok(painted(door('closed')) > 16 * 48 * 0.85, 'drawn shut');
  assert.ok(painted(door('open')) <= 16, 'and lifted');
  const rock = door('closed');
  setLookStage('1.1');
  assert.ok(!same(rock, door('closed')), 'every other stage still draws the Lab\'s steel door');
});
