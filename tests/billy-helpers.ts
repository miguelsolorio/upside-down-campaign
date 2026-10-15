// Shared rigs for the Billy tests. Not a test file.
import type { ActorView, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { BillyState, Enemy, Hero, S } from '../src/combat/state.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { arena, idle, inp, makeWhite, run, tc, tf } from './sim-helpers.ts';

export const BILLY = ENEMY_DEFS.billy;
export const BX = BILLY.x;

/** The party a real run brings to 3.3 (core/campaign.ts): Mike (lead) at Lv 7, Dustin 6, Robin 4 and Eleven 3. */
export const PARTY: PartySeed[] = defaultParty('3.3');

export const billyAt = (tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'billy', type: 'billy', tx, ty, group: 'boss', ...extra });

export interface BRig { sim: Sim; s: S; boss: Enemy; b: BillyState; hero: Hero }

/**
 * The food court in miniature: 22 by 14 tiles ringed with walls, Billy awake at tile (16, 7), Mike in front at (4, 7) with HP to spare
 * unless `tough` is false. enemyMult 1 on chief.
 */
export function bRig(over: Parameters<typeof makeWhite>[0] = {}, tough = true, party: PartySeed[] = PARTY): BRig {
  const { sim, s } = makeWhite({
    grid: arena(22, 14), party, start: { x: tc(4), y: tf(7) }, spawns: [billyAt(16, 7, { dormant: true })], enemyMult: 1, seed: 4, ...over,
  });
  sim.spawnGroup('boss');
  const boss = s.enemies.find((e) => e.kind === 'billy') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) { hero.st.hp = 900; hero.hp = 900; }
  return { sim, s, boss, b: boss.billy as BillyState, hero };
}

export const bossView = (r: { sim: Sim }): ActorView | undefined => r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'billy');
export const npcView = (r: { sim: Sim }): ActorView | undefined => r.sim.view().actors.find((a) => a.kind === 'npc' && a.id === 'billy');

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
export function at(r: BRig, x: number, y: number): void {
  r.hero.x = x; r.hero.y = y; r.hero.vx = 0; r.hero.vy = 0;
  r.s.trailX.fill(x); r.s.trailY.fill(y);
}

/** Puts Billy down at (x, y) and holds him in his recovery for `frames`, with every timer far off, so a test can read what a hit does to him. */
export function park(r: BRig, x: number, y: number, frames = 99999): void {
  r.boss.x = x; r.boss.y = y; r.boss.hx = x; r.boss.hy = y;
  r.b.move = 'recover';
  r.b.t = frames;
  r.boss.mode = 'recover';
  r.b.chargeCd = 99999;
  r.b.grabCd = 99999;
  r.boss.cd = 99999;
}

/** The charge is due and Billy stands `from` px east of the hero, with a clear line. */
export function charger(from = 100, over: Parameters<typeof bRig>[0] = {}): BRig {
  const r = bRig({ god: false, ...over });
  r.b.chargeCd = 0;
  r.b.grabCd = 99999;
  r.boss.cd = 99999;
  at(r, r.boss.x - from, r.boss.y);
  return r;
}

/** The grab is due and the hero stands `from` px west of Billy. */
export function grabber(from = 20, over: Parameters<typeof bRig>[0] = {}): BRig {
  const r = bRig({ god: false, ...over });
  r.b.grabCd = 0;
  r.b.chargeCd = 99999;
  r.boss.cd = 99999;
  at(r, r.boss.x - from, r.boss.y);
  return r;
}

/** One hit from `by` that takes him from full HP down by `dmg` (power chosen to be hard to survive), noCrit. */
export const hammer = (r: BRig, power = 60): number => hitEnemy(r.s, r.hero, r.boss, { power, noCrit: true });

/**
 * A rig whose Billy has been hit at 40 HP and is kneeling. The events of the two ticks after the hit come back. With `raged` he was below
 * half HP first, so the two Flayed he calls are on the floor too.
 */
export function pinnedRig(over: Parameters<typeof bRig>[0] = {}, party: PartySeed[] = PARTY, raged = false): { r: BRig; ev: SimEvent[] } {
  const r = bRig(over, true, party);
  park(r, r.boss.x, r.boss.y);
  if (raged) {
    r.boss.hp = r.boss.hpMax * 0.4;
    hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
    run(r.sim, 6);
  }
  r.boss.hp = 40;
  hammer(r);
  return { r, ev: run(r.sim, 2) };
}

export const slotOf = (r: { s: S }, id: string): number => r.s.heroes.findIndex((h) => h.id === id);

/** Swaps to Eleven and gives the swap time to land. */
export function becomeEleven(r: BRig): Hero {
  r.sim.step(inp({ swapTo: slotOf(r, 'eleven') }));
  run(r.sim, 24);
  return r.s.heroes[r.s.active] as Hero;
}

/** Puts every hero `d` px west of Billy, on his row. */
export function standAt(r: BRig, d: number): void {
  r.sim.dev.teleport(r.boss.x - d, r.boss.y);
}

/** Knocks a hero out the way a hit would, with the body on the floor. */
export function knockOut(r: BRig, id: string): void {
  const h = r.s.heroes.find((x) => x.id === id) as Hero;
  h.hp = 0; h.ko = true; h.anim = 'ko';
  r.s.bodies.push({ id: h.id, x: h.x, y: h.y, dir: h.dir, t: 0 });
}
