// Where things sit on the character sheet, in the centered 256 px frame. The sheet draws from these and hit-tests the
// mouse against the same boxes, so what you see is what you can press. Pure, so Node can test that everything fits.
import type { Rect } from '../core/pointer.ts';
import type { Vec2 } from '../core/types.ts';

/** The 5 by 7 font's advance. */
const GLYPH = 6;

/** Four hero tabs across the top: a small face and the name. */
export const TAB_COUNT = 4;
export const TAB_W = 56;
export const TAB_H = 15;
export const TAB_GAP = 4;
export const TAB_Y = 24;
export const TAB_X0 = (256 - (TAB_COUNT * TAB_W + (TAB_COUNT - 1) * TAB_GAP)) / 2;

/** The panel under the tabs, and the content inside it: the portrait at LEFT, names and notes from TEXT_X, numbers
 * right-aligned to RIGHT. */
export const PANEL: Rect = { x: 8, y: 42, w: 240, h: 164 };
export const LEFT = 16;
export const RIGHT = 240;
export const TEXT_X = 48;
export const PORTRAIT_Y = 50;
export const NAME_Y = 51;
export const ROLE_Y = 61;

/** Two rows of three stats. A label, then the value STAT_VALUE_DX to its right, then any d20 bonus. */
export const STAT_COLS = [LEFT, 92, 168] as const;
export const STAT_ROWS = [80, 90] as const;
export const STAT_VALUE_DX = 30;
export const RULE_Y = 101;

/** One move per MOVE_PITCH: the kind and name, its cost and damage, and a note line NOTE_DY under it. */
export const MOVES_Y = 106;
export const MOVE_PITCH = 24;
export const NOTE_DY = 10;

/** The footer: how to switch heroes on the left, the back button on the right. */
export const FOOT_Y = 212;

export function tabRect(i: number): Rect {
  return { x: TAB_X0 + i * (TAB_W + TAB_GAP), y: TAB_Y, w: TAB_W, h: TAB_H };
}

/** The tab under a point in frame px, or -1. */
export function tabAt(p: Vec2 | null): number {
  if (!p) return -1;
  for (let i = 0; i < TAB_COUNT; i++) {
    const r = tabRect(i);
    if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return i;
  }
  return -1;
}

/** The back button's box, a little bigger than its right-aligned label. */
export function backRect(label: string): Rect {
  const w = label.length * GLYPH;
  return { x: RIGHT - w - 4, y: FOOT_Y - 3, w: w + 8, h: 13 };
}
