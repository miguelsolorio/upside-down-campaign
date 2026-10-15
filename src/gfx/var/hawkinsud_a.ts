// Upside Down Hawkins looks 1 and 2 (stage 4.3, see look_kit.ts and hawkinsud.ts). "Blue night" is the show's Upside Down: blue
// black roofs, lawns and road, dark vines up the houses, red veins that pulse, pale spores. "Red storm" is lightning over the
// street: everything crimson and black, wet asphalt shining red, a flash that fades over the four phases. The painters below take
// a Kit (one palette name per role) and a few small kits for the car, streetlight and tear, so hawkinsud_b.ts reuses all of them
// for Ash and Frozen and only adds its own overlays. Night looks are painted in daytime values for the night pass to darken; it
// leaves the reds alone, so the storm is built on the red ramp and black. The painters read only the tile's letter, variant,
// neighbors and tx, ty parity (the tile cache keys on those), and no noise: every mark comes from a hand made arrangement.
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { clock } from './creel_a.ts';
import type { ClockKit } from './creel_a.ts';
import { dots, trace, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

type Rect = [number, number, number, number];

/** One palette name for every role of the tiles. */
export interface Kit {
  rf: N; rfHi: N; rfLo: N; rfSeam: N; lip: N; eave: N;   // shingle, its lit butt edge, a bare patch, the gap between courses; the lit roof edge and the shade it throws on the wall
  sd: N; sdHi: N; sdLo: N;                                // siding board, lit top, gap
  fr: N; pane: N; glint: N; lit: N;                       // window frame, glass, a reflection, a faint light behind the glass
  dr: N; drHi: N; drLo: N; step: N;                       // door, lit edge, panels, stoop
  gr: N; grHi: N; grLo: N;                                // lawn: dead grass, blades, bare earth
  sl: N; slHi: N; slLo: N; cb: N; cbHi: N;                // sidewalk slab, bevel, joint; curb face and top
  as: N; asHi: N; asLo: N; ln: N;                         // asphalt, grit, cracks, the painted line
  vn: N; vnHi: N; vnLo: N;                                // vine
  g: Glow; sp: readonly N[];                              // veins; one spore per color, up to three
}
export interface CarKit { b: N; hi: N; lo: N; roof: N; gl: N; gh: N; tire: N; lamp: N; tail: N }
export interface LampKit { pole: N; hi: N; lo: N; head: N; headHi: N; lens: N; foot: N }

const FRONT = 'HwD';
export const isFront = (ch: string): boolean => FRONT.includes(ch);
const isLawn = (ch: string): boolean => ch === 'g' || ch === 'v';
/** A list of points mirrored on odd columns, so a run of tiles with one variant doesn't repeat. */
export const ps = (c: TC, l: readonly Pt[]): Pt[] => l.map(([x, y]) => [c.tx & 1 ? 15 - x : x, y] as Pt);
/** A rect mirrored the same way. */
export const mr = (c: TC, [x, y, w, h]: Rect): Rect => [c.tx & 1 ? 16 - x - w : x, y, w, h];

const OFF = [[2, 6, 3], [5, 1, 4], [0, 4, 2], [7, 3, 6]]; // where the first slit between two tabs falls in each course, by variant
const LOST: Rect[][] = [[[3, 5, 3, 2]], [[10, 1, 3, 2], [2, 9, 2, 2]], [[6, 9, 4, 2]], [[11, 5, 3, 2], [1, 1, 2, 2]]]; // shingles gone
/** A roof in courses of shingles (tabs cut in the lit lower edge of each, so it doesn't read as brick) with a lit edge and a dark line where it meets the front below, and a lit rake where it ends. */
export function roof(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.rf);
  for (let r = 0; r < 3; r++) {
    px.rect(0, r * 5, 16, 1, k.rfSeam).rect(0, r * 5 + 4, 16, 1, k.rfHi);
    for (let i = 0; i < 3; i++) px.rect((OFF[c.v][r] + i * 5) & 15, r * 5 + 2, 1, 3, k.rfSeam); // slits between the tabs, in the exposed part of the course
  }
  for (const r of LOST[c.v]) { const [x, y, w, h] = mr(c, r); px.rect(x, y, w, h, k.rfLo).rect(x, y, w, 1, k.rfSeam); }
  px.rect(0, 14, 16, 1, k.lip).rect(0, 15, 16, 1, 'ink');
  if (c.w !== '#') px.rect(0, 0, 1, 14, k.lip);
  if (c.e !== '#') px.rect(14, 0, 1, 14, k.rfLo).rect(15, 0, 1, 16, 'ink');
  return px;
}

