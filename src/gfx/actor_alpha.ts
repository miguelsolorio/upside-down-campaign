// The Demodog Alpha (stage 2.3 boss), the owner's pick: Stalker. A small body held high on eight stilt legs and a long neck, in cold
// blue chitin, ending in the demodog's head: a shut bud, or a flower of bone petals round a black mouth. A 32 by 24 cell with its
// feet on the bottom, four colors and the ink outline. Poses follow what the sim sends (enemies/alpha.ts): stand and walk, the
// wind-up under the "!" (anim attack with alert: the body drops and the head draws back, shaking), the bite (anim attack, the head
// thrown forward), the lunge (anim dash: stretched flat), crouch and leap (the pounce), howl, stun, hurt and ko. A side rig (right
// flips for left) and a front rig (down and up). Pure pixel work, so Node can run it; canvases are built on first use.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { STALKER, bloom, bud, limb, lump, spikes, stilt } from './actor_alpha_kit.ts';
import type { Pt } from './actor_alpha_kit.ts';
import { Px } from './px.ts';

export const ALPHA_W = 32, ALPHA_H = 24;
export type AlphaPose = 'stand' | 'stepA' | 'stepB' | 'windup' | 'bite' | 'lunge' | 'crouch' | 'air' | 'howl' | 'stun' | 'hurt' | 'lying';
type Leg = readonly [Pt, Pt, Pt];
const C = STALKER;

// ---------------------------------------------------------------- side rig, facing right
/** Eight legs: the four far ones (in the shade) first, then the four near ones. */
type Legs = readonly [Leg, Leg, Leg, Leg, Leg, Leg, Leg, Leg];
const STAND: Legs = [
  [[11, 12], [5, 8], [1, 22]], [[13, 12], [9, 7], [9, 22]], [[17, 12], [22, 7], [21, 22]], [[19, 12], [26, 8], [29, 21]],
  [[12, 12], [6, 7], [3, 22]], [[15, 11], [10, 6], [10, 21]], [[18, 11], [23, 6], [24, 22]], [[20, 12], [27, 7], [30, 22]],
];
const HOWL: Legs = [
  [[11, 12], [4, 9], [3, 22]], [[13, 12], [8, 8], [8, 22]], [[17, 12], [23, 8], [23, 22]], [[19, 12], [28, 9], [29, 22]],
  [[12, 12], [5, 8], [5, 22]], [[15, 11], [10, 7], [11, 22]], [[18, 11], [24, 7], [25, 22]], [[20, 12], [29, 8], [30, 22]],
];
const LEAP: Legs = [
  [[11, 12], [6, 15], [0, 17]], [[13, 12], [9, 17], [5, 22]], [[17, 12], [22, 16], [28, 19]], [[19, 12], [25, 14], [31, 14]],
  [[12, 12], [7, 13], [1, 14]], [[15, 11], [10, 15], [5, 19]], [[18, 11], [23, 14], [29, 16]], [[20, 12], [26, 11], [31, 10]],
];
/** Folded for the pounce: the knees stand above a body that sits low. */
const CROUCH: Legs = [
  [[11, 18], [4, 12], [1, 22]], [[13, 18], [8, 11], [8, 22]], [[17, 18], [23, 11], [23, 22]], [[19, 18], [27, 12], [30, 22]],
  [[12, 18], [5, 11], [3, 22]], [[15, 17], [10, 10], [11, 22]], [[18, 17], [24, 10], [25, 22]], [[20, 18], [28, 11], [31, 22]],
];
/** Streaked out flat for the lunge: the back legs trail along the floor, the front ones reach. */
const LUNGE: Legs = [
  [[11, 14], [5, 14], [0, 19]], [[13, 14], [8, 16], [3, 22]], [[17, 14], [23, 14], [29, 18]], [[19, 14], [27, 13], [31, 17]],
  [[12, 14], [6, 12], [0, 15]], [[15, 13], [10, 15], [6, 20]], [[18, 13], [24, 12], [30, 14]], [[20, 14], [28, 12], [31, 12]],
];
/** Splayed and sagging for the daze. */
const STUN: Legs = [
  [[11, 17], [3, 14], [0, 22]], [[13, 17], [7, 13], [5, 22]], [[17, 17], [24, 13], [26, 22]], [[19, 17], [29, 14], [31, 22]],
  [[12, 17], [4, 12], [2, 21]], [[15, 16], [9, 11], [8, 22]], [[18, 16], [22, 11], [22, 22]], [[20, 17], [28, 12], [30, 21]],
];
/** On its side, the legs curled up in the air. */
const LYING: Legs = [
  [[8, 20], [3, 16], [1, 11]], [[11, 20], [8, 15], [7, 9]], [[15, 20], [19, 15], [21, 10]], [[17, 20], [23, 16], [26, 12]],
  [[9, 20], [5, 15], [3, 8]], [[12, 20], [10, 14], [10, 7]], [[16, 20], [18, 14], [18, 8]], [[18, 20], [24, 15], [28, 9]],
];

