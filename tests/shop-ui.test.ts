// Erica's cart on the map (docs/map-screen.md, "Erica's cart"): the cursor over the rows, which rows are grey, a buy that returns
// the new Progress, buying down to an empty purse, her line and the legend (ui/shop_logic.ts), and the map opening the cart with
// Special and keeping the record current across closes (ui/map.ts). core/shop.ts has its own tests in shop.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from '../src/core/scene.ts';
import type { Scene } from '../src/core/scene.ts';
import { STAGE_ORDER } from '../src/core/campaign.ts';
import { PRICES, SHOP_ITEMS, STASH_MAX } from '../src/core/shop.ts';
import { purseOf, stashOf, withPurse } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import { tinyWidth } from '../src/gfx/font.ts';
import { hasEmDash } from '../src/core/text.ts';
import { LINES, LINE_MAX, boughtBetween, createShop, legend, lineFor, moveTo, purchase, purse, rowOf, rowsOf, step } from '../src/ui/shop_logic.ts';
import type { ShopState } from '../src/ui/shop_logic.ts';
import { createMapScene } from '../src/ui/map.ts';
import { hintLine } from '../src/ui/map_logic.ts';

/** Progress with every stage up to `stage` cleared, a purse of `quarters` and a stash of `stash`. */
const through = (stage: string, quarters: number, stash = { eggo: 0, coke: 0 }): Progress => {
  const cleared = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(stage) + 1);
  return withPurse({ v: 1, cleared, heroes: [{ id: 'mike', level: 6, xp: 0 }] }, quarters, stash);
};
const open = (quarters: number, stash = { eggo: 0, coke: 0 }): ShopState => createShop(through('2.3', quarters, stash));

test('the cart opens on its first row, with every row read from the record', () => {
  const s = open(40, { eggo: 1, coke: 0 });
  assert.equal(s.cursor, 0);
  assert.equal(s.note, null);
  assert.equal(purse(s), 40);
  assert.equal(rowsOf(s).length, SHOP_ITEMS.length);
  assert.deepEqual(rowOf(s, 0), { item: 'eggo', name: 'EGGO', price: 15, carried: 1, max: 3, live: true, why: null });
  assert.deepEqual(rowOf(s, 1), { item: 'coke', name: 'COKE', price: 9, carried: 0, max: 3, live: true, why: null });
  assert.deepEqual(rowsOf(s).map((r) => r.item), [...SHOP_ITEMS]);
  assert.equal(PRICES.eggo, rowOf(s, 0).price);
});

test('up and down move between the rows and wrap round; moving nowhere returns the same state', () => {
  let s = open(40);
  s = step(s, 'down');
  assert.equal(s.cursor, 1);
  s = step(s, 'down');
  assert.equal(s.cursor, 0, 'down from the last row wraps to the first');
  s = step(s, 'up');
  assert.equal(s.cursor, 1, 'and up from the first wraps to the last');
  assert.equal(moveTo(s, 1), s);
  assert.equal(moveTo(s, -1), s);
  assert.equal(moveTo(s, SHOP_ITEMS.length), s);
  assert.equal(moveTo(s, 0).cursor, 0);
});

test('a row the purse can not pay for is grey, and so is one that is full; the others stay live', () => {
  const short = open(12);
  assert.deepEqual(rowsOf(short).map((r) => [r.live, r.why]), [[false, 'short'], [true, null]], '12 quarters buys a Coke and not an Eggo');
  const broke = open(0);
  assert.deepEqual(rowsOf(broke).map((r) => r.why), ['short', 'short']);
  const full = open(100, { eggo: STASH_MAX, coke: 1 });
  assert.deepEqual(rowsOf(full).map((r) => [r.live, r.why]), [[false, 'full'], [true, null]], 'a full stash is grey with money to spare');
  const both = open(3, { eggo: 0, coke: STASH_MAX });
  assert.deepEqual(rowsOf(both).map((r) => r.why), ['short', 'full']);
});

test('a buy takes the price, adds one, keeps the cursor on that row and says so', () => {
  const s = open(40);
  const bought = purchase(s);
  assert.notEqual(bought.progress, s.progress, 'a new record');
  assert.equal(purse(bought), 25);
  assert.deepEqual(stashOf(bought.progress), { eggo: 1, coke: 0 });
  assert.equal(bought.note, 'bought');
  assert.equal(bought.cursor, 0);
  assert.ok(boughtBetween(s, bought));
  assert.equal(purse(s), 40, 'the record it started from is not touched');
  // A buy by row number moves the cursor to that row, as a click does.
  const coke = purchase(bought, 1);
  assert.equal(coke.cursor, 1);
  assert.equal(purse(coke), 16);
  assert.deepEqual(stashOf(coke.progress), { eggo: 1, coke: 1 });
  assert.equal(rowOf(coke, 0).carried, 1);
  assert.equal(rowOf(coke, 1).carried, 1);
});

