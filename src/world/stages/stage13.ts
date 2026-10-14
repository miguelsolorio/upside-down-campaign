// Stage 1.3, Hawkins Middle School. A stand-in so the build and the campaign run while World builds the real map from
// docs/level-3.md. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { StageData } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;

/** A walled room, 20 by 12, with the exit on the east side. */
const ROWS: string[] = [
  'KKKKKKKKKKKKKKKKKKKK',
  'KJJJJJJJJJJJJJJJJJJK',
  ...Array.from({ length: 9 }, () => 'K' + 'n'.repeat(18) + 'K'),
  'KKKKKKKKKKKKKKKKKKKK',
];

const WAYPOINTS: BotWaypoint[] = [{ x: px(4), y: fy(6) }, { x: px(17), y: fy(6) }];

export const STAGE_13: StageData = {
  id: '1.3',
  name: 'Hawkins Middle School',
  rows: ROWS,
  start: { x: px(3), y: fy(6) },
  spawns: [],
  beats: [{ id: 'level_clear', when: { rect: { tx: 17, ty: 2, w: 2, h: 9 } }, steps: [{ t: 'finish' }] }],
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'upside',
  checkpoints: [],
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  waypoints: WAYPOINTS,
};
