// Stage 2.1, The Palace and the patch. A stand-in so the build and the campaign run while World builds the real map from
// docs/level-4.md. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { StageData } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;

/** A walled room, 20 by 12, with the exit on the east side. */
const ROWS: string[] = [
  '&&&&&&&&&&&&&&&&&&&&',
  '&&&&&&&&&&&&&&&&&&&&',
  ...Array.from({ length: 9 }, () => '&' + '+'.repeat(18) + '&'),
  '&&&&&&&&&&&&&&&&&&&&',
];

const WAYPOINTS: BotWaypoint[] = [{ x: px(4), y: fy(6) }, { x: px(17), y: fy(6) }];

export const STAGE_21: StageData = {
  id: '2.1',
  name: 'The Palace and the patch',
  rows: ROWS,
  start: { x: px(3), y: fy(6) },
  spawns: [],
  beats: [{ id: 'level_clear', when: { rect: { tx: 17, ty: 2, w: 2, h: 9 } }, steps: [{ t: 'finish' }] }],
  puzzles: [],
  waves: [],
  lights: [],
  time: 'day',
  music: 'hawkins',
  checkpoints: [],
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  waypoints: WAYPOINTS,
};
