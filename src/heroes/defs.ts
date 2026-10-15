// Hero data for the four Level 1 heroes. Pure data and tiny helpers. The moves themselves live in
// mike.ts, dustin.ts, lucas.ts and eleven.ts and read their numbers from here.
import type { HeroId, SfxId, Utility } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import { STAT_KEYS, emptyStats } from '../progression/xp.ts';
import type { Stats } from '../progression/xp.ts';
import { TALENTS, hasTalent } from '../progression/talents.ts';
import type { Talent } from '../progression/talents.ts';

export interface AbilityDef {
  name: string;
  /** MP cost, 0 for free. */
  mp: number;
  /** Frames before this slot can fire again. */
  cd: number;
  /** Damage multiplier of one hit. 0 means the move deals none. */
  power: number;
  /** Animation length in frames. */
  dur: number;
  /** Frame, counted from the press, when the effect lands. */
  at: number;
  /** Move speed multiplier while the animation plays. */
  lock: number;
  /** Reach in px. Arc radius, shot range, beam length or throw distance, depending on the move. */
  reach: number;
  /** Knockback speed in px per frame. */
  kb: number;
  sfx: SfxId;
  /** Move-specific numbers: half angles, lifetimes, radii. */
  x: Record<string, number>;
}

export interface HeroDef {
  id: HeroId;
  name: string;
  role: string;
  /** Lv 1 stats. hp and mp are maxima. */
  base: Stats;
  /** Fixed gain per level. Fractions accumulate: the stat at level L is base + floor(growth x (L - 1)). */
  growth: Stats;
  /** d20 bonus points are spread over the stats by these weights. */
  weights: Stats;
  /** px per frame at SPD 1 level. */
  speed: number;
  /** Added to the 5 percent base crit chance. */
  crit: number;
  utilities: Utility[];
  basic: AbilityDef;
  special: AbilityDef;
  talent: Talent;
}

const st = (hp: number, mp: number, atk: number, def: number, spd: number): Stats => ({ hp, mp, atk, def, spd });

export const BASE_CRIT = 0.05;

