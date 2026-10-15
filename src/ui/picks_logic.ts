// The rules of the party picks panel that Node can test (docs/map-screen.md, "Party picks"): the pool in order, who is picked
// and in what order (the first is the lead), who is locked in, the cursor over the cards and the START row, toggling a hero
// in or out, making a picked hero the lead, and when START is live. No DOM here; ui/picks.ts runs the input and the drawing.
// Every change returns a new state, or the very same object when the rules refuse it, so a caller can tell by `next === s`.
import type { HeroId, PartySeed } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import { PARTY_SIZE } from '../core/campaign.ts';
import type { PromptDevice } from '../core/bindings.ts';
import type { Rect } from '../core/pointer.ts';
import { BAND_Y, TOP_H } from '../gfx/map_geo.ts';
import { utilitiesAt } from '../heroes/defs.ts';

/** Cards per row in the Grid layout. */
export const COLS = 3;

/** The word for the gate each hero opens. Mike opens none. */
const GATES: Partial<Record<HeroId, string>> = {
  dustin: 'BURN', lucas: 'SHOOT', will: 'SENSE', max: 'DASH', steve: 'SMASH', eleven: 'PUSH', robin: 'READ', nancy: 'SHOOT',
};

/** The card's gate word. Nancy's Lv 6 Molotov burns, so from then her card says BURN too. */
function gateWord(id: HeroId, level: number): string {
  const word = GATES[id] ?? '';
  return id === 'nancy' && utilitiesAt(id, level).includes('burn') ? `${word} BURN` : word;
}

export interface PicksState {
  /** Everyone in the stage's pool, in order, with the level they would play at. */
  pool: readonly PartySeed[];
  /** Who goes, lead first. Never more than PARTY_SIZE, and always holds every locked hero. */
  picked: readonly HeroId[];
  /** The heroes the stage can't be cleared without. They are picked and can't come out. */
  locked: readonly HeroId[];
  /** 0 to pool.length - 1 is a card, and pool.length is the START row. */
  cursor: number;
  /** The column the cursor last stood in, so going down onto START and back up returns to the same card. */
  col: number;
}

/** What one card draws. */
export interface PickRow {
  id: HeroId;
  name: string;
  level: number;
  /** DASH, SMASH, BURN, SHOOT, SENSE, PUSH or READ, SHOOT BURN for Nancy from Lv 6, or empty. */
  gate: string;
  /** 1 to 4 in party order, 0 on the bench. Slot 1 is the lead. */
  slot: number;
  locked: boolean;
}

/**
 * The panel opens on `seed` (lead first) fixed up the way `pickParty` does it: heroes outside the pool and repeats are
 * dropped, a locked hero who is missing takes the last free or unlocked slot, and the list is cut to four. It does not fill
 * empty slots, so a short seed leaves START dead until the player picks. The cursor starts on the first card.
 */
export function createPicks(pool: readonly PartySeed[], locked: readonly HeroId[], seed: readonly HeroId[] = []): PicksState {
  const ids = pool.map((p) => p.id);
  const lock = locked.filter((h) => ids.includes(h));
  const picked: HeroId[] = [];
  for (const h of seed) if (ids.includes(h) && !picked.includes(h) && picked.length < PARTY_SIZE) picked.push(h);
  for (const h of lock) {
    if (picked.includes(h)) continue;
    if (picked.length < PARTY_SIZE) { picked.push(h); continue; }
    for (let i = picked.length - 1; i >= 0; i--) {
      if (!lock.includes(picked[i] as HeroId)) { picked[i] = h; break; }
    }
  }
  return { pool, picked, locked: lock, cursor: 0, col: 0 };
}

