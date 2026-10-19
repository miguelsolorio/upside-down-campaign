// Shared rigs for the final fight's tests (stage 5.3, docs/level-16.md): the real stage's grid and spawns, the party a ?stage=5.3 jump brings, and
// handles on the bosses and the channel. Not a test file.
import { defaultParty } from '../src/core/campaign.ts';
import type { PartySeed, Sim, SimEvent, SimInput } from '../src/core/types.ts';
import { buildSim } from '../src/combat/sim.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { STAGE_53 } from '../src/world/stages/stage53.ts';
import { idle } from './sim-helpers.ts';

export const S53 = STAGE_53;
export const PARTY: PartySeed[] = defaultParty('5.3');
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
export const px = (tx: number): number => tx * 16 + 8;
export const fy = (ty: number): number => ty * 16 + 12;

export interface Rig { sim: Sim; s: S }

/** The stage with the party standing in the arena's south at (18, 18), the door open. `skip` is the retry's kill list. */
export function rig(over: { seed?: number; skip?: string[]; party?: PartySeed[]; god?: boolean } = {}): Rig {
  const grid = stageGrid(S53);
  return buildSim(simOptions(S53, grid, {
    party: over.party ?? PARTY, seed: over.seed ?? 4, difficulty: 'chief', start: { x: px(18), y: fy(18) }, skipSpawns: over.skip, god: over.god,
  }));
}

/** Every spawn the first two phases are made of, as a retry would carry them in its kill list. */
export const VECNA_IDS = ['vecna'];
export const SPIDER_IDS = ['flayer', 'leg1', 'leg2', 'leg3', 'leg4'];

export const kind = (r: Rig, k: Enemy['kind']): Enemy => r.s.enemies.find((e) => e.kind === k) as Enemy;
export const legs = (r: Rig): Enemy[] => r.s.enemies.filter((e) => e.kind === 'leg5');
export const hero = (r: Rig, id: Hero['id']): Hero => r.s.heroes.find((h) => h.id === id) as Hero;
export const active = (r: Rig): Hero => r.s.heroes[r.s.active] as Hero;

/** Steps the sim n ticks, returning every event. */
export function steps(r: Rig, n: number, input: SimInput = idle()): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...r.sim.step(input));
  return out;
}

/** Steps until `pred` holds (checked after each tick) and returns the events so far. Throws if it takes longer than `max`. */
export function until(r: Rig, pred: () => boolean, max = 3000): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < max; i++) {
    out.push(...r.sim.step(idle()));
    if (pred()) return out;
  }
  throw new Error(`not met in ${max} frames`);
}

export const phasesOf = (ev: SimEvent[]): number[] => ev.flatMap((e) => (e.t === 'bossPhase' ? [e.phase] : []));

/** Holds a boss's own scheduler off, so only what a test does happens: no slam, sweep or Flayed wave from the Mind Flayer. */
export function still(r: Rig): void {
  const f = kind(r, 'flayer5').flayer;
  if (f) { f.slamCd = 99999; f.sweepCd = 99999; f.waveCd = 99999; }
}

/** One hit from the active hero on `e`: a power that cannot be missed, no crit. */
export const hit = (r: Rig, e: Enemy, power = 1): number => hitEnemy(r.s, active(r), e, { power, noCrit: true });

/** Puts every hero at (x, y), standing still. */
export function put(r: Rig, x: number, y: number): void {
  r.sim.dev.teleport(x, y);
}

/** Starts the fight (the `defend` beat step) and brings Vecna down: his HP to 0 and the ticks until the Mind Flayer has risen. Returns the events. */
export function toSpider(r: Rig): SimEvent[] {
  const ev: SimEvent[] = [];
  r.sim.defend();
  ev.push(...steps(r, 2));
  kind(r, 'vecna5').hp = 0;
  ev.push(...until(r, () => r.s.finale?.phase === 2));
  ev.push(...steps(r, 60));
  return ev;
}

/** Brings the Mind Flayer down from there: its HP to 0 and the ticks until the channel has begun. */
export function toChannel(r: Rig): SimEvent[] {
  const ev: SimEvent[] = [];
  still(r);
  kind(r, 'flayer5').hp = 0;
  ev.push(...until(r, () => r.s.finale?.phase === 3));
  return ev;
}
