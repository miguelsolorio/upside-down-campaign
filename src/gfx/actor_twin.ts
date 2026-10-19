// The twin Demogorgons of stage 5.2 (docs/level-15.md): the 1.3 Demogorgon, twice. The first is the grey one as it is. The second wears a red
// skin, so the pair read apart at a glance: the grey skin red, its shade blood, its bone highlights pink and the flesh inside the petals orange.
// Their poses are the Demogorgon's (actor_demo.ts), and two more are the twins' own:
//   fall (k 0 to 1): the twin goes over the edge into the void with its arms up, shrinking and dropping away and darkening until it is the colour of
//   the void, in eight steps (at k 1 it is out of sight and actors.ts draws nothing). The caller draws it `dy` px lower than its feet, with no shadow or bar, because there is no ground under it.
//   climb (k 1 to 0): it comes back up over the edge, arms first. The sprite rises a row at a time out of the bottom of its cell, which is the
//   edge, so what shows is the claws and then the head and shoulders, until it stands.
// Pure pixel work until the frame's canvas.
import type { ActorView } from '../core/types.ts';
import { px32 } from './canvas.ts';
import { DEMO_H, DEMO_W, demoPx, demoSpec } from './actor_demo.ts';
import type { DemoSpec } from './actor_demo.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';

export const FALL_STEPS = 8, CLIMB_STEPS = 12;
/** The farthest a falling twin has dropped by k = 1, in px. */
export const FALL_DROP = 34;

const SKIN: [ColorName, ColorName][] = [['grey3', 'red'], ['grey2', 'blood1'], ['bone', 'pink'], ['red', 'orange']];
let skin: Map<number, number> | null = null;

/** The second twin's skin: every color of the grey one, swapped once. */
function recolored(src: Px): Px {
  skin ??= new Map(SKIN.map(([a, b]) => [px32(a), px32(b)]));
  const out = new Px(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) { const v = src.d[i] as number; out.d[i] = v ? (skin.get(v) ?? v) : 0; }
  return out;
}

/** The sprite at `s` of its size, nearest pixel, with its feet on the bottom middle of the same cell, and darkened by `dark` (0 none, 1 blood, 2 the void). */
function shrunk(src: Px, s: number, dark: number): Px {
  const w = Math.max(3, Math.round(DEMO_W * s)), h = Math.max(4, Math.round(DEMO_H * s)), ox = (DEMO_W - w) >> 1, oy = DEMO_H - h;
  const out = new Px(DEMO_W, DEMO_H), ink = px32('ink'), tone = px32(dark > 1 ? 'blood0' : 'blood1');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = src.d[Math.min(DEMO_H - 1, Math.floor((y + 0.5) / s)) * DEMO_W + Math.min(DEMO_W - 1, Math.floor((x + 0.5) / s))] as number;
      if (v) out.d[(oy + y) * DEMO_W + ox + x] = dark && v !== ink ? tone : v;
    }
  }
  return out.outline('ink');
}

const frames = new Map<string, Frame>();
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export interface TwinDraw {
  frame: Frame;
  /** Extra px below the feet to draw it at (a fall). */
  dy: number;
  /** False while falling or climbing: there is no ground to cast a shadow on, and no bar or "!" to hold over it. */
  grounded: boolean;
}

/** What to draw for a twin view. */
export function twinFrame(v: ActorView): TwinDraw {
  const second = v.second === true;
  const spec = demoSpec(v), at = `${spec.view}${spec.flip ? 1 : 0}${second ? 1 : 0}`;
  const base = (s: DemoSpec): Px => (second ? recolored(demoPx(s)) : demoPx(s));
  const k = clamp01(v.k ?? 0);
  if (v.pose === 'fall') {
    const step = Math.min(FALL_STEPS - 1, Math.floor(k * FALL_STEPS)), s = 1 - 0.78 * (step / (FALL_STEPS - 1));
    const dark = step >= 7 ? 2 : step >= 5 ? 1 : 0;
    const key = `tf${at}${step}`;
    return { frame: frameFor(frames, key, shrunk(base({ ...spec, pose: 'air', frame: 0, open: false }), s, dark), v), dy: Math.round(k * FALL_DROP), grounded: false };
  }
  if (v.pose === 'climb') {
    // The sprite sinks `sink` rows below its cell's floor, which cuts it off: three rows of claws at k = 1, all of it at k = 0.
    const step = Math.round(k * CLIMB_STEPS), sink = Math.round((step / CLIMB_STEPS) * (DEMO_H - 4));
    const pose = sink > 10 ? 'air' : 'stand';
    const key = `tc${at}${step}`;
    return { frame: frameFor(frames, key, new Px(DEMO_W, DEMO_H).blit(base({ ...spec, pose, frame: 0, open: false }), 0, sink), v), dy: 0, grounded: step === 0 };
  }
  const key = `tw${at}${spec.pose}${spec.frame}${spec.open ? 1 : 0}`;
  return { frame: frameFor(frames, key, base(spec), v), dy: 0, grounded: true };
}