const JOINT = [3, 9, 6, 12];
/** A house front: siding in boards, the shade of the eave, a foundation; a window or a door set in it. */
export function front(k: Kit, c: TC, phase: number): Px {
  const px = new Px(16).fill(k.sd);
  for (let r = 0; r < 3; r++) px.rect(0, 2 + r * 4, 16, 1, k.sdHi).rect(0, 5 + r * 4, 16, 1, k.sdLo).rect((JOINT[c.v] + r * 5) & 15, 3 + r * 4, 1, 2, k.sdLo);
  px.rect(0, 0, 16, 2, c.n === '#' ? k.eave : 'ink').rect(0, 14, 16, 1, k.sdLo).rect(0, 15, 16, 1, 'ink');
  if (!isFront(c.w) && c.w !== '#') px.rect(0, 0, 1, 16, 'ink').rect(1, 2, 1, 12, k.sdHi);
  if (!isFront(c.e) && c.e !== '#') px.rect(15, 0, 1, 16, 'ink').rect(14, 2, 1, 12, k.sdLo);
  if (c.ch === 'w') win(px, k, c, phase); else if (c.ch === 'D') door(px, k, c);
  return px;
}

/** A window of four panes: dark glass with a glint, or a faint light behind one pane (it flickers), or a broken pane. */
function win(px: Px, k: Kit, c: TC, phase: number): void {
  px.rect(2, 2, 11, 11, 'ink').rect(3, 3, 9, 9, k.fr).rect(4, 4, 7, 7, k.pane).rect(7, 4, 1, 7, k.fr).rect(4, 7, 7, 1, k.fr).rect(1, 13, 13, 1, k.sdHi);
  dots(px, [[6, 4], [5, 5], [4, 6], [10, 10]], k.glint);
  if (c.v === 0) px.rect(4, 8, 3, 3, k.lit).rect(8, phase & 2 ? 8 : 9, 3, 2, k.lit).rect(4, 8, 1, 1, k.pane);
  if (c.v === 3) px.rect(8, 4, 3, 3, 'black').set(8, 6, k.glint).set(10, 4, k.glint).set(5, 9, 'black').set(6, 10, 'black');
}

/** A door with two panels, a knob and a stoop: closed, or (variant 2) ajar on the dark, or (variant 3) boarded up. */
function door(px: Px, k: Kit, c: TC): void {
  px.rect(3, 2, 10, 13, 'ink').rect(4, 3, 8, 11, k.dr).rect(4, 3, 1, 11, k.drHi).frame(5, 4, 6, 4, k.drLo).frame(5, 9, 6, 4, k.drLo).set(10, 8, k.slHi);
  px.rect(2, 14, 12, 1, k.slHi).rect(2, 15, 12, 1, k.slLo);
  if (c.v === 2) px.rect(7, 3, 5, 11, 'black').rect(7, 3, 1, 11, 'ink').rect(10, 10, 1, 2, k.lit);
  if (c.v === 3) px.rect(3, 5, 10, 2, 'ink').rect(4, 5, 8, 1, k.drHi).rect(3, 10, 10, 2, 'ink').rect(4, 10, 8, 1, k.drHi);
}

