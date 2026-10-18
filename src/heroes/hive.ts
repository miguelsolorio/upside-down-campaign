// Will's Hive link (Lv 9): a charged swap to him (the same one that brings the invulnerability) links him to the hive for 8 s. While it
// lasts and he is the active hero, a `hidden` path within hiveR px of him shows itself as if he stood beside it, 320 px against the
// 40 a plain `sense` needs and the 160 of Eleven's Sensory tank (heroes/sensory.ts reads it for senseRange). Tagging out ends it. A
// quick swap, inside the swap cooldown, does not start it.
// What gfx sees: a 'ring' as wide as the link's reach round him, a HIVE floater and the 'reveal' sound. Each path it opens shows its
// own 'reveal', as ever.
import { HERO_DEFS } from './defs.ts';
import { LV9, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';

/** A charged swap to `h` has landed. */
export function hiveLink(s: S, h: Hero): void {
  if (h.id !== 'will' || !hasTalent('will', h.level, LV9)) return;
  const d = HERO_DEFS.will.special;
  s.t6.hive = d.x.hive;
  sfx(s, 'reveal');
  addFx(s, 'ring', h.x, h.y - 6, h.dir, 0, 36, d.x.hiveR * 2, d.x.hiveR * 2);
  floater(s, 'HIVE', h.x, h.y - 24, 'purple', false, 40);
}

/** True while the link runs for the active hero. */
export function linked(s: S): boolean {
  const h = activeHero(s);
  return h.id === 'will' && !h.ko && s.t6.hive > 0;
}
