// What a demobat's height, its flock and its death do to it (docs/level-12.md, "The demobat"). The damage code, the kills, the view and the sim
// call these; the brain is demobat.ts.
//
// It flies: z is its height over its shadow, 10 to 14 px while it circles (HOVER and BOB) and 2 at the bottom of a dive or a stun. A melee swing or
// an area hit (a blast, a spray, a shockwave) only reaches it while it is low, z under x.low, or stunned. A shot, a beam, a burst and Eddie's pulse
// reach it at any height (HitOpts.air, HitOpts.beam). Its flock is every awake demobat of its group: they take the slots of one ring round the hero
// and send one bat down at a time.
import type { ActorView } from '../core/types.ts';
import type { Enemy, S } from '../combat/state.ts';
import type { HitOpts } from '../combat/damage.ts';
import { sparks } from '../combat/fx.ts';
import { BODY_Y } from '../combat/space.ts';
import { ENEMY_DEFS } from './defs.ts';

/** What a demobat is doing (enemies/demobat.ts). orbit: circling the hero. wind: the "!" before a dive. dive: the dive. climb: back up. stun: stunned, on its back. */
export type BatMove = 'orbit' | 'wind' | 'dive' | 'climb' | 'stun';

/**
 * A demobat's own state. Every other enemy has `bat: null`. `t` is the frames left in the current move, `last` the frame its last dive began (the
 * flock sends the bat that has waited longest) and `sent` that a miss on the roof sent it, so the dive hits for roofPower.
 */
export interface BatState { move: BatMove; t: number; last: number; sent: boolean }

/** The height it circles at, how far that swings either way, and the height of a dive's bottom or a stun. */
export const HOVER = 12;
export const BOB = 2;
export const LOW_Z = 2;

export const newBat = (): BatState => ({ move: 'orbit', t: 0, last: -9999, sent: false });

/** The pose gfx draws: crouch under the "!", charge in the dive, stun when stunned. */
export function batPose(b: BatState): ActorView['pose'] {
  return b.move === 'wind' ? 'crouch' : b.move === 'dive' ? 'charge' : b.move === 'stun' ? 'stun' : undefined;
}

/** True when a hit with these options can touch the enemy at its height. Everything but a demobat is always in reach. */
export function batReached(e: Enemy, o: HitOpts): boolean {
  return e.bat === null || o.air === true || o.beam === true || e.z < ENEMY_DEFS.demobat.x.low || e.stat.stun > 0;
}

/** The demobats that fly with this one: awake, alive, of its group, in the order they were made. It is one of them. */
export function flockOf(s: S, e: Enemy): Enemy[] {
  return s.enemies.filter((o) => o.bat !== null && !o.dead && !o.dormant && o.hp > 0 && o.group === e.group);
}

/** A demobat dies in a flash of sparks where its body is, not where its shadow is. */
export function batDeath(s: S, e: Enemy): void {
  if (e.bat) sparks(s, e.x, e.y - e.z - BODY_Y, 5);
}
