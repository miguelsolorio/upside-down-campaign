// Five Vecnas (chapter 4, docs/chapter-4.md), each five fill colors and the ink outline, on the rigs in vecna_kit.ts. Vined
// is the show's: flesh grown through with red vines. Lich hides him in a robe, a Dungeon Master's undead wizard. Scorched is
// the body Eleven burned, charcoal with glowing cracks. Creel suit keeps the rags of Henry Creel's suit with vines bursting
// through. Lanky stretches him tall and thin with arms to the floor. Each also picks the colors of the clock his curse hangs
// over a hero.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { POSES, TOP, VH, VW, body, finish, lowered, onFire, seg, wrap } from './vecna_kit.ts';
import type { BodyOpts, Pt, Tri, VCols, VPose, VRig } from './vecna_kit.ts';

export interface VecnaOpt {
  slug: string;
  name: string;
  note: string;
  cols: VCols;
  /** The clock over a cursed hero: rim, face, and the sounded chimes. */
  mark: { ring: ColorName; face: ColorName; pip: ColorName };
  /** phase counts up for anything that moves on its own, like tendrils that writhe in every pose. `fire` (on) draws the flames of the burn and whip poses over him; the game draws them as an effect of its own. */
  draw(pose: VPose, phase?: number, fire?: boolean): Px;
  /** Frames in the loop of what moves on its own, if anything does. */
  loop?: number;
  /** The same frame in two layers, for a design with something that moves under him: the game loops the first under each body frame (actor_vecna.ts). */
  layers?: Layers;
}

/** A frame in two layers, each VW by VH, in the rig's own place (no lift, no shadow, no outline): composed under, then over, then outlined, they are `draw`. */
export interface Layers {
  /** What moves on its own, drawn first: the tendrils. They hang off his shoulders, so they follow the pose. */
  under(pose: VPose, phase?: number): Px;
  /** The body in a pose, dressed, with the whip or the rock in his hand. */
  over(pose: VPose, phase?: number): Px;
}

export interface Spec {
  cols: VCols;
  vine: ColorName;
  stretch?: (r: VRig) => VRig;
  body?: BodyOpts;
  /** Drawn first, so the body covers it: tendrils behind him. */
  before?: (px: Px, r: VRig, pose: VPose, phase: number) => void;
  dress?: (px: Px, r: VRig, pose: VPose, phase: number) => void;
}

/** The vine whip cracking over his head from the raised hand, relative to the hand. */
const WHIP: Pt[] = [[2, -3], [-1, -8], [-8, -9], [-16, -8], [-22, -4], [-24, 1]];

const rigOf = (s: Spec, pose: VPose): VRig => lowered(s.stretch ? s.stretch(POSES[pose]) : POSES[pose], TOP);

/** The two layers of a spec: what is drawn before the body (`before`), and the body itself. */
export function layersOf(s: Spec): Layers {
  return {
    under(pose, phase = 0) {
      const fig = new Px(VW, VH);
      s.before?.(fig, rigOf(s, pose), pose, phase);
      return fig;
    },
    over(pose, phase = 0) {
      const r = rigOf(s, pose), fig = new Px(VW, VH);
      body(fig, r, s.cols, s.body);
      s.dress?.(fig, r, pose, phase);
      if (pose === 'whip') {
        const [hx, hy] = r.arms[1][2];
        const pts = WHIP.map(([x, y]) => [hx + x, hy + y] as Pt);
        for (let i = 0; i + 1 < pts.length; i++) seg(fig, pts[i] as Pt, pts[i + 1] as Pt, i < 2 ? 2 : 1, s.vine, null);
        for (const [x, y] of pts.slice(1, 4)) fig.set(x + 1, y, s.cols.B);
      }
      if (pose === 'throw') {
        const [hx, hy] = r.arms[1][2];
        fig.rect(hx - 4, hy - 11, 7, 6, s.cols.D).rect(hx - 4, hy - 11, 7, 1, s.cols.B).rect(hx - 4, hy - 11, 1, 6, s.cols.B).set(hx - 1, hy - 8, s.cols.B);
        fig.line(hx - 7, hy - 9, hx - 6, hy - 9, s.cols.B).line(hx - 7, hy - 6, hx - 6, hy - 6, s.cols.B);
      }
      return fig;
    },
  };
}

export function make(s: Spec): VecnaOpt['draw'] {
  const layers = layersOf(s);
  return (pose, phase = 0, fire = true) => {
    const r = rigOf(s, pose), fig = new Px(VW, VH).blit(layers.under(pose, phase), 0, 0).blit(layers.over(pose, phase), 0, 0);
    return finish(fig, r, fire && (pose === 'burn' || pose === 'whip') ? onFire(r) : undefined);
  };
}

