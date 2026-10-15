// Design 5, "Joyce's wall": the still layers. Wallpaper, baseboard, floor and runner, the string and its lit and dark bulbs,
// and the painted words. Built once per set of node states and cached by v5.ts.
import type { NodeState } from '../../core/mapdata.ts';
import { Px } from '../px.ts';
import { ctx2d } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawTinyText } from '../font.ts';
import { BULB, FILLER, FLOOR_Y, NAIL_X, NAIL_Y, bigBulb, bulbX, bulbY, haloSprite, paint, poolSprite, smallBulb, wireY } from './v5_art.ts';
import type { ColorName } from '../palette.ts';

export const WALL_TOP = 16, WALL_BOTTOM = 118, FLOOR_TOP = 125, BAND_Y = 176;
export const RUNNER = { x0: 8, x1: 248, y0: FLOOR_Y - 8, y1: FLOOR_Y + 8 };
/** Filler bulbs along swag i sit at these fractions of its width; the big bulb takes the middle. */
export const FILLER_AT = [0.1, 0.2, 0.31, 0.69, 0.8, 0.9];

export interface Wall { under: HTMLCanvasElement; labels: HTMLCanvasElement }

export const fillerPos = (i: number, k: number): { x: number; y: number } => {
  const x = Math.round((NAIL_X[i] as number) + (FILLER_AT[k] as number) * ((NAIL_X[i + 1] as number) - (NAIL_X[i] as number))) - 2;
  return { x, y: Math.round(wireY(x + 2)) + 1 };
};

function wallpaper(P: Px): void {
  for (let y = WALL_TOP; y < WALL_BOTTOM; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x + (((y >> 3) & 1) * 4)) & 7, v = y & 7;
      const motif = (u === 4 && v >= 3 && v <= 5) || (v === 4 && (u === 3 || u === 5));
      P.set(x, y, motif ? 'soil2' : 'soil3');
    }
  }
}

function room(P: Px): void {
  wallpaper(P);
  // Baseboard.
  P.rect(0, WALL_BOTTOM, 256, 1, 'ink'); P.rect(0, WALL_BOTTOM + 1, 256, 1, 'sand'); P.rect(0, WALL_BOTTOM + 2, 256, 3, 'soil3');
  P.rect(0, WALL_BOTTOM + 5, 256, 1, 'soil2'); P.rect(0, WALL_BOTTOM + 6, 256, 1, 'ink');
  // Floorboards.
  for (let y = FLOOR_TOP; y < BAND_Y; y++) {
    const r = y - FLOOR_TOP, row = (r / 6) | 0;
    for (let x = 0; x < 256; x++) {
      let c: ColorName = r % 6 === 5 ? 'soil1' : 'soil2';
      if (r % 6 === 0 && ((x + row * 7) & 3) === 0) c = 'soil3';
      if (r % 6 < 5 && ((x + row * 53) % 97) === 0) c = 'soil1';
      if (r % 6 < 5 && (x + row * 61) % 83 === 0 && r % 6 === 2) c = 'soil3';
      P.set(x, y, c);
    }
    // The ends of boards, staggered from row to row.
    for (let x = (row * 37) % 71; x < 256; x += 71) P.rect(x, y, 1, r % 6 === 5 ? 1 : 5, 'soil1');
  }
  for (let x = 0; x < 256; x++) { P.set(x, FLOOR_TOP, ((x & 1) === 0) ? 'ink' : 'soil1'); if ((x & 1) === 0) P.set(x, FLOOR_TOP + 1, 'soil1'); }
}

function runner(P: Px, reachX: number): void {
  const { x0, x1, y0, y1 } = RUNNER;
  P.rect(x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 3, 'ink');
  for (let y = y0; y <= y1; y++) {
    const r = y - y0;
    for (let x = x0; x <= x1; x++) {
      let c: ColorName = 'blood1';
      if (r < 2 || r > 14) c = 'blood0';
      else if (r === 2 || r === 14) c = (x & 1) === 0 ? 'cream' : 'blood0';
      if (x < x0 + 2 || x > x1 - 2) c = 'blood0';
      P.set(x, y, c);
    }
  }
  // A string of diamonds down the middle.
  for (let cx = x0 + 14; cx < x1 - 8; cx += 18) {
    for (let j = -4; j <= 4; j++) for (let i = -6; i <= 6; i++) {
      const d = Math.abs(i) / 1.5 + Math.abs(j);
      if (d <= 4) P.set(cx + i, y0 + 8 + j, d <= 1.5 ? 'cream' : d <= 3 ? 'blood0' : 'rose');
    }
  }
  // Fringe.
  for (let y = y0; y <= y1; y += 2) { P.rect(x0 - 4, y, 3, 1, 'cream'); P.rect(x1 + 2, y, 3, 1, 'cream'); }
  // The runner beyond the last open stage is in the dark.
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = Math.max(x0 - 1, reachX + 17); x <= x1 + 1; x++) if (((x + y) & 1) === 0) P.set(x, y, 'ink');
}

