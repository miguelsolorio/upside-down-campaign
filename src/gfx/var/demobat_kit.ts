// The demobat frames for demobat-variations.html (stage 4.3 and chapter 5): the Upside Down's flyers, seen from above in the game's
// top-down 3/4 view, coming at the viewer with the head lowest, the wings out to the sides, and the long whip tail trailing up
// behind. Each design is the left half of a 15 by 11 body (the right half is the mirror), layered as wings, body, head and tail,
// then outlined in ink into a 17 by 13 frame. Wings are silhouette masks painted by the rig in demobat_rig.ts. The same eight
// frames for every design: flap 1 to 4 (wings up, mid, down, mid), glide, dive (wings swept back, head open), stunned (limp,
// three yellow stars) and hit (a white flash, as the game flashes a sprite). The ground shadow is not here: the card and the
// game draw it in black under the sprite. Pure: no DOM.
import { Px } from '../px.ts';
import { RAY_LOOK, RAY_MASKS } from './demobat_ray.ts';
import { wingArt } from './demobat_rig.ts';
import type { Art, Look, Pose, Pt } from './demobat_rig.ts';
import { SHOW_MASKS } from './demobat_wings.ts';

export const BW = 17, BH = 14;
const CW = 15, CH = 12;
/** The body's top row, under the tail's room. */
const TOP = 1;

export type DemobatId = 'show' | 'pale' | 'ray' | 'ember';
export const FRAME_NAMES = ['flap1', 'flap2', 'flap3', 'flap4', 'glide', 'dive', 'stunned', 'hit'] as const;
export type FrameName = (typeof FRAME_NAMES)[number];

// ---------------------------------------------------------------- the tail
/** Tail paths from the back of the body, in frame content coordinates (x 0 to 14, y 0 to 11), the last point the barbed end. */
type Tails = Record<string, Pt[]>;
const TAILS: Tails = {
  right: [[7, 3], [7, 2], [8, 1], [9, 1], [10, 0], [11, 0]],
  left: [[7, 3], [7, 2], [6, 1], [5, 1], [4, 0], [3, 0]],
  hookR: [[7, 3], [7, 2], [7, 1], [8, 0], [9, 0]],
  hookL: [[7, 3], [7, 2], [7, 1], [6, 0], [5, 0]],
  s: [[7, 3], [7, 2], [8, 1], [7, 0], [6, 0]],
  streak: [[7, 3], [7, 2], [7, 1], [7, 0]],
  limp: [[7, 4], [8, 3], [9, 3], [10, 4], [10, 5]],
  whip: [[7, 3], [8, 2], [9, 1], [10, 1], [11, 0], [12, 0]],
};
const SPINE: Tails = {
  ...TAILS,
  right: [[7, 4], [7, 3], [7, 2], [7, 1], [7, 0], [8, 0]], left: [[7, 4], [7, 3], [7, 2], [7, 1], [7, 0], [6, 0]],
  hookR: [[7, 4], [7, 3], [7, 2], [7, 1], [8, 0]], hookL: [[7, 4], [7, 3], [7, 2], [7, 1], [6, 0]],
  s: [[7, 4], [7, 3], [7, 2], [7, 1], [7, 0]], streak: [[7, 4], [7, 3], [7, 2], [7, 1], [7, 0]],
  limp: [[7, 5], [7, 4], [8, 3], [9, 3]],
};

// ---------------------------------------------------------------- the designs
const SHOW: Look = {
  pal: { g: 'grey1', G: 'grey2', r: 'red', w: 'white', y: 'yellow' },
  masks: SHOW_MASKS,
  wing: { m: 'g', v: 'G', e: 'G', t: 'g', end: 'G' },
  body: ['........', '........', '........', '......gG', '.....ggG', '.....gGG', '.....ggG', '......gG'],
  closed: ['.....rkr', '......rr', '.......r'],
  open: ['...r..rk', '....rrkw', '......rr'],
  tail: ['G', 'G'],
};

const PALE: Look = {
  pal: { b: 'bone', m: 'mist', r: 'red', w: 'white', y: 'yellow' },
  masks: SHOW_MASKS,
  wing: { m: 'b', v: 'r', e: 'b', t: 'm', end: 'r', cut: true, spike: 1 },
  body: ['........', '........', '........', '......bw', '.....mbb', '......bb', '......mb', '......mb'],
  closed: ['.....bbb', '......br', '.......m'],
  open: ['...b..br', '....bbrw', '......br'],
  tail: ['b', 'r'],
};

const EMBER: Look = {
  pal: { b: 'blood0', r: 'red', h: 'hot', w: 'white', y: 'yellow' },
  masks: SHOW_MASKS,
  wing: { m: 'b', v: 'r', e: 'b', t: 'b', end: 'h', cut: true },
  body: ['........', '........', '........', '......bb', '.....bbr', '......br', '......br', '......bb'],
  closed: ['.....bhb', '......bb', '.......r'],
  open: ['...r..rh', '....rrhb', '......rr'],
  tail: ['r', 'h'],
};

const LOOKS: Record<DemobatId, Look> = { show: SHOW, pale: PALE, ember: EMBER, ray: { ...RAY_LOOK, masks: RAY_MASKS } };

// ---------------------------------------------------------------- assembly
const TAIL_OF: Record<FrameName, string> = {
  flap1: 'right', flap2: 'hookR', flap3: 'left', flap4: 'hookL', glide: 's', dive: 'streak', stunned: 'limp', hit: 'whip',
};
const POSE_OF: Record<FrameName, Pose> = {
  flap1: 'up', flap2: 'mid', flap3: 'down', flap4: 'mid2', glide: 'glide', dive: 'dive', stunned: 'stun', hit: 'glide',
};

/** Lays rows of a half art onto the 15 by 12 body, mirrored about column 7, the first row on row dy. */
function lay(buf: string[][], rows: Art, dy = 0): void {
  rows.forEach((row, j) => {
    const y = j + dy;
    if (y < 0 || y >= CH) return;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i] as string;
      if (ch === '.') continue;
      (buf[y] as string[])[i] = ch;
      (buf[y] as string[])[CW - 1 - i] = ch;
    }
  });
}

/** One frame of one design: a 17 by 14 Px, ink outline included. */
export function demobatFrame(id: DemobatId, frame: FrameName): Px {
  const look = LOOKS[id];
  const buf: string[][] = Array.from({ length: CH }, () => Array<string>(CW).fill('.'));
  const dy = TOP + (frame === 'stunned' ? 1 : 0);
  lay(buf, wingArt(look.masks[POSE_OF[frame]], look.wing), dy);
  lay(buf, look.body, dy);
  lay(buf, frame === 'dive' || frame === 'hit' ? look.open : look.closed, dy + 8);
  const tail = (id === 'ray' ? SPINE : TAILS)[TAIL_OF[frame]] as Pt[];
  tail.forEach(([x, y], i) => { (buf[y] as string[])[x] = look.tail[i === tail.length - 1 ? 1 : 0]; });
  const out = new Px(BW, BH);
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      const ch = buf[y]![x] as string;
      if (ch === '.') continue;
      out.set(x + 1, y + 1, ch === 'k' ? 'ink' : frame === 'hit' ? 'white' : (look.pal[ch] ?? 'ink'));
    }
  }
  out.outline('ink');
  if (frame === 'stunned') for (const [x, y] of [[3, 1], [8, 0], [13, 1]] as const) out.set(x, y, 'yellow');
  return out;
}