/** A vine strand across the torso, from one shoulder to the far hip, with a lit pixel every few. */
function sash(px: Px, r: VRig, col: ColorName, hi: ColorName | null, flip = false): void {
  const a: Pt = flip ? [r.neck[0] + r.shW - 1, r.neck[1] + 2] : [r.neck[0] - r.shW + 1, r.neck[1] + 2];
  const b: Pt = flip ? [r.waist[0] - r.wW, r.waist[1] - 1] : [r.waist[0] + r.wW - 1, r.waist[1] - 1];
  px.line(a[0], a[1], b[0], b[1], col);
  if (hi) px.set(Math.round((a[0] * 2 + b[0]) / 3), Math.round((a[1] * 2 + b[1]) / 3), hi);
}

// ---------------------------------------------------------------- 1. Vined
const VINED: VecnaOpt = {
  slug: 'vined', name: 'Vined',
  note: 'The show\'s Vecna: grey-brown flesh grown through with dark red vines that cross his chest and wind round his arms and legs, long claws, pale eyes, bare teeth.',
  cols: { G: 'soil2', D: 'soil1', B: 'bone', E: 'bone' },
  mark: { ring: 'red', face: 'bone', pip: 'red' },
  draw: make({
    cols: { G: 'soil2', D: 'soil1', B: 'bone', E: 'bone' }, vine: 'blood1',
    dress(px, r) {
      sash(px, r, 'blood1', 'red');
      sash(px, r, 'blood1', 'red', true);
      for (const t of [...r.arms, ...r.legs]) wrap(px, [t[0], t[1], t[1]] as Tri, 'blood1', 3);
      const [hx, hy] = r.head;
      px.line(hx - 3, hy - 2, hx - 1, hy - 4, 'blood1').line(hx + 1, hy - 4, hx + 3, hy - 1, 'blood1').set(hx - 2, hy - 3, 'red');
    },
  }),
};

// ---------------------------------------------------------------- 2. Lich
const LICH: VecnaOpt = {
  slug: 'lich', name: 'Lich',
  note: 'The Dungeon Master\'s version: a tall pale lich in a ragged purple robe with a hood down round his neck, red eyes, bony grey hands. The robe hides his legs, so he glides.',
  cols: { G: 'grey3', D: 'grey2', B: 'bone', E: 'red' },
  mark: { ring: 'purple', face: 'bone', pip: 'red' },
  draw: make({
    cols: { G: 'grey3', D: 'grey2', B: 'bone', E: 'red' }, vine: 'purple0',
    body: {
      legs: false, arm: 'purple0',
      mid(px, r) {
        const top = r.neck[1] + 1, bot = (r.lift ? 46 : 49) + TOP;
        for (let y = top; y <= bot; y++) {
          const u = (y - top) / (bot - top), hw = r.shW + 0.5 + u * 4.5, cx = r.neck[0];
          const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
          px.rect(x0, y, x1 - x0, 1, 'purple0');
          if (y === bot) for (let x = x0; x < x1; x += 2) px.set(x, y, 0);
        }
        for (const dx of [-3, 1, 4]) px.line(r.neck[0] + dx, top + 6, r.neck[0] + dx + Math.sign(dx), bot - 2, 'ink');
        const [hx, hy] = r.head;
        px.ellipse(hx, hy + 3, r.hr[0] + 2, 2.5, 'purple0');
      },
    },
  }),
};

// ---------------------------------------------------------------- 3. Scorched
const SCORCHED: VecnaOpt = {
  slug: 'scorched', name: 'Scorched',
  note: 'The body Eleven burned in the other dimension: charcoal skin split by cracks that glow orange, amber claws and teeth, yellow eyes. In the Burn phase the cracks become the fire.',
  cols: { G: 'grey1', D: 'soil0', B: 'amber', E: 'yellow' },
  mark: { ring: 'orange', face: 'cream', pip: 'amber' },
  draw: make({
    cols: { G: 'grey1', D: 'soil0', B: 'amber', E: 'yellow' }, vine: 'orange',
    dress(px, r) {
      const [nx, ny] = r.neck, [wx, wy] = r.waist;
      const zig: Pt[] = [[nx - 2, ny + 3], [nx, ny + 6], [nx - 1, ny + 9], [wx + 1, wy - 3], [wx, wy]];
      for (let i = 0; i + 1 < zig.length; i++) px.line(zig[i]![0], zig[i]![1], zig[i + 1]![0], zig[i + 1]![1], 'orange');
      px.line(nx + 1, ny + 6, nx + 3, ny + 8, 'orange').set(nx, ny + 6, 'amber');
      for (const t of r.arms) px.line(t[1][0], t[1][1], Math.round((t[1][0] + t[2][0]) / 2), Math.round((t[1][1] + t[2][1]) / 2), 'orange');
      for (const t of r.legs) px.line(t[0][0], t[0][1] + 2, t[1][0], t[1][1], 'orange');
      const [hx, hy] = r.head;
      px.line(hx - 2, hy - 4, hx, hy - 2, 'orange').line(hx, hy - 2, hx + 2, hy - 3, 'orange').set(hx, hy - 2, 'amber');
    },
  }),
};

