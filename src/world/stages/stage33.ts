// Stage 3.3, the Starcourt food court, the end of chapter 3. A stand-in so the build and the campaign run while World builds the
// real map from docs/level-9.md. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { StageData } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;

/** A walled hall, 20 by 12, with the exit on the east side. */
const ROWS: string[] = [
  'ÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂ',
  'ÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃ',
  ...Array.from({ length: 9 }, () => 'Ã' + 'À'.repeat(18) + 'Ã'),
  'ÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂ',
];

const WAYPOINTS: BotWaypoint[] = [{ x: px(4), y: fy(6) }, { x: px(17), y: fy(6) }];

export const STAGE_33: StageData = {
  id: '3.3',
  name: 'The food court',
  rows: ROWS,
  start: { x: px(3), y: fy(6) },
  spawns: [],
  beats: [{ id: 'level_clear', when: { rect: { tx: 15, ty: 2, w: 4, h: 9 } }, steps: [{ t: 'finish' }] }],
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'starcourt',
  checkpoints: [],
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  waypoints: WAYPOINTS,
};
