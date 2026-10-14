// The Demogorgon (stage 1.3 boss): a tall pale thing, about 24 wide and 32 tall, in a 32 by 38 cell with its feet at
// the bottom center. Drawn by hand in code from a skeleton: a rig of joints per pose, limbs stroked between them, a
// torso filled between two widths, claws and toes, and the head from actor_demo_head.ts. Five colors only. Poses: stand,
// walk, windup and strike (the swipe), hurt, charge, stun, spit, crouch and air (the leap) and lying (pinned and dead),
// each with the petals shut or open, in a front rig (down and up) and a side rig (right, flipped for left). Pure pixel
// work, so Node can run it; the canvases are built on first use.
import type { ActorView } from '../core/types.ts';
import { canvasFromPixels, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { B, D, G, K, headFor } from './actor_demo_head.ts';
import type { HeadView } from './actor_demo_head.ts';
import { transposed } from './tile_lab.ts';

/** The cell is 32 by 38: the creature is drawn PAD rows down from its top, so a raised hand or a flower is not clipped. */
export const DEMO_W = 32, DEMO_H = 38;
const PAD = 2;
type Pt = readonly [number, number];
type Tri = readonly [Pt, Pt, Pt];
/** The joints of one pose: where the head sits, how far it lolls, the torso (top, bottom, half widths), two arms and two legs. */
interface Rig { neck: Pt; tilt: number; torso: readonly [Pt, Pt, number, number]; armA: Tri; armB: Tri; legA: Tri; legB: Tri }
export type PoseName = 'stand' | 'stepA' | 'stepB' | 'windup' | 'strike' | 'hurt' | 'charge' | 'stun' | 'spit' | 'crouch' | 'air' | 'lying';
type View = 'front' | 'side';

const rig = (base: Rig, over: Partial<Rig>): Rig => ({ ...base, ...over });
const shiftTri = (t: Tri, dx: number, dy: number): Tri => [[t[0][0] + dx, t[0][1] + dy], [t[1][0] + dx, t[1][1] + dy], [t[2][0] + dx, t[2][1] + dy]];
/** The same pose moved: the side rig is drawn with the hips on the cell's center line, so a flip does not make it jump. */
const moved = (r: Rig, dx: number, dy = 0): Rig => ({
  neck: [r.neck[0] + dx, r.neck[1] + dy], tilt: r.tilt, torso: [[r.torso[0][0] + dx, r.torso[0][1] + dy], [r.torso[1][0] + dx, r.torso[1][1] + dy], r.torso[2], r.torso[3]],
  armA: shiftTri(r.armA, dx, dy), armB: shiftTri(r.armB, dx, dy), legA: shiftTri(r.legA, dx, dy), legB: shiftTri(r.legB, dx, dy),
});
/** One px of breath: the head and the shoulders sit a pixel lower. */
const bob = (r: Rig): Rig => rig(r, {
  neck: [r.neck[0], r.neck[1] + 1], torso: [[r.torso[0][0], r.torso[0][1] + 1], r.torso[1], r.torso[2], r.torso[3]],
  armA: [[r.armA[0][0], r.armA[0][1] + 1], r.armA[1], r.armA[2]], armB: [[r.armB[0][0], r.armB[0][1] + 1], r.armB[1], r.armB[2]],
});

// ---------------------------------------------------------------- the rigs
const F_STAND: Rig = {
  neck: [16, 13], tilt: 0, torso: [[16, 14], [16, 24], 4.5, 2.8],
  armA: [[12, 15], [8, 21], [7, 28]], armB: [[20, 15], [24, 21], [25, 28]],
  legA: [[14, 24], [13, 29], [12, 34]], legB: [[18, 24], [19, 29], [20, 34]],
};
const S_STAND: Rig = {
  neck: [19, 13], tilt: 0, torso: [[17, 14], [14, 24], 3.2, 2.6],
  armA: [[17, 15], [19, 21], [22, 27]], armB: [[16, 15], [15, 21], [17, 28]],
  legA: [[14, 24], [12, 29], [11, 34]], legB: [[14, 24], [16, 29], [17, 34]],
};
const WIDE_F = { legA: [[14, 24], [12, 29], [10, 34]], legB: [[18, 24], [20, 29], [22, 34]] } as const;
const WIDE_S = { legA: [[14, 24], [11, 29], [9, 34]], legB: [[14, 24], [17, 29], [19, 34]] } as const;

/** Front rig (the camera sees the creature from the front or the back: the joints are the same). */
function frontRig(pose: PoseName, f: number): Rig {
  const b = F_STAND;
  switch (pose) {
    case 'stepA': return rig(b, { legA: [[14, 24], [13, 28], [13, 32]], armA: [[12, 15], [8, 20], [7, 26]], armB: [[20, 15], [24, 21], [25, 29]] });
    case 'stepB': return rig(b, { legB: [[18, 24], [19, 28], [19, 32]], armB: [[20, 15], [24, 20], [25, 26]], armA: [[12, 15], [8, 21], [7, 29]] });
    case 'windup': return rig(b, { ...WIDE_F, neck: [16, 12], armA: [[12, 15], [6, 11], [5, 3]], armB: [[20, 15], [26, 11], [27, 3]] });
    case 'strike': return rig(b, { ...WIDE_F, neck: [16, 15], torso: [[16, 16], [16, 25], 4.5, 2.8], armA: [[12, 17], [11, 24], [14, 31]], armB: [[20, 17], [21, 24], [18, 31]] });
    case 'hurt': return rig(b, { neck: [16, 12], armA: [[12, 15], [5, 15], [1, 20]], armB: [[20, 15], [27, 15], [31, 20]] });
    case 'charge': return rig(b, {
      neck: [16, 16], torso: [[16, 17], [16, 25], 4.8, 2.8], armA: [[12, 18], [6, 21], [3, 27]], armB: [[20, 18], [26, 21], [29, 27]],
      legA: f ? [[14, 25], [10, 29], [9, 32]] : [[14, 25], [10, 30], [8, 34]], legB: f ? [[18, 25], [22, 30], [24, 34]] : [[18, 25], [22, 29], [23, 32]],
    });
    case 'stun': return rig(b, {
      neck: [16, 15], tilt: f ? 4 : -4, torso: [[16, 16], [16, 25], 4.2, 2.8], armA: [[12, 17], [9, 23], [10, 30]], armB: [[20, 17], [23, 23], [22, 30]],
      legA: [[14, 25], [11, 29], [12, 34]], legB: [[18, 25], [21, 29], [20, 34]],
    });
    case 'spit': return rig(b, { ...WIDE_F, neck: [16, 12], armA: [[12, 15], [6, 17], [2, 14]], armB: [[20, 15], [26, 17], [30, 14]] });
    case 'crouch': return rig(b, {
      neck: [16, 19], torso: [[16, 20], [16, 29], 4.8, 3], armA: [[12, 21], [7, 27], [8, 32]], armB: [[20, 21], [25, 27], [24, 32]],
      legA: [[14, 29], [9, 30], [11, 34]], legB: [[18, 29], [23, 30], [21, 34]],
    });
    case 'air': return rig(b, {
      neck: [16, 12], torso: [[16, 14], [16, 23], 4.5, 2.8], armA: [[12, 15], [7, 9], [6, 2]], armB: [[20, 15], [25, 9], [26, 2]],
      legA: [[14, 23], [12, 28], [13, 32]], legB: [[18, 23], [20, 28], [19, 32]],
    });
    default: return f ? bob(b) : b;
  }
}

/** Side rig, facing right. A is the far arm and leg, B the near ones. */
function sideRig(pose: PoseName, f: number): Rig { return moved(sideRaw(pose, f), 2); }
function sideRaw(pose: PoseName, f: number): Rig {
  const b = S_STAND;
  switch (pose) {
    case 'stepA': return rig(b, { legB: [[14, 24], [17, 29], [20, 34]], legA: [[14, 24], [11, 29], [8, 33]], armB: [[16, 15], [13, 21], [10, 26]], armA: [[17, 15], [20, 21], [23, 26]] });
    case 'stepB': return rig(b, { legB: [[14, 24], [11, 29], [8, 33]], legA: [[14, 24], [17, 29], [20, 34]], armB: [[16, 15], [19, 21], [22, 26]], armA: [[17, 15], [14, 21], [11, 26]] });
    case 'windup': return rig(b, { ...WIDE_S, neck: [18, 12], armB: [[16, 15], [12, 9], [13, 2]], armA: [[17, 15], [15, 9], [17, 2]] });
    case 'strike': return rig(b, { ...WIDE_S, neck: [21, 14], torso: [[19, 16], [14, 24], 3.2, 2.6], armB: [[17, 17], [23, 19], [29, 23]], armA: [[18, 17], [24, 20], [30, 25]] });
    case 'hurt': return rig(b, { neck: [16, 12], torso: [[15, 14], [14, 24], 3.2, 2.6], armB: [[14, 15], [9, 13], [6, 18]], armA: [[15, 15], [10, 17], [7, 23]], legA: [[14, 24], [11, 29], [8, 33]] });
    case 'charge': return rig(b, {
      neck: [23, 15], torso: [[20, 17], [13, 25], 3.4, 2.8], armB: [[19, 18], [14, 20], [8, 19]], armA: [[20, 18], [15, 22], [10, 23]],
      legB: f ? [[13, 25], [10, 29], [6, 33]] : [[13, 25], [19, 29], [23, 33]], legA: f ? [[13, 25], [19, 29], [23, 34]] : [[13, 25], [9, 29], [5, 34]],
    });
    case 'stun': return rig(b, {
      neck: [22, 17], tilt: f ? 4 : -4, torso: [[19, 16], [14, 25], 3.4, 2.8], armB: [[18, 18], [19, 24], [20, 31]], armA: [[19, 18], [21, 24], [23, 30]],
      legA: [[14, 25], [11, 29], [12, 34]], legB: [[14, 25], [17, 29], [16, 34]],
    });
    case 'spit': return rig(b, { ...WIDE_S, neck: [16, 12], torso: [[15, 14], [14, 24], 3.2, 2.6], armB: [[15, 15], [10, 17], [6, 15]], armA: [[16, 15], [11, 19], [7, 19]] });
    case 'crouch': return rig(b, {
      neck: [22, 19], torso: [[19, 21], [13, 29], 3.6, 3], armB: [[18, 22], [13, 26], [9, 30]], armA: [[19, 22], [14, 27], [10, 31]],
      legB: [[13, 29], [18, 29], [16, 34]], legA: [[13, 29], [10, 31], [10, 34]],
    });
    case 'air': return rig(b, {
      neck: [23, 15], torso: [[20, 17], [12, 25], 3.3, 2.7], armB: [[19, 18], [25, 18], [30, 20]], armA: [[20, 18], [26, 20], [31, 23]],
      legB: [[12, 25], [7, 27], [2, 29]], legA: [[12, 25], [8, 30], [3, 32]],
    });
    default: return f ? bob(b) : b;
  }
}

// ---------------------------------------------------------------- strokes
/** A limb stroke from a to b, w px wide, with a shade line on its right or underside. */
function seg(px: Px, a: Pt, b: Pt, w: number, body: ColorName, shade: ColorName | null): void {
  const flat = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  for (let k = 0; k < w; k++) px.line(a[0] + (flat ? 0 : k), a[1] + (flat ? k : 0), b[0] + (flat ? 0 : k), b[1] + (flat ? k : 0), body);
  if (shade) px.line(a[0] + (flat ? 0 : w), a[1] + (flat ? w : 0), b[0] + (flat ? 0 : w), b[1] + (flat ? w : 0), shade);
}

function limb(px: Px, t: Tri, w0: number, w1: number, far: boolean): void {
  const body: ColorName = far ? D : G, shade: ColorName | null = far ? null : D;
  seg(px, t[0], t[1], w0, body, shade);
  seg(px, t[1], t[2], w1, body, shade);
  px.rect(t[1][0], t[1][1], w1 + 1, w1 + 1, body);
  if (!far && w0 > 1) px.set(t[0][0], t[0][1] + 1, B).set(t[0][0], t[0][1] + 2, B);
}

/** Three bone claws fanned out from a hand, along the line of the forearm. */
function claws(px: Px, hand: Pt, from: Pt): void {
  const dx = hand[0] - from[0], dy = hand[1] - from[1], n = Math.hypot(dx, dy) || 1;
  const ux = dx / n, uy = dy / n;
  for (const a of [-0.6, 0, 0.6]) {
    const c = Math.cos(a), s = Math.sin(a), vx = ux * c - uy * s, vy = ux * s + uy * c;
    px.line(hand[0] + 0.5, hand[1] + 0.5, hand[0] + 0.5 + vx * 3.4, hand[1] + 0.5 + vy * 3.4, B);
  }
  px.set(hand[0], hand[1], G);
}

/** A foot with bone toes: flat for the front rig, pointing right for the side rig. */
function foot(px: Px, p: Pt, side: boolean, far: boolean): void {
  if (side) px.rect(p[0] - 1, p[1], 5, 1, far ? D : G).set(p[0] + 3, p[1], B).set(p[0] + 4, p[1], B);
  else px.rect(p[0] - 2, p[1], 4, 1, far ? D : G).set(p[0] - 3, p[1], B).set(p[0] + 2, p[1], B);
}

/** The torso: a tapering band between two centers, lit on its left edge, shaded on its right, with ribs or a spine. */
function torso(px: Px, t: Rig['torso'], view: HeadView, side: boolean): void {
  const [a, b, wa, wb] = t, rows = Math.max(1, b[1] - a[1]);
  for (let y = a[1]; y <= b[1]; y++) {
    const u = (y - a[1]) / rows, cx = a[0] + (b[0] - a[0]) * u, hw = wa + (wb - wa) * u;
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw) - 1;
    px.rect(x0, y, x1 - x0 + 1, 1, G).set(x1, y, D);
    if (!side) px.set(x0, y, B);
    if (view === 'front' && y > a[1] + 1 && (y - a[1]) % 2 === 1 && y < b[1] - 3) px.set(Math.round(cx) - 2, y, D).set(Math.round(cx) - 1, y, D).set(Math.round(cx) + 1, y, D).set(Math.round(cx) + 2, y, D);
    if (view === 'back' && (y - a[1]) % 2 === 0) px.set(Math.round(cx), y, B).set(Math.round(cx), y + 1, D);
    if (side && y > a[1] + 1 && (y - a[1]) % 2 === 1 && y < b[1] - 3) px.set(x1 - 1, y, D).set(x1 - 2, y, D);
  }
}

