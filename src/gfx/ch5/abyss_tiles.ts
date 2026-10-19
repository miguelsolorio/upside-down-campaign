// The Abyss (stage 5.2): broken pieces of Hawkins floating over a red void. The island tops are Hawkins upside down in 4.3's Blue night
// look (hawkinsud_a.ts): dead teal lawn, cracked asphalt, a porch, a classroom floor, with red veins that creep from tile to tile and
// pulse with the phase. An island ends in a rim on every side that opens on the drop (rounded at its corners), the tile below its
// south edge is the rock face (cliff), and the one below that is the rock tapering into the void (under), jagged and dripping red.
// A gap is the drop itself: clear, so the background (abyss_bg.ts) shows through, with a rock wall on its north side when it is a hole
// in an island and a shadow where an island leans over it. A vine bridge runs between two islands, horizontal or vertical: two twisted
// rails, a deck of root slats with the void showing between them, and vines hanging off its edge. The tops are painted in the values
// the stage shows (no night pass), so bake the Abyss as a day stage. Same calling style as fleshTile: (name, ctx, phase) or null.
import type { TileCtx } from '../tile_ground.ts';
import type { ColorName } from '../palette.ts';
import { hash2 } from '../canvas.ts';
import { Px } from '../px.ts';
import { armsOf, coin, flatten, glowLines, routes, variant } from '../tile_net.ts';
import type { Pt } from '../tile_net.ts';
import { ABYSS_TILES, isBridge, isDrop, isLand, isTop, near, rim, transposed, wn } from './abyss_kit.ts';
import type { AbyssTile, Open, RimColors } from './abyss_kit.ts';

export { ABYSS_TILES } from './abyss_kit.ts';
export type { AbyssTile } from './abyss_kit.ts';

const VEIN = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'hot' } as const;
/** The hash of a place, for the few things that differ from tile to tile. */
const h = (c: TileCtx, salt: number): number => hash2(c.tx, c.ty, salt);
const dots = (px: Px, list: readonly Pt[], col: ColorName): void => { for (const [x, y] of list) px.set(x, y, col); };
/** A list mirrored on odd columns, so a run of tiles with one variant does not repeat. */
const flip = (c: TileCtx, list: readonly Pt[]): Pt[] => list.map(([x, y]) => [c.tx & 1 ? 15 - x : x, y] as Pt);

/** Which sides of an island floor open on the drop. The cliff below the south edge carries on the picture, so it is not an edge. */
function topOpen(c: TileCtx): Open {
  const d = (s: 'n' | 'e' | 's' | 'w'): boolean => isDrop(near(c, s));
  return { n: d('n'), e: d('e'), w: d('w'), s: near(c, 's') === 'abyssgap' || near(c, 's') === 'abyssunder' };
}

// ---------------------------------------------------------------- the floors
const BLADE: Pt[][] = [[[3, 5], [9, 3], [13, 7], [5, 11], [11, 12]], [[6, 4], [12, 4], [2, 8], [9, 9], [4, 14]], [[2, 4], [9, 7], [14, 4], [7, 12], [12, 13]], [[8, 4], [3, 8], [13, 9], [6, 13], [11, 11]]];

/** Dead lawn: teal turf with bare earth in patches that run on across tiles, and tufts of pale dead grass. */
function lawn(c: TileCtx): Px {
  const px = new Px(16).fill('teal1');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const m = wn(c, x, y, 6, 71) * 0.6 + wn(c, x, y, 3, 72) * 0.4;
      if (m > 0.64) px.set(x, y, 'teal0');
      else if (m < 0.3 && (x + y) % 3 === 0) px.set(x, y, 'teal0');
    }
  }
  for (const [x, y] of flip(c, BLADE[variant(c)] as Pt[])) {
    px.rect(x, y - 2, 1, 3, 'slate').rect(x - 2, y - 1, 1, 2, 'slate').rect(x + 2, y - 1, 1, 2, 'slate').set(x, y, 'teal0');
  }
  return px;
}

