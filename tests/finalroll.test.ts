// The Final Roll (docs/level-16.md, "The Final Roll"): the rules and the clock in ui/finalroll_logic.ts, which need no canvas.
// Advantage keeps the higher die, the total sets the size of the finish, any 20 is gold, and nothing can fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { createRng } from '../src/core/rng.ts';
import {
  BIG_AT, CLATTERS, FINISH_LEN, FINISH_MIN, FINISH_NAMES, GRACE, NAT, SETTLE, SLOT, TUMBLE,
  beatAt, endClock, faceAt, finishOf, isDone, rollFinal, rollPair, seedFor, skipClock, soundsBetween, spinAt, totalAt,
} from '../src/ui/finalroll_logic.ts';
import type { Finish } from '../src/ui/finalroll_logic.ts';
import { SAMPLE_PARTY, finaleSeed } from '../src/ui/finale_dev.ts';

const PARTY: HeroId[] = ['eleven', 'will', 'mike', 'dustin'];
/** A random source that returns these values in turn: 0 makes a 1 and 0.999 makes a 20. */
const script = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] as number; };

// ---------------------------------------------------------------- advantage
test('a roll is two d20s and the higher one stays', () => {
  assert.deepEqual(rollPair(script(0, 0.999)), [1, 20]);
  assert.deepEqual(rollPair(script(0.5, 0.2)), [11, 5]);
  const r = rollFinal(['mike'], script(0.2, 0.7));
  assert.deepEqual(r.rolls[0]?.dice, [5, 15]);
  assert.equal(r.rolls[0]?.keep, 15);
  const flipped = rollFinal(['mike'], script(0.7, 0.2));
  assert.equal(flipped.rolls[0]?.keep, 15, 'the order they tumbled in does not matter');
});

test('over many rolls the kept die is always the higher of the two, between 1 and 20, and the total is the kept dice added up', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const r = rollFinal(PARTY, createRng(seed));
    assert.equal(r.rolls.length, PARTY.length);
    for (const [i, h] of r.rolls.entries()) {
      assert.equal(h.hero, PARTY[i]);
      assert.equal(h.keep, Math.max(...h.dice));
      for (const d of h.dice) assert.ok(Number.isInteger(d) && d >= 1 && d <= NAT, `die ${d}`);
    }
    assert.equal(r.total, r.rolls.reduce((n, h) => n + h.keep, 0));
  }
});

test('advantage helps: the kept die averages well above the 10.5 of a single d20', () => {
  const rng = createRng(7);
  let sum = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) sum += rollFinal(['mike'], rng).total;
  assert.ok(sum / n > 13 && sum / n < 14.7, `average ${sum / n}`);
});

// ---------------------------------------------------------------- the finish
test('the finish is plain under 30, bigger at 30 or more, and gold for any 20', () => {
  assert.equal(BIG_AT, 30);
  assert.equal(finishOf(0, []), 'plain');
  assert.equal(finishOf(29, [15, 14]), 'plain');
  assert.equal(finishOf(30, [15, 15]), 'big');
  assert.equal(finishOf(76, [19, 19, 19, 19]), 'big', 'a big total with no 20 is still only big');
  assert.equal(finishOf(20, [20]), 'gold', 'a 20 is gold at any total');
  assert.equal(finishOf(80, [20, 20, 20, 20]), 'gold');
  assert.equal(finishOf(33, [1, 2, 20, 10]), 'gold', 'a 20 anywhere in the party');
});

test('over many rolls the finish follows the rule: gold if any hero kept a 20, else big from 30, else plain', () => {
  const seen = new Set<Finish>();
  for (let seed = 1; seed <= 3000; seed++) {
    for (const party of [PARTY, PARTY.slice(0, 2), PARTY.slice(0, 1)]) {
      const r = rollFinal(party, createRng(seed));
      const any20 = r.rolls.some((h) => h.keep === NAT);
      assert.equal(r.nat20, any20);
      assert.equal(r.finish, any20 ? 'gold' : r.total >= BIG_AT ? 'big' : 'plain', `seed ${seed}, total ${r.total}`);
      seen.add(r.finish);
    }
  }
  assert.deepEqual([...seen].sort(), ['big', 'gold', 'plain']);
});

test('a 20 on either die makes the hero\'s kept die a 20 and the finish gold', () => {
  for (const vals of [[0.999, 0], [0, 0.999], [0.999, 0.999]]) {
    const r = rollFinal(['will'], script(...vals));
    assert.equal(r.rolls[0]?.keep, NAT);
    assert.equal(r.finish, 'gold');
  }
});

test('the finishes are named, and each name fits the card', () => {
  assert.deepEqual(Object.keys(FINISH_NAMES).sort(), ['big', 'gold', 'plain']);
  for (const name of Object.values(FINISH_NAMES)) assert.ok(name.length * 6 * 2 <= 200, `${name} fits at the big scale`);
  assert.equal(new Set(Object.values(FINISH_NAMES)).size, 3);
});