// ---------------------------------------------------------------- composing
/** One frame: the creature in a pose, facing view (right for side), with its petals shut or open. */
export function composeDemo(view: 'down' | 'up' | 'side', pose: PoseName, f: number, open: boolean): Px {
  const px = new Px(DEMO_W, DEMO_H);
  if (pose === 'lying') return px.blit(lying(new Px(DEMO_W, DEMO_H - PAD), open, f), 0, PAD);
  const side = view === 'side';
  const r = moved(side ? sideRig(pose, f) : frontRig(pose, f), 0, PAD);
  const hv: HeadView = side ? 'side' : view === 'up' ? 'back' : 'front';
  const tv: HeadView = view === 'up' ? 'back' : 'front';
  const legW = side ? 2 : 2;
  const legs = (t: Tri, far: boolean): void => { limb(px, t, legW, 1, far); foot(px, t[2], side, far); };
  const arm = (t: Tri, far: boolean): void => { limb(px, t, 1, 1, far); claws(px, t[2], t[1]); };
  if (side) { arm(r.armA, true); legs(r.legA, true); } else { legs(r.legA, false); legs(r.legB, false); }
  torso(px, r.torso, tv, side);
  px.rect(r.neck[0] - 1, r.neck[1] - 2, 2, 4, G).set(r.neck[0] - 1, r.neck[1] - 1, B);
  if (side) { legs(r.legB, false); arm(r.armB, false); } else { arm(r.armA, false); arm(r.armB, false); }
  head(px, hv, open, r.neck, r.tilt);
  return px.outline(K);
}

