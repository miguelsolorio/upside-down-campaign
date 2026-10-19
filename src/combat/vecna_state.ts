// Vecna's state and his memory orbs' (docs/level-13.md). Kept apart from state.ts so that file stays under 500 lines; state.ts re-exports
// all of it, so import from there. The rules are in enemies/vecna.ts (the brain), enemies/vecna_phase.ts (phases, the clock, the heal, what a
// hit does) and enemies/orb.ts (the orbs).
import type { Enemy } from './state.ts';

/**
 * What Vecna is doing (enemies/vecna.ts). walk: coming at the hero, or hovering in Float. wind: the "!" before a vine whip, the line locked.
 * lash: the whip out. throw: the "!" before a rock (Float). down: pulled to the floor by a broken orb, stunned.
 */
export type VecnaMove = 'walk' | 'wind' | 'lash' | 'throw' | 'down';

/** A rock in the air, then splashing, from (sx, sy) to (tx, ty): `age` frames since the throw, `life` the flight in all, `atk` his attack. */
export interface Rock { sx: number; sy: number; tx: number; ty: number; age: number; life: number; atk: number }

/**
 * The vine whip being warned and then struck: its origin (his feet when the wind-up began), heading and length, the frames since the wind-up
 * began, the frames of warning (the wind-up) and in all (wind-up and lash), and that it has already hurt a hero.
 */
export interface Lash { ox: number; oy: number; angle: number; len: number; t: number; wind: number; life: number; struck: boolean }

/**
 * Vecna's own state. Every other enemy has `vecna: null`. `t` is the frames left in the current move. `phase` is 1 (Clock), 2 (Float) or 3
 * (Burn). The four counters are frames until the next whip, rock, chime and heal. `curseT` is the frames left of the chime pose, `fireAt`
 * the frame Burn began, `orbs` his memory orbs in id order (linked once the spawns are built) and `missAt` the frame a hit last found him too
 * high.
 */
export interface VecnaState {
  move: VecnaMove; t: number; phase: number;
  whipCd: number; throwCd: number; chimeCd: number; healCd: number;
  curseT: number; fireAt: number; lash: Lash | null; rocks: Rock[]; orbs: Enemy[]; missAt: number;
}

/** A memory orb's own state. Every other enemy has `orb: null`. `broken` is set at 0 HP, `t` the frames until it regrows, `body` the Vecna it feeds. */
export interface OrbState { broken: boolean; t: number; body: Enemy | null }

/** A fresh Vecna on these numbers (his def's x with the spawn's overrides), every timer at its first value. */
export function newVecna(x: Record<string, number>): VecnaState {
  const sm = x.speedMul as number;
  return {
    move: 'walk', t: 0, phase: 1, whipCd: Math.round((x.whipEvery as number) / sm), throwCd: Math.round((x.throwEvery as number) / sm),
    chimeCd: x.chimeEvery as number, healCd: x.healEvery as number, curseT: 0, fireAt: -1, lash: null, rocks: [], orbs: [], missAt: -9999,
  };
}

export const newOrb = (): OrbState => ({ broken: false, t: 0, body: null });

/** An orb that is awake, whole and standing: it heals Vecna, can be marked and can be broken. */
export const orbStands = (e: Enemy): boolean => e.orb !== null && !e.dead && !e.dormant && !e.orb.broken && e.hp > 0;

/** A broken orb: a stalk that can't be hit until it regrows. */
export const orbBroken = (e: Enemy): boolean => e.orb !== null && e.orb.broken;
