import { SCREEN_W, SCREEN_H, VIEW_TOP } from './config.ts';

/** Top-left of the view in world px. The visible world is SCREEN_W by (SCREEN_H - VIEW_TOP). */
export interface Camera { x: number; y: number }

const VIEW_H = SCREEN_H - VIEW_TOP;

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

function target(fx: number, fy: number, mapW: number, mapH: number): Camera {
  let x = fx - SCREEN_W / 2;
  let y = fy - VIEW_H / 2;
  x = mapW <= SCREEN_W ? (mapW - SCREEN_W) / 2 : Math.max(0, Math.min(mapW - SCREEN_W, x));
  y = mapH <= VIEW_H ? (mapH - VIEW_H) / 2 : Math.max(0, Math.min(mapH - VIEW_H, y));
  return { x, y };
}

/** Jump straight to the focus point. */
export function cameraSnap(cam: Camera, fx: number, fy: number, mapW: number, mapH: number): void {
  const t = target(fx, fy, mapW, mapH);
  cam.x = Math.round(t.x);
  cam.y = Math.round(t.y);
}

/** Ease toward the focus point. Positions stay whole pixels so tiles never shimmer. */
export function cameraFollow(cam: Camera, fx: number, fy: number, mapW: number, mapH: number, k = 0.14): void {
  const t = target(fx, fy, mapW, mapH);
  cam.x = Math.round(cam.x + (t.x - cam.x) * k);
  cam.y = Math.round(cam.y + (t.y - cam.y) * k);
}
