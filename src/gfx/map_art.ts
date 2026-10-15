// The map's art: the six stage landmarks, each one bold shape drawn in code at about 30 px, and the recolors that turn a
// Hawkins thing into its reflection in the Upside Down or into a greyed-out locked one. The town around them is in map_town.ts.
import { Px } from './px.ts';
import { PAL, COLOR_NAMES } from './palette.ts';
import type { ColorName } from './palette.ts';
import { px32 } from './canvas.ts';

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

/** Things seen from the Upside Down: ink, purple and dried blood, with only the warm lights left burning, as embers. */
const UD: Partial<Record<ColorName, ColorName>> = {
  black: 'ink', ink: 'ink', night: 'ink', shadow: 'night', dusk: 'purple0', slate: 'purple0', mist: 'purple0', bone: 'purple0', white: 'purple',
  grey1: 'night', grey2: 'purple0', grey3: 'purple',
  pine0: 'ink', pine1: 'night', pine2: 'purple0', pine3: 'purple', leaf: 'purple',
  soil0: 'ink', soil1: 'blood0', soil2: 'blood1', soil3: 'blood1', sand: 'purple0',
  blood0: 'blood0', blood1: 'blood0', red: 'blood1', hot: 'red', pink: 'rose', rose: 'blood1',
  orange: 'blood1', amber: 'hot', yellow: 'hot', cream: 'purple',
  teal0: 'night', teal1: 'purple0', cyan: 'magenta', blue: 'purple0', sky: 'purple0', purple0: 'purple0', purple: 'purple', magenta: 'magenta',
  skin0: 'rose', skin1: 'blood1', skin2: 'blood0', skin3: 'ink',
};
export const toUD = (c: ColorName): ColorName => UD[c] ?? 'purple0';

/** The ground itself, upside down: a dark ceiling with a violet lip, embers where the flowers were. */
const UD_LAND: Partial<Record<ColorName, ColorName>> = {
  leaf: 'purple', pine3: 'night', pine2: 'ink', pine1: 'night', pine0: 'ink',
  soil3: 'blood1', soil2: 'blood0', soil1: 'ink', soil0: 'ink', pink: 'rose', yellow: 'hot', white: 'rose',
  sand: 'purple0', grey3: 'purple0', grey2: 'night', grey1: 'ink',
};
export const toUDLand = (c: ColorName): ColorName => UD_LAND[c] ?? 'ink';

/** The sprite with a margin of one pixel on every side and a black outline in it. */
export function framed(p: Px): Px {
  const q = new Px(p.w + 2, p.h + 2);
  q.blit(p, 1, 1);
  return q.outline('ink');
}

