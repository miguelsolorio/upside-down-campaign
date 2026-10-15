// The paper-doll composer for heroes3-variations.html and grigori-variations.html. It does what compose.ts does (the game's
// poses, arm rig, layer order and 1 px outline) and adds two things the new heroes need: a held thing drawn by hand per view
// (Robin's scoop, Nancy's guns, Erica's clipboard), anchored on the near hand so it follows the arm, and named arm poses of its
// own (Grigori's haymaker and grab) that replace the body's table for one rig. A chosen design's CharSpec drops into the game's
// data files as it is; the held stamps and poses are what Art adds to the game's composer after the pick. Pure: no DOM.
import type { AnimId } from '../../core/types.ts';
import type { ArmPose, BodyDef, CharSpec, Face, LegPose, Part, View } from '../data/types.ts';
import { blitRows, mirrorRoles, outlineRoles } from '../canvas.ts';
import { CELL, POSES } from '../actor_pose.ts';
import type { Roles } from './kit.ts';

export type Pt = [number, number];
/** A hand drawn thing: rows of role letters, with rows[0][0] sitting (ox, oy) from the near hand. */
export interface Stamp { rows: string[]; ox: number; oy: number }
export type Held = Partial<Record<View, Stamp[]>>;
/** The game's arm poses, plus three Grigori uses: a haymaker's wind-up and swing, and the grab. */
export type ArmKey = ArmPose | 'wind' | 'swing' | 'grab';
export interface PoseDef { legs: LegPose; arms: ArmKey; face: Face; bob: number; lean: number; leanV: number }
export type ArmTable = Partial<Record<View, Partial<Record<ArmKey, [Pt, Pt]>>>>;

export interface Rig3 {
  spec: CharSpec;
  body: BodyDef;
  /** Draw each arm two pixels wide, for the big body. */
  thick?: boolean;
  /** The role letter a sleeve is drawn in. Default 'a', the torso. 's' makes bare arms. */
  sleeve?: string;
  /** What the near hand holds, per view. */
  held?: Held;
  /** What the near hand shows in one arm pose only, per view: Grigori's fist in a haymaker. */
  heldBy?: Partial<Record<ArmKey, Held>>;
  /** Where the near hand goes in a pose, per view, so the arm carries what it holds out and up. */
  near?: Partial<Record<View, Partial<Record<ArmKey, Pt>>>>;
  /** Hand targets (both hands) that replace the body's for some poses. */
  arms?: ArmTable;
}

const code = (c: string): number => c.charCodeAt(0);

function put(buf: Roles, x: number, y: number, ch: string): void {
  if (x >= 0 && x < CELL && y >= 0 && y < CELL) buf[y * CELL + x] = code(ch);
}

function blit(buf: Roles, part: Part, dx: number, dy: number): void {
  if (part.rows.length) blitRows(buf, CELL, part.rows, dx, part.y + dy);
}

/**
 * A 1 px arm from shoulder to hand, or 2 px thick with `extra` set to +1 or -1: the second line runs beside the first, across
 * the way the arm points (a level arm gets a row under it, an upright one a column beside it). A sleeve never overwrites the
 * torso, the hand always does.
 */
function arm(buf: Roles, from: Pt, to: Pt, dx: number, dy: number, sleeve: string, extra: number): void {
  let x = from[0] + dx, y = from[1] + dy;
  const ex = to[0] + dx, ey = to[1] + dy;
  const level = Math.abs(ex - x) > Math.abs(ey - y);
  const ox = level ? 0 : extra, oy = level ? extra : 0;
  const adx = Math.abs(ex - x), ady = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = adx + ady;
  for (let i = 0; i < 40; i++) {
    const last = x === ex && y === ey;
    if (last) put(buf, x, y, 's');
    else {
      if (x >= 0 && x < CELL && y >= 0 && y < CELL && !buf[y * CELL + x]) put(buf, x, y, sleeve);
      const x2 = x + ox, y2 = y + oy;
      if (extra && x2 >= 0 && x2 < CELL && y2 >= 0 && y2 < CELL && !buf[y2 * CELL + x2]) put(buf, x2, y2, sleeve);
    }
    if (last) break;
    const e2 = 2 * err;
    if (e2 >= ady) { err += ady; x += sx; }
    if (e2 <= adx) { err += adx; y += sy; }
  }
}

/** The pose a game animation frame uses. */
export function poseOf(anim: AnimId, frame: number): PoseDef {
  const list = POSES[anim];
  const p = list[Math.min(frame, list.length - 1)] as (typeof list)[number];
  return { legs: p.legs, arms: p.arms, face: p.face, bob: p.bob, lean: p.lean, leanV: p.leanV };
}

/** One frame, facing right when view is 'side'. Left is `mirror` of that. */
export function compose3(rig: Rig3, view: View, pose: PoseDef): Roles {
  const { spec, body } = rig;
  const buf: Roles = new Uint8Array(CELL * CELL);
  const dx = view === 'side' ? pose.lean : 0;
  const dy = pose.bob + (view === 'down' ? pose.leanV : 0);
  const sh = body.shoulder[view];
  const base = rig.arms?.[view]?.[pose.arms] ?? body.arms[view][pose.arms as ArmPose];
  const nh = rig.near?.[view]?.[pose.arms];
  const hands: [Pt, Pt] = nh ? [base[0] as Pt, nh] : [base[0] as Pt, base[1] as Pt];
  const trim = spec.trim?.[view] ?? [];
  const w = rig.thick ? 1 : 0, sl = rig.sleeve ?? 'a';
  if (view === 'side') arm(buf, sh[0] as Pt, hands[0] as Pt, dx, dy, sl, 0);
  blit(buf, body.legs[view][pose.legs], 0, 0);
  blit(buf, body.torso[view], dx, dy);
  for (const t of trim) blit(buf, t, dx, dy);
  if (view === 'side') arm(buf, sh[1] as Pt, hands[1] as Pt, dx, dy, sl, w);
  else {
    arm(buf, sh[0] as Pt, hands[0] as Pt, dx, dy, sl, -w);
    arm(buf, sh[1] as Pt, hands[1] as Pt, dx, dy, sl, w);
  }
  blit(buf, body.head[view], dx, dy);
  blit(buf, body.face[pose.face][view], dx, dy);
  for (const h of spec.hair[view]) blit(buf, h, dx, dy);
  const hand = hands[1] as Pt;
  for (const st of [...(rig.held?.[view] ?? []), ...(rig.heldBy?.[pose.arms]?.[view] ?? [])]) {
    st.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i] as string;
        if (ch !== '.' && ch !== ' ') put(buf, hand[0] + dx + st.ox + i, hand[1] + dy + st.oy + j, ch);
      }
    });
  }
  outlineRoles(buf, CELL, CELL, code('k'));
  return buf;
}

/** A side frame turned to face left. */
export const mirror = (buf: Roles): Roles => mirrorRoles(buf, CELL, CELL);
