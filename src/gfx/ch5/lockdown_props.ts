// The army's props for stage 5.1 (docs/chapter-5.md): an olive truck and a tent, sandbag walls, road barricades and a concrete barrier, a
// floodlight tower with its hard white cone as a separate glow layer, a checkpoint booth with its boom gate, and a curfew sign. Each is a
// function to a Px at its own size, like props_lab.ts's doorArt and consoleArt: the art alone, with no rim (drawProp's `rim` adds the dark
// outline), and static, so it is cached once. The cone is a layer of its own, drawn over the ground and under the sprites, and `coneLift`
// is the blend it asks for. Every pixel is a palette color. Pure pixel work.
import { BAYER4, px32 } from '../canvas.ts';
import { TINY_GLYPHS } from '../data/font.ts';
import type { Paint } from '../px.ts';
import { Px } from '../px.ts';
import { transposed } from '../tile_lab.ts';

/** Pixel sizes of each prop's art, so the build can set a footprint: [w, h]. */
export const LOCKDOWN_PROP_SIZE = {
  truck: [64, 32], tent: [48, 36], sandbags: [32, 16], barricade: [32, 16], barrier: [32, 16], floodlight: [16, 56], cone: [80, 72],
  booth: [32, 32], boom: [48, 24], sign: [26, 32],
} as const;

/** Three by five caps, from the game's tiny font, stamped into a Px. */
function tiny(px: Px, x: number, y: number, text: string, col: Paint): void {
  for (let i = 0; i < text.length; i++) {
    const g = TINY_GLYPHS[text[i] as string];
    if (!g) continue;
    g.split('/').forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === '#') px.set(x + i * 4 + k, y + j, col); });
  }
}

/** A tyre: black, with a grey hub and a bright spot. */
function wheel(px: Px, cx: number, cy: number): void {
  px.disc(cx, cy, 5.6, 'ink').disc(cx, cy, 4.2, 'grey1').disc(cx, cy, 2.4, 'grey2').disc(cx, cy, 1, 'grey3');
  px.set(cx - 4, cy - 1, 'grey2').set(cx + 3, cy + 2, 'grey2').set(cx, cy - 4, 'grey2');
}

/** A five point star in white, 7 px across, by its top left. */
function star(px: Px, x: number, y: number, col: Paint = 'bone'): void {
  px.art(['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'], { '#': col }, x, y);
}

// ---------------------------------------------------------------- the truck
/** An olive troop truck in profile, facing right, 64 by 32: a canvas tarp over hoops, a white star on the side, a cab with a windshield, three wheels. */
export function truckArt(): Px {
  const p = new Px(64, 32);
  p.ellipse(32, 30, 31, 1.6, 'black');
  p.rect(2, 22, 60, 4, 'pine1').rect(2, 25, 60, 1, 'ink');
  // the bed and its tarp
  p.rect(2, 13, 37, 10, 'pine2').rect(2, 13, 37, 1, 'pine3').rect(2, 20, 37, 3, 'pine1');
  for (let x = 6; x < 38; x += 6) p.rect(x, 14, 1, 7, 'pine1');
  p.rect(3, 3, 35, 10, 'pine3').rect(5, 2, 31, 1, 'pine3').rect(3, 3, 35, 1, 'leaf').rect(3, 12, 35, 1, 'pine2');
  for (let x = 3; x < 38; x += 8) p.rect(x, 3, 1, 10, 'pine2').rect(x + 1, 4, 1, 8, 'pine2');
  p.set(3, 3, 0).set(37, 3, 0);
  star(p, 17, 14);
  p.rect(2, 22, 37, 1, 'ink').rect(0, 20, 2, 5, 'pine1').rect(1, 21, 1, 3, 'hot');
  // the cab
  p.rect(40, 9, 21, 14, 'pine2').rect(40, 8, 20, 1, 'pine1').rect(42, 7, 15, 1, 'pine1').rect(40, 9, 21, 1, 'pine3');
  p.rect(44, 11, 7, 6, 'sky').rect(44, 11, 7, 1, 'white').rect(45, 13, 2, 1, 'white').rect(53, 11, 6, 6, 'sky').rect(53, 11, 6, 1, 'white').set(54, 13, 'white').set(55, 14, 'white');
  p.rect(51, 11, 2, 12, 'pine1').rect(46, 18, 1, 5, 'pine1').rect(47, 20, 2, 1, 'grey3');
  p.rect(40, 20, 21, 3, 'pine1');
  p.rect(60, 15, 4, 8, 'pine2').rect(60, 15, 4, 1, 'pine3').rect(62, 16, 2, 6, 'grey1').rect(62, 17, 2, 1, 'grey2').rect(62, 19, 2, 1, 'grey2').set(63, 14, 'yellow').set(62, 14, 'cream');
  p.rect(59, 23, 5, 2, 'grey2').rect(59, 23, 5, 1, 'grey3');
  p.rect(41, 1, 2, 8, 'grey2').rect(41, 1, 2, 1, 'grey1').set(41, 3, 'grey3');
  p.rect(38, 22, 2, 3, 'grey1');
  for (const x of [12, 22, 52]) wheel(p, x, 26);
  return p;
}

