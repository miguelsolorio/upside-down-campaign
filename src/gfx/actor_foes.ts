// The riot guard and the warden: composes their role buffers (one char code per pixel, 0 = empty) from the ASCII parts
// in data/guard.ts, then adds the arms, the baton and the big clear riot shield. The shield is held toward the facing, in
// front of the body (behind it when the guard faces away), or lowered to the side when the sim says the guard is not
// guarding. Pure: no DOM. actors.ts turns the buffers into canvases, flipping right to make left.
import type { AnimId } from '../core/types.ts';
import type { LegPose, Part, View } from './data/types.ts';
import { blitRows } from './canvas.ts';
import { GUARD_ART, WARDEN_ART } from './data/guard.ts';
import type { FoeArt } from './data/guard.ts';

type ArmPose = 'rest' | 'windup' | 'strike' | 'hurt';
interface FoePose { legs: LegPose; arm: ArmPose; bob: number; lean: number; push: number }
const FP = (legs: LegPose, arm: ArmPose, bob = 0, lean = 0, push = 0): FoePose => ({ legs, arm, bob, lean, push });

/** Frames per anim, in the same order and count as the paper dolls (actor_pose.ts), so one atlas layout serves every actor. */
export const FOE_POSES: Record<AnimId, FoePose[]> = {
  idle: [FP('stand', 'rest'), FP('stand', 'rest', 1)],
  walk: [FP('stepA', 'rest', 1), FP('stand', 'rest'), FP('stepB', 'rest', 1), FP('stand', 'rest')],
  attack: [FP('stand', 'windup', 0, -1), FP('wide', 'strike', 0, 1, 1)],
  cast: [FP('stand', 'windup', 0, -1), FP('wide', 'strike', 0, 1, 1)],
  dash: [FP('wide', 'rest', 1, 2)],
  hurt: [FP('stand', 'hurt', 0, -1)],
  ko: [FP('stand', 'hurt')],
};

interface Rect { x: number; y: number; w: number; h: number }
type Pt = [number, number];
interface Geo {
  baton: number;
  /** Shoulders [baton arm, shield arm] per view. */
  shoulders: Record<View, [Pt, Pt]>;
  /** The baton hand in each pose. */
  hand: Record<View, Record<ArmPose, Pt>>;
  /** The shield hand, raised and lowered. */
  grip: Record<View, { up: Pt; low: Pt }>;
  shield: Record<View, { up: Rect; low: Rect }>;
  /** Which way the baton points from the hand in each pose. */
  dir: Record<View, Record<ArmPose, Pt>>;
  /** The shield lying on the floor beside a knocked out foe, or null. */
  fallen: Rect | null;
}

const DIRS: Record<View, Record<ArmPose, Pt>> = {
  down: { rest: [0, 1], windup: [0, -1], strike: [0, 1], hurt: [0, 0] },
  up: { rest: [0, 1], windup: [0, -1], strike: [0, -1], hurt: [0, 0] },
  side: { rest: [0, 1], windup: [-1, -1], strike: [1, 0], hurt: [0, 0] },
};

const GUARD_GEO: Geo = {
  baton: 4,
  shoulders: { down: [[4, 8], [11, 8]], up: [[4, 8], [11, 8]], side: [[7, 8], [8, 8]] },
  hand: {
    down: { rest: [3, 10], windup: [3, 6], strike: [5, 12], hurt: [2, 6] },
    up: { rest: [3, 10], windup: [3, 6], strike: [4, 5], hurt: [2, 6] },
    side: { rest: [7, 11], windup: [6, 5], strike: [10, 9], hurt: [5, 5] },
  },
  grip: { down: { up: [11, 10], low: [12, 10] }, up: { up: [11, 9], low: [12, 10] }, side: { up: [10, 9], low: [8, 11] } },
  shield: {
    down: { up: { x: 4, y: 6, w: 8, h: 9 }, low: { x: 12, y: 7, w: 3, h: 8 } },
    up: { up: { x: 2, y: 3, w: 12, h: 10 }, low: { x: 12, y: 7, w: 3, h: 8 } },
    side: { up: { x: 10, y: 3, w: 5, h: 11 }, low: { x: 6, y: 8, w: 4, h: 7 } },
  },
  dir: DIRS,
  fallen: { x: 1, y: 2, w: 11, h: 4 },
};

