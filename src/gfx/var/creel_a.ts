// Creel House looks 1 and 2 (stage 4.2, see look_kit.ts and creel.ts). "Lived in" is the house in 1959: green damask over a
// dark wainscot, polished boards, a red rug, a lamp's warm pool. "Abandoned" is 1986: grey blue paper peeling off the lath, a
// boarded window letting moonlight through, dust, a moth eaten rug. The painters below take a Kit (one palette name per role)
// and a few small kits for the mirror, window, rug, clock, lamp and chair, so creel_b.ts reuses all of them for Blood red and
// the Upside Down and only adds its own paper, glass and overlays. Night looks are painted in daytime values for the night pass
// to darken. The painters read only the tile's letter, variant, neighbors and tx, ty parity (the tile cache keys on those), and
// no noise: every mark comes from a hand made arrangement picked by the variant.
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { dots } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

type Rect = [number, number, number, number];

/** One palette name for every role of the walls and floor. */
export interface Kit {
  top: N; topHi: N;                 // the wall top and its lit edge
  rail: N; railHi: N; railLo: N;    // crown, chair rail, baseboard
  wd: N; wdHi: N; wdLo: N;          // wainscot panels
  fl: N; flHi: N; flLo: N; seam: N; gleam?: N; rim?: N; // floorboards, their polish glints, the lit splinters of a hole
  shade: N;                         // the paper's top row, shaded by the crown
}
export interface MirrorKit { fr: N; hi: N; lo: N; glass: N; sheen: N; shine: N; ghost: N; eye: N; crack: N }
export interface WinKit { fr: N; frHi: N; frLo: N; bar?: N }
export interface RugKit { field: N; dark: N; pat: N; band: N; line: N; fringe: N }
export interface ClockKit { body: N; hi: N; lo: N; brass: N; brassHi: N; face: N; hand: N; well: N }
export interface LampKit { shade: N; hi: N; lo: N; pole: N; foot: N }
export interface ChairKit { b: N; h: N; l: N; leg: N; nail: N }
export type Paper = (px: Px, c: TC, phase: number) => void;
export type Glass = (px: Px, c: TC, g0: number, g1: number, phase: number) => void;
export const isWall = (ch: string): boolean => 'WMmw#'.includes(ch);

const JOINT: [number, number][][] = [[[1, 10]], [[3, 5]], [[0, 12], [2, 4]], []]; // [plank, x] where a plank ends in the tile (at most one per plank), by variant
const GRAIN: Pt[][] = [[[3, 2], [8, 10]], [[6, 6], [1, 14]], [[2, 10], [9, 6]], [[5, 2], [7, 14]]]; // where a 5 px grain line lies
const GLEAM: Pt[][] = [[[3, 1], [10, 9]], [[8, 5], [2, 13]], [[11, 1], [5, 9]], [[2, 5], [9, 13]]];

/** Floorboards: four planks 3 px tall that run the full tile, a lit top edge, a 1 px dark gap, an end joint with a nail either side on some, grain lines; shaded under a wall. */
export function boards(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.fl);
  for (let b = 0; b < 4; b++) px.rect(0, b * 4, 16, 1, k.flHi).rect(0, b * 4 + 3, 16, 1, k.seam);
  for (const [b, x] of JOINT[c.v]) px.rect(x, b * 4, 1, 4, k.seam).set(x + 1, b * 4, k.flHi).set(x - 2, b * 4 + 1, k.seam).set(x + 3, b * 4 + 1, k.seam);
  for (const [x, y] of GRAIN[c.v]) px.rect(x, y, 5, 1, k.flLo);
  if (k.gleam) for (const [x, y] of GLEAM[c.v]) px.rect(x, y, 3, 1, k.gleam);
  if (isWall(c.n)) px.rect(0, 0, 16, 1, k.seam).rect(0, 1, 16, 1, k.flLo);
  if (isWall(c.w)) px.rect(0, 0, 1, 16, k.seam).rect(1, 0, 1, 16, k.flLo);
  return px;
}

