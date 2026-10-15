// Where the game and the touch controls go on phones and tablets. Pure, so no browser is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_W } from '../src/core/config.ts';
import { EDGE, STICK_R, TARGET, TOUCH_BUTTONS, buttonAt, crispScale, layoutTouch } from '../src/core/touchlayout.ts';
import type { Rect, Viewport } from '../src/core/touchlayout.ts';

const VIEWPORTS: [string, Viewport][] = [
  ['small phone', { w: 375, h: 667, dpr: 2 }],
  ['small phone in Safari', { w: 375, h: 548, dpr: 2 }],
  ['small phone, landscape', { w: 667, h: 375, dpr: 2 }],
  ['notched phone', { w: 393, h: 852, dpr: 3, safe: { t: 59, r: 0, b: 34, l: 0 } }],
  ['notched phone, landscape', { w: 852, h: 393, dpr: 3, safe: { t: 0, r: 59, b: 21, l: 59 } }],
  ['tall phone', { w: 412, h: 915, dpr: 2.625 }],
  ['tall phone, landscape', { w: 915, h: 412, dpr: 2.625 }],
  ['tablet', { w: 820, h: 1180, dpr: 2, safe: { t: 24, r: 0, b: 20, l: 0 } }],
  ['tablet, landscape', { w: 1180, h: 820, dpr: 2, safe: { t: 24, r: 0, b: 20, l: 0 } }],
  ['laptop', { w: 1280, h: 800, dpr: 2 }],
];

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const within = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x - 0.01 && inner.y >= outer.y - 0.01
  && inner.x + inner.w <= outer.x + outer.w + 0.01 && inner.y + inner.h <= outer.y + outer.h + 0.01;

for (const [name, v] of VIEWPORTS) {
  test(`${name}: everything fits in the safe area and nothing overlaps`, () => {
    const l = layoutTouch(v);
    assert.equal(l.orientation, v.h >= v.w ? 'portrait' : 'landscape');
    assert.ok(within(l.game, l.safe), 'the game is inside the safe area');
    const rects = TOUCH_BUTTONS.map((b) => [b, l.buttons[b]] as const);
    for (const [b, r] of rects) {
      assert.ok(within(r, l.safe), `${b} is inside the safe area`);
      assert.ok(r.w >= TARGET && r.h >= TARGET, `${b} is at least ${TARGET} px`);
      assert.ok(!overlaps(r, l.game), `${b} is off the game`);
      assert.ok(!overlaps(r, l.stickZone), `${b} is off the stick zone`);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [a, ra] = rects[i] as (typeof rects)[number];
        const [b, rb] = rects[j] as (typeof rects)[number];
        assert.ok(!overlaps(ra, rb), `${a} and ${b} don't overlap`);
      }
    }
    assert.ok(!overlaps(l.stickZone, l.game), 'the stick zone is off the game');
    assert.ok(within(l.stickZone, l.safe), 'the stick zone is inside the safe area');
    assert.ok(l.stickZone.x >= EDGE, 'the stick zone keeps clear of the back swipe');
    assert.ok(l.stickZone.w >= STICK_R * 2 && l.stickZone.h >= STICK_R * 2, 'the stick has room to sit');
  });

  test(`${name}: the game is as big as it can be and crisp when that is close`, () => {
    const l = layoutTouch(v);
    assert.ok(l.scale >= 1.3, `scale ${l.scale.toFixed(2)} is big enough to play`);
    const devicePx = l.scale * v.dpr;
    const whole = Math.abs(devicePx - Math.round(devicePx)) < 1e-9;
    if (!whole) assert.ok(Math.abs(l.game.w * v.dpr - Math.round(l.game.w * v.dpr)) < 1e-6, 'a fractional scale still lands on whole device px');
    const sw = l.stickRest;
    assert.ok(sw.x - l.stickR >= l.stickZone.x && sw.x + l.stickR <= l.stickZone.x + l.stickZone.w, 'the resting stick is inside its zone');
    assert.ok(sw.y - l.stickR >= l.stickZone.y && sw.y + l.stickR <= l.stickZone.y + l.stickZone.h);
  });
}

test('portrait puts the game at the top of the safe area, landscape centers it', () => {
  const p = layoutTouch({ w: 393, h: 852, dpr: 3, safe: { t: 59, r: 0, b: 34, l: 0 } });
  assert.equal(p.game.y, 59);
  const l = layoutTouch({ w: 852, h: 393, dpr: 3, safe: { t: 0, r: 59, b: 21, l: 59 } });
  assert.ok(Math.abs(l.game.x + l.game.w / 2 - 426) < 1, 'centered across');
  assert.ok(l.buttons.a.x > l.game.x + l.game.w, 'buttons on the right');
  assert.ok(l.stickZone.x + l.stickZone.w < l.game.x, 'stick on the left');
});

test('a crisp scale wins when it gives up little, a fraction when it would give up a lot', () => {
  assert.equal(crispScale(3.2, 2), 3, '3 fills 94 percent');
  assert.equal(crispScale(1.6, 1), Math.floor(1.6 * BASE_W) / BASE_W, '1 would fill 63 percent');
  assert.equal(crispScale(1.7, 3), 5 / 3);
});

test('buttonAt finds the button under a point and nothing between them', () => {
  const l = layoutTouch({ w: 393, h: 852, dpr: 3 });
  for (const b of TOUCH_BUTTONS) {
    const r = l.buttons[b];
    assert.equal(buttonAt(l, r.x + r.w / 2, r.y + r.h / 2), b);
  }
  assert.equal(buttonAt(l, l.game.x + 10, l.game.y + 10), null);
  assert.equal(buttonAt(l, l.stickRest.x, l.stickRest.y), null);
});
