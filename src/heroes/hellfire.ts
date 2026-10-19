// What Eddie does to the hits the party deals, kept apart from eddie.ts so the damage code can ask without a cycle.
//   Metalhead (Lv 3): his ATK is up 10 percent.
//   Hellfire DM (Lv 6): a boss or an elite he hits is marked for 300 frames (ActorView.marked), and every party hit on it deals 20 percent
//   more. A fresh hit of his starts the 300 frames again.
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';

/** Eddie's ATK multiplier: 1.1 from Lv 3, 1 for everyone else. */
export function metalMul(h: Pick<Hero, 'id' | 'level'>): number {
  return h.id === 'eddie' && hasTalent('eddie', h.level) ? 1 + HERO_DEFS.eddie.basic.x.metal : 1;
}

/** A boss or an elite: the foes Hellfire DM marks. A boss is any of the stage bosses, a Mind Flayer leg, or anything in the `boss` group. */
export function isBossOrElite(e: Enemy): boolean {
  // A memory orb's mark is the clock's (ActorView.marked), not Eddie's.
  if (e.orb !== null) return false;
  return e.elite || e.demo !== null || e.alpha !== null || e.grigori !== null || e.billy !== null || e.flayer !== null
    || e.leg !== null || e.vecna !== null || e.kind === 'warden' || e.group === 'boss';
}

/** Eddie has hit `e`: from Lv 6 a boss or an elite carries the mark for the next 300 frames. */
export function markFoe(s: S, by: Hero, e: Enemy): void {
  if (by.id !== 'eddie' || !hasTalent('eddie', by.level, LV6) || !isBossOrElite(e)) return;
  s.t6.marks.set(e.uid, HERO_DEFS.eddie.special.x.mark as number);
}

export function isMarked(s: S, e: Enemy): boolean {
  return (s.t6.marks.get(e.uid) ?? 0) > 0;
}

/** What a hit on `e` is multiplied by: 1.2 while it is marked. */
export function markMul(s: S, e: Enemy): number {
  return isMarked(s, e) ? 1 + HERO_DEFS.eddie.special.x.markBonus : 1;
}

/** One frame of the marks' clocks. A mark ends with its time or with the foe. */
export function tickMarks(s: S): void {
  for (const [uid, n] of s.t6.marks) {
    if (n <= 1 || s.enemies.every((e) => e.uid !== uid || e.dead)) s.t6.marks.delete(uid);
    else s.t6.marks.set(uid, n - 1);
  }
}
