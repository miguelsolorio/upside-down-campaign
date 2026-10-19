// The Mind Flayer's state (docs/level-9.md): its body, its legs, a sweep's band and the goo pools. Kept apart from state.ts so that file stays under
// 500 lines; state.ts re-exports all of it, so import from there.
import type { FxView } from '../core/types.ts';
import type { Enemy } from './state.ts';

/**
 * What the Mind Flayer's body is doing (enemies/flayer.ts). rise: coming in through the skylight, and nothing can hit it or its legs. up:
 * fighting, shielded while any leg stands. down: every leg severed, its head on the floor and open to hits.
 */
export type FlayerMove = 'rise' | 'up' | 'down';

/**
 * The Mind Flayer body's own state. Every other enemy has `flayer: null`. `t` is the frames left in a rise or a down. `legs` are its legs in id
 * order. The three counters are frames until a leg is sent, until a leg sweeps (phase two) and until the next Flayed wave.
 */
export interface FlayerState { move: FlayerMove; t: number; legs: Enemy[]; slamCd: number; sweepCd: number; waveCd: number; phase2: boolean; waves: number }

/**
 * What a Mind Flayer leg is doing (enemies/flayer_legs.ts). idle: waiting for its turn, tip on the floor. warn: the line or band is shown.
 * slam: striking. rest: tip on the floor after it. severed: cut at 0 HP, and not dead.
 */
export type LegMove = 'idle' | 'warn' | 'slam' | 'rest' | 'severed';

/** A sweep's band: a row 24 px tall from x0 to x1 at y, and the 'sweep' fx that draws it. */
export interface SweepBand { y: number; x0: number; x1: number; fx: FxView }

/**
 * A leg's own state. Every other enemy has `leg: null`. The enemy's x, y is the leg's tip, where it is hit; `rx, ry` is the root it grows
 * from. `body` is the Mind Flayer it belongs to (linked once the spawns are built), `sweep` the band it is warning when it sweeps,
 * `struck` that this slam has already hurt a hero, `at` the frame its warning started (its own clock begins the frame after).
 */
export interface LegState { body: Enemy | null; move: LegMove; t: number; rx: number; ry: number; sweep: SweepBand | null; struck: boolean; at: number }

/** One of the Mind Flayer's goo pools (combat/pools.ts): where a leg's tip landed, and the frames since. */
export interface Pool { x: number; y: number; age: number }
