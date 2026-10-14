// The vine and the spore pod (stage 2.1): two rooted growths of the Upside Down, in blood reds on a dark mound, each in a
// 16 by 16 cell with its roots on the bottom. The vine coils in a spiral when it waits, rears back while it winds up (the
// "!" is on), lashes toward its facing (a whip drawn live over the sprite, longer than the cell) and withers when it dies.
// The pod swells from a small bulb to a taut one over its 40 frame wind-up, trembling, then bursts into shards (the sim adds
// the spore cloud) and leaves a husk. A hidden one is drawn as a thin ghost (actor_kit.ts). Pure pixel work, so Node can run it.
import type { ActorView } from '../core/types.ts';
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { Px } from './px.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';

export const PLANT = 16;
const K = 'ink', D = 'blood0', M = 'blood1', R = 'red', H = 'hot';
export const WHIP_REACH = 26;

function mound(px: Px): void {
  px.ellipse(8, 14, 5.4, 1.9, D).set(5, 14, K).set(10, 14, K).set(7, 15, K).set(9, 13, K);
  px.line(3, 14, 1, 15, M).line(13, 14, 15, 15, M).set(6, 13, M).set(11, 13, R);
}

// ---------------------------------------------------------------- the vine
export type VinePose = 'coil' | 'rear' | 'lash' | 'hurt' | 'wilt';

/** A thick stalk along a spiral from the mound up to a tip: 2 px of body, a lit edge, thorns, and a bud at the end. */
function stalk(px: Px, lean: number, amp: number, height: number, phase: number, thorn: boolean): void {
  let tx = 8, ty = 13;
  for (let i = 0; i <= height; i++) {
    const y = 13 - i, x = Math.round(8 + lean * (i / height) + Math.sin(i * 0.9 + phase) * amp * Math.min(1, i / 3));
    px.rect(x, y, 3, 1, M).set(x, y, i % 3 === 0 ? H : R).set(x + 2, y, D);
    if (i % 3 === 1) px.set(x + (i & 1 ? 3 : -1), y, thorn ? H : R);
    tx = x; ty = y;
  }
  px.rect(tx - 1, ty - 2, 5, 3, M).rect(tx - 1, ty - 2, 5, 1, R).set(tx, ty - 3, R).set(tx + 1, ty - 3, R).set(tx + 1, ty - 1, H).set(tx + 3, ty - 2, D).set(tx + 4, ty - 3, H);
}

/** One frame of the vine, facing right for the side view. `view` leans it: up is away from the camera, down toward it. */
export function composeVine(view: 'down' | 'up' | 'side', pose: VinePose, f: number): Px {
  const px = new Px(PLANT, PLANT);
  mound(px);
  const side = view === 'side' ? 1 : 0;
  switch (pose) {
    case 'wilt':
      px.line(8, 13, 5, 10, D).line(5, 10, 9, 8, D).line(9, 8, 12, 11, D).line(8, 13, 6, 10, M).set(12, 12, R).set(11, 11, M).set(5, 9, M);
      break;
    case 'hurt': stalk(px, side ? -3 : 0, 1.2, 6, 0, false); break;
    case 'rear': stalk(px, side ? -4 : 0, 1.6, view === 'up' ? 9 : 10, f * 1.2, true); break;
    case 'lash': stalk(px, side ? 3 : 0, 0.6, 6, 0, true); break;
    default: stalk(px, 0, 2.2, view === 'up' ? 8 : 9, f * 1.5, false);
  }
  return px.outline(K);
}

export interface VineSpec { view: 'down' | 'up' | 'side'; flip: boolean; pose: VinePose; frame: number }
export function vineSpec(v: Pick<ActorView, 'dir' | 'anim' | 'alert' | 't'>): VineSpec {
  const view = v.dir === 'down' ? 'down' : v.dir === 'up' ? 'up' : 'side';
  const base = { view, flip: v.dir === 'left' } as const;
  if (v.anim === 'ko') return { ...base, pose: 'wilt', frame: 0 };
  if (v.anim === 'hurt') return { ...base, pose: 'hurt', frame: 0 };
  if (v.anim === 'attack') return v.alert ? { ...base, pose: 'rear', frame: (v.t >> 3) & 1 } : { ...base, pose: 'lash', frame: 0 };
  return { ...base, pose: 'coil', frame: (v.t / 40 | 0) & 1 };
}

const vineFrames = new Map<string, Frame>();
const vinePx = new Map<string, Px>();
export function vineFrame(v: ActorView): Frame {
  const s = vineSpec(v);
  const key = `v${s.view}${s.pose}${s.frame}${s.flip ? 1 : 0}`;
  let p = vinePx.get(key);
  if (!p) {
    p = composeVine(s.view, s.pose, s.frame);
    if (s.flip) { const m = new Px(PLANT, PLANT); m.blit(p, 0, 0, true); p = m; }
    vinePx.set(key, p);
  }
  return frameFor(vineFrames, key, p, v);
}

/** How far through its lash a vine is, in frames (the wind-up is 30), or -1 when it is not lashing. */
export function lashFrame(v: Pick<ActorView, 'anim' | 'alert' | 't' | 'hidden'>): number {
  return v.anim === 'attack' && !v.alert && v.t >= 30 && v.t < 42 ? v.t - 30 : -1;
}