const CRACK: Pt[][] = [[[1, 5], [4, 6], [6, 9], [10, 10], [14, 13]], [[14, 2], [11, 4], [10, 8], [6, 9], [3, 12]], [[0, 11], [4, 10], [7, 12], [11, 11], [15, 13]], [[8, 1], [9, 5], [7, 8], [9, 12]]];
const GRIT: Pt[][] = [[[2, 3], [9, 5], [13, 9], [5, 12], [11, 14]], [[6, 2], [12, 4], [3, 8], [9, 10], [14, 12]], [[4, 4], [10, 3], [14, 7], [2, 11], [8, 13]], [[1, 6], [7, 3], [13, 3], [4, 13], [10, 11]]];
/** Cracked asphalt, dark blue, with grit and a crack; `line` adds the broken painted line down the middle. */
function road(c: TileCtx, line: boolean): Px {
  const px = new Px(16).fill('dusk');
  const v = variant(c);
  dots(px, flip(c, GRIT[v] as Pt[]), 'slate');
  for (let y = 0; y < 16; y += 4) for (let x = (y * 3 + c.tx * 5) % 6; x < 16; x += 6) if (wn(c, x, y, 4, 73) > 0.55) px.set(x, y, 'shadow');
  const path = flatten({ pts: flip(c, CRACK[v] as Pt[]), freeStart: true, freeEnd: true });
  dots(px, path, 'night');
  if (line) {
    const x0 = near(c, 'w') === 'abyssline' ? 0 : 3, x1 = near(c, 'e') === 'abyssline' ? 16 : 13;
    px.rect(x0, 7, x1 - x0, 2, 'bone').rect(x0, 9, x1 - x0, 1, 'shadow');
    for (const x of [[5, 11], [3, 9], [7], [4, 12]][v] as number[]) if (x >= x0 && x < x1) px.rect(x, 7, 1, 2, 'dusk');
  } else if (h(c, 74) % 3 === 0) {
    px.ellipse(c.tx & 1 ? 10 : 5, 10, 3.5, 2, 'shadow').set(c.tx & 1 ? 9 : 4, 9, 'slate');
  }
  return px;
}

/** A porch: boards running across, dark wood gone to mold, a nail in each end, and on some tiles a doormat. */
function porch(c: TileCtx): Px {
  const px = new Px(16).fill('soil1');
  for (let r = 0; r < 4; r++) {
    const y = r * 4;
    px.rect(0, y, 16, 1, 'soil2').rect(0, y + 3, 16, 1, 'soil0');
    const joint = (hash2(c.tx, c.ty * 4 + r, 75) % 12) + 2;
    px.rect(joint, y, 1, 4, 'soil0');
    px.set(joint + 2, y + 1, 'soil3').set((joint + 8) & 15, y + 1, 'soil3');
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (wn(c, x, y, 5, 76) > 0.7 && (x + y) % 2 === 0) px.set(x, y, 'teal0');
  if (h(c, 79) % 9 === 0) {
    px.rect(3, 5, 10, 7, 'blood0').rect(4, 6, 8, 5, 'blood1').rect(5, 7, 6, 3, 'blood0');
    px.set(3, 5, 'soil0').set(12, 11, 'soil0');
  }
  return px;
}

/** A classroom floor: 8 px linoleum squares in two dim blues, a scuff, a crack, and dust in the grout. */
function classroom(c: TileCtx): Px {
  const px = new Px(16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const cell = (((c.tx * 2 + (x >> 3)) + (c.ty * 2 + (y >> 3))) & 1) === 0;
      px.set(x, y, x % 8 === 0 || y % 8 === 0 ? 'night' : cell ? 'slate' : 'dusk');
    }
  }
  for (let y = 0; y < 16; y += 8) for (let x = 1; x < 16; x++) if (((x + y + c.tx) & 3) === 0) px.set(x, y, 'shadow');
  const v = variant(c);
  dots(px, flip(c, GRIT[v] as Pt[]).filter((_, i) => i < 3), 'mist');
  if (v === 2) dots(px, flatten({ pts: flip(c, CRACK[1] as Pt[]), freeStart: true, freeEnd: true }), 'night');
  if (v === 0) px.rect(c.tx & 1 ? 9 : 3, 10, 4, 1, 'bone').rect(c.tx & 1 ? 10 : 4, 11, 3, 1, 'mist');
  return px;
}

