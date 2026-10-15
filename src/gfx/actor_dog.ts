// The young demodog (stage 2.1): a low, long, dog-like thing on four thin legs, pale grey like the Demogorgon and drawn in
// the same five colors, with a faceless bud of a head until it lunges. Then the head opens into a small flower of red petals
// round a black mouth. A 24 by 20 cell with its feet on the bottom. Side, front and back rigs (right flips for left).
// Poses follow what the sim sends: walk and idle, the wind-up under the "!" (anim attack with alert: a crouch that shakes),
// the lunge (anim dash: stretched flat, mouth open), hurt, and ko (on its side). Pure pixel work, so Node can run it.
import type { ActorView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { blob } from './actor_demo_head.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';

export const DOG_W = 24, DOG_H = 20;
const K = 'ink', D = 'grey2', G = 'grey3', B = 'bone', R = 'red';
type Pt = readonly [number, number];
export type DogPose = 'stand' | 'stepA' | 'stepB' | 'crouch' | 'lunge' | 'hurt' | 'lying';
type View = 'down' | 'up' | 'side';

/** One leg: a thin line hip to knee to foot, a bone toe at the foot. Far legs are shaded. */
function leg(px: Px, hip: Pt, knee: Pt, foot: Pt, far: boolean): void {
  const c: ColorName = far ? D : G;
  px.line(hip[0], hip[1], knee[0], knee[1], c).line(knee[0], knee[1], foot[0], foot[1], c);
  px.set(foot[0] + (far ? 0 : 1), foot[1], B);
  if (!far) px.set(hip[0] + 1, hip[1], D);
}

/** Bone spikes along a ridge from a to b. */
function spikes(px: Px, a: Pt, b: Pt, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
    px.set(x, y - 1, B);
  }
}

/** The shut head: a small smooth bud with one seam, lit on the left. */
function bud(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  px.ellipse(cx + 0.4, cy + 0.4, rx, ry, D).ellipse(cx, cy, rx, ry, G);
  px.set(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.4), B);
  px.set(Math.round(cx + rx * 0.4), Math.round(cy + ry * 0.3), D);
}

/** The open head: five small petals, red inside, round a black mouth with a bone tooth. sx squeezes it for the side view. */
function flower(px: Px, cx: number, cy: number, sx: number, size: number): void {
  const angles = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180);
  for (const a of angles) {
    const dx = Math.cos(a) * sx, dy = Math.sin(a), ang = Math.atan2(dy, dx), len = Math.hypot(dx, dy);
    const px0 = cx + (dx / len) * size * 0.95 * len, py0 = cy + (dy / len) * size * 0.95 * len;
    blob(px, px0 + 0.4, py0 + 0.4, ang, size * 0.78, size * 0.42, D);
    blob(px, px0, py0, ang, size * 0.78, size * 0.42, G);
    blob(px, px0, py0, ang, size * 0.5, size * 0.22, R);
  }
  px.ellipse(cx, cy, size * 0.45 * (0.55 + 0.45 * sx), size * 0.45, K);
  px.set(Math.round(cx - 1 + sx), Math.round(cy - 1), B);
}

// ---------------------------------------------------------------- the rigs
/** Side rig, facing right: haunch, chest, a neck rising to the head, four legs (n near, f far) and a tail. */
interface Side { haunch: Pt; chest: Pt; head: Pt; fN: [Pt, Pt, Pt]; fF: [Pt, Pt, Pt]; hN: [Pt, Pt, Pt]; hF: [Pt, Pt, Pt]; tail: [Pt, Pt] }
const SIDE_STAND: Side = {
  haunch: [6.5, 9.5], chest: [14.5, 9.5], head: [20.5, 7.5], tail: [[3, 8], [0, 4]],
  fN: [[15, 12], [16, 15], [16, 18]], fF: [[13, 12], [13, 15], [13, 18]], hN: [[6, 12], [4, 15], [5, 18]], hF: [[8, 12], [8, 15], [9, 18]],
};

