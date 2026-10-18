// Joyce with her axe, who steps in at the end of the final boss and finishes it (docs/chapter-5.md, "The Final Roll"). She is the game's own
// Joyce (data/adultchars.ts): the adult body, the purple cardigan, the brown hair, in a 16 by 16 hero cell, so she walks and stands like
// every other hero. JOYCE_AXE is her CharSpec with the axe on her front hand at rest, carried up beside her shoulder, so the hero sheets and
// drawActor can take her as they are. The swing needs more room than a hero's cell has, so joycePx draws her in a cell of 32 by 28 with
// the body at its middle and the axe done by hand: idle and walk (the axe carried), raise (both hands up, the axe cocked back), swing
// (the chop, the head biting at the end of a long handle) and follow (the axe through and low, a pale smear trailing it). Every pose is
// drawn for the three views, and a left is the right mirrored. Drawn like drawFlayer: drawJoyce(ctx, v), feet at v.x, v.y.
import type { ActorView } from '../../core/types.ts';
import { composeFrame, POSES } from '../actor_pose.ts';
import { frameFor } from '../actor_kit.ts';
import type { Frame } from '../actor_kit.ts';
import { px32 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { JOYCE } from '../data/adultchars.ts';
import { KID } from '../data/kid.ts';
import type { CharSpec, Held, Stamp, View } from '../data/types.ts';
import { Px } from '../px.ts';

export type JoycePose = 'idle' | 'walk' | 'raise' | 'swing' | 'follow';
export const JOYCE_W = 32, JOYCE_H = 28;
/** Where her 16 by 16 body sits in the cell: centered, with its feet row (14) 2 rows above the bottom. */
const BX = 8, BY = 12;

// ---------------------------------------------------------------- the spec
const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const same = (st: Stamp[]): Held => ({ down: st, up: st, side: st });
/** The axe at rest, on the front hand: a handle of g up to a head, G steel with an x shaded cap and a white edge. */
const REST = [at(['gxG.', 'gGGw', 'gGGw', 'gxG.', 'g...', 'g...', 'g...', 'g...'], 0, -8)];

/** Joyce as a hero spec, the axe at her side at rest and in her hand through the walk. The swing and the cast hold nothing: joycePx draws the axe for those. */
export const JOYCE_AXE: CharSpec = {
  ...JOYCE,
  pal: { ...JOYCE.pal, g: 'soil3', G: 'grey3', w: 'white', x: 'grey2' },
  held: same(REST),
  heldBy: { windup: same([]), strike: same([]), raise: same([]), thrust: same([]) },
};

// ---------------------------------------------------------------- the axe
type Pt = readonly [number, number];
/** Where the axe's tip is from the front hand in each swing pose and view, and which side of the handle the blade faces (1 or -1). */
const AXE: Record<View, Record<'raise' | 'swing' | 'follow', { tip: Pt; face: 1 | -1 }>> = {
  down: { raise: { tip: [6, -12], face: -1 }, swing: { tip: [-3, 3], face: 1 }, follow: { tip: [-8, 4], face: 1 } },
  up: { raise: { tip: [5, -11], face: -1 }, swing: { tip: [-2, -11], face: 1 }, follow: { tip: [-9, -3], face: 1 } },
  side: { raise: { tip: [-7, -10], face: 1 }, swing: { tip: [11, 3], face: -1 }, follow: { tip: [10, 4], face: -1 } },
};

/** The front hand's place in the body cell: the body's table, moved as composeFrame moves it. */
function handOf(view: View, arm: 'raise' | 'strike', anim: 'cast' | 'attack', f: number): Pt {
  const hand = KID.arms[view][arm][1] as [number, number], pose = POSES[anim][f] as (typeof POSES)['idle'][number];
  return [hand[0] + (view === 'side' ? pose.lean : 0), hand[1] + pose.bob + (view === 'down' ? pose.leanV : 0)];
}

/** The axe from a hand to a tip: a handle two px wide (wood and its shade), a head of steel at the end, bitten out into a blade on one side. */
function axe(px: Px, hand: Pt, tip: Pt, face: 1 | -1): void {
  const dx = tip[0] - hand[0], dy = tip[1] - hand[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy * face, ny = ux * face;
  const put = (x: number, y: number, c: Parameters<Px['set']>[2]): void => { px.set(Math.round(x), Math.round(y), c); };
  for (let i = 0; i <= len - 3; i += 0.5) { put(hand[0] + ux * i, hand[1] + uy * i, 'soil3'); put(hand[0] + ux * i - nx * 0.9, hand[1] + uy * i - ny * 0.9, 'soil2'); }
  for (let i = 0; i < 5; i++) {
    const along = len - 1 - i, spread = i === 0 || i === 4 ? 2 : i === 2 ? 4 : 3;
    for (let j = -1; j <= spread; j++) {
      const c = j === spread ? 'white' : j === spread - 1 ? 'bone' : j < 0 ? 'grey2' : 'grey3';
      put(hand[0] + ux * along + nx * j, hand[1] + uy * along + ny * j, c);
    }
  }
}

/** A pale smear along the arc the tip travelled, from one tip to the next, thinning as it trails: cream near the head, then bone, then mist. */
function smear(px: Px, hand: Pt, from: Pt, to: Pt): void {
  const a0 = Math.atan2(from[1], from[0]), a1 = Math.atan2(to[1], to[0]);
  let d = a1 - a0;
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  const r0 = Math.hypot(from[0], from[1]), r1 = Math.hypot(to[0], to[1]), n = Math.max(10, Math.round(Math.abs(d) * 14));
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + d * t, r = r0 + (r1 - r0) * t, x = Math.round(hand[0] + Math.cos(a) * r), y = Math.round(hand[1] + Math.sin(a) * r);
    if (t > 0.85) continue;
    if (t > 0.55 || (i & 1) === 0) px.set(x, y, t > 0.55 ? 'cream' : t > 0.3 ? 'bone' : 'mist');
  }
}

// ---------------------------------------------------------------- the frames
/** The body's role buffer painted with her palette. */
function bodyPx(view: View, anim: 'idle' | 'walk' | 'cast' | 'attack', f: number): Px {
  const buf = composeFrame(JOYCE_AXE, view, anim, f), out = new Px(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = buf[y * 16 + x] as number;
      if (!v) continue;
      const name = v === 107 ? 'ink' : JOYCE_AXE.pal[String.fromCharCode(v)];
      if (name) out.d[y * 16 + x] = px32(name);
    }
  }
  return out;
}