/** A walking gait: the legs in even places lift and reach, the others plant and push back, then they swap. */
function gait(base: Legs, phase: number): Legs {
  return base.map((l, i) => {
    const up = (i + phase) % 2 === 0;
    const [h, k, f] = l;
    return [h, [k[0] + (up ? 1 : 0), k[1] - (up ? 1 : 0)], [f[0] + (up ? 2 : -1), f[1] - (up ? 2 : 0)]];
  }) as unknown as Legs;
}

interface Side {
  legs: Legs;
  /** Body height: the two lumps sit on this row. */
  by: number;
  /** The neck's three points, from the shoulders to the head. */
  neck: [Pt, Pt, Pt];
  head: Pt;
  /** A flower of this reach, or a bud when 0. */
  open: number;
  tilt: number;
}
const rigs = (pose: AlphaPose, f: number): Side => {
  const wob = f ? 1 : 0;
  switch (pose) {
    case 'stepA': return { legs: gait(STAND, 0), by: 11, neck: [[21, 9], [24, 6], [25, 6]], head: [27, 4], open: 0, tilt: -0.2 };
    case 'stepB': return { legs: gait(STAND, 1), by: 11, neck: [[21, 9], [24, 6], [25, 6]], head: [27, 4], open: 0, tilt: -0.2 };
    case 'windup': return { legs: CROUCH, by: 15 + wob, neck: [[20, 13 + wob], [22, 8 + wob], [22, 7 + wob]], head: [22, 4 + wob], open: 3.2, tilt: -1.3 };
    case 'bite': return { legs: STAND, by: 12, neck: [[21, 10], [24, 10], [25, 12]], head: [26, 12], open: 3.9, tilt: 0 };
    case 'lunge': return { legs: LUNGE, by: 14, neck: [[21, 12], [23, 12], [24, 13]], head: [25, 13], open: 3.7, tilt: 0 };
    case 'crouch': return { legs: CROUCH, by: 17, neck: [[21, 15], [24, 14], [26, 15]], head: [28, 15], open: 0, tilt: 0 };
    case 'air': return { legs: LEAP, by: 11, neck: [[21, 9], [24, 6], [25, 10]], head: [26, 8], open: 3.7, tilt: 0 };
    case 'howl': return { legs: HOWL, by: 11, neck: [[21, 9], [22, 6], [22, 10]], head: [24, 8.5], open: 4.1, tilt: -1.2 };
    case 'stun': return { legs: STUN, by: 16, neck: [[21, 14], [24, 16], [26, 18 + wob]], head: [27, 20 + wob], open: 0, tilt: 0.5 };
    case 'hurt': return { legs: STAND, by: 12, neck: [[21, 10], [22, 8], [22, 8]], head: [23, 6], open: 3.4, tilt: -1.4 };
    default: return { legs: STAND, by: 11 + wob, neck: [[21, 9 + wob], [24, 6 + wob], [25, 6 + wob]], head: [27, 4 + wob], open: 0, tilt: -0.2 };
  }
};

