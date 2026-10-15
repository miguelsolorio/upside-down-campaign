import type { CharId } from './types.ts';

/** Menus, cards, dialogue and the HUD clusters are laid out for a screen this wide, then centered. */
export const BASE_W = 256;
/** The widest the canvas gets. A wider window gets bars at the sides. */
export const MAX_W = 1024;
/** The widest the world is shown: 28 tiles. On a wider screen the world past this band fades to black, so a big
 * monitor never shows more of a level than a laptop does. A multiple of 8, like every screen width. */
export const CLEAR_MAX = 448;
/** The screen width in game px. It follows the window's shape and changes on resize, so read it when you need it
 * and never copy it into a module-level const. 256 until main.ts sizes the canvas, which is what tests see. */
export let SCREEN_W = BASE_W;
/** The screen is always this tall: bigger monitors get bigger pixels, not more of the level. */
export const SCREEN_H = 224;
/** The clear band the world is shown in, centered on the screen. As wide as the screen up to CLEAR_MAX. */
export let VIEW_W = BASE_W;
export let VIEW_X = 0;
/** Left edge of a BASE_W layout centered on the screen. */
export let FRAME_X = 0;
/** The HUD strip's height on a 256 px screen: 18 rows of contents and a 2 row border. */
export const STRIP_H = 20;
/** On a wider screen the strip gets this much room above and below its contents, and HUD_PAD_X at the sides. */
export const HUD_PAD_Y = 3;
export const HUD_PAD_X = 6;
/** The HUD strip covers the top of the screen. The world is visible below this line. STRIP_H at 256 wide and
 * STRIP_H + 2 * HUD_PAD_Y on a wider screen. Live, like SCREEN_W. */
export let VIEW_TOP = STRIP_H;

/** A screen width for a window: whole multiples of 8 between BASE_W and MAX_W. Multiples of 8 keep VIEW_X and
 * FRAME_X on multiples of 4, so every dither lines up with the canvas the same way it does at 256. */
export function snapWidth(w: number): number {
  return Math.max(BASE_W, Math.min(MAX_W, Math.round(w / 8) * 8));
}

/** Sets the screen width and the bands that follow from it. */
export function setScreenWidth(w: number): void {
  SCREEN_W = snapWidth(w);
  VIEW_W = Math.min(SCREEN_W, CLEAR_MAX);
  VIEW_X = (SCREEN_W - VIEW_W) / 2;
  FRAME_X = (SCREEN_W - BASE_W) / 2;
  VIEW_TOP = SCREEN_W > BASE_W ? STRIP_H + HUD_PAD_Y * 2 : STRIP_H;
}
export const TILE = 16;
export const FPS = 60;

export const CHAR_NAMES: Record<CharId, string> = {
  mike: 'Mike',
  dustin: 'Dustin',
  lucas: 'Lucas',
  eleven: 'Eleven',
  will: 'Will',
  joyce: 'Joyce',
  max: 'Max',
  steve: 'Steve',
  hopper: 'Hopper',
  robin: 'Robin',
  nancy: 'Nancy',
  erica: 'Erica',
};
