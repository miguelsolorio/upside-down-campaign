// What Steve does to the hits the party takes, kept apart from steve.ts so the damage code can ask without a cycle.
//   Babysit: for 5 s he takes 40 percent less and the whole party's DEF is up 15 percent.
//   Hair of steel (Lv 3): the first hit after 5 s without taking damage does nothing, and a SAVED floats.
import { HERO_DEFS } from './defs.ts';
import { hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { floater, sfx, sparks } from '../combat/fx.ts';

/** Frames a hero must go without taking damage before Hair of steel covers the next hit. */
export const HAIR_FRAMES = 300;

/** The DEF a hero fights with now: Babysit lifts the whole party's. */
export function heroDef(s: S, h: Hero): number {
  return h.st.def * (s.babysit > 0 ? 1 + HERO_DEFS.steve.special.x.partyDef : 1);
}

/**
 * Steve is about to take `dmg`. Returns what he takes: 0 when Hair of steel covers it (and it is spent), the damage less
 * Babysit's cut while it holds, or `dmg` itself. Anyone else takes `dmg` as it is.
 */
export function steveTakes(s: S, h: Hero, dmg: number): number {
  if (h.id !== 'steve') return dmg;
  if (h.unhurt >= HAIR_FRAMES && hasTalent('steve', h.level)) {
    h.unhurt = 0;
    floater(s, 'SAVED', h.x, h.y - 18, 'sky', true, 40);
    sparks(s, h.x, h.y - 7, 4);
    sfx(s, 'block');
    return 0;
  }
  if (s.babysit > 0) return Math.max(1, Math.round(dmg * (1 - HERO_DEFS.steve.special.x.guard)));
  return dmg;
}
