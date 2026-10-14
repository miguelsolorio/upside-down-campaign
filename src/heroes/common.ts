// Helpers shared by the four heroes' moves.
import type { AbilityDef } from './defs.ts';
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, Pos, S } from '../combat/state.ts';
import { angleDiff, BODY_Y, dist, los } from '../combat/space.ts';
import { schedule } from '../combat/fx.ts';

export const rad = (deg: number): number => (deg * Math.PI) / 180;

/** SPD above the Lv 1 value shortens cooldowns and speeds the hero up, 1.5 percent a point. */
export function speedFactor(h: Hero): number {
  return 1 + 0.015 * (h.st.spd - HERO_DEFS[h.id].base.spd);
}

export interface ActOverride { dur?: number; cd?: number }

/** Starts an attack or cast: locks the animation, sets the lock factor and the cooldown. Returns the action id. */
export function beginAct(h: Hero, ab: AbilityDef, kind: 'basic' | 'special', over: ActOverride = {}): number {
  h.act = kind;
  h.actT = over.dur ?? ab.dur;
  h.lock = ab.lock;
  h.anim = kind === 'special' ? 'cast' : 'attack';
  h.animT = 0;
  const cd = over.cd ?? ab.cd;
  if (kind === 'basic') h.cdBasic = Math.max(1, Math.round(cd / speedFactor(h)));
  else h.cdSpecial = cd;
  return h.actId;
}

/** Runs fn after `frames` unless the hero's action was cancelled (hurt, swap, KO) in the meantime. */
export function later(s: S, h: Hero, frames: number, fn: () => void): void {
  const id = h.actId;
  if (frames <= 0) { fn(); return; }
  schedule(s, frames, () => { if (h.actId === id && !h.ko) fn(); });
}

/** The hero's chest, where swings and shots start. */
export function chest(h: Hero): Pos { return { x: h.x, y: h.y - BODY_Y }; }

/** Calls fn for each living, awake enemy whose body center is inside the cone, with a clear line from the hero. */
export function coneHits(s: S, h: Hero, aim: number, reach: number, half: number, fn: (e: Enemy, angleTo: number) => void): void {
  const ox = h.x, oy = h.y - BODY_Y;
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0) continue;
    const dx = e.x - ox, dy = e.y - BODY_Y - oy;
    const d = Math.hypot(dx, dy);
    if (d > reach + 6) continue;
    const a = Math.atan2(dy, dx);
    if (d >= 9 && angleDiff(a, aim) > half) continue;
    if (!los(s, h.x, h.y, e.x, e.y)) continue;
    fn(e, a);
  }
}

/** Chord width of a cone at its reach, for effect sizing. */
export function chord(reach: number, half: number): number {
  return Math.round(2 * reach * Math.sin(Math.min(half, Math.PI / 2)));
}

export { dist };
