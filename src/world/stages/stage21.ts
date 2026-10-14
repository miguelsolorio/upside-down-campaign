// Stage 2.1, the Palace and the patch, by day. Pure data: no DOM, so Node tests can import it. Spawns are in stage21_data.ts.
//
// The route is an S. North band, going east: the Palace Arcade (north-west) and its door onto Main Street, which runs east to
// the gap in Merrill's fence where vines1 grows. Middle band: the pumpkin rows, three lanes of furrow and rot two tiles wide,
// cut by two rows of pumpkins that are open at opposite ends, so the way runs west, east and west again, past vines and spore
// pods rooted in the rot, to the lane down to the barn yard.
// South band, going east: the barn yard under the barn wall, where Lucas shoots target1 to open gate1, the far field behind
// it (a lane of rot and rotten pumpkins with vines hidden in the corn beside it), the corn wall that only Will can find the
// way through (hidden1), and the hole beyond it, where three waves of young demodogs come up. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { SPAWNS } from './stage21_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   '&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 0
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 1
   '&+++++++++++++ZZZZ&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 2
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 3
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 4
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 5
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', // 6
   '&+++++++++++++++++&&&&&&&&&&&&&&&&&&&&&&&&%%%%%%', // 7
   '&&&&&&&&++&&&&&&&&&@@@@@@@@@@@@@@@@@@@@@@@%%%%%%', // 8
   '@/////////////l///////////l///////////l////////%', // 9
   '@==============================================%', // 10
   '@______________________________________________%', // 11
   '@==============================================%', // 12
   '@///////////////////l///////////l///////////l//%', // 13
   'TFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF::FFFFFT', // 14
   'TT^;;;;;^^^;;;^^^^^^^^^^^^^^^^^^^^^.0:.::::*00:T', // 15
   'TT^;;;;;^^;;;;;^^^^^^^^^^^^^^^^^^^^:.::::.:..::T', // 16
   'TT*;;$****$****$****$****$****$****00000*000000T', // 17
   'TT;;;;;;;;;^^^^^^^^;;;^^^^;;;;;^^^^************T', // 18
   'TT;;;;;;;;;^^^^^^^;;;;;;;;;;;;;^^^^************T', // 19
   'TT**$***$***$***$***$***$***$***$^^************T', // 20
   'TT^;;;;;;;^^;;;;;;;^^;;;;;;;^^^^^^^************T', // 21
   'TT^^^^^^^^^^;;;;;;;^^;;;;;;;^^^^^^^000000000000T', // 22
   'TT:::FFFFFFFFFFFFFFFFFF||||||||||||||||||||||||T', // 23
   'TT:::T]]]]]]]]]]]]]]]]T||||||||||||||||||||||||T', // 24
   'TT:::T[[[[[[[[[[[[[[[[T||||||||||||||||||||||||T', // 25
   'T::::::::::::::::::::::F^^^^$$^^^^^^*^^^$$^^^^^T', // 26
   'T:..::::::::::::::::::::^^^^^^^;;^;;^;;^;;^;;^;T', // 27
   'T:.:::::::::::::::::::::^^^^^^^;;^;;^;;^;;^;;^;T', // 28
   'T::::::::::::::::0::::::^^*^^^*^^$$^^$^^^^^^^^^T', // 29
   'T:::00:::::::::::::::::F|||||||||||||||||||||;|T', // 30
   'T::::::::::::::::::00::F|||||||||||||||||||||;|T', // 31
   'T::::::::::::::::::::::F||;;;;;;;;;;;;;;;;;;;;;T', // 32
   'T::.:::::::::::::::::::F|;t;;;;;<<<<<<;;;;;;;;;T', // 33
   'T::::::::::::::::::::::F;;;;;;;<<<<<<<<;;;;;;;;T', // 34
   'T:::.:::00::.::::::::.:F;;r;;;<<<<<<<<<<;;r;;;;T', // 35
   'T::::..:::.:::::.:::..:F|;;;;;;<<<<<<<<;;;;t;;|T', // 36
   'T::::::::::::::::::::::F||;t|;;;;;;;;;;;;|;;;;|T', // 37
   'TTTTTTTTTTTTTTTTTTTTTTTT|||||||||||||||||||||||T', // 38
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