// ---------------------------------------------------------------- it cannot fail
test('it cannot fail: the worst roll anyone can make is a win, the plain finish, and nobody standing is not an error', () => {
  const worst = rollFinal(PARTY, () => 0);
  assert.deepEqual(worst.rolls.map((h) => h.keep), [1, 1, 1, 1]);
  assert.equal(worst.total, 4);
  assert.equal(worst.finish, 'plain');
  assert.equal(worst.nat20, false);
  const empty = rollFinal([], createRng(1));
  assert.equal(empty.total, 0);
  assert.equal(empty.finish, 'plain');
  assert.deepEqual(empty.rolls, []);
  // Every outcome is one of three finishes, whoever stands.
  const finishes = new Set<Finish>(['plain', 'big', 'gold']);
  const all: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy'];
  for (let seed = 1; seed <= 300; seed++) {
    for (let n = 0; n <= all.length; n++) {
      const r = rollFinal(all.slice(0, n), createRng(seed));
      assert.ok(finishes.has(r.finish));
      assert.ok(r.total >= n, 'nobody rolls under a 1');
    }
  }
});

test('the same seed gives the same rolls, and another seed gives other ones', () => {
  const a = rollFinal(PARTY, createRng(1983)), b = rollFinal(PARTY, createRng(1983));
  assert.deepEqual(a, b);
  const others = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) others.add(JSON.stringify(rollFinal(PARTY, createRng(seed)).rolls));
  assert.ok(others.size > 15, 'different seeds roll different dice');
});

test('a seed for each finish can be found for the sample party, and the dev hook uses it', () => {
  assert.equal(SAMPLE_PARTY.length, 4);
  assert.ok(SAMPLE_PARTY.includes('eleven') && SAMPLE_PARTY.includes('will'), 'chapter five locks Eleven and Will in');
  for (const finish of ['plain', 'big', 'gold'] as const) {
    const seed = seedFor(SAMPLE_PARTY, finish, 1, createRng);
    assert.notEqual(seed, null, finish);
    assert.equal(rollFinal(SAMPLE_PARTY, createRng(seed as number)).finish, finish);
    assert.equal(finaleSeed(finish, 1), seed);
  }
  assert.equal(finaleSeed('any', 1983), 1983, 'the plain flag leaves the seed alone');
});

// ---------------------------------------------------------------- the clock
test('the clock goes hero by hero: a tumble, a rest, the next hero, and then the finish', () => {
  assert.equal(SLOT, TUMBLE + SETTLE);
  assert.deepEqual(beatAt(0, 4), { stage: 'tumble', hero: 0, t: 0 });
  assert.deepEqual(beatAt(TUMBLE - 1, 4), { stage: 'tumble', hero: 0, t: TUMBLE - 1 });
  assert.deepEqual(beatAt(TUMBLE, 4), { stage: 'settled', hero: 0, t: 0 });
  assert.deepEqual(beatAt(SLOT, 4), { stage: 'tumble', hero: 1, t: 0 });
  assert.deepEqual(beatAt(3 * SLOT + TUMBLE + 5, 4), { stage: 'settled', hero: 3, t: 5 });
  assert.deepEqual(beatAt(4 * SLOT, 4), { stage: 'finish', hero: 4, t: 0 });
  assert.deepEqual(beatAt(-9, 4), { stage: 'tumble', hero: 0, t: 0 }, 'before the start is the start');
  assert.equal(endClock(4), 4 * SLOT + FINISH_LEN);
  assert.equal(isDone(endClock(4) - 1, 4), false);
  assert.equal(isDone(endClock(4), 4), true);
  assert.equal(isDone(FINISH_LEN, 0), true, 'with nobody to roll, only the finish is left');
  assert.ok(4 * SLOT + FINISH_LEN < 60 * 9, 'a party of four is done in under nine seconds');
});

test('confirm lands the dice, then moves to the next hero, then ends the finish once it has shown', () => {
  assert.equal(skipClock(5, 4), TUMBLE, 'a tumbling pair lands');
  assert.equal(skipClock(TUMBLE + 3, 4), SLOT, 'a rested pair gives way to the next hero');
  assert.equal(skipClock(SLOT + 1, 4), SLOT + TUMBLE);
  assert.equal(skipClock(3 * SLOT + TUMBLE + 1, 4), 4 * SLOT, 'the last hero gives way to the finish');
  assert.equal(skipClock(4 * SLOT + FINISH_MIN - 1, 4), 4 * SLOT + FINISH_MIN - 1, 'the finish is shown first');
  assert.equal(skipClock(4 * SLOT + FINISH_MIN, 4), endClock(4));
  // Pressing it over and over reaches the end, one beat at a time, and never goes backwards.
  let c = 0, presses = 0;
  while (!isDone(c, 4) && presses < 50) {
    const to = skipClock(c, 4);
    assert.ok(to >= c);
    c = to === c ? c + 1 : to;
    presses++;
  }
  assert.ok(isDone(c, 4));
  assert.ok(GRACE > 0 && GRACE < TUMBLE, 'a short grace so the press that ended the fight does not skip the first roll');
});

