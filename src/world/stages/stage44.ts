// Stage 4.4, Vecna's lair (docs/level-13.md). A stub until World builds it: a room of the Creel House in its Upside Down skin and the
// attic beyond, with the clear at the far end. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, StageData, TileRect } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  'ãããããããããããĆĆĆĆĆĆĆĆĆ',
  'äåääåäääääãććććććććĆ',
  'æææææççæææĈĊĈĈĈĈĈĊĆĆ',
  'æææææççæææĈĊĈĉĉĉĈĊĆĆ',
  'ææææææææææĈĊĈĉĉĉĈĊĆĆ',
  'æææææææææêãĊĈĈĈĈĈĊĆĆ',
  'ãããããããããããĆĆĆĆĆĆĆĆĆ',
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(0, 2, 4, 4) }, steps: [{ t: 'say', script: 'l13_start' }] },
  { id: 'level_clear', when: { rect: rect(14, 2, 3, 3) }, steps: [{ t: 'say', script: 'l13_clear' }, { t: 'finish' }] },
];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_44: StageData = {
  id: '4.4',
  name: "Vecna's lair",
  rows: ROWS,
  start: { x: px(1), y: fy(3) },
  spawns: [{ kind: 'prop', id: 'lights_porch', prop: 'lights', tx: 2, ty: 2, w: 48, h: 16 }],
  beats: BEATS,
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'upside',
  skin: 'upside',
  checkpoints: [{ prop: 'lights_porch', x: px(3), y: fy(4) }],
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  waypoints: [wp(8, 4), wp(12, 4), wp(15, 3)],
};
