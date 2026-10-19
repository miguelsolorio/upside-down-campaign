// Stage 5.1, Hawkins under lockdown, the start of chapter 5 (docs/level-14.md). Pure data: no DOM, so Node tests can import it. Spawns, items,
// props and the pools of light are in stage51_data.ts.
//
// The route, in tiles. The map is 50 by 40. Main Street runs along the south-west at dusk: a row of house fronts on its north side, two lanes
// round a double yellow line, the sidewalks and a strip of lawn, with the party at its west end, a parked truck, sandbags and a curfew sign.
// It runs east into the checkpoint at x 18 and 19: roofs fill the sidewalks and the lawn (the booth and a barrier stand in front of them), and
// boom1 is the one way through, three tiles tall across the road. Past it the road opens into the town square, a field of asphalt with red rifts, an army camp
// at its south-east end and a row of buildings across its middle (y 26 and 27) with a gap five tiles wide at the east end. The gap leads north
// to the forecourt in front of the Lab, a road under two floodlights, and west along it to the Lab's front gate, three tiles wide in a wall
// two deep. Inside, the halls are an S: the south corridor west, the west connector north, and the north corridor east to door1, with a store
// off the north corridor and the cache behind crate1, shut in a neck of the south corridor's north wall. door1 is the doorway of the loading
// bay, an arena 20 by 14 in the north-east, with a wall on every side. The Lab's walls are a cap row over a face row looking onto the floor
// below (V over armywall), the house fronts a roof row over a front row. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage51_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //00000000001111111111222222222233333333334444444444
  //01234567890123456789012345678901234567890123456789
  'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 0
  'V´´´´´´´´´´´´´´´´´´´´´´´´´´´V´´´´´´´´´´´´´´´´´´´´V', // 1
  'V½½½½½½½ª«½½½½½½½½½½½½½½½½½½´½½½½½½½½½½½ª«½½½½½½½V', // 2
  'V½½½½½¿½½½½½½½½½½½¾¾¾¾¾½½½½½½½½½½½½½½½½½½½½½½½½½½V', // 3
  'V½¾¾¾¾¿½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½½V', // 4
  'V½½½½½½½½½½½½½½½ª«½½½½½½½½½½V½½½½½½½½½½½½½½½½½½½½V', // 5
  'V½½½½VVVVVVVVVVVVVV½½½½½½VVVV½½½½½½½½½½½½½½½½½½½½V', // 6
  'V½½½½VVVVV´´´´´´VVV½½½½½½VVVV½½½½½½½½½½½½½½½½½½½½V', // 7
  'V½½½½VVVVV½½½½½½VVV½½½½½½VVVV½½½½½½½½½½½½½½½½½½½½V', // 8
  'Vª«½½VVVVV½½½½½½VVV½½½½½½VVVV½½½½½½½½½½½½½½½½½½½½V', // 9
  'V½½½½VVVVV½½½½½½VVVª«½½½½VVVV½¾¾¾¾¾¾¾¾¾¾¾¾¿½½½½½½V', // 10
  'V½½½½VVVVVVV½½VVVVVVVVVVVVVVV½½½½½½½½½½½½½¿½½½½½½V', // 11
  'V½½½½´´´´´´´½½´´´´´´´´´´´´´´V½½½½½½½½½½½½½¿½½½½½½V', // 12
  'V½½½½½½½½ª«½½½½¿½½½½½½½½½½½½V½½½½½½½½½½½½½½½½½½ª«V', // 13
  'V½½½¾¾¾¾¾¾¾¾¾¾¾¿½½½½½½½½½½½½V½ª«½½½½½½½½½½½½½½½½½V', // 14
  'V½½½½½½½½½½½½½½½½ª«½½½½½½½½½V½½½½½½½½½½½½½½½½½½½½V', // 15
  'VVVVVVVVVVVVVVVVVVVVVV½½½VVVVVVVVVVVVVVVVVVVVVVVVV', // 16
  'VVVVVVVVVVVVVVVVVVVVV´½½½´´´´´´´´´´´´´´´´´´´´´´´´V', // 17
  '²²²²²²²²²²²²²²²²²²²²²¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬²', // 18
  '²²²²²²²²²²²²²²²²²²²²²¡©©©¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 19
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¡¡¡¡¡¡¹»¼¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 20
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 21
  '²²²²²²²²²²²²²²²²²²²²²¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¡¡¡¡¡¡¡¡¡²', // 22
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 23
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 24
  '²²²²²²²²²²²²²²²²²²²²²¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬²', // 25
  '²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡²', // 26
  '²²²²²²²²²²²²²²²²²²²²²³³µ³¶³³³µµ³¶³³µ³³³¶³µ³¡¡¡¡¡¡²', // 27
  '²²²²²²²²²²²²²²²²²²²²²¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬²', // 28
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 29
  '²²²²²²²²²²²²²²²²²²²²²¡¡¡¡¡¡¹»¼¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 30
  '²³³³¶³µµ³³¶³³µ³³¶³²²³¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 31
  '²¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬²²¬¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¹»¼¡¡¡¡¡¡¡¡¡¡²', // 32
  '²¡¡¡¡¡¡¡¡¡¡¡¡¡¡©¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 33
  '²¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 34
  '²¡¡¡¡¡¡¡¡¡¡¡¡¡¡©¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¹»¼¡¡¡¡¡²', // 35
  '²¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬²²¬¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡²', // 36
  '²®®®®®®®®®®®®®®®®®²²®®®®®®®®®®®®®®®®®®®®®®®®®®®®®²', // 37
  '²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²', // 38
  '²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²²', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// `start` is the CHAPTER FIVE card (automatic on the first visit, opensChapter) and then Hopper's line. `checkpoint` is the three tiles in