// ---------------------------------------------------------------- the tent
/** An army ridge tent seen end on, 48 by 36: olive canvas lit on the left, the door flaps tied back on a dark opening, guy ropes to pegs. */
export function tentArt(): Px {
  const p = new Px(48, 36);
  p.rect(5, 24, 38, 11, 'pine2');
  for (let y = 4; y < 24; y++) {
    const half = Math.round(((y - 3) / 21) * 22) + 1;
    p.rect(24 - half, y, half * 2, 1, 'pine2');
    p.rect(24 - half, y, Math.min(half, 3), 1, 'pine3');
  }
  p.rect(23, 2, 2, 2, 'soil2').rect(24, 1, 1, 1, 'soil3').rect(22, 0, 6, 1, 'red').rect(27, 0, 1, 3, 'soil2');
  p.rect(9, 24, 1, 11, 'pine3').rect(5, 24, 38, 1, 'pine3').rect(5, 34, 38, 1, 'pine1');
  // the door: a dark opening, the flaps tied back on either side
  p.rect(18, 17, 12, 18, 'ink').rect(19, 14, 10, 3, 'ink').rect(21, 12, 6, 2, 'ink').rect(23, 10, 2, 2, 'ink');
  p.rect(19, 19, 10, 15, 'night').rect(22, 28, 4, 6, 'shadow').rect(20, 31, 8, 3, 'dusk');
  p.rect(14, 16, 4, 19, 'pine1').rect(30, 16, 4, 19, 'pine1').rect(15, 14, 3, 3, 'pine1').rect(30, 14, 3, 3, 'pine1');
  p.rect(14, 16, 1, 19, 'pine3').set(17, 22, 'soil3').set(30, 22, 'soil3');
  // seams and guy ropes
  for (let y = 8; y < 24; y += 3) p.set(24 - Math.round(((y - 3) / 21) * 22) - 1 + 2, y, 'pine1');
  p.line(8, 12, 1, 31, 'soil3').line(40, 12, 46, 31, 'soil3').set(1, 32, 'soil2').set(1, 33, 'soil2').set(46, 32, 'soil2').set(46, 33, 'soil2');
  p.set(0, 33, 'soil1').set(47, 33, 'soil1');
  return p;
}

// ---------------------------------------------------------------- sandbags, barricades, the barrier
/** A sandbag: a rounded sack with a lit top and a shaded belly. */
function bag(p: Px, x: number, y: number, tint: number): void {
  p.rect(x + 1, y, 6, 5, 'sand').rect(x, y + 1, 8, 3, 'sand');
  p.rect(x + 1, y, 5, 1, tint ? 'bone' : 'cream').rect(x, y + 3, 8, 1, 'soil3').rect(x + 1, y + 4, 6, 1, 'soil3');
  p.set(x, y + 1, 'soil3').set(x + 7, y + 1, 'soil3').set(x + 3 + tint, y + 2, 'soil3').set(x + 7, y + 4, 'soil2').set(x, y + 4, 'soil2');
}

