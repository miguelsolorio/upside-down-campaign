import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, defaultParty, isFinalStage, levelNumber, nextStage, seedsFrom } from '../src/core/campaign.ts';
import { HERO_IDS } from '../src/heroes/index.ts';
import type { HeroSnapshot } from '../src/core/types.ts';

test('stages run 1.1 then 1.2, and only the last one is final', () => {
  assert.deepEqual([...STAGE_ORDER], ['1.1', '1.2']);
  assert.equal(nextStage('1.1'), '1.2');
  assert.equal(nextStage('1.2'), null);
  assert.equal(nextStage('9.9'), null, 'an unknown id leads nowhere');
  assert.equal(isFinalStage('1.1'), false);
  assert.equal(isFinalStage('1.2'), true);
  assert.deepEqual(STAGE_ORDER.map(levelNumber), [1, 2]);
  assert.equal(levelNumber('9.9'), 1);
});

test('the first stage opens with three kids, the second with all four at Lv 3', () => {
  assert.deepEqual(defaultParty('1.1').map((s) => s.id), ['mike', 'dustin', 'lucas']);
  const two = defaultParty('1.2');
  assert.deepEqual(two.map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
  assert.ok(two.every((s) => s.level === 3));
  for (const s of two) assert.ok((HERO_IDS as string[]).includes(s.id));
  assert.deepEqual(defaultParty('9.9').map((s) => s.id), ['mike', 'dustin', 'lucas'], 'an unknown id opens like the first stage');
});

test('a default party is a fresh copy, so one run cannot change the next', () => {
  const a = defaultParty('1.2');
  (a[0] as { level?: number }).level = 9;
  assert.equal(defaultParty('1.2')[0]?.level, 3);
});

test('levels, XP and the d20 bonus carry between stages, and health does not', () => {
  const after: HeroSnapshot[] = [
    { id: 'mike', level: 3, xp: 68, hp: 12, hpMax: 60, bonus: { atk: 1, hp: 2 } },
    { id: 'eleven', level: 2, xp: 54, hp: 0, hpMax: 40 },
  ];
  const seeds = seedsFrom(after);
  assert.deepEqual(seeds.map((s) => [s.id, s.level, s.xp]), [['mike', 3, 68], ['eleven', 2, 54]]);
  assert.deepEqual(seeds[0]?.bonus, { atk: 1, hp: 2 });
  assert.equal(seeds[1]?.bonus, undefined);
  for (const s of seeds) assert.ok(!('hp' in s), 'a seed carries no health');
  (seeds[0]?.bonus as { atk: number }).atk = 99;
  assert.equal(after[0]?.bonus?.atk, 1, 'the seed owns its bonus, the snapshot is untouched');
});