// front of the boom gate: it wakes the squad behind the sandbags, and it is the boom gate's puzzle beat. `square` is the plaza's west end,
// just past the sandbags. `cache_hint` is the south corridor in front of crate1's neck. `commander` is the bay's west end, three tiles clear of
// door1 (column 28) so nobody stands in the doorway when it shuts: it shuts door1, switches to `clock` and wakes the Commander. The clear
// opens door1 again and finishes the stage, on the death of the group `boss`.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 32, 6, 5) }, steps: [say('l14_start')] },
  { id: 'checkpoint', when: { rect: rect(16, 33, 3, 3) }, steps: [say('l14_checkpoint'), { t: 'wake', group: 'checkpoint' }] },
  { id: 'square', when: { rect: rect(22, 29, 3, 7), needs: 'checkpoint' }, steps: [say('l14_square')] },
  { id: 'cache_hint', when: { rect: rect(11, 13, 4, 2) }, steps: [say('l14_cache_hint')] },
  {
    id: 'commander', when: { rect: rect(32, 3, 3, 4) },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, say('l14_commander'), { t: 'wake', group: 'boss' }],
  },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [say('l14_clear'), { t: 'open', prop: 'door1' }, { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// boom1 wants a smash: Steve's nail bat, or Hopper's fists and slam. Hopper is locked in, so the gate is always live and the lead can always
// pass; with Steve in the party the hint names him. crate1 wants Eleven's shove, and is only ever the cache: with her benched it shows nothing.
const PUZZLES: PuzzleDef[] = [
  {
    id: 'boom', beat: 'checkpoint', prop: 'boom1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT',
    alt: [{ hero: 'hopper', hint: 'MAYBE HOPPER SHOULD THROW A PUNCH' }],
  },
  { id: 'crate', beat: 'cache_hint', prop: 'crate1', hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER SHOVE' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Main Street east along the double line to the checkpoint. The bot breaks boom1 by flag from the hint beat's tiles, one short of the booth.
  wp(8, 34), wp(15, 34), wp(17, 34, { open: 'boom1' }),
  // The plaza along the line, then up through the gap in the buildings at its east end.
  wp(23, 34), wp(28, 34), wp(34, 34), wp(40, 34), wp(44, 32), wp(45, 28), wp(45, 22),
  // West along the forecourt's line to the gate and in.
  wp(40, 22), wp(34, 22), wp(28, 22), wp(23, 20), wp(23, 17), wp(23, 14),
  // The halls: west along the south corridor (past the cache's neck, which it leaves shut), north up the west connector and east along
  // the north corridor to door1 and into the commander trigger.
  wp(17, 14), wp(10, 14), wp(4, 13), wp(3, 9), wp(3, 5), wp(7, 4), wp(13, 4), wp(19, 4), wp(25, 4), wp(30, 4), wp(33, 5),
];

// ---------------------------------------------------------------- the stage
export const STAGE_51: StageData = {
  id: '5.1',
  name: 'Hawkins Lockdown',
  rows: ROWS,
  start: { x: px(3), y: fy(34) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // Dusk going to night, under the army's floodlights (docs/level-14.md, "Shape").
  time: 'night',
  // `lab` from the start: the commander beat switches it to `clock`, and a retry carries that on (musicAfter in world/triggers.ts).
  music: 'lab',
  checkpoints: [
    { prop: 'lights_street', x: px(3), y: fy(33) },
    { prop: 'lights_square', x: px(44), y: fy(29) },
    { prop: 'lights_lab', x: px(22), y: fy(3) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // Measured with node scripts/measure-stage.ts 5.1 chief 100 [--careless] on HARD, with the party a real run brings (Mike 10, Dustin 9, Robin 7,
  // Hopper 7): at 1.6 the bot clears 94 of 100 for 1.1 KOs, 39% lowest HP and 149 s (the fight 25% of it), the careless bot 61, and nothing is
  // stuck (docs/level-14.md, "Result"). It is a cliff: 1.5 clears every run and 1.65 loses 14 (the careless bot 47). xpMult stays 1 until the
  // lead sets it with chapter 4 in (docs/pace.md).
  enemyMult: 1.6,
  waypoints: WAYPOINTS,
};
