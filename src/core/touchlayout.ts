// Where the game and the on-screen controls go on a touch screen. Pure, so Node can test it.
// Everything here is in CSS px. Portrait puts the game at the top and the controls in a band under it.
// Landscape puts the game in the middle, the stick on the left and the buttons on the right.
// The controls never sit on the game, so a tap on the game is always a tap on the game.
import { SCREEN_H, SCREEN_W } from './config.ts';
import type { Vec2 } from './types.ts';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Insets { t: number; r: number; b: number; l: number }
export interface Viewport { w: number; h: number; dpr: number; safe?: Insets }

export type TouchButton = 'a' | 'b' | 'burst' | 'swapPrev' | 'swapNext' | 'skip' | 'pause';
export const TOUCH_BUTTONS: readonly TouchButton[] = ['a', 'b', 'burst', 'swapPrev', 'swapNext', 'skip', 'pause'];

export interface TouchLayout {
  orientation: 'portrait' | 'landscape';
  /** CSS px per game px. */
  scale: number;
  dpr: number;
  viewport: { w: number; h: number };
  /** The part of the screen clear of notches, rounded corners and the home bar. */
  safe: Rect;
  game: Rect;
  /** A thumb that lands anywhere in here grabs the stick. */
  stickZone: Rect;
  /** The center of the stick's ring. The ring stays here, and only the knob moves. */
  stickRest: Vec2;
  /** Radius of the stick's base, in CSS px. */
  stickR: number;
  /** Each button's touch target. */
  buttons: Record<TouchButton, Rect>;
}

/** The smallest touch target, in CSS px. */
export const TARGET = 44;
export const STICK_R = 44;
/** A and B. */
const FACE = 60;
const ARROW = 44;
const BURST = 48;
const PILL = { w: 64, h: TARGET };
const GAP = 8;
/** The back swipe on iOS and Android starts at the left edge, so the stick stays this far in. */
export const EDGE = 20;
/** Room under the controls for the thumb's heel, and over the home bar. */
const FOOT = 20;

/** The right cluster: swap arrows and burst on top, then B low and A high, as on a Game Boy. */
const CLUSTER_W = 148;
const FACE_DROP = 24;
const CLUSTER_H = TARGET + 12 + FACE + FACE_DROP;
/** SKIP and PAUSE side by side, like Select and Start. */
const PILLS_W = PILL.w * 2 + GAP;

/** Under this share of the fractional size, a crisp whole-device-pixel scale isn't worth it. */
const CRISP_KEEP = 0.88;

/** Largest scale at or under `raw` that maps each game pixel to a whole number of device pixels, if that fills enough. */
export function crispScale(raw: number, dpr: number): number {
  const crisp = Math.floor(raw * dpr) / dpr;
  if (crisp > 0 && crisp >= raw * CRISP_KEEP) return crisp;
  return Math.floor(raw * SCREEN_W * dpr) / (SCREEN_W * dpr);
}

export function layoutTouch(v: Viewport): TouchLayout {
  const ins = v.safe ?? { t: 0, r: 0, b: 0, l: 0 };
  const safe: Rect = { x: ins.l, y: ins.t, w: Math.max(0, v.w - ins.l - ins.r), h: Math.max(0, v.h - ins.t - ins.b) };
  const snap = (n: number): number => Math.round(n * v.dpr) / v.dpr;
  return v.h >= v.w ? portrait(v, safe, snap) : landscape(v, safe, snap);
}

function cluster(x: number, y: number): Pick<Record<TouchButton, Rect>, 'a' | 'b' | 'burst' | 'swapPrev' | 'swapNext'> {
  const faceY = y + TARGET + 12;
  return {
    swapPrev: { x, y, w: ARROW, h: TARGET },
    swapNext: { x: x + ARROW + 6, y, w: ARROW, h: TARGET },
    burst: { x: x + CLUSTER_W - BURST, y, w: BURST, h: TARGET },
    b: { x, y: faceY + FACE_DROP, w: FACE, h: FACE },
    a: { x: x + CLUSTER_W - FACE, y: faceY, w: FACE, h: FACE },
  };
}