test('a refused buy leaves the very same record and says why', () => {
  const short = purchase(open(5));
  assert.equal(purse(short), 5);
  assert.equal(short.note, 'short');
  const base = open(5);
  assert.equal(purchase(base).progress, base.progress, 'nothing was bought, so the record is the same object');
  assert.ok(!boughtBetween(base, purchase(base)));
  const full = open(100, { eggo: STASH_MAX, coke: 0 });
  const refused = purchase(full);
  assert.equal(refused.progress, full.progress);
  assert.equal(refused.note, 'full');
  assert.equal(purchase(full, -1), full, 'a row that is not there');
  assert.equal(purchase(full, 9), full);
});

test('buying down to an empty purse: the last quarter goes, then every row is grey and nothing more sells', () => {
  let s = open(24);
  s = purchase(s, 0);
  assert.equal(purse(s), 9);
  assert.deepEqual(rowsOf(s).map((r) => r.live), [false, true], 'the Eggo went out of reach first');
  s = purchase(s, 1);
  assert.equal(purse(s), 0, 'exactly empty');
  assert.deepEqual(stashOf(s.progress), { eggo: 1, coke: 1 });
  assert.deepEqual(rowsOf(s).map((r) => [r.live, r.why]), [[false, 'short'], [false, 'short']]);
  const after = purchase(s, 1);
  assert.equal(after.progress, s.progress);
  assert.equal(after.note, 'short');
  assert.equal(purse(after), 0, 'the purse never goes under zero');
});

test('buying up to three of an item fills the row, whatever the purse', () => {
  let s = open(200);
  for (let n = 1; n <= STASH_MAX; n++) {
    s = purchase(s, 0);
    assert.equal(rowOf(s, 0).carried, n);
    assert.equal(s.note, 'bought');
  }
  assert.equal(purse(s), 200 - STASH_MAX * PRICES.eggo);
  assert.equal(rowOf(s, 0).why, 'full');
  assert.equal(purchase(s, 0).note, 'full');
  assert.equal(purseOf(purchase(s, 0).progress), purse(s));
  assert.equal(rowOf(s, 1).live, true, 'the Coke row is still live');
});

test('moving the cursor clears her last remark; staying put keeps it', () => {
  let s = purchase(open(40));
  assert.equal(lineFor(s), LINES.bought);
  assert.equal(moveTo(s, 0), s);
  s = step(s, 'down');
  assert.equal(s.note, null);
  assert.equal(lineFor(s), LINES.open);
});