/** A wall of sandbags, w by h: rows stacked in running bond, every other row shifted half a bag, cut off at the ends. */
export function sandbagArt(w = 32, h = 16): Px {
  const p = new Px(w, h);
  const rowsN = Math.max(1, Math.floor((h - 1) / 4));
  for (let r = 0; r < rowsN; r++) {
    const y = h - 5 - r * 4;
    for (let x = r & 1 ? -4 : 0, i = 0; x < w; x += 8, i++) bag(p, x, y, i & 1);
  }
  for (let x = 0; x < w; x += 8) p.set(x, h - 1, 'soil2');
  return p;
}

/** A road barricade: red and white boards on two timber trestles, reflectors on the legs and a lamp on the top. 32 by 16 (more wide by 16 each). */
export function barricadeArt(w = 32): Px {
  const p = new Px(w, 16);
  for (const x of [3, w - 7]) {
    p.line(x, 15, x + 2, 5, 'soil2').line(x + 1, 15, x + 3, 5, 'soil2').line(x + 6, 15, x + 4, 5, 'soil2').line(x + 5, 15, x + 3, 5, 'soil1');
    p.rect(x - 1, 15, 3, 1, 'soil1').rect(x + 5, 15, 3, 1, 'soil1').set(x + 1, 11, 'hot');
  }
  for (const [y, shift] of [[3, 0], [8, 4]] as [number, number][]) {
    for (let x = 0; x < w; x++) for (let j = 0; j < 4; j++) p.set(x, y + j, ((x + j + shift) >> 2) & 1 ? 'bone' : 'red');
    p.rect(0, y, w, 1, 'white').rect(0, y + 3, w, 1, 'blood1').frame(0, y, w, 4, 'ink');
  }
  p.rect(w - 4, 0, 3, 3, 'ink').rect(w - 3, 1, 1, 1, 'amber').set(w - 3, 0, 'yellow');
  return p;
}

/** A concrete road barrier, 32 by 16: a sloped slab with a hazard band, a lit top, and a worn base. */
export function barrierArt(w = 32): Px {
  const p = new Px(w, 16);
  p.rect(3, 4, w - 6, 3, 'grey3').rect(1, 7, w - 2, 5, 'grey3').rect(0, 12, w, 4, 'grey2');
  p.rect(3, 4, w - 6, 1, 'white').rect(1, 7, w - 2, 1, 'bone').rect(0, 12, w, 1, 'grey3').rect(0, 15, w, 1, 'grey1');
  p.rect(1, 11, w - 2, 1, 'grey2').rect(w - 3, 4, 1, 8, 'grey2');
  for (let x = 2; x < w - 2; x++) for (let j = 8; j < 11; j++) p.set(x, j, ((x + j) >> 1) & 1 ? 'yellow' : 'ink');
  for (let x = 6; x < w; x += 12) p.rect(x, 5, 2, 2, 'orange').set(x, 5, 'amber');
  p.set(4, 13, 'grey1').set(11, 14, 'grey1').set(w - 6, 13, 'grey1');
  return p;
}

