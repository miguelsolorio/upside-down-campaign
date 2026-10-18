// Max's Extra life (Lv 9): once a stage, a KO leaves her at 1 HP with 2 s of invulnerability instead. combat/party.ts asks it of every
// hero at 0 HP before the KO is made, so it catches whatever took the HP, a curse included (a curse must bring a hero to 0 HP and
// let reapHeroes notice, as every other hit does). It is not a KO: no `heroKO`, no body, no count in the run's stats, and when she
// is the last hero standing the run goes on. A Flayed or Grigori holding her lets go. The flag is in S.t6, which every stage and retry
// starts afresh.
// What gfx sees: a 'ring' round her and a 1UP floater, and the level-up chime.
import { HERO_DEFS } from './defs.ts';
import { LV9, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';

/** True when Max took the fall. The caller then leaves her standing. */
export function extraLife(s: S, h: Hero): boolean {
  if (h.id !== 'max' || h.ko || s.t6.extra || !hasTalent('max', h.level, LV9)) return false;
  const d = HERO_DEFS.max.special.x;
  s.t6.extra = true;
  h.hp = d.lifeHp;
  h.invuln = d.lifeSafe;
  h.blink = true;
  if (s.hold && s.hold.hero === h) s.hold = null;
  sfx(s, 'levelUp');
  addFx(s, 'ring', h.x, h.y - 6, h.dir, 0, 30, 44, 44);
  floater(s, '1UP', h.x, h.y - 24, 'yellow', true, 60);
  return true;
}
