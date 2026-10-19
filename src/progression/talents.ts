// Talents. Each of the nine heroes has three: at Lv 3, Lv 6 and Lv 9. Hopper and Eddie's come with their kits.
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
/** The level of the third. hasTalent(id, level, LV9) asks for it. */
export const LV9 = 9;

/** Each hero's talents, lowest level first. */
export const TALENTS: Record<HeroId, Talent[]> = {
  mike: [
    { name: 'DM fiat', text: 'First hit of a fight crits', level: 3 },
    { name: 'Rally', text: 'DM screen: party +20% ATK 10s', level: 6 },
    { name: 'Oath', text: 'Raises one fallen ally a stage', level: 9 },
  ],
  dustin: [
    { name: 'Compass', text: '+10% quarter drops', level: 3 },
    { name: 'Dart', text: 'Spray calls Dart to bite, 12s', level: 6 },
    { name: 'Cerebro', text: 'Hold Special: Suzie, MP +30%', level: 9 },
  ],
  lucas: [
    { name: 'Sharp eye', text: '+15% crit chance', level: 3 },
    { name: 'Camo', text: 'Triple shot hides him for 3s', level: 6 },
    { name: 'Volley', text: 'Triple shot fires five ways', level: 9 },
  ],
  eleven: [
    { name: 'Flip', text: 'Push hits harder, flies farther', level: 3 },
    { name: 'Sensory tank', text: 'Hold Special: sense far, 8s', level: 6 },
    { name: 'Overload', text: 'Mind Blast widens and stuns', level: 9 },
  ],
  will: [
    { name: 'Cold spot', text: 'Shows hidden foes nearby', level: 3 },
    { name: 'Cleric', text: 'Hold Special: heal party 30%', level: 6 },
    { name: 'Hive link', text: 'Swap in: hidden paths show, 8s', level: 9 },
  ],
  max: [
    { name: 'High score', text: '+10% quarters, +5% crit', level: 3 },
    { name: 'Kickflip', text: 'Skate dash ends in a shockwave', level: 6 },
    { name: 'Extra life', text: 'Once a stage, a KO leaves 1 HP', level: 9 },
  ],
  steve: [
    { name: 'Hair of steel', text: 'Shrugs off a hit after 5s unhurt', level: 3 },
    { name: 'Ahoy', text: 'Swap in leaps onto a foe', level: 6 },
    { name: 'King Steve', text: 'Under 30% HP: +30% ATK', level: 9 },
  ],
  robin: [
    { name: 'Linguist', text: 'Word vomit confuses for 4s', level: 3 },
    { name: 'Triple scoop', text: 'Scoop toss throws three', level: 6 },
    { name: 'Dry wit', text: 'Confused foes take +25%', level: 9 },
  ],
  nancy: [
    { name: 'Trap kit', text: 'Shotgun drops a bear trap', level: 3 },
    { name: 'Molotov', text: 'Hold Special: fire pool, burns', level: 6 },
    { name: 'Final girl', text: '+40% ATK with two allies down', level: 9 },
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
