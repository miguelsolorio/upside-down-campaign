// How big the canvas is for a window. Pure, so Node can test it.
import { SCREEN_H, snapWidth } from './config.ts';

export interface Fit {
  /** Screen width in game px. The height is always SCREEN_H. */
  w: number;
  /** Whole-number scale the game is blown up by, with no smoothing, before the browser fits it to the window. */
  k: number;
  /** The canvas's size on the page in CSS px. */
  cssW: number;
  cssH: number;
}

/** Browsers refuse canvases bigger than this (Safari's limit), so k stops short of it. */
const MAX_AREA = 16_777_216;

/**
 * The screen is SCREEN_H tall and as wide as the window's shape asks, so it fills the window. The game is drawn at
 * 1x, scaled up k times with hard pixel edges, and then the browser scales that the last small step to the window.
 * Every game pixel comes out the same size, which a fractional scale with hard edges can't do. A window narrower than
 * BASE_W by SCREEN_H, or wider than MAX_W, gets bars. `lockW` pins the width, for the dev scenes drawn at 256.
 */
export function fitScreen(winW: number, winH: number, dpr: number, lockW?: number): Fit {
  if (winW <= 0 || winH <= 0) return { w: lockW ?? snapWidth(0), k: 1, cssW: 0, cssH: 0 };
  const ideal = (SCREEN_H * winW) / winH;
  const w = lockW ?? snapWidth(ideal);
  // Snapping to a multiple of 8 leaves the shape off by up to 4 px. Stretching that much (under 2%) can't be seen.
  const exact = lockW === undefined && Math.abs(w - ideal) <= 4;
  const s = Math.min(winW / w, winH / SCREEN_H);
  const px = (v: number): number => Math.round(v * dpr) / dpr;
  const cssW = exact ? winW : px(w * s);
  const cssH = exact ? winH : px(SCREEN_H * s);
  const dev = Math.max(cssW / w, cssH / SCREEN_H) * dpr;
  const cap = Math.max(1, Math.floor(Math.sqrt(MAX_AREA / (w * SCREEN_H))));
  const k = Math.min(cap, Math.max(1, Math.ceil(dev - 1e-6)));
  return { w, k, cssW, cssH };
}
