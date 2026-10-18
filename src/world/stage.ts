// Stage loader. getStage builds the collision grid and bakes the tiles into one canvas, once per stage id.
import type { Grid, SimOptions, TimeOfDay, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { bakeStage } from '../gfx/index.ts';
import type { BakedStage } from '../gfx/index.ts';
import { simOptions, stageGrid } from './options.ts';
import type { SimBuild } from './options.ts';
import { STAGE_11 } from './stages/stage11.ts';
import { STAGE_12 } from './stages/stage12.ts';
import { STAGE_13 } from './stages/stage13.ts';
import { STAGE_21 } from './stages/stage21.ts';
import { STAGE_22 } from './stages/stage22.ts';
import { STAGE_23 } from './stages/stage23.ts';
import { STAGE_31 } from './stages/stage31.ts';
import { STAGE_32 } from './stages/stage32.ts';
import { STAGE_33 } from './stages/stage33.ts';
import { STAGE_41 } from './stages/stage41.ts';
import { STAGE_42 } from './stages/stage42.ts';
import type { StageData } from './types.ts';

export interface Stage extends StageData {
  grid: Grid;
  baked: BakedStage;
  /** The memory room's skin (the Creel House in Blood red), baked for a stage with a `memory` rect. Null otherwise. */
  memoryBaked: BakedStage | null;
  /** Map size in px. */
  wPx: number;
  hPx: number;
  /** Builds the options for a fresh sim on this stage. */
  sim(b: SimBuild): SimOptions;
}

const DATA: Record<string, StageData> = { '1.1': STAGE_11, '1.2': STAGE_12, '1.3': STAGE_13, '2.1': STAGE_21, '2.2': STAGE_22, '2.3': STAGE_23, '3.1': STAGE_31, '3.2': STAGE_32, '3.3': STAGE_33, '4.1': STAGE_41, '4.2': STAGE_42 };
const cache = new Map<string, Stage>();

/** Where the lead stands at the start of a stage, and what the stage is called. They read the data without baking tiles. */
export function stageStart(id: string): Vec2 {
  return (DATA[id] ?? STAGE_11).start;
}
export function stageName(id: string): string {
  return (DATA[id] ?? STAGE_11).name;
}

/** Unknown ids fall back to stage 1.1. time overrides the stage's own light. */
export function getStage(id: string, time?: TimeOfDay): Stage {
  const data = DATA[id] ?? STAGE_11;
  const at = time ?? data.time;
  const key = `${data.id}:${at}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = stageGrid(data);
  const stage: Stage = {
    ...data,
    time: at,
    grid,
    baked: bakeStage(data.rows, at === 'night'),
    memoryBaked: data.memory ? bakeStage(data.rows, at === 'night', 'memory') : null,
    wPx: grid.w * TILE,
    hPx: grid.h * TILE,
    sim: (b) => simOptions(data, grid, b),
  };
  cache.set(key, stage);
  return stage;
}