/** The whip, drawn live over a lashing vine: a red rope that shoots out toward its facing, ripples, and snaps back. */
export function drawWhip(ctx: Ctx, v: ActorView): void {
  const k = lashFrame(v);
  if (k < 0) return;
  const out = k < 3 ? k / 3 : k < 7 ? 1 : Math.max(0, 1 - (k - 6) / 5);
  const len = Math.round(WHIP_REACH * out);
  if (len < 3) return;
  const dx = v.dir === 'right' ? 1 : v.dir === 'left' ? -1 : 0, dy = v.dir === 'down' ? 1 : v.dir === 'up' ? -1 : 0;
  const x0 = Math.round(v.x), y0 = Math.round(v.y) - 8 - (dy < 0 ? 1 : 0);
  for (let i = 1; i <= len; i++) {
    const w = Math.round(Math.sin(i * 0.55 + k * 0.9) * 2 * Math.min(1, i / 6));
    const x = x0 + dx * i - dy * w - 1, y = y0 + dy * i + dx * w - 1;
    rect(ctx, x, y, 2, 2, i > len - 3 ? 'hot' : 'blood1');
    rect(ctx, x, y, 1, 1, i % 4 === 0 ? 'hot' : 'red');
    if (i % 5 === 3) rect(ctx, x + (dy ? 2 : 0) + (dx ? 0 : 0), y + (dx ? 2 : 0), 1, 1, 'blood0');
  }
  const tx = x0 + dx * len, ty = y0 + dy * len;
  rect(ctx, tx - 1 - (dx > 0 ? 0 : 1), ty - 1 - (dy > 0 ? 0 : 1), 3, 3, 'hot');
  rect(ctx, tx + dx * 2 - (dy ? 1 : 0), ty + dy * 2 - (dx ? 1 : 0), 1, 1, 'red');
}

// ---------------------------------------------------------------- the pod
/** Swell stages, from the resting bulb (0) to the taut one about to go (7). */
export const POD_STAGES = 8;

/** The pod at a stage of its swell: a ridged bulb on a short stalk with a puckered mouth that gapes as it fills, pustules lighting up. */
export function composePod(stage: number, shake: number): Px {
  const px = new Px(PLANT, PLANT);
  mound(px);
  const s = Math.max(0, Math.min(1, stage / (POD_STAGES - 1)));
  const rx = 3.4 + 2.8 * s, ry = 3.2 + 3.2 * s, cy = 12 - ry + 0.6, cx = 8 + shake;
  px.rect(7, 11, 2, 3, D).line(7, 12, 4, 10, D).line(9, 12, 12, 10, D).set(4, 9, M).set(12, 9, M);
  px.ellipse(cx + 0.6, cy + 0.6, rx, ry, D).ellipse(cx, cy, rx, ry, M);
  px.ellipse(cx - rx * 0.35, cy - ry * 0.35, rx * 0.4, ry * 0.35, R);
  for (const k of [-0.5, 0.5]) for (let y = Math.round(cy - ry + 2); y < Math.round(cy + ry - 1); y++) { const x = Math.round(cx + k * rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))); if (px.get(x, y)) px.set(x, y, D); }
  const n = 1 + Math.round(s * 5);
  for (let i = 0; i < n; i++) px.set(Math.round(cx - rx * 0.6 + ((i * 7) % 5) * (rx * 0.3)), Math.round(cy - ry * 0.2 + ((i * 5) % 4) * (ry * 0.28)), H);
  const mw = 1 + Math.round(s * 2);
  px.rect(Math.round(cx) - mw + 1, Math.round(cy - ry), mw * 2, 1, K).rect(Math.round(cx) - mw + 1, Math.round(cy - ry) + 1, mw * 2 - 1, 1, D);
  return px.outline(K);
}

/** The burst: shards thrown out of the bulb, a husk left behind. `t` is frames since it went. */
export function composeBurst(t: number): Px {
  const px = new Px(PLANT, PLANT);
  mound(px);
  if (t < 8) {
    const r = 3 + t * 0.7;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, x = Math.round(8 + Math.cos(a) * r), y = Math.round(8 + Math.sin(a) * r * 0.9);
      px.rect(x, y, i & 1 ? 2 : 1, i & 1 ? 2 : 1, i % 3 === 0 ? 'pink' : i % 3 === 1 ? R : M);
    }
    px.ellipse(8, 9.4, 3.4 - t * 0.2, 2.6, D).set(8, 9, 'pink').set(7, 8, 'pink').set(10, 9, 'pink');
  } else {
    px.ellipse(8, 12, 4.6, 1.8, D).ellipse(8, 11.7, 3.4, 1.2, M).rect(6, 11, 4, 1, K).set(5, 10, M).set(11, 10, D).set(8, 9, 'pink');
  }
  return px.outline(K);
}

export function podFrame(v: ActorView): Frame {
  let key: string, build: () => Px;
  if (v.anim === 'ko') {
    const stage = v.t < 8 ? v.t : 8;
    key = `pb${stage}`; build = () => composeBurst(stage);
  } else {
    const swell = v.anim === 'attack' && v.alert ? Math.min(POD_STAGES - 1, Math.floor((v.t / 40) * (POD_STAGES - 1)) + 1) : 0;
    const shake = swell >= 5 ? ((v.t >> 2) & 1 ? 1 : -1) * (swell >= 7 ? 1 : 0) : 0;
    key = `p${swell}${shake}`; build = () => composePod(swell, shake);
  }
  let p = vinePx.get(key);
  if (!p) { p = build(); vinePx.set(key, p); }
  return frameFor(vineFrames, key, p, v);
}