/** The red veins that creep over the floors, from tile to tile, and the pale spores that drift up off them. */
function growth(px: Px, c: TileCtx, phase: number): void {
  const { sides, lone } = armsOf(c, (n) => (isTop(n as string) ? 'peer' : 'none'), 24, 0, 5);
  if (!lone || coin(c, 77, 5)) {
    const lines = routes(sides, variant(c), lone).map((r) => flatten(r));
    glowLines(px, lines, phase, VEIN);
  }
  const p = phase & 3;
  [[3, 4], [11, 9]].forEach(([x, y], i) => {
    if (coin(c, 78 + i, 2)) px.set((x + [0, 1, 1, 0][p] + c.tx * 3) & 15, (y - p * (1 + (i & 1)) + 16) & 15, i ? 'mist' : 'white');
  });
}

const RIM_LAWN: RimColors = { ink: 'ink', lit: 'slate', dark: 'teal0', inner: 'teal0' };
const RIM_ROAD: RimColors = { ink: 'ink', lit: 'mist', dark: 'night', inner: 'shadow' };
const RIM_PORCH: RimColors = { ink: 'ink', lit: 'soil3', dark: 'soil0', inner: 'soil0' };
const RIM_CLASS: RimColors = { ink: 'ink', lit: 'bone', dark: 'night', inner: 'shadow' };

function island(name: AbyssTile, c: TileCtx, phase: number): Px {
  const px = name === 'abysslawn' ? lawn(c) : name === 'abyssroad' ? road(c, false) : name === 'abyssline' ? road(c, true) : name === 'abyssporch' ? porch(c) : classroom(c);
  growth(px, c, phase);
  rim(px, topOpen(c), name === 'abysslawn' ? RIM_LAWN : name === 'abyssporch' ? RIM_PORCH : name === 'abyssclass' ? RIM_CLASS : RIM_ROAD);
  return px;
}

// ---------------------------------------------------------------- the rock under an island
/** One step down the blues, for rock in the shade of what hangs over it. */
const DEEPER: Record<string, ColorName> = { slate: 'dusk', dusk: 'shadow', shadow: 'night', night: 'ink', mist: 'slate' };

/** Strata that run on from the cliff into the tile under it: bands of three blues, wavering with x, the lit edge of each band on its top row. From row `from` down the rock goes a step darker, and a step more from `from2`. */
function strata(px: Px, c: TileCtx, from: number, from2: number): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wy = c.ty * 16 + y, wob = Math.round(wn(c, x, 0, 7, 81) * 3 + wn(c, x, y, 3, 82) * 1.5);
      const band = Math.floor((wy + wob) / 4), top = (wy + wob) % 4 === 0;
      const base: ColorName = (['dusk', 'shadow', 'night'] as const)[((band % 3) + 3) % 3] as ColorName;
      let col: ColorName = top && base !== 'night' ? 'slate' : base;
      if (wn(c, x, y, 2, 83) > 0.8) col = 'night';
      for (const f of [from, from2]) if (y >= f) col = DEEPER[col] ?? col;
      px.set(x, y, col);
    }
  }
}

