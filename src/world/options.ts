// Turns stage data into the grid and SimOptions. Pure: the play scene and the Node tests both use it.
import type { Difficulty, Grid, PartySeed, SimOptions, Vec2 } from '../core/types.ts';
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
}

export function stageGrid(data: StageData): Grid {
  return buildGrid(data.rows);
}

export function simOptions(data: StageData, grid: Grid, b: SimBuild): SimOptions {
  return {
    grid,
    party: b.party,
    start: b.start ?? data.start,
    spawns: data.spawns,
    skipSpawns: b.skipSpawns,
    openProps: b.openProps,
    difficulty: b.difficulty,
    seed: b.seed,
    god: b.god,
  };
}
