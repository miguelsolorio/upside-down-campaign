// Stage 1.3, Hawkins Middle School, at night. Pure data: no DOM, so Node tests can import it. Spawns and the pools of
// light are in stage13_data.ts.
//
// The route is a serpentine, like the Lab's, standing on its end. South band, going east: the parking lot (outdoors,
// south-west), the side door through its east wall with van1 parked across it, and the main hall, four tiles wide with lockers
// along both sides. At the hall's far end an archway climbs into the science room, which runs west to its back door
// (vines1). The cafeteria above it runs east to the fire door (door1) in its north wall, with the serving counter and the
// firebox that opens it at the west end, away from the gym's wall so a stray rocket from the court cannot light it. Past
// the door is the gym: an open
// court 18 by 12 with bleachers along the north wall and a wall on every side, so every charge of the Demogorgon ends in
// one. The growth thickens the whole way: none in the lot or the hall, a little in the science room, more in the cafeteria
// and the most in the gym. Coordinates are tiles. The scare path is in px. Walls are a schoolcap row (K) over a schoolwall row (J).
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage13_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', // 0
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', // 1
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKK##################K', // 2
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKK##################K', // 3
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKMuuuuUuuuUUuuuuUMMK', // 4
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKUUuuuuUuuuuuuuuUUMK', // 5
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKMUUuuuuuuuuuuuuuuUUK', // 6
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKMMUUuuuuuuuuuuuuuuuK', // 7
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKMMUuuuuuuuuuuuuuuuuK', // 8
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKMMUUuuuuuuuuuuuuuuuK', // 9
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKMUUuuuuuuuuuuuuuuuuK', // 10
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKuUUuuuuuuuuuuuuuuuK', // 11
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKuuuuuuuuuuuuuuuuuUK', // 12
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKuuuuuuuuuuuuuuuuuUK', // 13
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKUUuuuuuuuuuuuuuuUMK', // 14
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKMuuuuuuUUuuuuuuuuuK', // 15
   'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKuuKK', // 16
   'KKKKKKKKKKKKKKKKKKKKKKKKJJJJJJJJJJJJJJJJJJJJjjJK', // 17
   'KKKKKKKKKKKKKKKKKKKKKKKKUjjjjjjjjjjjjjjjjjjjUUjK', // 18
   'KKKKKKKKKKKKKKKKKKKKKKKKUZZZZZZZjjjjjjjjjjjjjjjK', // 19
   'KKKKKKKKKKKKKKKKKKKKKKKKUjjjjjjjjjjjjjjjjjjjjjMK', // 20
   'KKKKKKKKKKKKKKKKKKKKKKKKjjjjIIIIjjIIIIjjIIIIjjMK', // 21
   'KKKKKKKKKKKKKKKKKKKKKKKKUjjjIIIIjjIIIIjjIIIIjjUK', // 22
   'KKKKKKKKKKKKKKKKKKKKKKKKjjjjjjjjjjjjjjjjjjjjjjUK', // 23
   'KKKKKKKKKKKKKKKKKKKKKKKKjUjjjjjjjjjjjjjjjjjUjUUK', // 24
   'KKKKKKKKKKKKKKKKKKKKKKKKjjKKKKKKKKKKKKKKKKKKKKKK', // 25
   'KKKKKKKKKKKKKKKKKKKKKKKKnnJJJJQQQQJJJJJJJJJKKKKK', // 26
   'KKKKKKKKKKKKKKKKKKKKKKKKnnMMnnnnnnBBBBBBBBnKKKKK', // 27
   'T%%%%%%%%%%%%%%%%%%%%%%KUnUUnnnnnnnnnnnnnnnKKKKK', // 28
   'T%%%%%%%%%%%%%%%%%%%%%%KnUnnnPPPPnnPPPPnnnnKKKKK', // 29
   'TTggggggggggggggggggT%%KUnnnnnnnnnnnnnnnnnnKKKKK', // 30
   'T========gg==========%%KnnnnnPPPPnnPPPPnnnnKKKKK', // 31
   'T=====l==============%%KnnnnnnnnnnnnnnnnnnnKKKKK', // 32
   'T==================l=%%KKKKKKKKKKKKKKKKKnnKKKKKK', // 33
   'T=__________________=%%AAAAAnAARRAAnAAAAnnAnAAKK', // 34
   'T====================nnnnnnnnnnnnnnnnnnnnnnnnnKK', // 35
   'T====================nnnnnnnnnnnnnnnnnnnnnnnnnKK', // 36
   'T=gg=======l=========%%nnnnnnnnnnnnnnnnnnnnnnnKK', // 37
   'TT================gg=%%nnAAAAnnnAAAAAnnnnnAAAnKK', // 38
   'TTTTTTTTTTTTTTTTTTTTTTTKKKKKKKKKKKKKKKKKKKKKKKKK', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 34, 4, 3) }, steps: [say('l3_start')] },
  { id: 'van_hint', when: { rect: rect(13, 34, 5, 5) }, steps: [say('l3_van_hint')] },
  { id: 'van_cleared', when: { event: 'propCleared', prop: 'van1' }, steps: [say('l3_van_done')] },
  { id: 'agents', when: { rect: rect(23, 35, 3, 4) }, steps: [say('l3_agents')] },
  { id: 'vines_hint', when: { rect: rect(25, 27, 5, 6) }, steps: [say('l3_vines_hint')] },
  { id: 'vines_cleared', when: { event: 'propCleared', prop: 'vines1' }, steps: [say('l3_vines_done')] },
  { id: 'cafeteria', when: { rect: rect(24, 22, 3, 3) }, steps: [say('l3_cafeteria'), { t: 'wake', group: 'rats1' }] },
  // Mid-room, across the way to the fire door. The level holds still while the scare plays, so a rat can't bite mid-scare.
  { id: 'scare', when: { rect: rect(33, 19, 2, 6), needs: 'cafeteria' }, steps: [{ t: 'scare' }, say('l3_scare')] },
  { id: 'firebox_hint', when: { after: 'scare' }, steps: [say('l3_firebox_hint')] },
  { id: 'door1_open', when: { event: 'targetHit', prop: 'firebox1' }, steps: [{ t: 'open', prop: 'door1' }, say('l3_firebox_done')] },
  { id: 'gym', when: { rect: rect(43, 13, 4, 3) }, steps: [say('l3_gym')] },
  { id: 'demogorgon', when: { rect: rect(30, 4, 11, 10), needs: 'gym' }, steps: [{ t: 'music', track: 'clock' }, say('l3_demogorgon'), { t: 'wake', group: 'boss' }] },
  { id: 'pinned', when: { event: 'pinned', spawn: 'demo' }, steps: [say('l3_pinned')] },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [say('l3_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
const PUZZLES: PuzzleDef[] = [
  { id: 'van', beat: 'van_hint', prop: 'van1', hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER SHOVE' },
  { id: 'vines', beat: 'vines_hint', prop: 'vines1', hero: 'dustin', hint: 'MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY' },
  { id: 'firebox', beat: 'firebox_hint', prop: 'firebox1', hero: 'lucas', blocks: ['door1'], hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT' },
  { id: 'finish', beat: 'pinned', prop: 'demo', enemy: true, hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER MIND BLAST' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The lot, past both agents, to the side door; the van comes off it by flag.
  wp(7, 35), wp(13, 36), wp(16, 36, { open: 'van1' }),
  // The hall, along its south lane to the far end, then up the archway.
  wp(24, 36), wp(30, 36), wp(36, 36), wp(40, 35), wp(40, 32),
  // The science room west, along the aisle between the desks, to the back door; the vines come off by flag.
  wp(38, 30), wp(32, 30), wp(27, 30), wp(25, 28, { open: 'vines1' }),
  // The cafeteria: the rats wake at the doorway, then east along the south aisle to the fire door, opened by flag.
  wp(25, 24), wp(26, 23, { wake: 'rats1' }), wp(32, 23), wp(40, 23), wp(44, 21, { open: 'door1' }), wp(44, 18),
  // The gym: in through the door, across the court. The last waypoint is inside the `demogorgon` trigger.
  wp(44, 14), wp(42, 11), wp(38, 9),
];

// ---------------------------------------------------------------- the stage
export const STAGE_13: StageData = {
  id: '1.3',
  name: 'Hawkins Middle School',
  rows: ROWS,
  start: { x: px(3), y: fy(35) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  time: 'night',
  music: 'upside',
  checkpoints: [
    { prop: 'lights_lot', x: px(6), y: fy(34) },
    { prop: 'lights_hall', x: px(38), y: fy(36) },
    { prop: 'lights_gym', x: px(41), y: fy(14) },
  ],
  // A dark shape walks along the strip behind the serving counter, east to west, across the wall the firebox hangs on.
  scare: { from: { x: px(35), y: fy(18) + 1 }, to: { x: px(25), y: fy(18) + 1 }, frames: 96 },
  // Nearly all the damage here is the Demogorgon's. Its spike hits (charge, leap, acid) were lowered so a player who
  // does not dodge still wins some runs, and this factor sets the rest. It was 1.7 for a party at Lv 5, 4, 4 and 4; the
  // party a real run brings is a level lower. At 1.5, measured with node scripts/measure-stage.ts 1.3 chief 40 [--careless]:
  // the careful bot clears 39 of 40 for 249 damage, 1.0 KOs and a party low of 35 percent, the boss about 46 s of it.
  // The careless bot clears 30 of 40, upside 19 of 40, kid 20 of 20.
  enemyMult: 1.5,
  // XP factor for the campaign's pace (docs/pace.md), set with node scripts/measure-campaign.ts.
  xpMult: 0.7,
  waypoints: WAYPOINTS,
};