test('the total counts a hero once the pair has landed, and the running total ends at the roll\'s total', () => {
  const r = rollFinal(PARTY, createRng(21));
  assert.equal(totalAt(r, 0), 0);
  assert.equal(totalAt(r, TUMBLE - 1), 0);
  assert.equal(totalAt(r, TUMBLE), r.rolls[0]?.keep);
  assert.equal(totalAt(r, SLOT + 5), r.rolls[0]?.keep);
  assert.equal(totalAt(r, 4 * SLOT), r.total);
  assert.equal(totalAt(r, endClock(4)), r.total);
  let was = 0;
  for (let c = 0; c <= endClock(4); c++) { const v = totalAt(r, c); assert.ok(v >= was); was = v; }
});

// ---------------------------------------------------------------- the sounds
test('each hero\'s tumble clatters and lands, and a gold finish plays natTwenty as it starts', () => {
  const plain = rollFinal(PARTY, () => 0.5);
  assert.equal(plain.finish, 'big');
  assert.deepEqual(soundsBetween(-1, 0, plain), ['roll']);
  assert.deepEqual(soundsBetween(0, 1, plain), []);
  assert.deepEqual(soundsBetween(CLATTERS[1] - 1, CLATTERS[1], plain), ['roll']);
  assert.deepEqual(soundsBetween(TUMBLE - 1, TUMBLE, plain), ['rollLand']);
  assert.deepEqual(soundsBetween(SLOT - 1, SLOT, plain), ['roll'], 'the next hero\'s dice');
  const all: string[] = [];
  for (let c = 0; c <= endClock(4); c++) all.push(...soundsBetween(c - 1, c, plain));
  assert.equal(all.filter((s) => s === 'rollLand').length, 4, 'one landing per hero');
  assert.equal(all.filter((s) => s === 'roll').length, 4 * CLATTERS.length);
  assert.ok(!all.includes('natTwenty'), 'no 20, no gold');

  const gold = rollFinal(PARTY, script(0.999, 0.1));
  assert.equal(gold.finish, 'gold');
  const goldSounds: string[] = [];
  for (let c = 0; c <= endClock(4); c++) goldSounds.push(...soundsBetween(c - 1, c, gold));
  assert.equal(goldSounds.filter((s) => s === 'natTwenty').length, 1);
  assert.equal(goldSounds.at(-1), 'natTwenty', 'and it is the last sound');
  assert.deepEqual(soundsBetween(4 * SLOT - 1, 4 * SLOT + 8, gold), ['natTwenty']);
});

test('a skip over several beats plays each sound once, and the dice are never silent when they land', () => {
  const r = rollFinal(PARTY, script(0.999, 0.1));
  assert.deepEqual(soundsBetween(30, TUMBLE, r), ['rollLand'], 'past the last clatter, only the landing');
  assert.deepEqual(soundsBetween(10, TUMBLE, r), ['roll', 'rollLand'], 'the clatters it skipped over play once');
  const jump = soundsBetween(0, endClock(4), r);
  assert.deepEqual([...jump].sort(), ['natTwenty', 'roll', 'rollLand']);
  assert.equal(new Set(jump).size, jump.length);
});

// ---------------------------------------------------------------- the dice
test('the dice end upright, flat and on the table, showing the number they rolled', () => {
  for (const k of [0, 1] as const) {
    const end = spinAt(TUMBLE, k);
    assert.ok(Math.abs(Math.sin(end.angle)) < 1e-9 && Math.cos(end.angle) > 0.999, 'upright');
    assert.equal(end.squash, 1);
    assert.equal(end.lift, 0);
    assert.deepEqual(spinAt(TUMBLE + 50, k), end, 'and they stay');
    for (let t = 0; t < TUMBLE; t++) {
      const s = spinAt(t, k);
      assert.ok(s.squash >= 0.3 && s.squash <= 1 && s.lift >= 0 && s.lift <= 14, `frame ${t}`);
    }
    assert.ok(spinAt(10, k).lift > 0, 'they bounce');
    assert.equal(faceAt(TUMBLE, k, 17), 17);
    assert.equal(faceAt(TUMBLE + 9, k, 4), 4);
    for (let t = 0; t < TUMBLE; t++) { const f = faceAt(t, k, 9); assert.ok(f >= 1 && f <= 20); }
  }
  const flicker = new Set<number>();
  for (let t = 0; t < TUMBLE; t++) flicker.add(faceAt(t, 0, 9));
  assert.ok(flicker.size > 10, 'the face flickers through numbers while it tumbles');
});
