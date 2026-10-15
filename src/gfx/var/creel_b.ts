// Creel House looks 3 and 4 (stage 4.2, see look_kit.ts and creel.ts). "Blood red" is the horror movie parlor: deep red damask,
// near black wood, black boards with the flames in them, a handprint and drips, one candelabra for light. "Upside Down" is the
// same house after the Upside Down has taken it, the place Vecna's lair in 4.4 grows from: the paper rotted off in rags and
// overgrown with vines, red veins running over the boards and the rug, a window lit red by lightning, spores drifting. Both reuse
// the painters of creel_a.ts (walls, floor, mirror, window, rug, hole, clock, chair) with their own kits and overlays, and are
// painted in daytime values for the night pass to darken. The night pass leaves the reds alone, so the red paper is painted in
// the dark blood tones and the pools of light lift it.
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { chair, clock, damask, lamp, tiler } from './creel_a.ts';
import type { Kit, MirrorKit, RugKit, WinKit } from './creel_a.ts';
import { dots, trace, vein } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

type Rect = [number, number, number, number];

const BLOOD: Kit = {
  top: 'black', topHi: 'soil2', rail: 'soil1', railHi: 'soil2', railLo: 'soil0', wd: 'soil0', wdHi: 'soil1', wdLo: 'black',
  fl: 'soil0', flHi: 'soil1', flLo: 'black', seam: 'black', gleam: 'blood0', rim: 'blood1', shade: 'black',
};
export const UD: Kit = {
  top: 'ink', topHi: 'slate', rail: 'dusk', railHi: 'slate', railLo: 'shadow', wd: 'shadow', wdHi: 'dusk', wdLo: 'night',
  fl: 'dusk', flHi: 'slate', flLo: 'shadow', seam: 'ink', shade: 'teal0',
};
const BLACK_MIRROR: MirrorKit = { fr: 'soil2', hi: 'sand', lo: 'soil1', glass: 'mist', sheen: 'bone', shine: 'white', ghost: 'slate', eye: 'hot', crack: 'ink' };
export const RED_MIRROR: MirrorKit = { fr: 'blood1', hi: 'red', lo: 'blood0', glass: 'red', sheen: 'pink', shine: 'white', ghost: 'blood0', eye: 'cream', crack: 'black' };
const WIN3: WinKit = { fr: 'soil1', frHi: 'soil2', frLo: 'black' };
export const WIN4: WinKit = { fr: 'dusk', frHi: 'slate', frLo: 'night', bar: 'night' };
const RUG3: RugKit = { field: 'black', dark: 'ink', pat: 'blood1', band: 'blood0', line: 'sand', fringe: 'sand' };
export const RUG4: RugKit = { field: 'night', dark: 'ink', pat: 'blood0', band: 'ink', line: 'blood1', fringe: 'blood1' };
export const GLOW: Glow = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'hot' };

