// Shared helpers for the stage tests: the flood fill, the footprints of solid props, the bot's route, a camera's
// blind spots, a stand-in sim for the director and the headless runner that plays a whole stage with the bot. Not a test file.
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { astar, buildNav } from '../src/combat/nav.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { isLoss } from '../src/world/loss.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import type { CamDef, Difficulty, Grid, HeroSnapshot, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';

/** Props the sim makes solid unless the spawn says otherwise (see combat/init.ts). Cameras and lights are not. */
export const SOLID_KINDS = new Set(['log', 'gate', 'van', 'crate', 'floodlight', 'door', 'console', 'tank', 'rack', 'generator']);

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

/** A prop's footprint in tiles. */
export function propTiles(p: Prop): [number, number][] {
  const w = p.w ?? (p.prop === 'van' ? 48 : 16), h = p.h ?? (p.prop === 'van' ? 32 : 16);
  return rectTiles({ tx: p.tx, ty: p.ty, w: Math.ceil(w / 16), h: Math.ceil(h / 16) });
}

/**
 * The tiles the bot walks: an A* path between each pair of waypoints over the bot's own map (solid tiles and furniture),
 * with every gate it has flagged so far open. Null for a pair with no path.
 */
export function botRoute(S: StageData, kit: StageKit): { tiles: Set<number>; missing: number | null } {
  const furniture = kit.props.filter((p) => p.prop === 'tank' || p.prop === 'rack' || p.prop === 'generator')
    .map((p) => ({ x: p.tx * 16, y: p.ty * 16, w: p.w ?? 16, h: p.h ?? 16 }));
  const nav = buildNav(kit.grid, furniture);
  const tiles = new Set<number>();
  let from = [kit.startTx, kit.startTy] as [number, number];
  for (const [i, w] of S.waypoints.entries()) {
    const to = tileOf(w.x, w.y);
    const path = astar(nav, from[0], from[1], to[0], to[1]);
    if (!path) return { tiles, missing: i };
    tiles.add(kit.idx(from[0], from[1]));
    for (const q of path) tiles.add(kit.idx(q.x, q.y));
    from = to;
  }
  return { tiles, missing: null };
}

const RAD = Math.PI / 180;
/** Every tile between two points, sampled every 4 px, not counting the tile the line starts in. */
function lineTiles(ax: number, ay: number, bx: number, by: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4);
  const t0x = Math.floor(ax / 16), t0y = Math.floor(ay / 16);
  for (let i = 1; i < n; i++) {
    const x = Math.floor((ax + ((bx - ax) * i) / n) / 16), y = Math.floor((ay + ((by - ay) * i) / n) / 16);
    if ((x !== t0x || y !== t0y) && !out.some(([u, v]) => u === x && v === y)) out.push([x, y]);
  }
  return out;
}

/** Can this camera ever see a hero standing anywhere on tile (tx, ty)? Range, the sweep band and walls or solid props. */
export function camCanSee(kit: StageKit, cam: Prop, tx: number, ty: number, blocked: Uint8Array): boolean {
  const c = cam.cam as CamDef;
  const cx = cam.tx * 16 + 8, cy = cam.ty * 16 + 8;
  const lo = Math.min(c.from, c.to) - c.half, hi = Math.max(c.from, c.to) + c.half;
  // The middle of the foot box can be anywhere in the tile: test its corners and its middle.
  for (const [fx, fy] of [[5, 4], [11, 4], [5, 12], [11, 12], [8, 8]] as const) {
    const hx = tx * 16 + fx, hy = ty * 16 + fy;
    if (Math.hypot(hx - cx, hy - cy) > c.range) continue;
    let a = Math.atan2(hy - cy, hx - cx) / RAD;
    while (a < lo) a += 360;
    if (a > hi) continue;
    if (lineTiles(cx, cy, hx, hy).every(([x, y]) => !blocked[kit.idx(x, y)])) return true;
  }
  return false;
}

/**
 * Where Lucas can shoot a camera from without it ever seeing him: a walkable tile on one of his eight lines to the
 * camera, within his reach, that the camera cannot see, with no solid prop on the way. Null if there is none.
 * dir is the unit step from the tile toward the camera.
 */
export function camSafeShot(kit: StageKit, cam: Prop, reach: number, open: Set<string>): { tx: number; ty: number; dx: number; dy: number } | null {
  const walls = kit.blocked(open);
  const props = new Uint8Array(kit.grid.w * kit.grid.h);
  for (const p of kit.props) if (!open.has(p.id) && (p.solid ?? SOLID_KINDS.has(p.prop))) for (const [x, y] of propTiles(p)) props[kit.idx(x, y)] = 1;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    for (let k = 1; ; k++) {
      const tx = cam.tx + dx * k, ty = cam.ty + dy * k;
      if (tx < 0 || ty < 0 || tx >= kit.grid.w || ty >= kit.grid.h) break;
      if (Math.hypot(dx * k, dy * k) * 16 > reach - 16) break;
      if (props[kit.idx(tx, ty)]) break;
      if (walls[kit.idx(tx, ty)]) continue;
      if (!camCanSee(kit, cam, tx, ty, walls)) return { tx, ty, dx: -dx, dy: -dy };
    }
  }
  return null;
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
  /** The stage was lost: the whole party went down or, in a defense, the ward fell (`fell`). */
  allDown: boolean;
  /** The loss was the ward falling (a defense, 2.3). */
  fell: boolean;
  frames: number;
  levels: number[];
  xp: number;
  kos: number;
  /** HP the party lost over the run, from sim.stats(). */
  damage: number;
  /** The lowest the party's total HP fell, as a share of its total maximum (0 to 1). */
  lowestHp: number;
  /** Every dialogue script the director played, in order. */
  said: string[];
  /** The party as the stage left it. Hand it to seedsFrom to carry it into the next stage. */
  party: HeroSnapshot[];
  /** Props the director opened, groups it woke and the alarm, in order. */
  steps: string[];
}

/** Plays a whole stage: the bot walks the waypoints, the director runs the beats, the dialogue is skipped. */
export function playStage(S: StageData, seed: number, party: PartySeed[], maxFrames = 30000, difficulty: Difficulty = 'chief', careless = false): Run {
  const grid = stageGrid(S);
  const sim = createSim(simOptions(S, grid, { party, seed, difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
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
  let allDown = false, fell = false, f = 0, lowestHp = 1;
  for (; f < maxFrames && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    const now = sim.party();
    lowestHp = Math.min(lowestHp, now.reduce((a, m) => a + m.hp, 0) / now.reduce((a, m) => a + m.hpMax, 0));
    if (ev.some(isLoss)) allDown = true;
    if (ev.some((e) => e.t === 'wardDown')) fell = true;
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
  }
  const st = sim.stats();
  const snap = sim.party();
  return {
    done: dir.finished(), allDown, fell, frames: f, levels: snap.map((p) => p.level), xp: st.xpEarned, kos: st.kos, damage: st.damageTaken, lowestHp,
    said, party: snap, steps,
  };
}
