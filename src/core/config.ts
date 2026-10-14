import type { CharId } from './types.ts';

export const SCREEN_W = 256;
export const SCREEN_H = 224;
export const TILE = 16;
export const FPS = 60;
/** The HUD strip covers the top of the screen. The world is visible below this line. */
export const VIEW_TOP = 20;

export const CHAR_NAMES: Record<CharId, string> = {
  mike: 'Mike',
  dustin: 'Dustin',
  lucas: 'Lucas',
  eleven: 'Eleven',
  will: 'Will',
  joyce: 'Joyce',
  max: 'Max',
};
