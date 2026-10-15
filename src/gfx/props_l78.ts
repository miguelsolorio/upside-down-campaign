// Props of levels 7 and 8 (docs/level-7.md, docs/level-8.md): the shutter, the cipher door, the power box, the breaker and the toppled
// kiosk. Each is cached static art repainted at night like any prop, with the live parts (sparks) drawn over it from PropView.t and k
// alone, so a prop is a pure function of its view. The art is built by pure functions that return a Px, so Node can run them.
//
// shutter: a rolling security grille across a concourse, w by h (48 by 16): a housing with a neon tube along the top, a lattice of
//   steel, a rail with locks along the bottom. Shut it fills the opening. Open it has rolled up into the housing, and for the first 18
//   frames after it opens (PropView.t) it is on its way.
// cipher: a steel door with a keypad and a line of Cyrillic on a screen, 32 by 16 across a corridor that runs north and south (16 by
//   32 across one that runs east and west, the word on two lines). PropView.k is how far it is decoded: the letters turn to English one
//   by one, amber to cyan, with a bar under them that fills. Open it has slid into the wall and left a stub (18 frames).
// powerbox: a 32 by 32 floor plate with a hazard border, a bolt, and when lit (30 frames) the bolt white with arcs jumping to its corners.
// breaker: a wall switch, 16 by 16: down in a red housing when closed, thrown up and sparking when lit.
// crate wider than a crate (32 by 16 in the mall): a kiosk on its side across a shop door, in the mall's pink and purple.
import type { PropView } from '../core/types.ts';
import { TINY_GLYPHS } from './data/font.ts';
import { hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { ArtFn } from './props_lab2.ts';
import { bolt, CYR, dots, hazard, keypad } from './paint_kit.ts';
import { transposed } from './tile_lab.ts';

/** Frames the shutter takes to roll up, and the cipher door to slide open. */
export const ROLL_FRAMES = 18, SLIDE_FRAMES = 18;
const ROLL_STEPS = 6;
const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- shutter
/** The shutter w by h, laid out across; `rise` is how much of it has rolled up, 0 shut to 1 gone into the housing. Taller than wide it is turned a quarter. */
export function shutterArt(w: number, h: number, rise: number): Px {
  const horiz = w >= h;
  const L = horiz ? w : h, T = horiz ? h : w;
  const px = new Px(L, T);
  const low = Math.round(4 + (T - 4) * (1 - clamp(rise)));
  // The housing: a roll of steel with a neon tube along it.
  px.rect(0, 0, L, 4, 'grey2').rect(0, 0, L, 1, 'grey3').rect(0, 3, L, 1, 'ink');
  for (let x = 2; x < L - 2; x++) if (x % 6 < 4) px.set(x, 2, 'magenta');
  if (low > 4) {
    // The lattice: diagonal steel strands over the dark, a rail at the foot with a lock at each end and in the middle.
    for (let y = 4; y < low; y++) for (let x = 0; x < L; x++) px.set(x, y, (x + y) % 4 === 0 || (x - y + 64) % 4 === 0 ? 'grey3' : 'ink');
    px.rect(0, 4, 2, low - 4, 'grey2').rect(L - 2, 4, 2, low - 4, 'grey2');
    if (low >= 8) {
      px.rect(0, low - 3, L, 3, 'grey3').rect(0, low - 3, L, 1, 'bone').rect(0, low - 1, L, 1, 'grey1');
      for (const x of [3, L >> 1, L - 5]) px.rect(x, low - 3, 2, 2, 'yellow');
    }
  }
  return horiz ? px : transposed(px);
}

// ---------------------------------------------------------------- cipher
const WORD = 'СТОП', ENGLISH = 'STOP';

/** One 3 by 5 glyph from a table of rows joined by '/' or a list of rows. */
function glyph(px: Px, x: number, y: number, rows: readonly string[], col: ColorName): void {
  rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') px.set(x + i, y + j, col); });
}
const latin = (ch: string): string[] => (TINY_GLYPHS[ch] as string).split('/');

/** Four letters at (x, y) with `done` of them already English (cyan), the rest still Cyrillic (amber). Two lines of two when `stack` is set. */
function word(px: Px, x: number, y: number, done: number, stack: boolean): void {
  for (let i = 0; i < 4; i++) {
    const ox = stack ? x + (i & 1) * 4 : x + i * 4, oy = stack ? y + (i >> 1) * 6 : y;
    if (i < done) glyph(px, ox, oy, latin(ENGLISH[i] as string), 'cyan');
    else glyph(px, ox, oy, CYR[WORD[i] as string] as string[], 'amber');
  }
}

/** The cipher door at its size, decoded by k (0 to 1): how many letters have turned and how much of the bar is filled. */
export function cipherArt(w: number, h: number, k: number): Px {
  const done = Math.min(4, Math.floor(clamp(k) * 4 + 1e-9)), fill = clamp(k);
  if (w >= h) {
    const px = new Px(w, h).fill('grey3');
    px.frame(0, 0, w, h, 'ink');
    dots(px, [[2, 2], [w - 4, 2], [2, h - 3], [w - 4, h - 3]], 'grey1');
    px.rect(2, 3, 18, 9, 'sand').frame(2, 3, 18, 9, 'soil3').rect(3, 4, 16, 7, 'ink');
    word(px, 3, 5, done, false);
    px.rect(3, 11, 16, 1, 'blood1').rect(3, 11, Math.round(16 * fill), 1, 'cyan');
    keypad(px, 21, 1, 'sand', 'soil3', 'amber', 'red');
    for (let y = 0; y < h; y++) px.set(w - 3 + (y & 1), y, 'yellow').set(w - 2 - (y & 1), y, 'ink');
    return px;
  }
  const px = new Px(w, h).fill('grey3');
  px.frame(0, 0, w, h, 'ink');
  dots(px, [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]], 'grey1');
  px.rect(2, 3, w - 4, 14, 'sand').frame(2, 3, w - 4, 14, 'soil3').rect(3, 4, w - 6, 12, 'ink');
  word(px, 4, 5, done, true);
  px.rect(3, 17, w - 6, 1, 'blood1').rect(3, 17, Math.round((w - 6) * fill), 1, 'cyan');
  keypad(px, 3, 18, 'sand', 'soil3', 'amber', 'red');
  for (let x = 0; x < w; x++) px.set(x, h - 2 + (x & 1), 'yellow').set(x, h - 1 - (x & 1), 'ink');
  return px;
}