const HAND = ['.r.r.r.r.', '.r.r.r.r.', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..'];
/** Deep red damask; on some tiles the blood has run down it, on one a hand has left its print. */
function bloodPaper(px: Px, c: TC): void {
  damask(px, 'blood0', 'blood1', 'black');
  if (c.v === 2) px.rect(5, 1, 1, 7, 'red').set(5, 8, 'hot').rect(11, 1, 1, 4, 'red').set(11, 5, 'hot').rect(12, 1, 1, 2, 'blood1');
  if (c.v === 3 && c.tx & 1 && c.ty & 1) px.art(HAND, { r: 'red' }, 3, 2).rect(7, 7, 1, 2, 'blood1');
}
const DRAPE: N[] = ['blood0', 'blood1', 'red', 'blood1'];
/** Heavy drapes drawn across the whole window, parted by a hand's width over the night. */
function drapes(px: Px, c: TC, g0: number, g1: number): void {
  const both = c.w !== 'w' && c.e !== 'w', gap = both ? [7, 8] : c.w !== 'w' ? [13, 14] : [1, 2];
  for (let x = g0; x <= g1; x++) px.rect(x, 3, 1, 9, gap.includes(x) ? 'night' : DRAPE[x & 3]);
  px.rect(g0, 3, g1 - g0 + 1, 1, 'black').set(gap[0], 6, 'bone').set(gap[0], 7, 'mist').set(gap[1], 9, 'dusk');
}

const FLAME_X: [number, number][] = [[2, 6], [7, 5], [12, 6]]; // candle x and the y of its top
/** A candelabra (16 by 16): brass arms, three candles and flames that sway and change height with the phase. */
function candelabra(phase: number): Px {
  const px = new Px(16);
  px.rect(7, 9, 2, 5, 'amber').rect(5, 14, 6, 1, 'amber').rect(4, 15, 8, 1, 'soil3').line(7, 12, 3, 10, 'amber').line(8, 12, 12, 10, 'amber').rect(1, 9, 4, 1, 'amber').rect(11, 9, 4, 1, 'amber').rect(6, 9, 4, 1, 'amber');
  FLAME_X.forEach(([x, y], i) => {
    const sway = [0, 1, 0, -1][(phase + i) & 3] as number, tall = [0, 1, 1, 0][(phase + i) & 3] as number;
    px.rect(x, y, 2, 3 + (x === 7 ? 1 : 0), 'cream').rect(x + 1, y, 1, 3, 'bone').rect(x, y - 2, 2, 2, 'yellow').set(x, y - 1, 'cream').set(x + sway, y - 3, 'orange');
    if (tall) px.set(x + sway, y - 4, 'orange');
  });
  return px.outline('ink');
}

const VINE: Pt[][][] = [ // by variant, plus four for odd columns, so a run of tiles doesn't repeat
  [[[6, 15], [6, 12], [5, 9], [6, 6], [7, 3], [7, 1]], [[5, 9], [3, 8], [2, 6]]], [],
  [[[11, 0], [11, 3], [10, 6], [11, 9], [12, 12], [11, 15]]],
  [[[3, 15], [4, 12], [3, 9], [4, 6]], [[4, 12], [8, 11], [11, 12], [14, 10]]],
  [[[9, 15], [9, 12], [10, 9], [9, 6], [8, 3], [9, 0]], [[10, 9], [13, 8], [15, 6]]], [],
  [[[1, 15], [2, 12], [1, 9], [2, 6], [1, 3]], [[2, 12], [5, 13], [8, 12]], [[8, 12], [9, 10]]],
  [[[13, 0], [13, 3], [12, 6], [13, 8]], [[12, 6], [9, 7], [7, 5]]],
];
const FLOOR_VEIN: Pt[][][] = [ // main veins enter at the left middle and leave at the right middle, so tiles side by side join
  [[[0, 8], [4, 6], [8, 9], [12, 7], [15, 8]], [[8, 9], [10, 13]]],
  [[[0, 8], [5, 10], [9, 7], [15, 8]], [[9, 7], [11, 3]]],
  [[[0, 8], [7, 8], [10, 10], [15, 8]], [[7, 8], [5, 4], [6, 2]], [[10, 10], [13, 14]]],
  [[[0, 8], [6, 7], [9, 9], [12, 8], [15, 8]]],
];
const ROT: Rect[][] = [[[2, 2, 5, 4]], [[9, 3, 5, 5], [1, 5, 3, 3]], [[6, 1, 4, 3]], [[1, 2, 4, 6], [10, 4, 4, 3]]];
const SPORE: Pt[][] = [[[3, 4], [11, 9]], [[12, 3]], [[6, 2]], [[9, 5], [3, 11]]];
/** The wall paper gone to rags: dark holes with a curled lip, mold in the damask. */
export function rotted(px: Px, c: TC): void {
  damask(px, 'teal1', 'slate', 'teal0');
  for (const [x, y, w, h] of ROT[c.v]) px.rect(x, y - 1, w, 1, 'dusk').rect(x, y, w, h, 'night').rect(x + 1, y + h, w - 2, 1, 'teal0').rect(x, y, 1, h, 'teal0');
  dots(px, [[12 - c.v * 3, 7], [13 - c.v * 3, 7], [3 + c.v, 6]], 'teal0');
}
/** A vine: two wide, a lit edge and a dark one, a pod at its tip. */
export function vine(px: Px, pts: readonly Pt[]): void {
  const path = trace(pts);
  path.forEach(([x, y], i) => { px.set(x + 2, y, 'blood0').set(x + 1, y, 'blood1').set(x, y, i % 3 ? 'blood1' : 'red'); });
  const [x, y] = path[path.length - 1] as Pt;
  px.set(x, y, 'hot');
}
const FLASH: N[] = ['hot', 'red', 'blood1', 'red'];
/** Glass lit red by lightning: it flashes on phase 0 with a bolt, and the dead branches stay black against it. */
export function lightning(px: Px, c: TC, g0: number, g1: number, phase: number): void {
  const w = g1 - g0 + 1, right = c.w === 'w';
  px.rect(g0, 3, w, 9, FLASH[phase & 3] as N).rect(g0, 9, w, 3, phase ? 'blood1' : 'red');
  const br: Pt[][] = right ? [[[g1, 11], [g1 - 3, 8], [g1 - 4, 5]], [[g1 - 3, 8], [g1 - 8, 7]]] : [[[g0, 11], [g0 + 3, 9], [g0 + 4, 6], [g0 + 7, 5]], [[g0 + 3, 9], [g0 + 8, 9]]];
  for (const b of br) for (const [x, y] of trace(b)) px.set(x, y, 'blood0');
  if (!phase && right) for (const [x, y] of trace([[g0 + 5, 3], [g0 + 3, 6], [g0 + 6, 8], [g0 + 4, 11]])) px.set(x, y, 'cream');
}
/** The Upside Down's overlay: vines up the walls, veins over floor and rug, a glowing hole, spores. */
export function overgrown(px: Px, c: TC, phase: number): void {
  const floor = '.rx'.includes(c.ch);
  if (c.ch === 'W') for (const v of VINE[c.v + (c.tx & 1) * 4]) vine(px, v);
  if (c.ch !== 'x' && floor && !(c.ty & 1)) for (const p of FLOOR_VEIN[c.v]) vein(px, p, phase, GLOW);
  if (c.ch === 'x') {
    px.rect(5, 10, 6, 3, 'blood1').rect(6, 11, 4, 1, 'red').set(7 + (phase & 1), 11, 'hot');
    vein(px, [[0, 8], [3, 8]], phase, GLOW);
    vein(px, [[12, 8], [15, 8]], phase, GLOW);
  }
  if (c.ch !== '#' && c.ch !== 'w') SPORE[c.v].forEach(([x, y], i) => px.set((x + [0, 1, 1, 0][phase & 3]!) & 15, (y - phase * (1 + (i & 1)) + 16) & 15, i || c.v ? 'bone' : 'cream'));
}

export const CREEL_B: StageLook[] = [
  {
    slug: 'blood-red', name: 'Blood red', night: true, glow: [700, 260, 40],
    note: 'Deep red damask with a handprint and drips, near black wood and black boards with the flames in them, drapes drawn, and one candelabra for light.',
    tile: tiler({ k: BLOOD, paper: bloodPaper, mk: BLACK_MIRROR, wk: WIN3, rk: RUG3, glass: (px, c, g0, g1) => drapes(px, c, g0, g1) }),
    props: (phase): Prop[] => [
      { px: clock({ body: 'soil1', hi: 'soil2', lo: 'soil0', brass: 'amber', brassHi: 'cream', face: 'bone', hand: 'ink', well: 'black' }, phase), x: 144, y: 8 },
      { px: candelabra(phase), x: 24, y: 120 },
      { px: chair({ b: 'grey2', h: 'grey3', l: 'grey1', leg: 'black', nail: 'amber' }), x: 208, y: 40 },
    ],
    lights: [[32, 124, 74, 1], [112, 34, 36, 0.4], [216, 122, 36, 0.35], [80, 70, 50, 0.5], [152, 30, 30, 0.4], [216, 50, 36, 0.4]],
  },
  {
    slug: 'upside-down', name: 'Upside Down', night: true, glow: [700, 50, 70],
    note: 'The same house taken by the Upside Down: paper rotted to rags and grown over with vines, red veins across the boards and the rug, a window lit red by lightning, spores in the air.',
    tile: tiler({ k: UD, paper: rotted, mk: RED_MIRROR, wk: WIN4, rk: RUG4, glass: lightning, extra: overgrown }),
    props: (phase): Prop[] => {
      const old = clock({ body: 'slate', hi: 'mist', lo: 'dusk', brass: 'blood1', brassHi: 'red', face: 'grey3', hand: 'blood0', well: 'night' }, phase);
      vine(old, [[3, 31], [3, 26], [5, 22], [3, 17], [4, 14]]);
      const lit = lamp({ shade: 'red', hi: 'pink', lo: 'blood1', pole: 'dusk', foot: 'shadow' }, phase & 1 ? 'hot' : 'pink');
      vine(lit, [[5, 14], [7, 11], [6, 8]]);
      const seat = chair({ b: 'blood1', h: 'red', l: 'blood0', leg: 'night', nail: 'hot' });
      vine(seat, [[2, 15], [4, 11], [3, 8], [6, 5]]);
      return [{ px: old, x: 144, y: 8 }, { px: lit, x: 24, y: 120 }, { px: seat, x: 208, y: 40 }];
    },
    lights: [[112, 36, 56, 1], [216, 124, 42, 0.8], [32, 125, 36, 0.6], [200, 72, 40, 0.7]],
  },
];
