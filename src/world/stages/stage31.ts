// Stage 3.1, Starcourt Mall, after closing. Pure data: no DOM, so Node tests can import it. Spawns, items, props and the pools of
// light are in stage31_data.ts.
//
// The route, in tiles. The west entrance is a lobby in the south-west corner (the glass doors are in its north wall), and the west
// concourse runs east from it along the south edge, four tiles wide, with shop fronts on its north wall. Scoops Ahoy is a side room
// off the concourse (a doorway through the wall), with a counter and a back room behind it that crack1 shuts (the first cache). At
// the concourse's east end a three-wide mouth in the north wall is closed by shutter1, with panel1 on the wall face beside it.
// Behind the shutter a short passage climbs into the fountain court, the big atrium in the middle, where the goo spreads in from the
// north-east corner. The court's east exit is a corridor into the east concourse, which runs north; a side shop off the corridor is
// shut by crate1 (the second cache). At the concourse's top the service corridor turns west behind the court's shops, climbs, and
// runs east along the north edge into the loading dock (north-east): three waves, and the freight lift in the far corner.
// Walls are a mallcap row over a mallwall row facing the floor below, like the Lab, with the shop fronts, shutters and glass doors set
// in the wall row. The goo thickens as you go: none at the entrance, a corner of the court, patches in the east concourse and most of
// the dock. Three rows of planters across the east concourse, each with a two-tile gap, make its lanes zig-zag.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage31_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 0
   '((((((((((((((((((((()ii)))ii))))}}}))}}})}}}))(', // 1
   '(((((((((((((((((((((÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷¨÷¨¨¨¨÷¨¨ÞÞ(', // 2
   '(((((((((((((((((((((÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷¨¨÷¨¨¨¨÷¨ÞÞ(', // 3
   '(((((((((((((((((((((÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷¨¨¨÷¨¨¨¨÷¨¨(', // 4
   '(((((((((((((((((((((÷÷÷(((((((N÷÷÷÷¨¨¨¨÷¨¨¨¨÷¨(', // 5
   '(((((((((((((((((((((÷÷÷(((((((÷÷÷÷÷÷¨¨¨¨÷¨¨¨¨÷(', // 6
   '(((((((((((((((((((((÷÷÷(((((((÷NN÷÷¨÷¨¨¨¨÷¨¨¨¨(', // 7
   '(((((((((((((((((((((÷÷÷((((((((((((((((((((((((', // 8
   '(((((((((((((((((((((÷÷÷)ii))))))iii)))))))))))(', // 9
   '(((((((((((((((((((((÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷¢¢¢¢(', // 10
   '(((((((((((((((((((((÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷÷¢¢¢¨(', // 11
   '(((((((((((((((((((((÷÷÷÷÷÷÷NN÷÷÷÷÷÷N÷÷÷÷÷÷¢¢¨¨(', // 12
   '(((((((((((((((((((((((((((((((((((((((((((¢"¢¢(', // 13
   '(((((((((((((((((((((){{{){{{)}}){{{)((((((¢"¢¢(', // 14
   '(((((((((((((((((((((¢`````````¨¨¨¨¨¨((((((¢"¢¨(', // 15
   '(((((((((((((((((((((¢¢¢¢¢¢¢¢¢¢¨¨¨¨¨¨((((((yy¨¨(', // 16
   '(((((((((((((((((((((¢¢¢¢¢¢¢¢¢¢¢¨¨¨¨¨())))(¢"¢¢(', // 17
   '(((((((((((())))))))(¢y¢¢""""""""¨¨¨¨(N¢¢N(¢"¢¢(', // 18
   '((((((((((((NNjjjjNN(¢¢¢¢"¢¢¢¢¢¢"¢¨¨¨(¢¢¢¢(¢"¢¢(', // 19
   '((((((((((((jjjjjjjj(¢¢¢¢"¢>>>>¢"¢¢¢¢(¢¢¢¢(¢"yy(', // 20
   '((((((((((((jjjjjjjj(¢¢¢¢"¢>>>>¢"¢¢¢¢(¢¢¢¢(¢"¨¨(', // 21
   '((((((((((((jjjjjjjj(¢¢¢¢"¢>>>>¢"¢¢¢¢(¢¢¢¢(¢"¢¢(', // 22
   '((((((((((((((jj(((((¢¢¢¢"¢¢¢¢¢¢"¢¢y¢((¢¢((¢"¢¨(', // 23
   '(((((((((())))jj))))(¢y¢¢""""""""¢¢¢¢))¢¢))yy¨¨(', // 24
   '((((((((((jjjjjjjjjj(¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢"¢¢(', // 25
   '((((((((((jjjjjjjjjj(¢¢¢¢¢y¢¢¢¢¢y¢¢¢¢¢¢¢¢¢¢¢"¢¢(', // 26
   '((((((((((jjjjjjjjjj(¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢"¢y(', // 27
   '((((((((((£££££££jjj(¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢((((((¢"¢¢(', // 28
   '((((((((((jjjjjjjjjj(¢¢¢((((((((((((((((((((((((', // 29
   '((((((((((jIIjjjjjjI(¢¢¢((((((((((((((((((((((((', // 30
   '(())???))(jjjjjjjjjI(¢¢¢((((((((((((((((((((((((', // 31
   '((¢y¢¢¢y¢((((((jj((((¢¢¢((((((((((((((((((((((((', // 32
   '((¢¢¢¢¢¢¢){{{})jj){{)¢¢¢){{(((((((((((((((((((((', // 33
   '((¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢y¢(((((((((((((((((((((', // 34
   '((¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢(((((((((((((((((((((', // 35
   '(("""""""""""""""""""""""""(((((((((((((((((((((', // 36
   '((y¢¢¢¢¢¢¢¢BB¢¢¢¢¢vv¢¢¢¢By¢(((((((((((((((((((((', // 37
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 38
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

