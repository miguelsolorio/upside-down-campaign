// The riot guard's shield (the Warden's and the camp guard's too), shared by the damage code and the brains. A guard faces one of four ways (its `dir`), and
// its shield covers an arc around that facing. It is up unless the guard is recovering, broken or stunned.
import type { Dir } from '../core/types.ts';
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, S } from '../combat/state.ts';
import { angleDiff } from '../combat/space.ts';

const RAD = Math.PI / 180;

/** The way a guard faces, in radians (0 = right, y down). */
export const DIR_ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

/** The kinds that carry a shield: the riot guard, the Warden, the camp guard with his baton and, in chapter 5, the trooper and the Commander
 *  (stand-ins on this brain until Sim writes theirs, docs/level-14.md). */
export const isShieldedKind = (kind: string): boolean => kind === 'guard' || kind === 'warden' || kind === 'kbaton' || kind === 'trooper' || kind === 'commander';

export function isShielded(e: Enemy): boolean { return isShieldedKind(e.kind); }

/** True while the shield is up. A recovering, broken, stunned, dormant or dead guard has it down. */
export function guarding(e: Enemy): boolean {
  return isShielded(e) && !e.dead && !e.dormant && e.broken <= 0 && e.stat.stun <= 0 && e.mode !== 'recover';
}

/** True when a direction (the angle from the guard toward where a hit or the hero is) is inside the shield arc. */
export function inFront(e: Enemy, toward: number): boolean {
  return angleDiff(toward, DIR_ANGLE[e.dir]) <= ENEMY_DEFS[e.kind].x.arc * RAD;
}

/** Stops a wind-up in progress, and takes down the slam's growing ring. */
export function cancelAttack(s: S, e: Enemy): void {
  if (e.ring) {
    const ring = e.ring;
    s.fx = s.fx.filter((f) => f !== ring);
    e.ring = null;
  }
  e.slam = false;
  if (e.mode === 'windup' || e.mode === 'lunge') { e.mode = 'chase'; e.modeT = 0; }
}

/** A hard shove: the shield is down for breakT frames, then it cannot be broken again for a while. */
export function breakShield(s: S, e: Enemy): void {
  const x = ENEMY_DEFS[e.kind].x;
  cancelAttack(s, e);
  e.broken = x.breakT;
  e.grace = x.breakT + x.grace;
}
