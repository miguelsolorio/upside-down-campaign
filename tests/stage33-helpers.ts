// Shared rigs for the stage 3.3 tests: the stage's kit, its rooms as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_33 as S, ROWS } from '../src/world/stages/stage33.ts';
import type { StageData, TileRect } from '../src/world/types.ts';
import { propTiles, rectTiles, stageKit } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

export { S, ROWS, propTiles, rectTiles };
export const kit = stageKit(S);
const { grid, idx, enemies, props } = kit;
/** The same stage with the court's doors shut, as the billy beat leaves them. */
export const shut = stageKit({ ...S, spawns: S.spawns.map((s) => (s.kind === 'prop' && s.prop === 'door' ? { ...s, solid: true } : s)) } as StageData);
export const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
export const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
export const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';
export const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
export const xpOf = (e: (typeof enemies)[number]): number => ENEMY_DEFS[e.type].xp * (e.tier === 'elite' ? ELITE.xp : 1);
/** The rooms as floor rectangles. The balcony's island (x 29 to 45, y 6 to 9) is rock inside its rectangle. */
export const ROOMS: Record<string, TileRect> = {
  hall: { tx: 2, ty: 27, w: 10, h: 11 }, stockroom: { tx: 3, ty: 19, w: 6, h: 6 }, kitchens: { tx: 13, ty: 27, w: 19, h: 11 },
  freezer: { tx: 15, ty: 19, w: 10, h: 6 }, concourse: { tx: 33, ty: 22, w: 14, h: 16 }, escalators: { tx: 40, ty: 15, w: 2, h: 7 },
  balcony: { tx: 25, ty: 2, w: 21, h: 13 }, court: { tx: 2, ty: 3, w: 22, h: 14 },
};
export const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'kitchen', 'crack_hint', 'crack_done', 'concourse', 'crate_hint', 'crate_done', 'sour', 'balcony', 'billy', 'billy_down', 'billy_freed', 'level_clear'];
export const SCRIPT_IDS = ['l9_start', 'l9_kitchen', 'l9_crack_hint', 'l9_crack_done', 'l9_concourse', 'l9_crate_hint', 'l9_crate_done', 'l9_sour', 'l9_balcony', 'l9_billy',
  'l9_billy_down', 'l9_billy_freed', 'l9_clear', 'l9_letter'];
