// Shared rigs for the Demogorgon tests. Not a test file.
import type { ActorView, FxView, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { DemoState, Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, idle, makeWhite, tc, tf } from './sim-helpers.ts';

export const DEMO = ENEMY_DEFS.demogorgon;
export const X = DEMO.x;

export const demoAt = (tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'demo', type: 'demogorgon', tx, ty, group: 'boss', ...extra });

export interface BossRig { sim: Sim; s: S; boss: Enemy; d: DemoState; hero: Hero }

/**
 * The court from docs/level-3.md: 18 by 12 tiles ringed with walls, the boss at tile (13, 6) and awake, the 1.3 party
 * at its arrival levels with Mike in front at (3, 6), and enemyMult 1.2. Mike has HP to spare so a test can take hits,
 * unless `tough` is false.
 * The boss's attack timers are left alone: set `d.chargeCd`, `d.spitCd`, `d.leapCd` and `boss.cd` to isolate a move.
 */
export function bossRig(over: Parameters<typeof makeWhite>[0] = {}, tough = true): BossRig {
  const { sim, s } = makeWhite({
    grid: arena(18, 12), party: defaultParty('1.3'), start: { x: tc(3), y: tf(6) }, spawns: [demoAt(13, 6, { dormant: true })],
    enemyMult: 1.2, seed: 4, ...over,
  });
  sim.spawnGroup('boss');
  const boss = s.enemies.find((e) => e.kind === 'demogorgon') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) { hero.st.hp = 900; hero.hp = 900; }
  return { sim, s, boss, d: boss.demo as DemoState, hero };
}

/** Switches off every attack but the one a test wants, by pushing the timers out of reach. */
export function only(r: BossRig, keep: 'charge' | 'spit' | 'leap' | 'swipe' | null): void {
  const far = 99999;
  if (keep !== 'charge') r.d.chargeCd = far;
  if (keep !== 'spit') r.d.spitCd = far;
  if (keep !== 'leap') r.d.leapCd = far;
  if (keep !== 'swipe') r.boss.cd = far;
}

export function bossView(r: BossRig): ActorView | undefined {
  return r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'demogorgon');
}

export interface Frame { ev: SimEvent[]; v: ActorView | undefined; f: number; fx: FxView[] }

/** Steps n ticks and records the boss's view, the effects on screen (copied) and the events of each. */
export function track(r: BossRig, n: number, input: SimInput = idle()): Frame[] {
  const out: Frame[] = [];
  for (let f = 0; f < n; f++) {
    const ev = r.sim.step(input);
    out.push({ ev, v: bossView(r), f, fx: r.sim.view().fx.map((x) => ({ ...x })) });
  }
  return out;
}

/** Steps until `pred` holds (checked after each tick). Returns the events of those ticks. Throws if it takes too long. */
export function runUntil(r: BossRig, pred: () => boolean, max = 1500, input: SimInput = idle()): { frames: number; ev: SimEvent[] } {
  const ev: SimEvent[] = [];
  for (let f = 1; f <= max; f++) {
    ev.push(...r.sim.step(input));
    if (pred()) return { frames: f, ev };
  }
  throw new Error(`condition not met in ${max} frames; the boss is ${r.d.move}`);
}

export const sfxOf = (ev: SimEvent[]): string[] => ev.flatMap((e) => (e.t === 'sfx' ? [e.id] : []));

/** The damage range a hero takes from an enemy hit of `power` at `atk`, at the 1.2 stage factor on chief. */
export function takes(power: number, atk: number, def: number, mult = 1.2): { lo: number; hi: number } {
  const f = (spread: number): number => Math.max(1, Math.round((power * atk * spread - def * 0.5) * mult));
  return { lo: f(0.9), hi: f(1.1) };
}

/** Puts the lead at a tile and keeps him there: the sim has no other way to move a hero but input or a teleport. */
export function placeHero(r: BossRig, tx: number, ty: number, dx = 0, dy = 0): void {
  r.sim.dev.teleport(tc(tx) + dx, tf(ty) + dy);
}

/** Lets one charge play out against the far wall with the hero out of the way, until the stun is over and the boss walks. */
export function stunOnce(r: BossRig): void {
  r.d.chargeCd = 0;
  runUntil(r, () => r.d.move === 'stun', 600);
  runUntil(r, () => r.d.move !== 'stun', 400);
}