/** A wall top seen from above: one solid dark color with a thin lit edge where it meets the face below and where it looks out over the room. */
export function crown(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.top);
  if ('WMmw'.includes(c.s)) px.rect(0, 15, 16, 1, k.topHi);
  if (!isWall(c.n)) px.rect(0, 0, 16, 1, k.topHi);
  if (!isWall(c.w)) px.rect(0, 0, 1, 16, k.topHi);
  return px;
}

/** A wall face: paper above a chair rail, a wainscot of small raised panels, a baseboard, and a door post where the wall ends at a doorway. */
export function face(k: Kit, c: TC, paper: Paper, phase = 0): Px {
  const px = new Px(16);
  paper(px, c, phase);
  px.rect(0, 0, 16, 1, k.shade).rect(0, 9, 16, 1, k.railHi).rect(0, 10, 16, 1, k.rail).rect(0, 11, 16, 1, k.wdLo).rect(0, 12, 16, 2, k.wd);
  for (let x = 0; x < 16; x += 8) px.rect(x, 12, 1, 2, k.wdLo).rect(x + 7, 12, 1, 2, k.wdLo).rect(x + 1, 12, 6, 1, k.wdHi).set(x + 1, 13, k.wdHi);
  px.rect(0, 14, 16, 1, k.rail).rect(0, 15, 16, 1, k.railLo);
  if (c.e === '.') px.rect(14, 0, 1, 16, k.rail).rect(15, 0, 1, 16, k.railLo);
  if (c.w === '.') px.rect(0, 0, 1, 16, k.railHi).rect(1, 0, 1, 16, k.rail);
  return px;
}

/** Damask: a diamond with a dark heart, in two columns a half drop apart, over a field. */
const MOTIF = ['...aa...', '..a..a..', '.a.dd.a.', 'a.dddd.a', '.a.dd.a.', '..a..a..', '...aa...', '........'];
export function damask(px: Px, f: N, a: N, d: N): void {
  for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) { const m = MOTIF[(y + (x >> 3) * 4) & 7][x & 7]; px.set(x, y, m === 'a' ? a : m === 'd' ? d : f); }
}

const GHOST = ['..ff..', '.hffh.', '.ffff.', '..ff..', 'ffffff', 'ffffff']; // head and shoulders, h the eyes
const SHARDS = ['bcgnnn', 'bbcnnc', 'cbcncb', 'gcccbb', 'cckkcc', 'bcccbb', 'cgcncb', 'ggcnnc', 'gggcnn']; // g glass, b a bright shard, n one gone to the dark, c a crack, k the impact
/** A mirror hung on a wall face, tall (10 by 13): a gilt or dark frame, lit glass with a sheen and a faint figure (whole), or bold cracks with shards gone to the dark (broken). */
export function mirror(px: Px, m: MirrorKit, broken: boolean, phase: number): Px {
  px.rect(3, 1, 10, 13, 'ink').rect(4, 2, 8, 11, m.fr).rect(4, 2, 8, 1, m.hi).rect(4, 2, 1, 11, m.hi).rect(11, 3, 1, 10, m.lo).rect(5, 12, 7, 1, m.lo);
  px.rect(7, 0, 2, 1, m.fr).rect(6, 1, 4, 1, m.hi).rect(5, 3, 6, 9, m.glass);
  if (broken) {
    px.art(SHARDS, { g: m.glass, b: m.sheen, n: 'black', c: m.crack, k: 'black' }, 5, 3);
    px.set(4, 12, 'black').set(11, 2, 'black').set(4, 11, 'ink');
    dots(px, [[5, 14], [8, 14], [10, 14]], m.sheen);
  } else {
    px.rect(5, 3, 2, 1, m.shine).set(5, 4, m.shine).line(10, 3, 8, 5, m.sheen).line(10, 8, 9, 11, m.sheen);
    if (phase !== 3) px.art(GHOST, { f: m.ghost, h: phase < 2 ? m.eye : m.ghost }, 5, 6);
  }
  return px;
}