const BLADE: Pt[][] = [[[3, 5], [8, 3], [13, 6], [5, 11], [11, 10], [2, 14], [14, 13]], [[6, 4], [12, 3], [2, 8], [9, 9], [14, 11], [4, 14]], [[2, 4], [9, 6], [14, 4], [6, 11], [12, 13], [1, 10]], [[8, 4], [3, 7], [13, 8], [5, 13], [10, 12], [14, 14]]];
const BARE: Rect[][] = [[[5, 7, 4, 2], [11, 12, 3, 2]], [[2, 9, 3, 2], [9, 6, 4, 2]], [[10, 9, 4, 2], [3, 3, 3, 2]], [[6, 11, 4, 2], [12, 3, 2, 2]]];
/** Dead lawn: bare earth, tufts of dead grass, the shadow of a house at its foot, a worn edge where it meets the walk. */
export function lawn(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.gr);
  for (const r of BARE[c.v]) { const [x, y, w, h] = mr(c, r); px.rect(x, y, w, h, k.grLo); }
  for (const [x, y] of ps(c, BLADE[c.v].slice(0, 5 - (c.v & 1)))) px.rect(x, y - 2, 1, 3, k.grHi).rect(x - 2, y - 1, 1, 2, k.grHi).rect(x + 2, y - 1, 1, 2, k.grHi).set(x, y, k.grLo);
  if (isFront(c.n)) px.rect(0, 0, 16, 1, 'ink').rect(0, 1, 16, 1, k.grLo);
  if (c.n === 'c') px.rect(0, 0, 16, 1, k.grLo);
  if (c.s === 'c') px.rect(0, 15, 16, 1, k.grLo);
  return px;
}

const SLAB = [15, 6, 11, 3];
const WCRK: Pt[][] = [[[3, 4], [5, 6], [4, 8], [7, 10]], [[11, 4], [10, 7], [12, 9]], [[2, 7], [5, 8], [7, 6], [9, 8]], [[13, 4], [12, 7], [14, 9], [13, 11]]];
const GRIT: Pt[][] = [[[2, 5], [9, 8], [12, 4]], [[4, 7], [13, 6], [8, 10]], [[6, 5], [11, 9], [3, 10]], [[10, 5], [5, 9], [14, 10]]];
const EDGE = [[1, 5, 6, 11, 14], [3, 4, 9, 12], [0, 7, 8, 13, 15], [2, 6, 10, 11]]; // dead grass pushing onto the slab
/** Sidewalk: concrete slabs with a lit bevel, joints and a hairline crack; a curb toward the road, grass creeping on from the lawn. */
export function walk(k: Kit, c: TC): Px {
  const up = c.n === '.', dn = c.s === '.', a = up ? 3 : 0, b = dn ? 13 : 16, px = new Px(16).fill(k.sl);
  px.rect(0, a, 16, 1, k.slHi).rect(SLAB[c.v], a, 1, b - a, k.slLo).rect((SLAB[c.v] + 1) & 15, a + 1, 1, b - a - 1, k.slHi);
  dots(px, ps(c, GRIT[c.v]), k.slHi);
  dots(px, trace(ps(c, WCRK[c.v])), k.slLo);
  if (up) px.rect(0, 0, 16, 1, k.cb).rect(0, 1, 16, 1, k.cbHi).rect(0, 2, 16, 1, k.slLo);
  if (dn) px.rect(0, 13, 16, 1, k.slLo).rect(0, 14, 16, 1, k.cbHi).rect(0, 15, 16, 1, k.cb);
  const gy = dn && isLawn(c.n) ? 0 : up && isLawn(c.s) ? 15 : -1;
  if (gy >= 0) for (const x of EDGE[c.v]) px.set(x, gy, k.gr).set(x, gy ? 14 : 1, k.gr);
  return px;
}

