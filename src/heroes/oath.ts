// Mike's Oath (Lv 9): the first ally to fall in a stage, while Mike stands, gets back up oathWait frames later (a second and a half)
// with half their max HP, beside whoever is leading. One a stage: the flag is kept in S.t6, which every stage and retry starts afresh.
//   - Mike must stand when the ally falls and when the beat is over. If he falls in between, the oath is broken: nobody is raised and
//     it is not spent.
//   - A wipe ends it: the sim's pending timer only runs while play does, and getting up from a wipe resets it (resetTalentState).
//   - It does not touch the KO count: the ally did fall.
// What gfx sees: a 'heal' and a 'ring' on the ally as they stand, an OATH floater over Mike when it is sworn and an UP over them.
import { HERO_DEFS } from './defs.ts';
import { LV9, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';
import { standHero } from '../combat/pokes.ts';

/** `fallen` has just gone down (combat/party.ts). If Mike stands and has not sworn yet this stage, he swears now. */
export function swearOath(s: S, fallen: Hero): void {
  const mike = s.heroes.find((h) => h.id === 'mike');
  if (!mike || mike === fallen || mike.ko || mike.hp <= 0 || s.t6.oath || !hasTalent('mike', mike.level, LV9)) return;
  s.t6.oath = true;
  s.t6.oathFor = fallen.id;
  s.t6.oathT = HERO_DEFS.mike.special.x.oathWait;
  floater(s, 'OATH', mike.x, mike.y - 24, 'yellow', true, 60);
  addFx(s, 'ring', mike.x, mike.y - 6, mike.dir, 0, 30, 44, 44);
}

/** Counts the beat down and, when it ends, raises the ally. Called once a tick while play runs. */
export function stepOath(s: S): void {
  const t = s.t6;
  if (t.oathT <= 0 || --t.oathT > 0) return;
  const mike = s.heroes.find((h) => h.id === 'mike');
  const who = s.heroes.find((h) => h.id === t.oathFor);
  t.oathFor = null;
  if (!mike || mike.ko || !who || !who.ko) { t.oath = false; return; }
  // They stand beside the hero in play, so the party is not left a screen apart.
  const lead = activeHero(s);
  who.x = lead.x; who.y = lead.y; who.dir = lead.dir; who.z = 12;
  standHero(s, who, HERO_DEFS.mike.special.x.oathHp);
  sfx(s, 'heal');
  addFx(s, 'heal', who.x, who.y - 6, who.dir, 0, 30, 24, 24);
  addFx(s, 'ring', who.x, who.y - 6, who.dir, 0, 24, 40, 40);
  floater(s, 'UP', who.x, who.y - 24, 'leaf', true, 60);
}