export const HERO_DEFS: Record<HeroId, HeroDef> = {
  mike: {
    id: 'mike', name: CHAR_NAMES.mike, role: 'Paladin',
    base: st(48, 16, 9, 5, 8), growth: st(7, 2, 1.5, 1.2, 0.4), weights: st(3, 1, 3, 3, 0),
    speed: 0.9, crit: 0, utilities: [],
    basic: {
      name: 'Bat', mp: 0, cd: 11, power: 1, dur: 14, at: 6, lock: 0.35, reach: 28, kb: 2.4, sfx: 'swing',
      // half: arc half-angle in degrees. The third swing is wider, harder and stuns.
      x: { half: 65, chainGap: 18, thirdPower: 1.35, thirdReach: 5, thirdHalf: 15, thirdKb: 1.8, thirdCd: 26, thirdDur: 20, thirdAt: 8, stun: 30 },
    },
    special: {
      name: 'DM screen', mp: 6, cd: 30, power: 0, dur: 18, at: 8, lock: 0.2, reach: 20, kb: 0, sfx: 'shield',
      // life: frames the screen stands. half: radius in px of the dome the art draws and the sim blocks with.
      x: { life: 300, half: 15 },
    },
    talent: TALENTS.mike,
  },
  dustin: {
    id: 'dustin', name: CHAR_NAMES.dustin, role: 'Bard',
    base: st(38, 24, 7, 3, 9), growth: st(5, 3, 1.2, 0.8, 0.5), weights: st(2, 3, 2, 1, 2),
    speed: 1, crit: 0, utilities: ['burn', 'compass'],
    basic: {
      name: 'Candy lure', mp: 0, cd: 36, power: 1.2, dur: 16, at: 6, lock: 0.6, reach: 76, kb: 2.5, sfx: 'lure',
      // land: flight frames. blast: radius px. lure: frames the bait lasts. pull: radius px enemies notice it.
      // assist: auto-aim range px. cone: auto-aim half angle in degrees.
      x: { land: 24, blast: 20, lure: 180, pull: 64, assist: 110, cone: 40 },
    },
    special: {
      name: 'Farrah spray', mp: 8, cd: 40, power: 0.45, dur: 30, at: 8, lock: 0.25, reach: 54, kb: 0.6, sfx: 'flame',
      // half: cone half angle in degrees. life and tick in frames. burn: burn frames. burnTick: frames between burn ticks.
      // burnAtk: each burn tick deals this much of Dustin's ATK, ignoring DEF.
      x: { half: 32, life: 36, tick: 6, burn: 180, burnTick: 30, burnAtk: 0.22 },
    },
    talent: TALENTS.dustin,
  },
  lucas: {
    id: 'lucas', name: CHAR_NAMES.lucas, role: 'Ranger',
    base: st(40, 18, 8, 3, 10), growth: st(5.5, 2, 1.4, 0.8, 0.6), weights: st(1, 1, 3, 1, 3),
    speed: 1, crit: 0.03, utilities: ['shoot'],
    basic: {
      name: 'Wrist rocket', mp: 0, cd: 22, power: 1, dur: 12, at: 4, lock: 0.6, reach: 152, kb: 2, sfx: 'rock',
      // speed: px per frame. r: hit radius px.
      x: { speed: 3.8, r: 5 },
    },
    special: {
      name: 'Triple shot', mp: 5, cd: 28, power: 0.85, dur: 16, at: 8, lock: 0.45, reach: 130, kb: 2, sfx: 'rock',
      // fan: degrees between shots. n: shots.
      x: { speed: 3.8, r: 5, fan: 18, n: 3 },
    },
    talent: TALENTS.lucas,
  },
  eleven: {
    id: 'eleven', name: CHAR_NAMES.eleven, role: 'Sorcerer',
    base: st(34, 28, 8, 2, 8), growth: st(4.5, 3.5, 1.5, 0.5, 0.4), weights: st(1, 4, 3, 0, 1),
    speed: 0.9, crit: 0.02, utilities: ['push', 'sense'],
    basic: {
      name: 'Push', mp: 0, cd: 24, power: 1, dur: 14, at: 5, lock: 0.5, reach: 38, kb: 5.2, sfx: 'push',
      // half: cone half angle in degrees. flip*: the Lv 3 talent multipliers and extra reach.
      x: { half: 55, stagger: 16, flipPower: 1.4, flipKb: 1.6, flipReach: 8 },
    },
    special: {
      name: 'Mind Blast', mp: 8, cd: 40, power: 2.4, dur: 26, at: 10, lock: 0.15, reach: 132, kb: 3.2, sfx: 'beam',
      // width: beam half width px. life: frames the beam is drawn.
      x: { width: 8, life: 12 },
    },
    talent: TALENTS.eleven,
  },
  // Will joins in chapter 2 (docs/level-4.md, "Will"). Wizard: a slow bolt that reaches, and a Fireball sized by a d20.
  will: {
    id: 'will', name: CHAR_NAMES.will, role: 'Wizard',
    base: st(36, 26, 8, 2, 8), growth: st(5, 3.2, 1.4, 0.6, 0.4), weights: st(2, 3, 3, 1, 1),
    speed: 0.9, crit: 0.02, utilities: ['sense'],
    basic: {
      name: 'Sketch bolt', mp: 0, cd: 30, power: 1.3, dur: 14, at: 6, lock: 0.5, reach: 120, kb: 1.6, sfx: 'rock',
      // speed: px per frame. r: hit radius px.
      x: { speed: 2.2, r: 6 },
    },
    special: {
      name: 'Fireball', mp: 10, cd: 50, power: 2, dur: 24, at: 10, lock: 0.2, reach: 96, kb: 3, sfx: 'flame',
      // speed: px per frame. r: the ball's size. base: the burst's radius in px before the d20 is added.
      x: { speed: 2.6, r: 4, base: 16 },
    },
    talent: TALENTS.will,
  },
  // Max and Steve join in 2.2 (docs/level-5.md, "Max" and "Steve"). Max is the Monk: a quick two-hit board and the Skate dash.
  max: {
    id: 'max', name: CHAR_NAMES.max, role: 'Monk',
    base: st(36, 16, 8, 3, 11), growth: st(5, 2, 1.4, 0.7, 0.7), weights: st(1, 1, 3, 1, 3),
    speed: 1.1, crit: 0.03, utilities: ['dash'],
    basic: {
      name: 'Board', mp: 0, cd: 9, power: 0.9, dur: 10, at: 4, lock: 0.4, reach: 24, kb: 1.8, sfx: 'swing',
      // half: arc half-angle in degrees. The second swing is harder and takes a little longer (secondDur, secondAt, secondCd).
      x: { half: 55, chainGap: 14, secondPower: 1.2, secondDur: 12, secondAt: 4, secondCd: 16 },
    },
    special: {
      name: 'Skate dash', mp: 4, cd: 30, power: 0.9, dur: 16, at: 0, lock: 0, reach: 72, kb: 3, sfx: 'skate',
      // speed: px per frame. frames: the roll's length in frames (speed x frames is the reach). r: how close an enemy's center
      // is to her path for her to hit it. after: frames of invulnerability once it ends. extra: the most px it carries on to
      // clear a gap it would end over.
      x: { speed: 4.5, frames: 16, r: 10, after: 6, extra: 16 },
    },
    talent: TALENTS.max,
  },
  // Steve is the Fighter: a three-hit nail bat with a heavy third, and Babysit.
  steve: {
    id: 'steve', name: CHAR_NAMES.steve, role: 'Fighter',
    base: st(54, 14, 10, 6, 7), growth: st(7.5, 1.5, 1.6, 1.3, 0.3), weights: st(3, 1, 3, 3, 0),
    speed: 0.9, crit: 0, utilities: ['smash'],
    basic: {
      name: 'Nail bat', mp: 0, cd: 13, power: 1.1, dur: 16, at: 7, lock: 0.35, reach: 30, kb: 2.8, sfx: 'swing',
      // The third swing is 1.5 in all (power x thirdPower), wider in reach and throws the enemy (kb x thirdKb).
      x: { half: 60, chainGap: 18, thirdPower: 1.36, thirdKb: 2.2, thirdReach: 4, thirdCd: 28, thirdDur: 22, thirdAt: 9 },
    },
    special: {
      name: 'Babysit', mp: 6, cd: 60, power: 0, dur: 20, at: 6, lock: 0.2, reach: 72, kb: 0, sfx: 'taunt',
      // life: frames his guard and the party's DEF bonus hold. guard: the share of damage he does not take. partyDef: the
      // party's DEF bonus. taunt: frames an enemy in reach stays taunted onto him.
      x: { life: 300, guard: 0.4, partyDef: 0.15, taunt: 180 },
    },
    talent: TALENTS.steve,
  },
  // Robin and Nancy join in 3.1. Stand-in moves until Sim writes their kits (docs/level-7.md, "Robin" and "Nancy"): both
  // borrow Lucas's shots for now, so the x numbers are his.
  robin: {
    id: 'robin', name: CHAR_NAMES.robin, role: 'Rogue',
    base: st(40, 20, 8, 3, 10), growth: st(5.5, 2.5, 1.4, 0.8, 0.6), weights: st(2, 2, 3, 1, 2),
    speed: 1, crit: 0.02, utilities: ['read'],
    basic: {
      name: 'Scoop toss', mp: 0, cd: 26, power: 0.9, dur: 14, at: 6, lock: 0.5, reach: 72, kb: 1.5, sfx: 'scoop',
      x: { speed: 3, r: 5 },
    },
    special: {
      name: 'Word vomit', mp: 5, cd: 40, power: 0, dur: 20, at: 6, lock: 0.3, reach: 56, kb: 0, sfx: 'babble',
      x: { speed: 3, r: 5, fan: 18, n: 3 },
    },
    talent: TALENTS.robin,
  },
  nancy: {
    id: 'nancy', name: CHAR_NAMES.nancy, role: 'Gunslinger',
    base: st(42, 18, 9, 3, 9), growth: st(5.5, 2, 1.5, 0.9, 0.5), weights: st(2, 1, 3, 1, 2),
    speed: 1, crit: 0.03, utilities: ['shoot'],
    basic: {
      name: 'Pistol', mp: 0, cd: 18, power: 1.1, dur: 12, at: 4, lock: 0.6, reach: 160, kb: 2, sfx: 'pistol',
      x: { speed: 4.4, r: 4 },
    },
    special: {
      name: 'Shotgun', mp: 7, cd: 40, power: 0.6, dur: 18, at: 6, lock: 0.3, reach: 72, kb: 4, sfx: 'shotgun',
      x: { speed: 5, r: 4, fan: 12.5, n: 5 },
    },
    talent: TALENTS.nancy,
  },
};

export const HERO_IDS: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy'];

/** The stat at `level`: base, plus floored fixed growth, plus the d20 bonus received so far (in stat units). */
export function statsAt(def: HeroDef, level: number, bonus: Stats = emptyStats()): Stats {
  const out = emptyStats();
  for (const k of STAT_KEYS) out[k] = def.base[k] + Math.floor(def.growth[k] * (level - 1) + 1e-9) + bonus[k];
  return out;
}

/** Fixed gain when going from `level` to `level + 1`, before the d20 bonus. */
export function fixedGain(def: HeroDef, level: number): Stats {
  const a = statsAt(def, level);
  const b = statsAt(def, level + 1);
  const out = emptyStats();
  for (const k of STAT_KEYS) out[k] = b[k] - a[k];
  return out;
}

/** Crit chance 0..1: 5 percent, the hero's bonus, Lucas's Sharp eye and Max's High score. */
export function critChance(def: HeroDef, level: number): number {
  const talent = def.id === 'lucas' && hasTalent('lucas', level) ? 0.15 : def.id === 'max' && hasTalent('max', level) ? 0.05 : 0;
  return BASE_CRIT + def.crit + talent;
}
