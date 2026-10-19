// The army's foes as the game draws them (docs/level-14.md): the trooper (16 by 16) and the Commander (24 by 24), from the painters in ch5/. The sim's
// state picks the pose, the way actor_demo.ts's demoSpec does for the Demogorgon, and the frame comes out as a canvas with the white flash, the dithered
// tint and the hidden look (actor_kit.ts), drawn by actors.ts with the same shadow, bar and "!" as the others.
//
// Trooper: hurt and ko go by the anim. Attacking is the aim under the "!", then the burst with its muzzle flash flickering. A flank (pose) is the
// walk with the torso turned. Walking carries the shield, standing with it up (guarding) is the block, and standing with it down (recovering or
// stunned) holds the rifle at the ready. A `broken` trooper has no shield in any of them.
// Commander: ko; then the pose (plant, charge, stun); then hurt; his blow is the charge's lunge. `cracked` dulls and breaks the shield in all of them.
import type { ActorView } from '../core/types.ts';
import { frameFor } from './actor_kit.ts';
import type { Frame } from './actor_kit.ts';
import { commanderPx } from './ch5/commander.ts';
import type { CommanderPose } from './ch5/commander.ts';
import { trooperPx } from './ch5/trooper.ts';
import type { TrooperPose } from './ch5/trooper.ts';

type Asked = Pick<ActorView, 'anim' | 't' | 'pose' | 'alert' | 'guarding' | 'broken' | 'cracked'>;
export type Slot<P> = [pose: P, frame: number];

const walkFrame = (t: number): number => ((t / 7) | 0) & 1;
const breath = (t: number): number => ((t / 30) | 0) & 1;

/** The trooper's pose and frame for what the sim says he is doing. */
export function trooperSlot(v: Asked): Slot<TrooperPose> {
  if (v.anim === 'ko') return ['ko', 0];
  if (v.anim === 'hurt') return ['hurt', 0];
  if (v.anim === 'attack' || v.anim === 'cast') return v.alert ? ['aim', 0] : ['burst', ((v.t / 3) | 0) & 1];
  if (v.pose === 'flank') return ['flank', walkFrame(v.t)];
  if (v.anim === 'walk' || v.anim === 'dash') return ['walk', walkFrame(v.t)];
  if (v.alert) return ['aim', 0];
  if (v.broken) return ['idle', breath(v.t)];
  return v.guarding === false ? ['aim', 0] : ['shield', 0];
}

/** The Commander's pose and frame. */
export function commanderSlot(v: Asked): Slot<CommanderPose> {
  if (v.anim === 'ko') return ['ko', 0];
  if (v.pose === 'plant') return ['plant', (v.t >> 3) & 1];
  if (v.pose === 'charge') return ['charge', (v.t >> 2) & 1];
  if (v.pose === 'stun') return ['stun', (v.t >> 4) & 1];
  if (v.anim === 'hurt') return ['hurt', 0];
  if (v.anim === 'attack') return ['charge', v.alert ? 0 : 1];
  if (v.anim === 'walk' || v.anim === 'dash') return ['walk', walkFrame(v.t)];
  return ['idle', breath(v.t)];
}

const frames = new Map<string, Frame>();

/** The canvas for a trooper in the view's pose, facing and look. */
export function trooperFrame(v: ActorView): Frame {
  const [pose, f] = trooperSlot(v), broken = v.broken === true;
  return frameFor(frames, `t${v.dir}${pose}${f}${broken ? 1 : 0}`, trooperPx(v.dir, pose, f, broken), v);
}

/** The canvas for the Commander in the view's pose, facing and look. */
export function commanderFrame(v: ActorView): Frame {
  const [pose, f] = commanderSlot(v), cracked = v.cracked === true;
  return frameFor(frames, `c${v.dir}${pose}${f}${cracked ? 1 : 0}`, commanderPx(v.dir, pose, f, cracked), v);
}
