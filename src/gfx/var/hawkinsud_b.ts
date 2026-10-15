// Upside Down Hawkins looks 3 and 4 (stage 4.3, see look_kit.ts, hawkinsud.ts and hawkinsud_a.ts). "Ash" is the town under grey ash
// like snow, white spores falling and almost no color but the red veins and the tear. "Frozen" is the Upside Down stuck in
// November 1983: frost on the dead lawns, rust red leaves, ice on the road, icicles off the eaves, frozen veins and a gate that
// glow cold cyan. Both reuse the painters of hawkinsud_a.ts (roof, front, lawn, walk, road, vines, veins, spores, car, streetlight,
// tear, clock) with their own kits and an overlay each, and are painted in daytime values for the night pass to darken. Ash piles
// up in drift dashes (a lit dash with a shaded one under it, as the Kamchatka snow does); frost and ice are hand placed in the
// same way, by the tile's variant.
import type { ColorName as N } from '../palette.ts';
import type { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { car, isFront, place, ps, streetlight, tear, tiler, yardClock } from './hawkinsud_a.ts';
import type { Kit } from './hawkinsud_a.ts';
import { dots } from './tunnel_paint.ts';
import type { Glow, Pt } from './tunnel_paint.ts';

type Tri = readonly [number, number, number];

const RED: Glow = { halo: 'blood0', base: 'blood1', mid: 'red', bright: 'hot' };
const CYAN: Glow = { halo: 'teal0', base: 'teal1', mid: 'cyan', bright: 'white' };
const ASH: Kit = {
  rf: 'grey2', rfHi: 'grey3', rfLo: 'grey1', rfSeam: 'ink', lip: 'bone', eave: 'black',
  sd: 'grey2', sdHi: 'grey3', sdLo: 'grey1', fr: 'grey3', pane: 'black', glint: 'bone', lit: 'grey3',
  dr: 'grey3', drHi: 'bone', drLo: 'grey2', step: 'bone', gr: 'bone', grHi: 'white', grLo: 'grey3',
  sl: 'grey3', slHi: 'bone', slLo: 'grey2', cb: 'grey2', cbHi: 'bone', as: 'grey1', asHi: 'grey2', asLo: 'ink', ln: 'grey3',
  vn: 'grey1', vnHi: 'grey2', vnLo: 'ink', g: RED, sp: ['white', 'white', 'mist'],
};
const FROST: Kit = {
  rf: 'slate', rfHi: 'mist', rfLo: 'dusk', rfSeam: 'shadow', lip: 'sky', eave: 'night',
  sd: 'dusk', sdHi: 'slate', sdLo: 'shadow', fr: 'mist', pane: 'teal1', glint: 'sky', lit: 'cyan',
  dr: 'slate', drHi: 'mist', drLo: 'dusk', step: 'sky', gr: 'soil1', grHi: 'mist', grLo: 'soil0',
  sl: 'slate', slHi: 'mist', slLo: 'dusk', cb: 'dusk', cbHi: 'sky', as: 'teal0', asHi: 'teal1', asLo: 'night', ln: 'bone',
  vn: 'teal1', vnHi: 'sky', vnLo: 'teal0', g: CYAN, sp: ['white', 'sky'],
};

const ROOFL: Tri[][] = [[[1, 1, 6], [8, 6, 5], [2, 11, 7]], [[6, 1, 5], [0, 6, 4], [9, 11, 6]], [[3, 1, 7], [10, 6, 4], [5, 11, 5]], [[8, 1, 6], [2, 6, 5], [7, 11, 4]]]; // lumps on the courses (y 1, 6, 11)
const DRIFT: Tri[][] = [[[2, 3, 6], [9, 11, 5], [5, 7, 3]], [[7, 4, 6], [1, 12, 4], [10, 8, 3]], [[3, 11, 5], [10, 4, 5], [1, 7, 3]], [[5, 3, 7], [1, 11, 5], [11, 9, 3]]];
const BOARD = [[1, 6, 10], [4, 9, 12], [0, 7, 11], [3, 8, 13]]; // where ash lies on the top of the siding boards
/** Ash over everything: lumps on the shingles, along the boards and the sills, drifts on the lawn, dust on the slabs and the road. */
function ashen(px: Px, c: TC): void {
  const drift = ([x, y, w]: Tri, hi: N, lo: N): void => { px.rect(x, y, w, 1, hi).rect(x + 1, y + 1, w, 1, lo); };
  if (c.ch === '#') for (const [x, y, w] of ROOFL[c.v]) px.rect(x, y, w, 1, 'white').rect(x, y + 1, w + 1, 1, 'bone');
  else if (isFront(c.ch)) {
    for (const x of BOARD[c.v]) px.rect(x, 2, 4, 1, 'bone').rect(x + 1, 6, 3, 1, 'bone');
    if (c.ch === 'w') px.rect(1, 13, 13, 1, 'white').rect(3, 12, 9, 1, 'bone');
    if (c.ch === 'D') px.rect(2, 14, 12, 1, 'bone').rect(3, 13, 3, 1, 'bone');
  } else if (c.ch === 'g' || c.ch === 'v') for (const t of DRIFT[c.v].slice(0, 2)) drift(t, 'white', 'grey3');
  else if (c.ch === 'c') drift(DRIFT[c.v][0] as Tri, 'bone', 'grey2');
  else if (c.ch === '.') for (const [x, y, w] of DRIFT[c.v]) px.rect(x, y, w - 2, 1, 'grey3').set(x + 1, y + 1, 'grey2');
}

const ICICLE: number[][] = [[2, 7, 12], [4, 9, 14], [1, 6, 11], [3, 8, 13]]; // x of the icicles hanging off the eave, by variant
const FROSTED: Tri[][] = [[[1, 1, 5], [9, 6, 6], [3, 11, 5]], [[7, 1, 6], [2, 6, 5], [10, 11, 4]], [[4, 1, 4], [10, 6, 5], [1, 11, 6]], [[9, 1, 5], [3, 6, 6], [6, 11, 5]]];
const PUDDLE: number[][][] = [[[5, 4, 4, 2], [11, 12, 3, 1.5]], [[10, 5, 4, 2]], [[4, 11, 4, 2], [12, 4, 2.5, 1.5]], [[8, 12, 5, 2]]]; // frozen puddles on the road: center, radii
const SHEEN: Pt[][] = [[[2, 13], [5, 10]], [[9, 6], [12, 3]], [[1, 6], [4, 3]], [[10, 13], [13, 10]]]; // a slant of light across the ice
const LEAF: Pt[][] = [[[3, 4]], [], [[5, 8]], [[2, 6], [10, 11]]];
const CRUST = [['..bbbb....', '.bbmmmbb..', 'bmmmmmmmb.', '.mmm.mmm..'], ['...bbb..', '.bbmmbb.', 'bmmmmmmb', '..mmm.m.'], ['.bb...bb..', 'bmmbbbmmb.', '.mmmmmmm..', '...mmm....']]; // frost on the grass
const FROSTP: Tri[][] = [[[0, 5, 2]], [], [[1, 6, 11]], []]; // crust, x, y
const SPARK: Pt[][] = [[[6, 6], [13, 2]], [[3, 3], [12, 7]], [[10, 2], [2, 9]], [[5, 5], [11, 9]]];
/** Frost, ice and leaves: crusts on the shingles, icicles off the eave, frosted lawn with rust leaves, glints on the slabs, frozen puddles on the road. */
function frosty(px: Px, c: TC): void {
  if (c.ch === '#') for (const [x, y, w] of FROSTED[c.v]) px.rect(x, y, w, 1, 'bone').rect(x, y + 1, w, 1, 'mist');
  else if (isFront(c.ch)) {
    for (const x of ICICLE[c.v]) px.rect(x, 0, 1, 3 + (x & 3), 'sky').set(x, 2 + (x & 3), 'white');
    if (c.ch === 'w') dots(px, [[4, 4], [5, 4], [4, 5], [10, 10], [9, 10]], 'white');
    if (c.ch === 'w' || c.ch === 'D') px.rect(2, 13, 12, 1, 'bone');
  } else if (c.ch === '.' || c.ch === '=') {
    for (const [x, y, rx, ry] of PUDDLE[c.v]) px.ellipse(x, y, rx, ry, 'teal1').ellipse(x - 1, y - 0.5, rx - 1.5, ry - 1, 'sky').ellipse(x, y, rx - 2, ry - 1, 'teal1').set(x - 2, y - 1, 'white');
    if (c.v & 1 && c.ch === '.') px.line(SHEEN[c.v][0][0], SHEEN[c.v][0][1], SHEEN[c.v][1][0], SHEEN[c.v][1][1], 'mist');
  } else {
    ps(c, LEAF[c.v]).forEach(([x, y]) => px.rect(x + 1, y, 2, 1, 'blood1').rect(x, y + 1, 2, 1, 'blood1').set(x, y + 1, 'soil3').set(x + 2, y + 1, 'soil0'));
    if (c.ch === 'c') dots(px, ps(c, SPARK[c.v]), 'sky');
    else for (const [s, x, y] of FROSTP[c.v]) px.art(CRUST[s], { b: 'bone', m: 'mist' }, x, y);
  }
}

export const HAWKINSUD_B: StageLook[] = [
  {
    slug: 'ash', name: 'Ash', night: true, glow: [560, 60, 70],
    note: 'Grey ash over everything like snow, drifts on the lawns, caps on the shingles, white spores falling, and almost no color left but the red veins and the glowing tear.',
    tile: tiler(ASH, ashen),
    props: (phase): Prop[] => {
      const bat = car({ b: 'grey2', hi: 'grey3', lo: 'grey1', roof: 'bone', gl: 'grey1', gh: 'bone', tire: 'ink', lamp: 'grey3', tail: 'blood1' });
      bat.rect(23, 4, 5, 2, 'bone').rect(24, 4, 3, 1, 'white').rect(2, 5, 4, 2, 'bone').rect(12, 4, 5, 1, 'white').rect(8, 5, 2, 1, 'bone');
      const pole = streetlight({ pole: 'grey2', hi: 'grey3', lo: 'grey1', head: 'grey2', headHi: 'bone', lens: 'black', foot: 'grey3' });
      pole.rect(4, 0, 8, 1, 'white').rect(3, 1, 3, 1, 'bone');
      const grand = yardClock({ body: 'grey2', hi: 'grey3', lo: 'grey1', brass: 'grey3', brassHi: 'bone', face: 'bone', hand: 'blood1', well: 'ink' }, ASH, phase);
      grand.rect(5, 0, 6, 1, 'white').rect(2, 2, 3, 1, 'bone').rect(1, 28, 14, 1, 'bone');
      return place(bat, pole, tear(RED, 'grey3', phase), grand);
    },
    lights: [[128, 146, 44, 0.5], [200, 40, 22, 0.35], [40, 136, 22, 0.35], [232, 136, 20, 0.3]],
  },
  {
    slug: 'frozen', name: 'Frozen', night: true, glow: [90, 330, 450],
    note: 'The Upside Down stuck in November 1983: frost on the dead lawns, rust red leaves, ice on the road, icicles off the eaves, and a cold cyan light in the veins and the gate.',
    tile: tiler(FROST, frosty),
    props: (phase): Prop[] => {
      const bat = car({ b: 'slate', hi: 'mist', lo: 'dusk', roof: 'mist', gl: 'teal1', gh: 'sky', tire: 'ink', lamp: 'mist', tail: 'blood1' });
      bat.rect(23, 4, 5, 2, 'bone').rect(2, 5, 4, 2, 'bone').rect(12, 4, 5, 1, 'white');
      const pole = streetlight({ pole: 'slate', hi: 'mist', lo: 'dusk', head: 'slate', headHi: 'bone', lens: 'teal1', foot: 'mist' });
      dots(pole, [[3, 5], [5, 5], [5, 6], [10, 5], [12, 5], [12, 6], [12, 7]], 'sky');
      dots(pole, [[3, 6], [5, 7], [10, 6], [12, 8]], 'white');
      const grand = yardClock({ body: 'slate', hi: 'mist', lo: 'dusk', brass: 'sky', brassHi: 'white', face: 'bone', hand: 'blood1', well: 'night' }, FROST, phase);
      grand.rect(5, 0, 6, 1, 'bone').rect(2, 3, 12, 1, 'mist').rect(1, 28, 14, 1, 'bone');
      return place(bat, pole, tear(CYAN, 'mist', phase), grand);
    },
    lights: [[128, 146, 60, 0.9], [200, 40, 34, 0.6], [40, 136, 34, 0.6], [232, 136, 30, 0.5], [64, 72, 48, 0.35]],
  },
];
