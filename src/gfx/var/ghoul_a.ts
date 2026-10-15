// Creel ghouls 1 and 2 (ghoul-variations.html). "Glass wraith" is a tall pale woman made of a broken mirror: skin of bone with
// cracks through it, cyan where the light catches an edge, black hollows for eyes, a gown that ends in shards and hovers above
// the floor. It drifts, and in death it comes apart along its own cracks. "Broken victim" is one of Vecna's from 1959, a boy in
// a dark suit with his neck, elbows and knees bent the wrong way, black sockets with blood under them, and he moves in jerks:
// each drift frame is a different wrong shape, not a step. Five fill colors each, counted over every pose.
import type { ColorName } from '../palette.ts';
import { px32 } from '../canvas.ts';
import { Px } from '../px.ts';
import { H, W, chain, finish, over, seg, shards, shear, tri } from './ghoul_kit.ts';
import type { GPose, GhoulOpt, Pt, Tri } from './ghoul_kit.ts';

// ---------------------------------------------------------------- 1. Glass wraith
const BONE = px32('bone'), WHITE = px32('white');
const WC: Record<string, ColorName> = { b: 'bone', m: 'mist', k: 'black', c: 'cyan', w: 'white' };
const WHEAD = [
  '.bbbb.b.',
  'bwbcbbbm',
  'bbbbcbcm',
  'bkkbbkkm',
  'bkkbbkkm',
  'bkkbbkkm',
  'bkbbbbkm',
  '.bbkkbbm',
  '..bkkbm.',
  '...bbm..',
];
const WOPEN = [...WHEAD.slice(0, 7), '.bkkkkbm', '.bkkkkbm', '..bkkbm.', '...bbm..'];
interface WP { dx: number; dy: number; head: 0 | 1; arms: readonly [Tri, Tri]; hem: readonly number[] }
const HEM_A = [22, 23, 21, 23, 22, 23, 21, 22, 23, 22], HEM_B = [23, 21, 23, 22, 21, 23, 22, 23, 21, 23], HEM_C = [21, 22, 21, 21, 22, 21, 21, 22, 21, 22];
const WP: Partial<Record<GPose, WP>> = {
  stand: { dx: 0, dy: 0, head: 0, arms: [[[6, 14], [4, 18], [3, 21]], [[15, 14], [17, 18], [18, 21]]], hem: HEM_A },
  driftA: { dx: -1, dy: -1, head: 0, arms: [[[6, 14], [3, 18], [1, 21]], [[15, 14], [17, 18], [18, 21]]], hem: HEM_B },
  driftB: { dx: 1, dy: 0, head: 0, arms: [[[6, 14], [4, 18], [3, 21]], [[15, 14], [18, 17], [20, 20]]], hem: HEM_A },
  lunge: { dx: 0, dy: 1, head: 1, arms: [[[6, 15], [2, 12], [1, 8]], [[15, 15], [19, 12], [20, 8]]], hem: HEM_C },
};

/** A hand: a wrist and two long fingers spread in a V (up when dir is -1). */
function fingers(px: Px, hand: Pt, dir: number, col: ColorName): void {
  const [x, y] = hand;
  px.line(x, y, x - 1, y + 3 * dir, col).line(x, y, x + 1, y + 3 * dir, col).set(x, y + dir, col);
}

const BODY_HW = [5, 4, 3, 2, 2, 3, 4, 4]; // half widths from the shoulders down (row 13)

/** The body: a column of bone from sloped shoulders to a hem of shards, cut by planes of mist and a seam of cyan: a mirror cracked across. */
function body(px: Px, p: WP): void {
  const cx = 11 + p.dx, y0 = 13 + p.dy;
  BODY_HW.forEach((hw, i) => px.rect(cx - hw, y0 + i, hw * 2, 1, 'bone'));
  p.hem.forEach((b, i) => { for (let y = y0 + 8; y <= b + p.dy; y++) px.set(cx - 5 + i, y, 'bone'); });
  over(px, (t) => {
    tri(t, [cx + 1, y0], [cx + 6, y0], [cx + 6, y0 + 6], 'mist');
    tri(t, [cx - 6, y0 + 6], [cx - 1, y0 + 5], [cx - 6, y0 + 12], 'mist');
    tri(t, [cx + 1, y0 + 8], [cx + 6, y0 + 7], [cx + 6, y0 + 13], 'mist');
    chain(t, [[cx, y0 + 1], [cx + 3, y0 + 4], [cx + 3, y0 + 6]], 1, 'cyan');
    chain(t, [[cx - 4, y0 + 5], [cx, y0 + 7]], 1, 'black');
    t.set(cx - 4, y0 + 1, 'white').set(cx - 3, y0 + 2, 'white').set(cx - 2, y0 + 7, 'cyan').set(cx, y0 + 9, 'cyan').set(cx + 3, y0 + 9, 'cyan');
  });
}

