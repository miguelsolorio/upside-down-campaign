// Shared rigs for the chapter 5 foe tests (foes-ch5*.test.ts): a unit placed in a hall at a distance from the hero, the Abyss's ring of
// floating rock with a void round it, and a fight with the bot. Not a test file.
import type { ActorView, EnemyKind, HeroId, Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import { buildGrid } from '../src/core/tiles.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { arena, idle, makeWhite, ofType, tc, tf } from './sim-helpers.ts';

export type EnemySpawn = Extract<SimSpawn, { kind: 'enemy' }>;
export interface Seed { id: HeroId; level?: number }

export const unit = (id: string, type: EnemyKind, tx: number, ty: number, extra: Partial<EnemySpawn> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });
export const foe = (s: S, i = 0): Enemy => s.enemies[i] as Enemy;
export const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
/** Every random draw lands mid-range: a hit's spread is 1.0 and a jitter is nothing. */
export const steady = (s: S): void => { s.rng = () => 0.5; };
export const actorOf = (sim: Sim, id: string, i = 0): ActorView | undefined => sim.view().actors.filter((a) => a.kind === 'enemy' && a.id === id)[i];
export const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
export const sfxIn = (ev: SimEvent[], id: string): number => ev.filter((e) => e.t === 'sfx' && e.id === id).length;
/** Frames in a row, from `from`, that `pred` holds for. */
export const streak = <T>(xs: T[], from: number, pred: (x: T) => boolean): number => {
  let n = 0;
  while (xs[from + n] !== undefined && pred(xs[from + n] as T)) n++;
  return n;
};

export const MIKE: Seed[] = [{ id: 'mike', level: 10 }];
/** The party 5.1 walks in with (Hopper locked in) and 5.2 (Will locked in). */
export const PARTY_51: Seed[] = [{ id: 'mike', level: 10 }, { id: 'dustin', level: 9 }, { id: 'robin', level: 7 }, { id: 'hopper', level: 7 }];
export const PARTY_52: Seed[] = [{ id: 'mike', level: 10 }, { id: 'dustin', level: 9 }, { id: 'robin', level: 7 }, { id: 'will', level: 7 }];

/**
 * A 32 by 16 hall with the hero (Mike at Lv 10 unless `party` says otherwise, 900 HP so nothing ends the test) at tile (3, 8) and one `type`
 * `gap` px east of him, facing west, and awake. Its timers are left alone; `still` sets them out of reach so it only does what a test asks.
 */
export function hall(type: EnemyKind, gap: number, extra: Partial<EnemySpawn> = {}, party: Seed[] = MIKE, still = false) {
  const r = makeWhite({ party, grid: arena(32, 16), start: { x: tc(3), y: tf(8) }, spawns: [unit('u', type, 8, 8, { dir: 'left', ...extra })], seed: 11 });
  hero(r.s).st.hp = 900;
  hero(r.s).hp = 900;
  // Mike's fiat crit (his Lv 3 talent) waits for the first hit that gets through; a test that counts damage does not want it.
  r.s.armed = false;
  const e = foe(r.s);
  e.x = hero(r.s).x + gap; e.y = hero(r.s).y; e.hx = e.x; e.hy = e.y;
  if (still) { e.cd = 1e9; if (e.ch5) e.ch5.buttCd = 1e9; }
  return { ...r, e, h: hero(r.s) };
}

/** The two twins (group `boss`) in an open 32 by 16 hall, one in the north and one in the south, awake, with the Lv 7 Will's party at the west wall and nothing to fall into. */
export function pair(party: Seed[] = PARTY_52) {
  const r = makeWhite({ party, grid: arena(32, 16), start: { x: tc(5), y: tf(8) }, spawns: [unit('twin1', 'twin', 22, 5, { group: 'boss', dormant: true }), unit('twin2', 'twin', 22, 11, { group: 'boss', dormant: true })], seed: 5 });
  r.sim.spawnGroup('boss');
  r.s.armed = false;
  return { ...r, twins: r.s.enemies.filter((e) => e.kind === 'twin'), h: hero(r.s) };
}

/** A round island of floor ('ÿ') of radius `r` tiles in a w by h map of void ('ù'). Its south edge is a cliff row over a row of rock. */
export function ringRows(w = 24, h = 24, r = 9): string[] {
  const cx = w / 2, cy = h / 2 - 1;
  const floor = (x: number, y: number): boolean => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += floor(x, y) ? 'ÿ' : floor(x, y - 1) ? 'û' : floor(x, y - 2) ? 'ú' : 'ù';
    rows.push(row);
  }
  return rows;
}
export const ringGrid = (w = 24, h = 24, r = 9) => buildGrid(ringRows(w, h, r));

/** The ring with the party at its south edge and the twins (group `boss`) in the north, asleep until `sim.spawnGroup('boss')`. */
export function ring(party: Seed[] = PARTY_52, twins: [number, number][] = [[10, 6], [14, 6]], over: Parameters<typeof makeWhite>[0] = {}) {
  const spawns = twins.map(([tx, ty], i) => unit(`twin${i + 1}`, 'twin', tx, ty, { group: 'boss', dormant: true }));
  const r = makeWhite({ grid: ringGrid(), party, start: { x: tc(12), y: tf(16) }, spawns, seed: 7, ...over });
  r.sim.spawnGroup('boss');
  return { ...r, twins: r.s.enemies.filter((e) => e.kind === 'twin'), h: hero(r.s) };
}

export interface Fight { cleared: boolean; allDown: boolean; frames: number; taken: number; kos: number }

/** The bot plays `spawns` in a hall (or `grid`) from tile `start` toward tile `goal`, until every enemy is down, the party is, or `max` frames pass. */
export function botFight(spawns: SimSpawn[], o: { seed: number; party?: Seed[]; grid?: ReturnType<typeof arena>; start?: [number, number]; goal?: [number, number]; careless?: boolean; max?: number; wake?: string } ): Fight {
  const grid = o.grid ?? arena(30, 16);
  const [sx, sy] = o.start ?? [3, 8];
  const [gx, gy] = o.goal ?? [26, 8];
  const sim = createSim({ grid, party: o.party ?? PARTY_51, start: { x: tc(sx), y: tf(sy) }, spawns, difficulty: 'chief', seed: o.seed });
  const bot = createBot({ grid, waypoints: [{ x: tc(gx), y: tf(gy), wake: o.wake }], careless: o.careless });
  let allDown = false;
  for (let f = 0; f < (o.max ?? 7200); f++) {
    const ev = sim.step(bot.next(sim));
    if (ev.some((e) => e.t === 'allDown')) { allDown = true; break; }
    if (sim.enemiesAlive() === 0) break;
  }
  const st = sim.stats();
  return { cleared: sim.enemiesAlive() === 0 && !allDown, allDown, frames: st.frames, taken: st.damageTaken, kos: st.kos };
}

/** Kills twin `i` of a rig with one blow and lets the sim reap it (past the hit-stop). */
export function slay(r: { sim: Sim; s: S; h: Hero; twins: Enemy[] }, i: number): void {
  hitEnemy(r.s, r.h, r.twins[i] as Enemy, { power: 99, angle: 0, noCrit: true });
  for (let f = 0; f < 12; f++) r.sim.step(idle());
}
