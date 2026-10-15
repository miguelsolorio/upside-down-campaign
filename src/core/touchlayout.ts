// Where the game and the on-screen controls go on a touch screen. Pure, so Node can test it.
// The phone is dressed as a Game Boy: the body fills the screen, the game sits in the bezel, and the D-pad, A, B,
// SELECT and START are where a Game Boy has them, plus a SWAP key over B and a d20 key over A.
// Portrait is the Game Boy as it is. Landscape lays the same parts out wide, the way a Game Boy Advance does.
// Everything here is in CSS px. The controls never sit on the game, so a tap on the game is always a tap on the game.
// While the controls show, the screen is BASE_W wide: the shell already takes the room around it.
import { BASE_W, SCREEN_H } from './config.ts';
import type { Vec2 } from './types.ts';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Insets { t: number; r: number; b: number; l: number }
export interface Viewport { w: number; h: number; dpr: number; safe?: Insets }

export type TouchButton = 'a' | 'b' | 'burst' | 'swap' | 'select' | 'start';
export const TOUCH_BUTTONS: readonly TouchButton[] = ['a', 'b', 'burst', 'swap', 'select', 'start'];

/** The parts of the body that are only drawn. The body itself is the whole viewport. */
export interface Shell {
  /** Radius of the body's bottom-right corner, the one round corner a Game Boy has. */
  corner: number;
  /** The y of the groove across the top, under the OFF·ON switch, or null when there is none (landscape). */
  groove: number | null;
  /** The dark frame around the screen. */
  bezel: Rect;
  /** Radius of the bezel's bottom-right corner. Its other corners are small. */
  bezelCorner: number;
  /** The band over the screen with the two stripes and the line of small text. */
  stripes: Rect;
  /** The battery light in the bezel's left margin, and whether its label fits under it. */
  led: { x: number; y: number; label: boolean };
  /** The name on the body: its left end, its baseline and its cap height. Null when there's no room. */
  logo: { x: number; y: number; size: number } | null;
  /** The box the speaker slots are drawn in, or null when there's no room. */
  grill: Rect | null;
}

export interface TouchLayout {
  orientation: 'portrait' | 'landscape';
  /** CSS px per game px. */
  scale: number;
  dpr: number;
  viewport: { w: number; h: number };
  /** The part of the screen clear of notches, rounded corners and the home bar. */
  safe: Rect;
  game: Rect;
  /** A thumb that lands anywhere in here grabs the D-pad. */
  dpadZone: Rect;
  /** The center of the D-pad's cross. */
  dpad: Vec2;
  /** From the cross's center to the end of an arm. */
  dpadR: number;
  /** Each button's touch target. The round ones are drawn inside theirs. */
  buttons: Record<TouchButton, Rect>;
  shell: Shell;
}

/** The smallest touch target, in CSS px. */
export const TARGET = 44;
const GAP = 8;
/** The back swipe on iOS and Android starts at the left edge, so the D-pad zone stays this far in. */
export const EDGE = 20;
/** Room under the controls for the thumb's heel, and over the home bar. */
const FOOT = 20;
/** SELECT and START, side by side. Each target holds its pill and the word under it. */
const PILL = { w: 64, h: TARGET };
const PILLS_GAP = 10;
const PILLS_W = PILL.w * 2 + PILLS_GAP;
/** From a small key down to the face button under it, with room for the key's word. */
const KEY_GAP = 16;
/** From the lowest of B and the D-pad down to SELECT and START. */
const PILLS_DROP = 12;

/** Under this share of the fractional size, a crisp whole-device-pixel scale isn't worth it. */
const CRISP_KEEP = 0.88;

