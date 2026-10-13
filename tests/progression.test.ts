import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_LEVEL, STAT_KEYS, xpToNext, xpForLevel, xpShare, addXp, rollD20, bonusPoints, rollLevelUp, emptyStats,
  TALENTS, TALENT_TEXT_MAX, hasTalent, talentGainedAt,
} from '../src/progression/index.ts';
import type { Stats } from '../src/progression/index.ts';
import { createRng } from '../src/core/rng.ts';
import { hasEmDash } from '../src/core/text.ts';
import { HERO_IDS } from '../src/heroes/index.ts';

/** An rng that plays back fixed values, then repeats the last one. */
function seq(...v: number[]): () => number {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)] as number;
}
const only = (k: keyof Stats): Stats => ({ ...emptyStats(), [k]: 1 });
const sum = (s: Stats): number => STAT_KEYS.reduce((a, k) => a + s[k], 0);

test('xp curve is round(18 x L^1.7) and the cap is 12', () => {
  assert.equal(MAX_LEVEL, 12);
  for (let l = 1; l <= 12; l++) assert.equal(xpToNext(l), Math.round(18 * Math.pow(l, 1.7)));
  assert.equal(xpToNext(1), 18);
  assert.equal(xpToNext(2), 58);
  assert.equal(xpToNext(3), 117);
  // Lv 3 at 76 XP and Lv 4 at 193, as the Level 1 spec says.
  assert.equal(xpForLevel(3), 76);
  assert.equal(xpForLevel(4), 193);
  // About 4,900 XP from 1 to 12.
  assert.ok(xpForLevel(12) > 4700 && xpForLevel(12) < 5100, `total ${xpForLevel(12)}`);
  for (let l = 2; l <= 12; l++) assert.ok(xpToNext(l) > xpToNext(l - 1));
});

test('addXp carries the remainder, handles multi-level jumps and stops at the cap', () => {
  assert.deepEqual(addXp(1, 0, 17), { level: 1, xp: 17, gained: [] });
  assert.deepEqual(addXp(1, 17, 1), { level: 2, xp: 0, gained: [2] });
  assert.deepEqual(addXp(1, 0, 80), { level: 3, xp: 4, gained: [2, 3] });
  const top = addXp(11, 0, 100000);
  assert.equal(top.level, 12);
  assert.deepEqual(top.gained, [12]);
  const capped = addXp(12, 0, 500);
  assert.equal(capped.level, 12);
  assert.deepEqual(capped.gained, []);
  assert.equal(addXp(2, 5, -10).xp, 5);
});

test('the active hero earns full XP and the bench earns half', () => {
  assert.equal(xpShare(8, true), 8);
  assert.equal(xpShare(8, false), 4);
  assert.equal(xpShare(4, false), 2);
  assert.equal(xpShare(5, false), 2);
});

test('d20 rolls map onto 1..20 and bonus points are floor(roll / 5), five on a 20', () => {
  assert.equal(rollD20(() => 0), 1);
  assert.equal(rollD20(() => 0.9999), 20);
  assert.equal(rollD20(() => 0.5), 11);
  const expect: [number, number][] = [[1, 0], [4, 0], [5, 1], [9, 1], [10, 2], [14, 2], [15, 3], [19, 3], [20, 5]];
  for (const [roll, pts] of expect) assert.equal(bonusPoints(roll), pts, `roll ${roll}`);
});

test('a roll of 1 gives no points and sets advantage for the next roll', () => {
  const r = rollLevelUp(seq(0), only('atk'), false);
  assert.equal(r.roll, 1);
  assert.equal(r.points, 0);
  assert.equal(sum(r.spread), 0);
  assert.equal(r.nextAdvantage, true);
  assert.equal(r.natTwenty, false);
  assert.equal(r.advantage, false);
});

test('advantage keeps the higher of two dice and is consumed', () => {
  // First die 1 (0.0), second die 15 (0.7): the 15 stands.
  const r = rollLevelUp(seq(0, 0.7, 0, 0, 0), only('def'), true);
  assert.equal(r.advantage, true);
  assert.equal(r.roll, 15);
  assert.equal(r.points, 3);
  assert.equal(r.spread.def, 3);
  assert.equal(r.nextAdvantage, false);
  // With advantage, two 1s still read as a 1.
  const bad = rollLevelUp(seq(0, 0), only('def'), true);
  assert.equal(bad.roll, 1);
  assert.equal(bad.nextAdvantage, true);
  // Without advantage the second die is never rolled.
  const calls: number[] = [];
  rollLevelUp(() => { calls.push(1); return 0.0; }, only('hp'), false);
  assert.equal(calls.length, 1);
});

test('a natural 20 gives five points, flags the heal and Inspiration', () => {
  const r = rollLevelUp(seq(0.999), only('mp'), false);
  assert.equal(r.roll, 20);
  assert.equal(r.points, 5);
  assert.equal(r.spread.mp, 5);
  assert.equal(r.natTwenty, true);
  assert.equal(r.nextAdvantage, false);
});

test('bonus points follow the weights and are never negative', () => {
  const rng = createRng(77);
  const weights: Stats = { hp: 3, mp: 0, atk: 1, def: 0, spd: 0 };
  const total = emptyStats();
  let points = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const r = rollLevelUp(rng, weights, false);
    points += r.points;
    assert.equal(sum(r.spread), r.points);
    for (const k of STAT_KEYS) { assert.ok(r.spread[k] >= 0); total[k] += r.spread[k]; }
  }
  assert.equal(total.mp, 0);
  assert.equal(total.def, 0);
  assert.equal(total.spd, 0);
  const hpShare = total.hp / points;
  assert.ok(hpShare > 0.7 && hpShare < 0.8, `hp share ${hpShare}`);
  // d20 average points: (4 x 0 + 5 x 1 + 5 x 2 + 5 x 3 + 5) / 20 = 1.75.
  assert.ok(Math.abs(points / N - 1.75) < 0.12, `avg points ${points / N}`);
});

test('every hero has a Lv 3 talent with one short line and no em dash', () => {
  for (const id of HERO_IDS) {
    const t = TALENTS[id];
    assert.equal(t.level, 3);
    assert.ok(t.name.length > 0);
    assert.ok(t.text.length > 0 && t.text.length <= TALENT_TEXT_MAX, `${id}: ${t.text.length}`);
    assert.ok(!t.text.includes('\n'));
    assert.ok(!hasEmDash(t.text) && !hasEmDash(t.name));
    assert.equal(hasTalent(id, 2), false);
    assert.equal(hasTalent(id, 3), true);
    assert.equal(hasTalent(id, 12), true);
    assert.equal(talentGainedAt(id, 3), t);
    assert.equal(talentGainedAt(id, 2), null);
    assert.equal(talentGainedAt(id, 4), null);
  }
});
