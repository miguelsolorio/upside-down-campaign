// Mouse and touch positions in game pixels. Pure, so Node can test the scaling.
import { SCREEN_H, SCREEN_W } from './config.ts';
import type { Vec2 } from './types.ts';

/** The part of a DOMRect this needs. */
export interface ClientBox { left: number; top: number; width: number; height: number }

/** Maps a pointer position on the page to the game screen, SCREEN_W by SCREEN_H, or null outside the canvas.
 * The canvas is stretched to fit the window by CSS, so this divides by its drawn size instead of assuming a scale. */
export function clientToGame(clientX: number, clientY: number, box: ClientBox): Vec2 | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const x = ((clientX - box.left) / box.width) * SCREEN_W;
  const y = ((clientY - box.top) / box.height) * SCREEN_H;
  if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) return null;
  return { x, y };
}

/** A box in game px. */
export interface Rect { x: number; y: number; w: number; h: number }

export function inRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
}

/** The index of the first box that holds the point, or -1. A missing point or box never matches. */
export function hitIndex(boxes: readonly (Rect | null | undefined)[], p: Vec2 | null): number {
  if (!p) return -1;
  return boxes.findIndex((r) => !!r && inRect(p, r));
}