/** Cracks that glow red and a red drip at a few tips, by variant. */
function seams(px: Px, c: TileCtx, phase: number, x0: number): void {
  if (!coin(c, 85, 2)) return;
  const v = variant(c), pts: Pt[] = [[x0 + 2 + v, 1], [x0 + 3 + v, 5], [x0 + 1 + v, 8], [x0 + 3, 12]];
  const path = flatten({ pts, freeStart: true, freeEnd: true });
  path.forEach(([x, y], i) => px.set(x, y, (i + phase * 2) % 9 === 0 ? 'hot' : (i + phase * 2) % 9 === 1 ? 'red' : 'blood1'));
}

/** The earth the grass grows in, over the top of the rock, with roots hanging off it. */
function soil(px: Px, c: TileCtx): void {
  for (let x = 0; x < 16; x++) {
    const fringe = 1 + Math.round(wn(c, x, 0, 3, 86) * 2);
    for (let y = 0; y < 3 + fringe; y++) px.set(x, y, y === 0 ? 'teal0' : y < fringe ? 'teal0' : (x + y) % 3 === 0 ? 'soil2' : 'soil1');
    if (hash2(c.tx * 16 + x, c.ty, 87) % 5 === 0) {
      const len = 3 + (hash2(c.tx * 16 + x, c.ty, 88) % 5);
      for (let y = 4; y < 4 + len; y++) px.set(x, y, y > 5 + len - 3 ? 'soil1' : 'soil2');
    }
  }
}

/** A vine hanging off the rock, its leaves and a dark red pod at the tip. */
function hanging(px: Px, c: TileCtx): void {
  if (!coin(c, 89, 3)) return;
  const x = 2 + (h(c, 90) % 12), len = 6 + (h(c, 91) % 8);
  for (let y = 2; y < 2 + len; y++) {
    const sway = y > 8 ? 1 : 0;
    px.set(x + sway, y, y % 4 === 0 ? 'pine3' : 'pine2').set(x + sway + 1, y, 'pine0');
    if (y % 4 === 2) px.set(x + sway - 1, y, 'pine3');
  }
  px.set(x + (len > 6 ? 1 : 0), 2 + len, 'blood1');
}

/** The rock face under the south edge of an island: soil and roots on top, strata below, ragged along the bottom unless the taper is under it. */
function cliff(c: TileCtx, phase: number): Px {
  const px = new Px(16);
  strata(px, c, 9, 99);
  soil(px, c);
  seams(px, c, phase, 0);
  hanging(px, c);
  if (near(c, 's') !== 'abyssunder') {
    for (let x = 0; x < 16; x++) {
      const L = 11 + Math.round(wn(c, x, 15, 4, 92) * 5);
      for (let y = L; y < 16; y++) px.d[y * 16 + x] = 0;
    }
  }
  const open: Open = { n: false, s: false, w: isLand(near(c, 'w')) ? false : near(c, 'w') !== 'abysscliff', e: isLand(near(c, 'e')) ? false : near(c, 'e') !== 'abysscliff' };
  rim(px, open, { ink: 'ink', lit: 'mist', dark: 'night' }, 2);
  edgeInk(px);
  return px;
}

/** A dark line under every ragged pixel of the bottom, so the rock reads against the void. */
function edgeInk(px: Px): void {
  for (let x = 0; x < 16; x++) {
    let last = -1;
    for (let y = 15; y >= 0; y--) if (px.d[y * 16 + x]) { last = y; break; }
    if (last >= 0 && last < 15) px.set(x, last + 1, 'ink');
  }
}

