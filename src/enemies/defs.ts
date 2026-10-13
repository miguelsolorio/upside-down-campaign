// Enemy data for Level 1: the rat and the Lab agent.
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
};

/** Enemy HP and damage multiplier. */
export const DIFFICULTY_MULT: Record<Difficulty, number> = { kid: 0.7, chief: 1, upside: 1.4 };
