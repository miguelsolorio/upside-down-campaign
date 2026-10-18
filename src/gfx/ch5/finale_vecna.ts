// Vecna in the fast phase of the final boss (stage 5.3, docs/chapter-5.md): 4.4's Vecna, the owner's Rooted pick (var/vecna_scary.ts), faster.
// His body is Rooted's own, pose for pose (idle is stand, walk is walk, the cast is curse, the sink starts from hurt with his arms
// flung up), in a frame 16 px wider and 8 taller than Rooted's so there is room for what is new: a crown of two more tendrils each side,
// taller and wider than Rooted's, behind him; eyes that burn (a white point in the red); a ring of red light on the floor under him that
// beats with the clock; and, in the cast, his clock curse, the face with four chime pips (vecna_kit's curseMark) hung over the raised hand
// with sparks thrown off it. The sink is what happens at 0 HP: over SINK_FRAMES he goes down into the flesh, a row at a time from the feet
// up, the floor rippling round him in rings of blood and the vines pulling at his arms, until only the rings are left. Drawn like
// drawFlayer: drawFinaleVecna(ctx, v), feet at v.x, v.y, the cell's bottom row on the feet line, a dithered shadow baked in.
import type { ActorView } from '../../core/types.ts';
import { frameFor } from '../actor_kit.ts';
import type { Frame } from '../actor_kit.ts';
import type { Ctx } from '../canvas.ts';
import { Px } from '../px.ts';
import { POSES, TOP, curseMark, seg } from '../var/vecna_kit.ts';
import type { Pt, VPose } from '../var/vecna_kit.ts';
import { VECNA_SCARY } from '../var/vecna_scary.ts';

export type VecnaFast = 'idle' | 'walk' | 'cast' | 'sink';
/** The cell: Rooted's 36 by 62 with 8 px of room on every side but the bottom, whose last row is the feet line. */
export const FAST_W = 52, FAST_H = 70;
const OX = 8, OY = 8;
/** Frames the sink takes (enemies/vecna `sinkT`). */
export const SINK_FRAMES = 64;
/** Rooted's feet are on row 49 + TOP of its frame. */
const FEET = 49 + TOP + OY;

const rooted = VECNA_SCARY.find((o) => o.slug === 'rooted') as (typeof VECNA_SCARY)[number];
const POSE: Record<VecnaFast, VPose> = { idle: 'stand', walk: 'walk', cast: 'curse', sink: 'hurt' };
const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

/** Where a pose's shoulders are, in Rooted's frame: the tendrils grow from them (Rooted's hunch moves them 1 px in and up). */
const SHOULDER: [Pt, Pt] = [[12, 20 + TOP], [24, 20 + TOP]];

/** The extra tendrils, drawn behind him: two a side that rise higher and spread wider than Rooted's, each out of step, looping every 8 frames like his own. */
function crown(px: Px, phase: number): void {
  for (let k = 0; k < 2; k++) {
    for (const s of [-1, 1]) {
      const [sx, sy] = SHOULDER[s < 0 ? 0 : 1], o = 6 + k * 4, tall = 20 + k * 4, a = ((phase % 8) / 8) * Math.PI * 2 + k * 2.1 + (s > 0 ? 1.6 : 0);
      const sway = (amp: number, lag: number): number => Math.round(Math.sin(a - lag) * amp);
      const pts: Pt[] = [[sx - s * 2 + OX, sy + 2 + OY], [sx + s * (3 + o) + OX + sway(1, 0), sy - 2 - k * 2 + OY], [sx + s * (6 + o) + OX + sway(2, 0.6), sy - tall + OY], [sx + s * (4 + o) + OX + sway(3, 1.2), sy - tall - 6 + OY]];
      for (let i = 0; i + 1 < pts.length; i++) seg(px, pts[i] as Pt, pts[i + 1] as Pt, i === 0 ? 2 : 1, 'blood1', null);
      const tip = pts[3] as Pt;
      px.set(tip[0], tip[1], 'red');
    }
  }
}

/** The ring of red light on the floor under his feet, a flat ellipse of dither that is brighter on the beat of the clock. */
function halo(px: Px, phase: number): void {
  const cx = OX + 18, cy = FEET - 1, beat = phase % 4 === 0;
  px.ellipse(cx, cy, 15, 3.2, 'ink');
  for (let y = cy - 3; y <= cy + 3; y++) {
    for (let x = cx - 16; x <= cx + 16; x++) {
      const a = (x + 0.5 - cx) / 15, b = (y + 0.5 - cy) / 3.2, r = a * a + b * b;
      if (r > 0.55 && r < 1.1 && ((x + y) & 1) === 0) px.set(x, y, r > 0.85 && beat ? 'red' : 'blood1');
    }
  }
}

