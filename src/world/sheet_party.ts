// The heroes the pause menu's character sheet shows, from the live party and the HUD. Pure, so it is out of the play scene.
import type { HeroSnapshot, PartyHud } from '../core/types.ts';
import type { CharSheetHero } from '../ui/index.ts';
import { HERO_IDS } from '../heroes/index.ts';
import { emptyStats, xpToNext } from '../progression/index.ts';

/** Every hero for the character sheet. Those in the party come with their level, XP and d20 bonus. A hero who isn't in the party
 *  comes in at Lv 1. */
export function sheetHeroes(live: HeroSnapshot[], hud: PartyHud[]): CharSheetHero[] {
  return HERO_IDS.map((id): CharSheetHero => {
    const slot = live.findIndex((m) => m.id === id);
    const p = live[slot];
    const h = hud.find((m) => m.id === id);
    if (!p) return { id, level: 1, xp: 0, xpNext: xpToNext(1), bonus: emptyStats(), joined: false, active: false, slot: -1 };
    return {
      id, level: p.level, xp: p.xp, xpNext: h?.xpNext ?? xpToNext(p.level), bonus: { ...emptyStats(), ...p.bonus },
      joined: true, active: h?.active ?? false, slot,
    };
  });
}
