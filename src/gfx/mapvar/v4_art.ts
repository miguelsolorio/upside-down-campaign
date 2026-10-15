// Design 4, "Two Hawkins": the landmarks, each one bold shape drawn in code, and the recolors that turn a Hawkins landmark
// into its reflection in the Upside Down or into a greyed-out locked one.
import { Px } from '../px.ts';
import { PAL, COLOR_NAMES } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { px32 } from '../canvas.ts';

// ---------------------------------------------------------------- recolors
let names: Map<number, ColorName> | null = null;
function nameOf(v: number): ColorName | undefined {
  if (!names) { names = new Map(); for (const n of COLOR_NAMES) names.set(px32(n), n); }
  return names.get(v);
}
function luma(c: ColorName): number {
  const n = parseInt(PAL[c].slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

/** Recolors every opaque pixel in place. */
export function remap(p: Px, f: (c: ColorName) => ColorName): Px {
  for (let i = 0; i < p.d.length; i++) {
    const v = p.d[i] as number;
    if (!v) continue;
    const n = nameOf(v);
    if (n) p.d[i] = px32(f(n));
  }
  return p;
}

const GREYS: ColorName[] = ['ink', 'grey1', 'grey2', 'grey3', 'bone'];
const CUTS = [30, 85, 140, 205];
/** A locked place: the same shape in greys. */
export function grey(c: ColorName): ColorName {
  const l = luma(c);
  let k = 0;
  while (k < CUTS.length && l >= (CUTS[k] as number)) k++;
  return GREYS[k] as ColorName;
}

/** The same thing seen from the Upside Down: ink, purple and dried blood, with warm lights turned to embers. */
const UD: Partial<Record<ColorName, ColorName>> = {
  black: 'ink', ink: 'ink', night: 'ink', shadow: 'night', dusk: 'purple0', slate: 'purple0', mist: 'purple', bone: 'purple', white: 'pink',
  grey1: 'night', grey2: 'purple0', grey3: 'purple',
  pine0: 'ink', pine1: 'blood0', pine2: 'purple0', pine3: 'purple', leaf: 'purple',
  soil0: 'ink', soil1: 'blood0', soil2: 'blood1', soil3: 'rose', sand: 'rose',
  blood0: 'blood0', blood1: 'blood1', red: 'red', hot: 'hot', pink: 'pink', rose: 'rose',
  orange: 'red', amber: 'hot', yellow: 'hot', cream: 'pink',
  teal0: 'night', teal1: 'purple0', cyan: 'magenta', blue: 'purple0', sky: 'purple', purple0: 'purple0', purple: 'purple', magenta: 'magenta',
  skin0: 'pink', skin1: 'rose', skin2: 'blood1', skin3: 'blood0',
};
export const toUD = (c: ColorName): ColorName => UD[c] ?? 'purple0';

/** The ground itself, upside down: a dark ceiling with a violet lip, embers where the flowers were. */
const UD_LAND: Partial<Record<ColorName, ColorName>> = {
  leaf: 'purple', pine3: 'blood0', pine2: 'ink', pine1: 'night', pine0: 'ink',
  soil3: 'blood1', soil2: 'blood0', soil1: 'ink', soil0: 'ink', pink: 'pink', yellow: 'hot', white: 'pink',
};
export const toUDLand = (c: ColorName): ColorName => UD_LAND[c] ?? 'ink';

// ---------------------------------------------------------------- Mirkwood
/** One pine: tiers of needles, light on the left, shade on the right, a short trunk. */
export function pine(p: Px, cx: number, base: number, h: number, hw: number): void {
  const tiers = h >= 28 ? 4 : 3, trunk = 3, top = base - h, span = h - trunk;
  const step = span / (tiers + 0.7);
  p.rect(cx - 1, base - trunk, 2, trunk, 'soil1');
  p.set(cx - 1, base - trunk, 'soil2');
  for (let i = tiers - 1; i >= 0; i--) {
    const y0 = Math.round(top + i * step), y1 = Math.min(base - trunk, Math.round(top + i * step + step * 1.75));
    const tw = Math.max(3, Math.round(hw * (0.42 + 0.58 * (i + 1) / tiers)));
    for (let y = y0; y <= y1; y++) {
      const f = (y - y0) / Math.max(1, y1 - y0);
      const half = Math.max(1, Math.round(1 + f * (tw - 1)));
      for (let x = cx - half; x < cx + half; x++) {
        let c: ColorName = x < cx ? 'pine2' : 'pine1';
        if (x === cx - half && half > 1) c = 'pine3';
        if (y === y1) c = x < cx ? 'pine1' : 'pine0';
        else if (x >= cx + half - 1 && half > 2) c = 'pine0';
        p.set(x, y, c);
      }
    }
  }
}

export function woods(): Px {
  const p = new Px(62, 38);
  pine(p, 11, 37, 25, 8);
  pine(p, 50, 37, 28, 9);
  pine(p, 31, 37, 36, 12);
  pine(p, 21, 37, 20, 7);
  pine(p, 41, 37, 21, 7);
  // Something is watching from the dark between the trunks.
  p.rect(26, 29, 1, 2, 'yellow'); p.rect(31, 29, 1, 2, 'yellow');
  return p.outline('ink');
}

// ---------------------------------------------------------------- Hawkins Lab

export function lab(): Px {
  const p = new Px(54, 46);
  // Mast with a red lamp, and the dish on the roof.
  p.rect(10, 4, 2, 20, 'grey3'); p.rect(8, 9, 6, 1, 'grey3'); p.rect(9, 15, 4, 1, 'grey3'); p.set(10, 4, 'bone');
  p.rect(9, 1, 4, 3, 'red'); p.set(10, 1, 'hot'); p.set(10, 2, 'pink');
  p.art(['b.....b', 'bw...wb', '.bwwwb.', '..bbb..', '...g...', '...g...'], { b: 'grey3', w: 'bone', g: 'grey2' }, 40, 18);
  // The tower block and the long low wing.
  p.rect(16, 18, 17, 10, 'grey2'); p.rect(15, 16, 19, 3, 'grey3'); p.rect(15, 18, 19, 1, 'grey1'); p.rect(16, 27, 17, 1, 'grey1');
  p.rect(2, 26, 50, 19, 'grey2'); p.rect(1, 24, 52, 3, 'grey3'); p.rect(1, 27, 52, 1, 'grey1');
  p.rect(2, 43, 50, 2, 'grey1');
  // Windows: slim, dark, two of them lit.
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 8, lit = i === 1 || i === 4;
    p.rect(x, 30, 5, 5, 'ink'); p.rect(x + 1, 31, 3, 3, lit ? 'teal1' : 'night');
    if (lit) { p.set(x + 1, 31, 'cyan'); p.set(x + 2, 31, 'cyan'); }
  }
  for (let i = 0; i < 3; i++) { const x = 19 + i * 5; p.rect(x, 20, 3, 5, 'ink'); p.rect(x, 20, 3, 1, 'teal1'); p.set(x, 20, 'cyan'); }
  // The door under a hazard stripe.
  p.rect(22, 36, 10, 9, 'ink'); p.rect(23, 37, 8, 8, 'night'); p.rect(26, 37, 1, 8, 'ink');
  for (let x = 20; x < 34; x++) p.rect(x, 34, 1, 2, ((x >> 1) & 1) === 0 ? 'yellow' : 'ink');
  return p.outline('ink');
}

// ---------------------------------------------------------------- the middle school
export function school(): Px {
  const p = new Px(54, 44);
  // Wings of brick with pale lintels.
  p.rect(2, 24, 50, 19, 'soil2'); p.rect(1, 22, 52, 3, 'soil1'); p.rect(1, 24, 52, 1, 'soil3');
  for (let y = 27; y < 42; y += 3) for (let x = 3 + (((y - 27) / 3) & 1) * 3; x < 51; x += 6) p.rect(x, y, 3, 1, 'soil1');
  p.rect(2, 41, 50, 2, 'soil1');
  for (const x of [5, 12, 35, 43]) { p.rect(x, 28, 6, 8, 'ink'); p.rect(x + 1, 29, 4, 6, 'cream'); p.rect(x + 1, 32, 4, 1, 'amber'); p.rect(x + 2, 29, 1, 6, 'amber'); p.rect(x - 1, 36, 8, 1, 'soil3'); }
  // The tower, its roof, the clock.
  p.rect(19, 12, 16, 31, 'soil2'); p.rect(18, 20, 18, 3, 'soil1'); p.rect(18, 20, 18, 1, 'soil3');
  for (let i = 0; i < 7; i++) p.rect(27 - (7 - i) - 0, 5 + i, (7 - i) * 2 + 0, 1, i < 3 ? 'blood1' : 'blood0');
  p.rect(26, 1, 2, 4, 'blood1'); p.set(26, 1, 'bone');
  p.rect(18, 11, 18, 2, 'soil1'); p.rect(18, 11, 18, 1, 'soil3');
  p.disc(27, 16.5, 4, 'ink'); p.disc(27, 16.5, 3, 'bone'); p.rect(27, 14, 1, 3, 'ink'); p.rect(27, 16, 3, 1, 'ink');
  // Double doors and steps.
  p.rect(23, 30, 8, 12, 'ink'); p.rect(24, 31, 3, 11, 'soil1'); p.rect(28, 31, 3, 11, 'soil1'); p.rect(24, 31, 7, 1, 'soil3'); p.set(26, 37, 'yellow'); p.set(28, 37, 'yellow');
  p.rect(21, 42, 12, 1, 'grey3'); p.rect(20, 43, 14, 1, 'grey2');
  // A flag out front.
  p.rect(48, 8, 1, 16, 'bone'); p.rect(49, 8, 5, 3, 'hot'); p.rect(49, 11, 4, 1, 'red'); p.rect(48, 7, 1, 1, 'yellow');
  return p.outline('ink');
}

// ---------------------------------------------------------------- the pumpkin patch
export function pumpkin(rx: number, ry: number): Px {
  const w = rx * 2 + 4, h = ry * 2 + 5;
  const p = new Px(w, h);
  const cx = w / 2, cy = ry + 4;
  p.ellipse(cx, cy, rx, ry, 'orange');
  p.ellipse(cx + rx * 0.35, cy + ry * 0.1, rx * 0.5, ry * 0.9, 'red');
  p.ellipse(cx - rx * 0.1, cy, rx * 0.8, ry * 0.95, 'orange');
  // Ribs, a glint and the stalk.
  p.rect(cx - 1, cy - ry + 1, 1, ry * 2 - 1, 'red');
  if (rx >= 5) { p.rect(cx - rx * 0.55, cy - ry * 0.55, 1, ry * 1.1, 'red'); p.rect(cx + rx * 0.5, cy - ry * 0.55, 1, ry * 1.1, 'red'); }
  p.rect(cx - rx * 0.6, cy - ry * 0.55, 2, 1, 'amber'); p.set(cx - rx * 0.6 - 1, cy - ry * 0.2, 'amber');
  p.rect(cx - 1, cy - ry - 2, 2, 3, 'pine2'); p.set(cx + 1, cy - ry - 2, 'pine3');
  return p.outline('ink');
}

/** A cabinet from the arcade: a magenta marquee, a screen with a little ghost, a stick and two buttons. */
export function arcade(): Px {
  const p = new Px(16, 26);
  p.rect(2, 0, 12, 4, 'magenta'); p.rect(3, 1, 10, 2, 'pink'); p.rect(4, 1, 2, 1, 'white'); p.rect(8, 2, 4, 1, 'cream');
  p.rect(1, 4, 14, 18, 'purple0'); p.rect(1, 4, 2, 18, 'purple'); p.rect(13, 4, 2, 18, 'night');
  p.rect(3, 5, 10, 9, 'ink'); p.rect(4, 6, 8, 7, 'night');
  p.art(['.cccc.', 'cwccwc', 'cccccc', 'cccccc', 'c.cc.c'], { c: 'cyan', w: 'ink' }, 5, 7);
  p.set(5, 12, 'yellow'); p.set(10, 12, 'yellow');
  p.rect(2, 15, 12, 4, 'grey2'); p.rect(2, 15, 12, 1, 'grey3');
  p.rect(5, 12, 0, 0, 'ink'); p.rect(4, 16, 1, 2, 'grey1'); p.rect(3, 15, 3, 2, 'hot'); p.set(3, 15, 'pink');
  p.rect(8, 16, 2, 2, 'yellow'); p.rect(11, 16, 2, 2, 'cyan');
  p.rect(3, 19, 10, 6, 'night'); p.rect(2, 25, 12, 1, 'grey1');
  return p.outline('ink');
}

// ---------------------------------------------------------------- the Upside Down
/** The mouth of the tunnels, seen head on: a rim of stone, rings that run down into the dark, a dull ember at the end. */
export function tunnels(): Px {
  const w = 46, h = 34, cx = 23, cy = 18;
  const p = new Px(w, h);
  p.ellipse(cx, cy, 22, 16, 'purple0');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = (x + 0.5 - cx) / 22, b = (y + 0.5 - cy) / 16, d = a * a + b * b;
    if (d > 1) continue;
    if (d > 0.62 && ((x * 7 + y * 13) % 5) === 0) p.set(x, y, 'purple');
    else if (d > 0.62 && ((x * 3 + y * 5) % 7) === 1) p.set(x, y, 'night');
    if (d > 0.9) p.set(x, y, a + b < 0 ? 'purple' : 'night');
  }
  p.ellipse(cx, cy + 1, 16, 11.5, 'ink');
  p.ellipse(cx, cy + 1, 12.5, 8.5, 'night');
  p.ellipse(cx, cy + 1, 11, 7.5, 'ink');
  p.ellipse(cx, cy + 1, 7.5, 5, 'shadow');
  p.ellipse(cx, cy + 1, 6, 4, 'ink');
  p.ellipse(cx, cy + 1, 3, 2, 'blood0');
  p.set(cx, cy + 1, 'blood1'); p.set(cx - 1, cy + 1, 'blood1');
  return p;
}

