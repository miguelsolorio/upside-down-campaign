// Shared rigs for the stage 4.3 tests: the stage's kit, its places as rectangles, and the small lookups every one of them uses. Not a test file.
import { ELITE, ENEMY_DEFS } from '../src/enemies/defs.ts';
import { STAGE_43 as S, ROWS } from '../src/world/stages/stage43.ts';
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
/** The places the route runs through, as floor rectangles: the lawn at the tear, the street, the first row's yards, the alley, the cross street, the park's gate, lanes and lot, and the deck. */
export const PLACES: Record<string, TileRect> = {
  tear: { tx: 1, ty: 26, w: 9, h: 6 }, street: { tx: 1, ty: 32, w: 29, h: 5 }, yards: { tx: 10, ty: 29, w: 20, h: 3 },
  alley: { tx: 18, ty: 25, w: 2, h: 4 }, cross: { tx: 10, ty: 20, w: 20, h: 5 }, lawn2: { tx: 10, ty: 19, w: 20, h: 1 },
  gate: { tx: 30, ty: 21, w: 1, h: 3 }, lanes: { tx: 31, ty: 20, w: 16, h: 5 }, south: { tx: 31, ty: 27, w: 16, h: 2 },
  lot: { tx: 31, ty: 15, w: 16, h: 3 }, ladder: { tx: 37, ty: 13, w: 2, h: 2 }, deck: { tx: 30, ty: 2, w: 16, h: 10 },
};
export const inPlace = (place: string, x: number, y: number): boolean => rectTiles(PLACES[place] as TileRect).some(([u, v]) => u === x && v === y);
export const placeOf = (x: number, y: number): string | null => Object.keys(PLACES).find((r) => inPlace(r, x, y)) ?? null;
export const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
export const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && y >= r.ty && x < r.tx + r.w && y < r.ty + r.h;
export const BEAT_IDS = ['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3', 'ladder', 'roof', 'solo', 'level_clear'];
export const SCRIPT_IDS = ['l12_start', 'l12_street', 'l12_clock1', 'l12_mirror_hint', 'l12_clock2', 'l12_park', 'l12_clock3', 'l12_roof', 'l12_solo', 'l12_fall'];
/** The gate the party opens on the way: mirror1, by Eddie's riff or the bot's flag. The clocks block nothing, and door_roof is open until the roof beat. */
export const GATES = ['mirror1'];
