// Will's Cold spot (Lv 3): while he is the active hero, an enemy that was spawned `hidden` within 72 px of him shows, and
// takes 15 percent more damage from the party. Eleven's Sensory tank (Lv 6, sensory.ts) does the same within its reach while it
// runs. Kept apart from will.ts so the damage code can ask without a cycle.
import { hasTalent } from '../progression/talents.ts';
import type { Enemy, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { dist } from '../combat/space.ts';
import { sensing } from './sensory.ts';

export const COLD_RADIUS = 72;
export const COLD_BONUS = 1.15;

/** True when Cold spot, or Eleven's Sensory tank, has this enemy in its grip. */
export function coldSpot(s: S, e: Enemy): boolean {
  if (!e.cloaked || e.dead || e.dormant) return false;
  const h = activeHero(s);
  if (sensing(s, e.x, e.y)) return true;
  return h.id === 'will' && !h.ko && hasTalent('will', h.level) && dist(h.x, h.y, e.x, e.y) <= COLD_RADIUS;
}
