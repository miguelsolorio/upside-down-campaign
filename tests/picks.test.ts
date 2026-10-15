import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { PARTY_SIZE, pickParty, poolFor, requiredFor } from '../src/core/campaign.ts';
import {
  COLS, createPicks, heroAt, legend, makeLead, moveTo, onStart, ready, result, rowOf, rowsOf, step, toggle,
} from '../src/ui/picks_logic.ts';
import type { PicksState } from '../src/ui/picks_logic.ts';

/** Stage 2.2: six in the pool, Max locked. The last party was Mike, Dustin, Lucas and Max, as pickParty fixes it up. */
const pool = poolFor('2.2', [
  { id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'lucas', level: 5 }, { id: 'will', level: 4 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 },
]);
const open = (seed: HeroId[] = ['mike', 'dustin', 'lucas', 'max']): PicksState => createPicks(pool, requiredFor('2.2'), seed);
const at = (s: PicksState, id: HeroId): number => s.pool.findIndex((p) => p.id === id);
const cursorOn = (s: PicksState, id: HeroId): PicksState => moveTo(s, at(s, id));

test('the panel opens on the pool in order and the party it was given, lead first, with the lock in', () => {
  const s = open();
  assert.deepEqual(s.pool.map((p) => p.id), ['mike', 'dustin', 'lucas', 'will', 'max', 'steve']);
  assert.deepEqual(s.picked, ['mike', 'dustin', 'lucas', 'max']);
  assert.deepEqual(s.locked, ['max']);
  assert.equal(s.cursor, 0);
});

test('a seed is fixed up: strangers and repeats go, a missing lock takes the last free place, the list is cut to four', () => {
  assert.deepEqual(open(['eleven', 'mike', 'mike', 'dustin']).picked, ['mike', 'dustin', 'max']);
  assert.deepEqual(open(['mike', 'dustin', 'lucas', 'will']).picked, ['mike', 'dustin', 'lucas', 'max']);
  assert.deepEqual(open(['mike', 'dustin', 'lucas', 'will', 'steve']).picked, ['mike', 'dustin', 'lucas', 'max']);
  assert.deepEqual(open([]).picked, ['max']);
  // The map seeds it from pickParty, which is the same four.
  assert.deepEqual(open(pickParty('2.2', ['mike', 'dustin', 'lucas', 'will'])).picked, ['mike', 'dustin', 'lucas', 'max']);
  // A seed that already holds Max keeps his place.
  assert.deepEqual(open(['max', 'mike', 'dustin', 'lucas']).picked, ['max', 'mike', 'dustin', 'lucas']);
});

test('a card reads from the state: name, level, gate word, party place and the lock', () => {
  const s = open();
  const max = rowOf(s, at(s, 'max'));
  assert.deepEqual(max, { id: 'max', name: 'Max', level: 4, gate: 'DASH', slot: 4, locked: true });
  const mike = rowOf(s, 0);
  assert.equal(mike.slot, 1);
  assert.equal(mike.gate, '');
  assert.equal(mike.locked, false);
  const will = rowOf(s, at(s, 'will'));
  assert.equal(will.slot, 0);
  assert.equal(will.gate, 'SENSE');
  assert.equal(rowsOf(s).length, 6);
  assert.deepEqual(rowsOf(s).filter((r) => r.slot > 0).map((r) => r.id), ['mike', 'dustin', 'lucas', 'max']);
});

test('toggling puts a hero in at the end and takes them out, closing the gap', () => {
  let s = open(['mike', 'dustin', 'lucas', 'max']);
  s = toggle(cursorOn(s, 'lucas'));
  assert.deepEqual(s.picked, ['mike', 'dustin', 'max']);
  s = toggle(cursorOn(s, 'will'));
  assert.deepEqual(s.picked, ['mike', 'dustin', 'max', 'will']);
  // Taking the lead out hands the lead to the next one.
  s = toggle(cursorOn(s, 'mike'));
  assert.deepEqual(s.picked, ['dustin', 'max', 'will']);
  assert.equal(rowOf(s, at(s, 'dustin')).slot, 1);
});

test('a locked hero can not come out, whatever their place', () => {
  const onMax = cursorOn(open(), 'max');
  assert.equal(toggle(onMax), onMax);
  const led = makeLead(onMax);
  assert.deepEqual(led.picked, ['max', 'mike', 'dustin', 'lucas']);
  assert.equal(toggle(led), led);
  assert.ok(led.picked.includes('max'));
});

test('a fifth can not go in until someone comes out', () => {
  let s = cursorOn(open(), 'will');
  assert.equal(s.picked.length, PARTY_SIZE);
  assert.equal(toggle(s), s);
  s = toggle(cursorOn(s, 'lucas'));
  s = toggle(cursorOn(s, 'will'));
  assert.deepEqual(s.picked, ['mike', 'dustin', 'max', 'will']);
});