/** Blits the head with its neck point on `neck`, sheared sideways by `tilt` px at the crown so it lolls. */
function head(px: Px, view: HeadView, open: boolean, neck: Pt, tilt: number): void {
  const h = headFor(view, open);
  for (let y = 0; y < h.px.h; y++) {
    const dx = Math.round((tilt * (h.ay - y)) / h.ay);
    for (let x = 0; x < h.px.w; x++) {
      const v = h.px.d[y * h.px.w + x] as number;
      if (v) px.set(neck[0] - h.ax + x + dx, neck[1] - h.ay + y, v);
    }
  }
}

/** The head squashed to a fraction of its height by dropping rows, for a flower that faces the sky from a camera at an angle. */
function squashed(src: Px, k: number): Px {
  const h = Math.round(src.h * k), out = new Px(src.w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < src.w; x++) out.d[y * src.w + x] = src.d[Math.min(src.h - 1, Math.round((y + 0.5) / k - 0.5)) * src.w + x] as number;
  return out;
}

/** Flat on its back, head to the left, the flower facing the sky. Frame 1 lifts a hand and bends a knee. */
function lying(px: Px, open: boolean, f: number): Px {
  limb(px, [[22, 32], f ? [26, 29] : [26, 33], f ? [29, 32] : [30, 34]], 2, 1, false);
  foot(px, f ? [29, 32] : [30, 34], true, false);
  limb(px, [[22, 33], [26, 34], [30, 34]], 1, 1, true);
  px.rect(12, 30, 11, 5, G).rect(12, 34, 11, 1, D).rect(12, 30, 11, 1, B);
  for (let x = 15; x < 22; x += 2) px.set(x, 32, D).set(x, 33, D);
  const arm: Tri = f ? [[15, 30], [19, 26], [22, 23]] : [[15, 30], [17, 25], [18, 21]];
  limb(px, arm, 1, 1, false);
  claws(px, arm[2], arm[1]);
  limb(px, [[16, 33], [20, 34], [24, 34]], 1, 1, true);
  if (open) {
    const h = headFor('front', true), sq = squashed(h.px, 0.66);
    px.blit(sq, 9 - h.ax + 2, 22 - 1);
  } else {
    const t = transposed(headFor('front', false).px);
    px.blit(t, 0, 21);
  }
  return px.outline(K);
}

