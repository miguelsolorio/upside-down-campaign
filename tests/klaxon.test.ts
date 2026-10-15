// The klaxon's glow: it comes up and goes down smoothly, breathes slowly, and with Reduce flashing on it holds still.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANDS, BREATH_FRAMES, BRIGHT, DIM, FADE_IN, FADE_OUT, HOLD_FRAMES, STEADY, createKlaxon } from '../src/world/klaxon.ts';

/** The level every frame from a ring until the glow is gone (or `max` frames), with `ringAt` frames to ring again at. */
function run(calm: boolean, max = 2000, ringAt: number[] = []): number[] {
  const k = createKlaxon();
  k.ring();
  const out: number[] = [];
  for (let t = 0; t < max; t++) {
    if (ringAt.includes(t)) k.ring();
    k.tick();
    out.push(k.level(calm));
    if (out.length > 5 && out[out.length - 1] === 0) break;
  }
  return out;
}
const biggestStep = (xs: number[]): number => Math.max(...xs.slice(1).map((x, i) => Math.abs(x - (xs[i] as number))));

test('no alarm, no glow', () => {
  const k = createKlaxon();
  for (let i = 0; i < 10; i++) k.tick();
  assert.equal(k.level(false), 0);
  assert.equal(k.level(true), 0);
});

test('the glow comes up from nothing, stays a while, and goes away on its own', () => {
  const xs = run(false);
  assert.ok((xs[0] as number) < 0.05, 'it starts from nothing');
  assert.ok(Math.max(...xs) > 0.9 * BRIGHT, 'it gets bright');
  assert.ok(Math.max(...xs) <= BRIGHT, 'never past full');
  assert.equal(xs[xs.length - 1], 0, 'and it ends');
  assert.ok(xs.length >= HOLD_FRAMES + FADE_OUT - 2 && xs.length <= HOLD_FRAMES + FADE_OUT + 2, `it lasts the hold and the fade out, not ${xs.length}`);
});

test('it never jumps: a full swing takes at least a third of a second, nothing like a flash', () => {
  const step = 1 / 20;
  assert.ok(biggestStep(run(false)) < step);
  assert.ok(biggestStep(run(true)) < step);
  // A ring in the middle of the fade out brings the glow back up the same way, not in one step.
  assert.ok(biggestStep(run(false, 2000, [HOLD_FRAMES + FADE_OUT / 2])) < step);
});

test('it breathes no faster than once every two seconds, so nothing in it can pass for a flash', () => {
  assert.ok(BREATH_FRAMES >= 120);
  const xs = run(false);
  const mid = xs.slice(FADE_IN + 5, HOLD_FRAMES - 5);
  // Count the bright peaks across the plateau: one per breath.
  let peaks = 0;
  for (let i = 1; i < mid.length - 1; i++) if ((mid[i] as number) > (mid[i - 1] as number) && (mid[i] as number) >= (mid[i + 1] as number)) peaks++;
  assert.ok(peaks >= 1 && peaks <= Math.ceil(mid.length / BREATH_FRAMES) + 1, `${peaks} peaks`);
  assert.ok(Math.min(...mid) >= DIM - 0.01, 'it dims between breaths but never goes out');
});

test('with Reduce flashing on it holds one steady level between the fades, and never gets as bright as a breath', () => {
  const xs = run(true);
  const plateau = xs.slice(FADE_IN + 2, HOLD_FRAMES - 2);
  assert.ok(plateau.length > 100);
  for (const x of plateau) assert.equal(x, STEADY, 'no breathing');
  assert.ok(Math.max(...xs) <= STEADY);
  const climb = xs.slice(0, FADE_IN);
  assert.ok(climb.every((x, i) => i === 0 || x >= (climb[i - 1] as number)), 'it climbs to the steady level and does not overshoot');
});

test('ringing again while it is up keeps it up for the full time from the new ring', () => {
  const once = run(false).length;
  const again = run(false, 3000, [200]).length;
  assert.ok(again > once + 150, 'a second ring 200 frames in pushes the end back');
  assert.ok(again < once + 250);
});

test('clear puts the glow out at once, for a retry', () => {
  const k = createKlaxon();
  k.ring();
  for (let i = 0; i < 100; i++) k.tick();
  assert.ok(k.level(false) > 0.3);
  k.clear();
  assert.equal(k.level(false), 0);
});

test('the bands step in from the edge, each deeper and fainter than the last', () => {
  for (let i = 1; i < BANDS.length; i++) {
    assert.ok((BANDS[i] as { w: number }).w > (BANDS[i - 1] as { w: number }).w);
    assert.ok((BANDS[i] as { a: number }).a < (BANDS[i - 1] as { a: number }).a);
  }
  assert.ok((BANDS[BANDS.length - 1] as { w: number }).w <= 40, 'a glow along the edge, not a wash over the level');
});