export const WAVES = ['amb1', 'amb2', 'amb3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 33, 6, 5) }, steps: [say('l7_start')] },
  { id: 'scoops', when: { rect: rect(14, 31, 4, 3) }, steps: [say('l7_scoops')] },
  { id: 'shutter_hint', when: { rect: rect(21, 34, 3, 2) }, steps: [say('l7_shutter_hint')] },
  { id: 'shutter_open', when: { event: 'targetHit', prop: 'panel1' }, steps: [{ t: 'open', prop: 'shutter1' }, say('l7_shutter_done')] },
  { id: 'crack_hint', when: { rect: rect(13, 25, 4, 2) }, steps: [say('l7_crack_hint')] },
  { id: 'crack_open', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l7_crack_done')] },
  { id: 'court', when: { rect: rect(21, 28, 3, 2) }, steps: [say('l7_court'), { t: 'wake', group: 'court' }] },
  { id: 'crate_hint', when: { rect: rect(38, 25, 4, 2) }, steps: [say('l7_crate_hint')] },
  { id: 'crate_cleared', when: { event: 'propCleared', prop: 'crate1' }, steps: [say('l7_crate_done')] },
  { id: 'service', when: { rect: rect(40, 10, 3, 3) }, steps: [say('l7_service')] },
  { id: 'ambush', when: { rect: rect(32, 2, 3, 6) }, steps: [say('l7_ambush'), { t: 'waves' }] },
  { id: 'level_clear', when: { cleared: 'amb3' }, steps: [say('l7_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// panel1 is a firebox that a shot lights and so does anyone's basic attack from up close, so the route never waits on a hero who
// is benched. Its hint names Lucas while he is in the party, then Nancy, then the first of the rest who is (PuzzleDef.alt). A puzzle
// whose heroes are all out never shows its hint (world/puzzles.ts), so with Steve or Eleven benched the caches stay shut and nothing nags.
const PANEL_ALT: PuzzleDef['alt'] = [
  { hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER PISTOL' },
  { hero: 'mike', hint: 'MAYBE MIKE SHOULD HIT THE PANEL' },
  { hero: 'dustin', hint: 'MAYBE DUSTIN SHOULD HIT THE PANEL' },
  { hero: 'will', hint: 'MAYBE WILL SHOULD HIT THE PANEL' },
  { hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD HIT THE PANEL' },
  { hero: 'max', hint: 'MAYBE MAX SHOULD HIT THE PANEL' },
  { hero: 'steve', hint: 'MAYBE STEVE SHOULD HIT THE PANEL' },
  { hero: 'robin', hint: 'MAYBE ROBIN SHOULD HIT THE PANEL' },
];

const PUZZLES: PuzzleDef[] = [
  { id: 'shutter', beat: 'shutter_hint', prop: 'panel1', hero: 'lucas', blocks: ['shutter1'], hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT', alt: PANEL_ALT },
  { id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT' },
  { id: 'crate', beat: 'crate_hint', prop: 'crate1', hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER SHOVE' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The lobby, then east along the concourse. The bot goes into Scoops Ahoy as far as the end of the counter, for Erica, and skips
  // the back room, so crack1 stays shut. It opens shutter1 by flag where it reaches it, as 1.3's bot opened the fire door.
  wp(8, 35), wp(14, 35), wp(15, 32), wp(16, 29), wp(18, 27), wp(16, 31), wp(17, 35), wp(20, 35), wp(22, 34, { open: 'shutter1' }),
  // North through the shutter into the court, then round the fountain by the west and north sides, through the goo corner and down
  // the east side to the exit.
  wp(22, 31), wp(22, 27), wp(23, 21), wp(24, 17), wp(30, 17), wp(35, 20), wp(35, 25), wp(38, 26),
  // The exit corridor past crate1 (left shut), then north up the east concourse, through the two-tile gaps between its planters, to
  // the service door.
  wp(41, 26), wp(45, 26), wp(46, 24), wp(45, 22), wp(43, 20), wp(44, 18), wp(46, 16), wp(45, 14), wp(42, 11),
  // West along the service corridor past the soldiers, up, and east along the north edge into the dock's ambush trigger.
  wp(37, 11), wp(30, 11), wp(24, 11), wp(22, 7), wp(22, 3), wp(28, 3), wp(33, 4),
];

// ---------------------------------------------------------------- the stage
export const STAGE_31: StageData = {
  id: '3.1',
  name: 'Starcourt Mall',
  rows: ROWS,
  start: { x: px(5), y: fy(36) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: LIGHTS,
  // The owner's mall look pick decides day or after closing. The draft is the mall after closing, pools on the neon signs.
  time: 'night',
  music: 'starcourt',
  checkpoints: [
    { prop: 'lights_entry', x: px(4), y: fy(35) },
    { prop: 'lights_court', x: px(22), y: fy(30) },
    { prop: 'lights_service', x: px(44), y: fy(15) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  // On the spec's first chapter 3 numbers the stage needed 3.3: the rats died in two hits and no Flayed ever landed a grab. With the
  // retuned rat and Flayed (enemies/defs.ts) it sits at 1.7, like 1.3. Measured with node scripts/measure-stage.ts 3.1 chief 20
  // [--careless]: chief clears 18 of 20 (86 of 100, none stuck) for about 262 damage, 1.6 KOs, 36% lowest HP and 98 s; careless
  // 18, kid 20, upside 8. The ambush is about a quarter of the run.
  enemyMult: 1.7,
  waypoints: WAYPOINTS,
};
