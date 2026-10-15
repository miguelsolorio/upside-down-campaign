// Where the game and the Game Boy's controls go on phones and tablets. Pure, so no browser is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_W } from '../src/core/config.ts';
import { EDGE, TARGET, TOUCH_BUTTONS, buttonAt, crispScale, layoutTouch } from '../src/core/touchlayout.ts';
import type { Rect, TouchLayout, Viewport } from '../src/core/touchlayout.ts';

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
const cross = (l: TouchLayout): Rect => ({ x: l.dpad.x - l.dpadR, y: l.dpad.y - l.dpadR, w: l.dpadR * 2, h: l.dpadR * 2 });
const mid = (r: Rect): { x: number; y: number } => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

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
      assert.ok(!overlaps(r, l.dpadZone), `${b} is off the D-pad zone`);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [a, ra] = rects[i] as (typeof rects)[number];
        const [b, rb] = rects[j] as (typeof rects)[number];
        assert.ok(!overlaps(ra, rb), `${a} and ${b} don't overlap`);
      }
    }
    assert.ok(!overlaps(l.dpadZone, l.game), 'the D-pad zone is off the game');
    assert.ok(within(l.dpadZone, l.safe), 'the D-pad zone is inside the safe area');
    assert.ok(l.dpadZone.x >= EDGE, 'the D-pad zone keeps clear of the back swipe');
    assert.ok(within(cross(l), l.dpadZone), 'the whole cross is inside its zone');
  });

  test(`${name}: the game sits in the bezel, big enough to play and crisp when that is close`, () => {
    const l = layoutTouch(v);
    assert.ok(l.scale >= 1, `scale ${l.scale.toFixed(2)} is at least one CSS px per game px`);
    const devicePx = l.scale * v.dpr;
    const whole = Math.abs(devicePx - Math.round(devicePx)) < 1e-9;
    if (!whole) assert.ok(Math.abs(l.game.w * v.dpr - Math.round(l.game.w * v.dpr)) < 1e-6, 'a fractional scale still lands on whole device px');
    const s = l.shell;
    assert.ok(within(l.game, s.bezel), 'the screen is inside the bezel');
    assert.ok(within(s.bezel, l.safe), 'the bezel is inside the safe area');
    assert.ok(l.game.y >= s.stripes.y + s.stripes.h - 0.01, 'the stripes are over the screen');
    // The bezel's big round corner never cuts the screen's corner.
    const bx = s.bezel.x + s.bezel.w - s.bezelCorner, by = s.bezel.y + s.bezel.h - s.bezelCorner;
    const gx = l.game.x + l.game.w, gy = l.game.y + l.game.h;
    assert.ok(gx <= bx || gy <= by || Math.hypot(gx - bx, gy - by) <= s.bezelCorner, 'the round corner clears the screen');
    for (const b of TOUCH_BUTTONS) assert.ok(!overlaps(l.buttons[b], s.bezel), `${b} is off the bezel`);
    assert.ok(!overlaps(cross(l), s.bezel), 'the D-pad is off the bezel');
  });

  test(`${name}: the buttons sit where a Game Boy has them`, () => {
    const l = layoutTouch(v);
    const { a, b, burst, swap, select, start } = l.buttons;
    assert.ok(mid(b).x < mid(a).x && mid(b).y > mid(a).y, 'B is low and left of A');
    assert.ok(Math.abs(mid(swap).x - mid(b).x) < 1 && swap.y + swap.h <= b.y, 'SWAP sits over B');
    assert.ok(Math.abs(mid(burst).x - mid(a).x) < 1 && burst.y + burst.h <= a.y, 'the d20 sits over A');
    assert.ok(select.x + select.w <= start.x && select.y === start.y, 'SELECT is left of START');
    assert.ok(select.y >= l.dpad.y + l.dpadR, 'SELECT and START are under the D-pad');
    assert.ok(l.dpad.x < mid(b).x, 'the D-pad is left of the buttons');
  });
}

test('portrait puts the bezel at the top of the safe area, landscape centers the screen', () => {
  const p = layoutTouch({ w: 393, h: 852, dpr: 3, safe: { t: 59, r: 0, b: 34, l: 0 } });
  assert.ok(p.shell.bezel.y > 59 && p.shell.bezel.y < 59 + 40, 'the bezel starts just under the groove');
  assert.ok(Math.abs(p.game.x + p.game.w / 2 - 393 / 2) < 1, 'the screen is centered across');
  assert.ok(p.game.w >= 393 * 0.8, 'the screen fills most of the width');
  assert.ok(p.dpadZone.y >= p.game.y + p.game.h, 'the controls are under the screen');
  const l = layoutTouch({ w: 852, h: 393, dpr: 3, safe: { t: 0, r: 59, b: 21, l: 59 } });
  assert.ok(Math.abs(l.game.x + l.game.w / 2 - 426) < 1, 'centered across');
  assert.ok(l.buttons.a.x > l.game.x + l.game.w, 'buttons on the right');
  assert.ok(l.dpadZone.x + l.dpadZone.w < l.game.x, 'D-pad on the left');
  assert.ok(l.buttons.start.x + l.buttons.start.w < l.game.x, 'SELECT and START on the left too');
  assert.equal(l.shell.groove, null, 'no top groove in landscape');
});

test('a short screen drops the name and squeezes the shell before it shrinks the game', () => {
  const tall = layoutTouch({ w: 375, h: 667, dpr: 2 });
  const short = layoutTouch({ w: 375, h: 548, dpr: 2 });
  assert.ok(tall.shell.logo, 'the name fits on a tall screen');
  assert.equal(short.shell.logo, null, 'the name goes first');
  assert.ok(short.buttons.a.w <= tall.buttons.a.w, 'the buttons give a little');
  assert.ok(short.buttons.a.w >= TARGET);
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
  assert.equal(buttonAt(l, l.dpad.x, l.dpad.y), null);
});

test('a window too small to hold the shell still lays out without a negative size', () => {
  for (const v of [{ w: 0, h: 0, dpr: 1 }, { w: 10, h: 20, dpr: 2 }, { w: 200, h: 100, dpr: 1 }]) {
    const l = layoutTouch(v);
    assert.ok(l.scale >= 0 && l.shell.bezelCorner >= 0 && l.shell.corner >= 0 && l.dpadR > 0, `${v.w} by ${v.h}`);
    assert.ok(Number.isFinite(l.game.x) && Number.isFinite(l.game.y));
  }
});
