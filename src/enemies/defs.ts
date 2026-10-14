// Enemy data: the rat and the Lab agent, then the Lab's riot guard and Warden.
import type { Difficulty, EnemyKind } from '../core/types.ts';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  atk: number;
  def: number;
  /** px per frame while chasing. */
  speed: number;
  /** XP the kill is worth. Not scaled by difficulty. */
  xp: number;
  /** Notice radius in px, with line of sight. */
  aggro: number;
  /** Frames of the red "!" before a real attack. */
  windup: number;
  /** Damage multiplier of the attack. */
  power: number;
  /** Frames between attacks, measured from the start of the wind-up. */
  cooldown: number;
  /** Chance a kill drops a quarter, 0..1. */
  drop: number;
  /** Knockback taken is scaled by this. Rats are light. */
  weight: number;
  /** Move-specific numbers. */
  x: Record<string, number>;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  rat: {
    kind: 'rat', name: 'Rat', hp: 10, atk: 6, def: 0, speed: 1.3, xp: 4, aggro: 72,
    windup: 24, power: 0.75, cooldown: 80, drop: 0.15, weight: 1.3,
    // range: distance in px at which it commits to a bite. lunge: frames and px per frame of the lunge.
    x: { range: 20, lungeT: 9, lungeSpeed: 2.8, recover: 20 },
  },
  agent: {
    kind: 'agent', name: 'Lab agent', hp: 24, atk: 10, def: 3, speed: 0.85, xp: 8, aggro: 90,
    windup: 24, power: 0.65, cooldown: 100, drop: 0.3, weight: 1,
    // near and far bound the distance band in px. dart: px per frame. range: dart reach in px.
    // patrol: px per frame on patrol. back: px per frame when backing off. stamina: frames it will back off before it plants.
    x: { near: 70, far: 100, dart: 2, range: 170, patrol: 0.5, back: 0.7, stamina: 50, recover: 18, lose: 240 },
  },
  // The shielded pair. x holds the numbers guard.ts reads.
  // range: px at which it commits to a bash. reach: how far the bash lands. arc: the shield's half angle in degrees.
  // block: the share of damage a blocked hit still deals. breakKb: the knockback that breaks the shield, breakT: for how many frames.
  // grace: frames after a break during which the shield cannot be broken again. turn: frames the hero must stay in the blind
  // side before the guard turns. kb: bash knockback. recover: frames of the bash recovery. patrol: px per frame on patrol.
  // lose: frames without sight before it gives up. hold: px it stops short of the hero.
  guard: {
    kind: 'guard', name: 'Riot guard', hp: 70, atk: 17, def: 8, speed: 0.7, xp: 24, aggro: 90,
    windup: 30, power: 1, cooldown: 110, drop: 0.35, weight: 1.4,
    x: { range: 26, reach: 30, arc: 75, block: 0.2, breakKb: 3.2, breakT: 45, grace: 30, turn: 12, kb: 4.2, recover: 36, patrol: 0.5, lose: 240, hold: 18 },
  },
  // The Warden adds a slam: slamWindup frames of growing ring, a shockwave of slamRadius px, slamRecover frames, and
  // slamCd frames before the next attack. Every slamEvery-th attack is a slam, every slamLow-th below half HP.
  warden: {
    kind: 'warden', name: 'Warden', hp: 260, atk: 20, def: 9, speed: 0.65, xp: 60, aggro: 100,
    windup: 34, power: 1, cooldown: 100, drop: 1, weight: 3,
    x: {
      range: 30, reach: 34, arc: 90, block: 0.25, breakKb: 3.2, breakT: 45, grace: 120, turn: 12, kb: 4.2, recover: 36, patrol: 0.5, lose: 300, hold: 20,
      slamWindup: 45, slamRadius: 46, slamPower: 1.3, slamKb: 5, slamRecover: 60, slamCd: 140, slamEvery: 3, slamLow: 2,
    },
  },
};

/** Enemy HP and damage multiplier. */
export const DIFFICULTY_MULT: Record<Difficulty, number> = { kid: 0.7, chief: 1, upside: 1.4 };

/** What `tier: 'elite'` does to any enemy: more HP and damage, a quicker pace, shorter cooldowns, double XP and drops. */
export const ELITE = { hp: 1.9, atk: 1.6, speed: 1.1, cooldown: 0.75, xp: 2, drop: 2 } as const;
