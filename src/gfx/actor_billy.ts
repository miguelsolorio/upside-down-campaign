// Flayed Billy (data/billy.ts), drawn from frames of his own like the Demogorgon and the Alpha, because the kneel needs the veins to fade as
// Eleven reaches him and no fixed atlas can hold that: a frame is composed on first use for a view, a pose and a share of veins left.
// The torso, the arms and the head are put together the way Grigori's are (actor_grigori.ts): skin and trunks, then the veins over the skin
// where nothing covers it, the trim, the arms with a fist at the end, the head with its face and the mullet over it, and an ink outline.
// Poses follow what the sim sends (enemies/billy.ts, billy_hit.ts): stand and walk, the jab (anim attack: the wind-up under the "!", then
// the blow), the charge (pose charge: the wind-up under the "!", then the run), the grab (pose grab: the reach, then the hold), the stun
// against a wall (pose stun, swaying), hurt, and the kneel (pose pinned: the veins fade as `k` climbs from 0 to 1). A freed Billy is an npc
// with id billy, slumped on the floor with the veins gone and his color back. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { blitRows, hash2, mirrorRoles, outlineRoles, px32 } from './canvas.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { ARMS, BILLY_CELL, BILLY_PAL, BILLY_TAN, BPOSES, FACE, HAIR, HEAD, KNEEL, KNEEL_AT, KNEEL_DROP, LEGS_FRONT, LEGS_SIDE, SHOULDER, TORSO, TRIM, VEINS } from './data/billy.ts';
import type { BPose, BPoseName, Pt, Seg } from './data/billy.ts';
import type { Part, View } from './data/types.ts';
import { Px } from './px.ts';

export const BILLY_W = BILLY_CELL, BILLY_H = BILLY_CELL;
const BC = BILLY_CELL;
/** The trunks end three rows into the legs: below them he is bare skin. */
const BARE = 3;
/** The veins fade in four steps and are gone at the fifth, which is also the free man's color. */
export const VEIN_STEPS = 4;

const code = (c: string): number => c.charCodeAt(0);
function put(buf: Uint8Array, x: number, y: number, ch: string, over = true): void {
  if (x >= 0 && x < BC && y >= 0 && y < BC && (over || !buf[y * BC + x])) buf[y * BC + x] = code(ch);
}
const blit = (buf: Uint8Array, part: Part, dx: number, dy: number): void => { if (part.rows.length) blitRows(buf, BC, part.rows, dx, part.y + dy); };

/** Veins as pixels along segments, kept where the hash is under `keep` (1 is all of them), and only on skin. */
function veins(buf: Uint8Array, segs: Seg[], dx: number, dy: number, keep: number): void {
  for (const [x0, y0, x1, y1] of segs) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / (n || 1)) + dx, y = Math.round(y0 + ((y1 - y0) * i) / (n || 1)) + dy;
      if (hash2(x, y, 5) / 4294967296 >= keep) continue;
      if (x >= 0 && x < BC && y >= 0 && y < BC && buf[y * BC + x] === code('s')) buf[y * BC + x] = code('v');
    }
  }
}

/** One arm along its path, two px thick, skin with a vein down one edge, and a fist at the end. */
function arm(buf: Uint8Array, from: Pt, path: Pt[], dx: number, dy: number, extra: number, keep: number): void {
  const pts = [from, ...path];
  let step = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    let x = (pts[k] as Pt)[0] + dx, y = (pts[k] as Pt)[1] + dy;
    const ex = (pts[k + 1] as Pt)[0] + dx, ey = (pts[k + 1] as Pt)[1] + dy;
    const level = Math.abs(ex - x) > Math.abs(ey - y);
    const adx = Math.abs(ex - x), ady = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = adx + ady;
    for (let i = 0; i < 40; i++) {
      const vein = step % 3 === 1 && hash2(x, y, 9) / 4294967296 < keep ? 'v' : 's';
      put(buf, x, y, 's', false);
      if (extra) put(buf, x + (level ? 0 : extra), y + (level ? extra : 0), vein, false);
      step++;
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= ady) { err += ady; x += sx; }
      if (e2 <= adx) { err += adx; y += sy; }
    }
  }
  const end = pts[pts.length - 1] as Pt;
  for (const [ox, oy] of [[0, 0], [extra || 1, 0], [0, 1], [extra || 1, 1]]) put(buf, end[0] + dx + (ox as number), end[1] + dy + (oy as number), 's');
}

/** A shade line on the torso along an arm laid over it, so a near arm in profile reads against the chest of the same skin. */
function edge(buf: Uint8Array, lay: Uint8Array): void {
  for (let y = 0; y < BC; y++) {
    for (let x = 0; x < BC; x++) {
      if (lay[y * BC + x] || buf[y * BC + x] !== code('s')) continue;
      if ((x > 0 && lay[y * BC + x - 1]) || (x < BC - 1 && lay[y * BC + x + 1]) || (y > 0 && lay[(y - 1) * BC + x]) || (y < BC - 1 && lay[(y + 1) * BC + x])) buf[y * BC + x] = code('d');
    }
  }
}

/** The leg rows of a pose: the trunks over the thighs, bare skin below them, the far leg in shade; a kneel by the view. */
function legRows(view: View, pose: BPose): string[] {
  if (pose.legs === 'kneel') return KNEEL[view].map((r, i) => (view === 'side' ? r.replace(/q/g, 's') : i >= 1 ? r.replace(/p/g, 's') : r));
  return (view === 'side' ? LEGS_SIDE : LEGS_FRONT)[pose.legs].map((r, i) => (i >= BARE ? r.replace(/[pq]/g, 's') : r));
}

