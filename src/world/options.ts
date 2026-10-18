// Turns stage data into the grid and SimOptions. Pure: the play scene and the Node tests both use it.
import type { Difficulty, Grid, PartySeed, SimOptions, Stash, Vec2 } from '../core/types.ts';
import type { BotWaypoint } from '../combat/bot.ts';
import { buildGrid } from '../core/tiles.ts';
import type { StageData } from './types.ts';

export interface SimBuild {
  party: PartySeed[];
  /** Where the active hero stands. Defaults to the stage start. */
  start?: Vec2;
  difficulty?: Difficulty;
  seed?: number;
  god?: boolean;
  /** Spawn ids already cleared (retry). */
  skipSpawns?: string[];
  /** Prop ids already opened (retry). */
  openProps?: string[];
  /** Quarters the party walks in with, and Erica's stash (docs/level-7.md, "Erica and the stash"). */
  purse?: number;
  stash?: Stash;
  /** The party has Max's Walkman (docs/level-11.md). */
  walkman?: boolean;
}

/** Props that stay open across a retry or a load, and the ones the dev panel offers to open. */
export const KEPT_PROPS: ReadonlySet<string> = new Set([
  'gate', 'log', 'target', 'lights', 'door', 'console', 'crate', 'camera', 'van', 'vines', 'firebox', 'hidden', 'crack', 'gap',
  'shutter', 'cipher', 'mirror', 'clock',
]);

export function stageGrid(data: StageData): Grid {
  return buildGrid(data.rows);
}

export function simOptions(data: StageData, grid: Grid, b: SimBuild): SimOptions {
  return {
    grid,
    party: b.party,
    start: b.start ?? data.start,
    spawns: data.spawns,
    hazards: data.hazards,
    enemyMult: data.enemyMult,
    xpMult: data.xpMult,
    burrows: data.burrows,
    defense: data.defense,
    skipSpawns: b.skipSpawns,
    openProps: b.openProps,
    difficulty: b.difficulty,
    seed: b.seed,
    god: b.god,
    purse: b.purse,
    stash: b.stash,
    walkman: b.walkman,
  };
}

/**
 * The bot's route from where a retry or a load puts the party: the waypoint nearest the checkpoint and every one after it. The route
 * the bot already walked is done, so a fresh bot picks up from the lights instead of walking back to the start.
 */
export function routeFrom(waypoints: BotWaypoint[], at: Vec2): BotWaypoint[] {
  let best = 0, bestD = Infinity;
  waypoints.forEach((w, i) => {
    const d = Math.hypot(w.x - at.x, w.y - at.y);
    if (d < bestD) { best = i; bestD = d; }
  });
  return waypoints.slice(best);
}
