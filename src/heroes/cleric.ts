// Will's Cleric (Lv 6): his class turns from Wizard to Cleric (roleAt in defs.ts), and holding Special (hold.ts) heals every living
// hero, the bench too, by 30 percent of their max HP for 12 MP. Then the heal waits 10 s. A KO'd hero stays down.
//
// What gfx sees: a 'heal' fx on every hero it reached, and a '+n' floater over Will for the HP the party got back.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';
import { beginAct } from './common.ts';

/** True once the last heal's wait is over. */
export function healReady(s: S): boolean {
  return s.t6.healCd <= 0;
}

/** Heals the party. The caller has taken the MP. */
export function castHeal(s: S, h: Hero): void {
  const d = HERO_DEFS.will.special;
  beginAct(h, d, 'special');
  s.t6.healCd = d.x.healCd;
  sfx(s, 'heal');
  let total = 0;
  for (const o of s.heroes) {
    if (o.ko) continue;
    const gain = Math.min(o.st.hp - o.hp, Math.round(o.st.hp * d.x.heal));
    if (gain <= 0) continue;
    o.hp += gain;
    total += gain;
    addFx(s, 'heal', o.x, o.y - 6, o.dir, 0, 30, 18, 18);
  }
  addFx(s, 'heal', h.x, h.y - 6, h.dir, 0, 30, 24, 24);
  floater(s, total > 0 ? `+${Math.round(total)}` : 'HEAL', h.x, h.y - 18, 'leaf', true);
}

/** Counts the heal's wait down. */
export function tickHeal(s: S): void {
  if (s.t6.healCd > 0) s.t6.healCd--;
}
