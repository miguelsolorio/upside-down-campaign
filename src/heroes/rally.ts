// Mike's Rally (Lv 6): when the DM screen goes up, the whole party's ATK is up 20 percent for 10 s. Another screen refreshes it;
// it never stacks. It multiplies with Inspiration. heroAtk (combat/damage.ts) reads rallyMul.
//
// What gfx sees: a gold 'ring' round Mike as it starts, and a RALLY floater.
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { addFx, floater } from '../combat/fx.ts';

/** The screen is up: rally the party if Mike has the talent. */
export function rally(s: S, h: Hero): void {
  if (h.id !== 'mike' || !hasTalent('mike', h.level, LV6)) return;
  s.t6.rally = HERO_DEFS.mike.special.x.rally;
  addFx(s, 'ring', h.x, h.y - 6, h.dir, 0, 24, 40, 40);
  floater(s, 'RALLY', h.x, h.y - 24, 'yellow', true, 40);
}

/** What the party's ATK is multiplied by right now. */
export function rallyMul(s: S): number {
  return s.t6.rally > 0 ? 1 + HERO_DEFS.mike.special.x.rallyAtk : 1;
}
