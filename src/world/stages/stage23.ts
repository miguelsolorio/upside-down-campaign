// Stage 2.3, The Gate. A stand-in so the build and the campaign run while World builds the real map from
// docs/level-6.md. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { StageData } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;

/** A walled room, 20 by 12, with the exit on the east side. */
const ROWS: string[] = [
  '99999999999999999999',
  '99999999999999999999',
  ...Array.from({ length: 9 }, () => '9' + '8'.repeat(18) + '9'),
  '99999999999999999999',
];

const WAYPOINTS: BotWaypoint[] = [{ x: px(4), y: fy(6) }, { x: px(17), y: fy(6) }];

export const STAGE_23: StageData = {
  id: '2.3',
  name: 'The Gate',
  rows: ROWS,
  start: { x: px(3), y: fy(6) },
  spawns: [],
  beats: [{ id: 'level_clear', when: { rect: { tx: 17, ty: 2, w: 2, h: 9 } }, steps: [{ t: 'finish' }] }],
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'lab',
  checkpoints: [],
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  waypoints: WAYPOINTS,
};