/** A window in a wall face, two tiles wide (left half when c.w isn't a window, right half when c.e isn't): frame, sill, glass from `glass`. */
export function windowTile(k: Kit, w: WinKit, c: TC, paper: Paper, glass: Glass, phase = 0): Px {
  const px = face(k, c, paper), L = c.w !== 'w', R = c.e !== 'w';
  const x0 = L ? 2 : 0, x1 = R ? 13 : 15, g0 = L ? 4 : 1, g1 = R ? 11 : 14, n = x1 - x0 + 1;
  px.rect(x0, 1, n, 12, 'ink').rect(L ? x0 + 1 : x0, 2, n - (L ? 1 : 0) - (R ? 1 : 0), 10, w.fr).rect(L ? x0 + 1 : x0, 2, n - (L ? 1 : 0) - (R ? 1 : 0), 1, w.frHi).rect(L ? 1 : 0, 13, (R ? 14 : 16) - (L ? 1 : 0), 1, k.railHi);
  px.rect(g0 - 1 + (L ? 0 : 1), 2, 1, 1, w.frHi);
  glass(px, c, g0, g1, phase);
  if (w.bar) px.rect(g0, 7, g1 - g0 + 1, 1, w.bar).rect(L && R ? 7 : L ? 9 : 6, 3, 1, 9, w.bar);
  return px;
}

/** A rug tile: a diamond lattice with a flower in each cell and, in the middle row, a lozenge per tile; the border follows the neighbors, with fringe on the short ends. */
export function rug(r: RugKit, c: TC): Px {
  const px = new Px(16).fill(r.field), mid = c.n === 'r' && c.s === 'r';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) px.set(x, y, r.dark);
    const m = (x & 7) === 4 && (y & 7) === 0 || (x & 7) === 0 && (y & 7) === 4;
    if (m) px.set(x, y, r.pat).set(x + 1, y, r.pat).set(x - 1, y, r.pat).set(x, y + 1, r.pat).set(x, y - 1, r.pat);
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    if (mid) px.set(x, y, d <= 1 ? r.line : d <= 3 ? r.pat : d <= 5 ? r.band : d <= 7 ? r.dark : px.get(x, y));
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dl = c.w !== 'r' ? x : 99, dr = c.e !== 'r' ? 15 - x : 99, dt = c.n !== 'r' ? y : 99, db = c.s !== 'r' ? 15 - y : 99, e = Math.min(dl, dr, dt, db);
    if (e > 5) continue;
    const end = (dl === 0 || dr === 0) && dt > 0 && db > 0;
    px.set(x, y, e === 0 ? (end && y & 1 ? r.fringe : r.dark) : e === 1 || e === 5 ? r.dark : e === 4 ? r.line : r.band);
  }
  return px;
}

const PIT = [[5, 10], [3, 12], [2, 13], [2, 13], [1, 13], [2, 14], [1, 13], [2, 13], [3, 12], [3, 11], [4, 10], [6, 9]]; // x extents of rows 2 to 13
const STUB: Rect[][] = [[[1, 5, 5, 1], [10, 9, 5, 1], [4, 12, 4, 1]], [[1, 8, 4, 1], [11, 4, 4, 1], [6, 12, 4, 1]]];
/** A hole of broken boards over the dark: jagged rim, splinters hanging in, a snapped joist. Painted on top of the boards of the tile. */
export function pit(k: Kit, px: Px, c: TC): Px {
  const f = c.v & 1, ext = (i: number): Pt => { const [a, b] = PIT[i] as number[]; return f ? [15 - b, 15 - a] : [a, b]; };
  PIT.forEach((_, i) => {
    const [x0, x1] = ext(i), y = 2 + i;
    px.rect(x0 - 1, y, x1 - x0 + 3, 1, 'ink').rect(x0, y, x1 - x0 + 1, 1, i < 2 ? 'soil0' : 'black').set(x0 - 2, y, k.rim ?? k.flHi).set(x1 + 2, y, k.flLo);
    if (i & 1) px.set(x0 - 1, y, k.rim ?? k.flHi).set(x1 + 1, y, k.fl);
  });
  px.rect(ext(0)[0], 1, ext(0)[1] - ext(0)[0] + 1, 1, 'ink').rect(ext(11)[0], 14, ext(11)[1] - ext(11)[0] + 1, 1, 'ink');
  px.rect(f ? 7 : 4, 8, 5, 2, 'soil1').rect(f ? 7 : 4, 8, 5, 1, 'soil2');
  for (const [x, y, w, h] of STUB[f]) px.rect(x, y, w, h, k.rim ?? k.flHi).rect(x, y + 1, w, 1, k.fl).set(f ? x : x + w - 1, y, 'ink');
  return px;
}

