// The things in Vecna's attic (attic.ts), drawn as props for the looks to place: a memory orb (a glowing red bulb on a vine
// stalk, with a small figure in it, and a bone ring if it is the marked one), a round window lit by the storm, a trunk, furniture
// under a sheet, a dress form, and the two for scale, Vecna (Rooted, from vecna_scary.ts) and Max (the game's own composeFrame).
// Also the thick vine strand and pod the looks wind over everything. Props that aren't lights are painted in daytime values for
// the night pass; the orbs and Vecna are actors, so they keep the colors painted here.
import { composeFrame } from '../actor_pose.ts';
import { MAX } from '../data/max.ts';
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import { paintRoles } from './kit.ts';
import { trace } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';
import type { VPose } from './vecna_kit.ts';
import type { VecnaOpt } from './vecna_opts.ts';
import { VECNA_SCARY } from './vecna_scary.ts';

/** A thick vine along a polyline, `w` wide (1 to 3): a shadow below and right, a dark red body, a lit red edge with a hot pixel here and there. */
export function cord(px: Px, pts: readonly Pt[], w = 2): void {
  const path = trace(pts);
  for (const [x, y] of path) px.rect(x, y, w + 1, w + 1, 'blood0');
  for (const [x, y] of path) px.rect(x, y, w, w, 'blood1');
  path.forEach(([x, y], i) => { if (i % 3 !== 2) px.set(x, y, 'red'); if (i % 9 === 4) px.set(x, y, 'hot'); });
}

/** A pod: a 3 by 3 bud with a hot heart and a pink glint. */
export function pod(px: Px, x: number, y: number): void {
  px.rect(x - 1, y - 1, 4, 4, 'blood0').rect(x - 1, y - 1, 3, 3, 'red').set(x, y, 'hot').set(x - 1, y - 1, 'pink');
}

/** Dots on a ring, every other one when `dash` is set. */
function ring(px: Px, cx: number, cy: number, r: number, col: N, dash = false): void {
  for (let a = 0, i = 0; a < 360; a += 6, i++) if (!dash || i % 2 === 0) px.set(Math.round(cx + Math.cos((a * Math.PI) / 180) * r - 0.5), Math.round(cy + Math.sin((a * Math.PI) / 180) * r - 0.5), col);
}

/** A memory orb (16 by 26): roots splayed at the foot, a thin twisted stalk, two tendrils curling up either side of a bulb that pulses from hot to white at its heart. The marked orb has a ring of bone dots round it. */
export function orb(phase: number, marked = false): Px {
  const px = new Px(16, 26), p = phase & 3;
  for (const pts of [[[8, 23], [4, 24], [1, 25]], [[8, 23], [12, 24], [15, 25]], [[8, 22], [6, 25]], [[8, 22], [10, 25]]] as Pt[][]) cord(px, pts, 1);
  cord(px, [[7, 23], [8, 20], [6, 17], [7, 14]], 2);
  for (const pts of [[[7, 20], [4, 19], [2, 15], [2, 11]], [[8, 18], [11, 17], [13, 14], [13, 10]]] as Pt[][]) {
    const path = trace(pts);
    for (const [x, y] of path) px.set(x, y, 'blood1');
    path.forEach(([x, y], i) => { if (i % 3 === 0) px.set(x, y, 'red'); });
    const [tx, ty] = path[path.length - 1] as Pt;
    px.set(tx, ty, 'hot');
  }
  const core = [3.4, 3.8, 3.4, 2.8][p] as number;
  px.ellipse(8, 7.5, 6.4, 6.4, 'blood0').ellipse(8, 7.5, 5.6, 5.6, 'blood1').ellipse(8, 7.5, 4.6, 4.6, 'red');
  px.ellipse(8, 7.5, core, core, 'hot').ellipse(8, 7.5, core - 1.5, core - 1.5, 'pink');
  if (p === 1) px.rect(7, 6, 2, 2, 'white');
  px.set(5, 4, 'white').set(6, 4, 'pink').set(5, 5, 'pink').set(10, 11, 'blood0').set(11, 10, 'blood0');
  px.outline('ink');
  if (marked) ring(px, 8, 7.5, 8, 'bone', true);
  return px;
}

/** The round window, `size` across (32 or less): an ink ring, a frame lit up and left, a glass the storm lights, a cross of bars, a dead branch black against the glass, and on the first phase a bolt. */
export function roundWindow(size: number, phase: number): Px {
  const px = new Px(size), r = size / 2, p = phase & 3;
  const s = size / 32;
  px.disc(r, r, r, 'ink').disc(r, r, r - 1.4 * s, 'dusk');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
    if (d > r - 1.4 * s || d < r - 4.4 * s) continue;
    px.set(x, y, x + y < size - 1 ? 'slate' : x + y > size + 3 ? 'night' : 'dusk');
  }
  const g = r - 4.4 * s, glass: N[] = ['hot', 'red', 'blood1', 'red'];
  px.disc(r, r, g, 'night').disc(r, r, g - 1, glass[p] as N);
  for (let y = Math.round(r + g * 0.3); y < size; y++) for (let x = 0; x < size; x++) if (Math.hypot(x + 0.5 - r, y + 0.5 - r) < g - 1) px.set(x, y, p ? 'blood1' : 'red');
  const bar = Math.max(1, Math.round(2 * s));
  px.rect(Math.round(r) - 1, Math.round(r - g), bar, Math.round(g * 2), 'night').rect(Math.round(r - g), Math.round(r) - 1, Math.round(g * 2), bar, 'night');
  const k = (v: number): number => Math.round(v * s);
  for (const [x, y] of trace([[k(8), k(23)], [k(13), k(19)], [k(15), k(13)], [k(20), k(10)], [k(24), k(11)]])) px.set(x, y, 'blood0');
  for (const [x, y] of trace([[k(13), k(19)], [k(19), k(20)]])) px.set(x, y, 'blood0');
  if (!p && size > 20) for (const [x, y] of trace([[k(21), k(5)], [k(18), k(10)], [k(21), k(14)], [k(17), k(20)]])) px.set(x, y, 'cream');
  return px;
}

