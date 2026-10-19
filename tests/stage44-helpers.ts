// Shared rigs for the stage 4.4 tests: the stage's kit, its rooms as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_44 as S, ROWS } from '../src/world/stages/stage44.ts';
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
/** The rooms as floor rectangles, doorways not included. The attic's takes in its eaves. */
export const ROOMS: Record<string, TileRect> = {
  attic: { tx: 16, ty: 2, w: 16, h: 11 }, landing: { tx: 10, ty: 15, w: 28, h: 3 }, dining: { tx: 10, ty: 20, w: 12, h: 4 },
  parlor: { tx: 23, ty: 20, w: 15, h: 4 }, hall: { tx: 10, ty: 26, w: 28, h: 3 }, foyer: { tx: 10, ty: 31, w: 28, h: 3 },
  porch: { tx: 10, ty: 36, w: 28, h: 3 },
};
export const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
export const roomOf = (x: number, y: number): string | null => Object.keys(ROOMS).find((r) => inRoom(r, x, y)) ?? null;
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'house', 'stairs', 'vecna', 'float', 'burn', 'level_clear'];
export const SCRIPT_IDS = ['l13_start', 'l13_house', 'l13_stairs', 'l13_vecna', 'l13_float', 'l13_burn', 'l13_clear', 'l13_hill'];
/** The rug in tiles: the box of the attic's rug letters. */
export const RUG = (() => {
  const t = rectTiles({ tx: 0, ty: 0, w: grid.w, h: grid.h }).filter(([x, y]) => ch(x, y) === 'ĉ');
  const xs = t.map(([x]) => x), ys = t.map(([, y]) => y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), n: t.length };
})();
