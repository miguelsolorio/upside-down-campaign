// Creel ghouls 3 and 4 (ghoul-variations.html). "Shadow double" is a reflection gone wrong: a near black human shape with arms
// that hang too far, white pin eyes and a red grin, and a thin pale rim on its upper left edges (a dim one on the lower right)
// so it reads on a dark room. Its second drift frame is the first one mirrored, as a reflection would move. "Crawler" comes out
// of the frame on all fours: thin pale limbs bent like a spider's, a back arched over a curtain of long black hair, and a
// glint of red where the eyes would be. Five fill colors each, counted over every pose.
import type { ColorName } from '../palette.ts';
import { px32 } from '../canvas.ts';
import { Px } from '../px.ts';
import { H, W, chain, finish, flip, shards, shear } from './ghoul_kit.ts';
import type { GPose, GhoulOpt, Pt, Tri } from './ghoul_kit.ts';

// ---------------------------------------------------------------- 3. Shadow double
const BLACK = px32('black');
const SC: Record<string, ColorName> = { k: 'black', w: 'white', r: 'red' };
const SHEAD = ['..kkkk..', '.kkkkkk.', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', '.kkkkkk.', '..kkkk..', '...kk...'];
/** The face: pin eyes, one lower than the other, and a thin grin that turns up at both corners. */
const SFACE = ['........', '........', '........', '..w.....', '.....w..', 'r......r', '.rrrrrr.', '........', '........'];
/** In the lunge the eyes are slits and the grin is open, red, with a jagged lower edge. */
const SGRIN = ['........', '........', '.ww..ww.', '........', '........', 'rrrrrrrr', 'rkrkrkrk', '........', '........'];
interface SP { dx: number; dy: number; wide?: boolean; arms: readonly [Tri, Tri]; legs: readonly [Tri, Tri] }
const SP: Partial<Record<GPose, SP>> = {
  stand: { dx: 0, dy: 0, arms: [[[5, 14], [4, 19], [4, 23]], [[14, 14], [15, 19], [16, 23]]], legs: [[[7, 20], [7, 22], [7, 24]], [[12, 20], [12, 22], [12, 24]]] },
  driftA: { dx: 0, dy: 0, arms: [[[5, 14], [3, 18], [2, 22]], [[14, 14], [16, 19], [17, 22]]], legs: [[[7, 20], [6, 22], [6, 24]], [[12, 20], [13, 22], [14, 23]]] },
  lunge: { dx: 0, dy: 2, wide: true, arms: [[[5, 15], [2, 11], [0, 6]], [[14, 15], [17, 11], [20, 6]]], legs: [[[7, 21], [5, 23], [3, 24]], [[12, 21], [15, 23], [18, 24]]] },
};

/** The rim: the upper left edge of the whole shape pale, as if the moon were over that shoulder. A gap of one px between two parts (an arm and the body) counts as filled, so the rim follows the outside of the shape only. */
function lit(px: Px): void {
  const src = px.d.slice(), at = (x: number, y: number): number => (x < 0 || y < 0 || x >= px.w || y >= px.h ? 0 : (src[y * px.w + x] as number));
  const fill = (x: number, y: number): boolean => !!at(x, y) || (!!at(x - 1, y) && !!at(x + 1, y)) || (!!at(x, y - 1) && !!at(x, y + 1));
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (at(x, y) === BLACK && (!fill(x - 1, y) || !fill(x, y - 1))) px.set(x, y, 'mist');
}

/** A hand: three long fingers fanned from the wrist (up when dir is -1). */
function fingers(px: Px, hand: Pt, dir: number): void {
  const [x, y] = hand;
  px.line(x, y, x - 2, y + 3 * dir, 'black').line(x, y, x, y + 3 * dir, 'black').line(x, y, x + 2, y + 3 * dir, 'black');
}

/** The double in a pose: black, with its face, before the rim. */
function double(pose: GPose): Px {
  const px = new Px(W, H), p = SP[pose === 'hurt' ? 'stand' : pose === 'driftB' ? 'driftA' : pose] as SP;
  const cx = 11, y0 = 13 + p.dy;
  p.legs.forEach(([hip, kn, ft], i) => { chain(px, [hip, kn, ft], 3, 'black'); px.rect(ft[0] - 1 + i, ft[1], 4, 1, 'black'); });
  px.rect(cx - 1, y0 - 3, 2, 4, 'black');
  [4, 4, 3, 3, 3, 3, 3].forEach((hw, i) => px.rect(cx - hw, y0 + i, hw * 2, 1, 'black'));
  for (const [sh, el, ha] of p.arms) {
    chain(px, [[sh[0], sh[1] + p.dy], el], 3, 'black');
    chain(px, [el, ha], 2, 'black');
    fingers(px, ha, ha[1] < el[1] ? -1 : 1);
  }
  px.rect(cx, y0 + 1, 1, 6, 'shadow').rect(cx - 3, y0 + 7, 6, 1, 'shadow');
  px.art(SHEAD, SC, cx - 4, 3 + p.dy).art(p.wide ? SGRIN : SFACE, SC, cx - 4, 3 + p.dy);
  return px;
}

const SHADOW: GhoulOpt = {
  slug: 'double', name: 'Shadow double',
  note: 'A near black reflection of a person, the arms too long, white pin eyes and a red grin, with a thin pale rim so it shows on the dark; its second step is the first one mirrored.',
  draw(pose) {
    let fig: Px;
    if (pose === 'glass') {
      fig = new Px(W, H);
      fig.art(['.kkkk.', 'kkkkkk', 'kwkkwk', 'kkkkkk', 'krrrrk', '.kkkk.'], SC, 8, 3);
      fig.rect(8, 9, 2, 3, 'black').rect(12, 9, 2, 3, 'black');
    } else if (pose === 'step') {
      fig = new Px(W, H);
      fig.rect(7, 14, 8, 4, 'black').art(SHEAD, SC, 7, 5).art(SFACE, SC, 7, 5);
      chain(fig, [[5, 15], [3, 18], [4, 20]], 3, 'black');
      chain(fig, [[15, 15], [17, 18], [16, 20]], 3, 'black');
    } else if (pose === 'shatter') fig = shards(double('stand'), 4, 9);
    else if (pose === 'hurt') fig = shear(double('stand'), (y) => Math.round(2 * Math.sin(y * 0.9)));
    else fig = pose === 'driftB' ? flip(double('driftA')) : double(pose);
    lit(fig);
    return finish(pose, fig);
  },
};

// ---------------------------------------------------------------- 4. Crawler
const CC: Record<string, ColorName> = { k: 'black', g: 'grey2', b: 'bone', m: 'mist', h: 'hot' };
const CFACE = ['.kkkkkkkk.', 'kkkkkkkkkk', 'kkbbbbbbkk', 'kbkkbbkkbk', 'kbkhbbkhbk', 'kbbbbbbbbk', 'kkbkkkkbkk', 'kkbkhkhbkk', 'kk.bbbbbkk'];
interface CP { dx: number; dy: number; arms: readonly [Tri, Tri]; hair: readonly number[]; face?: boolean; up?: boolean }
const HAIR_A = [19, 21, 18, 20, 17, 20, 18, 21, 19, 20], HAIR_B = [20, 19, 21, 18, 20, 17, 20, 18, 21, 19], HAIR_C = [11, 13, 12, 11, 11, 11, 11, 12, 13, 11];
const HAIR_S = [16, 17, 15, 17, 14, 17, 15, 17, 16, 16];
const CP: Partial<Record<GPose, CP>> = {
  stand: { dx: 0, dy: 0, arms: [[[6, 9], [2, 11], [3, 21]], [[15, 9], [19, 11], [18, 21]]], hair: HAIR_A },
  driftA: { dx: -1, dy: 1, arms: [[[6, 10], [2, 14], [2, 22]], [[15, 9], [19, 8], [19, 17]]], hair: HAIR_B },
  driftB: { dx: 1, dy: 1, arms: [[[6, 9], [2, 8], [2, 17]], [[15, 10], [19, 14], [19, 22]]], hair: HAIR_A },
  lunge: { dx: 0, dy: 3, face: true, arms: [[[6, 12], [1, 9], [0, 15]], [[15, 12], [20, 9], [21, 15]]], hair: HAIR_C },
  hurt: { dx: 0, dy: 1, up: true, arms: [[[6, 10], [2, 8], [2, 14]], [[15, 10], [19, 8], [19, 14]]], hair: HAIR_A },
  step: { dx: 0, dy: -2, arms: [[[6, 9], [3, 12], [4, 20]], [[15, 9], [18, 12], [17, 20]]], hair: HAIR_S },
};

/** Claws: three long fingers fanned down from a hand (up when dir is -1). */
function claws(px: Px, hand: Pt, dir: number): void {
  const [x, y] = hand;
  px.line(x, y, x - 2, y + 3 * dir, 'bone').line(x, y, x, y + 3 * dir, 'bone').line(x, y, x + 2, y + 3 * dir, 'bone');
  px.set(x - 2, y + 3 * dir, 'mist').set(x + 2, y + 3 * dir, 'mist');
}

/** The arched back: a dome of mist over the head with a lit crown of bone and a spine of bumps down the middle. */
function back(px: Px, cx: number, cy: number): void {
  px.ellipse(cx, cy, 5.6, 3.4, 'mist').ellipse(cx - 0.4, cy - 0.7, 4.4, 2.3, 'bone');
  for (const y of [-1, 1, 3]) px.set(cx - 1, cy + y, 'bone').set(cx, cy + y, 'mist');
}

/** The crawler in a pose, without an outline: arched back, hair over the face, arms bent out and down to the floor. */
function crawler(pose: GPose): Px {
  const px = new Px(W, H), p = CP[pose === 'driftA' || pose === 'driftB' || pose === 'lunge' || pose === 'hurt' || pose === 'step' ? pose : 'stand'] as CP, cx = 11 + p.dx, top = 9 + p.dy;
  for (const [sh, el, ha] of p.arms) {
    chain(px, [[sh[0] + p.dx, sh[1] + p.dy], [el[0], el[1] + p.dy]], 2, 'bone');
    chain(px, [[el[0], el[1] + p.dy], ha], 1, 'bone');
    px.set(el[0], el[1] + p.dy + 1, 'mist');
    claws(px, ha, ha[1] < el[1] ? -1 : 1);
  }
  if (p.face) { px.art(CFACE, CC, cx - 5, top - 1); return px; }
  back(px, cx, top - 2);
  p.hair.forEach((b, i) => { for (let y = top - 1 + [3, 1, 0, 0, 0, 0, 0, 0, 1, 3][i]!; y <= b + p.dy; y++) px.set(cx - 5 + i, y, 'black'); });
  for (const [i, y] of [[2, 11], [5, 12], [7, 11], [8, 14], [3, 15]] as Pt[]) for (let k = 0; k < 3; k++) px.set(cx - 5 + i, y + p.dy + k, 'grey2');
  px.set(cx - 2, top + 5, 'hot').set(cx + 1, top + 5, 'hot');
  if (p.up) px.set(cx - 2, top + 6, 'hot').set(cx + 1, top + 6, 'hot');
  return px;
}

function crawlerGlass(): Px {
  const px = new Px(W, H);
  for (const x of [8, 9, 10, 12, 13]) px.rect(x, 3, 1, 5 + (x & 1) * 2, 'black');
  for (const x of [9, 11, 13]) px.rect(x, 4, 1, 4, 'grey2');
  px.set(9, 7, 'hot').set(12, 7, 'hot');
  px.rect(8, 9, 2, 1, 'bone').rect(12, 9, 2, 1, 'bone');
  px.line(8, 9, 8, 11, 'bone').line(9, 9, 9, 11, 'mist').line(12, 9, 12, 11, 'mist').line(13, 9, 13, 11, 'bone');
  return px;
}

const CRAWLER: GhoulOpt = {
  slug: 'crawler', name: 'Crawler',
  note: 'Long thin limbs, it comes out of the frame on all fours under a curtain of long black hair.',
  draw(pose) {
    if (pose === 'glass') return finish(pose, crawlerGlass());
    if (pose === 'shatter') return finish(pose, shards(crawler('stand'), 4, 2));
    if (pose === 'hurt') return finish(pose, shear(crawler(pose), (y) => (y > 10 ? Math.round((y - 10) * 0.25) : 0)));
    return finish(pose, crawler(pose));
  },
};

export const GHOULS_B: GhoulOpt[] = [SHADOW, CRAWLER];