/** Largest scale at or under `raw` that maps each game pixel to a whole number of device pixels, if that fills enough. */
export function crispScale(raw: number, dpr: number): number {
  const crisp = Math.floor(raw * dpr) / dpr;
  if (crisp > 0 && crisp >= raw * CRISP_KEEP) return crisp;
  return Math.floor(raw * BASE_W * dpr) / (BASE_W * dpr);
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** How big the controls are for a body `u` px across (portrait) or tall (landscape). Bigger than a Game Boy's, for thumbs.
 * Landscape passes a smaller `k`, since the controls there share the width with the screen. */
interface Parts {
  /** D-pad: center to the end of an arm. */
  r: number;
  /** A and B. */
  face: number;
  /** SWAP and the d20. */
  key: number;
  /** The gap between B and A. */
  split: number;
  /** How much lower B sits than A. */
  drop: number;
}
function parts(u: number, k = 1): Parts {
  const face = Math.round(clamp(u * 0.17 * k, 56, 84));
  return {
    r: Math.round(clamp(u * 0.18 * k, 60, 90)),
    face,
    key: Math.max(TARGET, Math.round(face * 0.72)),
    split: Math.round(face * 0.4),
    drop: Math.round(face * 0.42),
  };
}

/**
 * B low and A high, with SWAP over B and the d20 over A, so the four step down the same slant. `ax` is A's left edge and
 * `aTop` its top. The keys sit centered over their face buttons.
 */
function faceButtons(p: Parts, ax: number, aTop: number): Pick<Record<TouchButton, Rect>, 'a' | 'b' | 'burst' | 'swap'> {
  const bx = ax - p.split - p.face;
  const inset = (p.face - p.key) / 2;
  return {
    a: { x: ax, y: aTop, w: p.face, h: p.face },
    b: { x: bx, y: aTop + p.drop, w: p.face, h: p.face },
    burst: { x: ax + inset, y: aTop - KEY_GAP - p.key, w: p.key, h: p.key },
    swap: { x: bx + inset, y: aTop + p.drop - KEY_GAP - p.key, w: p.key, h: p.key },
  };
}

function pills(x: number, y: number): Pick<Record<TouchButton, Rect>, 'select' | 'start'> {
  return {
    select: { x, y, ...PILL },
    start: { x: x + PILL.w + PILLS_GAP, y, ...PILL },
  };
}

function gameRect(scale: number, x: number, y: number, snap: (n: number) => number): Rect {
  return { x: snap(x), y: snap(y), w: BASE_W * scale, h: SCREEN_H * scale };
}

/** The largest bottom-right radius that still keeps the screen's corner inside the bezel, with a little to spare. */
function bezelCorner(want: number, side: number, below: number): number {
  let r = Math.round(want);
  while (r > 6 && Math.hypot(r - side, r - below) > r - 4) r--;
  return Math.max(0, r);
}

export function layoutTouch(v: Viewport): TouchLayout {
  const ins = v.safe ?? { t: 0, r: 0, b: 0, l: 0 };
  const safe: Rect = { x: ins.l, y: ins.t, w: Math.max(0, v.w - ins.l - ins.r), h: Math.max(0, v.h - ins.t - ins.b) };
  const snap = (n: number): number => Math.round(n * v.dpr) / v.dpr;
  return v.h >= v.w ? portrait(v, safe, snap) : landscape(v, safe, snap);
}

/** A squeezed shell still gives the screen at least this share of the bezel's width before it stops squeezing. */
const SQUEEZE_FILL = 0.85;

/** The portrait shell's sizes at squeeze `k`, and the room they leave the screen. */
function fitPortrait(safe: Rect, k: number) {
  const u = safe.w;
  const p = parts(u, k);
  const top = Math.round(clamp(u * 0.05 * k, 12, 32));
  const margin = Math.round(clamp(u * 0.035, 10, 32));
  const side = Math.round(clamp(u * 0.05, 14, 44));
  const stripeH = Math.round(clamp(u * 0.055 * k, 16, 34));
  const below = Math.round(clamp(u * 0.07 * k, 18, 56));
  const logoH = Math.round(clamp(u * 0.1, 30, 64));
  // The controls, measured from the top of the SWAP and d20 row.
  const aTop = p.key + KEY_GAP;
  const bBottom = aTop + p.drop + p.face;
  const dpadY = aTop + (p.face + p.drop) / 2;
  const pillsTop = Math.max(bBottom, dpadY + p.r) + PILLS_DROP;
  const group = pillsTop + PILL.h;
  const roomW = safe.w - margin * 2 - side * 2;
  const roomH = safe.h - top - stripeH - below - logoH - group - FOOT - GAP;
  return { p, top, margin, side, stripeH, below, logoH, aTop, dpadY, pillsTop, group, roomW, roomH };
}

/**
 * Top to bottom: the groove under the OFF·ON switch, the bezel with the screen, the name, then the controls. The D-pad is
 * on the left, B and A on the right with their keys over them, SELECT and START low in the middle, the speaker low right.
 */
function portrait(v: Viewport, safe: Rect, snap: (n: number) => number): TouchLayout {
  // A short screen (a small phone with Safari's bars) drops the name, then squeezes the shell and the controls a
  // little, before it shrinks the game.
  let fit = fitPortrait(safe, 1);
  for (const k of [0.95, 0.9, 0.85]) {
    if (fit.roomH + fit.logoH >= (fit.roomW * SQUEEZE_FILL * SCREEN_H) / BASE_W) break;
    fit = fitPortrait(safe, k);
  }
  const { p, top, margin, side, stripeH, below, aTop, dpadY, pillsTop, group } = fit;
  const u = safe.w;
  let { logoH, roomH } = fit;
  const roomW = fit.roomW;
  // The screen fills the bezel across unless that leaves too little room under it. Then the name goes before the screen shrinks.
  if (roomH < (roomW * SCREEN_H) / BASE_W) {
    roomH += logoH;
    logoH = 0;
  }
  const scale = crispScale(Math.max(0, Math.min(roomW / BASE_W, roomH / SCREEN_H)), v.dpr);
  const gw = BASE_W * scale;
  const gh = SCREEN_H * scale;
  const bezel: Rect = { x: safe.x + margin, y: safe.y + top, w: safe.w - margin * 2, h: stripeH + gh + below };
  const game = gameRect(scale, bezel.x + (bezel.w - gw) / 2, bezel.y + stripeH, snap);
  const left = game.x - bezel.x;

  // Whatever height is spare goes mostly over the controls and a little over SELECT and START.
  const bandTop = bezel.y + bezel.h + logoH;
  const bottom = safe.y + safe.h - FOOT;
  const spare = Math.max(0, bottom - bandTop - group);
  const y0 = bandTop + spare * 0.45;
  const lift = spare * 0.2;

  const right = safe.x + safe.w - Math.round(clamp(u * 0.07, 16, 48));
  const faces = faceButtons(p, snap(right - p.face), snap(y0 + aTop));
  const zoneX = Math.max(safe.x, EDGE);
  const dpad = { x: snap(clamp(safe.x + u * 0.25, zoneX + p.r + 6, faces.b.x - GAP - p.r - 4)), y: snap(y0 + dpadY) };
  const pillRow = pills(snap(clamp(safe.x + u * 0.45 - PILLS_W / 2, zoneX, safe.x + safe.w - PILLS_W)), snap(y0 + pillsTop + lift));
  const dpadZone: Rect = { x: zoneX, y: bandTop, w: Math.max(0, faces.b.x - GAP - zoneX), h: Math.max(0, pillRow.select.y - GAP - bandTop) };

  const grillX = pillRow.start.x + PILL.w + 14;
  const grillY = faces.b.y + p.face + 14;
  const grillB = safe.y + safe.h - 6;
  const grill = grillB - grillY >= 36 && right - grillX >= 48 ? { x: grillX, y: grillY, w: right + 8 - grillX, h: grillB - grillY } : null;

  return {
    orientation: 'portrait', scale, dpr: v.dpr, viewport: { w: v.w, h: v.h }, safe, game,
    dpadZone, dpad, dpadR: p.r,
    buttons: { ...faces, ...pillRow },
    shell: {
      corner: Math.round(clamp(u * 0.2, 40, 140)),
      groove: safe.y + top - 7,
      bezel,
      bezelCorner: bezelCorner(bezel.w * 0.13, left, below),
      stripes: { x: bezel.x, y: bezel.y, w: bezel.w, h: game.y - bezel.y },
      led: { x: bezel.x + left / 2, y: game.y + gh * 0.3, label: left >= 46 },
      logo: logoH > 0 ? { x: bezel.x + 2, y: bezel.y + bezel.h + logoH * 0.72, size: logoH * 0.42 } : null,
      grill,
    },
  };
}

/**
 * The screen in the middle in its bezel. The D-pad on the left with SELECT and START under it, B and A on the right with
 * their keys over them, and the speaker under those when there's room.
 */
function landscape(v: Viewport, safe: Rect, snap: (n: number) => number): TouchLayout {
  const u = safe.h;
  const p = parts(u, 0.88);
  const col = Math.max(p.r * 2, PILLS_W, p.face * 2 + p.split) + 20;
  const margin = Math.round(clamp(u * 0.025, 6, 20));
  const side = Math.round(clamp(u * 0.04, 10, 30));
  const stripeH = Math.round(clamp(u * 0.05, 16, 30));
  const below = Math.round(clamp(u * 0.05, 16, 40));

  const roomW = safe.w - col * 2 - side * 2;
  const roomH = safe.h - margin * 2 - stripeH - below;
  const scale = crispScale(Math.max(0, Math.min(roomW / BASE_W, roomH / SCREEN_H)), v.dpr);
  const gw = BASE_W * scale;
  const gh = SCREEN_H * scale;
  // The bezel hugs the screen and sits in the middle of the safe area.
  const bw = gw + side * 2;
  const bh = stripeH + gh + below;
  const bezel: Rect = { x: snap(safe.x + (safe.w - bw) / 2), y: snap(safe.y + (safe.h - bh) / 2), w: bw, h: bh };
  const game = gameRect(scale, bezel.x + side, bezel.y + stripeH, snap);
  const bottom = safe.y + safe.h;
  const right = safe.x + safe.w;

  // Left: the D-pad over SELECT and START, a little under the middle, where a thumb rests.
  const zoneX = Math.max(safe.x, EDGE);
  const leftMid = (safe.x + bezel.x) / 2;
  const groupH = p.r * 2 + PILLS_DROP + PILL.h;
  const groupTop = clamp(safe.y + (safe.h - groupH) * 0.6, safe.y + 4, bottom - FOOT / 2 - groupH);
  const dpad = { x: snap(clamp(leftMid, zoneX + p.r + 4, bezel.x - GAP - p.r)), y: snap(groupTop + p.r) };
  const pillRow = pills(snap(clamp(dpad.x - PILLS_W / 2, safe.x + 4, bezel.x - GAP - PILLS_W)), snap(groupTop + p.r * 2 + PILLS_DROP));
  const dpadZone: Rect = { x: zoneX, y: safe.y, w: Math.max(0, bezel.x - GAP - zoneX), h: Math.max(0, pillRow.select.y - GAP - safe.y) };

  // Right: B and A level with the D-pad, the keys over them.
  const rightMid = (bezel.x + bezel.w + right) / 2;
  const clusterW = p.face * 2 + p.split;
  const aTop = clamp(dpad.y - (p.face + p.drop) / 2, safe.y + 4 + p.key + KEY_GAP, bottom - FOOT / 2 - p.face - p.drop);
  const faces = faceButtons(p, snap(rightMid + clusterW / 2 - p.face), snap(aTop));

  const logoSize = Math.round(clamp(u * 0.032, 10, 18));
  const logoFits = dpad.y - p.r - safe.y >= logoSize * 2 + 12;
  const grillY = faces.b.y + p.face + 12;
  const grill = bottom - 4 - grillY >= 30 ? { x: faces.b.x, y: grillY, w: right - 6 - faces.b.x, h: bottom - 4 - grillY } : null;

  return {
    orientation: 'landscape', scale, dpr: v.dpr, viewport: { w: v.w, h: v.h }, safe, game,
    dpadZone, dpad, dpadR: p.r,
    buttons: { ...faces, ...pillRow },
    shell: {
      corner: Math.round(clamp(u * 0.22, 40, 120)),
      groove: null,
      bezel,
      bezelCorner: bezelCorner(bezel.w * 0.1, side, below),
      stripes: { x: bezel.x, y: bezel.y, w: bezel.w, h: game.y - bezel.y },
      led: { x: bezel.x + side / 2, y: game.y + gh * 0.3, label: side >= 46 },
      logo: logoFits ? { x: Math.max(zoneX, pillRow.select.x), y: safe.y + 10 + logoSize, size: logoSize } : null,
      grill,
    },
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