export const WAVES = ['amb1', 'amb2', 'amb3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 4, 5, 4) }, steps: [say('l4_start')] },
  { id: 'max', when: { rect: rect(10, 5, 5, 3) }, steps: [say('l4_max')] },
  { id: 'street', when: { rect: rect(7, 7, 4, 3) }, steps: [say('l4_street')] },
  { id: 'dart', when: { rect: rect(20, 11, 5, 3) }, steps: [say('l4_dart')] },
  { id: 'vines_hint', when: { rect: rect(38, 11, 6, 3) }, steps: [say('l4_vines_hint')] },
  { id: 'vines_cleared', when: { event: 'propCleared', prop: 'vines1' }, steps: [say('l4_vines_done')] },
  { id: 'patch', when: { rect: rect(28, 15, 7, 2) }, steps: [say('l4_patch')] },
  { id: 'target_hint', when: { rect: rect(6, 26, 10, 6) }, steps: [say('l4_shoot_hint')] },
  { id: 'gate1_open', when: { event: 'targetHit', prop: 'target1' }, steps: [{ t: 'open', prop: 'gate1' }, say('l4_shoot_done')] },
  { id: 'sense_hint', when: { rect: rect(40, 26, 7, 4) }, steps: [say('l4_sense_hint')] },
  { id: 'hidden_open', when: { event: 'propCleared', prop: 'hidden1' }, steps: [say('l4_sense_done')] },
  { id: 'ambush', when: { rect: rect(30, 33, 11, 5) }, steps: [say('l4_ambush'), { t: 'waves' }] },
  { id: 'level_clear', when: { cleared: 'amb3' }, steps: [say('l4_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
const PUZZLES: PuzzleDef[] = [
  { id: 'vines', beat: 'vines_hint', prop: 'vines1', hero: 'dustin', hint: 'MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY' },
  { id: 'target', beat: 'target_hint', prop: 'target1', hero: 'lucas', blocks: ['gate1'], hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT' },
  { id: 'hidden', beat: 'sense_hint', prop: 'hidden1', hero: 'will', hint: 'MAYBE WILL CAN FEEL THE WAY' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The Palace, past Max at her cabinet, out the door and east along Main Street past the rats to the fence gap; the vines come off by flag.
  wp(6, 6), wp(11, 6), wp(8, 7), wp(8, 10), wp(14, 11), wp(22, 11), wp(30, 11), wp(37, 12), wp(40, 13, { open: 'vines1' }),
  // The pumpkin rows: west along the top lane, through the gap at the west end of the first row, east along the middle lane,
  // through the gap at the east end of the second row, and west again along the bottom lane to the lane down to the yard.
  wp(40, 15), wp(34, 16), wp(24, 16), wp(14, 16), wp(5, 16), wp(3, 18), wp(8, 19), wp(20, 19), wp(32, 19), wp(33, 21), wp(24, 22),
  wp(14, 22), wp(4, 22), wp(3, 24),
  // The barn yard, east across it to the gate, which opens by flag.
  wp(3, 27), wp(9, 29), wp(15, 30), wp(21, 28, { open: 'gate1' }),
  // The far field's lane, to the corn wall, where the hidden path opens by flag, and through it into the hole.
  wp(26, 28), wp(32, 28), wp(38, 28), wp(44, 28, { open: 'hidden1' }), wp(45, 31), wp(44, 34),
  // The hole: the last waypoint is inside the ambush trigger.
  wp(38, 34),
];

// ---------------------------------------------------------------- the stage
export const STAGE_21: StageData = {
  id: '2.1',
  name: 'The Palace and the patch',
  rows: ROWS,
  start: { x: px(4), y: fy(5) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: [],
  time: 'day',
  music: 'hawkins',
  checkpoints: [
    { prop: 'lights_palace', x: px(6), y: fy(6) },
    { prop: 'lights_patch', x: px(38), y: fy(15) },
    { prop: 'lights_field', x: px(44), y: fy(34) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  // Nearly all the damage here is the demodogs' bites, and the whole stage is a warm-up for them: this is what it takes for a bot
  // that dodges the vines and the pods to clear 19 of 20 for about 200 damage, and one that does not to clear 15 (measured with
  // node scripts/measure-stage.ts 2.1 chief 20 [--careless]). The spec's 1.15 cost the bot 15 damage.
  enemyMult: 3.15,
  waypoints: WAYPOINTS,
};
