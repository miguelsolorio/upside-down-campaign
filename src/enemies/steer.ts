// Movement helpers shared by enemy AI: stepping toward a point with detours, and chasing the hero around walls.
import { TILE } from '../core/config.ts';
import type { AnimId } from '../core/types.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { footBlocked, moveBody } from '../combat/space.ts';
import { ensureFlow, flowStep } from '../combat/nav.ts';

export function setEnemyAnim(e: Enemy, anim: AnimId): void {
  if (e.anim !== anim) { e.anim = anim; e.animT = 0; }
}

export function faceHero(e: Enemy, hero: Hero): void {
  e.dir = dirOfVec(hero.x - e.x, hero.y - e.y, e.dir);
}

/**
 * Moves toward (tx, ty) by up to `speed` px. If the straight step is blocked it tries 45 and 90 degree detours,
 * and if all of those are blocked it slides along whichever axis is open. Returns the distance moved.
 */
export function stepToward(s: S, e: Enemy, tx: number, ty: number, speed: number): number {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return 0;
  const sp = Math.min(speed, d);
  const a = Math.atan2(dy, dx);
  const offs = (e.uid & 1) === 0 ? [0, 0.8, -0.8, 1.5, -1.5] : [0, -0.8, 0.8, -1.5, 1.5];
  for (const off of offs) {
    const vx = Math.cos(a + off) * sp, vy = Math.sin(a + off) * sp;
    if (footBlocked(s, e.x + vx, e.y + vy)) continue;
    moveBody(s, e, vx, vy);
    e.dir = dirOfVec(vx, vy, e.dir);
    return sp;
  }
  const moved = moveBody(s, e, Math.cos(a) * sp, Math.sin(a) * sp);
  if (moved > 0) e.dir = dirOfVec(dx, dy, e.dir);
  return moved;
}

/** Walks toward the hero: straight when there is a clear line, otherwise down the BFS flow field. */
export function chaseHero(s: S, e: Enemy, hero: Hero, speed: number, clear: boolean): number {
  if (!clear) {
    const nav = ensureFlow(s, hero.x, hero.y);
    const dist = s.flow.dist;
    if (dist) {
      const next = flowStep(nav, dist, Math.floor(e.x / TILE), Math.floor((e.y - 4) / TILE));
      if (next) return stepToward(s, e, next.x * TILE + TILE / 2, next.y * TILE + 12, speed);
    }
  }
  return stepToward(s, e, hero.x, hero.y, speed);
}
