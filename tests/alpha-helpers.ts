// Shared rigs for the Alpha and defense tests. Not a test file.
import type { ActorView, Burrow, DefenseDef, FxView, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { AlphaState, Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, idle, makeWhite, tc, tf } from './sim-helpers.ts';

export const ALPHA = ENEMY_DEFS.alpha;
export const AX = ALPHA.x;

export const alphaAt = (tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'alpha', type: 'alpha', tx, ty, group: 'boss', ...extra });

/** Burrows at the court's four corners, inside the walls. */
export const CORNERS: Burrow[] = [{ tx: 2, ty: 2 }, { tx: 2, ty: 9 }, { tx: 15, ty: 2 }, { tx: 15, ty: 9 }];

export interface AlphaRig { sim: Sim; s: S; boss: Enemy; a: AlphaState; hero: Hero }

/**
 * The den from docs/level-6.md: 18 by 12 tiles ringed with walls, the Alpha at tile (13, 6) and awake, the 2.3 party with
 * Mike in front at (3, 6), enemyMult 1.15 and a burrow in each corner. Mike has HP to spare unless `tough` is false.
 * The Alpha's timers are left alone: set `a.lungeCd`, `a.pounceCd` and `boss.cd` to isolate a move.
 */
export function alphaRig(over: Parameters<typeof makeWhite>[0] = {}, tough = true): AlphaRig {
  const { sim, s } = makeWhite({
    grid: arena(18, 12), party: defaultParty('2.3'), start: { x: tc(3), y: tf(6) }, spawns: [alphaAt(13, 6, { dormant: true })],
    burrows: CORNERS, enemyMult: 1.15, seed: 4, ...over,
  });
  sim.spawnGroup('boss');
  const boss = s.enemies.find((e) => e.kind === 'alpha') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) { hero.st.hp = 900; hero.hp = 900; }
  return { sim, s, boss, a: boss.alpha as AlphaState, hero };
}

/** Switches off every move but the one a test wants, by pushing the timers out of reach. */
export function onlyMove(r: AlphaRig, keep: 'lunge' | 'pounce' | 'bite' | null): void {
  const far = 99999;
  if (keep !== 'lunge') r.a.lungeCd = far;
  if (keep !== 'pounce') r.a.pounceCd = far;
  if (keep !== 'bite') r.boss.cd = far;
}

export function alphaView(r: AlphaRig): ActorView | undefined {
  return r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'alpha');
}

export interface Frame { ev: SimEvent[]; v: ActorView | undefined; f: number; fx: FxView[] }

/** Steps n ticks and records the Alpha's view, the effects on screen (copied) and the events of each. */
export function track(r: AlphaRig, n: number, input: SimInput = idle()): Frame[] {
  const out: Frame[] = [];
  for (let f = 0; f < n; f++) {
    const ev = r.sim.step(input);
    out.push({ ev, v: alphaView(r), f, fx: r.sim.view().fx.map((x) => ({ ...x })) });
  }
  return out;
}

/** Steps until `pred` holds (checked after each tick). Returns the events of those ticks. Throws if it takes too long. */
export function runUntil(r: { sim: Sim }, pred: () => boolean, max = 1500, input: SimInput = idle()): { frames: number; ev: SimEvent[] } {
  const ev: SimEvent[] = [];
  for (let f = 1; f <= max; f++) {
    ev.push(...r.sim.step(input));
    if (pred()) return { frames: f, ev };
  }
  throw new Error(`condition not met in ${max} frames`);
}

/** The damage range a hero takes from an enemy hit of `power` at `atk`, at the 1.15 stage factor on chief. */
export function takes(power: number, atk: number, def: number, mult = 1.15): { lo: number; hi: number } {
  const f = (spread: number): number => Math.max(1, Math.round((power * atk * spread - def * 0.5) * mult));
  return { lo: f(0.9), hi: f(1.1) };
}

// ---------------------------------------------------------------- the defense
/** A short defense for a small arena: 1800 frames (30 s) and three waves. */
export const SMALL_DEFENSE: DefenseDef = {
  npc: 'eleven', hp: 400, frames: 1800, prop: 'rift',
  waves: [{ at: 0, n: 3, type: 'demodog' }, { at: 480, n: 3, type: 'demodog' }, { at: 1080, n: 4, type: 'demodog', tier: 'elite' }],
};

export interface DefenseRig { sim: Sim; s: S; hero: Hero }

/**
 * A 22 by 14 hall with Eleven and Hopper at the north wall by a rift, the party at the foot of the room, and a burrow in each
 * corner near the rift and one far off. The defense is built but not started.
 */
export function defenseRig(over: Parameters<typeof makeWhite>[0] = {}, party = defaultParty('2.3')): DefenseRig {
  const { sim, s } = makeWhite({
    grid: arena(22, 14), party, start: { x: tc(11), y: tf(9) }, enemyMult: 1.15, seed: 4,
    spawns: [
      { kind: 'prop', id: 'rift', prop: 'rift', tx: 9, ty: 1, w: 64, h: 48 },
      { kind: 'npc', id: 'eleven', tx: 10, ty: 4, dir: 'down' },
      { kind: 'npc', id: 'hopper', tx: 13, ty: 4, dir: 'down' },
    ],
    burrows: [{ tx: 2, ty: 2 }, { tx: 19, ty: 2 }, { tx: 4, ty: 6 }, { tx: 17, ty: 6 }],
    defense: SMALL_DEFENSE,
    ...over,
  });
  return { sim, s, hero: s.heroes[0] as Hero };
}

export const kinds = (ev: SimEvent[]): string[] => ev.map((e) => e.t);
export const countOf = (ev: SimEvent[], t: SimEvent['t']): number => ev.filter((e) => e.t === t).length;