/** One frame of Billy as role letters, facing right when the view is 'side'. `keep` is the share of his veins still showing, 1 to 0. */
export function composeBilly(view: View, pose: BPose, keep = 1): Uint8Array {
  const buf = new Uint8Array(BC * BC);
  const kneel = pose.legs === 'kneel';
  const dx = view === 'side' ? pose.lean : 0, dy = pose.bob + pose.leanV + (kneel ? KNEEL_DROP[view] : 0);
  const hx = dx + (pose.head?.[0] ?? 0), hy = dy + (pose.head?.[1] ?? 0);
  const [a0, a1] = ARMS[view][pose.arms], [s0, s1] = SHOULDER[view];
  if (view === 'side') arm(buf, s0, a0, dx, dy, 0, keep);
  blitRows(buf, BC, legRows(view, pose), 0, kneel ? KNEEL_AT[view] : 18);
  blit(buf, TORSO[view], dx, dy);
  veins(buf, VEINS[view].torso, dx, dy, keep);
  for (const t of TRIM[view]) blit(buf, t, dx, dy);
  if (view === 'side') {
    const lay = new Uint8Array(BC * BC);
    arm(lay, s1, a1, dx, dy, 1, keep);
    edge(buf, lay);
    for (let i = 0; i < lay.length; i++) if (lay[i]) buf[i] = lay[i] as number;
  } else { arm(buf, s0, a0, dx, dy, -1, keep); arm(buf, s1, a1, dx, dy, 1, keep); }
  blit(buf, HEAD[view], hx, hy);
  veins(buf, VEINS[view].head, hx, hy, keep);
  blit(buf, FACE[pose.face][view], hx, hy);
  for (const h of HAIR[view]) blit(buf, h, hx, hy);
  outlineRoles(buf, BC, BC, code('k'));
  return buf;
}

/** The palette once the veins are gone: the skin warms back to a tan, its shade to a darker one, and nothing is left of the veins. */
export const FREED_PAL: Record<string, ColorName> = { ...BILLY_PAL, s: BILLY_TAN, d: 'skin2', v: BILLY_TAN };

/** Paints a role buffer. */
function paint(buf: Uint8Array, pal: Record<string, ColorName>): Px {
  const out = new Px(BC, BC);
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i] as number;
    if (!v) continue;
    const name = v === 107 ? 'ink' : pal[String.fromCharCode(v)];
    if (name) out.d[i] = px32(name);
  }
  return out;
}

type Asked = Pick<ActorView, 'kind' | 'anim' | 't' | 'alert' | 'pose'>;

/** Which pose a view asks for: by what the sim says he is doing, and by the clock where the sim only says the anim. */
export function billyPoseOf(v: Asked): BPoseName {
  if (v.kind === 'npc') return 'freed';
  switch (v.pose) {
    case 'pinned': return 'pinned';
    case 'stun': return (v.t >> 3) & 1 ? 'stunB' : 'stunA';
    case 'charge': return v.alert ? 'charge' : 'run';
    case 'grab': return v.alert || !((v.t >> 2) & 1) ? 'grab' : 'hold';
    default: break;
  }
  switch (v.anim) {
    case 'attack': return v.alert ? 'jabWind' : 'jab';
    case 'walk': return ['walkA', 'idle', 'walkB', 'idle'][((v.t / 7) | 0) & 3] as BPoseName;
    case 'dash': return 'run';
    case 'hurt': return 'hurt';
    case 'ko': return 'freed';
    default: return (v.t / 30) & 1 ? 'idleB' : 'idle';
  }
}

/** How many steps of the reach have gone: 0 with the veins all there, VEIN_STEPS with none. */
export const veinStep = (k: number): number => Math.max(0, Math.min(VEIN_STEPS, Math.round(Math.max(0, Math.min(1, k)) * VEIN_STEPS)));

/** The role buffer and palette of a pose, for a view and a reach. A pinned Billy at the last step, and a freed one, are the free man. */
export function billyRoles(view: View, name: BPoseName, step: number): { buf: Uint8Array; pal: Record<string, ColorName> } {
  const free = name === 'freed' || (name === 'pinned' && step >= VEIN_STEPS);
  return { buf: composeBilly(view, BPOSES[name], free ? 0 : name === 'pinned' ? 1 - step / VEIN_STEPS : 1), pal: free ? FREED_PAL : BILLY_PAL };
}

const frames = new Map<string, Frame>();
const bases = new Map<string, Px>();

/** A pose painted for a facing and a step of the reach, built once. Left is the side view turned round. */
function baseOf(dir: ActorView['dir'], name: BPoseName, step: number): Px {
  const key = `${dir}|${name}|${step}`;
  let px = bases.get(key);
  if (!px) {
    const r = billyRoles(dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side', name, step);
    px = paint(dir === 'left' ? mirrorRoles(r.buf, BC, BC) : r.buf, r.pal);
    bases.set(key, px);
  }
  return px;
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function billyFrame(v: ActorView): Frame {
  const name = billyPoseOf(v), step = name === 'pinned' ? veinStep(v.k ?? 0) : 0;
  return frameFor(frames, `${v.dir}|${name}|${step}`, baseOf(v.dir, name, step), v);
}
