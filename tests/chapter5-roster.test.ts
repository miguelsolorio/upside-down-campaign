// Chapter 5's roster after chapter 4 is finished (docs/chapter-5.md, "The pool" and "Hopper's return"): Eddie fell on 4.3's roof and is in no pool
// again, even though he is among the heroes met; Hopper returns to 5.1 with the level and XP he had after 4.1, caught up to the party he joins
// (CATCH_UP) as docs/level-10.md and docs/chapter-5.md say, and only 5.1 catches him up. partyFor and poolFor are what the map and the stage read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, mergeHeroes, partyFor, pickParty, poolFor, requiredFor, rosterFor, seedsFrom } from '../src/core/campaign.ts';
import type { HeroId, HeroSnapshot, PartySeed } from '../src/core/types.ts';

const NINE: HeroId[] = ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'];

/** Every hero met by the end of chapter 4: Hopper from 4.1 (Lv 5, 90 XP into it), Eddie from 4.2 and 4.3 (he fell, Lv 6), the rest as the run left them. */
const known = (): PartySeed[] => [
  { id: 'mike', level: 10, xp: 40 }, { id: 'dustin', level: 9, xp: 120 }, { id: 'robin', level: 7, xp: 30 }, { id: 'eleven', level: 5, xp: 188 },
  { id: 'lucas', level: 4 }, { id: 'will', level: 4 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 }, { id: 'nancy', level: 3 },
  { id: 'hopper', level: 5, xp: 90, bonus: { atk: 1 } }, { id: 'eddie', level: 6, xp: 10 },
];

test('Eddie is in no pool from 4.4 on: the chapter 4 stages that follow him in keep him out, and chapter 5 is the nine and Hopper', () => {
  assert.ok(rosterFor('4.3').includes('eddie'), 'he plays the 4.3 roof');
  for (const id of STAGE_ORDER.slice(STAGE_ORDER.indexOf('4.4'))) assert.equal(rosterFor(id).includes('eddie'), false, `${id} has no Eddie`);
  for (const id of ['5.1', '5.2', '5.3']) {
    assert.deepEqual([...rosterFor(id)].sort(), [...NINE, 'hopper'].sort(), `${id} is the nine and Hopper`);
    assert.equal(rosterFor(id).length, 10);
  }
});

test('partyFor and poolFor never bring Eddie into chapter 5, whoever picked him and however far along he got', () => {
  for (const id of ['5.1', '5.2', '5.3']) {
    const picks: HeroId[] = ['eddie', 'mike', 'dustin', 'robin'];
    assert.equal(pickParty(id, picks).includes('eddie'), false, `${id}: a remembered pick of Eddie is dropped`);
    const party = partyFor(id, known(), picks);
    assert.equal(party.length, 4);
    assert.equal(party.some((s) => s.id === 'eddie'), false, `${id}: not in the party`);
    const pool = poolFor(id, known(), picks);
    assert.equal(pool.length, 10, `${id}: ten cards on the picks panel`);
    assert.equal(pool.some((s) => s.id === 'eddie'), false, `${id}: not on the picks panel`);
    // The nine and Hopper are all there, at levels of their own.
    assert.deepEqual(pool.map((s) => s.id).sort(), [...NINE, 'hopper'].sort());
  }
  // His level does not drag the pool's join level either: nobody is unmet here, so everyone is at their own.
  const pool = poolFor('5.2', known().map((s) => (s.id === 'eddie' ? { ...s, level: 1 } : s)));
  assert.equal(pool.find((s) => s.id === 'lucas')?.level, 4);
});

test('Hopper returns to 5.1 with his 4.1 level and XP, raised to the party he joins less one if that is higher, locked in whoever was picked', () => {
  assert.deepEqual(requiredFor('5.1'), ['hopper']);
  for (const picks of [['mike', 'dustin', 'robin', 'nancy'], ['hopper', 'mike', 'dustin', 'robin'], []] as HeroId[][]) {
    const party = partyFor('5.1', known(), picks);
    const hopper = party.find((s) => s.id === 'hopper');
    assert.ok(hopper, `Hopper is in the party for picks [${picks.join(' ')}]`);
    const rest = party.filter((s) => s.id !== 'hopper'), mean = rest.reduce((n, s) => n + (s.level ?? 1), 0) / rest.length;
    // Behind the party, he walks in at its average less one, with no XP toward the next level, and his d20 bonus carries.
    assert.equal(hopper.level, Math.floor(mean) - 1, 'at the party\'s average less one');
    assert.ok((hopper.level ?? 0) > 5, 'raised from his 4.1 level of 5');
    assert.equal(hopper.xp, 0);
    assert.deepEqual(hopper.bonus, { atk: 1 });
  }
  // A Hopper who is already ahead of that keeps what he had after 4.1.
  const ahead = known().map((s) => (s.id === 'hopper' ? { ...s, level: 9, xp: 15 } : s));
  assert.deepEqual(partyFor('5.1', ahead, ['mike', 'dustin', 'robin', 'hopper']).find((s) => s.id === 'hopper'), { id: 'hopper', level: 9, xp: 15, bonus: { atk: 1 } });
  // The picks panel shows the level he will play at, not the one he left Kamchatka with.
  const picks: HeroId[] = ['mike', 'dustin', 'robin', 'hopper'];
  assert.equal(poolFor('5.1', known(), picks).find((s) => s.id === 'hopper')?.level, partyFor('5.1', known(), picks).find((s) => s.id === 'hopper')?.level);
  // Before 5.1 he is in nobody's pool: 4.2 to 4.4 do not carry him.
  for (const id of ['4.2', '4.3', '4.4']) assert.equal(rosterFor(id).includes('hopper'), false);
});

test('once 5.1 is cleared Hopper has caught up for good: 5.2 and 5.3 take him as he finished it, and only Will and Eleven catch up after him', () => {
  // The run through 5.1: the party that played it, as its results hand them on, merged into everyone met.
  const played = partyFor('5.1', known(), ['mike', 'dustin', 'robin', 'hopper']);
  const snaps = played.map((s) => ({ id: s.id, level: (s.level ?? 1) + 1, xp: 5 })) as unknown as HeroSnapshot[];
  const after = mergeHeroes(known(), seedsFrom(snaps));
  const hopper = after.find((s) => s.id === 'hopper') as PartySeed;
  assert.ok((hopper.level ?? 0) >= (played.find((s) => s.id === 'hopper')?.level ?? 99), 'he kept what 5.1 gave him');
  // On 5.2 he is nobody's locked hero (Will is): he plays as he is.
  const party52 = partyFor('5.2', after, ['mike', 'dustin', 'hopper', 'will']);
  assert.deepEqual(party52.find((s) => s.id === 'hopper'), { ...hopper, bonus: hopper.bonus ? { ...hopper.bonus } : undefined });
  // Eddie is still among the heroes met, and still in no party.
  assert.ok(after.some((s) => s.id === 'eddie'));
  for (const id of ['5.1', '5.2', '5.3']) assert.equal(partyFor(id, after, ['eddie', 'mike', 'dustin', 'robin']).some((s) => s.id === 'eddie'), false);
});
