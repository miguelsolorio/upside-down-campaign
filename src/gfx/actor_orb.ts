// The memory orb of Vecna's lair (docs/level-13.md, the owner's pick, Vine nest: gfx/var/attic_props.ts, orb), drawn from the sheet's own frame,
// 16 by 26 with its roots on the bottom row: a glowing red bulb with a small figure in it, on a twisted stalk with two tendrils curled up
// either side. It has three looks. Standing, the bulb pulses from red to white at its heart in four steps (a loop of 32 frames). Marked
// (ActorView.marked, the orb the clock chimed for: breaking it lifts the curse) is lit red, the bulb gone hot and pink with the sheet's ring
// of bone dots round it, in place of the d20 a boss would wear. Severed (pose severed, broken at 0 HP and growing back after 20 s) is the
// stalk snapped off short at the roots, its ragged tip wet, the tendrils lying limp on the floor, the bulb a burst husk with a few
// shards of red beside it, and a drip of light at the cut every second or so; it gives no light and cannot be hit. It is rooted, so it has
// no facing, no walk and no shadow of its own: its roots are its foot. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { cord, orb } from './var/attic_props.ts';
import { trace } from './var/tunnel_paint.ts';
import type { Pt } from './var/tunnel_paint.ts';

/** The frame is 16 wide and 26 tall, the roots on its bottom row. */
export const ORB_W = 16, ORB_H = 26;
/** Frames each step of the pulse lasts. */
const PULSE_TICKS = 8;

export type OrbLook = 'stand' | 'marked' | 'severed';
export interface OrbAsk { look: OrbLook; phase: number }

/** Which look a view asks for, and the step of its pulse (0 to 3). */
export function orbLookOf(v: Pick<ActorView, 'pose' | 'marked' | 't'>): OrbAsk {
  const phase = ((v.t / PULSE_TICKS) | 0) & 3;
  return { look: v.pose === 'severed' ? 'severed' : v.marked ? 'marked' : 'stand', phase };
}

/** The bulb's reds one step brighter, for the marked orb: it is the one the clock lit. */
const LIT: [ColorName, ColorName][] = [['blood0', 'blood1'], ['blood1', 'red'], ['red', 'hot'], ['hot', 'pink']];

/** The orb lit red: the bulb's colors a step up, the figure inside it bright, the ring of bone dots round it. */
function marked(phase: number): Px {
  const px = orb(phase, true), swap = new Map<number, number>(LIT.map(([a, b]) => [px32(a), px32(b)]));
  for (let y = 0; y < 16; y++) for (let x = 0; x < ORB_W; x++) { const v = px.d[y * ORB_W + x] as number, to = swap.get(v); if (to !== undefined) px.d[y * ORB_W + x] = to; }
  return px.rect(7, 6, 2, 2, 'white');
}

/** The stump: the roots splayed as the standing orb's are, the stalk snapped off six rows up with a pale cut and torn fibres, the two tendrils fallen in limp loops either side, the bulb a burst husk on the floor with a few shards. */
function severed(phase: number): Px {
  const px = new Px(ORB_W, ORB_H);
  for (const pts of [[[8, 23], [4, 24], [1, 25]], [[8, 23], [12, 24], [15, 25]], [[8, 22], [6, 25]], [[8, 22], [10, 25]]] as Pt[][]) cord(px, pts, 1);
  cord(px, [[7, 23], [8, 20], [7, 16]], 2);
  px.rect(6, 15, 4, 1, 'bone').set(7, 15, 'pink').set(5, 15, 'blood1').set(10, 15, 'blood0').set(6, 14, 'blood1').set(9, 14, 'blood1').set(7, 14, 'rose');
  if (phase === 0) px.set(8, 14, 'hot').set(8, 13, 'pink');
  for (const [pts, tip] of [[[[6, 22], [4, 20], [2, 20], [1, 22], [3, 24]], 2], [[[9, 22], [11, 20], [13, 20], [14, 22], [12, 24]], 13]] as [Pt[], number][]) {
    for (const [x, y] of trace(pts)) px.set(x, y, 'blood1');
    const [tx, ty] = pts[pts.length - 1] as Pt;
    px.set(tx, ty, 'blood0').set(tip, 20, 'red');
  }
  px.ellipse(11.5, 23.5, 2.4, 1.4, 'blood0').rect(10, 23, 3, 1, 'black').set(9, 22, 'red').set(12, 22, 'blood1').set(14, 24, 'hot').set(10, 21, 'hot');
  return px.outline('ink');
}

const bases = new Map<string, Px>();
const frames = new Map<string, Frame>();

/** The pixels of a look at a step of its pulse, built once. The severed one only has two steps of its drip. */
export function orbPx(look: OrbLook, phase = 0): Px {
  const p = look === 'severed' ? phase & 2 : phase & 3, id = `${look}${p}`;
  let px = bases.get(id);
  if (!px) { px = look === 'severed' ? severed(p) : look === 'marked' ? marked(p) : orb(p); bases.set(id, px); }
  return px;
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function orbFrameOf(v: ActorView): Frame {
  const ask = orbLookOf(v), p = ask.look === 'severed' ? ask.phase & 2 : ask.phase;
  return frameFor(frames, `${ask.look}${p}`, orbPx(ask.look, p), v);
}
