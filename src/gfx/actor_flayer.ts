// The Mind Flayer (docs/level-9.md), the owner's pick: Meat Spider (gfx/var/flayer_spider.ts). A spider made of raw meat: a huge red
// abdomen hung across the court's north wall, ridged like a side of beef and studded with blisters and bristles, a small fanged head
// under it, and four tall jointed legs whose knees rise over the body and come down on the floor in claws. The silhouette is the legs:
// sharp angles and wide spread. It is the biggest thing in the game and it fills the wall, so the body is one 212 by 80 frame with its
// feet (the view's x, y) 42 rows down, standing in the stall row, and the legs are drawn from a root (the view's x, y) to a tip (`aim`),
// a tube along a polyline snapped to pixels, so the sim's line is the leg: idle, warn (raised, with its line drawn on the floor from
// the root to the tip), slam (struck down to the tip) and severed (a stump with a raw cut end). The body is idle, rise (coming down
// through the skylight over 40 frames, the legs with it), down (its head on the floor in front of it, a hole where it was) and, once
// it has died, that same picture thinning to nothing. Everything is flat fills and Bayer dither, with the ink outline. Pure pixel work.
import type { ActorView } from '../core/types.ts';
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { KNOB, LIMB, MEAT, along, bayer, claw, cutEnd, dir, knob, rnd, shade, socket, tube } from './actor_flayer_kit.ts';
import type { Pt } from './actor_flayer_kit.ts';
import { Px } from './px.ts';

export const FLAYER_W = 212, FLAYER_H = 80;
/** Where the body's feet are in its frame. */
const AX = 106, AY = 42;
/** Frames the body takes to come in through the skylight (enemies/flayer.ts `riseT`). */
export const FLAYER_RISE = 40;
/** The body hangs 42 px above its feet and 38 below them; a rising one starts this far up, clear of the screen. */
const RISE_FROM = FLAYER_H + 8;
const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- the body
/** The abdomen: shaded meat, ridges curved like a smile across the back with the fat showing between them, blisters, bristles round the rim. */
function abdomen(px: Px, phase: number): void {
  shade(px, 106, 29, 98, 28, MEAT, -0.05);
  for (let k = 0; k < 4; k++) {
    const y0 = 7 + k * 8;
    for (let x = 12; x < 201; x++) {
      const y = Math.round(y0 + 2.4 * Math.sin((x - 106) * 0.018) * (k + 1) * 0.5 + ((x - 106) * (x - 106)) / 4200);
      if (px.get(x, y) && rnd(x, k, 1) > 0.12) { px.set(x, y, 'blood0'); if (px.get(x, y + 1)) px.set(x, y + 1, bayer(x, y) < 0.5 ? 'blood1' : 'blood0'); }
      if (px.get(x, y - 2) && (x + k) % 5 === 0) px.set(x, y - 2, 'pink');
    }
  }
  const blisters: Pt[] = [[44, 36], [68, 20], [86, 41], [124, 38], [142, 20], [166, 36], [58, 47], [156, 48], [30, 32], [106, 14], [180, 40], [96, 30]];
  blisters.forEach(([x, y], i) => { knob(px, [x, y], 3 + (i % 3), KNOB); px.set(x - 1 + ((i + phase) & 1), y - 1, 'white'); });
  for (let x = 12; x < 201; x += 3) {
    const y = Math.round(29 + 28 * Math.sqrt(Math.max(0, 1 - ((x - 106) / 98) ** 2)));
    if (y < 57 && rnd(x, 0, 2) > 0.3) px.line(x, y, x + (x < 106 ? -1 : 1), y + 3 + Math.floor(rnd(x, 1, 2) * 3), 'rose');
  }
}

/**
 * The head: a fanged mouth under the abdomen, four eyes in a row under a heavy brow, bone tusks at the sides and teeth in a black
 * mouth. Down, it lies flat on the floor with its eyes gone grey and its teeth short and the tongue out.
 */
function head(px: Px, x: number, y: number, down: boolean, phase: number): void {
  px.rect(x - 20, y + 3, 3, 9, 'bone').rect(x + 17, y + 3, 3, 9, 'bone');
  shade(px, x, y, 22, 15, ['blood1', 'rose', 'pink']);
  px.rect(x - 12, y - 6, 24, 6, 'blood1');
  const eyes: Pt[] = [[-9, -4], [-3, -6], [3, -6], [9, -4]];
  for (const [ex, ey] of eyes) { shade(px, x + ex, y + ey, 2.5, 2.5, ['ink', 'ink', 'ink']); px.set(x + ex, y + ey, down ? 'grey2' : phase ? 'yellow' : 'amber').set(x + ex + 1, y + ey, down ? 'grey2' : 'yellow'); }
  px.rect(x - 10, y + 5, 20, 6, 'ink');
  for (let k = 0; k < 5; k++) px.rect(x - 9 + k * 4, y + 5, 2, down ? 2 : 4, 'bone');
  px.rect(x - 7, y + 10, 3, down ? 6 : 3, 'bone').rect(x + 4, y + 10, 3, down ? 6 : 3, 'bone');
  if (down) for (let k = 0; k < 4; k++) px.rect(x - 3 + k * 3, y + 12, 1, 3 + k, 'cream');
}