/** The START row's cursor value. */
export const startIndex = (s: PicksState): number => s.pool.length;
export const onStart = (s: PicksState): boolean => s.cursor === startIndex(s);
/** The hero under the cursor, or null on the START row. */
export const heroAt = (s: PicksState, i: number = s.cursor): HeroId | null => s.pool[i]?.id ?? null;
/** START is live only with four picked. */
export const ready = (s: PicksState): boolean => s.picked.length === PARTY_SIZE;
/** The party to play with, lead first, or null while START is dead. */
export const result = (s: PicksState): HeroId[] | null => (ready(s) ? [...s.picked] : null);

/** A card's row for drawing. */
export function rowOf(s: PicksState, i: number): PickRow {
  const p = s.pool[i] as PartySeed;
  return {
    id: p.id, name: CHAR_NAMES[p.id], level: p.level ?? 1, gate: gateWord(p.id, p.level ?? 1),
    slot: s.picked.indexOf(p.id) + 1, locked: s.locked.includes(p.id),
  };
}
export const rowsOf = (s: PicksState): PickRow[] => s.pool.map((_, i) => rowOf(s, i));

// ---------------------------------------------------------------- the cursor
const rowsCount = (n: number): number => Math.ceil(n / COLS);
/** How many cards sit in row `r`. The last row can be short. */
const inRow = (n: number, r: number): number => Math.min(COLS, n - r * COLS);

/** Puts the cursor on card (or the START row) `i`. A click calls this. Out of range is refused. */
export function moveTo(s: PicksState, i: number): PicksState {
  const n = s.pool.length;
  if (i < 0 || i > n || i === s.cursor) return s;
  return { ...s, cursor: i, col: i < n ? i % COLS : s.col };
}

/**
 * Steps the cursor. Left and right walk along a row and wrap inside it, and do nothing on the START row. Up and down
 * walk the rows and the START row below them and wrap round, so down from the last row lands on START and down from
 * START lands on the first row, in the column the cursor last stood in (or the last card of a short row).
 */
export function step(s: PicksState, dir: 'left' | 'right' | 'up' | 'down'): PicksState {
  const n = s.pool.length;
  if (n === 0) return s;
  const rows = rowsCount(n);
  if (onStart(s)) {
    if (dir === 'left' || dir === 'right') return s;
    const r = dir === 'down' ? 0 : rows - 1;
    return moveTo(s, r * COLS + Math.min(s.col, inRow(n, r) - 1));
  }
  const r = Math.floor(s.cursor / COLS), c = s.cursor % COLS;
  if (dir === 'left' || dir === 'right') {
    const w = inRow(n, r);
    return moveTo(s, r * COLS + ((c + (dir === 'right' ? 1 : -1) + w) % w));
  }
  const to = r + (dir === 'down' ? 1 : -1);
  if (to < 0 || to >= rows) return moveTo(s, n);
  return moveTo(s, to * COLS + Math.min(c, inRow(n, to) - 1));
}

// ---------------------------------------------------------------- the picks
/**
 * Takes the hero on card `i` out of the party, or puts them in at the end. A locked hero can't come out, a fifth can't go
 * in, and the START row isn't a hero. Taking someone out closes the gap, so the order of the rest holds.
 */
export function toggle(s: PicksState, i: number = s.cursor): PicksState {
  const id = heroAt(s, i);
  if (!id) return s;
  if (s.picked.includes(id)) {
    if (s.locked.includes(id)) return s;
    return { ...s, picked: s.picked.filter((h) => h !== id) };
  }
  if (s.picked.length >= PARTY_SIZE) return s;
  return { ...s, picked: [...s.picked, id] };
}

/**
 * The cards that stand in the way when `toggle` refuses card `i`, for the panel to flash: the whole party when a fifth hero
 * has no slot, the hero's own card when a locked hero can't come out. Empty when the toggle goes through, and on START.
 */
export function blockedBy(s: PicksState, i: number = s.cursor): number[] {
  const id = heroAt(s, i);
  if (!id) return [];
  if (s.picked.includes(id)) return s.locked.includes(id) ? [i] : [];
  if (s.picked.length < PARTY_SIZE) return [];
  return s.pool.flatMap((p, k) => (s.picked.includes(p.id) ? [k] : []));
}