// ---------------------------------------------------------------- power box, breaker
/** The floor plate, 32 by 32: a hazard border round a plate with a bolt in it. Lit, the bolt is white and arcs jump to the corners. */
export function powerboxArt(lit: boolean): Px {
  const px = new Px(32);
  hazard(px, 0, 0, 32, 32, 4, 'orange', 'ink');
  px.rect(4, 4, 24, 24, 'grey2').frame(4, 4, 24, 24, 'ink').frame(6, 6, 20, 20, 'grey1');
  dots(px, [[8, 8], [23, 8], [8, 23], [23, 23]], 'sand');
  bolt(px, 13, 12, lit ? 'white' : 'orange');
  if (lit) {
    px.line(7, 10, 11, 14, 'yellow').line(24, 9, 21, 13, 'yellow').line(8, 24, 12, 20, 'yellow').line(23, 24, 20, 19, 'yellow');
    dots(px, [[10, 9], [22, 12], [9, 21], [21, 23]], 'white');
  }
  return px;
}

/** The switch on the wall, 16 by 16: a red housing with the lever down and a red knob, or thrown up with sparks. */
export function breakerArt(lit: boolean): Px {
  const px = new Px(16);
  px.rect(2, 1, 12, 14, 'blood0').frame(2, 1, 12, 14, 'ink');
  px.rect(4, 3, 8, 2, 'sand').rect(4, 11, 8, 2, 'sand').rect(7, 5, 2, 6, 'ink');
  if (lit) { px.rect(7, 3, 2, 5, 'amber').rect(6, 3, 4, 2, 'red'); dots(px, [[4, 6], [11, 5], [5, 9], [11, 8]], 'yellow'); px.set(12, 7, 'white'); }
  else { px.rect(7, 7, 2, 5, 'amber').rect(6, 10, 4, 2, 'red'); }
  return px;
}

