// The threats the careful bot steps out of (bot.ts calls these; the careless bot ignores them all). Each one reads only what a
// player sees: the red "!", the pose and where the foe stands.
import type { SimView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';

/** What a threat check needs of a foe. */
export interface Threat { kind: string; x: number; y: number; d: number; windup: boolean }

/** A demodog this close is the fight: the bot does not back away from a lash or a swell while one is closing in. */
const DOG_BUSY = 240;

/** A wind-up whose reach the hero is in: the vine's lash or the pod's swell. */
const reachThreat = (f: Threat): boolean =>
  f.windup && ((f.kind === 'vine' && f.d <= ENEMY_DEFS.vine.x.reach + 10) || (f.kind === 'pod' && f.d <= ENEMY_DEFS.pod.x.cloud + 10));

/**
 * The vine or pod the hero should back away from, or null. Not while a demodog is near: a lash or a spore cloud costs a few HP and
 * the dogs are what bite, so backing off a pod with a pack circling only left the hero out of the fight (in 2.1 it cost the careful
 * bot KOs the careless one never took).
 */
export function backOffFrom<F extends Threat>(foes: F[]): F | null {
  if (foes.some((f) => f.kind === 'demodog' && f.d < DOG_BUSY)) return null;
  return foes.find(reachThreat) ?? null;
}

/** A Warden winding up a slam close enough to reach the hero: the growing ring is on it. */
export function slamThreat<F extends Threat>(v: SimView, foes: F[]): F | null {
  const w = ENEMY_DEFS.warden.x;
  for (const f of foes) {
    if (f.kind !== 'warden' || !f.windup || f.d > w.slamRadius + 12) continue;
    if (v.fx.some((r) => r.kind === 'ring' && r.life === w.slamWindup && Math.hypot(r.x - f.x, r.y - f.y) < 8)) return f;
  }
  return null;
}

/**
 * The nearest inbound dart or rifle round that will pass within a body width of the hero: its time to impact and a side to step. The step
 * goes to the side `walkable` says is open, 22 px out.
 */
export function dartThreat(v: SimView, hx: number, hy: number, walkable: (x: number, y: number) => boolean): { tti: number; sx: number; sy: number } | null {
  let best: { tti: number; sx: number; sy: number } | null = null;
  for (const f of v.fx) {
    if (f.kind !== 'dart' && f.kind !== 'bullet') continue;
    const speed = f.kind === 'dart' ? ENEMY_DEFS.agent.x.dart : ENEMY_DEFS.soldier.x.speed;
    const vx = Math.cos(f.angle), vy = Math.sin(f.angle);
    const rx = hx - f.x, ry = hy - 7 - f.y;
    const along = rx * vx + ry * vy;
    const lat = rx * vy - ry * vx;
    if (along < 0 || along > 100 || Math.abs(lat) > 11) continue;
    const tti = along / speed;
    if (best && best.tti <= tti) continue;
    let side = lat >= 0 ? -1 : 1;
    if (!walkable(hx - vy * side * 22, hy + vx * side * 22)) side = -side;
    best = { tti, sx: -vy * side, sy: vx * side };
  }
  return best;
}
