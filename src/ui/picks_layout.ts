// Where everything sits on the party picks panel, in frame px (docs/map-screen.md, "Party picks"). Pure, so a test can check the fit.
// Six heroes are three cards by two, nine are three by three on shorter cards, and ten or eleven (4.2's pool, chapter 5's) are four
// across on narrow cards, three rows: the face on the left with the level and the mark beside it, the name and the gate word under it.
// The panel is centered between the map's top strip and its party band, with START and the legend under the cards.
import type { Rect } from '../core/pointer.ts';
import { BAND_Y, TOP_H } from '../gfx/map_geo.ts';
import { tinyWidth } from '../gfx/font.ts';

/** Cards per row: three for up to nine heroes, four across for ten and more, which keeps the panel to three rows up to MAX_POOL. */
export const COLS = 3;
export const COLS_WIDE = 4;
export const MAX_POOL = 12;
export const colsFor = (n: number): number => (n > 9 ? COLS_WIDE : COLS);

/** The padlock after a locked hero's mark is this wide (ui/picks.ts draws it). */
export const LOCK_W = 5;

/** A point inside a card, from its top left. */
export interface Spot { x: number; y: number }

/** Where the parts of a card sit. The face is 24 by 24, the name and level are 5 by 7 glyphs and the gate word, mark and bond tag are tiny. */
export interface CardSpots {
  face: Spot;
  name: Spot;
  level: Spot;
  gate: Spot;
  /** LEAD or the party number, with the padlock after it. */
  mark: Spot;
  /** The bond tag: x is its right edge, y its row. */
  bond: Spot;
}

/** Where everything sits, in frame px, for a pool of `n`. */
export interface PicksLayout {
  rows: number;
  cols: number;
  /** Shorter cards, for three rows. */
  compact: boolean;
  panel: Rect;
  /** A card's width and height, and the pitch from one to the next. */
  cw: number; ch: number; gx: number; gy: number;
  /** The first card's top left. */
  x0: number; y0: number;
  start: Rect;
  /** Top of the one-line legend, level with the top of START, and of the bond line under it. */
  legendY: number;
  bondY: number;
  card: CardSpots;
}

function spots(cols: number, compact: boolean, cw: number): CardSpots {
  if (cols > COLS) {
    return { face: { x: 3, y: 3 }, level: { x: 30, y: 4 }, mark: { x: 30, y: 14 }, name: { x: 3, y: 28 }, gate: { x: 3, y: 36 }, bond: { x: cw - 3, y: 36 } };
  }
  const top = compact ? 4 : 5, markY = compact ? 32 : 34;
  return {
    face: { x: 5, y: top }, name: { x: 34, y: top + 1 }, level: { x: 34, y: top + 11 }, gate: { x: 34, y: compact ? 25 : 26 },
    mark: { x: 5, y: markY }, bond: { x: cw - 3, y: markY },
  };
}

export function picksLayout(n: number): PicksLayout {
  const cols = colsFor(n), wide = cols > COLS;
  const rows = Math.max(1, Math.ceil(n / cols));
  const compact = rows > 2;
  const cw = wide ? 56 : 74, gx = wide ? 59 : 80;
  const ch = wide ? 44 : compact ? 40 : 44, gy = ch + (wide ? 3 : compact ? 4 : 6);
  const head = 17;
  const startDy = head + (rows - 1) * gy + ch + (wide ? 6 : 8);
  const ph = startDy + 11 + 6;
  const py = Math.round(TOP_H + (BAND_Y - TOP_H - ph) / 2);
  return {
    rows, cols, compact, panel: { x: 4, y: py, w: 248, h: ph }, cw, ch, gx, gy, x0: 11, y0: py + head,
    start: { x: 11, y: py + startDy, w: 56, h: 11 }, legendY: py + startDy, bondY: py + startDy + 6, card: spots(cols, compact, cw),
  };
}

/** Card `i`'s box, and the click cell round it: the cells meet, so the mouse is always over one card. */
export const cardRect = (l: PicksLayout, i: number): Rect => ({ x: l.x0 + (i % l.cols) * l.gx, y: l.y0 + Math.floor(i / l.cols) * l.gy, w: l.cw, h: l.ch });
export function cellRect(l: PicksLayout, i: number): Rect {
  const c = cardRect(l, i);
  return { x: c.x - 3, y: c.y - 3, w: l.gx, h: l.gy };
}
/** The mark on card `i`: a click on a picked hero's makes them lead. It stops at the card's right edge. */
export function markRect(l: PicksLayout, i: number): Rect {
  const c = cardRect(l, i), m = l.card.mark;
  return { x: c.x + m.x - 3, y: c.y + m.y - 3, w: Math.min(32, l.cw - m.x + 2), h: 11 };
}

// ---------------------------------------------------------------- the mark and the bond tag
/** What a card says about its hero, as far as where it can go: the gate word, the party place (0 on the bench), the padlock and the bond tag. */
export interface CardWords { gate: string; slot: number; locked: boolean; bond: string }

/** The mark's width: LEAD or the party number, and the padlock after it for a hero the stage needs. Nothing on the bench. */
export function markWidth(slot: number, locked: boolean): number {
  return slot <= 0 ? 0 : tinyWidth(slot === 1 ? 'LEAD' : String(slot)) + (locked ? 3 + LOCK_W : 0);
}

/**
 * The bond tag as the card can print it: the tag if it fits, else BOND, else nothing (the bond line under the cards still names it). It
 * sits right-aligned on the mark's row, which leaves room for any tag, or, four across, on the gate word's row, where a long gate word
 * (SHOOT BURN) leaves none.
 */
export function bondTag(l: PicksLayout, r: CardWords): string {
  if (!r.bond) return '';
  const left = l.cols > COLS ? l.card.gate.x + (r.gate ? tinyWidth(r.gate) + 3 : 0) : l.card.mark.x + markWidth(r.slot, r.locked) + 3;
  return [r.bond, 'BOND'].find((t) => l.card.bond.x - tinyWidth(t) >= left) ?? '';
}