function sideRig(pose: DogPose, f: number): Side {
  const b = SIDE_STAND;
  switch (pose) {
    case 'stepA': return { ...b, fN: [[15, 12], [18, 15], [19, 18]], fF: [[13, 12], [12, 15], [11, 17]], hN: [[6, 12], [3, 15], [2, 18]], hF: [[8, 12], [9, 15], [10, 18]] };
    case 'stepB': return { ...b, fN: [[15, 12], [13, 15], [12, 17]], fF: [[13, 12], [15, 15], [17, 18]], hN: [[6, 12], [8, 15], [9, 17]], hF: [[8, 12], [6, 15], [5, 18]] };
    case 'crouch': {
      const s = f ? 1 : 0;
      return { haunch: [7 + s, 12], chest: [14 + s, 13], head: [20 + s, 14], tail: [[4 + s, 10], [1, 6]],
        fN: [[15 + s, 14], [18, 16], [18, 18]], fF: [[13 + s, 14], [15, 16], [15, 18]], hN: [[6 + s, 14], [3, 16], [5, 18]], hF: [[8 + s, 14], [8, 17], [9, 18]] };
    }
    case 'lunge': return { haunch: [6, 9], chest: [14, 8.5], head: [20, 7], tail: [[2, 8], [0, 6]],
      fN: [[15, 10], [19, 11], [23, 13]], fF: [[13, 10], [17, 12], [21, 15]], hN: [[5, 11], [2, 13], [0, 15]], hF: [[7, 11], [4, 14], [2, 17]] };
    case 'hurt': return { ...b, haunch: [5.5, 9.5], chest: [13.5, 8.5], head: [18, 5], tail: [[2, 8], [0, 3]], fN: [[14, 12], [15, 15], [14, 18]], hN: [[5, 12], [2, 15], [3, 18]] };
    default: return f ? { ...b, chest: [14.5, 10], head: [20.5, 8.5] } : b;
  }
}

function composeSide(pose: DogPose, f: number, open: boolean): Px {
  const px = new Px(DOG_W, DOG_H);
  const r = sideRig(pose, f);
  px.line(r.tail[0][0], r.tail[0][1], r.tail[1][0], r.tail[1][1], D).line(r.tail[0][0], r.tail[0][1] - 1, r.tail[1][0] + 1, r.tail[1][1], G);
  leg(px, r.hF[0], r.hF[1], r.hF[2], true); leg(px, r.fF[0], r.fF[1], r.fF[2], true);
  const [hx, hy] = r.haunch, [cx, cy] = r.chest;
  px.ellipse(hx + 0.5, hy + 0.5, 4.2, 3.6, D).ellipse((hx + cx) / 2, (hy + cy) / 2 + 0.5, 5, 2.4, D);
  px.ellipse(hx, hy, 4.2, 3.6, G).ellipse((hx + cx) / 2, (hy + cy) / 2, 5, 2.4, G).ellipse(cx, cy, 4.2, 4, G);
  px.ellipse(cx - 1.4, cy - 1.4, 1.8, 1.6, B).ellipse(hx - 1, hy - 1, 1.4, 1.2, B);
  px.rect(Math.round(hx - 2), Math.round(hy + 3), Math.round(cx - hx + 3), 1, D);
  spikes(px, [hx - 1, hy - 3], [cx + 1, cy - 3], 5);
  leg(px, r.hN[0], r.hN[1], r.hN[2], false); leg(px, r.fN[0], r.fN[1], r.fN[2], false);
  px.line(cx + 2, cy - 2, r.head[0] - 1, r.head[1] + 1, G).line(cx + 2, cy - 1, r.head[0] - 1, r.head[1] + 2, D);
  if (open) flower(px, r.head[0] + 1, r.head[1], 0.7, 4.6);
  else { blob(px, r.head[0] + 0.5, r.head[1] + 0.5, -0.3, 3.8, 2.6, D); blob(px, r.head[0], r.head[1], -0.3, 3.8, 2.6, G); px.set(Math.round(r.head[0] - 1), Math.round(r.head[1] - 1), B); }
  if (pose === 'crouch' && f && !open) px.set(Math.round(r.head[0] + 3), Math.round(r.head[1]), R);
  return px.outline(K);
}