/** A grandfather clock (16 by 32): pediment and finial, a hood with a round face, a trunk with a glass door, a plinth. The pendulum swings with the phase. */
export function clock(k: ClockKit, phase: number): Px {
  const px = new Px(16, 32), off = [-2, 0, 2, 0][phase & 3] as number;
  px.rect(7, 0, 2, 1, k.brassHi).rect(5, 1, 6, 1, k.hi).rect(3, 2, 10, 1, k.hi).rect(2, 3, 12, 2, k.body).rect(2, 3, 12, 1, k.hi);
  px.rect(1, 5, 14, 9, k.body).rect(1, 5, 1, 9, k.hi).rect(14, 5, 1, 9, k.lo).rect(2, 14, 12, 1, k.lo).rect(2, 13, 12, 1, k.brass);
  px.ellipse(8, 9.5, 4.6, 4.6, k.brass).ellipse(8, 9.5, 3.7, 3.7, k.face).rect(8, 7, 1, 3, k.hand).rect(7, 8, 1, 2, k.hand).set(4, 9, k.hand).set(11, 9, k.hand).set(7, 12, k.hand).set(8, 9, k.hand);
  px.rect(2, 15, 12, 14, k.body).rect(2, 15, 1, 14, k.hi).rect(13, 15, 1, 14, k.lo).rect(4, 17, 8, 10, k.well).rect(4, 17, 8, 1, k.lo).rect(4, 17, 1, 10, k.lo);
  px.line(8, 17, 8 + off, 24, k.brass).ellipse(8 + off, 25, 1.8, 1.8, k.brassHi).set(8 + off, 24, k.face);
  px.rect(1, 29, 14, 3, k.body).rect(1, 29, 14, 1, k.hi).rect(1, 31, 14, 1, k.lo).rect(3, 29, 10, 1, k.brass);
  return px.outline('ink');
}

/** A floor lamp (16 by 16): a lit shade, a pole and a foot. `lit` is the glow of the shade's middle. */
export function lamp(k: LampKit, lit: N): Px {
  const px = new Px(16);
  px.rect(4, 1, 8, 1, k.lo).rect(3, 2, 10, 1, k.hi).rect(3, 3, 10, 2, k.shade).rect(5, 3, 6, 2, lit).rect(2, 5, 12, 1, k.shade).rect(2, 6, 12, 1, k.lo).rect(7, 7, 2, 1, lit);
  px.rect(7, 8, 2, 5, k.pole).rect(5, 13, 6, 1, k.foot).rect(4, 14, 8, 2, k.foot).rect(4, 14, 8, 1, k.pole);
  return px.outline('ink');
}

const CHAIR = ['................', '...DDDDDDDDDD...', '..DHHHHHHHHHHD..', '..DHBBBBBBBBLD..', '..DHBBBBBBBBLD..', '..DHBBBBBBBBLD..', '.DDHBBBBBBBBLDD.', 'DHHDBBBBBBBBDHHD', 'DHBDDDDDDDDDDBLD', 'DHBLHHHHHHHHLBLD', 'DBBLBBBBBBBBLBLD', 'DLLLLLLLLLLLLLLD', '.DDLLLLLLLLLLDD.', '..DD........DD..', '..WD........WD..', '..DD........DD..'];
/** An armchair (16 by 16): a high back, rolled arms with nailheads, a cushion, short legs. */
export function chair(k: ChairKit): Px {
  return new Px(16).art(CHAIR, { D: 'ink', H: k.h, B: k.b, L: k.l, W: k.leg }).set(1, 9, k.nail).set(14, 9, k.nail).set(1, 11, k.nail).set(14, 11, k.nail);
}

