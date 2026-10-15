// Talents. Level 1 only grants the Lv 3 talent of each hero.
import type { HeroId } from '../core/types.ts';

export interface Talent {
  name: string;
  /** One line, 32 characters or fewer. */
  text: string;
  level: number;
}

export const TALENT_TEXT_MAX = 32;

export const TALENTS: Record<HeroId, Talent> = {
  mike: { name: 'DM fiat', text: 'First hit of a fight crits', level: 3 },
  dustin: { name: 'Compass', text: '+10% quarter drops', level: 3 },
  lucas: { name: 'Sharp eye', text: '+15% crit chance', level: 3 },
  eleven: { name: 'Flip', text: 'Push hits harder, flies farther', level: 3 },
  will: { name: 'Cold spot', text: 'Shows hidden foes nearby', level: 3 },
  max: { name: 'High score', text: '+10% quarters, +5% crit', level: 3 },
  steve: { name: 'Hair of steel', text: 'Shrugs off a hit after 5s unhurt', level: 3 },
};

/** True once the hero is at or past the talent's level. */
export function hasTalent(hero: HeroId, level: number): boolean {
  return level >= TALENTS[hero].level;
}

/** The talent a hero gains on reaching exactly `level`, or null. */
export function talentGainedAt(hero: HeroId, level: number): Talent | null {
  const t = TALENTS[hero];
  return t.level === level ? t : null;
}
