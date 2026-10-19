// Three scarier takes on Vined, the owner's Vecna (vecna-variations.html). All three share what makes him scarier than the
// first Vined: a hunch (the head sunk between raised shoulders), longer arms and claws, and a skull of a head: a big cranium
// over a narrow jaw, a heavy brow, black sockets with glowing points for eyes, a bare row of teeth, vines over the dome.
// Gaunt keeps the show's flesh, darker, with tendrils rising off his back and veins that glow. Flayed is raw muscle with the
// ribs showing. Rooted is ash grey, with tall tendrils behind him and roots running from his feet. Five fill colors each.
import type { ColorName } from '../palette.ts';
import type { Px } from '../px.ts';
import { seg, wrap } from './vecna_kit.ts';
import type { Pt, Tri, VCols, VRig } from './vecna_kit.ts';
import { layersOf, make } from './vecna_opts.ts';
import type { Spec, VecnaOpt } from './vecna_opts.ts';

/** The head sunk between raised shoulders, the arms a little longer and wider. */
function hunch(r: VRig): VRig {
  const arm = (t: Tri, s: number): Tri => [[t[0][0] + s, t[0][1] - 1], [t[1][0] + s, t[1][1]], [Math.max(1, Math.min(34, t[2][0] + s)), Math.min(49, t[2][1] + 2)]];
  return { ...r, head: [r.head[0], r.head[1] + 2], neck: [r.neck[0], r.neck[1] + 1], shW: r.shW + 1, arms: [arm(r.arms[0], -1), arm(r.arms[1], 1)] };
}

/** The skull: cranium and jaw lit up and left, a brow, sockets with a glowing point each, teeth, vines on the dome. */
function skull(px: Px, r: VRig, c: VCols, vine: ColorName): void {
  const hx = Math.round(r.head[0]), hy = Math.round(r.head[1]);
  px.ellipse(hx + 0.6, hy - 0.4, 4.4, 4.4, c.D).ellipse(hx, hy - 1, 4.2, 4.2, c.G);
  px.ellipse(hx + 0.5, hy + 2.8, 2.9, 2.4, c.D).ellipse(hx, hy + 2.3, 2.7, 2.2, c.G);
  px.rect(hx - 3, hy - 1, 7, 1, c.D).set(hx - 3, hy + 2, c.D).set(hx + 3, hy + 2, c.D);
  px.rect(hx - 3, hy, 2, 2, 'ink').rect(hx + 1, hy, 2, 2, 'ink');
  px.set(hx - 2, hy, c.E).set(hx + 1, hy, c.E);
  px.rect(hx - 2, hy + 3, 5, 1, 'ink').set(hx - 2, hy + 3, c.B).set(hx, hy + 3, c.B).set(hx + 2, hy + 3, c.B);
  px.rect(hx - 1, hy + 4, 3, 1, 'ink').set(hx - 1, hy + 4, c.B).set(hx + 1, hy + 4, c.B);
  px.line(hx - 4, hy - 1, hx - 2, hy - 4, vine).line(hx - 2, hy - 4, hx, hy - 5, vine).line(hx + 3, hy - 3, hx + 2, hy - 5, vine);
}

/** Veins branching down from the neck over the chest and belly, a glowing point at two of the forks. */
function veins(px: Px, r: VRig, vine: ColorName, glow: ColorName): void {
  const [nx, ny] = r.neck, wy = r.waist[1];
  const runs: Pt[][] = [
    [[nx - 1, ny + 2], [nx - 3, ny + 5], [nx - 2, ny + 9], [nx - 3, wy - 1]],
    [[nx + 1, ny + 2], [nx + 3, ny + 6], [nx + 1, ny + 10], [nx + 2, wy - 1]],
    [[nx - 3, ny + 5], [nx, ny + 8], [nx + 1, ny + 10]],
  ];
  for (const run of runs) for (let i = 0; i + 1 < run.length; i++) px.line(run[i]![0], run[i]![1], run[i + 1]![0], run[i + 1]![1], vine);
  px.set(nx - 3, ny + 5, glow).set(nx + 1, ny + 10, glow);
}

/** Frames in a tendril's writhe. */
export const WRITHE = 8;

/**
 * Tendrils rising off his back past the shoulders and curling out, n a side, drawn behind him. With a phase they writhe: the
 * root stays on the shoulder, the middle sways a px, the tip two, each tendril out of step with the others, a loop of WRITHE
 * frames. In the game this is a layer of its own under every body frame, so it loops whatever pose he's in.
 */
