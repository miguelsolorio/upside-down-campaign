// Shared helpers for the sim tests: small arenas, input builders and a runner. Not a test file.
import type { Grid, SimEvent, SimInput, SimOptions, SimSpawn, Sim } from '../src/core/types.ts';
import { buildGrid } from '../src/core/tiles.ts';
import { createSim } from '../src/combat/index.ts';
import { buildSim } from '../src/combat/sim.ts';
import type { S } from '../src/combat/state.ts';

export function idle(): SimInput {
  return {
    mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false,
    dashPressed: false, swapDelta: 0, swapTo: -1, burstPressed: false,
  };
}

export function inp(p: Partial<SimInput> = {}): SimInput { return { ...idle(), ...p }; }

/** A w by h tile arena ringed with pines. `marks` replaces tiles: { 'x,y': 'T' }. */
export function arena(w: number, h: number, marks: Record<string, string> = {}): Grid {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      row += marks[`${x},${y}`] ?? (edge ? 'T' : '.');
    }
    rows.push(row);
  }
  return buildGrid(rows);
}

export const tc = (t: number): number => t * 16 + 8;
export const tf = (t: number): number => t * 16 + 12;

export function makeSim(over: Partial<SimOptions> & { spawns?: SimSpawn[] } = {}): Sim {
  return createSim({
    grid: arena(24, 16),
    party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
    start: { x: tc(4), y: tf(8) },
    spawns: [],
    seed: 1,
    ...over,
  });
}

/** Like makeSim, but also returns the internal state so a test can poke it (set HP, fill the burst meter). */
export function makeWhite(over: Partial<SimOptions> & { spawns?: SimSpawn[] } = {}): { sim: Sim; s: S } {
  return buildSim({
    grid: arena(24, 16),
    party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
    start: { x: tc(4), y: tf(8) },
    spawns: [],
    seed: 1,
    ...over,
  });
}

export function rat(id: string, tx: number, ty: number, group = 'g', extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn {
  return { kind: 'enemy', id, type: 'rat', tx, ty, group, ...extra };
}
export function agent(id: string, tx: number, ty: number, group = 'g', extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn {
  return { kind: 'enemy', id, type: 'agent', tx, ty, group, ...extra };
}

/** Steps the sim n ticks with a constant input, returning every event produced. */
export function run(sim: Sim, n: number, input: SimInput = idle()): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...sim.step(input));
  return out;
}

/** One tick with a one-shot press (attackPressed, specialPressed, ...) followed by idle ticks. */
export function press(sim: Sim, p: Partial<SimInput>, after = 0): SimEvent[] {
  const out = [...sim.step(inp(p))];
  out.push(...run(sim, after));
  return out;
}

export function ofType<T extends SimEvent['t']>(ev: SimEvent[], t: T): Extract<SimEvent, { t: T }>[] {
  return ev.filter((e): e is Extract<SimEvent, { t: T }> => e.t === t);
}

export function sfxIds(ev: SimEvent[]): string[] {
  return ofType(ev, 'sfx').map((e) => e.id);
}

// ---------------------------------------------------------------- headless bot fights
import { createBot } from '../src/combat/bot.ts';
import type { BotWaypoint } from '../src/combat/bot.ts';
import type { Difficulty, HeroSnapshot, PartySeed, RunStats } from '../src/core/types.ts';

export interface FightResult {
  cleared: boolean;
  allDown: boolean;
  frames: number;
  kos: number;
  party: HeroSnapshot[];
  stats: RunStats;
  events: number;
}

export interface FightOptions {
  difficulty?: Difficulty;
  maxFrames?: number;
  party?: PartySeed[];
  rats?: number;
  agents?: number;
}

/** A 32 by 18 arena with a few pines. Four rats loiter ahead and three agents patrol past them. */
export function fightSpawns(rats: number, agents: number): SimSpawn[] {
  const out: SimSpawn[] = [];
  const ratSpots: [number, number][] = [[13, 6], [14, 11], [16, 8], [18, 12], [12, 9], [17, 5]];
  for (let i = 0; i < rats; i++) {
    const [tx, ty] = ratSpots[i % ratSpots.length] as [number, number];
    out.push(rat(`r${i}`, tx, ty, 'rats'));
  }
  const agentSpots: [number, number, number, number][] = [[22, 5, 22, 11], [25, 12, 25, 6], [27, 8, 21, 8], [23, 9, 28, 9]];
  for (let i = 0; i < agents; i++) {
    const [ax, ay, bx, by] = agentSpots[i % agentSpots.length] as [number, number, number, number];
    out.push(agent(`a${i}`, ax, ay, 'agents', { patrol: [{ tx: ax, ty: ay }, { tx: bx, ty: by }] }));
  }
  return out;
}

export function fightArena(): Grid {
  const marks: Record<string, string> = {};
  for (const [x, y] of [[8, 5], [8, 6], [10, 11], [10, 12], [15, 9], [20, 7], [20, 8], [24, 10]]) marks[`${x},${y}`] = 'T';
  return arena(32, 18, marks);
}

export function botFight(seed: number, o: FightOptions = {}): FightResult {
  const grid = fightArena();
  const sim = createSim({
    grid,
    party: o.party ?? [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
    start: { x: tc(3), y: tf(9) },
    spawns: fightSpawns(o.rats ?? 4, o.agents ?? 3),
    difficulty: o.difficulty ?? 'chief',
    seed,
  });
  const waypoints: BotWaypoint[] = [{ x: tc(28), y: tf(9) }];
  const bot = createBot({ grid, waypoints });
  const max = o.maxFrames ?? 7200;
  let events = 0, allDown = false;
  for (let f = 0; f < max; f++) {
    const ev = sim.step(bot.next(sim));
    events += ev.length;
    if (ev.some((e) => e.t === 'allDown')) { allDown = true; break; }
    if (sim.enemiesAlive() === 0) break;
  }
  const stats = sim.stats();
  return { cleared: sim.enemiesAlive() === 0 && !allDown, allDown, frames: stats.frames, kos: stats.kos, party: sim.party(), stats, events };
}
