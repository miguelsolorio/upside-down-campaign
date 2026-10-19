// The Creel ghoul in the Glass wraith look (docs/level-11.md, the owner's pick: gfx/var/ghoul_a.ts, WRAITH), drawn from the sheet's own
// frames, 22 by 26 with its feet on row 24: a tall pale woman cracked like a broken mirror. The sim gives it five things to do. Pose rise
// is it stepping out of the glass (first its face and hands on the glass, then half out, laid over the mirror's own dark pane: its feet are
// 8 px under the mirror, where the sheet drew them), its walk is the drift (stand, drift A, stand, drift B, and `z` bobs it off the floor),
// its attack is the lunge (the arms up and the mouth open, under the "!" and through the lunge itself), hurt flashes it white, and its
// KO is the shatter, which dithers away after a few frames. An elite's cracks run red. Facing only turns the frame round. Five fill colors
// (bone, mist, black, cyan, white) and the ink outline. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { px32 } from './canvas.ts';
import { Px } from './px.ts';
import { GHOULS_A } from './var/ghoul_a.ts';
import { flip } from './var/ghoul_kit.ts';
import type { GPose } from './var/ghoul_kit.ts';

/** The frame is 22 wide and 25 tall counted from the head: row 24 is where it stands. */
export const GHOUL_W = 22, GHOUL_H = 25;
const WRAITH = GHOULS_A[0] as (typeof GHOULS_A)[number];

/** The frames of its stand and its drift, in the order it cycles them. */
const LOOP: GPose[] = ['stand', 'driftA', 'stand', 'driftB'];
/** How many frames a pose holds of the glass before it steps out. */
const AT_GLASS = 8;
/** The shatter starts to thin out after this many frames, a quarter of its pixels at a time over the next 24. */
const SHATTER_HOLD = 8, SHATTER_STEP = 8;

export interface GhoulAsk { pose: GPose; fade: number }

/** Which pose a view asks for, and how far the shatter has dithered away (0 to 3). */
export function ghoulPoseOf(v: Pick<ActorView, 'anim' | 'pose' | 't'>): GhoulAsk {
  if (v.pose === 'rise') return { pose: v.t < AT_GLASS ? 'glass' : 'step', fade: 0 };
  switch (v.anim) {
    case 'attack': case 'dash': return { pose: 'lunge', fade: 0 };
    case 'hurt': return { pose: 'hurt', fade: 0 };
    case 'ko': return { pose: 'shatter', fade: Math.max(0, Math.min(3, Math.floor((v.t - SHATTER_HOLD) / SHATTER_STEP) + 1)) };
    case 'walk': return { pose: LOOP[(v.t >> 3) & 3] as GPose, fade: 0 };
    default: return { pose: LOOP[(v.t >> 4) & 3] as GPose, fade: 0 };
  }
}

/** A copy of a frame with `edit` run over each pixel's place and color: it returns the color to keep, or 0 to drop the pixel. */
function mapped(src: Px, edit: (x: number, y: number, v: number) => number): Px {
  const px = new Px(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) { const v = src.d[i] as number; if (v) px.d[i] = edit(i % src.w, (i / src.w) | 0, v); }
  return px;
}

/** The shards with every pixel kept or dropped by a checker that thins in four steps. */
function thinned(src: Px, fade: number): Px {
  if (!fade) return src;
  return mapped(src, (x, y, v) => (fade === 1 ? ((x + y) & 3) !== 0 : fade === 2 ? ((x + y) & 1) === 0 : (x & 1) === 0 && (y & 1) === 0 && ((x + y) & 2) === 0) ? v : 0);
}

const bases = new Map<string, Px>();
const frames = new Map<string, Frame>();
const CYAN = px32('cyan'), RED = px32('red');

/** A frame painted for a pose, an elite or not, a fade and a facing, built once. */
function baseOf(ask: GhoulAsk, elite: boolean, left: boolean): Px {
  const id = `${ask.pose}|${ask.fade}|${elite ? 'e' : 'n'}|${left ? 'l' : 'r'}`;
  let px = bases.get(id);
  if (!px) {
    px = thinned(WRAITH.draw(ask.pose, 0), ask.fade);
    if (left) px = flip(px);
    if (elite) px = mapped(px, (_x, _y, v) => (v === CYAN ? RED : v));
    bases.set(id, px);
  }
  return px;
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function ghoulFrameOf(v: ActorView): Frame {
  const ask = ghoulPoseOf(v), elite = v.elite === true, left = v.dir === 'left';
  return frameFor(frames, `${ask.pose}|${ask.fade}|${elite}|${left}`, baseOf(ask, elite, left), v);
}

/** For the sheet's page: one pose at a fade, painted. */
export function ghoulPx(pose: GPose, fade = 0, elite = false): Px { return baseOf({ pose, fade }, elite, false); }