const AGG: Pt[][] = [[[2, 3], [9, 5], [13, 9], [5, 11], [11, 13], [1, 8]], [[6, 2], [12, 4], [3, 7], [9, 10], [14, 12], [5, 14]], [[4, 4], [10, 3], [14, 7], [2, 11], [8, 12], [12, 10]], [[1, 5], [7, 3], [13, 3], [4, 13], [10, 11], [15, 11]]];
const CRK: Pt[][] = [[[1, 5], [4, 6], [6, 9], [10, 10], [13, 13]], [[14, 2], [11, 4], [10, 8], [6, 9], [3, 12]], [[0, 11], [4, 10], [7, 12], [11, 11], [15, 13]], [[8, 2], [9, 5], [7, 8], [9, 12]]];
const CHIP = [[6, 10], [4, 12], [8], [5, 11]]; // chips out of the painted line
/** Cracked asphalt: grit, a crack, an oil stain on some tiles, a gutter under the curb; '=' adds a broken painted line that runs over a pair of tiles. */
export function road(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.as);
  dots(px, ps(c, AGG[c.v]), k.asHi);
  if (c.v === 2) px.ellipse(c.tx & 1 ? 9 : 6, 10, 3.5, 2, k.asLo).set(c.tx & 1 ? 8 : 5, 9, k.asHi);
  else dots(px, trace(ps(c, CRK[c.v])), k.asLo);
  if (c.n === 'c') px.rect(0, 0, 16, 1, 'ink').rect(0, 1, 16, 1, k.asLo);
  if (c.s === 'c') px.rect(0, 14, 16, 1, k.asLo).rect(0, 15, 16, 1, 'ink');
  if (isFront(c.w)) px.rect(0, 0, 1, 16, 'ink');
  if (isFront(c.e)) px.rect(15, 0, 1, 16, 'ink');
  if (c.ch === '=') {
    const x0 = c.w === '=' ? 0 : 3, x1 = c.e === '=' ? 16 : 13;
    px.rect(x0, 7, x1 - x0, 2, k.ln).rect(x0, 9, x1 - x0, 1, k.asLo);
    for (const x of CHIP[c.v]) if (x >= x0 && x < x1) px.rect(x, 7, 1, 2, k.as);
  }
  return px;
}

/** A vine two wide, a lit stripe and a dark one, leaves budding off it, a red pod at its tip. */
export function vine(px: Px, pts: readonly Pt[], k: Kit): void {
  const path = trace(pts);
  path.forEach(([x, y], i) => {
    px.set(x + 1, y, k.vnLo); px.set(x, y, i % 3 ? k.vn : k.vnHi);
    if (i % 4 === 1) px.set(x - 1, y - 1, k.vnHi); else if (i % 4 === 3) px.set(x + 2, y + 1, k.vn);
  });
  const [x, y] = path[path.length - 1] as Pt;
  px.set(x, y, k.g.mid);
}
const VINE: Pt[][][] = [ // up a house wall, by variant
  [[[3, 15], [4, 12], [3, 9], [5, 6], [4, 3], [5, 0]], [[4, 9], [8, 9], [10, 7]]], [],
  [[[12, 0], [11, 3], [12, 6], [10, 9], [11, 12], [12, 15]], [[11, 6], [8, 5], [6, 6]]],
  [[[8, 15], [8, 12], [9, 9], [7, 6], [8, 3]]],
];
const ROOFVINE: Pt[][] = [[[4, 13], [5, 9], [3, 5], [4, 1]], [[5, 9], [9, 8], [12, 5]]];
const MID: Pt[][] = [[[5, 6], [8, 9], [11, 7]], [[6, 10], [9, 7], [12, 9]], [[5, 8], [8, 6], [10, 10]], [[6, 7], [8, 10], [11, 8]]];
const TIP: Pt[][] = [[[8, 9], [9, 13], [7, 15]], [[9, 7], [10, 3], [12, 1]], [[8, 6], [7, 2], [8, 0]], [[8, 10], [6, 13], [3, 14]]];
const ROOT: Pt[] = [[3, 5], [2, 10], [4, 8], [3, 11]], END: Pt[] = [[12, 11], [13, 5], [12, 6], [13, 10]];
const CRACKV: Pt[][] = [[[1, 6], [4, 5], [7, 8], [10, 7], [14, 9]], [[1, 10], [5, 9], [8, 6], [11, 7], [14, 4]]];
const CRACKB: Pt[][] = [[[7, 8], [8, 12], [11, 12]], [[8, 6], [6, 3], [3, 3]]];
/** What has grown over the tile: vines up the walls and over the roofs, veins across the lawn (a pair of tiles joins at the middle of its edge), a few across the road. */
export function overgrow(px: Px, k: Kit, c: TC, phase: number): void {
  if (c.ch === '#' && (c.v === 1 || (c.v === 3 && c.tx & 1))) for (const p of ROOFVINE) vine(px, ps(c, p), k);
  if (c.ch === 'H') for (const p of VINE[c.v]) vine(px, ps(c, p), k);
  if (c.ch === 'v') {
    vein(px, [c.w === 'v' ? [0, 8] : ROOT[c.v], ...MID[c.v], c.e === 'v' ? [15, 8] : END[c.v]], phase, k.g);
    vein(px, TIP[c.v], phase, k.g);
  }
  if (c.ch === '.' && c.v === 3 && c.tx & 1 && !(c.ty & 1)) { const i = c.n === 'c' ? 0 : 1; vein(px, CRACKV[i], phase, k.g); vein(px, CRACKB[i], phase, k.g); }
}