function clock(P: Px, cx: number, cy: number): void {
  P.disc(cx, cy, 10, 'ink'); P.disc(cx, cy, 9, 'soil1'); P.disc(cx, cy, 7.5, 'sand');
  for (const [x, y] of [[0, -6], [6, 0], [0, 6], [-6, 0]] as const) P.set(cx + x, cy + y, 'soil1');
  P.line(cx, cy, cx - 3, cy - 3, 'ink'); P.line(cx, cy, cx + 1, cy - 5, 'ink'); P.set(cx, cy, 'hot');
}

function framed(P: Px, x: number, y: number): void {
  P.rect(x - 1, y - 1, 30, 22, 'ink'); P.rect(x, y, 28, 20, 'soil1'); P.rect(x + 3, y + 3, 22, 14, 'sky');
  P.rect(x + 3, y + 11, 22, 6, 'pine2'); P.rect(x + 3, y + 11, 22, 1, 'pine3');
  P.rect(x + 16, y + 5, 2, 2, 'yellow');
  P.rect(x + 6, y + 8, 6, 4, 'soil3'); P.rect(x + 5, y + 7, 8, 1, 'red'); P.rect(x + 6, y + 6, 6, 1, 'red'); P.rect(x + 8, y + 10, 2, 2, 'soil1');
  P.rect(x + 3, y + 3, 22, 1, 'blue');
}

export function buildWall(states: NodeState[], places: string[]): Wall {
  const P = new Px(256, 224).fill('ink');
  room(P);
  clock(P, 232, 36);
  framed(P, 20, 90);
  const reach = states.reduce((n, s, i) => (s === 'locked' ? n : i), 0);
  runner(P, bulbX(reach));
  for (let i = 0; i < 6; i++) {
    const s = states[i] as NodeState, c = BULB[i] as ColorName;
    if (s === 'cleared') { P.blit(poolSprite(c, true), bulbX(i) - 19, FLOOR_Y - 6); P.blit(haloSprite(c, 15, true), bulbX(i) - 15, bulbY(i) - 7); }
    if (s !== 'locked') for (let k = 0; k < 6; k++) { const f = fillerPos(i, k); P.blit(haloSprite(FILLER[(i * 2 + k) % 4] as ColorName, 6, false), f.x - 4, f.y - 3); }
  }
  // The wire, a column at a time so that steep stretches stay joined.
  let prev = Math.round(wireY(0));
  for (let x = 0; x < 256; x++) {
    const y = Math.round(wireY(x));
    for (let yy = Math.min(prev, y); yy <= Math.max(prev, y); yy++) P.set(x, yy, 'ink');
    prev = y;
  }
  for (let k = 1; k < 6; k++) {
    const x = NAIL_X[k] as number, y = NAIL_Y[k] as number;
    P.rect(x - 1, y - 2, 3, 3, 'ink'); P.set(x, y - 1, 'grey3');
  }

  const under = P.toCanvas();
  const g = ctx2d(under);
  for (let i = 0; i < 6; i++) {
    const s = states[i] as NodeState;
    for (let k = 0; k < 6; k++) {
      const f = fillerPos(i, k);
      if (s !== 'open') g.drawImage(smallBulb(FILLER[(i * 2 + k) % 4] as ColorName, s === 'cleared' ? 2 : 0), f.x, f.y);
    }
  }
  for (let i = 0; i < 6; i++) {
    const s = states[i] as NodeState;
    if (s !== 'open') g.drawImage(bigBulb(BULB[i] as ColorName, s === 'cleared' ? 2 : 0), bulbX(i) - 4, bulbY(i) - 1);
  }

  const labels = ctx2d(document.createElement('canvas'));
  labels.canvas.width = 256; labels.canvas.height = 224;
  const lg: Ctx = labels;
  for (let i = 0; i < 6; i++) {
    const bx = bulbX(i), by = bulbY(i);
    paint(lg, (places[i] as string).toUpperCase(), bx, by + 14, i);
    drawTinyText(lg, `${i < 3 ? 1 : 2}`, bx - 4, by - 10, 'black');
    lg.fillStyle = '#000000'; lg.fillRect(bx, by - 6, 1, 1);
    drawTinyText(lg, `${[1, 2, 3, 1, 2, 3][i]}`, bx + 2, by - 10, 'black');
  }
  return { under, labels: labels.canvas };
}
