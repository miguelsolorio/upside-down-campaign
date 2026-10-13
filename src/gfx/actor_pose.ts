// Paper-doll composition: poses, arms, weapons and the 1 px outline. Produces 16x16 role buffers
// (one char code per pixel, 0 = empty) that actors.ts turns into canvases. Pure: no DOM.
import type { AnimId } from '../core/types.ts';
import type { ArmPose, BodyDef, CharSpec, Face, LegPose, Part, View } from './data/types.ts';
import { blitRows, outlineRoles } from './canvas.ts';
import { KID } from './data/kid.ts';
import { ADULT } from './data/adult.ts';
import { AGENT_BODY } from './data/agent.ts';
import { RAT } from './data/foes.ts';
import type { RatFrame } from './data/foes.ts';
import { mirrorRoles } from './canvas.ts';

export const CELL = 16;
const BODIES: Record<CharSpec['body'], BodyDef> = { kid: KID, adult: ADULT, agent: AGENT_BODY };
const code = (c: string): number => c.charCodeAt(0);

interface Pose {
  legs: LegPose; arms: ArmPose; face: Face;
  /** Whole upper body down by this many px (stride frames, breathing). */
  bob: number;
  /** Side view: shift toward the facing direction. */
  lean: number;
  /** Front view only: extra drop for crouches and lunges. */
  leanV: number;
}

const P = (legs: LegPose, arms: ArmPose, bob = 0, lean = 0, leanV = 0, face: Face = 'open'): Pose => ({ legs, arms, face, bob, lean, leanV });

/** Frames per anim, in atlas order. */
export const POSES: Record<AnimId, Pose[]> = {
  idle: [P('stand', 'rest'), P('stand', 'rest', 1)],
  walk: [P('stepA', 'swingA', 1), P('stand', 'rest'), P('stepB', 'swingB', 1), P('stand', 'rest')],
  attack: [P('stand', 'windup', 0, -1), P('wide', 'strike', 0, 1, 1)],
  cast: [P('stand', 'raise'), P('wide', 'thrust', 0, 1, 1)],
  dash: [P('wide', 'back', 1, 2, 1)],
  hurt: [P('stand', 'flail', 0, -1, 0, 'hurt')],
  ko: [P('stand', 'flail', 0, 0, 0, 'ko')],
};

export const ANIM_ORDER: AnimId[] = ['idle', 'walk', 'attack', 'cast', 'dash', 'hurt', 'ko'];

/** Wooden bat, slingshot and candy bar in the hand. Directions are unit steps from the hand. */
const BAT: Record<View, Partial<Record<ArmPose, [number, number]>>> = {
  side: { windup: [-1, -1], strike: [1, 0] },
  down: { windup: [0, -1], strike: [-1, 1] },
  up: { windup: [0, -1], strike: [-1, -1] },
};

function put(buf: Uint8Array, x: number, y: number, ch: string): void {
  if (x >= 0 && x < CELL && y >= 0 && y < CELL) buf[y * CELL + x] = code(ch);
}

function blit(buf: Uint8Array, part: Part, dx: number, dy: number): void {
  if (part.rows.length) blitRows(buf, CELL, part.rows, dx, part.y + dy);
}

/** 1 px arm from shoulder to hand. Sleeve pixels never overwrite the torso, the hand always does. */
function arm(buf: Uint8Array, from: [number, number], to: [number, number], dx: number, dy: number, sleeve: string): void {
  let x = from[0] + dx, y = from[1] + dy;
  const ex = to[0] + dx, ey = to[1] + dy;
  const adx = Math.abs(ex - x), ady = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = adx + ady;
  for (let i = 0; i < 40; i++) {
    const last = x === ex && y === ey;
    if (last) put(buf, x, y, 's');
    else if (!buf[y * CELL + x]) put(buf, x, y, sleeve);
    if (last) break;
    const e2 = 2 * err;
    if (e2 >= ady) { err += ady; x += sx; }
    if (e2 <= adx) { err += adx; y += sy; }
  }
}

function weapon(buf: Uint8Array, spec: CharSpec, view: View, pose: ArmPose, hand: [number, number], dx: number, dy: number): void {
  const hx = hand[0] + dx, hy = hand[1] + dy;
  if (spec.weapon === 'bat') {
    const v = BAT[view][pose];
    if (!v) return;
    for (let i = 1; i <= 5; i++) put(buf, hx + v[0] * i, hy + v[1] * i, i >= 4 ? 'G' : 'g');
  } else if (spec.weapon === 'sling' && (pose === 'strike' || pose === 'thrust' || pose === 'windup')) {
    const fx = view === 'side' ? 1 : 0;
    put(buf, hx + fx, hy, 'x');
    put(buf, hx + fx * 2, hy, 'x');
    put(buf, hx + fx * 2 + (fx ? 0 : -1), hy + (fx ? -1 : -1), 'y');
    put(buf, hx + fx * 2 + (fx ? 0 : 1), hy + (fx ? 1 : -1), 'y');
  } else if (spec.weapon === 'gun' && (pose === 'windup' || pose === 'strike')) {
    const v = view === 'side' ? (pose === 'strike' ? [1, 0] : [0, -1]) : view === 'down' ? [0, pose === 'strike' ? 1 : -1] : [0, -1];
    for (let i = 1; i <= 3; i++) put(buf, hx + (v[0] as number) * i, hy + (v[1] as number) * i, i === 3 ? 'y' : 'x');
  } else if (spec.weapon === 'candy' && (pose === 'windup' || pose === 'strike')) {
    put(buf, hx, hy - 1, 'x'); put(buf, hx + 1, hy - 1, 'y'); put(buf, hx, hy - 2, 'x'); put(buf, hx + 1, hy - 2, 'x');
  }
}

