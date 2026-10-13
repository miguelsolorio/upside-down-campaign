// XP curve, the bench split and the d20 level-up roll. Pure: no DOM, no gfx, no audio.
import type { StatKey } from '../core/types.ts';

export type Rng = () => number;
export type Stats = Record<StatKey, number>;

export const MAX_LEVEL = 12;
export const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'spd'];
/** What one bonus point is worth in stat units. HP points are bigger so they feel like something. */
export const POINT_VALUE: Stats = { hp: 3, mp: 1, atk: 1, def: 1, spd: 1 };
/** Level-up heals this fraction of max HP and MP. */
export const LEVEL_UP_HEAL = 0.5;
/** Seconds of Inspiration a natural 20 on a level-up roll grants, and its ATK bonus. */
export const INSPIRATION_SECONDS = 20;
export const INSPIRATION_ATK = 0.15;
export const BENCH_XP_SHARE = 0.5;

export function emptyStats(): Stats { return { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 }; }

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(18 * Math.pow(level, 1.7));
}

/** Total XP a hero earns between level 1 and `level`. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

/** XP a hero receives from a reward of `n`: everything for the active hero, half (rounded down) for the bench. */
export function xpShare(n: number, active: boolean): number {
  return active ? n : Math.floor(n * BENCH_XP_SHARE);
}

export interface XpResult {
  level: number;
  /** XP carried toward the next level. */
  xp: number;
  /** Each entry is one level gained, in order. */
  gained: number[];
}

/** Adds XP to a hero at (level, xp). Stops at the cap, where XP reads as a full bar. */
export function addXp(level: number, xp: number, amount: number): XpResult {
  let l = level;
  let x = xp + Math.max(0, Math.floor(amount));
  const gained: number[] = [];
  while (l < MAX_LEVEL && x >= xpToNext(l)) {
    x -= xpToNext(l);
    l++;
    gained.push(l);
  }
  if (l >= MAX_LEVEL) x = 0;
  return { level: l, xp: x, gained };
}

export function rollD20(rng: Rng): number {
  return 1 + Math.floor(rng() * 20);
}

/** Bonus points for a roll: floor(roll / 5), except a natural 20, which gives five. */
export function bonusPoints(roll: number): number {
  return roll >= 20 ? 5 : Math.floor(roll / 5);
}

function pickWeighted(rng: Rng, weights: Stats): StatKey {
  let total = 0;
  for (const k of STAT_KEYS) total += Math.max(0, weights[k]);
  if (total <= 0) return 'hp';
  let r = rng() * total;
  for (const k of STAT_KEYS) {
    r -= Math.max(0, weights[k]);
    if (r < 0) return k;
  }
  return 'hp';
}

export interface LevelRoll {
  /** The d20 that sized the bonus. With advantage, the higher of two dice. */
  roll: number;
  advantage: boolean;
  points: number;
  /** Bonus points per stat, in points (not stat units). */
  spread: Stats;
  /** A 1 gives nothing and the hero's next roll has advantage. */
  nextAdvantage: boolean;
  /** A 20: full heal and Inspiration. */
  natTwenty: boolean;
}

/**
 * One level-up roll. rng is called once for the die (twice with advantage), then once per bonus point.
 * Nothing here can make a hero worse: points are never negative.
 */
export function rollLevelUp(rng: Rng, weights: Stats, advantage: boolean): LevelRoll {
  let roll = rollD20(rng);
  if (advantage) roll = Math.max(roll, rollD20(rng));
  const points = bonusPoints(roll);
  const spread = emptyStats();
  for (let i = 0; i < points; i++) spread[pickWeighted(rng, weights)]++;
  return { roll, advantage, points, spread, nextAdvantage: roll === 1, natTwenty: roll === 20 };
}
