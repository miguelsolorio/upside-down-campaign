// Alpha designs 3 to 5. Brute is a hunched flesh red thing that walks on its knuckles, all shoulder. Crawler is long and low,
// a purple centipede in three segments with a small flower head. Bloom is a small grey body with a huge flower on a stem.
// Each draws a 32 by 24 frame facing right. See alpha_kit.ts for the pieces.
import { blob } from '../actor_demo_head.ts';
import { Px } from '../px.ts';
import { H, W, bloom, bud, finish, leg, limb, lump, part, spikes } from './alpha_kit.ts';
import type { AlphaOpt, AlphaPose, Cols, Pt } from './alpha_kit.ts';

// ---------------------------------------------------------------- 3. Brute
const BRUTE_COLS: Cols = { D: 'blood1', G: 'red', B: 'bone', R: 'hot' };
interface Brute { torso: Pt; tilt: number; hip: Pt; nearArm: [Pt, Pt, Pt]; farArm: [Pt, Pt, Pt]; nearLeg: [Pt, Pt, Pt]; farLeg: [Pt, Pt, Pt]; head: Pt }
const BRUTE: Record<AlphaPose, Brute> = {
  walk: { torso: [14.5, 10.5], tilt: -0.3, hip: [6, 15.5], nearArm: [[20, 12], [23, 17], [25, 21]], farArm: [[16, 12], [16, 17], [14, 21]],
    nearLeg: [[6, 17], [3, 19], [4, 22]], farLeg: [[8, 17], [10, 20], [11, 22]], head: [24.5, 11] },
  howl: { torso: [12.5, 12.5], tilt: -0.8, hip: [7, 18], nearArm: [[17, 11], [22, 15], [27, 12]], farArm: [[12, 11], [8, 15], [4, 11]],
    nearLeg: [[8, 19], [4, 21], [4, 22]], farLeg: [[10, 19], [13, 21], [14, 22]], head: [22, 9] },
  leap: { torso: [14, 11], tilt: -0.1, hip: [6, 13.5], nearArm: [[19, 10], [25, 9], [30, 10]], farArm: [[17, 11], [23, 13], [28, 14]],
    nearLeg: [[6, 15], [2, 16], [0, 14]], farLeg: [[8, 16], [4, 19], [1, 21]], head: [24.5, 12] },
};

function fist(p: Px, f: Pt, c: Cols, far: boolean): void {
  p.ellipse(f[0] + 0.5, f[1] + 0.2, 2.6, 2.1, c.D);
  if (!far) p.ellipse(f[0], f[1] - 0.3, 2.6, 2.1, c.G).set(f[0] - 1, f[1] - 1, c.B).set(f[0] + 1, f[1] - 1, c.B);
}

function brute(pose: AlphaPose): Px {
  const px = new Px(W, H), c = BRUTE_COLS, r = BRUTE[pose];
  const [tx, ty] = r.torso;
  part(px, (p) => { limb(p, r.farArm, c.D, 3); fist(p, r.farArm[2], c, true); leg(p, r.farLeg[0], r.farLeg[1], r.farLeg[2], c, true, 2); });
  lump(px, r.hip[0], r.hip[1], 4.2, 3.8, c);
  blob(px, tx + 0.5, ty + 2.2, r.tilt, 9.2, 5.8, c.D);
  blob(px, tx, ty, r.tilt, 9.2, 5.8, c.G);
  px.ellipse(tx - 2, ty - 3.2, 2.2, 1.4, c.B);
  for (let i = 0; i < 4; i++) { const x = Math.round(tx - 4 + i * 2.6); px.line(x, ty, x - 1, ty + 3, c.D).set(x, ty, c.B); }
  spikes(px, [tx - 6, ty - 3.5], [tx + 4, ty - 6.5], 5, c, 2);
  part(px, (p) => leg(p, r.nearLeg[0], r.nearLeg[1], r.nearLeg[2], c, false, 2));
  part(px, (p) => { limb(p, r.nearArm, c.G, 3, c.D); fist(p, r.nearArm[2], c, false); });
  part(px, (p) => {
    if (pose === 'walk') bud(p, r.head[0], r.head[1], 0.1, 4.2, 3.4, c);
    else bloom(p, r.head[0], r.head[1], pose === 'howl' ? 3.8 : 3.4, 7, pose === 'howl' ? 0.8 : 0.7, pose === 'howl' ? -1.1 : 0, c);
  });
  return finish(px);
}

// ---------------------------------------------------------------- 4. Crawler
const CRAWLER_COLS: Cols = { D: 'purple0', G: 'purple', B: 'bone', R: 'magenta' };
const SEG_X = [7, 14.5, 22];
const CRAWLER: Record<AlphaPose, { y: number[]; head: Pt; size: number; tilt: number; sx: number }> = {
  walk: { y: [17, 16, 17], head: [27.5, 16], size: 3.4, tilt: 0, sx: 0.55 },
  howl: { y: [17.5, 14, 9.5], head: [27, 6.5], size: 3.4, tilt: -1.2, sx: 0.8 },
  leap: { y: [11, 11, 11], head: [28, 11], size: 3.4, tilt: 0, sx: 0.55 },
};