/** The wraith in a pose, without an outline. */
function wraith(pose: GPose): Px {
  const px = new Px(W, H), p = WP[pose === 'hurt' ? 'stand' : pose] as WP;
  body(px, p);
  for (const [sh, el, ha] of p.arms) {
    const at = (q: Pt): Pt => [q[0] + p.dx, q[1] + p.dy];
    chain(px, [at(sh), at(el), at(ha)], 1, 'bone');
    px.set(at(sh)[0] + (sh[0] < 11 ? 1 : -1), at(sh)[1], 'bone');
    fingers(px, at(ha), ha[1] < el[1] ? -1 : 1, 'bone');
  }
  px.art(p.head ? WOPEN : WHEAD, WC, 7 + p.dx, 3 + p.dy + (p.head ? 1 : 0));
  return px;
}

/** Face and hands flat on the glass from inside, a crack running out from each hand. */
function wraithGlass(): Px {
  const px = new Px(W, H);
  px.art(['.bbbb.', 'bbbbbm', 'bkbbkm', 'bkbbkm', '.bbbbm', '..bkb.'], WC, 8, 3);
  px.rect(8, 8, 2, 3, 'bone').rect(12, 8, 2, 3, 'bone').set(9, 10, 'mist').set(12, 10, 'mist');
  px.set(8, 7, 'cyan').set(13, 7, 'cyan').set(10, 10, 'cyan').set(11, 9, 'cyan').set(13, 4, 'white');
  return px;
}

/** Half out: the head and one shoulder over the frame, both hands on its lower edge, the hem still in the glass. */
function wraithStep(): Px {
  const px = new Px(W, H);
  px.rect(9, 12, 6, 3, 'bone').set(14, 13, 'mist').set(14, 14, 'mist').set(10, 13, 'black').set(12, 14, 'black').set(11, 13, 'cyan');
  px.art(WHEAD, WC, 8, 4);
  chain(px, [[10, 13], [6, 16], [6, 19]], 1, 'bone');
  chain(px, [[14, 13], [17, 16], [16, 19]], 1, 'bone');
  fingers(px, [6, 19], 1, 'bone');
  fingers(px, [16, 19], 1, 'bone');
  px.set(8, 15, 'cyan').set(15, 15, 'cyan');
  return px;
}

const WRAITH: GhoulOpt = {
  slug: 'wraith', name: 'Glass wraith',
  note: 'A tall pale woman whose skin is cracked like a broken mirror, cyan on the cracks, hollow black eyes, a gown that ends in shards; it floats, and breaks into glass when it dies.',
  draw(pose) {
    if (pose === 'glass') return finish(pose, wraithGlass());
    if (pose === 'step') return finish(pose, wraithStep());
    if (pose === 'shatter') {
      const out = shards(wraith('stand'), 4, 7);
      for (const [x, y] of [[3, 22], [18, 21], [11, 24], [7, 23], [15, 24]]) out.set(x, y, 'cyan');
      return finish(pose, out);
    }
    const fig = wraith(pose);
    if (pose !== 'hurt') return finish(pose, fig);
    const flash = shear(fig, (y) => (y < 13 ? 1 : 0));
    for (let i = 0; i < flash.d.length; i++) if (flash.d[i] === BONE) flash.d[i] = WHITE;
    for (const [x, y] of [[9, 8], [13, 10], [10, 15], [12, 17], [9, 20], [13, 21]]) flash.set(x, y, 'cyan');
    return finish(pose, flash);
  },
};

// ---------------------------------------------------------------- 2. Broken victim
const VC: Record<string, ColorName> = { k: 'black', b: 'bone', r: 'red', d: 'dusk', s: 'slate' };
const VHEAD = [
  '.kkkkk.',
  'kkkkkkk',
  'kkbbbbk',
  'bkkbkkb',
  'bkkbkkb',
  'bkkbkkb',
  'brbbbrb',
  'brbkbrb',
  '.rbbbr.',
];
const VGAPE = [...VHEAD.slice(0, 6), 'brbbbrb', 'bkkkkkb', '.bkkkb.', '.bbkbb.'];
interface VP { dx: number; dy: number; lean: number; gape?: boolean; arms: readonly [Tri, Tri]; legs: readonly [Tri, Tri] }
const VP: Partial<Record<GPose, VP>> = {
  stand: { dx: 0, dy: 0, lean: 2, arms: [[[7, 13], [3, 12], [3, 18]], [[14, 13], [15, 19], [17, 21]]], legs: [[[9, 19], [9, 22], [9, 24]], [[12, 19], [16, 22], [13, 24]]] },
  driftA: { dx: -1, dy: 0, lean: -2, arms: [[[7, 13], [5, 17], [8, 21]], [[14, 13], [18, 14], [19, 9]]], legs: [[[9, 19], [6, 22], [8, 24]], [[12, 19], [12, 22], [12, 24]]] },
  driftB: { dx: 1, dy: -1, lean: 3, arms: [[[7, 13], [2, 15], [1, 20]], [[14, 13], [17, 17], [14, 20]]], legs: [[[9, 19], [9, 22], [9, 24]], [[12, 19], [17, 21], [15, 24]]] },
  lunge: { dx: 0, dy: 1, lean: 0, gape: true, arms: [[[7, 14], [2, 11], [3, 6]], [[14, 14], [19, 11], [18, 6]]], legs: [[[9, 20], [6, 22], [5, 24]], [[12, 20], [16, 22], [17, 24]]] },
  hurt: { dx: 0, dy: 0, lean: -4, gape: true, arms: [[[7, 13], [5, 17], [8, 15]], [[14, 13], [18, 16], [16, 13]]], legs: [[[9, 19], [7, 22], [8, 24]], [[12, 19], [14, 22], [14, 24]]] },
};