const SPORE: Pt[][] = [[[3, 4], [11, 9], [7, 13]], [[12, 3], [5, 10], [9, 7]], [[6, 2], [13, 12], [2, 8]], [[9, 5], [3, 11], [14, 14]]];
/** Spores drifting up and sideways, one per color of the kit's list, at different places by variant. */
export function spores(px: Px, k: Kit, c: TC, phase: number): void {
  SPORE[c.v].slice(0, k.sp.length).forEach(([x, y], i) => px.set((x + [0, 1, 1, 0][phase & 3]) & 15, (y - phase * (1 + (i & 1)) + 16) & 15, k.sp[i]));
}

export type Extra = (px: Px, c: TC, phase: number) => void;
/** The tile painter of a look: the shared painters in the kit's colors, then the look's own overlay, then what has grown over, then the spores. */
export function tiler(k: Kit, extra?: Extra): (c: TC, phase: number) => Px {
  return (c, phase) => {
    const px = c.ch === '#' ? roof(k, c) : isFront(c.ch) ? front(k, c, phase) : isLawn(c.ch) ? lawn(k, c) : c.ch === 'c' ? walk(k, c) : road(k, c);
    extra?.(px, c, phase);
    overgrow(px, k, c, phase);
    spores(px, k, c, phase);
    return px;
  };
}

/** An abandoned sedan seen from above (32 by 16), nose to the right: rounded body, hood, windscreen, roof, rear glass, wheels poking out at the sides, dead lamps. */
export function car(k: CarKit): Px {
  const px = new Px(32, 16);
  for (const x of [5, 22]) px.rect(x, 0, 5, 16, k.tire).rect(x + 1, 0, 3, 1, k.lo).rect(x + 1, 15, 3, 1, k.lo);
  px.rect(3, 2, 26, 12, k.b).rect(2, 3, 28, 10, k.b).rect(1, 4, 30, 8, k.b).rect(3, 2, 26, 1, k.hi).rect(3, 13, 26, 1, k.lo).rect(2, 12, 1, 1, k.lo).rect(29, 12, 1, 1, k.lo);
  px.rect(6, 3, 1, 10, k.lo).rect(22, 3, 1, 10, k.lo).rect(23, 7, 5, 2, k.lo).rect(23, 6, 5, 1, k.hi);
  px.rect(10, 3, 9, 10, k.lo).rect(11, 4, 7, 8, k.roof).rect(11, 4, 7, 1, k.hi).rect(19, 4, 3, 8, k.gl).set(21, 3, k.gl).set(21, 12, k.gl).rect(7, 4, 3, 8, k.gl);
  dots(px, [[20, 4], [19, 5], [8, 5], [7, 6], [20, 9]], k.gh);
  px.rect(30, 4, 1, 2, k.lamp).rect(30, 10, 1, 2, k.lamp).rect(1, 5, 1, 2, k.tail).rect(1, 9, 1, 2, k.tail).rect(19, 1, 2, 1, k.b).rect(19, 14, 2, 1, k.lo);
  return px.outline('ink');
}

