// Stage loader. getStage builds the collision grid and bakes the tiles into one canvas, once per stage id.
import type { Grid, SimOptions, TimeOfDay } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { bakeStage } from '../gfx/index.ts';
import type { BakedStage } from '../gfx/index.ts';
import { simOptions, stageGrid } from './options.ts';
import type { SimBuild } from './options.ts';
import { STAGE_11 } from './stages/stage11.ts';
import type { StageData } from './types.ts';

export interface Stage extends StageData {
  grid: Grid;
  baked: BakedStage;
  /** Map size in px. */
  wPx: number;
  hPx: number;
  /** Builds the options for a fresh sim on this stage. */
  sim(b: SimBuild): SimOptions;
}

const DATA: Record<string, StageData> = { '1.1': STAGE_11 };
const cache = new Map<string, Stage>();

/** Unknown ids fall back to stage 1.1, the only one in this build. time overrides the stage's own light. */
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
    wPx: grid.w * TILE,
    hPx: grid.h * TILE,
    sim: (b) => simOptions(data, grid, b),
  };
  cache.set(key, stage);
  return stage;
}
