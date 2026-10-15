import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { PARTY_SIZE, pickParty, poolFor, requiredFor } from '../src/core/campaign.ts';
import {
  COLS, blockedBy, createPicks, heroAt, legend, makeLead, moveTo, onStart, ready, result, rowOf, rowsOf, step, toggle,
} from '../src/ui/picks_logic.ts';
import type { PicksState } from '../src/ui/picks_logic.ts';
import { cardRect, cellRect, markRect, picksLayout } from '../src/ui/picks_logic.ts';
import { hitIndex } from '../src/core/pointer.ts';
import type { Rect } from '../src/core/pointer.ts';
import { BAND_Y, TOP_H } from '../src/gfx/map_geo.ts';
import { tinyWidth } from '../src/gfx/font.ts';

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
  assert.deepEqual(legend('gamepad', 'A', 'Y'), ['STICK MOVE', 'A PICK', 'Y LEAD', 'B BACK'], 'Special rebound to Y on the controller');
  assert.deepEqual(legend('touch', 'A', 'B'), ['TAP PICK', 'B LEAD', 'PAUSE BACK']);
});

// ---------------------------------------------------------------- chapter 3: nine heroes, three rows
/** Stage 3.2: all nine in the pool, Robin locked. The last party was Mike, Dustin, Robin and Nancy. */
const NINE = ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'] as const;
const pool9 = poolFor('3.2', NINE.map((id, i) => ({ id, level: 4 + (i % 3) })));
const open9 = (seed: HeroId[] = ['mike', 'dustin', 'robin', 'nancy']): PicksState => createPicks(pool9, requiredFor('3.2'), seed);
const at9 = (s: PicksState, id: HeroId): number => s.pool.findIndex((p) => p.id === id);

test('nine heroes: the pool is the whole chapter, in order, with Robin locked in', () => {
  const s = open9();
  assert.deepEqual(s.pool.map((p) => p.id), [...NINE]);
  assert.deepEqual(s.picked, ['mike', 'dustin', 'robin', 'nancy']);
  assert.deepEqual(s.locked, ['robin']);
  assert.equal(rowsOf(s).length, 9);
});

test('Eleven opens PUSH, Robin READ and Nancy SHOOT, beside the gate words the others had', () => {
  const s = open9();
  assert.equal(rowOf(s, at9(s, 'eleven')).gate, 'PUSH');
  assert.equal(rowOf(s, at9(s, 'robin')).gate, 'READ');
  assert.equal(rowOf(s, at9(s, 'nancy')).gate, 'SHOOT');
  assert.equal(rowOf(s, at9(s, 'lucas')).gate, 'SHOOT');
  assert.equal(rowOf(s, at9(s, 'mike')).gate, '');
  assert.deepEqual(rowOf(s, at9(s, 'robin')), { id: 'robin', name: 'Robin', level: rowOf(s, at9(s, 'robin')).level, gate: 'READ', slot: 3, locked: true });
});

test('nine heroes: up and down walk three rows and the START row and wrap round, in the column the cursor left', () => {
  let s = moveTo(open9(), 2);
  s = step(s, 'down');
  assert.equal(s.cursor, 5);
  s = step(s, 'down');
  assert.equal(s.cursor, 8);
  s = step(s, 'down');
  assert.ok(onStart(s));
  assert.equal(step(s, 'up').cursor, 8, 'up from START returns to the last row, the column it left');
  assert.equal(step(s, 'down').cursor, 2, 'down from START wraps to the first row, same column');
  assert.equal(step(moveTo(open9(), 1), 'up').cursor, 9, 'up from the first row lands on START');
  assert.equal(step(moveTo(open9(), 4), 'up').cursor, 1, 'from the middle row, up is the first row');
  assert.ok(onStart(step(step(moveTo(open9(), 4), 'up'), 'up')), 'and one more is START');
});