// ---------------------------------------------------------------- choosing the frame
/** What the sheet and the game draw for a view: the pose, its frame, and the facing. */
export interface DemoSpec { view: 'down' | 'up' | 'side'; flip: boolean; pose: PoseName; frame: number; open: boolean }

export function demoSpec(v: Pick<ActorView, 'dir' | 'anim' | 'pose' | 'petals' | 't' | 'z' | 'alert'>): DemoSpec {
  const view = v.dir === 'down' ? 'down' : v.dir === 'up' ? 'up' : 'side';
  const open = v.petals === true;
  const base = { view, flip: v.dir === 'left', open } as const;
  switch (v.pose) {
    case 'charge': return { ...base, pose: 'charge', frame: (v.t >> 3) & 1 };
    case 'stun': return { ...base, pose: 'stun', frame: (v.t >> 4) & 1 };
    case 'spit': return { ...base, pose: 'spit', frame: 0 };
    case 'leap': return { ...base, pose: v.z > 0 ? 'air' : 'crouch', frame: 0 };
    case 'pinned': return { ...base, pose: 'lying', frame: (v.t >> 5) & 1 };
    default: break;
  }
  if (v.anim === 'ko') return { ...base, pose: 'lying', frame: 0 };
  if (v.anim === 'hurt') return { ...base, pose: 'hurt', frame: 0 };
  if (v.alert) return { ...base, pose: 'windup', frame: 0 };
  if (v.anim === 'attack') return { ...base, pose: 'strike', frame: 0 };
  if (v.anim === 'walk') return { ...base, pose: (['stepA', 'stand', 'stepB', 'stand'] as const)[(v.t / 7 | 0) & 3] as PoseName, frame: 0 };
  return { ...base, pose: 'stand', frame: (v.t / 30 | 0) & 1 };
}