export interface Parts { k: Kit; paper: Paper; mk: MirrorKit; wk: WinKit; glass: Glass; rk: RugKit; extra?: (px: Px, c: TC, phase: number) => void }
/** The tile painter of a look: the shared painters with the look's own paper, glass and colors, then its overlay. */
export function tiler(p: Parts): (c: TC, phase: number) => Px {
  return (c, phase) => {
    let px: Px;
    switch (c.ch) {
      case '#': px = crown(p.k, c); break;
      case 'M': case 'm': px = mirror(face(p.k, c, p.paper, phase), p.mk, c.ch === 'm', phase); break;
      case 'w': px = windowTile(p.k, p.wk, c, p.paper, p.glass, phase); break;
      case '.': px = boards(p.k, c); break;
      case 'r': px = rug(p.rk, c); break;
      case 'x': px = pit(p.k, boards(p.k, c), c); break;
      default: px = face(p.k, c, p.paper, phase);
    }
    p.extra?.(px, c, phase);
    return px;
  };
}

const LIVED: Kit = {
  top: 'soil0', topHi: 'soil3', rail: 'soil3', railHi: 'sand', railLo: 'soil1', wd: 'soil2', wdHi: 'soil3', wdLo: 'soil1',
  fl: 'soil3', flHi: 'sand', flLo: 'soil2', seam: 'soil1', gleam: 'sand', rim: 'sand', shade: 'pine2',
};
const GONE: Kit = {
  top: 'ink', topHi: 'slate', rail: 'soil1', railHi: 'soil2', railLo: 'soil0', wd: 'grey2', wdHi: 'grey3', wdLo: 'grey1',
  fl: 'soil1', flHi: 'soil2', flLo: 'soil0', seam: 'ink', shade: 'dusk',
};
const GILT: MirrorKit = { fr: 'amber', hi: 'cream', lo: 'orange', glass: 'mist', sheen: 'bone', shine: 'white', ghost: 'slate', eye: 'hot', crack: 'ink' };
const TARNISH: MirrorKit = { ...GILT, fr: 'sand', hi: 'bone', lo: 'soil3' };

const HANG = (px: Px, c: TC): void => { // framed pictures, by variant
  if (c.v === 1) px.rect(5, 1, 6, 7, 'soil3').rect(6, 2, 4, 5, 'soil0').rect(7, 3, 2, 2, 'skin2').rect(6, 5, 4, 2, 'night');
  if (c.v === 3) px.rect(3, 2, 10, 5, 'soil3').rect(4, 3, 8, 3, 'teal0').rect(4, 5, 8, 1, 'pine2').rect(9, 3, 2, 1, 'cream');
};
const STAR: Pt[][] = [[[6, 4], [12, 9], [9, 6]], [[2, 5], [8, 10], [11, 4]]];
/** A drape n wide (3 or 4), its outer edge at x, with folds; dir says which side the outer edge is on. */
export function curtain(px: Px, x: number, dir: number, n = 4): void {
  const cols: N[] = ['blood0', 'red', 'blood1', 'blood1'].slice(0, n) as N[];
  cols.forEach((cl, i) => px.rect(dir > 0 ? x + i : x + n - 1 - i, 3, 1, 9, cl));
  px.rect(x, 3, n, 1, 'blood0').rect(x, 8, n, 1, 'amber');
}
const WIN1: WinKit = { fr: 'soil3', frHi: 'sand', frLo: 'soil2', bar: 'soil3' };
const WIN2: WinKit = { fr: 'soil1', frHi: 'soil2', frLo: 'soil0' };
const RUG1: RugKit = { field: 'blood1', dark: 'blood0', pat: 'red', band: 'blood0', line: 'sand', fringe: 'cream' };
const RUG2: RugKit = { field: 'blood0', dark: 'ink', pat: 'blood1', band: 'ink', line: 'soil2', fringe: 'grey2' };
const MOTH: Rect[][] = [[[3, 4, 4, 3]], [[9, 9, 5, 4], [2, 2, 2, 2]], [[5, 6, 3, 2]], [[11, 3, 3, 4], [1, 10, 4, 3]]];
const PEEL: [number, number, number, number, boolean][][] = [[[2, 2, 5, 5, false]], [[9, 1, 6, 6, true], [0, 4, 3, 4, false]], [[5, 2, 4, 3, false]], [[1, 3, 7, 5, true], [11, 2, 3, 3, false]]];
const LITTER: [string, number, number][][] = [[['c', 11, 3]], [['p', 8, 10], ['c', 2, 4], ['c', 5, 3]], [['p', 3, 7], ['c', 9, 3], ['c', 12, 4]], [['c', 3, 3], ['c', 6, 4], ['c', 10, 3], ['p', 9, 9]]]; // rubble gathers under walls

