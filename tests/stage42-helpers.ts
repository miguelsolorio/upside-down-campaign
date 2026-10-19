// Shared rigs for the stage 4.2 tests: the stage's kit, its rooms as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_42 as S, ROWS } from '../src/world/stages/stage42.ts';
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
/** The rooms as floor rectangles, doorways not included. The street and the yards are open fields, with their dressing standing in them. */
export const ROOMS: Record<string, TileRect> = {
  club: { tx: 2, ty: 34, w: 11, h: 5 }, schoolhall: { tx: 14, ty: 34, w: 22, h: 5 }, street: { tx: 1, ty: 27, w: 46, h: 5 },
  lot: { tx: 1, ty: 21, w: 12, h: 6 }, yard: { tx: 14, ty: 21, w: 32, h: 5 },
  foyer: { tx: 35, ty: 15, w: 11, h: 4 }, dining: { tx: 14, ty: 15, w: 20, h: 4 }, pantry: { tx: 14, ty: 9, w: 5, h: 4 },
  hall: { tx: 20, ty: 9, w: 26, h: 4 }, parlor: { tx: 14, ty: 3, w: 14, h: 4 }, backhall: { tx: 29, ty: 3, w: 17, h: 4 },
};
export const inRoom = (room: string, x: number, y: number): boolean => rectTiles(ROOMS[room] as TileRect).some(([u, v]) => u === x && v === y);
export const roomOf = (x: number, y: number): string | null => Object.keys(ROOMS).find((r) => inRoom(r, x, y)) ?? null;
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'walkman', 'street', 'yard', 'mirror_hint', 'mirror_done', 'cache_hint', 'curse', 'curse_end', 'finale', 'level_clear'];
export const SCRIPT_IDS = ['l11_start', 'l11_walkman', 'l11_street', 'l11_yard', 'l11_mirror_hint', 'l11_mirror_done', 'l11_cache_hint', 'l11_curse', 'l11_curse_end', 'l11_finale', 'l11_clear'];
/** The gates the party opens on the way: mirror1 (Eddie's riff, or the bot's flag) and the clock, which blocks nothing. */
export const GATES = ['mirror1', 'mirror4'];