const pxCache = new Map<string, Px>();
/** The pixels of a spec (a left facing one is the right facing one flipped). Built once. */
export function demoPx(s: DemoSpec): Px {
  const key = `${s.view}${s.pose}${s.frame}${s.open ? 1 : 0}${s.flip ? 1 : 0}`;
  let p = pxCache.get(key);
  if (!p) {
    const raw = composeDemo(s.view, s.pose, s.frame, s.open);
    p = new Px(DEMO_W, DEMO_H);
    p.blit(raw, 0, 0);
    if (s.flip) { const m = new Px(DEMO_W, DEMO_H); m.blit(p, 0, 0, true); p = m; }
    pxCache.set(key, p);
  }
  return p;
}

/** The first row with a pixel in it: where the HP bar and the "!" go. */
export function topRow(p: Px): number {
  for (let i = 0; i < p.d.length; i++) if (p.d[i]) return (i / p.w) | 0;
  return p.h;
}

export interface DemoFrame { img: HTMLCanvasElement; top: number }
const canvasCache = new Map<string, DemoFrame>();

/** The canvas for what a view shows now: normal, a white flash, or a dithered tint. */
export function demoFrame(v: ActorView): DemoFrame {
  const s = demoSpec(v);
  const tint: ColorName | null = v.flash > 0.25 && v.flash <= 0.6 ? 'white' : v.tint;
  const mode = v.flash > 0.6 ? 'w' : tint ?? 'n';
  const key = `${s.view}${s.pose}${s.frame}${s.open ? 1 : 0}${s.flip ? 1 : 0}${mode}`;
  let c = canvasCache.get(key);
  if (!c) {
    const src = demoPx(s);
    const out = new Px(DEMO_W, DEMO_H);
    const white = px32('white'), tc = tint && mode !== 'w' ? px32(tint) : 0, ink = px32('ink');
    for (let i = 0; i < out.d.length; i++) {
      const d = src.d[i] as number;
      if (!d) continue;
      const x = i % DEMO_W, y = (i / DEMO_W) | 0;
      out.d[i] = mode === 'w' ? white : tc && d !== ink && ((x + y) & 1) === 0 ? tc : d;
    }
    c = { img: canvasFromPixels(out.d, DEMO_W, DEMO_H), top: topRow(src) };
    canvasCache.set(key, c);
  }
  return c;
}