const HEAD = ['...hhhhhhhhhh...', '..hSSSSSSSSSSd..', '.hSSSSSSSSSSSSd.', '.dLLLLLLLLLLLLd.', '..dddddddddddd..'];
/** A dead streetlight (16 by 32): a cobra head with a dark lens and a hanging wire on a pole with a collar and a foot. */
export function streetlight(k: LampKit): Px {
  const px = new Px(16, 32);
  px.rect(7, 5, 2, 25, k.pole).rect(7, 5, 1, 25, k.hi).rect(8, 5, 1, 25, k.lo).rect(5, 25, 6, 2, k.pole).rect(5, 25, 6, 1, k.hi).rect(4, 29, 8, 3, k.foot).rect(4, 29, 8, 1, k.hi);
  px.art(HEAD, { h: k.headHi, S: k.head, d: k.lo, L: k.lens });
  px.line(12, 5, 13, 8, k.lo).set(4, 3, k.hi).set(9, 3, k.lens).set(10, 4, k.lens);
  return px.outline('ink');
}

const RIM: Pt[] = [[9, 0], [22, 0], [6, 1], [26, 1], [3, 2], [28, 2], [2, 4], [29, 5], [1, 10], [30, 11], [4, 13], [27, 13], [8, 15], [23, 15]];
const SPAN = [[15, 19], [11, 21], [9, 22], [5, 26], [4, 27], [1, 30], [0, 31], [0, 29], [3, 31], [5, 26], [7, 24], [8, 22], [12, 20], [14, 17]]; // x extents of rows 1 to 14
const SEAM: Pt[][] = [[[2, 8], [6, 6], [10, 9], [14, 7], [17, 8], [21, 6], [25, 9], [29, 7]], [[10, 9], [8, 12]], [[21, 6], [22, 3]]];
/** The gate tear (32 by 16): a ragged pit in the lawn with torn turf round it, a glowing edge that runs around it, and veins of light through the dark that meet in a core that swells and fades with the phase. */
export function tear(g: Glow, rim: N, phase: number): Px {
  const px = new Px(32, 16), p = phase & 3;
  const inside = (x: number, y: number): boolean => y >= 1 && y <= 14 && x >= SPAN[y - 1][0] && x <= SPAN[y - 1][1];
  SPAN.forEach(([x0, x1], i) => {
    const y = i + 1;
    px.rect(x0 - 1, y, x1 - x0 + 3, 1, rim).rect(x0, y, x1 - x0 + 1, 1, g.halo);
    for (let x = x0; x <= x1; x++) if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) px.set(x, y, [g.mid, g.bright, g.mid, g.base][(x + y + p) & 3]);
  });
  for (const s of SEAM) vein(px, s, phase, g);
  px.ellipse(16, 8, [2, 3, 4, 3][p], [1, 1.5, 2, 1.5][p], g.base).ellipse(16, 8, [1, 2, 2.5, 2][p], 1, g.mid).set(15 + (p & 1), 8, g.bright);
  return dots(px, [[12, 0], [19, 0], [10, 1], [22, 1], [7, 2], [25, 2], [3, 4], [28, 4], [1, 11], [30, 12], [6, 13], [25, 13], [12, 15], [19, 15], [15, 15]], rim), px;
}