/** Torso rows with the shirt pattern applied. */
function shirt(spec: CharSpec, part: Part): Part {
  if (spec.torso === 'plain' || spec.torso === 'dress') return part;
  const rows = part.rows.map((row, r) => {
    let out = '';
    for (let c = 0; c < row.length; c++) {
      const ch = row[c] as string;
      if (ch !== 'a') { out += ch; continue; }
      if (spec.torso === 'stripes') out += r % 2 === 1 ? 'b' : 'a';
      else if (spec.torso === 'plaid') out += c % 3 === 0 || r === 1 ? 'b' : 'a';
      else if (spec.torso === 'cardigan') out += c === 7 || c === 8 ? 'b' : 'a';
      else out += ch;
    }
    return out;
  });
  return { y: part.y, rows };
}

function rotate(buf: Uint8Array, ccw: boolean): Uint8Array {
  const out = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const v = buf[y * CELL + x] as number;
      if (!v) continue;
      const nx = ccw ? y : CELL - 1 - y;
      const ny = ccw ? CELL - 1 - x : x;
      out[ny * CELL + nx] = v;
    }
  }
  return out;
}

/** Moves the opaque pixels so they rest on row 14 and sit centered. */
function settle(buf: Uint8Array): Uint8Array {
  let minX = CELL, maxX = -1, maxY = -1;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (buf[y * CELL + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (maxY < 0) return buf;
  const sx = Math.round((CELL - 1 - (maxX - minX)) / 2) - minX;
  const sy = 14 - maxY;
  const out = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const v = buf[y * CELL + x] as number;
    const nx = x + sx, ny = y + sy;
    if (v && nx >= 0 && nx < CELL && ny >= 0 && ny < CELL) out[ny * CELL + nx] = v;
  }
  return out;
}

/** How far the head and torso sit from their neutral spot in a frame, for overlays drawn on the face. */
export function bodyShift(view: View, anim: AnimId, frame: number): [number, number] {
  const poses = POSES[anim];
  const pose = poses[Math.min(frame, poses.length - 1)] as Pose;
  return [view === 'side' ? pose.lean : 0, pose.bob + (view === 'down' ? pose.leanV : 0)];
}

/** One frame of a paper-doll character, facing right when view is 'side'. */
export function composeFrame(spec: CharSpec, view: View, anim: AnimId, frame: number): Uint8Array {
  const body = BODIES[spec.body];
  const poses = POSES[anim];
  const pose = poses[Math.min(frame, poses.length - 1)] as Pose;
  const buf = new Uint8Array(CELL * CELL);
  const dx = view === 'side' ? pose.lean : 0;
  const dy = pose.bob + (view === 'down' ? pose.leanV : 0);
  const sh = body.shoulder[view];
  const hands = body.arms[view][pose.arms];
  const trim = spec.trim?.[view] ?? [];

  if (view === 'side') arm(buf, sh[0] as [number, number], hands[0] as [number, number], dx, dy, 'a');
  blit(buf, body.legs[view][pose.legs], 0, 0);
  blit(buf, shirt(spec, body.torso[view]), dx, dy);
  for (const t of trim) blit(buf, t, dx, dy);
  if (view === 'side') arm(buf, sh[1] as [number, number], hands[1] as [number, number], dx, dy, 'a');
  else { arm(buf, sh[0] as [number, number], hands[0] as [number, number], dx, dy, 'a'); arm(buf, sh[1] as [number, number], hands[1] as [number, number], dx, dy, 'a'); }
  blit(buf, body.head[view], dx, dy);
  blit(buf, body.face[pose.face][view], dx, dy);
  for (const h of spec.hair[view]) blit(buf, h, dx, dy);
  weapon(buf, spec, view, pose.arms, (view === 'side' ? hands[1] : hands[1]) as [number, number], dx, dy);
  if (anim === 'ko') {
    const lying = settle(rotate(buf, view !== 'down'));
    outlineRoles(lying, CELL, CELL, code('k'));
    return lying;
  }
  outlineRoles(buf, CELL, CELL, code('k'));
  return buf;
}

// ---------------------------------------------------------------- rat
function ratKey(anim: AnimId, frame: number): RatFrame {
  switch (anim) {
    case 'idle': return frame ? 'idle1' : 'idle0';
    case 'walk': return (['walk0', 'walk1', 'walk2', 'walk3'] as const)[frame & 3] as RatFrame;
    case 'attack': return frame ? 'attack1' : 'attack0';
    case 'cast': return 'attack0';
    case 'dash': return 'attack1';
    case 'hurt': return 'hurt';
    default: return 'ko';
  }
}

/** One frame of the rat. Front and back views borrow walk and lunge frames from the ones they have. */
export function composeRat(view: View, anim: AnimId, frame: number): Uint8Array {
  const set = RAT[view];
  const key = ratKey(anim, frame);
  let buf: Uint8Array = new Uint8Array(CELL * CELL);
  const part = set[key];
  if (part) blit(buf, part, 0, 0);
  else if (key === 'walk2' || key === 'walk3') {
    blit(buf, (set[key === 'walk2' ? 'walk0' : 'walk1'] ?? set.idle0) as Part, 0, 0);
    buf = mirrorRoles(buf, CELL, CELL);
  } else if (key === 'attack1') blit(buf, set.attack0 as Part, 0, 1);
  else blit(buf, set.idle0 as Part, 0, 0);
  outlineRoles(buf, CELL, CELL, code('k'));
  return buf;
}