// ---------------------------------------------------------------- the floodlight
/** A floodlight tower, 16 by 56: a lattice mast on splayed legs under a lamp bank. `lit` has the lamps on. The cone is `floodlightConeArt`. */
export function floodlightArt(lit = true): Px {
  const p = new Px(16, 56);
  for (let y = 12; y < 52; y++) {
    const spread = Math.max(0, Math.floor((y - 30) / 6));
    p.rect(5 - spread, y, 1, 1, 'grey2').rect(10 + spread, y, 1, 1, 'grey2');
    if (y % 6 < 2) for (let x = 6 - spread; x < 10 + spread; x++) p.set(x, y, x & 1 ? 'grey1' : 'grey3');
  }
  for (let y = 12; y < 52; y += 6) p.line(6 - Math.max(0, Math.floor((y - 30) / 6)), y, 9 + Math.max(0, Math.floor((y + 6 - 30) / 6)), y + 5, 'grey1');
  p.rect(1, 52, 14, 2, 'grey1').rect(1, 52, 14, 1, 'grey2').rect(0, 54, 16, 2, 'ink').rect(3, 49, 10, 3, 'pine1').rect(3, 49, 10, 1, 'pine2');
  p.rect(7, 8, 2, 5, 'grey2').rect(0, 2, 16, 7, 'grey1').rect(0, 2, 16, 1, 'grey3').rect(0, 8, 16, 1, 'ink');
  for (let k = 0; k < 4; k++) {
    const x = 1 + k * 4;
    p.rect(x, 3, 3, 4, lit ? 'white' : 'grey2').rect(x, 3, 3, 1, lit ? 'cream' : 'grey3');
    if (lit) p.set(x + 1, 7, 'cream');
  }
  p.rect(0, 0, 16, 1, 'grey2').set(0, 2, 'grey2').set(15, 2, 'grey2');
  return p;
}

/**
 * The floodlight's cone, a layer of its own, 80 by 72: the top as wide as the lamp bank, at the top middle, a beam that opens down to a
 * pool of light on the ground. It is solid and hard edged: 'bone' marks light and 'white' marks strong light, which is the border all
 * the way round and a core that thins out away from the lamp, in solid bands with a narrow ordered dither where they meet, never a dither between
 * light and none, so the ground it falls on keeps its detail. `lean` (-1, 0, 1) turns the lamp to either side.
 */
export function floodlightConeArt(lean = 0): Px {
  const p = new Px(80, 72);
  const cy = 58, R = 25, tilt = lean * 13;
  const cx = (y: number): number => 40 + tilt * (y / cy);
  const beam = (x: number, y: number): number => (y > cy ? 9 : Math.abs(x + 0.5 - cx(y)) / (7 + (R - 7) * (y / cy)));
  const pool = (x: number, y: number): number => Math.hypot((x + 0.5 - (40 + tilt)) / 30, (y + 0.5 - 61) / 11);
  const edge = (f: (x: number, y: number) => number, x: number, y: number): boolean => f(x, y) <= 1 && (f(x - 1, y) > 1 || f(x + 1, y) > 1 || f(x, y - 1) > 1 || f(x, y + 1) > 1);
  for (let y = 1; y < 72; y++) {
    for (let x = 0; x < 80; x++) {
      const b = beam(x, y), q = pool(x, y);
      const inBeam = b <= 1, inPool = q <= 1;
      if (!inBeam && !inPool) continue;
      const hard = (inBeam && edge(beam, x, y) && y > 3 && q > 1) || (inPool && edge(pool, x, y) && !(inBeam && beam(x, y - 1) <= 1 && q > 0.9));
      const heat = inPool ? 0.78 - 0.5 * q * q : 0.98 - 0.6 * (y / cy) - 0.3 * b;
      const edgeBand = (heat - 0.5) / 0.14 + 0.5;
      p.set(x, y, hard || edgeBand > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 'white' : 'bone');
    }
  }
  return p;
}