/** A grandfather clock left in a yard: creel_a.ts's clock with a vine up its trunk and dead grass round the plinth. */
export function yardClock(ck: ClockKit, k: Kit, phase: number): Px {
  const px = clock(ck, phase);
  vine(px, [[3, 31], [3, 26], [5, 22], [3, 17], [4, 14]], k);
  dots(px, [[0, 30], [1, 31], [2, 30], [13, 31], [14, 30], [15, 31]], k.gr);
  return px;
}

/** The four props in the sheet's order, at their places in the room: the car on the near lane, the streetlight on the walk, the tear in the lawn, the clock in the yard. */
export const place = (carPx: Px, lampPx: Px, tearPx: Px, clockPx: Px): Prop[] => [{ px: carPx, x: 48, y: 64 }, { px: lampPx, x: 176, y: 32 }, { px: tearPx, x: 112, y: 136 }, { px: clockPx, x: 224, y: 120 }];

const GLOW: Glow = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'hot' };
const BLUE: Kit = {
  rf: 'dusk', rfHi: 'slate', rfLo: 'shadow', rfSeam: 'night', lip: 'mist', eave: 'black',
  sd: 'shadow', sdHi: 'dusk', sdLo: 'night', fr: 'slate', pane: 'black', glint: 'dusk', lit: 'blood1',
  dr: 'slate', drHi: 'mist', drLo: 'dusk', step: 'mist', gr: 'teal1', grHi: 'slate', grLo: 'teal0',
  sl: 'dusk', slHi: 'slate', slLo: 'night', cb: 'shadow', cbHi: 'slate', as: 'night', asHi: 'dusk', asLo: 'black', ln: 'mist',
  vn: 'pine2', vnHi: 'pine3', vnLo: 'pine0', g: GLOW, sp: ['white', 'mist'],
};

const RAMP: N[] = ['black', 'ink', 'blood0', 'blood1', 'red', 'hot', 'pink'];
const FLASH = [2, 1, 0, 0]; // how far the lit things (roofs, walls, slabs) jump up the red ramp by phase: the bolt, its afterglow, then dark again
const up = (i: number, f: number): N => RAMP[Math.min(6, i + f)] as N;
const STORM_GLOW: Glow = { halo: 'black', base: 'red', mid: 'hot', bright: 'pink' };
const storm = (f: number): Kit => ({
  rf: up(2, f), rfHi: up(3, f), rfLo: up(1, f), rfSeam: 'black', lip: up(4, f), eave: 'black',
  sd: up(1, f >> 1), sdHi: up(2, f >> 1), sdLo: 'black', fr: up(3, f), pane: 'black', glint: 'hot', lit: 'red',
  dr: up(3, f), drHi: up(4, f), drLo: up(1, f), step: up(4, f), gr: up(1, f >> 1), grHi: up(2, f >> 1), grLo: 'black',
  sl: up(2, f), slHi: up(3, f), slLo: up(0, f), cb: up(1, f), cbHi: up(4, f), as: 'black', asHi: 'ink', asLo: 'blood0', ln: 'rose',
  vn: 'blood0', vnHi: up(3, f), vnLo: 'black', g: STORM_GLOW, sp: ['pink'],
});
const REFL: Rect[][] = [[[2, 3, 7, 1]], [[6, 11, 8, 1]], [[1, 4, 6, 1], [9, 12, 5, 1]], [[4, 4, 8, 1]]];
const SHEEN: Pt[][] = [[[4, 3], [12, 8]], [[10, 3], [3, 11]], [[6, 4], [14, 9]], [[3, 3], [9, 12]]];
/** Rain on everything: long streaks of red on the asphalt, glints on the roofs and the slabs; the streaks go white hot in the bolt. */
function wet(px: Px, c: TC, phase: number): void {
  const f = FLASH[phase & 3] as number;
  if (c.ch === '.' || c.ch === '=') for (const [x, y, w] of REFL[c.v]) px.rect(x, y, w, 1, f > 1 ? 'hot' : 'red').set(x, y, f > 1 ? 'pink' : 'hot').rect(x + 2, y + 1, w - 3, 1, f ? 'blood1' : 'blood0');
  else if (c.ch === '#' || c.ch === 'c') dots(px, ps(c, SHEEN[c.v]), f > 1 ? 'pink' : 'hot');
}
const STORM = [0, 1, 2, 3].map((p) => tiler(storm(FLASH[p]), wet));

