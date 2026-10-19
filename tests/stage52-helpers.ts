// Shared rigs for the stage 5.2 tests: the stage's kit, its islands as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_52 as S, ROWS } from '../src/world/stages/stage52.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import { propTiles, rectTiles, stageKit } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

export { S, ROWS, propTiles, rectTiles };
export const kit = stageKit(S);
const { grid, idx, props } = kit;
export const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
export const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
export const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
export const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
export const xpOf = (e: (typeof kit.enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The islands as floor rectangles (the ring's is its bounding box: it is round). The neck and the pad are the cache. */
export const ISLANDS: Record<string, TileRect> = {
  lawn: { tx: 3, ty: 32, w: 14, h: 7 }, road: { tx: 22, ty: 32, w: 16, h: 7 }, pad: { tx: 39, ty: 33, w: 6, h: 5 }, deck: { tx: 8, ty: 21, w: 19, h: 7 },
  classroom: { tx: 4, ty: 5, w: 16, h: 12 }, ring: { tx: 31, ty: 3, w: 18, h: 17 },
};
export const inIsland = (name: string, x: number, y: number): boolean => rectTiles(ISLANDS[name] as TileRect).some(([u, v]) => u === x && v === y);
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
/** The gates in route order: burn1, sense1, crack1 (and gap1, which leads only to the cache). */
export const ROUTE_GATES = ['burn1', 'sense1', 'crack1'];
/** The same stage with door1 shut, as the twins beat leaves it. */
export const shut = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.id === 'door1' ? { ...s, solid: true } : s)) } as StageData);
export const BEAT_IDS = ['start', 'burn_hint', 'burn_done', 'gap_hint', 'sense_hint', 'sense_done', 'crack_hint', 'crack_done', 'twins', 'level_clear'];
export const SCRIPT_IDS = ['l15_start', 'l15_burn_hint', 'l15_burn_done', 'l15_gap_hint', 'l15_sense_hint', 'l15_sense_done', 'l15_crack_hint', 'l15_crack_done', 'l15_twins', 'l15_clear'];