function peeling(px: Px, c: TC): void {
  px.rect(0, 0, 16, 9, 'slate');
  for (let x = 0; x < 16; x += 4) px.rect(x, 0, 1, 9, 'dusk');
  for (const x of [2, 10]) px.set(x, 2, 'mist').set(x, 5, 'mist');
  if (c.v === 2) px.rect(3, 0, 2, 7, 'dusk').rect(9, 0, 1, 5, 'dusk');
  for (const [x, y, w, h, lath] of PEEL[c.v]) {
    px.rect(x, y - 1, w, 1, 'mist').rect(x, y, w, h, 'grey3').rect(x, y, 1, h, 'grey2').rect(x + 1, y + h - 1, w - 1, 1, 'grey2');
    if (lath) for (let j = y + 1; j < y + h - 1; j += 2) px.rect(x + 1, j, w - 2, 1, 'soil0').rect(x + 1, j + 1 > y + h - 2 ? j : j + 1, w - 2, 1, 'soil1');
  }
}
function dust(px: Px, c: TC, phase: number): void { // the abandoned look's overlay
  if (c.ch === 'W' && c.v === 2) dots(px, [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 2], [1, 2], [2, 3], [3, 3], [0, 4], [1, 5], [3, 2], [2, 4]], 'grey3');
  if (c.ch === 'r') for (const [x, y, w, h] of MOTH[c.v]) px.rect(x - 1, y - 1, w + 1, h + 1, 'ink').rect(x, y, w, h, 'soil1').rect(x, y + h - 1, w, 1, 'soil0').rect(x + 1, y, w - 2, 1, 'soil2');
  if (c.ch !== '.') return;
  for (const [t, x, y] of LITTER[c.v]) {
    if (t === 'c' && !isWall(c.n)) continue;
    if (t === 'c') px.rect(x, y, 4, 2, 'grey3').rect(x + 1, y + 1, 3, 1, 'grey2').set(x + 3, y + 1, 'grey1').set(x + 1, y - 1, 'grey3');
    else px.rect(x, y, 5, 2, 'soil2').rect(x, y, 5, 1, 'soil3').set(x + 4, y + 1, 'ink');
  }
  if (c.n === 'w') for (let i = 0; i < 3; i++) { const y = 3 + 4 * i, a = c.e === 'w' ? 4 + 2 * i : 0, n = c.e === 'w' ? 12 - 2 * i : 10 + 2 * i; px.rect(a, y, n, 1, 'mist').rect(a + 1, y + 1, n - 1, 1, 'slate'); }
  void phase;
}