/** The rock tapering into the void: it narrows toward the ends of the island and ends in jagged points, with a red drip at some tips. */
function under(c: TileCtx, phase: number): Px {
  const px = new Px(16);
  strata(px, c, 0, 8);
  const openW = near(c, 'w') !== 'abyssunder' && near(c, 'w') !== 'abysscliff', openE = near(c, 'e') !== 'abyssunder' && near(c, 'e') !== 'abysscliff';
  for (let x = 0; x < 16; x++) {
    const toEdge = Math.min(openW ? x : 99, openE ? 15 - x : 99);
    const L = Math.max(2, Math.min(15, Math.round(5 + wn(c, x, 15, 3, 93) * 10 - Math.max(0, 6 - toEdge) * 1.2)));
    for (let y = L; y < 16; y++) px.d[y * 16 + x] = 0;
  }
  for (let y = 0; y < 16; y++) {
    const cut = Math.floor(y * 0.55);
    for (let x = 0; x < 16; x++) if ((openW && x < cut) || (openE && 15 - x < cut)) px.d[y * 16 + x] = 0;
  }
  seams(px, c, phase, 3);
  rim(px, { n: false, s: false, w: false, e: false }, { ink: 'ink', lit: 'mist', dark: 'night' }, 1);
  const outline = px.d.slice();
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (outline[y * 16 + x]) continue;
      const n = (xx: number, yy: number): number => (xx >= 0 && yy >= 0 && xx < 16 && yy < 16 ? (outline[yy * 16 + xx] as number) : 0);
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1)) px.set(x, y, 'ink');
    }
  }
  for (let x = 1; x < 15; x++) {
    let y = 15;
    while (y >= 0 && !outline[y * 16 + x]) y--;
    if (y >= 3 && y < 15 && hash2(c.tx * 16 + x, c.ty, 94) % 6 === 0) px.set(x, y, (phase + x) & 2 ? 'hot' : 'red');
  }
  return px;
}

// ---------------------------------------------------------------- the drop
/**
 * The drop. Clear, so the background shows. A hole in an island (an island tile to its north) shows the far wall of the hole, rock
 * falling away in strata and fading to nothing; a side that an island leans over is shaded, and a few specks of debris hang in it.
 */
function gap(c: TileCtx): Px {
  const px = new Px(16);
  if (isLand(near(c, 'n'))) {
    for (let x = 0; x < 16; x++) {
      const L = 6 + Math.round(wn(c, x, 0, 3, 95) * 4);
      for (let y = 0; y < L; y++) {
        const wob = Math.round(wn(c, x, y, 3, 82));
        px.set(x, y, y < 2 ? 'ink' : (y + wob) % 4 === 0 ? 'night' : y > L - 3 ? 'ink' : 'black');
      }
      px.set(x, L, 'ink');
      if (hash2(c.tx * 16 + x, c.ty, 96) % 7 === 0) px.set(x, L + 1, 'blood0');
    }
    for (let x = 0; x < 16; x += 5) px.set(x + (h(c, 97) & 3), 3, 'blood1');
  }
  for (const [side, col] of [['w', 0], ['e', 15]] as const) {
    if (!isLand(near(c, side))) continue;
    for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) if (((y + k) & 1) === 0 && k < 3 - (y & 1)) px.set(col === 0 ? k : 15 - k, y, k < 2 ? 'black' : 'ink');
  }
  if (near(c, 'n') === 'abyssbridgeh') {
    for (const [x, len] of [[3, 7], [8, 12], [13, 5]] as const) {
      for (let y = 0; y < len; y++) px.set(x + (y > 4 ? 1 : 0), y, y % 4 === 1 ? 'pine3' : y % 4 === 3 ? 'pine1' : 'pine2').set(x + 1 + (y > 4 ? 1 : 0), y, 'pine0');
      px.set(x + (len > 4 ? 1 : 0), len, 'blood1');
    }
  }
  if (h(c, 98) % 3 === 0) {
    const x = 3 + (h(c, 99) % 10), y = 6 + (h(c, 100) % 8);
    px.set(x, y, 'blood1').set(x, y + 1, 'blood0').set(x + 1, y, 'blood0');
  }
  return px;
}

