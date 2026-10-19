// The pieces of the note highway, drawn once from pixels: the lane colors (the HUD's own: Attack red, Special blue like the
// MP bar, Crit gold like the d20), the note gem in three sizes, and the strum target. Pure pixel work: no DOM until toCanvas().
// These came out of the variation sheet (src/gfx/var/solo_kit.ts), which draws the same pieces from here.
import type { ColorName } from '../gfx/palette.ts';
import { Px } from '../gfx/px.ts';

/** A lane's three tones: the face, the dark lower lip, and the glint. */
export interface Hue { col: ColorName; shade: ColorName; hi: ColorName }
export const RED: Hue = { col: 'red', shade: 'blood1', hi: 'pink' };
export const BLUE: Hue = { col: 'blue', shade: 'dusk', hi: 'sky' };
export const GOLD: Hue = { col: 'amber', shade: 'orange', hi: 'cream' };
/** A note that went by unhit. */
export const GREY: Hue = { col: 'grey2', shade: 'grey1', hi: 'grey3' };
/** Attack, Special, Crit. */
export const HUES: readonly Hue[] = [RED, BLUE, GOLD];

export type GemSize = 'big' | 'mid' | 'small';

/** A note gem, 12 by 9: the lane color, a dark lower lip, a bright glint, an ink rim. Mid is 10 by 8 and small 8 by 6, for the far end of the neck. */
export function gem(l: Hue, size: GemSize = 'big'): Px {
  const [w, h, rx, ry] = size === 'big' ? [12, 9, 4.6, 3.3] : size === 'mid' ? [10, 8, 3.7, 2.7] : [8, 6, 2.7, 2];
  const p = new Px(w, h), cx = w / 2, cy = h / 2;
  p.ellipse(cx, cy, rx, ry, l.shade).ellipse(cx, cy - 0.6, rx - 0.3, ry - 0.5, l.col);
  p.set(Math.floor(cx - rx * 0.45), Math.floor(cy - ry * 0.5), l.hi);
  if (size === 'big') p.set(Math.floor(cx - rx * 0.45) + 1, Math.floor(cy - ry * 0.5), l.hi);
  return p.outline('ink');
}

/** The strum target for a lane, 14 by 11: a hollow ring in the lane's color, lit and filled when struck. */
export function target(l: Hue, struck = false): Px {
  const p = new Px(14, 11), cx = 7, cy = 5.5;
  p.ellipse(cx, cy, 5.6, 4.2, struck ? l.hi : l.col).ellipse(cx, cy, 4.4, 3.1, struck ? l.hi : l.shade).ellipse(cx, cy, 3.8, 2.6, struck ? l.col : 'ink');
  if (struck) p.ellipse(cx, cy, 1.8, 1.2, 'white');
  return p.outline('ink');
}