const WARDEN_GEO: Geo = {
  baton: 7,
  shoulders: { down: [[5, 10], [18, 10]], up: [[5, 10], [18, 10]], side: [[10, 10], [11, 10]] },
  hand: {
    down: { rest: [4, 16], windup: [4, 6], strike: [8, 18], hurt: [3, 6] },
    up: { rest: [4, 16], windup: [4, 6], strike: [6, 7], hurt: [3, 6] },
    side: { rest: [9, 16], windup: [7, 5], strike: [16, 13], hurt: [6, 5] },
  },
  grip: { down: { up: [18, 14], low: [20, 14] }, up: { up: [18, 13], low: [20, 14] }, side: { up: [16, 13], low: [11, 16] } },
  shield: {
    down: { up: { x: 5, y: 9, w: 14, h: 14 }, low: { x: 20, y: 10, w: 4, h: 12 } },
    up: { up: { x: 2, y: 5, w: 20, h: 14 }, low: { x: 20, y: 10, w: 4, h: 12 } },
    side: { up: { x: 15, y: 4, w: 8, h: 18 }, low: { x: 8, y: 11, w: 6, h: 11 } },
  },
  dir: DIRS,
  fallen: null,
};

const code = (c: string): number => c.charCodeAt(0);

function put(buf: Uint8Array, C: number, x: number, y: number, ch: string): void {
  if (x >= 0 && x < C && y >= 0 && y < C) buf[y * C + x] = code(ch);
}

function blit(buf: Uint8Array, C: number, part: Part, dx: number, dy: number): void {
  if (part.rows.length) blitRows(buf, C, part.rows, dx, part.y + dy);
}

/** A 1 px line of one role, hands excluded. Pixels never overwrite what the body already has unless over is set. */
function line(buf: Uint8Array, C: number, a: Pt, b: Pt, ch: string, over: boolean): void {
  let [x, y] = a;
  const [ex, ey] = b;
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 60; i++) {
    if (over || !buf[y * C + x]) put(buf, C, x, y, ch);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Adds a 1 px outline (role k) around every opaque pixel of buf, 4-neighbour. */
function outline(buf: Uint8Array, C: number): void {
  const src = buf.slice();
  for (let y = 0; y < C; y++) {
    for (let x = 0; x < C; x++) {
      if (src[y * C + x]) continue;
      if ((x > 0 && src[y * C + x - 1]) || (x < C - 1 && src[y * C + x + 1]) || (y > 0 && src[(y - 1) * C + x]) || (y < C - 1 && src[(y + 1) * C + x])) buf[y * C + x] = code('k');
    }
  }
}

/**
 * The clear riot shield in its own layer: a rounded frame with a lit top and left edge, a few glints, and a dark rim
 * outside. The inside stays empty, so whatever is behind the shield shows through. Warden shields carry a trim band.
 */
function shield(C: number, r: Rect, band: boolean): Uint8Array {
  const sb = new Uint8Array(C * C);
  const x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
  for (let y = r.y; y <= y1; y++) {
    for (let x = r.x; x <= x1; x++) {
      const ex = x === r.x || x === x1, ey = y === r.y || y === y1;
      if (ex && ey) continue;
      if (ex || ey) put(sb, C, x, y, x === r.x || y === r.y ? 'S' : 's');
      else if (r.w > 4 && ((x - r.x + y - r.y === 4 && y - r.y <= 4) || (x - r.x + y - r.y === 6 && y - r.y <= 2))) put(sb, C, x, y, 'd');
    }
  }
  if (band && r.h >= 10) for (let x = r.x + 1; x < x1; x++) { put(sb, C, x, r.y + (r.h >> 1), 'y'); put(sb, C, x, r.y + (r.h >> 1) + 1, 'y'); }
  const frame = sb.slice();
  for (let y = 0; y < C; y++) {
    for (let x = 0; x < C; x++) {
      if (frame[y * C + x]) continue;
      const inside = x > r.x && x < x1 && y > r.y && y < y1;
      if (inside) continue;
      if ((x > 0 && frame[y * C + x - 1]) || (x < C - 1 && frame[y * C + x + 1]) || (y > 0 && frame[(y - 1) * C + x]) || (y < C - 1 && frame[(y + 1) * C + x])) sb[y * C + x] = code('k');
    }
  }
  return sb;
}

function rotate(buf: Uint8Array, C: number, ccw: boolean): Uint8Array {
  const out = new Uint8Array(C * C);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const v = buf[y * C + x] as number;
    if (!v) continue;
    out[(ccw ? C - 1 - x : x) * C + (ccw ? y : C - 1 - y)] = v;
  }
  return out;
}