function composeSide(pose: AlphaPose, f: number): Px {
  const px = new Px(ALPHA_W, ALPHA_H);
  if (pose === 'lying') return composeLying();
  const r = rigs(pose, f), by = r.by;
  for (let i = 0; i < 4; i++) stilt(px, ...(r.legs[i] as Leg), C, true);
  for (let i = 4; i < 8; i++) stilt(px, ...(r.legs[i] as Leg), C, false);
  lump(px, 14, by, 5.2, 3.4, C); lump(px, 19.5, by - 0.5, 3.6, 3, C);
  spikes(px, [10, by - 3], [20, by - 3], 5, C, 2);
  limb(px, r.neck, C.G, 2, C.D);
  const [hx, hy] = r.head;
  if (r.open) bloom(px, hx, hy, r.open, 6, pose === 'bite' || pose === 'lunge' ? 0.7 : 0.8, r.tilt, C);
  else bud(px, hx + 1, hy, r.tilt, 3.6, 2.4, C);
  return px.outline('ink');
}

function composeLying(): Px {
  const px = new Px(ALPHA_W, ALPHA_H);
  for (let i = 0; i < 4; i++) stilt(px, ...(LYING[i] as Leg), C, true);
  lump(px, 12, 20, 5.4, 2.6, C); lump(px, 17.5, 20, 3.6, 2.4, C);
  for (let i = 4; i < 8; i++) stilt(px, ...(LYING[i] as Leg), C, false);
  limb(px, [[19, 20], [23, 21], [24, 21]], C.G, 2, C.D);
  bloom(px, 26, 20.5, 3.1, 6, 0.8, 0.3, C);
  return px.outline('ink');
}

// ---------------------------------------------------------------- front and back
/** Foot, knee and hip offsets from the center column for the four legs on a side, outermost first. */
const SPLAY = [[14, 12, 5], [11, 8, 4], [8, 7, 3], [5, 5, 3]] as const;

interface Front { by: number; sag: number; lift: number; kneeUp: number; open: number; head: number; sx: number }

function frontRig(pose: AlphaPose, f: number): Front {
  switch (pose) {
    case 'stepA': return { by: 11, sag: 0, lift: 1, kneeUp: 0, open: 0, head: 5, sx: 1 };
    case 'stepB': return { by: 11, sag: 0, lift: 2, kneeUp: 0, open: 0, head: 5, sx: 1 };
    case 'windup': return { by: 15 + (f ? 1 : 0), sag: 2, lift: 0, kneeUp: 3, open: 3, head: 9, sx: 1 };
    case 'bite': return { by: 13, sag: 0, lift: 0, kneeUp: 0, open: 4.2, head: 7, sx: 1 };
    case 'lunge': return { by: 14, sag: 3, lift: 0, kneeUp: 2, open: 4, head: 9, sx: 1 };
    case 'crouch': return { by: 17, sag: 3, lift: 0, kneeUp: 4, open: 0, head: 12, sx: 1 };
    case 'air': return { by: 10, sag: 0, lift: 3, kneeUp: -2, open: 4, head: 5, sx: 1 };
    case 'howl': return { by: 11, sag: 1, lift: 0, kneeUp: 0, open: 4.4, head: 3, sx: 1 };
    case 'stun': return { by: 16, sag: 3, lift: 0, kneeUp: 2, open: 0, head: 15 + (f ? 1 : 0), sx: 1 };
    case 'hurt': return { by: 12, sag: 0, lift: 0, kneeUp: 0, open: 3.6, head: 3, sx: 1 };
    default: return { by: 11 + (f ? 1 : 0), sag: 0, lift: 0, kneeUp: 0, open: 0, head: 5 + (f ? 1 : 0), sx: 1 };
  }
}

