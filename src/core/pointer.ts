// Mouse and touch positions in game pixels. Pure, so Node can test the scaling.
import { SCREEN_H, SCREEN_W } from './config.ts';
import type { Vec2 } from './types.ts';

/** The part of a DOMRect this needs. */
export interface ClientBox { left: number; top: number; width: number; height: number }

/** Maps a pointer position on the page to the 256 by 224 game screen, or null outside the canvas.
 * The canvas is scaled by CSS (a whole number of times when it fits, a fraction when the window is small),
 * so this divides by its drawn size instead of assuming a scale. */
export function clientToGame(clientX: number, clientY: number, box: ClientBox): Vec2 | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const x = ((clientX - box.left) / box.width) * SCREEN_W;
  const y = ((clientY - box.top) / box.height) * SCREEN_H;
  if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) return null;
  return { x, y };
}
