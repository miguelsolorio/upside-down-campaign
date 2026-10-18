// Stage 5.1, Hawkins under lockdown, the start of chapter 5 (docs/level-14.md). A stub until World builds it: a town street at dusk under
// the army, with a rift in the asphalt, a gate through the wall at its east end, and the Lab's loading bay beyond, the clear at the far
// end. Pure data: no DOM, so Node tests can import it. Spawns and the pools of light are in stage51_data.ts.
//
// The street: a row of house fronts (a roof row over a front row, with a door and creeping vines), the sidewalk, two lanes round a double
// yellow line with a white stop line across them and the rift in the south lane, the sidewalk, a strip of lawn. A wall at its east end has a gap three tiles high for the
// road, and the Lab lies beyond: a cap row over an army-dressed wall, floor, cable runs and two stacks of crates. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage51_data.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2
  //0123456789012345678901234567
  '²²²²²²²²²²²²²²VVVVVVVVVVVVVV', // 0
  '²³³¶³³µ³³¶³³³²´´´´´´´´´´´´´V', // 1
  '²¬¬¬¬¬¬¬¬¬¬¬¬²½½½ª«½½½½½½½½V', // 2
  '²¡¡¡¡¡¡¡¡¡©¡¡¡½½½½½½½½½½½½½V', // 3
  '²¥¥¥¥¥¥¥¥¥¥¥¥¡½¾¾¾¾¾¾¾¿½½½½V', // 4
  '²¡¡¡¡¡¹»¼¡©¡¡¡½½½½½½½½¿¿¿½½V', // 5
  '²¬¬¬¬¬¬¬¬¬¬¬¬²½½½½½½½½½½½½½V', // 6
  '²®®®®®®®®®®®®²½½½½½½«ª½½½½½V', // 7
  '²²²²²²²²²²²²²²VVVVVVVVVVVVVV', // 8
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 2, 5, 6) }, steps: [{ t: 'say', script: 'l14_start' }] },
  { id: 'level_clear', when: { rect: rect(23, 2, 3, 6) }, steps: [{ t: 'say', script: 'l14_clear' }, { t: 'finish' }] },
];

const PUZZLES: PuzzleDef[] = [];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_51: StageData = {
  id: '5.1',
  name: 'Hawkins Lockdown',
  rows: ROWS,
  start: { x: px(3), y: fy(4) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // Dusk going to night, under the army's floodlights (docs/level-14.md, "Shape").
  time: 'night',
  // `lab` from the start: the Commander's beat switches it to `clock`.
  music: 'lab',
  checkpoints: [{ prop: 'lights_street', x: px(3), y: fy(3) }],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  waypoints: [wp(5, 3), wp(12, 3), wp(16, 3), wp(21, 5), wp(24, 5)],
};
