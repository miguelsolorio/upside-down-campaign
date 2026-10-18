// Eddie's frames for eddie-variations.html: the adult body through the sheets' own composer (compose.ts), set in a 28 by 22
// frame so the Flying V can reach past the 16 px cell, the guitar drawn over or under the figure, then outlined again. The
// guitar is geometry, not art: a neck from the headstock to the joint and two prongs splayed from the joint, so it reads as a V
// at any angle. Roles: g the body of the guitar, G the neck and headstock. The two solo frames use the attack pose's legs with
// the arms moved onto the guitar: the near hand strums at the body, the far hand holds the neck. Pure: no DOM.
import type { AnimId, Expr } from '../../core/types.ts';
import { ADULT } from '../data/adult.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import type { BodyDef, CharSpec, View } from '../data/types.ts';
import { outlineRoles } from '../canvas.ts';
import { CELL } from '../actor_pose.ts';
import { compose } from './compose.ts';
import type { Roles } from './kit.ts';

export interface EddieOpt {
  slug: string;
  name: string;
  note: string;
  spec: CharSpec;
  /** The role a sleeve is drawn in: 's' for bare arms under a vest. */
  sleeve: string;
  portrait: PortraitSpec;
  other: Expr;
}

/** The frame: the 16 px cell sits OX across and OY down in it. */
export const FW = 28, FH = 22;
export const OX = 6, OY = 5;
type Pt = readonly [number, number];

/** Where the guitar goes in a frame, in cell coordinates: headstock, joint, which way the prongs open, and in front or behind. */
export interface Vee { head: Pt; joint: Pt; front: boolean; hands?: Pt[] }

export interface FrameDef { label: string; view: View; anim: AnimId; f: number; body: BodyDef; vee: Vee }

const SOLO_BODY: BodyDef = {
  ...ADULT,
  arms: {
    ...ADULT.arms,
    down: { ...ADULT.arms.down, strike: [[6, 11], [12, 7]], windup: [[6, 12], [12, 6]] },
    side: { ...ADULT.arms.side, strike: [[12, 6], [8, 11]] },
  },
};

export const FRAMES: FrameDef[] = [
  { label: 'DOWN', view: 'down', anim: 'idle', f: 0, body: ADULT, vee: { head: [3, 0], joint: [12, 11], front: false } },
  { label: 'UP', view: 'up', anim: 'idle', f: 0, body: ADULT, vee: { head: [13, 0], joint: [4, 11], front: true } },
  { label: 'SIDE', view: 'side', anim: 'idle', f: 0, body: ADULT, vee: { head: [9, -1], joint: [4, 11], front: false } },
  { label: 'WALK', view: 'side', anim: 'walk', f: 0, body: ADULT, vee: { head: [9, 0], joint: [4, 12], front: false } },
  { label: 'WIND UP', view: 'side', anim: 'attack', f: 0, body: ADULT, vee: { head: [6, 8], joint: [2, 4], front: false } },
  { label: 'HIT', view: 'side', anim: 'attack', f: 1, body: ADULT, vee: { head: [12, 8], joint: [16, 11], front: true, hands: [[13, 9]] } },
  { label: 'SOLO', view: 'down', anim: 'attack', f: 1, body: SOLO_BODY, vee: { head: [15, 5], joint: [7, 12], front: true, hands: [[6, 12], [12, 8]] } },
  { label: 'ROCK OUT', view: 'side', anim: 'attack', f: 1, body: SOLO_BODY, vee: { head: [15, 3], joint: [9, 11], front: true, hands: [[9, 11], [13, 6]] } },
];

function put(buf: Roles, x: number, y: number, ch: string, front: boolean): void {
  if (x < 0 || x >= FW || y < 0 || y >= FH) return;
  const i = y * FW + x;
  if (!front && buf[i]) return;
  buf[i] = ch.charCodeAt(0);
}

function line(buf: Roles, a: Pt, b: Pt, ch: string, front: boolean): void {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let i = 0; i <= n; i++) put(buf, Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n), ch, front);
}

/** Body length and how fast the wedge widens, where the notch between the wings starts and how fast it opens. */
const BODY = 6.2, FLARE = 0.62, NOTCH = 2.8, CUT = 0.8;

/**
 * The Flying V on its own buffer, outlined there so it stays apart from the figure: a wedge that widens away from the neck with
 * a V cut out of its far end, so it reads as two wings at any angle; the neck from the headstock to the joint; and a nub on the
 * headstock.
 */
export function veeBuf(v: Vee): Roles {
  const buf: Roles = new Uint8Array(FW * FH);
  const hx = v.head[0] + OX, hy = v.head[1] + OY, jx = v.joint[0] + OX, jy = v.joint[1] + OY;
  const len = Math.hypot(jx - hx, jy - hy) || 1, ux = (jx - hx) / len, uy = (jy - hy) / len;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const along = (x - jx) * ux + (y - jy) * uy, across = Math.abs(-(x - jx) * uy + (y - jy) * ux);
      if (along < -0.4 || along > BODY || across > 0.7 + along * FLARE) continue;
      if (along > NOTCH && across < (along - NOTCH) * CUT) continue;
      buf[y * FW + x] = 103;
    }
  }
  line(buf, [hx, hy], [jx - ux, jy - uy], 'G', true);
  put(buf, Math.round(hx - uy), Math.round(hy + ux), 'G', true);
  outlineRoles(buf, FW, FH, 107);
  return buf;
}

/** One frame as a 28 by 22 role buffer, outlined. */
export function eddieFrame(o: EddieOpt, fr: FrameDef): Roles {
  const cell = compose({ spec: o.spec, body: fr.body, gear: 'none', sleeve: o.sleeve }, fr.view, fr.anim, fr.f);
  const buf: Roles = new Uint8Array(FW * FH);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) buf[(y + OY) * FW + x + OX] = cell[y * CELL + x] as number;
  const gtr = veeBuf(fr.vee);
  for (let i = 0; i < buf.length; i++) if (gtr[i] && (fr.vee.front || !buf[i])) buf[i] = gtr[i] as number;
  for (const h of fr.vee.hands ?? []) put(buf, h[0] + OX, h[1] + OY, 's', true);
  outlineRoles(buf, FW, FH, 107);
  return buf;
}