function composeFront(view: 'down' | 'up', pose: AlphaPose, f: number): Px {
  const px = new Px(ALPHA_W, ALPHA_H);
  const r = frontRig(pose, f), cx = 16, by = r.by;
  const legs = (side: -1 | 1, far: boolean): void => {
    SPLAY.forEach(([foot, knee, hip], k) => {
      const odd = (k + (pose === 'stepB' ? 1 : 0)) % 2 === 1;
      const up = r.lift && (odd !== (side === 1)) ? r.lift : 0;
      const fx = cx + side * (foot + (r.sag ? Math.round(r.sag / 2) : 0)), fy = 22 - up;
      const ky = Math.max(3, 6 + (k & 1) * 2 + r.kneeUp + (r.sag ? r.sag : 0) - (up ? 1 : 0));
      stilt(px, [cx + side * hip, by + 1 - (k & 1)], [cx + side * knee, ky], [fx, fy], C, far);
    });
  };
  legs(-1, true); legs(1, true);
  legs(-1, false); legs(1, false);
  lump(px, cx, by, 6.2, 3.8, C);
  if (view === 'up') {
    spikes(px, [cx - 5, by - 3], [cx + 5, by - 3], 5, C, 1);
    for (let y = by - 3; y < by + 3; y += 2) px.set(cx, y, C.B);
    // The neck rises behind the body and the head peeks over it.
    limb(px, [[cx, by - 2], [cx + 1, by - 5], [cx, r.head + 2]], C.G, 2, C.D);
    if (r.open) bloom(px, cx, r.head, r.open, 6, 1, 0, C); else bud(px, cx, r.head + 1, -1.5, 3, 2.6, C);
    return px.outline('ink');
  }
  spikes(px, [cx - 5, by - 3], [cx + 5, by - 3], 5, C, 1);
  limb(px, [[cx, by - 1], [cx, by - 4], [cx, r.head + 3]], C.G, 2, C.D);
  if (r.open) bloom(px, cx, r.head + 1, r.open, 6, 1, 0, C); else bud(px, cx, r.head + 1, -1.5, 3, 3.2, C);
  return px.outline('ink');
}

// ---------------------------------------------------------------- choosing the frame
export interface AlphaSpec { view: 'down' | 'up' | 'side'; flip: boolean; pose: AlphaPose; frame: number }

/** What the sheet and the game draw for a view: the pose, its frame and the facing. */
export function alphaSpec(v: Pick<ActorView, 'dir' | 'anim' | 'pose' | 't' | 'z' | 'alert'>): AlphaSpec {
  const view = v.dir === 'down' ? 'down' : v.dir === 'up' ? 'up' : 'side';
  const base = { view, flip: v.dir === 'left' } as const;
  switch (v.pose) {
    case 'crouch': return { ...base, pose: 'crouch', frame: (v.t >> 2) & 1 };
    case 'leap': return { ...base, pose: 'air', frame: 0 };
    case 'howl': return { ...base, pose: 'howl', frame: 0 };
    case 'stun': return { ...base, pose: 'stun', frame: (v.t >> 4) & 1 };
    default: break;
  }
  if (v.anim === 'ko') return { ...base, pose: 'lying', frame: 0 };
  if (v.anim === 'hurt') return { ...base, pose: 'hurt', frame: 0 };
  if (v.anim === 'dash') return { ...base, pose: 'lunge', frame: 0 };
  if (v.anim === 'attack') return { ...base, pose: v.alert ? 'windup' : 'bite', frame: (v.t >> 2) & 1 };
  if (v.anim === 'walk') return { ...base, pose: (['stepA', 'stand', 'stepB', 'stand'] as const)[(v.t / 7 | 0) & 3] as AlphaPose, frame: 0 };
  return { ...base, pose: 'stand', frame: (v.t / 30 | 0) & 1 };
}

const pxCache = new Map<string, Px>();
const keyOf = (s: AlphaSpec): string => `${s.view}${s.pose}${s.frame}${s.flip ? 1 : 0}`;

/** The pixels of a spec (a left facing one is the right facing one flipped). Built once. */
export function alphaPx(s: AlphaSpec): Px {
  const key = keyOf(s);
  let p = pxCache.get(key);
  if (!p) {
    p = s.view === 'side' ? composeSide(s.pose, s.frame) : composeFront(s.view, s.pose, s.frame);
    if (s.flip) { const m = new Px(ALPHA_W, ALPHA_H); m.blit(p, 0, 0, true); p = m; }
    pxCache.set(key, p);
  }
  return p;
}

const frames = new Map<string, Frame>();
/** The canvas for what a view shows now: normal, a white flash, or a dithered tint. */
export function alphaFrame(v: ActorView): Frame {
  const s = alphaSpec(v);
  return frameFor(frames, keyOf(s), alphaPx(s), v);
}