test('the START row is not a hero: toggling and leading there change nothing', () => {
  const s = moveTo(open(), 6);
  assert.ok(onStart(s));
  assert.equal(heroAt(s), null);
  assert.equal(toggle(s), s);
  assert.equal(makeLead(s), s);
});

test('making a hero the lead moves them to the front and keeps the order of the rest', () => {
  const s = open(['mike', 'dustin', 'lucas', 'max']);
  const led = makeLead(cursorOn(s, 'lucas'));
  assert.deepEqual(led.picked, ['lucas', 'mike', 'dustin', 'max']);
  assert.equal(rowOf(led, at(led, 'lucas')).slot, 1);
  // The lead already, or on the bench: nothing happens.
  const onMike = cursorOn(s, 'mike'), onSteve = cursorOn(s, 'steve');
  assert.equal(makeLead(onMike), onMike);
  assert.equal(makeLead(onSteve), onSteve);
  // Leading by card number works without the cursor.
  assert.deepEqual(makeLead(s, at(s, 'dustin')).picked, ['dustin', 'mike', 'lucas', 'max']);
});

test('START is live only at four picked, and the result is the party lead first', () => {
  let s = open(['mike', 'dustin', 'lucas', 'max']);
  assert.ok(ready(s));
  assert.deepEqual(result(s), ['mike', 'dustin', 'lucas', 'max']);
  s = toggle(cursorOn(s, 'dustin'));
  assert.ok(!ready(s));
  assert.equal(result(s), null);
  s = toggle(cursorOn(s, 'steve'));
  assert.ok(ready(s));
  assert.deepEqual(result(makeLead(cursorOn(s, 'steve'))), ['steve', 'mike', 'lucas', 'max']);
  // The result is a copy: changing it never changes the panel.
  const r = result(s) as HeroId[];
  r.pop();
  assert.equal(s.picked.length, PARTY_SIZE);
});

test('left and right wrap inside their row, and do nothing on START', () => {
  let s = open();
  assert.equal(COLS, 3);
  s = step(s, 'left');
  assert.equal(s.cursor, 2);
  s = step(s, 'right');
  assert.equal(s.cursor, 0);
  s = moveTo(s, 3);
  s = step(s, 'left');
  assert.equal(s.cursor, 5);
  s = step(s, 'right');
  assert.equal(s.cursor, 3);
  const go = moveTo(s, 6);
  assert.equal(step(go, 'left'), go);
  assert.equal(step(go, 'right'), go);
});

test('up and down walk the two rows and the START row and wrap round, remembering the column', () => {
  let s = moveTo(open(), 1);
  s = step(s, 'down');
  assert.equal(s.cursor, 4);
  s = step(s, 'down');
  assert.ok(onStart(s));
  s = step(s, 'down');
  assert.equal(s.cursor, 1, 'down from START wraps to the first row, same column');
  s = step(moveTo(s, 5), 'down');
  assert.ok(onStart(s));
  assert.equal(step(s, 'up').cursor, 5, 'up from START returns to the last row, the column it left');
  assert.equal(step(moveTo(open(), 2), 'up').cursor, 6, 'up from the first row lands on START');
  // Stepping nowhere returns the same state.
  const only = createPicks([], [], []);
  assert.equal(step(only, 'down'), only);
});

test('a pool that fills the last row only partly keeps the cursor on a card', () => {
  const five = createPicks(pool.slice(0, 5), [], ['mike']);
  const s = moveTo(five, 2);
  const down = step(s, 'down');
  assert.equal(down.cursor, 4, 'the short row ends at the last card');
  assert.equal(step(down, 'right').cursor, 3, 'and wraps inside its two cards');
  assert.equal(step(step(down, 'down'), 'down').cursor, 1, 'START, then the first row again at the column it left');
});

test('moving to a place out of range, or the one the cursor is on, is refused', () => {
  const s = open();
  assert.equal(moveTo(s, -1), s);
  assert.equal(moveTo(s, 7), s);
  assert.equal(moveTo(s, 0), s);
  assert.equal(moveTo(s, 6).cursor, 6);
});

test('the legend names the device: arrows and Esc, the stick and buttons, or taps and the pause button', () => {
  assert.deepEqual(legend('keyboard', 'Z', 'X'), ['ARROWS MOVE', 'Z PICK', 'X LEAD', 'ESC BACK']);
  assert.deepEqual(legend('gamepad', 'A', 'X'), ['STICK MOVE', 'A PICK', 'X LEAD', 'B BACK']);
  assert.deepEqual(legend('touch', 'A', 'B'), ['TAP PICK', 'B LEAD', 'PAUSE BACK']);
});
