// What the Creel ghoul's mirror, the light and its death do to it (docs/level-11.md, "The ghoul"). The hit code, the kills, the props and the
// view call these; the brain is ghoul.ts.
//
// In the glass it is nowhere: it is dormant, so it is not in the view, not hittable, not a target and not fighting, whether its group is awake or not
// (GhoulState.awake). It stops being dormant the moment it steps out. A mirror that shatters with ghouls in it kills them with it, for no XP and no
// drop, as a real kill so the group can clear and a retry leaves them dead. A lit lights prop within 48 px makes it take half again.
import type { ActorView } from '../core/types.ts';
import type { Enemy, Prop, S } from '../combat/state.ts';
import type { GhoulState } from '../combat/house.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { dist } from '../combat/space.ts';
import { ENEMY_DEFS } from './defs.ts';

/** A ghoul that starts out in `mirror`, its group awake or not. The mirror counts it, for the share PropView.k shows. */
export function newGhoul(s: S, mirror: string, awake: boolean): GhoulState {
  const m = s.house.mirrors.get(mirror);
  if (m) m.total++; else s.house.mirrors.set(mirror, { total: 1, at: -9999 });
  return { move: 'glass', t: 0, mirror, sx: Number.NaN, sy: Number.NaN, awake };
}

/** Still waiting in its mirror: unseen and untouchable. */
export const inGlass = (e: Enemy): boolean => e.ghoul !== null && e.ghoul.move === 'glass';

/** The pose gfx draws: `rise` while it steps out, nothing otherwise. */
export function ghoulPose(g: GhoulState): ActorView['pose'] {
  return g.move === 'rise' ? 'rise' : undefined;
}

/** How much a hit on this enemy is multiplied by: 1.5 for a ghoul inside the light of a lit lights prop, 1 for everything else. */
export function ghoulTakes(s: S, e: Enemy): number {
  if (!e.ghoul) return 1;
  const x = ENEMY_DEFS.ghoul.x;
  const lit = (p: Prop): boolean => p.kind === 'lights' && (p.state === 'open' || p.state === 'lit');
  return s.props.some((p) => lit(p) && dist(e.x, e.y, p.x + p.w / 2, p.y + p.h / 2) <= x.light) ? x.lightMul : 1;
}

/** The share of a mirror's ghouls still waiting in its glass, 0 to 1. */
export function mirrorK(s: S, p: Prop): number {
  const m = s.house.mirrors.get(p.id);
  if (!m || m.total <= 0 || p.state === 'open') return 0;
  let n = 0;
  for (const e of s.enemies) if (!e.dead && e.ghoul?.mirror === p.id && e.ghoul.move === 'glass') n++;
  return n / m.total;
}

/** A mirror shatters: every ghoul still in its glass dies with it, whether its group is awake or not. They are reaped like any kill, worth nothing. */
export function shatterGhouls(s: S, mirror: string): void {
  for (const e of s.enemies) {
    if (e.dead || !e.ghoul || e.ghoul.mirror !== mirror || e.ghoul.move !== 'glass') continue;
    e.dormant = false;
    e.hp = 0;
    e.xp = 0;
  }
}

/** A ghoul that stepped out dies as glass: a small burst of it and the shatter. One that never left its mirror died with the mirror's own. */
export function glassDeath(s: S, e: Enemy): void {
  if (!e.ghoul || inGlass(e)) return;
  addFx(s, 'glass', e.x, e.y - 8, 'down', 0, 20, 16, 0);
  sfx(s, 'shatter');
}
