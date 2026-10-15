// Where each hero sits in the top strip. The HUD draws from these rectangles and the play scene hit-tests clicks
// against the same ones, so what you see is what you can press. Pure, so Node can test it.
// The constants below place things in a strip STRIP_W wide and CELL_H tall. On a wider screen the strip runs edge to
// edge and is taller, and its contents follow the clear band with some room around them: the active hero and the columns
// beside it (MP, coins, Crit) stay against the band's left edge (leftShift), the bench against its right edge
// (rightShift), and everything is moved down by the band's `top` so it sits centered in the strip.
import { HUD_PAD_X, STRIP_H, VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import type { PartyHud } from '../core/types.ts';
import type { Rect } from '../core/pointer.ts';

/** The width the constants below are laid out for. */
export const STRIP_W = 256;

/** A bench slot is a shortcut key and an 11 px face side by side, with room before the next slot. */
export const BENCH_PITCH = 21;
/** In a bench slot, from its left edge to the face: 2 px of padding, the 3 px key and a 2 px gap. */
export const BENCH_FACE_DX = 7;
/** Room for three benched heroes. */
export const BENCH_W = 63;
/** The strip is 20 px tall on a 256 px screen and a slot's click cell spans all of it. The last two rows are its border. */
export const CELL_H = STRIP_H;
/** The bench ends at the strip's edge (a slot has 3 px of its own past the face), and its first slot starts BENCH_W before
 * that. The slots sit in fixed places from the first one on, so a hero joining the party fills the next one and nothing
 * else moves. */
export const BENCH_END = STRIP_W;
export const BENCH_START = BENCH_END - BENCH_W;
/** The active hero's name and level, and the XP notches under them, start here, right of the portrait and its shortcut
 * key. */
export const LEFT_X = 25;
/** XP is ten notches, 5 px thick, under the name. The widest name and level, DUSTIN LV12, ends at 90, so the notches and
 * the columns beside them never meet it. */
export const XP_Y = 10;
export const XP_H = 5;
export const XP_W = 62;
/** Three columns follow, each a tiny caption over a 7 px value row: MP, then the coins, then Crit. CAPTION_Y is the top of
 * the caption and VALUE_Y the top of the value under it. */
export const CAPTION_Y = 1;
export const VALUE_Y = 8;
export const VALUE_H = 7;
/** MP: the caption over one segment per cast. */
export const MP_X = 100;
export const MP_BAR_W = 28;
/** Coins: the caption over the 7 px coin, a 2 px gap and "x99" in 6 px glyphs. The Inspiration timer takes the caption's
 * place while a natural 20 has it running. */
export const COIN_X = 137;
export const COIN_W = 9 + 'x99'.length * 6 - 1;
export const INSPIRE_X = COIN_X - 3;
/** Crit: the caption over a small d20, 8 px wide, under the caption's left end. */
export const CRIT_X = 170;
export const CRIT_W = 'CRIT'.length * 4 - 1;
/** The columns end here, and the bench starts after them. */
export const CLUSTER_END = CRIT_X + CRIT_W;
/** The active hero's portrait box and its click cell. */
export const ACTIVE_CELL = { x: 0, y: 0, w: 20, h: CELL_H };
/** The name row: the name, a 6 px gap, then LVn, all in 6 px glyphs. The level starts this far right of LEFT_X. */
export const levelDx = (name: string): number => name.length * 6 + 6;

export interface SlotRect {
  /** Position in the party, 0..3. This is what a click sends as `swapTo`. */
  index: number;
  /** The key number, 1..4. */
  n: 1 | 2 | 3 | 4;
  active: boolean;
  ko: boolean;
  /** The click cell. It covers the portrait and its key label. */
  x: number; y: number; w: number; h: number;
  /** Left edge of the face frame: 11 px wide for a bench slot, 16 px for the active hero. */
  px: number;
}

/** Pitch between bench slots. It stays 21 for any bench size, so a hero's tag looks the same whoever else is out. */
export function benchPitch(count: number): number {
  return Math.min(BENCH_PITCH, Math.floor(BENCH_W / Math.max(1, count)));
}

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
/** How far the right-hand contents (the bench) move from where the constants put them. */
export const rightShift = (b: HudBand): number => b.x + b.w - STRIP_W;

/** Left edge of bench slot `k`. */
export function benchX(k: number, count: number, band: HudBand = hudBand()): number {
  return BENCH_START + rightShift(band) + k * benchPitch(count);
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

/** The active hero's name and level, which together are the button that opens the character sheet. The box runs 2 px
 * past the text on each side and stops above the XP notches. Null with no active hero. */
export function levelRect(party: readonly PartyHud[], band: HudBand = hudBand()): Rect | null {
  const p = party.find((m) => m.active);
  if (!p) return null;
  const ink = levelDx(p.name) + `LV${p.level}`.length * 6 - 1;
  return { x: leftShift(band) + LEFT_X - 2, y: band.top, w: ink + 4, h: 9 };
}

/** True when a point in game px is on the active hero's name and level. */
export function onLevel(party: readonly PartyHud[], x: number, y: number, band: HudBand = hudBand()): boolean {
  const r = levelRect(party, band);
  return !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