export const HAWKINSUD_A: StageLook[] = [
  {
    slug: 'blue-night', name: 'Blue night', night: true, glow: [640, 40, 90],
    note: "The show's Upside Down: blue black roofs, lawns and road under a dead sky, dark vines up the houses, red veins pulsing across the ground, pale spores drifting.",
    tile: tiler(BLUE),
    props: (phase): Prop[] => {
      const bat = car({ b: 'slate', hi: 'mist', lo: 'dusk', roof: 'mist', gl: 'black', gh: 'slate', tire: 'ink', lamp: 'grey2', tail: 'blood1' });
      vine(bat, [[12, 15], [12, 12], [14, 9], [13, 6], [15, 3], [16, 0]], BLUE); vine(bat, [[14, 9], [18, 9], [22, 6], [26, 7]], BLUE);
      const pole = streetlight({ pole: 'slate', hi: 'mist', lo: 'dusk', head: 'dusk', headHi: 'mist', lens: 'black', foot: 'dusk' });
      vine(pole, [[8, 28], [6, 24], [9, 20], [6, 16], [9, 12], [7, 8]], BLUE);
      return place(bat, pole, tear(GLOW, 'teal0', phase), yardClock({ body: 'slate', hi: 'mist', lo: 'dusk', brass: 'blood1', brassHi: 'red', face: 'grey3', hand: 'blood0', well: 'night' }, BLUE, phase));
    },
    lights: [[128, 146, 56, 0.75], [200, 40, 30, 0.6], [40, 136, 30, 0.6], [232, 136, 30, 0.5], [184, 24, 24, 0.4]],
  },
  {
    slug: 'red-storm', name: 'Red storm', night: true, glow: [700, 40, 60],
    note: 'Lightning in the sky tints the whole street crimson: black roofs and lawns, wet asphalt shining red, a bolt that flashes and fades over four steps.',
    tile: (c, phase) => STORM[phase & 3](c, phase),
    props: (phase): Prop[] => {
      const f = FLASH[phase & 3] as number, k = storm(f);
      const bat = car({ b: up(2, f), hi: up(4, f), lo: up(1, f), roof: up(2, f), gl: 'black', gh: 'hot', tire: 'black', lamp: 'blood1', tail: 'red' });
      vine(bat, [[12, 15], [12, 12], [14, 9], [13, 6], [15, 3], [16, 0]], k); vine(bat, [[14, 9], [18, 9], [22, 6], [26, 7]], k);
      const pole = streetlight({ pole: up(2, f), hi: up(4, f), lo: up(1, f), head: up(3, f), headHi: up(5, f), lens: 'black', foot: up(2, f) });
      vine(pole, [[8, 28], [6, 24], [9, 20], [6, 16], [9, 12], [7, 8]], k);
      return place(bat, pole, tear({ halo: 'blood1', base: 'red', mid: 'hot', bright: 'cream' }, 'blood0', phase), yardClock({ body: up(2, f), hi: up(4, f), lo: up(1, f), brass: 'blood1', brassHi: 'hot', face: up(4, f), hand: 'black', well: 'black' }, k, phase));
    },
    lights: [[128, 146, 60, 0.8], [200, 40, 34, 0.7], [40, 136, 34, 0.6], [232, 136, 32, 0.6], [176, 62, 34, 0.4]],
  },
];