/** Lifts the pixels of `dst` under the cone toward white, the blend the cone layer asks for: strong light 80% of the way, light 48%. */
export function coneLift(dst: Px, cone: Px, ox: number, oy: number): void {
  const full = px32('white');
  for (let y = 0; y < cone.h; y++) {
    for (let x = 0; x < cone.w; x++) {
      const m = cone.d[y * cone.w + x] as number;
      if (!m) continue;
      const dx = ox + x, dy = oy + y, v = dst.get(dx, dy);
      if (!v) continue;
      const k = m === full ? 0.8 : 0.48;
      const ch = (s: number): number => Math.round(((v >> s) & 255) * (1 - k) + 255 * k);
      dst.d[dy * dst.w + dx] = ((255 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
    }
  }
}

// ---------------------------------------------------------------- the checkpoint
/** A checkpoint booth, 32 by 32: an olive hut under a flat roof with an amber lamp, a HALT plate, a lit window with its ledge, a door and a skirt of sandbags. */
export function boothArt(): Px {
  const p = new Px(32, 32);
  p.rect(2, 9, 28, 22, 'pine2').rect(2, 9, 28, 1, 'pine3');
  p.rect(0, 4, 32, 6, 'pine1').rect(0, 4, 32, 1, 'pine2').rect(0, 9, 32, 1, 'ink');
  p.rect(2, 1, 2, 3, 'grey2').rect(1, 0, 4, 2, 'ink').rect(2, 0, 2, 1, 'amber').set(2, 0, 'yellow');
  p.rect(3, 11, 19, 7, 'red').frame(3, 11, 19, 7, 'bone');
  tiny(p, 5, 12, 'HALT', 'white');
  p.rect(4, 19, 14, 8, 'ink').rect(5, 20, 12, 6, 'cream').rect(5, 20, 12, 2, 'yellow').rect(11, 20, 1, 6, 'ink').set(6, 21, 'white').set(7, 22, 'white');
  p.rect(3, 26, 16, 2, 'soil2').rect(3, 26, 16, 1, 'soil3');
  p.rect(21, 12, 8, 17, 'pine1').frame(21, 12, 8, 17, 'ink').rect(22, 14, 6, 5, 'ink').rect(23, 15, 4, 3, 'teal1').set(23, 15, 'cyan').set(26, 22, 'amber');
  for (let x = 0; x < 32; x += 8) p.rect(x, 28, 8, 4, 'sand').rect(x, 28, 8, 1, 'cream').rect(x, 31, 8, 1, 'soil3').set(x, 29, 'soil3').set(x + 7, 29, 'soil3');
  return p;
}

/** A boom gate, 48 by 24: a post with a red lamp and the striped arm across the road, or swung up when `open`. `vertical` turns it a quarter, 24 by 48, for a road that runs across the screen. */
export function boomArt(open = false, vertical = false): Px {
  const p = new Px(48, 24);
  p.rect(0, 10, 7, 14, 'grey2').rect(0, 10, 7, 1, 'grey3').rect(5, 10, 2, 14, 'grey1').rect(1, 12, 3, 2, 'ink').set(2, 12, open ? 'leaf' : 'hot').rect(0, 22, 7, 2, 'ink');
  const stripe = (x: number, y: number, i: number): void => { p.set(x, y, (i >> 2) & 1 ? 'bone' : 'red'); };
  if (!open) {
    for (let x = 6; x < 48; x++) for (let j = 0; j < 4; j++) stripe(x, 12 + j, x + j);
    p.rect(6, 12, 42, 1, 'white').rect(6, 15, 42, 1, 'blood1').frame(6, 12, 42, 4, 'ink').rect(3, 14, 4, 4, 'grey1');
  } else {
    for (let i = 0; i < 24; i++) for (let j = 0; j < 3; j++) stripe(4 + j + (i >> 1), 10 - i, i + j);
    p.rect(2, 11, 5, 3, 'grey1').rect(2, 11, 5, 1, 'grey2');
  }
  return vertical ? transposed(p) : p;
}

/** A curfew sign on a post, 26 by 32: a red header over a white plate with the hour, on a grey post with a foot. */
export function curfewSignArt(): Px {
  const p = new Px(26, 32);
  p.rect(12, 20, 3, 11, 'grey2').rect(12, 20, 1, 11, 'grey3').rect(14, 20, 1, 11, 'grey1').rect(8, 30, 11, 2, 'grey1').rect(8, 30, 11, 1, 'grey2');
  p.rect(0, 0, 26, 20, 'bone').frame(0, 0, 26, 20, 'ink').rect(1, 1, 24, 1, 'white').rect(1, 2, 24, 8, 'red').rect(1, 9, 24, 1, 'blood1');
  tiny(p, 2, 4, 'CURFEW', 'white');
  tiny(p, 7, 12, '8PM', 'ink');
  p.rect(3, 18, 20, 1, 'grey3').set(2, 2, 'bone').set(23, 2, 'bone').set(2, 17, 'grey2').set(23, 17, 'grey2');
  return p;
}
