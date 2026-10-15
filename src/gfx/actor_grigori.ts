// Grigori in his 24 by 24 cell (data/grigori.ts): composes his role buffers like the warden's (actor_foes.ts), with a head, a torso and
// legs from the ASCII parts and the arms drawn on top, three pixels thick in coat grey with a fist of skin. His poses fill the same 13
// slots every actor's atlas has, so one atlas layout serves him: the walk, the haymaker's wind-up (attack, first frame) and swing
// (second), the grab (cast, first frame: reaching), the hold (second: both arms clamped forward) and the stun (third), the lunge
// (dash), hurt and ko. actors.ts picks the slot from what the sim sends (actorFrame). Pure: no DOM.
import type { AnimId } from '../core/types.ts';
import type { LegPose, Part, View } from './data/types.ts';
import { blitRows, outlineRoles } from './canvas.ts';
import { GRIGORI_ART, GRIGORI_CELL } from './data/grigori.ts';

const C = GRIGORI_CELL;
type Pt = [number, number];
type Arms = 'rest' | 'swingA' | 'swingB' | 'wind' | 'swing' | 'grab' | 'hold' | 'stun' | 'lunge' | 'flail';
interface Pose { legs: LegPose; arms: Arms; bob: number; lean: number; leanV: number; face?: 'hurt' }
const GP = (legs: LegPose, arms: Arms, bob = 0, lean = 0, leanV = 0, face?: 'hurt'): Pose => ({ legs, arms, bob, lean, leanV, ...(face ? { face } : {}) });

/** The frames of each anim, in atlas order. The stun is the third cast frame. */
export const GRIGORI_POSES: Record<AnimId, Pose[]> = {
  idle: [GP('stand', 'rest'), GP('stand', 'rest', 1)],
  walk: [GP('stepA', 'swingA', 1), GP('stand', 'rest'), GP('stepB', 'swingB', 1), GP('stand', 'rest')],
  attack: [GP('wide', 'wind', 0, -2), GP('wide', 'swing', 0, 2, 1)],
  cast: [GP('wide', 'grab', 0, 2, 1), GP('wide', 'hold', 0, 2, 1), GP('wide', 'stun', 2, 0, 0, 'hurt')],
  dash: [GP('wide', 'lunge', 1, 3, 1)],
  hurt: [GP('stand', 'flail', 0, -1, 0, 'hurt')],
  ko: [GP('stand', 'flail', 0, 0, 0, 'hurt')],
};

const SHOULDERS: Record<View, [Pt, Pt]> = { down: [[4, 11], [19, 11]], up: [[4, 11], [19, 11]], side: [[9, 11], [13, 11]] };
/** Where each hand goes (back or left, then front or right), per view and pose. */
const HANDS: Record<View, Record<Arms, [Pt, Pt]>> = {
  down: {
    rest: [[3, 18], [20, 18]], swingA: [[3, 17], [20, 19]], swingB: [[3, 19], [20, 17]], wind: [[3, 18], [21, 5]], swing: [[3, 18], [8, 17]],
    grab: [[8, 16], [15, 16]], hold: [[9, 14], [14, 14]], stun: [[1, 9], [22, 9]], lunge: [[7, 16], [16, 16]], flail: [[1, 14], [22, 14]],
  },
  up: {
    rest: [[3, 18], [20, 18]], swingA: [[3, 17], [20, 19]], swingB: [[3, 19], [20, 17]], wind: [[3, 18], [21, 5]], swing: [[3, 18], [11, 8]],
    grab: [[8, 6], [15, 6]], hold: [[9, 7], [14, 7]], stun: [[1, 9], [22, 9]], lunge: [[7, 6], [16, 6]], flail: [[1, 14], [22, 14]],
  },
  side: {
    rest: [[9, 18], [13, 18]], swingA: [[7, 17], [15, 17]], swingB: [[15, 17], [8, 18]], wind: [[11, 17], [3, 10]], swing: [[11, 17], [19, 12]],
    grab: [[17, 11], [18, 12]], hold: [[16, 10], [17, 11]], stun: [[6, 9], [17, 9]], lunge: [[17, 12], [19, 13]], flail: [[6, 14], [12, 15]],
  },
};

const code = (c: string): number => c.charCodeAt(0);
function put(buf: Uint8Array, x: number, y: number, ch: string, over = false): void {
  if (x >= 0 && x < C && y >= 0 && y < C && (over || !buf[y * C + x])) buf[y * C + x] = code(ch);
}
function blit(buf: Uint8Array, part: Part, dx: number, dy: number): void {
  if (part.rows.length) blitRows(buf, C, part.rows, dx, part.y + dy);
}

/**
 * A sleeve from the shoulder to the hand, three px thick (a cross at every step), then the fist, a 3 by 3 block of skin. An arm in
 * front of the coat gets an ink line along its edge on the coat, so a sleeve the same grey as the coat still reads as an arm.
 */
function arm(buf: Uint8Array, from: Pt, to: Pt, edge = true): void {
  const lay = new Uint8Array(C * C);
  let [x, y] = from;
  const [ex, ey] = to;
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 60; i++) {
    for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(lay, x + (ox as number), y + (oy as number), 'a');
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(lay, ex + i, ey + j, 's', true);
  if (edge) {
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
      if (lay[j * C + i] || buf[j * C + i] !== code('a')) continue;
      if ((i > 0 && lay[j * C + i - 1]) || (i < C - 1 && lay[j * C + i + 1]) || (j > 0 && lay[(j - 1) * C + i]) || (j < C - 1 && lay[(j + 1) * C + i])) buf[j * C + i] = code('e');
    }
  }
  for (let i = 0; i < lay.length; i++) if (lay[i]) buf[i] = lay[i] as number;
}

function rotate(buf: Uint8Array, ccw: boolean): Uint8Array {
  const out = new Uint8Array(C * C);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const v = buf[y * C + x] as number;
    if (v) out[(ccw ? C - 1 - x : x) * C + (ccw ? y : C - 1 - y)] = v;
  }
  return out;
}

/** Moves the opaque pixels so they rest on row C - 2 and sit centered. */
function settle(buf: Uint8Array): Uint8Array {
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

/** One frame of Grigori, facing right when view is 'side'. */
export function composeGrigori(view: View, anim: AnimId, frame: number): Uint8Array {
  const poses = GRIGORI_POSES[anim];
  const pose = poses[Math.min(frame, poses.length - 1)] as Pose;
  const dx = view === 'side' ? pose.lean : 0, dy = pose.bob + (view === 'down' ? pose.leanV : 0);
  const buf = new Uint8Array(C * C);
  const [sa, sb] = SHOULDERS[view], [ha, hb] = HANDS[view][pose.arms];
  if (view === 'side') arm(buf, [sa[0] + dx, sa[1] + dy], [ha[0] + dx, ha[1] + dy], false);
  blit(buf, GRIGORI_ART.legs[view][pose.legs], 0, 0);
  blit(buf, GRIGORI_ART.torso[view], dx, dy);
  if (view === 'side') arm(buf, [sb[0] + dx, sb[1] + dy], [hb[0] + dx, hb[1] + dy]);
  else { arm(buf, [sa[0], sa[1] + dy], [ha[0], ha[1] + dy]); arm(buf, [sb[0], sb[1] + dy], [hb[0], hb[1] + dy]); }
  blit(buf, GRIGORI_ART.head[view], dx, dy);
  if (anim === 'ko') {
    const lying = settle(rotate(buf, view !== 'down'));
    outlineRoles(lying, C, C, code('k'));
    return lying;
  }
  outlineRoles(buf, C, C, code('k'));
  return buf;
}
