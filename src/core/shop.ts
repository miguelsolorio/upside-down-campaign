// Erica's cart on the map (docs/map-screen.md, "Erica's cart"): what she sells, what it costs and whether the party can
// buy it. Pure and DOM-free so Node tests can run it. ui/shop.ts runs the panel and flow saves what it returns.
import type { StashItem } from './types.ts';
import { STASH_MAX, purseOf, stashOf, withPurse } from './progress.ts';
import type { Progress } from './progress.ts';

export { STASH_MAX };

/** Triple price, as the design says: an Eggo is worth about five quarters and a Coke three. */
export const PRICES: Record<StashItem, number> = { eggo: 15, coke: 9 };

/** What she sells, in the order the cart lists it. */
export const SHOP_ITEMS: readonly StashItem[] = ['eggo', 'coke'];

/** The stage whose clear opens the cart: chapter 3 is reached once the Gate is shut. */
export const SHOP_OPENS_AFTER = '2.3';

/** True once the cart is open on the map. */
export function shopOpen(p: Progress | null): boolean {
  return (p?.cleared ?? []).includes(SHOP_OPENS_AFTER);
}

/** Why an item can't be bought right now, or null when it can. */
export function whyNot(p: Progress | null, item: StashItem): 'full' | 'short' | null {
  if (stashOf(p)[item] >= STASH_MAX) return 'full';
  if (purseOf(p) < PRICES[item]) return 'short';
  return null;
}

export const canBuy = (p: Progress | null, item: StashItem): boolean => whyNot(p, item) === null;

/** `p` with one `item` bought: the price out of the purse, one more in the stash. The same record when it can't be bought. */
export function buy(p: Progress, item: StashItem): Progress {
  if (!canBuy(p, item)) return p;
  const stash = stashOf(p);
  stash[item] += 1;
  return withPurse(p, purseOf(p) - PRICES[item], stash);
}
