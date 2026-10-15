// The rules of Erica's cart that Node can test (docs/map-screen.md, "Erica's cart"): the cursor over the rows, which rows are
// live (a row the purse can't pay for, or that is full, is grey), a buy that returns the new Progress, and her line. What she
// sells and what it costs are in core/shop.ts; no DOM here. ui/shop.ts runs the input and the drawing.
// Every change returns a new state, or the very same object when nothing changed, so a caller can tell by `next === s`.
import type { StashItem } from '../core/types.ts';
import { PRICES, SHOP_ITEMS, STASH_MAX, buy, whyNot } from '../core/shop.ts';
import { purseOf, stashOf } from '../core/progress.ts';
import type { Progress } from '../core/progress.ts';
import type { PromptDevice } from '../core/bindings.ts';

/** Why the last buy was refused, or that it went through. Erica says so, and the next move clears it. */
export type ShopNote = 'bought' | 'short' | 'full' | null;

export interface ShopState {
  /** The record the cart is working on: the purse and stash change here, and the map saves it on close. */
  progress: Progress;
  /** 0 to SHOP_ITEMS.length - 1: a row. */
  cursor: number;
  note: ShopNote;
}

/** What one row draws. */
export interface ShopRow {
  item: StashItem;
  name: string;
  price: number;
  /** How many the party carries out of `max`. */
  carried: number;
  max: number;
  /** False when the row is grey: the purse is short or the stash is full. */
  live: boolean;
  why: 'full' | 'short' | null;
}

const NAMES: Record<StashItem, string> = { eggo: 'EGGO', coke: 'COKE' };

export const createShop = (progress: Progress): ShopState => ({ progress, cursor: 0, note: null });

/** Quarters in the purse. */
export const purse = (s: ShopState): number => purseOf(s.progress);

export function rowOf(s: ShopState, i: number): ShopRow {
  const item = SHOP_ITEMS[i] as StashItem;
  const why = whyNot(s.progress, item);
  return { item, name: NAMES[item], price: PRICES[item], carried: stashOf(s.progress)[item], max: STASH_MAX, live: why === null, why };
}
export const rowsOf = (s: ShopState): ShopRow[] => SHOP_ITEMS.map((_, i) => rowOf(s, i));

// ---------------------------------------------------------------- the cursor
/** Puts the cursor on row `i`. A click or the mouse calls this. Out of range is refused. */
export function moveTo(s: ShopState, i: number): ShopState {
  if (i < 0 || i >= SHOP_ITEMS.length || i === s.cursor) return s;
  return { ...s, cursor: i, note: null };
}

/** Up and down walk the rows and wrap round. */
export function step(s: ShopState, dir: 'up' | 'down'): ShopState {
  const n = SHOP_ITEMS.length;
  return moveTo(s, (s.cursor + (dir === 'down' ? 1 : n - 1)) % n);
}

// ---------------------------------------------------------------- the buy
/**
 * Buys one of row `i` (the cursor's by default). A good buy returns a new state with the new Progress, the cursor on that row
 * and the note `bought`. A row that can't be bought leaves the Progress alone, the very same object, and the note says why.
 */
export function purchase(s: ShopState, i: number = s.cursor): ShopState {
  if (i < 0 || i >= SHOP_ITEMS.length) return s;
  const row = rowOf(s, i);
  if (row.why) return { ...s, cursor: i, note: row.why };
  return { progress: buy(s.progress, row.item), cursor: i, note: 'bought' };
}

/** True when `next` bought something that `prev` had not. */
export const boughtBetween = (prev: ShopState, next: ShopState): boolean => next.progress !== prev.progress;

// ---------------------------------------------------------------- her line
export const LINES = {
  open: "TRIPLE PRICE. I DON'T HAGGLE.",
  bought: 'PLEASURE DOING BUSINESS.',
  short: 'QUARTERS, NOT PROMISES.',
  full: "YOU CAN'T CARRY ANY MORE.",
} as const;

/** The most characters of her line the panel has room for, in the 5 by 7 font. */
export const LINE_MAX = 33;

/** The one dry line she says now: a greeting, or the reason for a refusal, or a thanks. */
export const lineFor = (s: ShopState): string => LINES[s.note ?? 'open'];

// ---------------------------------------------------------------- the legend
/**
 * The one-line legend for the device, one entry per key. A keyboard names the arrows and Escape, which always work, and the
 * attack key as the player bound it. A controller names the stick and its buttons. A touch screen's B is special and back in
 * one button, so its way out is the pause button, named by `pause`.
 */
export function legend(device: PromptDevice, attack: string, pause: string): string[] {
  if (device === 'gamepad') return ['STICK MOVE', 'A BUY', 'B CLOSE'];
  // The 3 by 5 font has no hyphen, so the D-pad is one word.
  if (device === 'touch') return ['DPAD MOVE', `${attack} BUY`, `${pause} CLOSE`];
  return ['ARROWS MOVE', `${attack} BUY`, 'ESC CLOSE'];
}