/** The eyes burn: a white point in each red one, with a hot pixel beside it in the socket. Rooted's head sits 2 px lower than its rig's, in a frame TOP rows lower still. */
function eyes(px: Px, pose: VecnaFast): void {
  const [hx, hy] = POSES[POSE[pose]].head, x = Math.round(hx) + OX, y = Math.round(hy) + 2 + TOP + OY;
  px.set(x - 3, y, 'hot').set(x - 2, y, 'white').set(x + 1, y, 'white').set(x + 2, y, 'hot');
}

/** The curse: his clock over the raised hand, and sparks thrown off it. */
function curse(px: Px, phase: number): void {
  const hx = 31 + OX, hy = 9 + TOP + OY;
  px.blit(curseMark('red', 'bone', 1 + ((phase >> 1) & 1), 'hot'), hx - 6, hy - 22);
  for (const [dx, dy] of [[-4, -4], [4, -6], [6, 0], [-5, 2]] as Pt[]) {
    const k = (phase + dx) % 3;
    px.set(hx + dx + (k === 0 ? 1 : 0), hy + dy - (k === 1 ? 1 : 0), k === 2 ? 'pink' : 'hot');
  }
}

const bases = new Map<string, Px>();
const frames = new Map<string, Frame>();

/** One frame, drawn into a cell of FAST_W by FAST_H. phase counts the tendrils' writhe (8 to a loop) and the clock's beat. k is how far the sink has gone, 0 to 1. */
export function vecnaFastPx(pose: VecnaFast, phase = 0, k = 0): Px {
  const out = new Px(FAST_W, FAST_H), fig = new Px(FAST_W, FAST_H), back = new Px(FAST_W, FAST_H);
  crown(back, phase);
  fig.blit(back.outline('ink'), 0, 0).blit(rooted.draw(POSE[pose], phase), OX, OY);
  if (pose === 'sink') return sunk(out, fig, k, phase);
  halo(out, phase);
  out.blit(fig, 0, 0);
  eyes(out, pose);
  if (pose === 'cast') curse(out, phase);
  return out;
}

/** The sink: the figure drops through the floor line, a row at a time from the feet, ripples of blood spread over the place, and vines reach up for his hands. */
function sunk(out: Px, fig: Px, k: number, phase: number): Px {
  const depth = Math.round(k * 56), floor = FEET;
  const cut = new Px(FAST_W, FAST_H);
  cut.blit(fig, 0, depth);
  for (let y = floor + 1; y < FAST_H; y++) for (let x = 0; x < FAST_W; x++) cut.d[y * FAST_W + x] = 0;
  out.blit(cut, 0, 0);
  // Rings in the flesh round the place he goes in, wider and fainter as he goes.
  const cx = OX + 18, rings = 1 + Math.round(k * 3);
  for (let i = 0; i < rings; i++) {
    const rx = 6 + i * 4 + Math.round(((phase + i * 3) % 6) * 0.5), ry = Math.max(1, Math.round(rx * 0.24));
    for (let a = 0; a < 48; a++) {
      const t = (a / 48) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * rx), y = Math.round(floor - 1 + Math.sin(t) * ry);
      if (y <= floor + 2) out.set(x, y, i === 0 ? 'red' : a & 1 ? 'blood1' : 'blood0');
    }
  }
  out.ellipse(cx, floor - 1, Math.max(2, 7 - k * 3), 1.6, 'ink');
  // Vines coming up out of the flesh round him, pulling.
  const reach = Math.round(10 * (1 - Math.abs(k - 0.5) * 2));
  for (const s of [-1, 1]) {
    const x0 = cx + s * 6;
    for (let i = 0; i < reach; i++) out.set(x0 + Math.round(Math.sin(i * 0.7 + phase) * 1) - s * Math.floor(i / 4), floor - 1 - i, i % 3 === 2 ? 'red' : 'blood1');
  }
  return out.outline('ink');
}

/** The pose a view asks for: the clock curse in the cast, the sink once he is down, a walk when he moves, else idle. */
export function fastPoseOf(v: Pick<ActorView, 'anim' | 'pose'>): VecnaFast {
  if (v.anim === 'ko' || v.pose === 'down') return 'sink';
  if (v.anim === 'cast' || v.pose === 'warn') return 'cast';
  return v.anim === 'walk' ? 'walk' : 'idle';
}

/** Draws Vecna in the fast phase, feet at v.x, v.y. */
export function drawFinaleVecna(ctx: Ctx, v: ActorView): void {
  if (v.blink) return;
  const pose = fastPoseOf(v), phase = (v.t >> 3) & 7, k = pose === 'sink' ? Math.round(clamp(v.t / SINK_FRAMES) * 16) / 16 : 0;
  const key = pose === 'sink' ? `sink${k}${phase & 3}` : `${pose}${phase}`;
  let src = bases.get(key);
  if (!src) { src = vecnaFastPx(pose, pose === 'sink' ? phase & 3 : phase, k); bases.set(key, src); }
  const f = frameFor(frames, key, src, v);
  ctx.drawImage(f.img, Math.round(v.x) - (FAST_W >> 1), Math.round(v.y) - FAST_H + 1);
}