// ---------------------------------------------------------------- trees
/** One pine: tiers of needles, light on the left, shade on the right, a short trunk. */
export function pine(p: Px, cx: number, base: number, h: number, hw: number): void {
  const tiers = h >= 28 ? 4 : 3, trunk = h >= 12 ? 3 : 2, top = base - h, span = h - trunk;
  const step = span / (tiers + 0.7);
  p.rect(cx - 1, base - trunk + 1, 2, trunk, 'soil1');
  p.set(cx - 1, base - trunk + 1, 'soil2');
  for (let i = tiers - 1; i >= 0; i--) {
    const y0 = Math.round(top + i * step), y1 = Math.min(base - trunk, Math.round(top + i * step + step * 1.75));
    const tw = Math.max(2, Math.round(hw * (0.42 + 0.58 * (i + 1) / tiers)));
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

/** A round-topped tree, for variety among the pines. */
export function oak(p: Px, cx: number, base: number, r: number): void {
  p.rect(cx - 1, base - 3, 2, 4, 'soil1');
  const cy = base - 3 - r;
  p.disc(cx, cy + 0.5, r, 'pine2');
  p.disc(cx - r * 0.25, cy, r * 0.8, 'pine3');
  p.rect(cx + 1, cy + 1, Math.max(1, r - 1), Math.max(1, r - 1), 'pine2');
  p.rect(cx - r * 0.6, cy - r * 0.55, 2, 1, 'leaf');
  p.set(cx + r * 0.2, cy + r * 0.8, 'pine1');
}

// ---------------------------------------------------------------- the stage landmarks
export function woods(): Px {
  const p = new Px(50, 26);
  for (const [cx, h, hw] of [[8, 14, 4], [19, 16, 5], [31, 15, 5], [42, 14, 4]] as const) pine(p, cx, 16, h, hw);
  for (const [cx, h, hw] of [[5, 12, 4], [14, 16, 5], [25, 20, 6], [36, 15, 5], [45, 12, 4]] as const) pine(p, cx, 25, h, hw);
  return framed(p);
}

export function lab(): Px {
  const p = new Px(28, 26);
  // A mast with a red lamp, the tower block and the long low wing.
  p.rect(3, 2, 2, 14, 'grey3'); p.rect(2, 7, 4, 1, 'grey3'); p.rect(3, 0, 2, 2, 'red'); p.set(3, 0, 'hot');
  p.rect(9, 6, 9, 10, 'grey2'); p.rect(8, 5, 11, 2, 'grey3'); p.rect(9, 7, 9, 1, 'grey1');
  p.rect(1, 16, 26, 10, 'grey2'); p.rect(0, 14, 28, 3, 'grey3'); p.rect(1, 17, 26, 1, 'grey1'); p.rect(1, 24, 26, 2, 'grey1');
  // The dish on the roof.
  p.art(['b...b', 'bw.wb', '.bwb.', '..g..'], { b: 'grey3', w: 'bone', g: 'grey2' }, 21, 10);
  // Windows, two of them lit, and the door under a hazard stripe.
  for (const [x, lit] of [[3, 0], [6, 1], [20, 1], [23, 0]] as const) { p.rect(x, 19, 3, 3, 'ink'); if (lit) p.rect(x, 19, 3, 1, 'cyan'); }
  p.rect(11, 10, 2, 3, 'ink'); p.rect(14, 10, 2, 3, 'ink'); p.rect(11, 10, 2, 1, 'cyan');
  p.rect(12, 20, 4, 6, 'ink'); p.rect(13, 21, 2, 5, 'night');
  for (let x = 11; x < 17; x++) p.set(x, 19, ((x & 1) === 0) ? 'yellow' : 'ink');
  return framed(p);
}

export function school(): Px {
  const p = new Px(28, 25);
  // Brick wings with a pale lintel line, the tower with its roof and clock, doors, windows and a flag.
  p.rect(1, 12, 26, 13, 'soil2'); p.rect(0, 11, 28, 2, 'soil1'); p.rect(0, 12, 28, 1, 'soil3');
  for (let y = 15; y < 24; y += 3) for (let x = 1 + (((y - 15) / 3) & 1) * 3; x < 27; x += 6) p.rect(x, y, 3, 1, 'soil1');
  p.rect(1, 23, 26, 2, 'soil1');
  p.rect(10, 5, 8, 20, 'soil2'); p.rect(9, 11, 10, 2, 'soil1'); p.rect(9, 11, 10, 1, 'soil3');
  for (let i = 0; i < 4; i++) p.rect(14 - 1 - i, 1 + i, 2 + i * 2, 1, i < 2 ? 'blood1' : 'blood0');
  p.rect(13, 0, 2, 1, 'blood1');
  p.rect(12, 6, 4, 4, 'bone'); p.rect(14, 6, 1, 2, 'ink'); p.rect(13, 8, 2, 1, 'ink');
  for (const x of [3, 6, 20, 23]) { p.rect(x, 15, 2, 4, 'ink'); p.rect(x, 15, 2, 3, 'cream'); }
  p.rect(12, 19, 4, 6, 'ink'); p.rect(12, 20, 2, 5, 'soil1'); p.rect(14, 20, 2, 5, 'soil1'); p.set(13, 22, 'yellow'); p.set(14, 22, 'yellow');
  p.rect(25, 3, 1, 9, 'bone'); p.rect(26, 3, 2, 2, 'hot'); p.set(25, 2, 'yellow');
  return framed(p);
}

export function pumpkin(rx: number, ry: number): Px {
  const w = rx * 2 + 4, h = ry * 2 + 5;
  const p = new Px(w, h);
  const cx = w / 2, cy = ry + 4;
  p.ellipse(cx, cy, rx, ry, 'orange');
  p.ellipse(cx + rx * 0.35, cy + ry * 0.1, rx * 0.5, ry * 0.9, 'red');
  p.ellipse(cx - rx * 0.1, cy, rx * 0.8, ry * 0.95, 'orange');
  p.rect(cx - 1, cy - ry + 1, 1, ry * 2 - 1, 'red');
  p.rect(cx - rx * 0.6, cy - ry * 0.55, 2, 1, 'amber');
  p.rect(cx - 1, cy - ry - 2, 2, 3, 'pine2'); p.set(cx + 1, cy - ry - 2, 'pine3');
  return framed(p);
}

/** A cabinet from the arcade: a magenta marquee, a screen with a little ghost, a stick and two buttons. */
export function arcade(): Px {
  const p = new Px(9, 15);
  p.rect(1, 0, 7, 2, 'magenta'); p.set(2, 0, 'pink'); p.set(3, 0, 'white');
  p.rect(0, 2, 9, 10, 'purple0'); p.rect(0, 2, 1, 10, 'purple'); p.rect(8, 2, 1, 10, 'night');
  p.rect(2, 3, 5, 5, 'ink'); p.rect(3, 4, 3, 3, 'cyan'); p.set(3, 5, 'ink'); p.set(5, 5, 'ink');
  p.rect(1, 9, 7, 2, 'grey2'); p.set(2, 9, 'hot'); p.set(5, 10, 'yellow'); p.set(7, 10, 'cyan');
  p.rect(1, 12, 7, 3, 'night');
  return framed(p);
}

/** The water tower: a tank under a red cone on four legs. */
export function tower(): Px {
  const p = new Px(14, 26);
  p.rect(6, 0, 2, 1, 'red'); p.rect(5, 1, 4, 1, 'red'); p.rect(4, 2, 6, 1, 'blood1');
  p.rect(2, 3, 10, 9, 'bone'); p.rect(9, 3, 3, 9, 'grey3'); p.rect(2, 6, 10, 1, 'grey2'); p.rect(2, 9, 10, 1, 'grey2');
  p.set(3, 4, 'white'); p.set(4, 4, 'white');
  p.line(3, 12, 1, 25, 'grey2'); p.line(10, 12, 12, 25, 'grey2'); p.line(5, 12, 4, 25, 'grey2'); p.line(8, 12, 9, 25, 'grey2');
  p.rect(2, 18, 10, 1, 'grey2'); p.rect(1, 23, 12, 1, 'grey2');
  return framed(p);
}

// ---------------------------------------------------------------- the Upside Down
/** The mouth of the tunnels, seen head on: a rim of stone, rings that run down into the dark, a dull ember at the end. */
export function tunnels(): Px {
  const w = 28, h = 22, cx = 14, cy = 11;
  const p = new Px(w, h);
  p.ellipse(cx, cy, 13.5, 10.5, 'purple0');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = (x + 0.5 - cx) / 13.5, b = (y + 0.5 - cy) / 10.5, d = a * a + b * b;
    if (d > 1) continue;
    if (d > 0.6 && ((x * 7 + y * 13) % 5) === 0) p.set(x, y, 'purple');
    else if (d > 0.6 && ((x * 3 + y * 5) % 7) === 1) p.set(x, y, 'night');
    if (d > 0.88) p.set(x, y, a + b < 0 ? 'purple' : 'night');
  }
  p.ellipse(cx, cy + 1, 9.5, 7, 'ink');
  p.ellipse(cx, cy + 1, 7.5, 5.3, 'night');
  p.ellipse(cx, cy + 1, 6.5, 4.5, 'ink');
  p.ellipse(cx, cy + 1, 4, 2.8, 'shadow');
  p.ellipse(cx, cy + 1, 3, 2, 'ink');
  p.ellipse(cx, cy + 1, 1.5, 1, 'blood0');
  p.set(cx, cy + 1, 'blood1');
  return framed(p);
}

/** Roots that hang over the mouth of the tunnels. */
export function roots(p: Px, x: number, y: number, rnd: () => number): void {
  for (let i = 0; i < 4; i++) {
    let rx = x + (i - 1.5) * 4 + Math.floor(rnd() * 3) - 1;
    const len = 6 + Math.floor(rnd() * 8);
    for (let k = 0; k < len; k++) {
      p.set(rx, y + k, k < 2 ? 'blood1' : k % 5 === 4 ? 'red' : 'blood1');
      if (rnd() < 0.34) rx += rnd() < 0.5 ? -1 : 1;
    }
  }
}

/** The gate: a torn ring in the air with a jagged red rift down its middle. Dormant, the rift is only a dull crack. */
export function gate(lit: boolean): Px {
  const w = 22, h = 26, cx = 11, cy = 13;
  const p = new Px(w, h);
  p.ellipse(cx, cy, 9.5, 12, 'purple0');
  p.ellipse(cx, cy, 7.5, 10, lit ? 'blood0' : 'ink');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = (x + 0.5 - cx) / 9.5, b = (y + 0.5 - cy) / 12, d = a * a + b * b;
    if (d <= 1 && d > 0.7) p.set(x, y, a + b < 0 ? 'purple' : (x + y) % 2 ? 'purple0' : 'night');
  }
  for (let y = 2; y < h - 2; y++) {
    const f = (y - 2) / (h - 5);
    const half = Math.round((lit ? 3.4 : 1) * Math.sin(Math.PI * f) + (lit ? 0.4 : 0));
    const mid = cx + Math.round(1.6 * Math.sin(y * 0.9) + 0.8 * Math.sin(y * 0.33));
    p.rect(mid - half - 1, y, half * 2 + 2, 1, 'blood1');
    p.rect(mid - half, y, half * 2, 1, 'red');
    if (lit && half > 1) p.rect(mid - half + 1, y, half * 2 - 2, 1, 'hot');
    if (lit && half > 2) p.rect(mid - 1, y, 2, 1, 'white');
  }
  if (lit) {
    for (const [x0, y0, dx, dy] of [[5, 6, -1, -1], [17, 7, 1, -1], [5, 20, -1, 1], [17, 19, 1, 1]] as [number, number, number, number][]) {
      let x = x0, y = y0;
      for (let k = 0; k < 4; k++) { p.set(x, y, k < 1 ? 'pink' : 'magenta'); x += dx; y += k % 2 === 0 ? dy : 0; }
    }
  }
  return p.outline('ink');
}
