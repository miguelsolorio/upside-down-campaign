// Stage 4.1, Kamchatka (docs/level-10.md). A stub until World builds it: one snowy yard inside the wire, a string of lights, and the
// clear at the far end. Pure data: no DOM, so Node tests can import it.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, StageData, TileRect } from '../types.ts';

const T = 16;
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  'ËËËËËËËËËËËËËËËËËËËË',
  'ËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË',
  'ËÈÈÈÉÈÈÈÈÈÈÈÈÈÈÈÈÈÈË',
  'ËÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÊÈÈË',
  'ËÈÈÊÈÈÈÈÈÒÈÈÈÈÈÊÈÈÈË',
  'ËÈÈÊÈÈÈÈÈÈÈÈÑÈÈÊÈÈÈË',
  'ËÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÈÈÈË',
  'ËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË',
  'ËËËËËËËËËËËËËËËËËËËË',
];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 1, 4, 7) }, steps: [{ t: 'say', script: 'l10_start' }] },
  { id: 'level_clear', when: { rect: rect(16, 1, 3, 7) }, steps: [{ t: 'say', script: 'l10_clear' }, { t: 'finish' }] },
];

const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

export const STAGE_41: StageData = {
  id: '4.1',
  name: 'Kamchatka',
  rows: ROWS,
  start: { x: px(3), y: fy(5) },
  spawns: [{ kind: 'prop', id: 'lights_yard', prop: 'lights', tx: 2, ty: 1, w: 48, h: 16 }],
  beats: BEATS,
  puzzles: [],
  waves: [],
  lights: [],
  time: 'night',
  music: 'kamchatka',
  checkpoints: [{ prop: 'lights_yard', x: px(3), y: fy(3) }],
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  waypoints: [wp(6, 6), wp(12, 6), wp(17, 4)],
};
