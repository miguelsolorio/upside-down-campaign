// Erica's cart and the purse (docs/map-screen.md, "Erica's cart"): prices, the cap of three, a short purse, the old-save purse,
// and the stash spent and carried through a clear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRICES, SHOP_ITEMS, STASH_MAX, buy, canBuy, shopOpen, whyNot } from '../src/core/shop.ts';
import { OLD_PURSE_PER_STAGE, parseProgress, purseOf, recordClear, spendStash, stashOf, withPicks, withPurse } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import { STAGE_ORDER } from '../src/core/campaign.ts';

const through = (stage: string, purse?: number): Progress => {
  const cleared = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(stage) + 1);
  const p: Progress = { v: 1, cleared, heroes: [{ id: 'mike', level: 6, xp: 0 }] };
  if (purse !== undefined) p.purse = purse;
  return p;
};

test('the cart sells Eggos and Cokes at triple price, three of each at most', () => {
  assert.deepEqual([...SHOP_ITEMS], ['eggo', 'coke']);
  assert.deepEqual(PRICES, { eggo: 15, coke: 9 });
  assert.equal(STASH_MAX, 3);
});

test('the cart opens once 2.3 is cleared', () => {
  assert.equal(shopOpen(null), false);
  assert.equal(shopOpen(through('2.2', 99)), false);
  assert.equal(shopOpen(through('2.3', 0)), true);
});

test('a buy takes the price and adds one; a short purse or a full stash refuses and returns the same record', () => {
  let p = through('2.3', 40);
  p = buy(p, 'eggo');
  assert.equal(purseOf(p), 25);
  assert.deepEqual(stashOf(p), { eggo: 1, coke: 0 });
  p = buy(p, 'coke');
  assert.equal(purseOf(p), 16);
  const short = buy(p, 'eggo');
  assert.equal(purseOf(short), 1);
  assert.equal(whyNot(short, 'eggo'), 'short');
  assert.equal(buy(short, 'eggo'), short, 'nothing to pay with');
  const full = withPurse(p, 500, { eggo: 3, coke: 0 });
  assert.equal(whyNot(full, 'eggo'), 'full');
  assert.equal(canBuy(full, 'coke'), true);
  assert.equal(buy(full, 'eggo'), full);
});

test('a save from before the purse starts with ten quarters a cleared stage; a fresh game with none', () => {
  assert.equal(purseOf(null), 0);
  assert.equal(purseOf(through('2.3')), OLD_PURSE_PER_STAGE * 6);
  assert.equal(purseOf(through('2.3', 7)), 7);
  const parsed = parseProgress({ v: 1, cleared: ['1.1', '1.2'], heroes: [] });
  assert.equal(purseOf(parsed), 20);
});

test('a clear adds the run\'s quarters to the purse and keeps the stash and the picks', () => {
  const start = withPicks(withPurse(through('2.3', 12), 12, { eggo: 2, coke: 1 }), ['mike', 'robin', 'nancy', 'eleven']);
  const after = recordClear(start, '3.1', [{ id: 'robin', level: 4, xp: 10, hp: 40, hpMax: 40 }], 14);
  assert.equal(purseOf(after), 26);
  assert.deepEqual(stashOf(after), { eggo: 2, coke: 1 });
  assert.deepEqual(after.picks, ['mike', 'robin', 'nancy', 'eleven']);
  assert.ok(after.cleared.includes('3.1'));
  assert.equal(purseOf(recordClear(null, '1.1', [], 9)), 9, 'a new game starts the purse at its first clear');
});

test('spending the stash takes one and never goes under zero', () => {
  let p = withPurse(through('2.3', 0), 0, { eggo: 1, coke: 0 });
  p = spendStash(p, 'eggo');
  assert.deepEqual(stashOf(p), { eggo: 0, coke: 0 });
  p = spendStash(p, 'coke');
  assert.deepEqual(stashOf(p), { eggo: 0, coke: 0 });
});

test('a bad purse or stash in a save is cleaned up, never trusted', () => {
  const p = parseProgress({ v: 1, cleared: ['1.1'], heroes: [], purse: -4, stash: { eggo: 9, coke: 'x' } });
  assert.ok(p);
  assert.equal(p.purse, undefined);
  assert.deepEqual(stashOf(p), { eggo: 3, coke: 0 });
  const q = parseProgress(JSON.parse(JSON.stringify(withPurse(through('2.3', 31), 31, { eggo: 1, coke: 2 }))));
  assert.equal(purseOf(q), 31);
  assert.deepEqual(stashOf(q), { eggo: 1, coke: 2 });
});
