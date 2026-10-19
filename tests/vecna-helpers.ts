// Shared rigs for the Vecna tests. Not a test file.
import type { ActorView, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { Enemy, Hero, S, VecnaState } from '../src/combat/state.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { arena, idle, makeWhite, tc, tf } from './sim-helpers.ts';

export const VECNA = ENEMY_DEFS.vecna;
export const VX = VECNA.x;
export const ORB = ENEMY_DEFS.orb;

/** The party a real run brings to 4.4 (core/campaign.ts): Mike (lead), Dustin, Robin and Eleven. */
export const PARTY: PartySeed[] = defaultParty('4.4');

/** The attic in miniature: 20 by 14 tiles ringed with solid pines, the grandfather clock against the north wall. */
export const ATTIC_W = 20;
export const ATTIC_H = 14;
export const attic = () => arena(ATTIC_W, ATTIC_H);

/** The orbs, in tiles: orb1 to orb4, round the floor. Vecna stands in the middle of the north half. */
export const ORB_TILES: [number, number][] = [[3, 3], [16, 3], [3, 10], [16, 10]];
export const VECNA_TILE: [number, number] = [10, 4];

export const atticSpawns = (dormant = false, x?: Record<string, number>): SimSpawn[] => [
  { kind: 'prop', id: 'clock_attic', prop: 'clock', tx: 9, ty: 1, w: 16, h: 32 },
  { kind: 'enemy', id: 'vecna', type: 'vecna', tx: VECNA_TILE[0], ty: VECNA_TILE[1], group: 'boss', dormant, ...(x ? { x } : {}) },
  ...ORB_TILES.map(([tx, ty], i): SimSpawn => ({ kind: 'enemy', id: `orb${i + 1}`, type: 'orb', tx, ty, group: 'boss', dormant })),
];

export interface VRig { sim: Sim; s: S; body: Enemy; v: VecnaState; orbs: Enemy[]; hero: Hero }

/**
 * The attic with Vecna awake, the party at tile (10, 10) with HP to spare unless `tough` is false. Every timer is held far off (`still`), so a
 * test starts a move itself; pass `still: false` to let the scheduler run. enemyMult 1 on chief.
 */
export function vRig(over: Parameters<typeof makeWhite>[0] = {}, o: { tough?: boolean; still?: boolean; x?: Record<string, number> } = {}): VRig {
  const { sim, s } = makeWhite({
    grid: attic(), party: PARTY, start: { x: tc(10), y: tf(10) }, spawns: atticSpawns(true, o.x), enemyMult: 1, seed: 4, ...over,
  });
  sim.spawnGroup('boss');
  const r = rigOf(sim, s, o.tough !== false);
  if (o.still !== false) hold(r);
  return r;
}

/** Builds the handles for a sim that has a Vecna in it. */
export function rigOf(sim: Sim, s: S, tough = true): VRig {
  const body = s.enemies.find((e) => e.kind === 'vecna') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) for (const h of s.heroes) { h.st.hp = 900; h.hp = 900; }
  return { sim, s, body, v: body.vecna as VecnaState, orbs: s.enemies.filter((e) => e.kind === 'orb'), hero };
}

/** Holds Vecna's scheduler off: no whip, throw, chime or heal comes on its own. */
export function hold(r: { v: VecnaState }): void {
  r.v.whipCd = 99999; r.v.throwCd = 99999; r.v.chimeCd = 99999; r.v.healCd = 99999;
}

export const bodyView = (r: { sim: Sim }): ActorView | undefined => r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'vecna');
export const orbView = (r: { sim: Sim }, i: number): ActorView | undefined =>
  r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'orb' && Math.abs(a.x - tc((ORB_TILES[i - 1] as number[])[0] as number)) < 1 && Math.abs(a.y - tf((ORB_TILES[i - 1] as number[])[1] as number)) < 1);

/** Steps until `pred` holds (checked after each tick). Returns the frames taken and the events. Throws if it takes too long. */
export function until(r: { sim: Sim }, pred: () => boolean, max = 1500, input: SimInput = idle()): { frames: number; ev: SimEvent[] } {
  const ev: SimEvent[] = [];
  for (let f = 1; f <= max; f++) {
    ev.push(...r.sim.step(input));
    if (pred()) return { frames: f, ev };
  }
  throw new Error(`condition not met in ${max} frames`);
}

/** Steps `n` ticks and returns every event. */
export function steps(r: { sim: Sim }, n: number, input: SimInput = idle()): SimEvent[] {
  const ev: SimEvent[] = [];
  for (let f = 0; f < n; f++) ev.push(...r.sim.step(input));
  return ev;
}

/** Puts the active hero at (x, y), standing still. */
export function at(r: { hero: Hero; s: S }, x: number, y: number): void {
  r.hero.x = x; r.hero.y = y; r.hero.vx = 0; r.hero.vy = 0;
  r.s.trailX.fill(x); r.s.trailY.fill(y);
}

/** Puts Vecna at (x, y), and his orbs' timers aside. */
export function place(r: VRig, x: number, y: number): void { r.body.x = r.body.hx = x; r.body.y = r.body.hy = y; }

/** One hit from Mike on `e`, power chosen to be hard to survive, noCrit. A shot reaches a floating Vecna (`air`). */
export function hammer(r: VRig, e: Enemy, power = 60, air = false): number {
  const dmg = hitEnemy(r.s, r.hero, e, { power, noCrit: true, air });
  // A hit stops the clock for a few frames; a test that counts frames from it wants them back.
  r.s.hitstop = 0;
  return dmg;
}

/** Brings Vecna to `share` of his max HP at once, as if a hit did. */
export function setShare(r: VRig, share: number): void { r.body.hp = Math.round(r.body.hpMax * share); }

/** Breaks orb `i` (1 to 4): its HP to a sliver, then a hit. */
export function breakOrb(r: VRig, i: number): void {
  const o = r.orbs[i - 1] as Enemy;
  o.hp = 1;
  hammer(r, o, 5);
}

/** Vecna in Float, risen: HP at 55%, a tick to take the phase and enough for the rise. */
export function toFloat(r: VRig): void {
  setShare(r, 0.55);
  steps(r, VX.riseT + 2);
}
