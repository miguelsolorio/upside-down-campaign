// Shared rigs for the stage 5.1 tests: the stage's kit, its rooms as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_51 as S, ROWS } from '../src/world/stages/stage51.ts';
import type { TileRect } from '../src/world/types.ts';
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
/** The rooms as floor rectangles. The town's are open fields with their dressing standing in them. */
export const ROOMS: Record<string, TileRect> = {
  street: { tx: 1, ty: 32, w: 20, h: 6 }, plaza: { tx: 21, ty: 28, w: 28, h: 10 }, gap: { tx: 43, ty: 26, w: 5, h: 2 }, forecourt: { tx: 21, ty: 18, w: 28, h: 8 },
  gate: { tx: 22, ty: 16, w: 3, h: 2 }, southcorr: { tx: 1, ty: 13, w: 27, h: 3 }, west: { tx: 1, ty: 6, w: 4, h: 7 }, northcorr: { tx: 1, ty: 2, w: 27, h: 4 },
  store: { tx: 19, ty: 6, w: 6, h: 5 }, cache: { tx: 10, ty: 8, w: 6, h: 3 }, bay: { tx: 29, ty: 2, w: 20, h: 14 },
};
export const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'checkpoint', 'square', 'cache_hint', 'commander', 'level_clear'];
export const SCRIPT_IDS = ['l14_start', 'l14_checkpoint', 'l14_square', 'l14_cache_hint', 'l14_commander', 'l14_clear'];
