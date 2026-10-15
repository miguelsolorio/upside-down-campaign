// Alpha designs 1 and 2. Elder is the young demodog grown up: the same pale grey dog on four legs, longer and heavier, with a
// ridge of bone and a bigger flower. Stalker is the opposite shape: a tiny body held high on four stilt legs, a long neck and
// a small head, in cold blue chitin. Each draws a 32 by 24 frame facing right. See alpha_kit.ts for the pieces.
import { Px } from '../px.ts';
import { H, W, bloom, bud, finish, leg, limb, lump, spikes } from './alpha_kit.ts';
import type { AlphaOpt, AlphaPose, Cols, Pt } from './alpha_kit.ts';

// ---------------------------------------------------------------- 1. Elder
const ELDER_COLS: Cols = { D: 'grey2', G: 'grey3', B: 'bone', R: 'red' };
interface Rig { haunch: Pt; chest: Pt; head: Pt; tail: Pt; fN: [Pt, Pt, Pt]; fF: [Pt, Pt, Pt]; hN: [Pt, Pt, Pt]; hF: [Pt, Pt, Pt] }

const ELDER: Record<AlphaPose, Rig> = {
  walk: { haunch: [8, 12.5], chest: [18.5, 12], head: [26, 9], tail: [1, 7],
    fN: [[20, 15], [23, 18], [24, 22]], fF: [[16, 15], [15, 18], [13, 21]], hN: [[8, 15], [5, 18], [3, 22]], hF: [[11, 15], [13, 18], [14, 22]] },
  howl: { haunch: [7, 15], chest: [16.5, 12.5], head: [25, 7.5], tail: [1, 12],
    fN: [[19, 14], [22, 18], [22, 22]], fF: [[16, 14], [17, 18], [16, 22]], hN: [[7, 17], [3, 20], [4, 22]], hF: [[10, 17], [11, 20], [12, 22]] },
  leap: { haunch: [8, 11], chest: [18, 10.5], head: [26.5, 9.5], tail: [1, 8],
    fN: [[20, 14], [25, 15], [29, 17]], fF: [[17, 14], [22, 17], [26, 20]], hN: [[7, 14], [2, 16], [0, 19]], hF: [[10, 14], [5, 18], [2, 21]] },
};

function elder(pose: AlphaPose): Px {
  const px = new Px(W, H), c = ELDER_COLS, r = ELDER[pose];
  const [hx, hy] = r.haunch, [cx, cy] = r.chest;
  limb(px, [[hx - 3, hy - 1], r.tail], c.G, 1);
  limb(px, [[hx - 3, hy - 2], [r.tail[0] + 1, r.tail[1] - 1]], c.D, 1);
  px.set(r.tail[0], r.tail[1] - 1, c.B);
  leg(px, r.hF[0], r.hF[1], r.hF[2], c, true); leg(px, r.fF[0], r.fF[1], r.fF[2], c, true);
  lump(px, hx, hy, 4.8, 4.2, c); lump(px, (hx + cx) / 2, (hy + cy) / 2, 6.2, 2.8, c, false); lump(px, cx, cy, 5.2, 4.6, c);
  px.rect(Math.round(hx - 1), Math.round((hy + cy) / 2 + 2), Math.round(cx - hx + 2), 1, c.D);
  spikes(px, [hx - 2, hy - 3], [cx + 2, cy - 4], 7, c, 2);
  leg(px, r.hN[0], r.hN[1], r.hN[2], c, false, 2); leg(px, r.fN[0], r.fN[1], r.fN[2], c, false, 2);
  const [qx, qy] = r.head;
  limb(px, [[cx + 3, cy - 2], [qx - 2, qy + 1]], c.G, 2, c.D);
  if (pose === 'walk') bud(px, qx + 0.5, qy + 0.5, -0.3, 4.6, 3.2, c);
  else bloom(px, qx, qy, pose === 'howl' ? 3.9 : 4.1, 7, pose === 'howl' ? 0.8 : 0.7, pose === 'howl' ? -1.1 : 0, c);
  return finish(px);
}

// ---------------------------------------------------------------- 2. Stalker
const STALKER_COLS: Cols = { D: 'teal0', G: 'teal1', B: 'cyan', R: 'bone' };
const LEGS: Record<AlphaPose, [Pt, Pt, Pt, boolean][]> = {
  walk: [
    [[11, 12], [5, 8], [1, 22], true], [[13, 12], [9, 7], [9, 22], true], [[17, 12], [22, 7], [21, 22], true], [[19, 12], [26, 8], [29, 21], true],
    [[12, 12], [6, 7], [3, 22], false], [[15, 11], [10, 6], [10, 21], false], [[18, 11], [23, 6], [24, 22], false], [[20, 12], [27, 7], [30, 22], false],
  ],
  howl: [
    [[11, 12], [4, 9], [3, 22], true], [[13, 12], [8, 8], [8, 22], true], [[17, 12], [23, 8], [23, 22], true], [[19, 12], [28, 9], [29, 22], true],
    [[12, 12], [5, 8], [5, 22], false], [[15, 11], [10, 7], [11, 22], false], [[18, 11], [24, 7], [25, 22], false], [[20, 12], [29, 8], [30, 22], false],
  ],
  leap: [
    [[11, 12], [6, 15], [0, 17], true], [[13, 12], [9, 17], [5, 22], true], [[17, 12], [22, 16], [28, 19], true], [[19, 12], [25, 14], [31, 14], true],
    [[12, 12], [7, 13], [1, 14], false], [[15, 11], [10, 15], [5, 19], false], [[18, 11], [23, 14], [29, 16], false], [[20, 12], [26, 11], [31, 10], false],
  ],
};

function stalker(pose: AlphaPose): Px {
  const px = new Px(W, H), c = STALKER_COLS;
  const lift = pose === 'leap' ? 0 : 0, by = 11 + lift;
  for (const [a, k, f, far] of LEGS[pose]) {
    if (far) limb(px, [a, k, f], c.D, 1); else { limb(px, [a, k, f], c.G, 1); px.set(k[0], k[1] - 1, c.B); }
    px.set(f[0] + 1, f[1], c.B);
  }
  lump(px, 14, by, 5.2, 3.4, c); lump(px, 19.5, by - 0.5, 3.6, 3, c);
  spikes(px, [10, by - 3], [20, by - 3], 5, c, 2);
  const nx = pose === 'howl' ? 23 : 26, ny = pose === 'howl' ? 8.5 : pose === 'leap' ? 8 : 4;
  limb(px, [[21, by - 2], [pose === 'howl' ? 22 : 24, by - 5], [nx - 1, ny + 2]], c.G, 2, c.D);
  if (pose === 'walk') bud(px, nx + 1, ny, -0.2, 3.6, 2.4, c);
  else bloom(px, nx + 1, ny, pose === 'howl' ? 4.2 : 3.8, 6, pose === 'howl' ? 0.8 : 0.7, pose === 'howl' ? -1.2 : 0, c);
  return finish(px);
}

export const ALPHA_A: AlphaOpt[] = [
  { slug: 'elder', name: 'Elder', cols: ELDER_COLS, draw: elder,
    note: 'The young demodog grown up: same pale grey, same shape, bigger in every way, with a ridge of bone down its back and a larger flower.' },
  { slug: 'stalker', name: 'Stalker', cols: STALKER_COLS, draw: stalker,
    note: 'A small body on four tall stilt legs and a long neck, in cold blue. All reach and no bulk, so it reads as fast.' },
];