/** Roots that hang over the mouth of the tunnels. */
export function roots(p: Px, x: number, y: number, rnd: () => number): void {
  for (let i = 0; i < 6; i++) {
    let rx = x + (i - 2.5) * 6 + Math.floor(rnd() * 3) - 1;
    const len = 10 + Math.floor(rnd() * 12);
    for (let k = 0; k < len; k++) {
      p.set(rx, y + k, k < 2 ? 'blood1' : k % 5 === 4 ? 'red' : 'blood1');
      if (rnd() < 0.34) rx += rnd() < 0.5 ? -1 : 1;
    }
  }
}

/** The gate: a torn ring in the air with a jagged red rift down its middle. Dormant, the rift is only a dull crack. */
export function gate(lit: boolean): Px {
  const w = 40, h = 50, cx = 20, cy = 25;
  const p = new Px(w, h);
  p.ellipse(cx, cy, 17, 23, 'purple0');
  p.ellipse(cx, cy, 14, 20, lit ? 'blood0' : 'ink');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = (x + 0.5 - cx) / 17, b = (y + 0.5 - cy) / 23, d = a * a + b * b;
    if (d <= 1 && d > 0.72) p.set(x, y, a + b < 0 ? 'purple' : (x + y) % 2 ? 'purple0' : 'night');
  }
  for (let y = 3; y < h - 3; y++) {
    const f = (y - 3) / (h - 7);
    const half = 1 + Math.round((lit ? 6 : 2) * Math.sin(Math.PI * f));
    const mid = cx + Math.round(2.6 * Math.sin(y * 0.8) + 1.4 * Math.sin(y * 0.31));
    p.rect(mid - half - 1, y, half * 2 + 2, 1, 'blood1');
    p.rect(mid - half, y, half * 2, 1, 'red');
    if (lit && half > 2) p.rect(mid - half + 2, y, half * 2 - 4, 1, 'hot');
    if (lit && half > 3) p.rect(mid - half + 4, y, half * 2 - 8, 1, 'pink');
    if (lit && half > 5) p.rect(mid - 1, y, 2, 1, 'white');
  }
  if (lit) {
    // Arcs of light thrown off the tear.
    for (const [x0, y0, dx, dy] of [[11, 12, -1, -1], [29, 14, 1, -1], [10, 36, -1, 1], [30, 34, 1, 1], [9, 25, -1, 0], [31, 24, 1, 0]] as [number, number, number, number][]) {
      let x = x0, y = y0;
      for (let k = 0; k < 7; k++) {
        p.set(x, y, k < 2 ? 'pink' : 'magenta');
        x += dx; y += dy;
        if (k % 2 === 1) { if (dx === 0) x += 1; else if (dy === 0) y += k % 4 === 1 ? 1 : -1; }
      }
    }
  }
  // Rock that the rift has pulled loose.
  for (const [x, y] of [[2, 8], [36, 14], [3, 38], [35, 42], [6, 22]] as const) { p.rect(x, y, 2, 2, 'purple0'); p.set(x, y, 'purple'); }
  return p.outline('ink');
}