test('nine heroes: left and right wrap inside each of the three rows', () => {
  let s = moveTo(open9(), 6);
  s = step(s, 'left');
  assert.equal(s.cursor, 8);
  s = step(s, 'right');
  assert.equal(s.cursor, 6);
  s = step(moveTo(s, 5), 'right');
  assert.equal(s.cursor, 3);
  assert.equal(step(moveTo(s, 4), 'left').cursor, 3);
});

test('nine heroes: Robin can not come out, a fifth can not go in, and START is live only at four', () => {
  let s = open9();
  const onRobin = moveTo(s, at9(s, 'robin'));
  assert.equal(toggle(onRobin), onRobin);
  assert.ok(ready(s));
  assert.deepEqual(result(s), ['mike', 'dustin', 'robin', 'nancy']);
  const onEleven = moveTo(s, at9(s, 'eleven'));
  assert.equal(toggle(onEleven), onEleven, 'a fifth is refused');
  s = toggle(moveTo(s, at9(s, 'dustin')));
  assert.ok(!ready(s));
  assert.equal(result(s), null);
  s = toggle(moveTo(s, at9(s, 'eleven')));
  assert.ok(ready(s));
  assert.deepEqual(result(makeLead(moveTo(s, at9(s, 'eleven')))), ['eleven', 'mike', 'robin', 'nancy']);
  // Two out and the order of the rest holds.
  s = toggle(moveTo(toggle(moveTo(s, at9(s, 'mike'))), at9(s, 'nancy')));
  assert.deepEqual(s.picked, ['robin', 'eleven']);
});

test('nine heroes: a seed from the last chapter is fixed up to hold Robin', () => {
  assert.deepEqual(open9(['mike', 'dustin', 'lucas', 'will']).picked, ['mike', 'dustin', 'lucas', 'robin']);
  assert.deepEqual(open9(pickParty('3.2', ['eleven', 'mike', 'max', 'steve'])).picked, ['eleven', 'mike', 'max', 'robin']);
});

// ---------------------------------------------------------------- the panel fits the frame
const rectIn = (r: Rect, outer: Rect): boolean => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const touches = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('six stay three cards by two, as the owner picked them', () => {
  const l = picksLayout(6);
  assert.equal(l.rows, 2);
  assert.equal(l.compact, false);
  assert.deepEqual(l.panel, { x: 4, y: 35, w: 248, h: 136 });
  assert.deepEqual(cardRect(l, 0), { x: 11, y: 52, w: 74, h: 44 });
  assert.deepEqual(cardRect(l, 4), { x: 91, y: 102, w: 74, h: 44 });
  assert.deepEqual(l.start, { x: 11, y: 154, w: 56, h: 11 });
  assert.equal(l.legendY, 157);
});

test('nine are three cards by three, on shorter cards, and the panel fits between the map\'s strip and its party band', () => {
  for (const n of [4, 5, 6, 7, 8, 9]) {
    const l = picksLayout(n);
    assert.equal(l.rows, n > 6 ? 3 : 2, `${n} heroes`);
    assert.equal(l.compact, n > 6);
    assert.ok(l.panel.y >= TOP_H && l.panel.y + l.panel.h <= BAND_Y, `${n}: the panel runs ${l.panel.y} to ${l.panel.y + l.panel.h}, past the strip or the band`);
    assert.ok(rectIn(l.panel, { x: 0, y: 0, w: 256, h: 224 }));
    assert.ok(rectIn(l.start, l.panel), 'START is inside the panel');
    assert.ok(l.legendY + 5 <= l.panel.y + l.panel.h - 4 && l.legendY >= l.start.y, 'and so is the legend, level with START');
    for (let i = 0; i < n; i++) {
      const c = cardRect(l, i);
      assert.ok(rectIn(c, l.panel), `card ${i} is inside the panel`);
      assert.ok(c.y + c.h + 3 <= l.start.y, `card ${i} (with its cursor corners) clears START`);
      assert.ok(c.y - 3 >= l.panel.y + 12, `card ${i} (with its cursor corners) clears the PARTY heading`);
      for (let j = i + 1; j < n; j++) assert.ok(!touches(c, cardRect(l, j)), `cards ${i} and ${j} do not overlap`);
      // The face, the gate word and the mark all sit inside the card.
      assert.ok(l.top + 24 <= l.ch && l.gateY + 5 <= l.ch && l.markY + 6 <= l.ch - 1, 'the contents fit the card');
      assert.ok(rectIn(markRect(l, i), { x: c.x, y: c.y, w: c.w, h: c.h }), 'the mark cell is inside the card');
    }
  }
});

