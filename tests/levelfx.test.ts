// The level-up effect that plays in the world. Pure timing, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELFX_FRAMES, RING_FRAMES, SPARKLES, TALENT_FROM, TALENT_TO, createLevelFx, hudPulse, ringRadius, sparkle, talentShowing,
} from '../src/world/levelfx.ts';
import type { HeroId, LevelUpInfo } from '../src/core/types.ts';

const info = (hero: HeroId, to: number, over: Partial<LevelUpInfo> = {}): LevelUpInfo => ({
  hero, from: to - 1, to, roll: 10, advantage: false, gains: {}, talent: null, ...over,
});
const tickN = (fx: ReturnType<typeof createLevelFx>, n: number): void => { for (let i = 0; i < n; i++) fx.tick(); };

test('an effect plays for LEVELFX_FRAMES ticks and then is gone', () => {
  const fx = createLevelFx();
  fx.push(info('mike', 2));
  assert.equal(fx.list().length, 1);
  tickN(fx, LEVELFX_FRAMES - 1);
  assert.equal(fx.list().length, 1, 'still up on the last tick');
  fx.tick();
  assert.equal(fx.list().length, 0);
});

test('it records the level, the talent name and whether the roll was a 20', () => {
  const fx = createLevelFx();
  fx.push(info('lucas', 3, { roll: 20, talent: { name: 'Sharpshooter', text: 'x' } }));
  fx.push(info('mike', 2));
  const [a, b] = fx.list();
  assert.deepEqual([a?.hero, a?.to, a?.talent, a?.nat20], ['lucas', 3, 'Sharpshooter', true]);
  assert.deepEqual([b?.hero, b?.to, b?.talent, b?.nat20], ['mike', 2, null, false]);
});

test('several heroes can level in the same tick and each keeps its own clock', () => {
  const fx = createLevelFx();
  fx.push(info('mike', 2));
  tickN(fx, 40);
  fx.push(info('dustin', 2));
  assert.equal(fx.since('mike'), 40);
  assert.equal(fx.since('dustin'), 0);
  assert.equal(fx.since('lucas'), null);
  tickN(fx, LEVELFX_FRAMES - 40);
  assert.equal(fx.since('mike'), null, 'mike is done');
  assert.equal(fx.since('dustin'), LEVELFX_FRAMES - 40, 'dustin is still going');
});

test('since() gives the newest effect when one hero levels twice', () => {
  const fx = createLevelFx();
  fx.push(info('mike', 2));
  tickN(fx, 30);
  fx.push(info('mike', 3));
  assert.equal(fx.since('mike'), 0);
});

test('clear forgets everything, for a retry', () => {
  const fx = createLevelFx();
  fx.push(info('mike', 2));
  fx.clear();
  assert.equal(fx.list().length, 0);
  assert.equal(fx.since('mike'), null);
});

test('the ring grows from a few px to its full size, then is gone', () => {
  assert.equal(ringRadius(0), 3);
  let prev = 0;
  for (let t = 0; t < RING_FRAMES; t++) {
    const r = ringRadius(t);
    assert.ok(r >= prev, `grows: ${r} after ${prev}`);
    assert.ok(r <= 22);
    prev = r;
  }
  assert.ok(ringRadius(RING_FRAMES - 1) >= 20, 'nearly full size at the end');
  assert.equal(ringRadius(RING_FRAMES), 0);
  assert.equal(ringRadius(-1), 0);
  assert.equal(ringRadius(10, 30) > ringRadius(10, 22), true, 'a bigger ring for a Nat 20');
});

test('sparkles start one after another, rise as they go and last 40 frames', () => {
  for (let i = 0; i < SPARKLES; i++) {
    assert.equal(sparkle(i * 6 - 1, i), null, `sparkle ${i} waits its turn`);
    assert.ok(sparkle(i * 6, i), `sparkle ${i} starts`);
    assert.ok(sparkle(i * 6 + 39, i));
    assert.equal(sparkle(i * 6 + 40, i), null);
    const a = sparkle(i * 6 + 2, i), b = sparkle(i * 6 + 30, i);
    assert.ok(a && b && b.dy < a.dy, 'higher (more negative) later on');
    assert.ok(a && Math.abs(a.dx) <= 9);
  }
  assert.equal(sparkle(LEVELFX_FRAMES, SPARKLES - 1), null, 'all done by the time the effect ends');
});

test('the talent callout holds still between its two frames', () => {
  assert.equal(talentShowing(TALENT_FROM - 1), false);
  assert.equal(talentShowing(TALENT_FROM), true);
  assert.equal(talentShowing(TALENT_TO - 1), true);
  assert.equal(talentShowing(TALENT_TO), false);
  assert.ok(TALENT_TO <= LEVELFX_FRAMES);
  assert.ok(TALENT_TO - TALENT_FROM >= 60, 'long enough to read');
});

test('the HUD pulse blinks, holds steady with Reduce flashing, and is off with no effect', () => {
  assert.equal(hudPulse(null, false), false);
  assert.equal(hudPulse(null, true), false);
  const seen = new Set<boolean>();
  for (let t = 0; t < 32; t++) seen.add(hudPulse(t, false));
  assert.equal(seen.size, 2, 'both lit and dark');
  for (let t = 0; t < 32; t++) assert.equal(hudPulse(t, true), true);
});