// ---------------------------------------------------------------- 4. Creel suit
const CREEL: VecnaOpt = {
  slug: 'creel', name: 'Creel suit',
  note: 'What is left of Henry Creel: the navy suit he wore in 1959, torn and grown through, a white shirt and a red tie, vines bursting out at the seams. His head and hands are Vecna\'s.',
  cols: { G: 'soil2', D: 'soil1', B: 'bone', E: 'bone' },
  mark: { ring: 'soil2', face: 'bone', pip: 'blood1' },
  draw: make({
    cols: { G: 'soil2', D: 'soil1', B: 'bone', E: 'bone' }, vine: 'blood1',
    body: {
      arm: 'dusk', leg: 'dusk',
      mid(px, r) {
        const [nx, ny] = r.neck, [, wy] = r.waist;
        for (let y = ny; y <= wy; y++) {
          const u = (y - ny) / (wy - ny), hw = r.shW + (r.wW - r.shW) * u;
          px.rect(Math.round(nx - hw), y, Math.round(hw * 2), 1, 'dusk');
        }
        for (let k = 0; k < 6; k++) px.rect(nx - 2 + Math.floor(k / 2), ny + 1 + k, 5 - Math.floor(k / 2) * 2, 1, 'bone');
        px.rect(nx, ny + 2, 1, 6, 'blood1');
        px.line(Math.round(nx - r.shW), ny + 6, Math.round(nx - r.shW) - 2, ny + 3, 'blood1');
        px.line(Math.round(nx + r.shW) - 1, ny + 9, Math.round(nx + r.shW) + 1, ny + 12, 'blood1');
        px.line(nx - 3, wy - 2, nx + 2, wy - 6, 'blood1');
      },
    },
  }),
};

// ---------------------------------------------------------------- 5. Lanky
const lanky = (r: VRig): VRig => {
  const up = 3, sh = (p: Pt): Pt => [p[0], p[1] - up];
  const arm = (t: Tri): Tri => {
    const a = sh(t[0]), b: Pt = [Math.round(a[0] + (t[1][0] - t[0][0]) * 1.35), Math.round(a[1] + (t[1][1] - t[0][1]) * 1.35)];
    const c: Pt = [Math.max(1, Math.min(34, Math.round(b[0] + (t[2][0] - t[1][0]) * 1.5))), Math.min(49, Math.round(b[1] + (t[2][1] - t[1][1]) * 1.5))];
    return [a, b, c];
  };
  const leg = (t: Tri): Tri => {
    const a = sh(t[0]), b: Pt = [Math.round(a[0] + (t[1][0] - t[0][0]) * 1.2), Math.round(a[1] + (t[1][1] - t[0][1]) * 1.2)];
    return [a, b, [Math.round(b[0] + (t[2][0] - t[1][0]) * 1.2), Math.min(49, Math.round(b[1] + (t[2][1] - t[1][1]) * 1.2))]];
  };
  return { ...r, head: sh(r.head), hr: [2.8, 3.8], neck: sh(r.neck), waist: sh(r.waist), shW: 4, wW: 2.4, arms: [arm(r.arms[0]), arm(r.arms[1])], legs: [leg(r.legs[0]), leg(r.legs[1])] };
};
const LANKY: VecnaOpt = {
  slug: 'lanky', name: 'Lanky',
  note: 'Stretched: a small head on a thin body, legs a third longer and arms that hang to the floor, raw pink-red flesh with red vines hanging off the arms, white eyes. The scariest outline, the least like the show.',
  cols: { G: 'rose', D: 'blood1', B: 'bone', E: 'white' },
  mark: { ring: 'red', face: 'bone', pip: 'pink' },
  draw: make({
    cols: { G: 'rose', D: 'blood1', B: 'bone', E: 'white' }, vine: 'red', stretch: lanky,
    dress(px, r) {
      for (const t of r.arms) px.line(t[1][0], t[1][1] + 1, t[1][0] + (t[1][0] < 18 ? -1 : 1), t[1][1] + 7, 'red');
      for (const t of r.legs) wrap(px, [t[0], t[1], t[1]] as Tri, 'red', 4);
      sash(px, r, 'red', null);
    },
  }),
};

export const VECNA_OPTS: VecnaOpt[] = [VINED, LICH, SCORCHED, CREEL, LANKY];