/** The body's frame for a state: idle (two breaths, the head swaying a px), or down with its head on the floor and a hole where it was. */
function bodyPx(state: 'idle' | 'down', phase: number, sway: number): Px {
  const px = new Px(FLAYER_W, FLAYER_H);
  abdomen(px, phase);
  if (state === 'down') {
    socket(px, 106, 46, 14);
    head(px, 106, 62, true, 0);
  } else head(px, 106, 48 + sway, false, phase);
  return px.outline('ink');
}

/** A copy with some of the pixels left out: step 0 to 4 thins it by a fifth a step, on a Bayer dither. */
function thinned(src: Px, step: number): Px {
  const out = new Px(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) if (src.d[i] && bayer(i % src.w, (i / src.w) | 0) >= step * 0.2) out.d[i] = src.d[i] as number;
  return out;
}

const frames = new Map<string, Frame>();
const bases = new Map<string, Px>();
function baseOf(key: string, make: () => Px): Px {
  let p = bases.get(key);
  if (!p) { p = make(); bases.set(key, p); }
  return p;
}

/** Where the body is, and how far it is up in the sky while it rises: the legs hang from the body, so they come down with it. */
let bodyX = 200, bodyDy = 0;

/** Draws the body: the abdomen across the wall and the head under it. Feet at v.x, v.y. */
export function drawFlayer(ctx: Ctx, v: ActorView): void {
  const cx = Math.round(v.x), cy = Math.round(v.y);
  bodyX = cx; bodyDy = 0;
  if (v.pose === 'rise') bodyDy = -Math.round((1 - clamp(v.t / FLAYER_RISE)) ** 2 * RISE_FROM);
  if (v.blink) return;
  const dead = v.anim === 'ko', down = v.pose === 'down' || dead;
  let key = down ? 'down' : `idle${(v.t / 24) & 1}${(v.t / 40) & 1}`;
  let src = baseOf(key, () => (down ? bodyPx('down', 0, 0) : bodyPx('idle', (v.t / 24) & 1, (v.t / 40) & 1)));
  // A dead body flashes white and then thins out in the few frames the sim keeps it.
  let look: Pick<ActorView, 'flash' | 'tint' | 'hidden'> = v;
  if (dead) {
    if (v.t < 5) look = { flash: 1, tint: null };
    else { const step = Math.min(4, ((v.t - 5) / 3) | 0); key = `dead${step}`; src = baseOf(key, () => thinned(baseOf('down', () => bodyPx('down', 0, 0)), step)); look = { flash: 0, tint: null }; }
  }
  ctx.drawImage(frameFor(frames, key, src, look).img, cx - AX, cy - AY + bodyDy);
}

// ---------------------------------------------------------------- the legs
export type LegPose = 'idle' | 'warn' | 'slam' | 'severed';
/** How far down the root, in px, a leg's rest tip lies on the floor (enemies/flayerleg `restLen`). */
const REST = 56;

/**
 * The polyline of a leg from its root at (0, 0) to its tip `a`, root first. Idle and slam go up and out to a high knee and come down on
 * the tip (`side` is -1 for a leg on the left of the body, 1 on the right): the knee stands higher the farther the tip, and a slam keeps it
 * close to the root so the leg is a long stroke down the line. A leg about to slam is raised and cocked up beside the body. A severed one
 * is a short stump hanging toward where its tip was.
 */
export function legPts(pose: LegPose, side: number, a: Pt): Pt[] {
  const d = dir([0, 0], a);
  if (pose === 'severed') return [[0, 0], [Math.round(d[0] * 12 + side * 3), Math.round(d[1] * 12) + 4]];
  if (pose === 'warn') return [[0, 0], [Math.round(d[0] * 14 + side * 26), -26], [Math.round(d[0] * 30 + side * 22), -50]];
  const up = Math.max(0, a[1]);
  const knee: Pt = pose === 'slam' ? [Math.round(a[0] * 0.3 + side * 8), -Math.round(12 + up * 0.04)] : [Math.round(a[0] * 0.55 + side * 14), -Math.round(24 + up * 0.1)];
  return [[0, 0], knee, [Math.round(a[0]), Math.round(a[1])]];
}