test('she has one dry line for each moment, each short enough for the panel, in flat caps-friendly words with no em dash', () => {
  assert.equal(lineFor(open(40)), LINES.open);
  assert.equal(lineFor(purchase(open(1))), LINES.short);
  assert.equal(lineFor(purchase(open(100, { eggo: STASH_MAX, coke: 0 }))), LINES.full);
  const lines = Object.values(LINES);
  assert.equal(new Set(lines).size, lines.length, 'no two moments share a line');
  for (const l of lines) {
    assert.ok(l.length <= LINE_MAX, `"${l}" is ${l.length} chars, the panel holds ${LINE_MAX}`);
    assert.ok(!hasEmDash(l), 'no em dash');
    assert.match(l, /^[A-Z ,.']+$/, 'caps, and punctuation the 5 by 7 font has');
  }
});

test('the legend names the device: arrows and Esc, the stick and buttons, or the D-pad and the pause button', () => {
  assert.deepEqual(legend('keyboard', 'Z', 'P'), ['ARROWS MOVE', 'Z BUY', 'ESC CLOSE']);
  assert.deepEqual(legend('gamepad', 'A', 'START'), ['STICK MOVE', 'A BUY', 'B CLOSE']);
  assert.deepEqual(legend('touch', 'A', 'START'), ['DPAD MOVE', 'A BUY', 'START CLOSE']);
  for (const dev of ['keyboard', 'gamepad', 'touch'] as const) {
    const text = legend(dev, 'ENTER', 'START').join('  ');
    assert.match(text, /^[A-Z0-9 ]+$/, 'the 3 by 5 font has letters and digits only');
    assert.ok(tinyWidth(text) <= 248 - 16, `${dev}: the legend fits the panel's width`);
  }
});

// ---------------------------------------------------------------- the map opens it
/** A map over `p` whose input is whatever has been pressed for the next tick. The mouse is never over anything. */
function rig(p: Progress, device: 'keyboard' | 'touch' = 'keyboard') {
  const shut: Progress[] = [];
  let quit = 0, played = 0;
  let now = new Set<string>();
  const input = {
    pressed: (a: string) => now.has(a), held: () => false, released: () => false,
    hover: () => null, moved: () => false, clicked: () => null, point() {}, offer() {}, device: () => device,
  };
  const g = { input } as unknown as Game;
  const scene: Scene = createMapScene({
    progress: p,
    party: () => [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }, { id: 'eleven' }],
    name: (id) => id,
    onPlay: () => { played++; },
    onQuit: () => { quit++; },
    onShop: (left) => { shut.push(left); },
  });
  scene.enter?.(g);
  const tick = (...keys: string[]): void => { now = new Set(keys); scene.update(g); now = new Set(); };
  for (let i = 0; i < 40; i++) tick(); // past the grace
  return { tick, shut, quit: () => quit, played: () => played };
}
/** X on a keyboard is special and cancel together; a pad's X is special alone. */
const X = ['special', 'cancel'];

test('Special opens the cart once 2.3 is cleared, and the X key does not also quit the map', () => {
  const r = rig(through('2.3', 40));
  r.tick(...X);
  assert.equal(r.quit(), 0, 'X opened the cart and left the map where it is');
  r.tick('cancel', 'pause'); // Esc closes it
  assert.equal(r.shut.length, 1, 'closing calls onShop');
  assert.equal(r.quit(), 0);
  r.tick('cancel', 'pause'); // and on the map Esc quits as it always did
  assert.equal(r.quit(), 1);
});

test('before 2.3 is cleared there is no cart: X leaves the map as it always did', () => {
  const r = rig(through('2.2', 40));
  r.tick(...X);
  assert.equal(r.quit(), 1);
  assert.equal(r.shut.length, 0);
});

test('Attack buys one and the close hands back the new record; the next time it opens it starts from that', () => {
  const r = rig(through('2.3', 40));
  r.tick('special');
  r.tick('attack', 'confirm');
  r.tick('cancel');
  assert.equal(r.shut.length, 1);
  assert.equal(purseOf(r.shut[0] as Progress), 25);
  assert.deepEqual(stashOf(r.shut[0] as Progress), { eggo: 1, coke: 0 });
  assert.equal(r.played(), 0, 'Attack in the cart is a buy, not a stage');
  // The map kept what the cart left: a second visit buys on top of it.
  r.tick('special');
  r.tick('down');
  r.tick('attack', 'confirm');
  r.tick('attack', 'confirm');
  r.tick('cancel');
  assert.equal(r.shut.length, 2);
  assert.equal(purseOf(r.shut[1] as Progress), 7);
  assert.deepEqual(stashOf(r.shut[1] as Progress), { eggo: 1, coke: 2 });
});

test('a close with nothing bought still hands the record back, and a grey row buys nothing', () => {
  const r = rig(through('2.3', 3));
  r.tick('special');
  r.tick('attack', 'confirm'); // an Eggo at 15 with 3 quarters
  r.tick('cancel');
  assert.equal(purseOf(r.shut[0] as Progress), 3);
  assert.deepEqual(stashOf(r.shut[0] as Progress), { eggo: 0, coke: 0 });
});

test('Enter and Space buy too, and X inside the cart does not close it', () => {
  const r = rig(through('2.3', 40));
  r.tick('special');
  r.tick('confirm'); // Enter
  r.tick(...X);
  assert.equal(r.shut.length, 0, 'X is special, so it does not close the cart');
  r.tick('cancel');
  assert.equal(purseOf(r.shut[0] as Progress), 25);
});

test('on a touch screen B is special and back in one button: it opens the cart, and START leaves the map', () => {
  const r = rig(through('2.3', 40), 'touch');
  r.tick(...X); // B
  assert.equal(r.quit(), 0);
  r.tick('pause'); // START closes the cart
  assert.equal(r.shut.length, 1);
  r.tick('pause'); // and START on the map leaves it
  assert.equal(r.quit(), 1);
});

test('the map hint names SHOP when the cart is open and not before, in three lines that fit the band', () => {
  const plain = hintLine('keyboard', 'Z');
  assert.doesNotMatch(plain, /SHOP/);
  for (const [dev, back] of [['keyboard', 'ESC'], ['gamepad', 'B'], ['touch', 'START']] as const) {
    const line = hintLine(dev, 'Z', { key: 'X', pause: 'START' });
    assert.match(line, /\bX SHOP\b/);
    assert.match(line, /\bZ PLAY\b/);
    assert.match(line, new RegExp(`\\b${back} BACK\\b`));
    const legend3 = line.split(/\s{2,}/);
    assert.equal(legend3.length, 3);
    for (const l of legend3) assert.ok(tinyWidth(l) <= 56, `"${l}" fits the legend`);
    assert.match(line, /^[A-Z0-9 ]+$/, 'the 3 by 5 font has letters and digits only');
  }
  assert.doesNotMatch(hintLine('gamepad', 'A', { key: 'X', pause: 'START' }), /ARROWS|ESC|STICK/);
});
