// The title logo and Joyce's alphabet wall. Both flicker from t, and both go steady when Reduce flashing is on.
import { settings } from '../core/settings.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawIcon } from './ui.ts';
import { LOGO_ADVANCE, LOGO_H, LOGO_RECTS, LOGO_W } from './data/logo.ts';

const TITLE = 'STRANGER THINGS';
const SUB = 'THE UPSIDE DOWN CAMPAIGN';
const SCALE = 2;
const SPACE = 10;
const PAD = 4;
const CELL_W = LOGO_W * SCALE, CELL_H = LOGO_H * SCALE;

/** Width and height of the logo block in px, subtitle included. */
export const LOGO_SIZE = { w: 208, h: 34 };
/** Width and height of the alphabet wall in px. */
export const WALL_SIZE = { w: 156, h: 38 };

type State = 0 | 1 | 2;
const sprites = new Map<string, { face: HTMLCanvasElement; glow: HTMLCanvasElement }>();

function mask(ch: string): Px {
  const m = new Px(CELL_W, CELL_H);
  for (const [x, y, w, h] of LOGO_RECTS[ch] as number[][]) m.rect(x * SCALE, y * SCALE, w * SCALE, h * SCALE, 'white');
  return m;
}

function letter(ch: string, state: State): { face: HTMLCanvasElement; glow: HTMLCanvasElement } {
  const key = `${ch}${state}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const m = mask(ch);
  const W = CELL_W + PAD * 2, H = CELL_H + PAD * 2;
  const on = (x: number, y: number): boolean => m.get(x - PAD, y - PAD) !== 0;
  const face = new Px(W, H), glow = new Px(W, H);
  const body: ColorName = state === 1 ? 'blood1' : state === 2 ? 'hot' : 'red';
  const lit: ColorName = state === 1 ? 'red' : state === 2 ? 'pink' : 'hot';
  const shade: ColorName = state === 1 ? 'blood0' : 'blood1';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (on(x, y)) face.set(x, y, !on(x, y - 1) ? lit : !on(x + 1, y) || !on(x, y + 1) ? shade : body);
      else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) face.set(x, y, 'blood0');
    }
  }
  if (state !== 1) {
    const reach = state === 2 ? 4 : 3;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (on(x, y)) continue;
        let d = 9;
        for (let j = -reach; j <= reach && d > 2; j++) for (let i = -reach; i <= reach; i++) if (on(x + i, y + j)) { d = Math.min(d, Math.max(Math.abs(i), Math.abs(j))); }
        if (d === 2) glow.set(x, y, state === 2 || ((x + y) & 1) === 0 ? 'blood1' : 'blood0');
        else if (d === 3 && ((x + y) & 1) === 0) glow.set(x, y, state === 2 ? 'blood1' : 'blood0');
        else if (d === 4 && state === 2 && (x & 1) === 0 && (y & 1) === 0) glow.set(x, y, 'blood0');
      }
    }
  }
  const s = { face: face.toCanvas(), glow: glow.toCanvas() };
  sprites.set(key, s);
  return s;
}

function letterState(i: number, t: number): State {
  if (settings.reduceFlashing) return 0;
  const slice = (t / 5) | 0;
  const r = hash2(i, slice, 17) % 100;
  if ((t % 420) >= 300 && (t % 420) < 318 && ((i + ((t / 420) | 0) * 5) % 15) < 4) return 1;
  if (r === 0) return 1;
  if (r > 97) return 2;
  return 0;
}

/** Builds the letters in their steady state up front. */
export function warmLogo(): void {
  for (const ch of new Set(TITLE.replace(' ', ''))) letter(ch, 0);
}

/** Title logo, centered on cx with its top at y. t drives the flicker. */
export function drawLogo(ctx: Ctx, t: number, cx: number, y: number): void {
  let width = 0;
  for (const ch of TITLE) width += ch === ' ' ? SPACE : LOGO_ADVANCE * SCALE;
  width += CELL_W - LOGO_ADVANCE * SCALE;
  const x0 = Math.round(cx - width / 2), y0 = Math.round(y);
  const places: { ch: string; x: number; i: number }[] = [];
  let x = x0, i = 0;
  for (const ch of TITLE) {
    if (ch === ' ') { x += SPACE; i++; continue; }
    places.push({ ch, x, i });
    x += LOGO_ADVANCE * SCALE;
    i++;
  }
  for (const p of places) ctx.drawImage(letter(p.ch, letterState(p.i, t)).glow, p.x - PAD, y0 - PAD);
  for (const p of places) ctx.drawImage(letter(p.ch, letterState(p.i, t)).face, p.x - PAD, y0 - PAD);
  const sx = Math.round(cx - (SUB.length * 7 - 1) / 2), sy = y0 + CELL_H + 8;
  for (let k = 0; k < SUB.length; k++) {
    drawText(ctx, (SUB[k] as string), sx + k * 7 + 1, sy + 1, 'blood0');
    drawText(ctx, (SUB[k] as string), sx + k * 7, sy, 'bone');
  }
}

// ---------------------------------------------------------------- alphabet wall
const BULB_ID = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'] as const;
const LETTER_ON: ColorName[] = ['hot', 'yellow', 'leaf', 'sky'];
const HALO: ColorName[] = ['blood1', 'orange', 'pine1', 'dusk'];
const PITCH = 12, ROW_H = 21;

/** Joyce's alphabet wall: A to Z in two rows with a bulb under each letter. lit is the string of lit letters, for example "RUN". */
export function drawAlphabetWall(ctx: Ctx, x: number, y: number, lit: string, t: number): void {
  const on = lit.toUpperCase();
  x = Math.round(x); y = Math.round(y);
  for (let row = 0; row < 2; row++) {
    const ry = y + row * ROW_H;
    rect(ctx, x, ry + 9, PITCH * 13, 1, 'grey1');
    for (let col = 0; col < 13; col++) {
      const idx = row * 13 + col;
      const ch = String.fromCharCode(65 + idx);
      const cx = x + col * PITCH;
      const dip = !settings.reduceFlashing && (((t >> 2) + idx * 7) % 29) < 2;
      const isLit = on.includes(ch) && !dip;
      const k = idx & 3;
      if (isLit) {
        const hx = cx + 6, hy = ry + 11;
        for (let j = -9; j <= 9; j++) {
          for (let i = -9; i <= 9; i++) {
            const d2 = i * i + j * j;
            if (d2 < 30 || d2 > 81) continue;
            if (((i + j) & 1) === 0 && (d2 < 56 || ((i & 1) === 0 && (j & 1) === 0))) rect(ctx, hx + i, hy + j, 1, 1, HALO[k] as ColorName);
          }
        }
      }
      drawText(ctx, ch, cx + 3, ry, isLit ? (LETTER_ON[k] as ColorName) : 'slate');
      drawIcon(ctx, isLit ? BULB_ID[k] as typeof BULB_ID[number] : 'bulbOff', cx + 2, ry + 9, t + idx * 13);
    }
  }
}
