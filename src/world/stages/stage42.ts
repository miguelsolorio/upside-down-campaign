// Stage 4.2, the Hellfire Club and the Creel House (docs/level-11.md). A stub until World builds it: the club, a hall of the Creel
// House with its parlor (the memory room), and the clear at the far end. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, StageData, TileRect } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  'ØØØØØØØØØããããããããããã',
  'ØÙÚÚÛÙÜÙØäåäääåääåäã',
  'Øààààààààææææççææææã',
  'Øààâââàààææææççææææã',
  'Øààâââàààææææææææææã',
  'Øáàáàáàààæææææææææêã',
  'Øààààààààææææææææææã',
  'ØØØØØØØØØããããããããããã',
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 2, 4, 5) }, steps: [{ t: 'say', script: 'l11_start' }] },
  { id: 'level_clear', when: { rect: rect(16, 2, 3, 5) }, steps: [{ t: 'say', script: 'l11_clear' }, { t: 'finish' }] },
];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_42: StageData = {
  id: '4.2',
  name: 'The Creel House',
  rows: ROWS,
  start: { x: px(2), y: fy(4) },
  spawns: [{ kind: 'prop', id: 'lights_club', prop: 'lights', tx: 6, ty: 2, w: 48, h: 16 }],
  beats: BEATS,
  puzzles: [],
  waves: [],
  lights: [{ x: px(4), y: fy(3), r: 40 }],
  time: 'night',
  music: 'hawkins',
  checkpoints: [{ prop: 'lights_club', x: px(7), y: fy(4) }],
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  memory: rect(9, 0, 10, 8),
  waypoints: [wp(7, 6), wp(12, 6), wp(17, 4)],
};