const cache = new Map<string, Px>();

/** One frame of Joyce in a cell of JOYCE_W by JOYCE_H, facing a direction (left is right mirrored), feet on the bottom. f picks the walk's frame (0 to 3). */
export function joycePx(pose: JoycePose, dir: 'down' | 'up' | 'left' | 'right' = 'down', f = 0): Px {
  const key = `${pose}${dir}${f & 3}`, hit = cache.get(key);
  if (hit) return hit;
  const view: View = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side', out = new Px(JOYCE_W, JOYCE_H);
  if (pose === 'idle' || pose === 'walk') {
    out.blit(bodyPx(view, pose, pose === 'walk' ? f & 3 : f & 1), BX, BY);
  } else {
    const raised = pose === 'raise', anim = raised ? 'cast' : 'attack', frame = raised ? 0 : 1;
    out.blit(bodyPx(view, anim, frame), BX, BY + (pose === 'follow' ? 1 : 0));
    const [hx, hy] = raised ? handOf(view, 'raise', 'cast', 0) : handOf(view, 'strike', 'attack', 1);
    const hand: Pt = [hx + BX, hy + BY + (pose === 'follow' ? 1 : 0)];
    const layer = new Px(JOYCE_W, JOYCE_H), a = AXE[view];
    const rel = (p: Pt): Pt => [hand[0] + p[0], hand[1] + p[1]];
    if (pose === 'swing') smear(layer, hand, a.raise.tip, a.swing.tip);
    if (pose === 'follow') smear(layer, hand, a.swing.tip, a.follow.tip);
    axe(layer, hand, rel(a[pose].tip), a[pose].face);
    out.blit(layer.outline('ink'), 0, 0);
  }
  const done = dir === 'left' ? mirror(out) : out;
  cache.set(key, done);
  return done;
}

function mirror(p: Px): Px {
  const m = new Px(p.w, p.h);
  m.blit(p, 0, 0, true);
  return m;
}

const frames = new Map<string, Frame>();

/** The pose a view asks for: the chop in an attack (raised, then down, then through), a walk when she moves, else idle. */
export function joycePoseOf(v: Pick<ActorView, 'anim' | 't'>): JoycePose {
  if (v.anim === 'attack') return v.t < 8 ? 'raise' : v.t < 14 ? 'swing' : 'follow';
  return v.anim === 'walk' ? 'walk' : 'idle';
}

/** Draws Joyce, feet at v.x, v.y. */
export function drawJoyce(ctx: Ctx, v: ActorView): void {
  if (v.blink) return;
  const pose = joycePoseOf(v), f = pose === 'walk' ? (v.t / 7) | 0 : (v.t / 30) | 0, dir = v.dir;
  const key = `${pose}${dir}${f & 3}`;
  ctx.drawImage(frameFor(frames, key, joycePx(pose, dir, f), v).img, Math.round(v.x) - (JOYCE_W >> 1), Math.round(v.y) - JOYCE_H);
}
