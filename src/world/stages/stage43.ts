// Stage 4.3, Upside Down Hawkins (docs/level-12.md). A stub until World builds it: a street in the Upside Down, the roof of Eddie's
// trailer and its song, and Eddie's fall. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, StageData, TileRect } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀąąąąąąĀĀ',
  'ðñðòðñðĀĀĀĀĀĀĀąĄĄĄĄąĀĀ',
  'îîîîîîîîîîîîîîąĄĄĄĄąĀĀ',
  'íííííííííííííííĄĄĄĄąĀĀ',
  'ëëëëëëëëëëëëëëëĄĄĄĄąĀĀ',
  'ìëëìëëìëëìëëìëëĄĄĄĄąĀĀ',
  'ëëëëëëëëëëëëëëąĄĄĄĄąĀĀ',
  'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀąąąąąąĀĀ',
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(0, 2, 4, 5) }, steps: [{ t: 'say', script: 'l12_start' }] },
  { id: 'solo', when: { rect: rect(15, 1, 4, 6) }, steps: [{ t: 'say', script: 'l12_solo' }, { t: 'solo', chart: 'rooftop' }] },
  { id: 'level_clear', when: { after: 'solo' }, steps: [{ t: 'fall', hero: 'eddie' }, { t: 'say', script: 'l12_fall' }, { t: 'finish' }] },
];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_43: StageData = {
  id: '4.3',
  name: 'Upside Down Hawkins',
  rows: ROWS,
  start: { x: px(1), y: fy(4) },
  spawns: [{ kind: 'prop', id: 'lights_tear', prop: 'lights', tx: 2, ty: 2, w: 48, h: 16 }],
  beats: BEATS,
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'upside',
  storm: true,
  checkpoints: [{ prop: 'lights_tear', x: px(3), y: fy(4) }],
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  waypoints: [wp(8, 4), wp(14, 4), wp(17, 4)],
};