/** Moves the opaque pixels so they rest on row C - 2 and sit centered. */
function settle(buf: Uint8Array, C: number): Uint8Array {
  let minX = C, maxX = -1, maxY = -1;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (buf[y * C + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (maxY < 0) return buf;
  const sx = Math.round((C - 1 - (maxX - minX)) / 2) - minX, sy = C - 2 - maxY;
  const out = new Uint8Array(C * C);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const v = buf[y * C + x] as number, nx = x + sx, ny = y + sy;
    if (v && nx >= 0 && nx < C && ny >= 0 && ny < C) out[ny * C + nx] = v;
  }
  return out;
}

function compose(art: FoeArt, geo: Geo, view: View, anim: AnimId, frame: number, low: boolean, band: boolean): Uint8Array {
  const C = art.cell;
  const poses = FOE_POSES[anim];
  const pose = poses[Math.min(frame, poses.length - 1)] as FoePose;
  const up = !low && anim !== 'hurt' && anim !== 'ko';
  const dx = view === 'side' ? pose.lean : 0, dy = pose.bob;
  const body = new Uint8Array(C * C);
  blit(body, C, art.legs[view][pose.legs], 0, 0);
  blit(body, C, art.torso[view], dx, dy);
  blit(body, C, art.head[view], dx, dy);
  const [bs, ss] = geo.shoulders[view];
  const bh = geo.hand[view][pose.arm], gh = up ? geo.grip[view].up : geo.grip[view].low;
  const flail = pose.arm === 'hurt';
  const sgrip: Pt = flail ? [view === 'side' ? gh[0] - 1 : C - 1 - bh[0], bh[1]] : gh;
  line(body, C, [bs[0] + dx, bs[1] + dy], [bh[0] + dx, bh[1] + dy], 'N', false);
  line(body, C, [ss[0] + dx, ss[1] + dy], [sgrip[0] + dx, sgrip[1] + dy], 'N', false);
  put(body, C, sgrip[0] + dx, sgrip[1] + dy, 'g');
  put(body, C, bh[0] + dx, bh[1] + dy, 'g');
  if (pose.arm !== 'hurt') {
    const [sx, sy] = geo.dir[view][pose.arm];
    for (let i = 1; i <= geo.baton; i++) put(body, C, bh[0] + dx + sx * i, bh[1] + dy + sy * i, i === geo.baton ? 'B' : 'b');
  }
  if (anim === 'ko') {
    const lying = settle(rotate(body, C, view !== 'down'), C);
    outline(lying, C);
    if (geo.fallen) {
      const sb = shield(C, geo.fallen, band);
      for (let i = 0; i < sb.length; i++) if (sb[i]) lying[i] = lying[i] && sb[i] === code('k') ? lying[i] as number : sb[i] as number;
    }
    return lying;
  }
  outline(body, C);
  const r = geo.shield[view][up ? 'up' : 'low'];
  const moved: Rect = { x: r.x + (view === 'side' && up ? pose.push : 0), y: r.y + (view === 'down' && up ? pose.push : 0) + (up ? pose.bob : 0), w: r.w, h: r.h };
  const sb = shield(C, moved, band);
  if (view === 'up' && up) {
    const out = sb.slice();
    for (let i = 0; i < out.length; i++) if (body[i]) out[i] = body[i] as number;
    return out;
  }
  const out = body.slice();
  for (let i = 0; i < out.length; i++) if (sb[i] && !(sb[i] === code('k') && out[i])) out[i] = sb[i] as number;
  return out;
}

/** One frame of the riot guard, facing right when view is 'side'. low puts the shield down at its side. */
export function composeGuard(view: View, anim: AnimId, frame: number, low: boolean): Uint8Array {
  return compose(GUARD_ART, GUARD_GEO, view, anim, frame, low, false);
}

/** One frame of the warden. */
export function composeWarden(view: View, anim: AnimId, frame: number, low: boolean): Uint8Array {
  return compose(WARDEN_ART, WARDEN_GEO, view, anim, frame, low, true);
}

export const FOE_CELL: Record<string, number> = { guard: 16, warden: 24 };