// ---------------------------------------------------------------- kiosk
/** A mall kiosk on its side across a shop door, w by h (32 by 16): a striped awning, a purple counter, a sign, two small wheels, a little spilled. Smashed, a heap of purple and pink. */
export function kioskArt(w: number, h: number, broken: boolean): Px {
  const px = new Px(w, h);
  if (broken) {
    px.rect(2, h - 3, w - 4, 3, 'purple0');
    for (let i = 0; i < 9; i++) { const x = 2 + hash2(i, w, 61) % (w - 7), y = h - 7 + hash2(i, h, 62) % 5; px.rect(x, y, 4, 1, i & 1 ? 'magenta' : 'purple'); }
    dots(px, [[6, h - 8], [w - 9, h - 9], [w >> 1, h - 6]], 'yellow');
    return px.outline('ink');
  }
  px.rect(1, 2, w - 2, 5, 'magenta');
  for (let x = 1; x < w - 1; x += 4) px.rect(x, 2, 2, 5, 'pink');
  px.rect(1, 2, w - 2, 1, 'white').rect(1, 6, w - 2, 1, 'purple');
  px.rect(2, 7, w - 4, h - 11, 'purple0').rect(2, 7, w - 4, 1, 'purple');
  px.rect(5, 9, 11, 3, 'ink').frame(5, 9, 11, 3, 'yellow');
  dots(px, [[8, 10], [11, 10], [14, 10]], 'cyan');
  px.rect(w - 11, 9, 8, 3, 'night').frame(w - 11, 9, 8, 3, 'purple');
  for (const cx of [6, w - 7]) px.disc(cx + 0.5, h - 2.5, 2.2, 'ink').disc(cx + 0.5, h - 2.5, 1, 'grey3');
  dots(px, [[w - 3, h - 2], [w - 1, h - 3]], 'yellow');
  return px.outline('ink');
}

// ---------------------------------------------------------------- public
/** Draws a shutter, cipher door, power box or breaker. Returns false for any other kind. */
export function drawL78Prop(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  switch (v.kind) {
    case 'shutter': {
      const open = v.state === 'open';
      const step = open ? Math.min(ROLL_STEPS, Math.round(clamp(v.t / ROLL_FRAMES) * ROLL_STEPS)) : 0;
      ctx.drawImage(art(`shutter${w}x${h}:${step}`, () => shutterArt(w, h, step / ROLL_STEPS)), x, y);
      return true;
    }
    case 'cipher': {
      const open = v.state === 'open';
      const k = open ? 1 : Math.round(clamp(v.k ?? 0) * 16) / 16;
      const body = art(`cipher${w}x${h}:${k}`, () => cipherArt(w, h, k));
      if (!open) { ctx.drawImage(body, x, y); return true; }
      // Slid into the wall: the leaf goes back along the door, leaving the stub of its edge.
      const horiz = w >= h, L = horiz ? w : h, stub = 6;
      const shift = Math.round((L - stub) * clamp(v.t / SLIDE_FRAMES));
      if (L - shift > 0) {
        if (horiz) ctx.drawImage(body, shift, 0, L - shift, h, x, y, L - shift, h);
        else ctx.drawImage(body, 0, shift, w, L - shift, x, y, w, L - shift);
      }
      return true;
    }
    case 'powerbox': {
      const lit = v.state === 'lit';
      ctx.drawImage(art(`powerbox${lit}`, () => powerboxArt(lit)), x + ((w - 32) >> 1), y + ((h - 32) >> 1));
      if (lit && !calm) {
        const bx = x + ((w - 32) >> 1), by = y + ((h - 32) >> 1);
        for (let i = 0; i < 4; i++) {
          const k = hash2(i, v.t >> 1, 71), cx = bx + 6 + (k % 20), cy = by + 6 + ((k >> 8) % 20);
          rect(ctx, cx, cy, 1, 1, i & 1 ? 'white' : 'yellow');
        }
      }
      return true;
    }
    case 'breaker': {
      const lit = v.state === 'lit' || v.state === 'open';
      const cx = x + ((w - 16) >> 1), cy = y + (h - 16);
      ctx.drawImage(art(`breaker${lit}`, () => breakerArt(lit)), cx, cy);
      if (lit && !calm && v.t < 300) {
        const k = hash2(v.t >> 1, 3, 81);
        rect(ctx, cx + 3 + (k % 10), cy + 2 + ((k >> 6) % 8), 1, 1, k & 1 ? 'white' : 'yellow');
      }
      return true;
    }
    default: return false;
  }
}
