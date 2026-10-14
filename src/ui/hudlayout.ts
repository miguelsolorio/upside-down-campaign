// Where each hero sits in the top strip. The HUD draws from these rectangles and the play scene hit-tests clicks
// against the same ones, so what you see is what you can press. Pure, so Node can test it.
// The constants below place things in a strip STRIP_W wide and CELL_H tall. On a wider screen the strip runs edge to
// edge and is taller, and its contents follow the clear band with some room around them: the active hero and the
// middle stay against the band's left edge (leftShift), the bench and the d20 against its right edge (rightShift),
// and everything is moved down by the band's `top` so it sits centered in the strip.
import { HUD_PAD_X, STRIP_H, VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import type { PartyHud } from '../core/types.ts';

/** The width the constants below are laid out for. */
export const STRIP_W = 256;

/** A bench slot is a shortcut key, an 11 px face and a 3 px HP bar side by side, with room before the next slot. */
export const BENCH_PITCH = 26;
/** In a bench slot, from its left edge to the face: 2 px of padding, the 3 px key and a 2 px gap. */
export const BENCH_FACE_DX = 7;
/** Room for three benched heroes. */
export const BENCH_W = 78;
/** The strip is 20 px tall on a 256 px screen and a slot's click cell spans all of it. The last two rows are its border. */
export const CELL_H = STRIP_H;
/** The d20 meter starts here, and the quarters and Inspiration end by here. The bench ends against the meter. */
export const METER_LEFT = 238;
export const MIDDLE_END = 158;
/** The active hero's text, HP bar and XP notches start here, right of the portrait and its shortcut key. */
export const LEFT_X = 25;
/** Width the HP bar's segments are fitted into. The bar is shorter than this until max HP is high. */
export const LEFT_W = 100;
/** The MP readout sits in the name row: a tiny label, then a bar. Level 12 Eleven has the longest name and level,
 * and they end before the label. The bar ends before the quarters. */
export const MP_LABEL_X = 94;
export const MP_BAR_X = 103;
export const MP_BAR_W = 24;
/** The quarter counter starts here, and the Inspiration timer sits under it. */
export const MIDDLE_X = 130;
/** Center of the d20 meter. */
export const METER_X = 246;
/** The active hero's portrait box and its click cell. */
export const ACTIVE_CELL = { x: 0, y: 0, w: 20, h: CELL_H };

export interface SlotRect {
  /** Position in the party, 0..3. This is what a click sends as `swapTo`. */
  index: number;
  /** The key number, 1..4. */
  n: 1 | 2 | 3 | 4;
  active: boolean;
  ko: boolean;
  /** The click cell. It covers the portrait, its key label and its HP bar. */
  x: number; y: number; w: number; h: number;
  /** Left edge of the face frame: 11 px wide for a bench slot, 16 px for the active hero. */
  px: number;
}

/** Pitch between bench slots. It stays 26 for any bench size, so a hero's tag looks the same whoever else is out. */
export function benchPitch(count: number): number {
  return Math.min(BENCH_PITCH, Math.floor(BENCH_W / Math.max(1, count)));
}

/** Right edge of the bench. */
export const BENCH_END = METER_LEFT - 1;

/** Where the strip's contents go, in screen px: across from x for w, moved down by top, in a strip h tall. */
export interface HudBand { x: number; w: number; top: number; h: number }
/** The clear band, inset at the sides on a wider screen, and the strip's height. Read when called, so the strip and
 * its clicks always use the current screen. The inset shrinks when the band is barely wider than the strip. */
export function hudBand(): HudBand {
  const pad = Math.max(0, Math.min(HUD_PAD_X, Math.floor((VIEW_W - STRIP_W) / 2)));
  return { x: VIEW_X + pad, w: VIEW_W - pad * 2, top: (VIEW_TOP - STRIP_H) / 2, h: VIEW_TOP };
}
/** How far the left-hand contents (active hero, middle) move from where the constants put them. */
export const leftShift = (b: HudBand): number => b.x;
/** How far the right-hand contents (bench, d20) move from where the constants put them. */
export const rightShift = (b: HudBand): number => b.x + b.w - STRIP_W;

/** Left edge of bench slot `k` of `count`. */
export function benchX(k: number, count: number, band: HudBand = hudBand()): number {
  return BENCH_END + rightShift(band) - (count - k) * benchPitch(count);
}

/** One rectangle per hero, the active one first and then the bench left to right in party order. */
export function slotRects(party: readonly PartyHud[], band: HudBand = hudBand()): SlotRect[] {
  const out: SlotRect[] = [];
  const bench = party.map((p, i) => ({ p, i })).filter((b) => !b.p.active);
  const lx = leftShift(band);
  party.forEach((p, i) => {
    if (!p.active) return;
    out.push({ index: i, n: (i + 1) as SlotRect['n'], active: true, ko: p.ko, ...ACTIVE_CELL, x: ACTIVE_CELL.x + lx, h: band.h, px: 1 + lx });
  });
  const pitch = benchPitch(bench.length);
  bench.forEach((b, k) => {
    const x = benchX(k, bench.length, band);
    out.push({ index: b.i, n: (b.i + 1) as SlotRect['n'], active: false, ko: b.p.ko, x, y: 0, w: pitch, h: band.h, px: x + BENCH_FACE_DX });
  });
  return out;
}

/** Party index under a point in game px, or -1. The active hero and a KO'd hero are not swap targets. */
export function slotAt(party: readonly PartyHud[], x: number, y: number, band: HudBand = hudBand()): number {
  for (const r of slotRects(party, band)) {
    if (r.active || r.ko) continue;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.index;
  }
  return -1;
}