test('a click lands on the card it is over, the cells meet, and START is below them all', () => {
  for (const n of [6, 9]) {
    const l = picksLayout(n);
    const cells = Array.from({ length: n }, (_, i) => cellRect(l, i));
    for (let i = 0; i < n; i++) {
      const c = cardRect(l, i);
      assert.equal(hitIndex(cells, { x: c.x + c.w / 2, y: c.y + c.h / 2 }), i);
      assert.equal(hitIndex(cells, { x: c.x, y: c.y }), i, 'a card\'s corner');
      assert.equal(hitIndex(cells, { x: c.x + c.w - 1, y: c.y + c.h - 1 }), i);
    }
    // Right between two cards, in the gap, the mouse is still over one of them.
    const a = cardRect(l, 0), b = cardRect(l, 1);
    assert.notEqual(hitIndex(cells, { x: (a.x + a.w + b.x) / 2, y: a.y + 10 }), -1);
    assert.equal(hitIndex(cells, { x: l.start.x + 2, y: l.start.y + 2 }), -1, 'START is not a card');
  }
});

test('the legend and START share a line without meeting, for every device', () => {
  const l = picksLayout(9);
  for (const dev of ['keyboard', 'gamepad', 'touch'] as const) {
    const text = legend(dev, 'Z', 'X').join('  ');
    const left = l.panel.x + l.panel.w - 8 - tinyWidth(text);
    assert.ok(left >= l.start.x + l.start.w + 8, `${dev}: the legend starts at ${left}`);
  }
});

// A pick the rules refuse used to change nothing on screen. The panel flashes the cards in the way, and blockedBy names them.
test('a fifth hero is blocked by the whole party, and a locked hero by their own card', () => {
  const s = open(['mike', 'dustin', 'lucas', 'max']);
  const party = ['mike', 'dustin', 'lucas', 'max'].map((id) => at(s, id as HeroId));
  assert.deepEqual(blockedBy(s, at(s, 'will')), party, 'will has no slot: the four picked cards');
  assert.deepEqual(blockedBy(s, at(s, 'steve')), party);
  assert.deepEqual(blockedBy(s, at(s, 'max')), [at(s, 'max')], 'max is locked in: his own card');
  assert.deepEqual(blockedBy(cursorOn(s, 'will')), party, 'the cursor card is the default');
});

test('nothing blocks a pick the rules allow, or the START row', () => {
  const s = open(['mike', 'dustin', 'max']);
  assert.deepEqual(blockedBy(s, at(s, 'will')), [], 'a free slot');
  assert.deepEqual(blockedBy(s, at(s, 'dustin')), [], 'an unlocked hero can come out');
  assert.deepEqual(blockedBy(s, s.pool.length), [], 'START is not a hero');
  assert.deepEqual(blockedBy(open(), 99), [], 'off the list');
});

test('blockedBy names cards exactly when toggle refuses, over every state of the picks', () => {
  const seeds: HeroId[][] = [[], ['max'], ['mike', 'max'], ['mike', 'dustin', 'max'], ['mike', 'dustin', 'lucas', 'max'], ['max', 'steve', 'will', 'lucas']];
  for (const seed of seeds) {
    const s = open(seed);
    for (let i = 0; i < s.pool.length; i++) {
      assert.equal(blockedBy(s, i).length > 0, toggle(s, i) === s, `seed ${seed.join()}, card ${i}`);
    }
  }
});
