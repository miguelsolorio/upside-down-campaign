// Vecna in the Rooted look (docs/level-13.md, the owner's pick: gfx/var/vecna_scary.ts), drawn from the sheet's own rig, 36 by 61 with his feet on
// row 59 and the roots running out from them on row 60, under ten rows of headroom for the tendrils: ash grey, hunched, a skull of a head, four
// tall dark red tendrils behind him. The sim gives him nine things to do. Stand is his idle and walk a slow step (walk, stand, the other foot,
// stand), pose curse is the clock's chime (his arm raised), whip the wind-up of a lash (the vine over his head) and throw a rock held up,
// float and burn the poses of the later phases, stun is what an orb's break does to him in Float (dropped to the floor, stooped, his arms
// hanging), hurt flashes him with his arms flung up, and his KO is the stun thinning out over a few dozen frames. float is drawn at the
// frame's own height and the sim's `z` lifts it, over the shadow that stays on the floor (a pose's own lift and shadow are the sheet's, not
// the game's). The fire of the burn is the `blaze` effect over him, not part of the frame. The tendrils are a layer of their own, eight frames
// in a loop, drawn under whichever body frame he is in, so they never stop writhing; a view's `t` steps them. Facing left turns the frame
// round. Five fill colors (grey, dark grey, bone, red, dark red) and the ink outline. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { Px } from './px.ts';
import type { Layers } from './var/vecna_opts.ts';
import { VH, VW } from './var/vecna_kit.ts';
import type { VPose } from './var/vecna_kit.ts';
import { VECNA_SCARY, WRITHE } from './var/vecna_scary.ts';

/** The frame is 36 wide and 61 tall counted from the tips of the tendrils: row 59 is where he stands. */
export const VECNA_W = VW, VECNA_H = VH - 1;
export { WRITHE };
const ROOTED = VECNA_SCARY.find((o) => o.slug === 'rooted') as (typeof VECNA_SCARY)[number];
const LAYERS = ROOTED.layers as Layers;

/** The frames of his walk, in the order it steps them, each held for `STEP` frames: he is slow. */
const WALK: VPose[] = ['walk', 'stand', 'walkB', 'stand'];
const STEP = 16;
/** Frames each of the tendrils' eight steps lasts: a loop of 48, a slow writhe. */
export const TENDRIL_TICKS = 6;
/** The KO thins out after this many frames, a quarter of its pixels at a time over the next 48. */
const FADE_HOLD = 24, FADE_STEP = 16;

export interface VecnaAsk { pose: VPose; fade: number }

/** Which pose a view asks for, and how far the KO has thinned (0 to 3): the pose he is doing first, then a hit's flinch, then his walk and his stand. */
export function vecnaPoseOf(v: Pick<ActorView, 'anim' | 'pose' | 't'>): VecnaAsk {
  switch (v.pose) {
    case 'curse': case 'whip': case 'float': case 'throw': case 'burn': return { pose: v.pose, fade: 0 };
    case 'stun': return { pose: 'stun', fade: 0 };
    default: break;
  }
  switch (v.anim) {
    case 'hurt': return { pose: 'hurt', fade: 0 };
    case 'ko': return { pose: 'stun', fade: Math.max(0, Math.min(3, Math.floor((v.t - FADE_HOLD) / FADE_STEP) + 1)) };
    case 'walk': return { pose: WALK[(v.t / STEP | 0) & 3] as VPose, fade: 0 };
    default: return { pose: 'stand', fade: 0 };
  }
}

/** The step of the tendrils' loop a view is at (0 to 7). */
export const tendrilOf = (v: Pick<ActorView, 't'>): number => ((v.t / TENDRIL_TICKS) | 0) % WRITHE;

/** A copy of a frame with `edit` run over each pixel's place and color: it returns the color to keep, or 0 to drop the pixel. */
function mapped(src: Px, edit: (x: number, y: number, v: number) => number): Px {
  const px = new Px(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) { const v = src.d[i] as number; if (v) px.d[i] = edit(i % src.w, (i / src.w) | 0, v); }
  return px;
}

/** The tendril layer alone, as it loops under a pose: the sheet's own layer, step `tendril` of eight. */
export const tendrilsPx = (pose: VPose, tendril: number): Px => LAYERS.under(pose, tendril);

/** The body alone in a pose, with no tendrils behind it. */
export const bodyPx = (pose: VPose): Px => LAYERS.over(pose);

const frames = new Map<string, Frame>();
const bases = new Map<string, Px>();

/** One frame: the tendrils under the body, outlined together, minus the last row of the sheet's cell, which is only the sheet's shadow. */
export function vecnaPx(pose: VPose, tendril = 0, fade = 0, left = false): Px {
  const id = `${pose}|${tendril & 7}|${fade}|${left ? 'l' : 'r'}`;
  let px = bases.get(id);
  if (!px) {
    const fig = new Px(VW, VH).blit(tendrilsPx(pose, tendril & 7), 0, 0).blit(bodyPx(pose), 0, 0).outline('ink');
    let out = new Px(VECNA_W, VECNA_H).blit(fig, 0, 0);
    if (fade) out = mapped(out, (x, y, v) => (fade === 1 ? ((x + y) & 3) !== 0 : fade === 2 ? ((x + y) & 1) === 0 : (x & 1) === 0 && (y & 1) === 0 && ((x + y) & 2) === 0) ? v : 0);
    px = left ? new Px(VECNA_W, VECNA_H).blit(out, 0, 0, true) : out;
    bases.set(id, px);
  }
  return px;
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function vecnaFrameOf(v: ActorView): Frame {
  const ask = vecnaPoseOf(v), tendril = tendrilOf(v), left = v.dir === 'left';
  return frameFor(frames, `${ask.pose}|${tendril}|${ask.fade}|${left}`, vecnaPx(ask.pose, tendril, ask.fade, left), v);
}