interface LegArt { px: Px; ox: number; oy: number }
const legs = new Map<string, LegArt>();

/** One leg painted: a tube of dark flesh with a hip and a knee, bristles along it, a claw at the tip. Origin (ox, oy) is where the frame sits from the root. */
function legArt(pose: LegPose, side: number, a: Pt): LegArt {
  const pts = legPts(pose, side, a);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const ox = Math.floor(Math.min(...xs)) - 9, oy = Math.floor(Math.min(...ys)) - 9;
  const px = new Px(Math.ceil(Math.max(...xs)) - ox + 10, Math.ceil(Math.max(...ys)) - oy + 10);
  const shifted = pts.map((p): Pt => [p[0] - ox, p[1] - oy]);
  if (pose === 'severed') {
    tube(px, shifted, 7, 6, LIMB);
    cutEnd(px, shifted[1] as Pt, 4);
  } else {
    tube(px, shifted, 6, 2, pose === 'warn' ? KNOB : LIMB);
    knob(px, shifted[0] as Pt, 4, KNOB);
    if (shifted.length > 2) knob(px, shifted[1] as Pt, 4, KNOB);
    const path = along(shifted);
    for (let k = 4; k < path.length - 4; k += 7) { const q = path[k] as { x: number; y: number }; px.line(q.x, q.y, q.x + side * 3, q.y - 2, 'rose'); }
    claw(px, shifted, pose === 'warn' ? 9 : 7, pose === 'warn' ? 4 : 3, pose === 'warn' ? 'amber' : 'bone');
  }
  return { px: px.outline('ink'), ox, oy };
}

/** The floor under a leg that is about to slam: a dashed red line from its root to the tip, marching toward it, an X where it lands, and the last frames solid. */
function warnLine(ctx: Ctx, root: Pt, tip: Pt, t: number): void {
  const path = along([root, tip]);
  const soon = t >= 24;
  path.forEach((p, k) => {
    if (p.y < 0) return;
    if ((k + t) % 6 < 4 || (soon && (t >> 1) % 3 === 0)) { const x = Math.round(p.x), y = Math.round(p.y); rect(ctx, x, y, 1, 1, 'hot'); rect(ctx, x + 1, y, 1, 1, 'red'); rect(ctx, x, y + 1, 1, 1, 'red'); }
  });
  const x = Math.round(tip[0]), y = Math.round(tip[1]);
  for (const [dx, dy] of [[-1, -1], [1, 1], [-1, 1], [1, -1]] as Pt[]) for (let i = 1; i <= 4; i++) rect(ctx, x + dx * i, y + dy * i, 1, 1, i > 3 ? 'amber' : 'hot');
  rect(ctx, x, y, 1, 1, 'white');
}

/**
 * Draws a leg. Its root is the view's x, y and its tip is `aim`. A leg that is warned shakes in its last frames and has its line drawn
 * on the floor first; `bar` draws the HP bar a hit leg has over its tip.
 */
export function drawFlayerLeg(ctx: Ctx, v: ActorView, bar: (ctx: Ctx, cx: number, top: number, hp: number, hpMax: number) => void): void {
  if (v.blink) return;
  const rx = Math.round(v.x), ry = Math.round(v.y), tip: Pt = v.aim ? [Math.round(v.aim.x), Math.round(v.aim.y)] : [rx, ry + REST];
  const pose: LegPose = v.anim === 'ko' || v.pose === 'severed' ? 'severed' : v.pose === 'warn' ? 'warn' : v.pose === 'slam' ? 'slam' : 'idle';
  if (pose === 'warn' && bodyDy === 0) warnLine(ctx, [rx, ry], tip, v.t);
  const side = rx < bodyX ? -1 : 1, a: Pt = [tip[0] - rx, tip[1] - ry];
  const key = `${pose}|${side}|${a[0]}|${a[1]}`;
  let art = legs.get(key);
  if (!art) { if (legs.size > 80) { legs.clear(); for (const k of [...frames.keys()]) if (k.startsWith('leg')) frames.delete(k); } art = legArt(pose, side, a); legs.set(key, art); }
  const shake = pose === 'warn' && v.t > 24 ? (v.t >> 1) & 1 : 0;
  const frame = frameFor(frames, `leg${key}`, art.px, v);
  ctx.drawImage(frame.img, rx + art.ox + shake, ry + art.oy + bodyDy);
  if (v.bar && pose !== 'severed' && bodyDy === 0) bar(ctx, tip[0], tip[1] - 14, v.bar.hp, v.bar.hpMax);
}