/** A limb: a sleeve or trouser leg 2 px wide with a lit left edge. */
function sleeve(px: Px, a: Pt, b: Pt, c: Pt): void {
  chain(px, [a, b, c], 2, 'dusk');
  seg(px, [a[0], a[1]], [b[0], b[1]], 1, 'slate');
}

/** The head: its rows leaning by `lean` px at the top, as a neck bent the wrong way would hold it. */
function vhead(px: Px, rows: readonly string[], x: number, y: number, lean: number): void {
  rows.forEach((row, j) => px.art([row], VC, x + Math.round(lean * (1 - j / (rows.length - 1))), y + j));
}

/** The victim in a pose, without an outline. */
function victim(pose: GPose): Px {
  const px = new Px(W, H), p = VP[pose] as VP, cx = 11 + p.dx, y0 = 12 + p.dy;
  for (const [hip, kn, ft] of p.legs) {
    sleeve(px, [hip[0] + p.dx, hip[1] + p.dy], [kn[0] + p.dx, kn[1] + p.dy], [ft[0] + p.dx, ft[1] + p.dy - 1]);
    px.rect(ft[0] + p.dx - 1, ft[1] + p.dy, 4, 1, 'black');
  }
  [4, 4, 3, 3, 3, 3, 3].forEach((hw, i) => px.rect(cx - hw, y0 + i, hw * 2, 1, 'dusk').set(cx - hw, y0 + i, 'slate'));
  px.rect(cx - 1, y0, 2, 2, 'bone').rect(cx, y0 + 2, 1, 4, 'red').set(cx - 1, y0 + 2, 'bone');
  for (const [sh, el, ha] of p.arms) {
    sleeve(px, [sh[0] + p.dx, sh[1] + p.dy], [el[0] + p.dx, el[1] + p.dy], [ha[0] + p.dx, ha[1] + p.dy]);
    px.rect(ha[0] + p.dx, ha[1] + p.dy + (ha[1] > el[1] ? 0 : -1), 2, 2, 'bone');
  }
  vhead(px, p.gape ? VGAPE : VHEAD, cx - 3, 3 + p.dy + (p.gape && p.lean === 0 ? 1 : 0), p.lean);
  return px;
}

function victimGlass(): Px {
  const px = new Px(W, H);
  px.art(['.bbbb.', 'bkbbkb', 'bkbbkb', 'brbbrb', '.bkkb.'], VC, 8, 3);
  px.rect(8, 9, 2, 3, 'bone').rect(12, 9, 2, 3, 'bone').rect(9, 11, 4, 1, 'dusk').set(8, 3, 'black').set(13, 3, 'black');
  return px;
}

function victimStep(): Px {
  const px = new Px(W, H);
  px.rect(7, 14, 8, 4, 'dusk').set(7, 14, 'slate').rect(10, 14, 2, 2, 'bone').set(11, 16, 'red');
  vhead(px, VHEAD, 8, 5, 3);
  sleeve(px, [7, 15], [4, 17], [5, 20]);
  sleeve(px, [14, 15], [17, 14], [18, 18]);
  px.rect(5, 20, 2, 2, 'bone').rect(17, 18, 2, 2, 'bone');
  return px;
}

const VICTIM: GhoulOpt = {
  slug: 'victim', name: 'Broken victim',
  note: 'One of Vecna\'s from 1959 in a dark suit, the neck, arms and knees bent the wrong way, black sockets with blood under them; it moves in jerks, and comes apart at the joints.',
  draw(pose) {
    if (pose === 'glass') return finish(pose, victimGlass());
    if (pose === 'step') return finish(pose, victimStep());
    if (pose === 'shatter') {
      const out = shards(victim('stand'), 4, 5);
      for (const [x, y] of [[6, 19], [10, 23], [15, 21], [18, 24], [3, 24], [12, 20]]) out.set(x, y, 'red');
      return finish(pose, out);
    }
    const fig = victim(pose);
    if (pose === 'hurt') for (const [x, y] of [[8, 2], [14, 3], [4, 6], [17, 5], [10, 1]]) fig.set(x, y, 'red');
    return finish(pose, fig);
  },
};

export const GHOULS_A: GhoulOpt[] = [WRAITH, VICTIM];