export interface TrunkKit { lid: N; lidHi: N; body: N; low: N; strap: N; lock: N }
/** A steamer trunk (20 by 14): a domed lid, two straps with rivets, a lock, short feet. */
export function trunk(k: TrunkKit): Px {
  const px = new Px(20, 14);
  px.rect(3, 0, 14, 1, k.lidHi).rect(1, 1, 18, 4, k.lid).rect(1, 1, 18, 1, k.lidHi).rect(1, 5, 18, 1, k.low);
  px.rect(1, 6, 18, 6, k.body).rect(1, 6, 1, 6, k.lid).rect(1, 11, 18, 1, k.low).rect(2, 12, 3, 1, 'ink').rect(15, 12, 3, 1, 'ink');
  for (const x of [4, 14]) px.rect(x, 1, 2, 11, k.strap).rect(x, 1, 1, 11, k.lidHi).set(x, 3, k.low).set(x, 9, k.low);
  px.rect(9, 4, 3, 4, k.lock).set(10, 6, 'ink');
  return px.outline('ink');
}

/** An armchair under a sheet (16 by 18): a high back, a seat and rolled arms, folds hanging down the front, a scalloped hem, the feet of the chair showing under it. */
export function sheetChair(): Px {
  const px = new Px(16, 18);
  px.rect(3, 1, 9, 6, 'bone').rect(4, 0, 7, 1, 'white').rect(3, 1, 1, 5, 'white').rect(11, 2, 1, 5, 'mist');
  px.rect(0, 6, 16, 10, 'bone').set(0, 6, 0).set(15, 6, 0).rect(1, 6, 14, 1, 'white').rect(4, 7, 8, 1, 'mist');
  px.rect(13, 8, 3, 7, 'mist').rect(0, 8, 1, 7, 'white').rect(0, 14, 16, 1, 'mist');
  for (const x of [4, 8]) px.rect(x, 9, 1, 5, 'mist').set(x - 1, 9, 'white').set(x - 1, 10, 'white');
  for (let x = 0; x < 16; x++) px.set(x, 15, x % 4 < 2 ? 'bone' : 0);
  px.rect(2, 16, 2, 2, 'soil1').rect(12, 16, 2, 2, 'soil1');
  return px.outline('ink');
}

/** A sofa under a sheet (32 by 18): a long back, two arms, a seat with two humps for cushions, folds, a scalloped hem, feet. */
export function sheetSofa(): Px {
  const px = new Px(32, 18);
  px.rect(3, 1, 26, 6, 'bone').rect(4, 0, 24, 1, 'white').rect(3, 1, 1, 5, 'white').rect(28, 2, 1, 5, 'mist');
  px.rect(0, 5, 6, 11, 'bone').rect(26, 5, 6, 11, 'bone').rect(1, 5, 4, 1, 'white').rect(27, 5, 4, 1, 'white').set(0, 5, 0).set(31, 5, 0);
  px.rect(6, 8, 20, 8, 'bone').rect(6, 8, 20, 1, 'white').rect(15, 9, 1, 6, 'mist').rect(6, 9, 20, 1, 'mist');
  px.rect(29, 7, 3, 8, 'mist').rect(0, 7, 1, 8, 'white').rect(0, 14, 32, 1, 'mist');
  for (const x of [3, 9, 21, 27]) px.rect(x, 10, 1, 4, 'mist').set(x - 1, 10, 'white').set(x - 1, 11, 'white');
  for (let x = 0; x < 32; x++) px.set(x, 15, x % 4 < 2 ? 'bone' : 0);
  px.rect(2, 16, 2, 2, 'soil1').rect(28, 16, 2, 2, 'soil1');
  return px.outline('ink');
}

/** A dress form (14 by 28): a knob, a bone colored torso wound with a red measuring tape and pins, a pole and three feet. */
export function dressForm(): Px {
  const px = new Px(14, 28);
  px.rect(6, 0, 2, 2, 'soil3').rect(6, 2, 2, 2, 'mist');
  px.ellipse(7, 10, 5.5, 6.5, 'bone').rect(2, 8, 10, 6, 'bone').ellipse(7, 15.5, 4, 2.5, 'bone');
  px.rect(10, 6, 2, 9, 'mist').rect(3, 14, 8, 2, 'mist').rect(2, 5, 1, 4, 'white').rect(3, 4, 2, 1, 'white');
  px.line(2, 7, 11, 13, 'red').line(2, 8, 11, 14, 'blood1');
  px.set(4, 10, 'hot').set(8, 7, 'hot').set(6, 12, 'hot');
  px.rect(6, 17, 2, 8, 'soil2').rect(6, 17, 1, 8, 'soil3');
  px.line(7, 24, 2, 27, 'soil2').line(7, 24, 12, 27, 'soil2').rect(6, 25, 2, 3, 'soil1');
  return px.outline('ink');
}

/** Max from behind, as the game draws her. */
export const hero = (): Px => paintRoles(composeFrame(MAX, 'up', 'idle', 0), 16, MAX.pal);

/** Vecna, Rooted, in a pose; his tendrils writhe with the phase (a loop of eight, so the sheet steps two at a time). */
export const vecna = (pose: VPose, phase: number): Px => (VECNA_SCARY[2] as VecnaOpt).draw(pose, (phase & 3) * 2);
