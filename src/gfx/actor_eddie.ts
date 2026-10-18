// Eddie Munson in the Hellfire Club look (docs/level-11.md, the owner's pick: gfx/var/eddie_opts.ts, HELLFIRE), drawn from frames of his
// own like Billy (actor_billy.ts): the adult body through the sheets' composer in a 28 by 22 frame, so the Flying V can reach past the 16 px
// cell, the red guitar slung on his back at rest and in the walk, raised and swung in the Flying V swing, and held across him for the solo.
// The sheet has eight frames; the game needs every anim in every facing, so the rest are the same body with the guitar moved to match. The
// two solo frames (SOLO from the front, ROCK OUT from the side) loop while he plays (anim cast). Down, up and side are drawn; left is the
// side turned round. A hurt Eddie keeps the guitar on his back, and a knocked out one lies on the floor with it beside him. Five fill colors
// (skin, hair, bone, black, red) and the ink outline. Pure pixel work: no DOM until a frame becomes a canvas.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { composeFrame } from './actor_pose.ts';
import { mirrorRoles, outlineRoles } from './canvas.ts';
import { EDDIE_PICK, EDDIE_SPEC } from './data/eddie.ts';
import type { Px } from './px.ts';
import { FH, FRAMES, FW, OX, OY, eddieFrame, veeBuf } from './var/eddie_kit.ts';
import type { FrameDef, Vee } from './var/eddie_kit.ts';
import { paintRoles } from './var/kit.ts';
import type { Roles } from './var/kit.ts';

/** The frame is 28 wide and 21 tall counted from the head: the 22nd row is the ink under his boots, which falls on the line he stands on. */
export const EDDIE_W = FW, EDDIE_H = FH - 1;

type View = 'down' | 'up' | 'side';
export type EddieKey = 'idle0' | 'idle1' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'wind' | 'hit' | 'solo0' | 'solo1' | 'hurt' | 'ko';
const KEYS: EddieKey[] = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wind', 'hit', 'solo0', 'solo1', 'hurt', 'ko'];

const [DOWN, UP, SIDE, , WIND, HIT, SOLO, ROCK] = FRAMES as [FrameDef, FrameDef, FrameDef, FrameDef, FrameDef, FrameDef, FrameDef, FrameDef];
const REST: Record<View, FrameDef> = { down: DOWN, up: UP, side: SIDE };

/** The guitar of a frame moved by (dx, dy): it rides with the body. */
function moved(fr: FrameDef, dx: number, dy: number): Vee {
  const v = fr.vee;
  return { ...v, head: [v.head[0] + dx, v.head[1] + dy], joint: [v.joint[0] + dx, v.joint[1] + dy], ...(v.hands ? { hands: v.hands.map(([x, y]) => [x + dx, y + dy] as const) } : {}) };
}

/**
 * The swing: from the front the guitar goes up on his right (the wind-up) and comes down across his body (the blow); from behind it
 * goes up beside the head and then out over it, away from us. From the side the sheet's own wind-up and hit.
 */
const SWING: Record<View, [Vee, Vee]> = {
  down: [{ head: [12, 7], joint: [13, 3], front: false }, { head: [14, 7], joint: [9, 12], front: true }],
  up: [{ head: [12, 7], joint: [13, 3], front: true }, { head: [8, 7], joint: [8, 2], front: false }],
  side: [WIND.vee, moved(HIT, -3, 0)], // the sheet's blow, three pixels in, so the frame's edge doesn't cut the wing of the V
};

/** The definition of a frame for a view and a key, as eddieFrame draws it. */
function defOf(view: View, key: EddieKey): FrameDef {
  const rest = REST[view];
  switch (key) {
    case 'idle0': return rest;
    case 'idle1': return { ...rest, f: 1, vee: moved(rest, 0, 1) };
    case 'walk0': return { ...rest, anim: 'walk', f: 0, vee: moved(rest, 0, 1) };
    case 'walk1': return { ...rest, anim: 'walk', f: 1 };
    case 'walk2': return { ...rest, anim: 'walk', f: 2, vee: moved(rest, 0, 1) };
    case 'walk3': return { ...rest, anim: 'walk', f: 3 };
    case 'wind': case 'hit': return { ...rest, body: (view === 'side' ? WIND : rest).body, anim: 'attack', f: key === 'wind' ? 0 : 1, vee: SWING[view][key === 'wind' ? 0 : 1] };
    case 'solo0': return SOLO;
    case 'solo1': return ROCK;
    default: return { ...rest, anim: 'hurt', f: 0, vee: moved(rest, view === 'side' ? -1 : 0, 0) };
  }
}

/** Knocked out: the paper doll's lying frame, with the guitar flat on the floor in front of him. */
function koRoles(view: View): Roles {
  const buf: Roles = new Uint8Array(FW * FH);
  blitCell(buf, composeFrame(EDDIE_SPEC, view, 'ko', 0));
  const gtr = veeBuf({ head: [view === 'down' ? 0 : 2, 15], joint: [view === 'down' ? 6 : 8, 15], front: false });
  for (let i = 0; i < buf.length; i++) if (gtr[i] && !buf[i]) buf[i] = gtr[i] as number;
  outlineRoles(buf, FW, FH, 107);
  return buf;
}

function blitCell(buf: Roles, cell: Uint8Array): void {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) buf[(y + OY) * FW + x + OX] = cell[y * 16 + x] as number;
}

/** One frame as role letters, facing right in the side view. */
export function eddieRoles(view: View, key: EddieKey): Roles {
  return key === 'ko' ? koRoles(view) : eddieFrame(EDDIE_PICK, defOf(view, key));
}

const bases = new Map<string, Px>();
const frames = new Map<string, Frame>();

/** A frame painted for a facing, built once. Left is the side view turned round. */
function baseOf(dir: ActorView['dir'], key: EddieKey): Px {
  const id = `${dir}|${key}`;
  let px = bases.get(id);
  if (!px) {
    const roles = eddieRoles(dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side', key);
    px = paintRoles(dir === 'left' ? mirrorRoles(roles, FW, FH) : roles, FW, EDDIE_PICK.spec.pal);
    bases.set(id, px);
  }
  return px;
}

/** Which frame a view asks for: the anim and the frames spent in it. The swing winds up for 8 frames and lands on the 9th; the solo flips between its two frames every 8. */
export function eddieKeyOf(v: Pick<ActorView, 'anim' | 't'>): EddieKey {
  switch (v.anim) {
    case 'idle': return (v.t / 30) & 1 ? 'idle1' : 'idle0';
    case 'walk': case 'dash': return KEYS[2 + (((v.t / 7) | 0) & 3)] as EddieKey;
    case 'attack': return v.t < 8 ? 'wind' : 'hit';
    case 'cast': return (v.t >> 3) & 1 ? 'solo1' : 'solo0';
    case 'hurt': return 'hurt';
    default: return 'ko';
  }
}

/** The frame to draw for a view: its canvas and the first row with a pixel in it, in the look (flash, tint) the view asks for. */
export function eddieFrameOf(v: ActorView): Frame {
  const key = eddieKeyOf(v);
  return frameFor(frames, `${v.dir}|${key}`, baseOf(v.dir, key), v);
}

/** A frame painted for a facing, for the sheet and the tests. */
export function eddiePx(dir: ActorView['dir'], key: EddieKey): Px { return baseOf(dir, key); }
export const EDDIE_KEYS: readonly EddieKey[] = KEYS;
