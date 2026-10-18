// Talents. Each hero has two so far: one at Lv 3 and one at Lv 6. Lv 9 is still to come.
import type { HeroId } from '../core/types.ts';

export interface Talent {
  name: string;
  /** One line, 32 characters or fewer. */
  text: string;
  level: number;
}

export const TALENT_TEXT_MAX = 32;
/** The level of the second talent. hasTalent(id, level, LV6) asks for it. */
export const LV6 = 6;

/** Each hero's talents, lowest level first. */
export const TALENTS: Record<HeroId, Talent[]> = {
  mike: [
    { name: 'DM fiat', text: 'First hit of a fight crits', level: 3 },
    { name: 'Rally', text: 'DM screen: party +20% ATK 10s', level: 6 },
  ],
  dustin: [
    { name: 'Compass', text: '+10% quarter drops', level: 3 },
    { name: 'Dart', text: 'Spray calls Dart to bite, 12s', level: 6 },
  ],
  lucas: [
    { name: 'Sharp eye', text: '+15% crit chance', level: 3 },
    { name: 'Camo', text: 'Triple shot hides him for 3s', level: 6 },
  ],
  eleven: [
    { name: 'Flip', text: 'Push hits harder, flies farther', level: 3 },
    { name: 'Sensory tank', text: 'Hold Special: sense far, 8s', level: 6 },
  ],
  will: [
    { name: 'Cold spot', text: 'Shows hidden foes nearby', level: 3 },
    { name: 'Cleric', text: 'Hold Special: heal party 30%', level: 6 },
  ],
  max: [
    { name: 'High score', text: '+10% quarters, +5% crit', level: 3 },
    { name: 'Kickflip', text: 'Skate dash ends in a shockwave', level: 6 },
  ],
  steve: [
    { name: 'Hair of steel', text: 'Shrugs off a hit after 5s unhurt', level: 3 },
    { name: 'Ahoy', text: 'Swap in leaps onto a foe', level: 6 },
  ],
  robin: [
    { name: 'Linguist', text: 'Word vomit confuses for 4s', level: 3 },
    { name: 'Triple scoop', text: 'Scoop toss throws three', level: 6 },
  ],
  nancy: [
    { name: 'Trap kit', text: 'Shotgun drops a bear trap', level: 3 },
    { name: 'Molotov', text: 'Hold Special: fire pool, burns', level: 6 },
  ],
  // Chapter 4 (docs/level-10.md, docs/level-11.md). Hopper plays 4.1 alone; Eddie joins in 4.2. Berserk and Encore are Lv 9.
  hopper: [
    { name: 'Coffee', text: 'Food heals him 25% more', level: 3 },
    { name: 'Wind-up', text: 'Hold Attack: a guard breaker', level: 6 },
  ],
  eddie: [
    { name: 'Metalhead', text: '+10% ATK', level: 3 },
    { name: 'Hellfire DM', text: 'Marks bosses: party +20% dmg', level: 6 },
  ],
};

/** True once the hero is at or past the level of their talent at `at` (the Lv 3 one unless asked). */
export function hasTalent(hero: HeroId, level: number, at = 3): boolean {
  return level >= at && TALENTS[hero].some((t) => t.level === at);
}

/** The talent a hero gains on reaching exactly `level`, or null. */
export function talentGainedAt(hero: HeroId, level: number): Talent | null {
  return TALENTS[hero].find((t) => t.level === level) ?? null;
}
