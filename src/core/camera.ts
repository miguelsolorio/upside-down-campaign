import { SCREEN_H, VIEW_TOP, VIEW_W, VIEW_X } from './config.ts';

/** The world px drawn at the left edge of the screen and at the top of the view, under the HUD strip. The camera
 * frames the clear band, VIEW_W wide and centered on the screen. A wider screen shows faded world on either side. */
export interface Camera { x: number; y: number }

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

function target(fx: number, fy: number, mapW: number, mapH: number): Camera {
  const VIEW_H = SCREEN_H - VIEW_TOP;
  let x = fx - VIEW_W / 2;
  let y = fy - VIEW_H / 2;
  x = mapW <= VIEW_W ? (mapW - VIEW_W) / 2 : Math.max(0, Math.min(mapW - VIEW_W, x));
  y = mapH <= VIEW_H ? (mapH - VIEW_H) / 2 : Math.max(0, Math.min(mapH - VIEW_H, y));
  return { x: x - VIEW_X, y };
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
