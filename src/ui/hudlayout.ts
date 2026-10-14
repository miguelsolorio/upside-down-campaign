// Where each hero sits in the top strip. The HUD draws from these rectangles and the play scene hit-tests clicks
// against the same ones, so what you see is what you can press. Pure, so Node can test it.
import type { PartyHud } from '../core/types.ts';

/** A bench slot is a shortcut key, an 11 px face and a 3 px HP bar side by side, with room before the next slot. */
export const BENCH_PITCH = 26;
/** In a bench slot, from its left edge to the face: 2 px of padding, the 3 px key and a 2 px gap. */
export const BENCH_FACE_DX = 7;
/** Room for three benched heroes. */
export const BENCH_W = 78;
/** The strip is 20 px tall and a slot's click cell spans all of it. The last two rows are its border. */
export const CELL_H = 20;
/** The d20 meter starts here, and the quarters and Inspiration end by here. The bench ends against the meter. */
export const METER_LEFT = 238;
export const MIDDLE_END = 158;
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

/** Left edge of bench slot `k` of `count`. */
export function benchX(k: number, count: number): number {
  return BENCH_END - (count - k) * benchPitch(count);
}

/** One rectangle per hero, the active one first and then the bench left to right in party order. */
export function slotRects(party: readonly PartyHud[]): SlotRect[] {
  const out: SlotRect[] = [];
  const bench = party.map((p, i) => ({ p, i })).filter((b) => !b.p.active);
  party.forEach((p, i) => {
    if (!p.active) return;
    out.push({ index: i, n: (i + 1) as SlotRect['n'], active: true, ko: p.ko, ...ACTIVE_CELL, px: 1 });
  });
  const pitch = benchPitch(bench.length);
  bench.forEach((b, k) => {
    const x = benchX(k, bench.length);
    out.push({ index: b.i, n: (b.i + 1) as SlotRect['n'], active: false, ko: b.p.ko, x, y: 0, w: pitch, h: CELL_H, px: x + BENCH_FACE_DX });
  });
  return out;
}

/** Party index under a point in game px, or -1. The active hero and a KO'd hero are not swap targets. */
export function slotAt(party: readonly PartyHud[], x: number, y: number): number {
  for (const r of slotRects(party)) {
    if (r.active || r.ko) continue;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.index;
  }
  return -1;
}
