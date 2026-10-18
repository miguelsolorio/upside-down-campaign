// Shared rigs for the stage 4.1 tests: the stage's kit, its rooms as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_41 as S, ROWS } from '../src/world/stages/stage41.ts';
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
/** The rooms as floor rectangles. The yards are one open field each, with their dressing standing in them. */
export const ROOMS: Record<string, TileRect> = {
  pen: { tx: 1, ty: 28, w: 14, h: 11 }, strip: { tx: 16, ty: 28, w: 27, h: 11 }, yard: { tx: 1, ty: 16, w: 42, h: 11 },
  corridor: { tx: 1, ty: 11, w: 18, h: 3 }, cache: { tx: 3, ty: 5, w: 4, h: 4 }, guardroom: { tx: 11, ty: 4, w: 5, h: 5 },
  shaft: { tx: 19, ty: 8, w: 5, h: 6 }, pit: { tx: 25, ty: 2, w: 18, h: 12 },
};
export const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'yard', 'crack_hint', 'crack_done', 'block', 'cell_hint', 'shaft', 'pit', 'pit_down', 'level_clear'];
export const SCRIPT_IDS = ['l10_start', 'l10_yard', 'l10_crack_hint', 'l10_crack_done', 'l10_block', 'l10_cell_hint', 'l10_shaft', 'l10_pit', 'l10_pit_down', 'l10_clear'];
