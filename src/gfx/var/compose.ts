// A paper-doll composer for the hero sheets. It does what composeFrame does in actor_pose.ts (the same poses, the same arm
// rig, the same layer order, a 1 px outline) with three differences the sheets need: the body is an argument, so Hopper can
// try a wider one; arms can be two pixels thick; and it draws the two held things the game's composer doesn't have yet,
// the nail bat (a 'n' role for the nails) and the skateboard when it's swung. A chosen design's CharSpec drops straight into
// the game's data files. Pure: no DOM.
import type { AnimId } from '../../core/types.ts';
import type { BodyDef, CharSpec, Part, View } from '../data/types.ts';
import { blitRows, outlineRoles } from '../canvas.ts';
import { CELL, POSES } from '../actor_pose.ts';
import type { Roles } from './kit.ts';

export type Gear = 'none' | 'nailbat' | 'board';
export interface Rig {
  spec: CharSpec;
  body: BodyDef;
  gear?: Gear;
  /** Draw each arm two pixels wide, for a big body. */
  thick?: boolean;
  /** The role letter a sleeve is drawn in. Default 'a', the torso. A letterman jacket has its own. */
  sleeve?: string;
}

const code = (c: string): number => c.charCodeAt(0);
type Pt = [number, number];
/** Unit step from the hand for a held thing, by view and arm pose. The same table the game's bat uses. */
const AIM: Record<View, Record<string, Pt>> = {
  side: { windup: [-1, -1], strike: [1, 0] },
  down: { windup: [0, -1], strike: [-1, 1] },
  up: { windup: [0, -1], strike: [-1, -1] },
};

function put(buf: Roles, x: number, y: number, ch: string): void {
  if (x >= 0 && x < CELL && y >= 0 && y < CELL) buf[y * CELL + x] = code(ch);
}

function blit(buf: Roles, part: Part, dx: number, dy: number): void {
  if (part.rows.length) blitRows(buf, CELL, part.rows, dx, part.y + dy);
}

/** A 1 px arm from shoulder to hand. Sleeve pixels never overwrite the torso, the hand always does. */
function arm(buf: Roles, from: Pt, to: Pt, dx: number, dy: number, sleeve: string, extra: number): void {
  let x = from[0] + dx, y = from[1] + dy;
  const ex = to[0] + dx, ey = to[1] + dy;
  const adx = Math.abs(ex - x), ady = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = adx + ady;
  for (let i = 0; i < 40; i++) {
    const last = x === ex && y === ey;
    if (last) put(buf, x, y, 's');
    else {
      if (!buf[y * CELL + x]) put(buf, x, y, sleeve);
      if (extra && !buf[y * CELL + x + extra]) put(buf, x + extra, y, sleeve);
    }
    if (last) break;
    const e2 = 2 * err;
    if (e2 >= ady) { err += ady; x += sx; }
    if (e2 <= adx) { err += adx; y += sy; }
  }
}

function held(buf: Roles, gear: Gear, view: View, pose: string, hand: Pt): void {
  const v = AIM[view][pose];
  if (!v || gear === 'none') return;
  const [hx, hy] = hand, px = -v[1], py = v[0];
  if (gear === 'nailbat') {
    for (let i = 1; i <= 5; i++) put(buf, hx + v[0] * i, hy + v[1] * i, i >= 4 ? 'G' : 'g');
    put(buf, hx + v[0] * 4 + px, hy + v[1] * 4 + py, 'n');
    put(buf, hx + v[0] * 5 - px, hy + v[1] * 5 - py, 'n');
    put(buf, hx + v[0] * 3 - px, hy + v[1] * 3 - py, 'n');
  } else {
    for (let i = 1; i <= 6; i++) { put(buf, hx + v[0] * i, hy + v[1] * i, 'x'); put(buf, hx + v[0] * i + px, hy + v[1] * i + py, 'x'); }
    for (const i of [2, 5]) put(buf, hx + v[0] * i - px, hy + v[1] * i - py, 'g');
  }
}

/** One frame of a character, facing right when view is 'side'. No KO frame: the sheets don't show it. */
export function compose(rig: Rig, view: View, anim: AnimId, frame: number): Roles {
  const { spec, body } = rig;
  const poses = POSES[anim];
  const pose = poses[Math.min(frame, poses.length - 1)] as (typeof poses)[number];
  const buf: Roles = new Uint8Array(CELL * CELL);
  const dx = view === 'side' ? pose.lean : 0;
  const dy = pose.bob + (view === 'down' ? pose.leanV : 0);
  const sh = body.shoulder[view], hands = body.arms[view][pose.arms];
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
  held(buf, rig.gear ?? 'none', view, pose.arms, hands[1] as Pt);
  outlineRoles(buf, CELL, CELL, code('k'));
  return buf;
}
