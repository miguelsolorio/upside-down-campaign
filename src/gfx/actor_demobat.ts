// The demobat in the Pale look (docs/level-12.md, the owner's pick: gfx/var/demobat_kit.ts, demobatFrame('pale', frame)), drawn from the sheet's
// own eight frames, 17 by 14 with its feet on the bottom row: a bat seen from above, wings out, a long whip tail and a red petal head. The
// sim gives it five things to do. Its walk is the flap loop (wings up, mid, down, mid), its idle a glide with a stroke now and then, the
// wind-up of a dive (pose crouch, under the "!") rears the wings up and quivers them, the dive itself (pose charge, and any attack or dash)
// sweeps them back with the head open, a solo pulse stuns it (pose stun: limp, three yellow stars), a hit flashes it white (the sheet's
// hit frame) and its KO is that flash thinning out over a few frames. The sim lifts it with `z`, which the shadow stays under: a flier is
// drawn at the height it rides, and drawFramed (actors.ts) leaves a smaller shadow on the ground at its feet. A bat is the same turned
// either way, so facing does nothing. An elite is flushed: the pale parts go pink and rose. Five fill colors (bone, mist, red, white,
// yellow) and the ink outline. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { px32 } from './canvas.ts';
import { Px } from './px.ts';
import { BH, BW, FRAME_NAMES, demobatFrame } from './var/demobat_kit.ts';
import type { FrameName } from './var/demobat_kit.ts';

/** The frame is 17 wide and 14 tall, its bottom row the one it hangs from. */
export const BAT_W = BW, BAT_H = BH;
export { FRAME_NAMES as BAT_FRAMES };

/** Frames each step of the flap lasts: a full stroke in 12, five beats a second. */
const FLAP_TICKS = 3;
/** The KO's flash thins out in steps of this many frames, a quarter of its pixels at a time. */
const FADE_HOLD = 4, FADE_STEP = 4;

export interface BatAsk { frame: FrameName; fade: number }

/** Which frame a view asks for, and how far the KO has thinned (0 to 3). */
export function batFrameOf(v: Pick<ActorView, 'anim' | 'pose' | 't'>): BatAsk {
  switch (v.pose) {
    case 'stun': return { frame: 'stunned', fade: 0 };
    case 'charge': return { frame: 'dive', fade: 0 };
    case 'crouch': return { frame: (v.t >> 1) & 1 ? 'flap1' : 'flap2', fade: 0 };
    default: break;
  }
  switch (v.anim) {
    case 'attack': case 'dash': return { frame: 'dive', fade: 0 };
    case 'hurt': return { frame: 'hit', fade: 0 };
    case 'ko': return { frame: 'hit', fade: Math.max(0, Math.min(3, Math.floor((v.t - FADE_HOLD) / FADE_STEP) + 1)) };
    case 'walk': return { frame: FRAME_NAMES[((v.t / FLAP_TICKS) | 0) & 3] as FrameName, fade: 0 };
    default: return { frame: (v.t >> 3) & 1 ? 'flap2' : 'glide', fade: 0 };
  }
}

const PALE = px32('bone'), SHADE = px32('mist'), PINK = px32('pink'), ROSE = px32('rose');
const frames = new Map<string, Frame>();
const bases = new Map<string, Px>();

/** A copy of a frame with `edit` run over each pixel's place and color: it returns the color to keep, or 0 to drop the pixel. */
function mapped(src: Px, edit: (x: number, y: number, v: number) => number): Px {
  const px = new Px(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) { const v = src.d[i] as number; if (v) px.d[i] = edit(i % src.w, (i / src.w) | 0, v); }
  return px;
}

/** A frame for an ask and an elite or not, built once: the KO's thinning keeps a quarter, a half, then an eighth of the flash. */
function baseOf(ask: BatAsk, elite: boolean): Px {
  const id = `${ask.frame}|${ask.fade}|${elite ? 'e' : 'n'}`;
  let px = bases.get(id);
  if (!px) {
    px = demobatFrame('pale', ask.frame);
    if (ask.fade) px = mapped(px, (x, y, v) => (ask.fade === 1 ? ((x + y) & 3) !== 0 : ask.fade === 2 ? ((x + y) & 1) === 0 : (x & 1) === 0 && (y & 1) === 0 && ((x + y) & 2) === 0) ? v : 0);
    if (elite && ask.frame !== 'hit') px = mapped(px, (_x, _y, v) => (v === PALE ? PINK : v === SHADE ? ROSE : v));
    bases.set(id, px);
  }
  return px;
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function batFrameFor(v: ActorView): Frame {
  const ask = batFrameOf(v), elite = v.elite === true;
  return frameFor(frames, `${ask.frame}|${ask.fade}|${elite}`, baseOf(ask, elite), v);
}

/** For the sheet's page and the tests: one frame, painted. */
export function batPx(frame: FrameName, fade = 0, elite = false): Px { return baseOf({ frame, fade }, elite); }