function crawler(pose: AlphaPose): Px {
  const px = new Px(W, H), c = CRAWLER_COLS, r = CRAWLER[pose];
  const step = pose === 'walk' ? 1 : 0;
  SEG_X.forEach((x, i) => {
    const y = r.y[i] as number, ground = y > 13;
    const feet: [Pt, Pt, Pt][] = ground
      ? [[[x - 2, y + 2], [x - 4 + step * (i % 2 ? 1 : -1), y + 4], [x - 5 + step * (i % 2 ? 1 : -1), 22]], [[x + 2, y + 2], [x + 4 - step * (i % 2 ? 1 : -1), y + 4], [x + 5 - step * (i % 2 ? 1 : -1), 22]]]
      : [[[x - 2, y + 2], [x - 5, y + 4], [x - 8, y + 4]], [[x + 1, y + 2], [x - 2, y + 5], [x - 5, y + 6]]];
    for (const f of feet) leg(px, f[0], f[1], f[2], c, i === 1);
  });
  for (let i = 0; i < 3; i++) {
    const x = SEG_X[i] as number, y = r.y[i] as number;
    if (i < 2) px.ellipse((x + (SEG_X[i + 1] as number)) / 2, ((y + (r.y[i + 1] as number)) / 2) + 0.4, 4.6, 3, c.D);
    lump(px, x, y, 5.2, 3.8, c);
    spikes(px, [x - 2, y - 3], [x + 2, y - 3], 2, c, 1);
  }
  limb(px, [[1, r.y[0] as number], [-1, (r.y[0] as number) - 3]], c.G);
  px.set(0, (r.y[0] as number) - 3, c.B);
  const last = r.y[2] as number;
  limb(px, [[SEG_X[2] as number + 3, last - 1], [r.head[0] - 2, r.head[1]]], c.G, 2, c.D);
  bloom(px, r.head[0], r.head[1], r.size, 5, r.sx, r.tilt, c);
  return finish(px);
}

// ---------------------------------------------------------------- 5. Bloom
const BLOOM_BODY: Cols = { D: 'grey1', G: 'grey2', B: 'bone', R: 'orange' };
const BLOOM_PETAL: Cols = { D: 'grey2', G: 'bone', B: 'bone', R: 'orange' };
const BLOOMS: Record<AlphaPose, { body: Pt; head: Pt; size: number; sx: number; tilt: number; legs: [Pt, Pt, Pt][] }> = {
  walk: { body: [11, 16.5], head: [23.5, 9], size: 4.4, sx: 0.6, tilt: 0.2,
    legs: [[[6, 18], [4, 20], [3, 22]], [[9, 19], [10, 21], [11, 22]], [[13, 19], [15, 21], [17, 22]], [[16, 18], [18, 20], [18, 22]]] },
  howl: { body: [10, 17], head: [22.5, 8.5], size: 4.8, sx: 0.9, tilt: -1.3,
    legs: [[[5, 19], [3, 21], [2, 22]], [[8, 20], [8, 22], [9, 22]], [[13, 20], [14, 22], [15, 22]], [[16, 19], [18, 21], [19, 22]]] },
  leap: { body: [10, 12], head: [24, 10], size: 4.2, sx: 0.55, tilt: 0,
    legs: [[[5, 14], [1, 15], [0, 18]], [[8, 15], [4, 18], [2, 21]], [[14, 15], [19, 17], [22, 20]], [[16, 14], [21, 13], [25, 15]]] },
};

function bloomDog(pose: AlphaPose): Px {
  const px = new Px(W, H), c = BLOOM_BODY, r = BLOOMS[pose];
  r.legs.forEach((l, i) => leg(px, l[0], l[1], l[2], c, i % 2 === 0));
  lump(px, r.body[0], r.body[1], 7, 4, c);
  spikes(px, [r.body[0] - 5, r.body[1] - 3], [r.body[0] + 3, r.body[1] - 4], 4, c, 1);
  limb(px, [[r.body[0] + 5, r.body[1] - 2], [r.head[0] - 5, r.head[1] + 4], [r.head[0] - 1, r.head[1] + 1]], c.G, 2, c.D);
  bloom(px, r.head[0], r.head[1], r.size, 8, r.sx, r.tilt, BLOOM_PETAL);
  return finish(px);
}

export const ALPHA_B: AlphaOpt[] = [
  { slug: 'brute', name: 'Brute', cols: BRUTE_COLS, draw: brute,
    note: 'Raw red flesh and bone: a hump of shoulder, small hips, fists on the ground. Slow and heavy, so the lunge feels like a surprise.' },
  { slug: 'crawler', name: 'Crawler', cols: CRAWLER_COLS, draw: crawler,
    note: 'A long low purple body in three segments on short legs, a flower head at the front. The flattest shape, easy to tell from the pack.' },
  { slug: 'bloom', name: 'Bloom', cols: BLOOM_BODY, draw: bloomDog,
    note: 'A small dark body that carries one huge bone coloured flower with an orange throat. The head is the whole creature.' },
];
