// Shared helpers for the stage tests: the flood fill, the footprints of solid props, a stand-in sim for the
// director and the headless runner that plays a whole stage with the bot. Not a test file.
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import type { Grid, HeroSnapshot, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';

/** Props the sim makes solid unless the spawn says otherwise (see combat/init.ts). */
export const SOLID_KINDS = new Set(['log', 'gate', 'van', 'crate', 'floodlight', 'door', 'console']);

export type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
export type Item = Extract<SimSpawn, { kind: 'item' }>;
export type Prop = Extract<SimSpawn, { kind: 'prop' }>;
export type Npc = Extract<SimSpawn, { kind: 'npc' }>;

/** The tile a feet position stands on. */
export const tileOf = (x: number, y: number): [number, number] => [Math.floor(x / 16), Math.floor((y - 4) / 16)];

export const rectTiles = (r: TileRect): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = r.ty; y < r.ty + r.h; y++) for (let x = r.tx; x < r.tx + r.w; x++) out.push([x, y]);
  return out;
};

export interface StageKit {
  grid: Grid;
  idx(tx: number, ty: number): number;
  enemies: Enemy[];
  items: Item[];
  props: Prop[];
  npcs: Npc[];
  startTx: number;
  startTy: number;
  /** Solid tiles plus the footprint of every solid prop that is not open yet. */
  blocked(open: Set<string>): Uint8Array;
  /** Four-way flood fill from the start tile (or `from`), with the props in `open` out of the way. */
  flood(open: Set<string>, from?: [number, number]): Uint8Array;
}

/** Everything the reachability tests need to know about one stage. */
export function stageKit(S: StageData): StageKit {
  const grid = stageGrid(S);
  const idx = (tx: number, ty: number): number => ty * grid.w + tx;
  const enemies = S.spawns.filter((s): s is Enemy => s.kind === 'enemy');
  const items = S.spawns.filter((s): s is Item => s.kind === 'item');
  const props = S.spawns.filter((s): s is Prop => s.kind === 'prop');
  const npcs = S.spawns.filter((s): s is Npc => s.kind === 'npc');
  const [startTx, startTy] = tileOf(S.start.x, S.start.y);

  function blocked(open: Set<string>): Uint8Array {
    const b = new Uint8Array(grid.solid);
    for (const p of props) {
      if (open.has(p.id) || !(p.solid ?? SOLID_KINDS.has(p.prop))) continue;
      const w = p.w ?? (p.prop === 'van' ? 48 : 16), h = p.h ?? (p.prop === 'van' ? 32 : 16);
      for (let y = p.ty; y < p.ty + Math.ceil(h / 16); y++) for (let x = p.tx; x < p.tx + Math.ceil(w / 16); x++) b[idx(x, y)] = 1;
    }
    return b;
  }

  function flood(open: Set<string>, from: [number, number] = [startTx, startTy]): Uint8Array {
    const b = blocked(open);
    const seen = new Uint8Array(grid.w * grid.h);
    const stack = [idx(from[0], from[1])];
    seen[stack[0] as number] = 1;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const x = i % grid.w, y = (i / grid.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
        const j = idx(nx, ny);
        if (seen[j] || b[j]) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    return seen;
  }

  return { grid, idx, enemies, items, props, npcs, startTx, startTy, blocked, flood };
}

// ---------------------------------------------------------------- a stand-in sim for the director
/** A scripted sim stand-in: it only has to answer the director. `alive` is how many enemies each group has left. */
export function fakeEnv(alive: Record<string, number>, party: string[] = ['mike', 'dustin', 'lucas']): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    recruit: (id: string) => { log.push(`recruit ${id}`); },
    party: () => party.map((id) => ({ id })),
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim,
    say: (id, done) => { log.push(`say ${id}`); done(); },
    scare: (done) => { log.push('scare'); done(); },
    open: (id) => { log.push(`open ${id}`); },
    alarm: () => { log.push('alarm'); },
    jingle: (id) => { log.push(`jingle ${id}`); },
    finish: () => { log.push('finish'); },
  };
  return { env, log };
}

// ---------------------------------------------------------------- the real sim
export const idle: SimInput = { mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, swapDelta: 0, swapTo: -1, burstPressed: false };

/** Steps the sim until an event passes `stop` (returned) or `frames` run out (null). */
export function runUntil(sim: Sim, frames: number, input: (f: number) => SimInput, stop: (e: SimEvent) => boolean): SimEvent | null {
  for (let f = 0; f < frames; f++) for (const e of sim.step(input(f))) if (stop(e)) return e;
  return null;
}

export interface Run {
  done: boolean;
  allDown: boolean;
  frames: number;
  levels: number[];
  xp: number;
  kos: number;
  /** Every dialogue script the director played, in order. */
  said: string[];
  /** The party as the stage left it. Hand it to seedsFrom to carry it into the next stage. */
  party: HeroSnapshot[];
  /** Props the director opened, groups it woke and the alarm, in order. */
  steps: string[];
}

/** Plays a whole stage: the bot walks the waypoints, the director runs the beats, the dialogue is skipped. */
export function playStage(S: StageData, seed: number, party: PartySeed[], maxFrames = 30000): Run {
  const grid = stageGrid(S);
  const sim = createSim(simOptions(S, grid, { party, seed }));
  const bot = createBot({ grid, waypoints: S.waypoints });
  const said: string[] = [];
  const steps: string[] = [];
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim,
    say: (id, done) => { said.push(id); done(); },
    scare: (done) => done(),
    open: (id) => { steps.push(`open ${id}`); sim.openProp(id); },
    alarm: () => { steps.push('alarm'); },
    jingle: () => undefined,
    finish: () => undefined,
  });
  let allDown = false, f = 0;
  for (; f < maxFrames && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    if (ev.some((e) => e.t === 'allDown')) allDown = true;
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
  }
  const st = sim.stats();
  const snap = sim.party();
  return { done: dir.finished(), allDown, frames: f, levels: snap.map((p) => p.level), xp: st.xpEarned, kos: st.kos, said, party: snap, steps };
}