/** Moves a picked hero to the front, so they lead. A hero on the bench, or the lead already, changes nothing. */
export function makeLead(s: PicksState, i: number = s.cursor): PicksState {
  const id = heroAt(s, i);
  if (!id || s.picked[0] === id || !s.picked.includes(id)) return s;
  return { ...s, picked: [id, ...s.picked.filter((h) => h !== id)] };
}

// ---------------------------------------------------------------- the layout
/** Where everything sits, in frame px, for a pool of `n`. Six heroes are three cards by two. Nine are three by three, on
 * shorter cards (the face, the text and the mark each a pixel or two higher), so the panel still fits between the map's top
 * strip and its party band with START and the legend. Pure, so a test can check the fit. */
export interface PicksLayout {
  rows: number;
  compact: boolean;
  panel: Rect;
  /** A card's width and height, and the pitch from one to the next. */
  cw: number; ch: number; gx: number; gy: number;
  /** The first card's top left. */
  x0: number; y0: number;
  start: Rect;
  /** Top of the one-line legend, level with START's label. */
  legendY: number;
  /** Offsets inside a card: the face's top, the gate word's, and the mark under the face (LEAD, the party number, the lock). */
  top: number; gateY: number; markY: number;
}

export function picksLayout(n: number): PicksLayout {
  const rows = Math.max(1, rowsCount(n));
  const compact = rows > 2;
  const ch = compact ? 40 : 44, gy = ch + (compact ? 4 : 6);
  const startDy = 17 + (rows - 1) * gy + ch + 8;
  const ph = startDy + 11 + 6;
  const py = Math.round(TOP_H + (BAND_Y - TOP_H - ph) / 2);
  return {
    rows, compact, panel: { x: 4, y: py, w: 248, h: ph }, cw: 74, ch, gx: 80, gy, x0: 11, y0: py + 17,
    start: { x: 11, y: py + startDy, w: 56, h: 11 }, legendY: py + startDy + 3,
    top: compact ? 4 : 5, gateY: compact ? 25 : 26, markY: compact ? 32 : 34,
  };
}

/** Card `i`'s box, and the click cell round it: the cells meet, so the mouse is always over one card. */
export const cardRect = (l: PicksLayout, i: number): Rect => ({ x: l.x0 + (i % COLS) * l.gx, y: l.y0 + Math.floor(i / COLS) * l.gy, w: l.cw, h: l.ch });
export function cellRect(l: PicksLayout, i: number): Rect {
  const c = cardRect(l, i);
  return { x: c.x - 3, y: c.y - 3, w: l.gx, h: l.gy };
}
/** The mark under card `i`'s face: a click on a picked hero's makes them lead. */
export function markRect(l: PicksLayout, i: number): Rect {
  const c = cardRect(l, i);
  return { x: c.x + 2, y: c.y + l.markY - 3, w: 32, h: 11 };
}

// ---------------------------------------------------------------- the legend
/**
 * The one-line legend for the device, one entry per key. A keyboard names the arrows and Escape, which always work, and the
 * attack and special keys as the player bound them. A controller names the stick and its buttons. A touch screen taps a
 * card, and its B leads, and PAUSE goes back, since its B is also the special key.
 */
export function legend(device: PromptDevice, attack: string, special: string): string[] {
  // A picks and B backs out on every controller. Special can be rebound, so it is named from the bindings like the keys are.
  if (device === 'gamepad') return ['STICK MOVE', 'A PICK', `${special} LEAD`, 'B BACK'];
  if (device === 'touch') return ['TAP PICK', `${special} LEAD`, 'PAUSE BACK'];
  return ['ARROWS MOVE', `${attack} PICK`, `${special} LEAD`, 'ESC BACK'];
}
