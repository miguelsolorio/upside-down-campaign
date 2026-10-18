// Stage 5.2, the Abyss (docs/level-15.md). A stub until World builds it: three islands of Hawkins floating over the void, joined by two vine
// bridges, and the clear on the last one. Pure data: no DOM, so Node tests can import it. Spawns are in stage52_data.ts.
//
// The void is the `abyssgap` tile (solid to walking, clear to the eye, so the backdrop shows through), all round the map. Each island is
// floor over a cliff row, over the rock that tapers under it: a lawn at the gate's landing with a porch at its edge, a road with its line, and a classroom floor.
// A bridge runs east from the lawn to the road and from the road to the classroom. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage52_data.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2
  //0123456789012345678901234567
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 0
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 1
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 2
  'ùù¸¸¸¸ýýùùùùÿÿÿÿÿÿùùùüüüüüùù', // 3
  'ùù¸¸¸¸¸¸øøøøþþþþþþøøøüüüüüùù', // 4
  'ùù¸¸¸¸¸¸ùùùùÿÿÿÿÿÿùùùüüüüüùù', // 5
  'ùù¸¸¸¸¸¸ùùùùÿÿÿÿÿÿùùùüüüüüùù', // 6
  'ùùûûûûûûùùùùûûûûûûùùùûûûûûùù', // 7
  'ùùúúúúúúùùùùúúúúúúùùùúúúúúùù', // 8
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 9
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 10
  'ùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 11
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 3, 6, 4) }, steps: [{ t: 'say', script: 'l15_start' }] },
  { id: 'level_clear', when: { rect: rect(22, 3, 3, 4) }, steps: [{ t: 'say', script: 'l15_clear' }, { t: 'finish' }] },
];

const PUZZLES: PuzzleDef[] = [];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_52: StageData = {
  id: '5.2',
  name: 'The Abyss',
  rows: ROWS,
  start: { x: px(4), y: fy(5) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // A day stage: the island tops are painted at their final values and baked with no night pass (docs/level-15.md, "Shape").
  time: 'day',
  // The void behind everything, drawn by drawAbyssBg.
  backdrop: 'abyss',
  // `upside` from the start: the twins' beat switches it to `clock`.
  music: 'upside',
  checkpoints: [{ prop: 'lights_landing', x: px(4), y: fy(4) }],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  waypoints: [wp(5, 4), wp(9, 4), wp(14, 4), wp(19, 4), wp(23, 4)],
};