function pills(x: number, y: number): Pick<Record<TouchButton, Rect>, 'skip' | 'pause'> {
  return {
    skip: { x, y, ...PILL },
    pause: { x: x + PILL.w + GAP, y, ...PILL },
  };
}

function gameRect(scale: number, x: number, y: number, snap: (n: number) => number): Rect {
  return { x: snap(x), y: snap(y), w: SCREEN_W * scale, h: SCREEN_H * scale };
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

function stickRestIn(zone: Rect, y: number): Vec2 {
  return {
    x: clamp(zone.x + zone.w / 2, zone.x + STICK_R, zone.x + zone.w - STICK_R),
    y: clamp(y, zone.y + STICK_R, zone.y + zone.h - STICK_R),
  };
}

/** Game on top, then a row with SKIP and PAUSE, then the stick on the left and the cluster on the right. */
function portrait(v: Viewport, safe: Rect, snap: (n: number) => number): TouchLayout {
  const band = TARGET + GAP + CLUSTER_H + FOOT + GAP;
  const raw = Math.min(safe.w / SCREEN_W, Math.max(0, safe.h - band) / SCREEN_H);
  const scale = crispScale(raw, v.dpr);
  const gw = SCREEN_W * scale;
  const game = gameRect(scale, safe.x + (safe.w - gw) / 2, safe.y, snap);
  const bottom = safe.y + safe.h;
  const right = safe.x + safe.w;

  const top = game.y + game.h + GAP;
  const pillRow = pills(snap(safe.x + (safe.w - PILLS_W) / 2), snap(top));
  const below = top + TARGET + GAP;
  const cy = snap(clamp(bottom - FOOT - CLUSTER_H, below, bottom - CLUSTER_H));
  const cx = snap(right - CLUSTER_W - 16);
  const zoneX = Math.max(safe.x, EDGE);
  const stickZone: Rect = { x: zoneX, y: below, w: Math.max(0, cx - GAP - zoneX), h: Math.max(0, bottom - below) };
  return {
    orientation: 'portrait', scale, dpr: v.dpr, viewport: { w: v.w, h: v.h }, safe, game,
    stickZone, stickRest: stickRestIn(stickZone, cy + CLUSTER_H - FACE), stickR: STICK_R,
    buttons: { ...cluster(cx, cy), ...pillRow },
  };
}

/** Game in the middle. SKIP and PAUSE top left with the stick under them, the cluster bottom right. */
function landscape(v: Viewport, safe: Rect, snap: (n: number) => number): TouchLayout {
  const side = CLUSTER_W + GAP * 2;
  const raw = Math.min(Math.max(0, safe.w - side * 2) / SCREEN_W, safe.h / SCREEN_H);
  const scale = crispScale(raw, v.dpr);
  const gw = SCREEN_W * scale;
  const gh = SCREEN_H * scale;
  const game = gameRect(scale, safe.x + (safe.w - gw) / 2, safe.y + (safe.h - gh) / 2, snap);
  const bottom = safe.y + safe.h;
  const right = safe.x + safe.w;

  const leftW = game.x - safe.x;
  const pillRow = pills(snap(safe.x + (leftW - PILLS_W) / 2), snap(safe.y + GAP));
  const below = safe.y + GAP + TARGET + GAP;
  const zoneX = Math.max(safe.x, EDGE);
  const stickZone: Rect = { x: zoneX, y: below, w: Math.max(0, game.x - GAP - zoneX), h: Math.max(0, bottom - below) };

  const rightX = game.x + game.w;
  const cx = snap(rightX + (right - rightX - CLUSTER_W) / 2);
  const cy = snap(clamp(bottom - FOOT - CLUSTER_H, safe.y + GAP, bottom - CLUSTER_H));
  return {
    orientation: 'landscape', scale, dpr: v.dpr, viewport: { w: v.w, h: v.h }, safe, game,
    stickZone, stickRest: stickRestIn(stickZone, cy + CLUSTER_H - FACE), stickR: STICK_R,
    buttons: { ...cluster(cx, cy), ...pillRow },
  };
}

/** The button under a point, or null. */
export function buttonAt(l: TouchLayout, x: number, y: number): TouchButton | null {
  for (const b of TOUCH_BUTTONS) if (inside(l.buttons[b], x, y)) return b;
  return null;
}

export function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