export const CREEL_A: StageLook[] = [
  {
    slug: 'lived-in', name: 'Lived in', night: true, glow: [640, 400, 150],
    note: 'The house in 1959: green damask over dark wainscot, polished boards, a red patterned rug, and a lamp with a warm pool of light.',
    tile: tiler({
      k: LIVED, paper: (px, c) => { damask(px, 'pine3', 'leaf', 'pine2'); HANG(px, c); }, mk: GILT, wk: WIN1, rk: RUG1,
      glass: (px, c, g0, g1) => {
        const n = c.w !== 'w' && c.e !== 'w' ? 3 : 4;
        px.rect(g0, 3, g1 - g0 + 1, 9, 'slate').rect(g0, 7, g1 - g0 + 1, 5, 'dusk');
        dots(px, STAR[c.w === 'w' ? 1 : 0], 'cream');
        if (c.w === 'w') px.rect(g0 + 5, 4, 2, 2, 'cream').set(g0 + 6, 4, 'slate');
        if (c.w !== 'w') curtain(px, g0, 1, n);
        if (c.e !== 'w') curtain(px, g1 - n + 1, -1, n);
      },
    }),
    props: (phase): Prop[] => [
      { px: clock({ body: 'soil3', hi: 'sand', lo: 'soil2', brass: 'amber', brassHi: 'cream', face: 'bone', hand: 'ink', well: 'soil0' }, phase), x: 144, y: 8 },
      { px: lamp({ shade: 'yellow', hi: 'cream', lo: 'amber', pole: 'sand', foot: 'soil3' }, phase & 1 ? 'yellow' : 'cream'), x: 24, y: 120 },
      { px: chair({ b: 'blood1', h: 'red', l: 'blood0', leg: 'soil2', nail: 'amber' }), x: 208, y: 40 },
    ],
    lights: [[32, 125, 72, 1], [112, 36, 44, 0.5], [216, 122, 40, 0.45], [80, 70, 56, 0.6], [152, 30, 34, 0.5], [216, 52, 40, 0.5], [170, 142, 48, 0.45]],
  },
  {
    slug: 'abandoned', name: 'Abandoned', night: true, glow: [110, 190, 420],
    note: '1986: grey blue paper hanging off the lath, a boarded window with moonlight through the gaps, dusty boards and plaster, a moth eaten rug.',
    tile: tiler({
      k: GONE, paper: peeling, mk: TARNISH, wk: WIN2, rk: RUG2, extra: dust,
      glass: (px, c, g0, g1) => {
        const w = g1 - g0 + 1, r = c.e === 'w' ? 0 : 1;
        px.rect(g0, 3, w, 9, 'bone').rect(g0, 3, w, 3, 'soil1').rect(g0, 3, w, 1, 'soil2').rect(g0, 5, w, 1, 'soil0').rect(g0, 7 + r, w, 3, 'soil1').rect(g0, 7 + r, w, 1, 'soil2').rect(g0, 9 + r, w, 1, 'soil0');
        dots(px, [[g0, 4], [g1, 4], [g0, 8 + r], [g1, 8 + r], [g0 + 5, 4], [g0 + 5, 9 + r]], 'grey3');
        if (!r) px.rect(g1 - 2, 3, 3, 3, 'bone'); else px.rect(g0, 3, 2, 3, 'bone');
      },
    }),
    props: (phase): Prop[] => {
      const old = clock({ body: 'soil2', hi: 'soil3', lo: 'soil1', brass: 'grey3', brassHi: 'bone', face: 'bone', hand: 'grey1', well: 'shadow' }, phase);
      old.line(5, 7, 10, 12, 'grey1').line(4, 20, 8, 19, 'bone').line(8, 19, 9, 24, 'bone');
      return [
        { px: old, x: 144, y: 8 },
        { px: lamp({ shade: 'grey3', hi: 'bone', lo: 'grey2', pole: 'grey2', foot: 'grey1' }, phase & 1 ? 'white' : 'bone'), x: 24, y: 120 },
        { px: chair({ b: 'grey2', h: 'grey3', l: 'grey1', leg: 'soil1', nail: 'bone' }), x: 208, y: 40 },
      ];
    },
    lights: [[112, 40, 54, 0.8], [216, 124, 38, 0.6], [32, 125, 30, 0.45]],
  },
];