function tendrils(px: Px, r: VRig, vine: ColorName, n: number, tall: number, phase = 0): void {
  for (let k = 0; k < n; k++) {
    for (const s of [-1, 1]) {
      const [sx, sy] = r.arms[s < 0 ? 0 : 1][0], o = k * 3, a = ((phase % WRITHE) / WRITHE) * Math.PI * 2 + k * 1.9 + (s > 0 ? 2.4 : 0);
      const sway = (amp: number, lag: number): number => Math.round(Math.sin(a - lag) * amp);
      const lift = Math.round(Math.cos(a - 1.2) * 1);
      const pts: Pt[] = [
        [sx - s * 2, sy + 2], [sx + s * (1 + o) + sway(1, 0), sy - 4 - o],
        [sx + s * (4 + o) + sway(1.6, 0.6), sy - tall - o], [sx + s * (3 + o) + sway(2.4, 1.2), sy - tall - 4 - o + lift],
      ];
      for (let i = 0; i + 1 < pts.length; i++) seg(px, pts[i] as Pt, pts[i + 1] as Pt, i === 0 ? 2 : 1, vine, null);
    }
  }
}

// ---------------------------------------------------------------- 1. Gaunt
const GAUNT_COLS: VCols = { G: 'soil2', D: 'soil0', B: 'bone', E: 'hot' };
const GAUNT: VecnaOpt = {
  slug: 'gaunt', name: 'Gaunt', loop: WRITHE,
  note: 'The show\'s Vecna, darker: deep brown flesh with black shadow, hunched, a skull of a head with glowing red points for eyes and bare teeth, long claws, veins that glow at the forks, and two tendrils rising off his back.',
  cols: GAUNT_COLS,
  mark: { ring: 'red', face: 'bone', pip: 'red' },
  draw: make({
    cols: GAUNT_COLS, vine: 'blood1', stretch: hunch, body: { claw: 4.6 },
    before: (px, r, _pose, phase) => tendrils(px, r, 'blood1', 1, 8, phase),
    dress(px, r) {
      veins(px, r, 'blood1', 'hot');
      for (const t of [...r.arms, ...r.legs]) wrap(px, [t[0], t[1], t[1]] as Tri, 'blood1', 4);
      skull(px, r, GAUNT_COLS, 'blood1');
    },
  }),
};

// ---------------------------------------------------------------- 2. Flayed
const FLAYED_COLS: VCols = { G: 'blood1', D: 'blood0', B: 'bone', E: 'white' };
const FLAYED: VecnaOpt = {
  slug: 'flayed', name: 'Flayed',
  note: 'As if the skin were gone: raw dark red muscle in long strands, the bone of the ribs showing down his sides, red vines wound round his arms and legs, white points for eyes. The most gruesome, the furthest from the show.',
  cols: FLAYED_COLS,
  mark: { ring: 'red', face: 'bone', pip: 'white' },
  draw: make({
    cols: FLAYED_COLS, vine: 'red', stretch: hunch, body: { claw: 4.6 },
    dress(px, r) {
      const [nx, ny] = r.neck, wy = r.waist[1];
      for (let y = ny + 3; y < wy - 3; y += 2) {
        const u = (y - ny) / (wy - ny), hw = Math.round(r.shW + (r.wW - r.shW) * u);
        px.rect(nx - hw + 1, y, 2, 1, 'bone').rect(nx + hw - 3, y, 2, 1, 'bone');
      }
      for (const dx of [-1, 1]) px.line(nx + dx, ny + 2, nx + dx, wy - 2, 'blood0');
      for (const t of [...r.arms, ...r.legs]) wrap(px, [t[0], t[1], t[2]] as Tri, 'red', 4);
      skull(px, r, FLAYED_COLS, 'red');
    },
  }),
};

// ---------------------------------------------------------------- 3. Rooted
const ROOTED_COLS: VCols = { G: 'grey2', D: 'grey1', B: 'bone', E: 'red' };
const ROOTED_SPEC: Spec = {
  cols: ROOTED_COLS, vine: 'blood1', stretch: hunch, body: { claw: 4.6 },
  before: (px, r, _pose, phase) => tendrils(px, r, 'blood1', 2, 12, phase),
  dress(px, r) {
    veins(px, r, 'blood1', 'red');
    if (!r.lift) for (const t of r.legs) { const [fx, fy] = t[2]; px.line(fx - 1, fy, fx - 5, fy + 1, 'blood1').line(fx + 2, fy, fx + 6, fy + 1, 'blood1'); }
    for (const t of r.legs) wrap(px, [t[0], t[1], t[1]] as Tri, 'blood1', 4);
    skull(px, r, ROOTED_COLS, 'blood1');
  },
};
const ROOTED: VecnaOpt = {
  slug: 'rooted', name: 'Rooted', loop: WRITHE,
  note: 'Ash grey, as if the Upside Down had dried him out, hunched under four tall dark red tendrils that rise behind him like a crown, roots running from his feet into the floor, red points for eyes. The biggest outline.',
  cols: ROOTED_COLS,
  mark: { ring: 'blood1', face: 'bone', pip: 'red' },
  draw: make(ROOTED_SPEC),
  layers: layersOf(ROOTED_SPEC),
};

export const VECNA_SCARY: VecnaOpt[] = [GAUNT, FLAYED, ROOTED];