// ---------------------------------------------------------------- front and back
function composeFront(view: 'down' | 'up', pose: DogPose, f: number, open: boolean): Px {
  const px = new Px(DOG_W, DOG_H);
  const back = view === 'up';
  const low = pose === 'crouch' ? 3 : 0, cx = 12 + (pose === 'crouch' && f ? 1 : 0);
  const step = pose === 'stepA' ? 1 : pose === 'stepB' ? -1 : 0, lunge = pose === 'lunge';
  px.ellipse(cx, 6 + low, 6.8, 3.4, D);
  spikes(px, [cx - 5, 4 + low], [cx + 5, 4 + low], 5);
  const legs = (side: number, lift: number): void => {
    const sp = low ? 2 : 0;
    leg(px, [cx + side * 3.5, 11 + low], [cx + side * (6 + sp), 14 + low - lift], [cx + side * (6 + sp + (lunge ? 1 : 0)), 18 - lift], false);
  };
  legs(-1, step > 0 ? 2 : 0); legs(1, step < 0 ? 2 : 0);
  if (back) {
    px.ellipse(cx, 10 + low, 5, 4.4, G).ellipse(cx - 1.6, 8.5 + low, 1.8, 1.5, B);
    for (let y = 5 + low; y < 14 + low; y += 2) px.set(cx, y, B).set(cx, y + 1, D);
    px.line(cx, 14 + low, cx + 2, 16, D).line(cx + 2, 16, cx + 4, 14, D);
    return px.outline(K);
  }
  px.ellipse(cx, 9.5 + low, 5.4, 3.6, G).ellipse(cx - 2, 8 + low, 1.8, 1.4, B).rect(cx - 4, 12 + low, 9, 1, D);
  const hy = 12 + low + (pose === 'hurt' ? -2 : 0) - (lunge ? 2 : 0);
  if (open) flower(px, cx, hy - (lunge ? 1 : 0), 1, lunge ? 5.4 : 4.6);
  else { bud(px, cx, hy, 2.7, 3.3); px.rect(cx - 2, hy + 2, 5, 1, D); if (pose === 'crouch' && f) px.set(cx, hy + 1, R); }
  return px.outline(K);
}

// ---------------------------------------------------------------- lying
/** On its side: legs stiff in the air, the head thrown back with the mouth open, a limp tail. */
function composeLying(): Px {
  const px = new Px(DOG_W, DOG_H);
  px.line(3, 15, 0, 17, D);
  px.ellipse(11.5, 14.6, 8, 3.6, D).ellipse(11, 14, 8, 3.4, G).ellipse(10, 12.6, 3, 1.2, B);
  spikes(px, [6, 12], [14, 12], 4);
  for (const [x0, x1, y1] of [[7, 4, 7], [10, 9, 6], [14, 15, 6], [17, 19, 8]] as [number, number, number][]) { px.line(x0, 12, x1, y1, G); px.set(x1, y1 - 1, B); }
  flower(px, 20, 13, 0.8, 3.8);
  return px.outline(K);
}

// ---------------------------------------------------------------- choosing the frame
export interface DogSpec { view: View; flip: boolean; pose: DogPose; frame: number; open: boolean }

export function dogSpec(v: Pick<ActorView, 'dir' | 'anim' | 'alert' | 't'>): DogSpec {
  const view: View = v.dir === 'down' ? 'down' : v.dir === 'up' ? 'up' : 'side';
  const base = { view, flip: v.dir === 'left' } as const;
  if (v.anim === 'ko') return { ...base, pose: 'lying', frame: 0, open: true };
  if (v.anim === 'dash') return { ...base, pose: 'lunge', frame: 0, open: true };
  if (v.anim === 'hurt') return { ...base, pose: 'hurt', frame: 0, open: false };
  if (v.anim === 'attack') return { ...base, pose: 'crouch', frame: (v.t >> 2) & 1, open: false };
  if (v.anim === 'walk') return { ...base, pose: (['stepA', 'stand', 'stepB', 'stand'] as const)[(v.t / 6 | 0) & 3] as DogPose, frame: 0, open: false };
  return { ...base, pose: 'stand', frame: (v.t / 30 | 0) & 1, open: false };
}

const pxCache = new Map<string, Px>();
/** The pixels of a spec (a left facing one is the right facing one flipped). Built once. */
export function dogPx(s: DogSpec): Px {
  const key = `${s.view}${s.pose}${s.frame}${s.open ? 1 : 0}${s.flip ? 1 : 0}`;
  let p = pxCache.get(key);
  if (!p) {
    p = s.pose === 'lying' ? composeLying() : s.view === 'side' ? composeSide(s.pose, s.frame, s.open) : composeFront(s.view, s.pose, s.frame, s.open);
    if (s.flip) { const m = new Px(DOG_W, DOG_H); m.blit(p, 0, 0, true); p = m; }
    pxCache.set(key, p);
  }
  return p;
}

/** For composing outside the cache: the same frame with its petals shut or open. */
export function composeDog(view: View, pose: DogPose, f: number, open: boolean): Px {
  return pose === 'lying' ? composeLying() : view === 'side' ? composeSide(pose, f, open) : composeFront(view, pose, f, open);
}

const frames = new Map<string, Frame>();
/** The canvas for what a view shows now. */
export function dogFrame(v: ActorView): Frame {
  const s = dogSpec(v);
  return frameFor(frames, `${s.view}${s.pose}${s.frame}${s.flip ? 1 : 0}`, dogPx(s), v);
}
