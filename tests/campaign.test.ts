import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTY_SIZE, STAGE_ORDER, chapterOf, defaultParty, isFinalStage, levelNumber, mergeHeroes, needsPicks, nextStage, opensChapter, partyFor, pickParty, requiredFor, rosterFor, seedsFrom } from '../src/core/campaign.ts';
import { isOpen, nextUncleared, parseProgress, recordClear, withPicks } from '../src/core/progress.ts';
import { HERO_IDS } from '../src/heroes/index.ts';
import type { HeroSnapshot } from '../src/core/types.ts';

test('stages run 1.1 to 2.3, and only the last one is final', () => {
  assert.deepEqual([...STAGE_ORDER], ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3']);
  assert.equal(nextStage('1.1'), '1.2');
  assert.equal(nextStage('1.3'), '2.1');
  assert.equal(nextStage('2.1'), '2.2');
  assert.equal(nextStage('2.2'), '2.3');
  assert.equal(nextStage('2.3'), null);
  assert.equal(nextStage('9.9'), null, 'an unknown id leads nowhere');
  assert.equal(isFinalStage('1.2'), false);
  assert.equal(isFinalStage('2.1'), false);
  assert.equal(isFinalStage('2.3'), true);
  assert.deepEqual(STAGE_ORDER.map(levelNumber), [1, 2, 3, 4, 5, 6]);
  assert.equal(levelNumber('9.9'), 1);
  assert.deepEqual(STAGE_ORDER.map(chapterOf), [1, 1, 1, 2, 2, 2]);
  assert.deepEqual(STAGE_ORDER.filter(opensChapter), ['1.1', '2.1']);
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

test('chapter 2 swaps Eleven out and brings Will in at the average level minus one', () => {
  const known = [
    { id: 'mike' as const, level: 6, xp: 10 }, { id: 'dustin' as const, level: 5, xp: 0 },
    { id: 'lucas' as const, level: 5, xp: 3 }, { id: 'eleven' as const, level: 5, xp: 40 },
  ];
  const two = partyFor('2.1', known);
  assert.deepEqual(two.map((s) => s.id), ['mike', 'dustin', 'lucas', 'will']);
  assert.equal(two[3]?.level, 4, 'floor of 5.33, minus one');
  assert.deepEqual(partyFor('1.3', known).map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
  assert.deepEqual(partyFor('2.1', []).map((s) => s.id), ['mike', 'dustin', 'lucas', 'will'], 'nothing known: the arrival party');
});

test('a replay never makes a hero worse', () => {
  const known = [{ id: 'mike' as const, level: 5, xp: 20 }, { id: 'eleven' as const, level: 4, xp: 0 }];
  const merged = mergeHeroes(known, [{ id: 'mike', level: 5, xp: 60 }, { id: 'eleven', level: 2, xp: 0 }, { id: 'will', level: 3, xp: 0 }]);
  assert.deepEqual(merged.map((s) => [s.id, s.level, s.xp]), [['mike', 5, 60], ['eleven', 4, 0], ['will', 3, 0]]);
});

test('progress marks cleared stages in order and opens the next one', () => {
  const snap = (id: 'mike' | 'dustin', level: number): HeroSnapshot => ({ id, level, xp: 0, hp: 1, hpMax: 10 });
  assert.equal(nextUncleared(null), '1.1');
  let p = recordClear(null, '1.2', [snap('mike', 4)]);
  p = recordClear(p, '1.1', [snap('mike', 3), snap('dustin', 3)]);
  assert.deepEqual(p.cleared, ['1.1', '1.2']);
  assert.deepEqual(p.heroes.map((s) => [s.id, s.level]), [['mike', 4], ['dustin', 3]]);
  assert.equal(nextUncleared(p), '1.3');
  assert.ok(isOpen(p, '1.1') && isOpen(p, '1.3') && !isOpen(p, '2.1'));
  const back = parseProgress(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(back?.cleared, p.cleared, 'round trips');
  assert.deepEqual(back?.heroes.map((s) => [s.id, s.level, s.xp]), p.heroes.map((s) => [s.id, s.level, s.xp]));
  assert.equal(parseProgress({ v: 1, cleared: ['1.1'], heroes: [{ id: 'nobody', level: 1, xp: 0 }] }), null);
  assert.equal(parseProgress('junk'), null);
});

test('2.2 and 2.3 need picks from six heroes; chapter 1 and 2.1 keep a fixed party', () => {
  for (const id of ['1.1', '1.2', '1.3', '2.1']) assert.equal(needsPicks(id), false, id);
  for (const id of ['2.2', '2.3']) {
    assert.equal(needsPicks(id), true, id);
    assert.deepEqual(rosterFor(id), ['mike', 'dustin', 'lucas', 'will', 'max', 'steve']);
    assert.ok(!rosterFor(id).includes('eleven'), 'Eleven is gone until the end of 2.3');
  }
  assert.deepEqual(requiredFor('2.2'), ['max']);
  assert.deepEqual(requiredFor('2.3'), ['steve']);
  assert.deepEqual(requiredFor('2.1'), []);
});

test('picks keep their order, drop strangers and repeats, force the required hero in and fill to four', () => {
  assert.deepEqual(pickParty('2.2', ['will', 'max', 'lucas', 'mike']), ['will', 'max', 'lucas', 'mike']);
  // Max is required in 2.2: she takes the place of the last pick that isn't required.
  assert.deepEqual(pickParty('2.2', ['will', 'lucas', 'mike', 'steve']), ['will', 'lucas', 'mike', 'max']);
  // Steve is required in 2.3, so carrying the 2.2 party over swaps him in.
  assert.deepEqual(pickParty('2.3', ['will', 'max', 'lucas', 'mike']), ['will', 'max', 'lucas', 'steve']);
  assert.deepEqual(pickParty('2.2', ['eleven', 'will', 'will']), ['will', 'max', 'mike', 'dustin']);
  assert.deepEqual(pickParty('2.2'), defaultParty('2.2').map((s) => s.id));
  for (const id of ['2.2', '2.3']) assert.equal(pickParty(id, []).length, PARTY_SIZE);
  assert.deepEqual(pickParty('1.2', ['will']), ['mike', 'dustin', 'lucas', 'eleven'], 'a fixed party ignores picks');
});

test('a new hero joins at the pool average minus one, whoever else is picked', () => {
  const known = [
    { id: 'mike' as const, level: 7, xp: 0 }, { id: 'dustin' as const, level: 6, xp: 0 },
    { id: 'lucas' as const, level: 5, xp: 0 }, { id: 'will' as const, level: 4, xp: 0 }, { id: 'eleven' as const, level: 9, xp: 0 },
  ];
  const a = partyFor('2.2', known, ['will', 'max', 'steve', 'lucas']);
  const b = partyFor('2.2', known, ['mike', 'max', 'steve', 'dustin']);
  assert.deepEqual(a.map((s) => s.id), ['will', 'max', 'steve', 'lucas']);
  // The met heroes in the pool average 5.5 (Eleven isn't in it), so Max and Steve join at 4 either way.
  for (const p of [a, b]) for (const s of p.filter((q) => q.id === 'max' || q.id === 'steve')) assert.equal(s.level, 4);
});

test('progress remembers the last picks, keeps them across a clear and drops a bad list', () => {
  const p = withPicks(recordClear(null, '2.1', []), ['will', 'max', 'lucas', 'mike']);
  assert.deepEqual(p.picks, ['will', 'max', 'lucas', 'mike']);
  assert.deepEqual(recordClear(p, '2.2', []).picks, ['will', 'max', 'lucas', 'mike']);
  assert.deepEqual(parseProgress(JSON.parse(JSON.stringify(p)))?.picks, ['will', 'max', 'lucas', 'mike']);
  const bad = { ...JSON.parse(JSON.stringify(p)), picks: ['will', 'nobody'] };
  const back = parseProgress(bad);
  assert.ok(back, 'a bad pick list does not spoil the record');
  assert.equal(back?.picks, undefined);
  assert.equal(parseProgress({ ...bad, picks: ['will', 'will'] })?.picks, undefined);
});
