// The scare figure (src/gfx/figure.ts): the Demogorgon that crosses the trail in 1.1, walks behind the Lab's glass in 1.2 and
// passes the cafeteria counter in 1.3. It is a dark body of about its height at every frame of a crossing, it has none of
// the red eyes the old drawing had (the Demogorgon has no face), it faces the way the scare's path runs, and it walks. It
// draws through the game's canvas helpers, so the software canvas from canvas-helpers.ts runs it; import that first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cols, count, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import { STALKER, dirOf, drawScareFigure, tallOf } from '../src/gfx/figure.ts';
import type { ScareDef } from '../src/world/types.ts';

/** Stage 1.1's scare on a small screen: right to left, 90 frames. */
const LEFT: ScareDef = { from: { x: 170, y: 120 }, to: { x: 50, y: 120 }, frames: 90 };
const RIGHT: ScareDef = { from: { x: 50, y: 120 }, to: { x: 170, y: 120 }, frames: 90 };

const draw = (t: number, s: ScareDef) => {
  const c = screen(220, 160), g = ctxOf(c);
  drawScareFigure(g, 110, 120, t, s);
  return c;
};

test('the figure is a dark hunched body about 26 px tall at every frame, with no eyes', () => {
  assert.equal(tallOf(STALKER), 26);
  for (let t = 0; t < LEFT.frames; t += 3) {
    const c = draw(t, LEFT);
    assert.ok(painted(c) > 80, `frame ${t} is drawn`);
    assert.ok(count(c, 'black') > 60, `frame ${t} is mostly black`);
    assert.equal(count(c, 'hot'), 0, `frame ${t} has no eyes`);
    const [top, bottom] = rows(c), h = bottom - top + 1;
    assert.ok(h >= 24 && h <= 30, `frame ${t}: ${h} px tall`);
    const [l, r] = cols(c);
    assert.ok(r - l + 1 >= 16, `frame ${t}: ${r - l + 1} px long, it leans forward`);
  }
});

test('it faces the way the path runs and the walk has more than one frame', () => {
  const [l0] = cols(draw(0, LEFT)), [, r1] = cols(draw(0, RIGHT));
  assert.ok(l0 < 110 - 10, 'walking left, its head and hands reach well left of its feet');
  assert.ok(r1 > 110 + 10, 'walking right, they reach well right of its feet');
  assert.equal(dirOf(LEFT), -1);
  assert.equal(dirOf(RIGHT), 1);
  assert.ok(!same(draw(0, LEFT), draw(STALKER.step, LEFT)), 'the next phase of the walk is a different frame');
  assert.ok(same(draw(0, LEFT), draw(STALKER.step * 4, LEFT)), 'and the walk loops after four phases');
});