// ---------------------------------------------------------------- the vine bridge
/** The bridge painted running east to west (u along it, v across); the vertical one is this turned on its side. Rails and slats are laid out on world coordinates, so a run of tiles is one bridge. */
function bridge(c: TileCtx, vertical: boolean): Px {
  const px = new Px(16);
  const base = vertical ? c.ty * 16 : c.tx * 16, other = vertical ? 'n' : 'w', far = vertical ? 's' : 'e';
  const set = (u: number, v: number, col: ColorName): void => { px.set(u, v, col); };
  const start = isLand(near(c, other)) && !isBridge(near(c, other)), end = isLand(near(c, far)) && !isBridge(near(c, far));
  // The deck: slats of root, 3 px wide and 1 apart across the walk, a little out of line, with the void showing between them.
  for (let u = 0; u < 16; u++) {
    const k = Math.floor((base + u) / 4), at = (base + u) % 4;
    if (at === 3) continue;
    const jog = hash2(k, 7, 101) % 4 === 0 ? 1 : 0, top = 4 + jog, bot = 11 - (hash2(k, 8, 101) % 5 === 0 ? 1 : 0);
    for (let v = top; v <= bot; v++) set(u, v, v === top ? 'soil3' : v >= bot - 1 ? 'soil1' : at === 0 ? 'soil3' : 'soil2');
    if (hash2(k, 9, 101) % 3 === 0) set(u, 7 + (k & 1), 'soil1');
  }
  // The rails: twisted vines, a lit strand and a dark one winding, a thorn here and there, a knot every eight px.
  for (const r of [2, 11]) {
    for (let u = 0; u < 16; u++) {
      const t = (base + u) % 8, twist = t < 4;
      set(u, r - 1, 'ink'); set(u, r + 3, 'ink');
      set(u, r, twist ? 'pine3' : 'pine2');
      set(u, r + 1, twist ? 'pine2' : 'pine1');
      set(u, r + 2, twist ? 'pine0' : 'pine1');
      if ((base + u) % 8 === 4) { set(u, r - 1, 'blood1'); set(u, r + 3, 'pine0'); }
      if ((base + u) % 16 === 7) { set(u, r - 1, 'pine0'); set(u, r + 3, 'pine0'); set(u, r + 1, 'blood1'); }
    }
  }
  // Vines hanging below the near rail, into the drop.
  for (let u = 1; u < 16; u++) {
    if (hash2(base + u, 1, 102) % 5 !== 0) continue;
    const len = 1 + (hash2(base + u, 2, 102) % 2);
    for (let v = 14; v < 14 + len; v++) set(u, v, v === 14 ? 'pine2' : 'pine0');
  }
  // Where it meets an island the rails are lashed into the ground with roots.
  const lash = (u0: number, dir: number): void => {
    for (let k = 0; k < 4; k++) {
      const u = u0 + dir * k;
      for (const r of [1, 10]) { set(u, r, 'pine0'); set(u, r + 4, 'pine0'); }
      for (const r of [2, 11]) { set(u, r, k % 2 ? 'pine1' : 'pine0'); set(u, r + 1, 'pine0'); set(u, r + 2, 'ink'); }
    }
    set(u0 + dir, 3, 'blood1'); set(u0 + dir, 12, 'blood1');
  };
  if (start) lash(0, 1);
  if (end) lash(15, -1);
  return vertical ? transposed(px) : px;
}

// ---------------------------------------------------------------- public
/** The Abyss's tiles. Null for any other tile. Phase 0 to 3 moves the pulse in the veins and the drips, as fleshTile's does. */
export function abyssTile(name: string, c: TileCtx, phase = 0): Px | null {
  if (!(ABYSS_TILES as readonly string[]).includes(name)) return null;
  switch (name as AbyssTile) {
    case 'abysscliff': return cliff(c, phase);
    case 'abyssunder': return under(c, phase);
    case 'abyssgap': return gap(c);
    case 'abyssbridgeh': return bridge(c, false);
    case 'abyssbridgev': return bridge(c, true);
    default: return island(name as AbyssTile, c, phase);
  }
}
