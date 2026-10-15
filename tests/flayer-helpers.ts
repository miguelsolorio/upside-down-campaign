// Shared rigs for the Mind Flayer tests. Not a test file.
import type { ActorView, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { Enemy, FlayerState, Hero, LegState, S } from '../src/combat/state.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { arena, idle, makeWhite, tc, tf } from './sim-helpers.ts';

export const FLAYER = ENEMY_DEFS.flayer;
export const LEG = ENEMY_DEFS.flayerleg;
export const FX = FLAYER.x;
export const LX = LEG.x;

/** The party a real run brings to 3.3 (core/campaign.ts): Mike (lead), Dustin, Robin and Eleven. */
export const PARTY: PartySeed[] = defaultParty('3.3');

/** The food court in miniature: 22 by 14 tiles, a row of stalls (solid) along tile row 1 with the body standing in it. */
export const COURT_W = 22;
export const COURT_H = 14;
const STALLS: Record<string, string> = Object.fromEntries(Array.from({ length: COURT_W - 2 }, (_, i) => [`${i + 1},1`, 'T']));
export const court = () => arena(COURT_W, COURT_H, STALLS);

/** The roots, in tiles, along the front of the body: leg1 to leg4. */
export const ROOTS: [number, number][] = [[6, 2], [9, 2], [13, 2], [16, 2]];
/** The burrows at the arena's sides, in tiles. */
export const BURROWS = [{ tx: 2, ty: 7 }, { tx: 19, ty: 7 }];

export const flayerSpawns = (dormant = true): SimSpawn[] => [
  { kind: 'enemy', id: 'flayer', type: 'flayer', tx: 11, ty: 1, group: 'flayer', dormant },
  ...ROOTS.map(([tx, ty], i): SimSpawn => ({ kind: 'enemy', id: `leg${i + 1}`, type: 'flayerleg', tx, ty, group: 'flayer', dormant })),
];

export interface FRig { sim: Sim; s: S; body: Enemy; f: FlayerState; legs: Enemy[]; hero: Hero }

/**
 * The court with the Mind Flayer woken and risen, Mike in front at tile (11, 10) with HP to spare unless `tough` is false. Every timer is
 * held far off (`still`) so a test starts a move itself; pass `still: false` to let the scheduler run, and `risen: false` to stop on the
 * tick it wakes, before it has risen. enemyMult 1 on chief.
 */
export function fRig(over: Parameters<typeof makeWhite>[0] = {}, tough = true, still = true, party: PartySeed[] = PARTY, risen = true): FRig {
  const { sim, s } = makeWhite({
    grid: court(), party, start: { x: tc(11), y: tf(10) }, spawns: flayerSpawns(), burrows: BURROWS, enemyMult: 1, seed: 4, ...over,
  });
  sim.spawnGroup('flayer');
  const r = rigOf(sim, s, tough);
  if (risen) {
    for (let i = 0; i < FX.riseT + 1; i++) sim.step(idle());
    if (still) hold(r);
  }
  return r;
}

/** Builds the handles for a sim that has a Mind Flayer in it. */
export function rigOf(sim: Sim, s: S, tough = true): FRig {
  const body = s.enemies.find((e) => e.kind === 'flayer') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) { hero.st.hp = 900; hero.hp = 900; }
  return { sim, s, body, f: body.flayer as FlayerState, legs: body.flayer?.legs as Enemy[], hero };
}

/** Holds the body's scheduler off: no slam, sweep or wave comes on its own. */
export function hold(r: { f: FlayerState }): void {
  r.f.slamCd = 99999; r.f.sweepCd = 99999; r.f.waveCd = 99999;
}

export const ls = (e: Enemy): LegState => e.leg as LegState;

export const bodyView = (r: { sim: Sim }): ActorView | undefined => r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'flayer');
/** Leg `i` (1 to 4) as the view shows it: x, y its root. */
export const legView = (r: { sim: Sim }, i: number): ActorView | undefined =>
  r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'flayerleg' && Math.abs(a.x - rootOf(i).x) < 1);

/** Steps until `pred` holds (checked after each tick). Returns the frames taken and the events. Throws if it takes too long. */
export function until(r: { sim: Sim }, pred: () => boolean, max = 1500, input: SimInput = idle()): { frames: number; ev: SimEvent[] } {
  const ev: SimEvent[] = [];
  for (let f = 1; f <= max; f++) {
    ev.push(...r.sim.step(input));
    if (pred()) return { frames: f, ev };
  }
  throw new Error(`condition not met in ${max} frames`);
}

/** Puts the active hero at (x, y), standing still. */
export function at(r: { hero: Hero; s: S }, x: number, y: number): void {
  r.hero.x = x; r.hero.y = y; r.hero.vx = 0; r.hero.vy = 0;
  r.s.trailX.fill(x); r.s.trailY.fill(y);
}

/** A leg's root, in px. */
export const rootOf = (i: number): { x: number; y: number } => ({ x: tc((ROOTS[i - 1] as number[])[0] as number), y: tf((ROOTS[i - 1] as number[])[1] as number) });

/** One hit from Mike on `e`, power chosen to be hard to survive, noCrit. */
export const hammer = (r: FRig, e: Enemy, power = 60): number => hitEnemy(r.s, r.hero, e, { power, noCrit: true });

/** Cuts a leg: its HP to a sliver, then a hit. */
export function cut(r: FRig, i: number): void {
  const leg = r.legs[i - 1] as Enemy;
  leg.hp = 1;
  hammer(r, leg, 5);
}

/** Cuts every leg. The body's brain sees it on its next tick. */
export function cutAll(r: FRig): void {
  for (let i = 1; i <= r.legs.length; i++) cut(r, i);
}
