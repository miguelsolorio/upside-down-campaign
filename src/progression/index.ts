// Public API of progression: the XP curve, the d20 level-up roll and talents.
export {
  MAX_LEVEL, STAT_KEYS, POINT_VALUE, LEVEL_UP_HEAL, INSPIRATION_SECONDS, INSPIRATION_ATK, BENCH_XP_SHARE,
  emptyStats, xpToNext, xpForLevel, xpShare, addXp, rollD20, bonusPoints, rollLevelUp,
} from './xp.ts';
export type { Rng, Stats, XpResult, LevelRoll } from './xp.ts';
export { TALENTS, TALENT_TEXT_MAX, hasTalent, talentGainedAt } from './talents.ts';
export type { Talent } from './talents.ts';
