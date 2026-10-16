// Stage 3.3, the Starcourt food court, the end of chapter 3. Pure data: no DOM, so Node tests can import it. Spawns, items, props, Hopper
// and the pools of light are in stage33_data.ts.
//
// The route, in tiles. The freight lift comes up in the service hall, in the south-west corner, with a stockroom off its north wall
// (the lift, Hopper and the first string of lights). A three-tile doorway in the hall's east wall leads into the kitchens, a long room
// with fryer lines along its back and counters along its front, and melting rats among them. A neck in the kitchens' north wall is shut
// by crack1: behind it the walk-in freezer, the cache. The kitchens' east end opens through a doorway into the lower concourse, the
// big hall down the east side: a Flayed crowd in its goo, a string of lights at its north end, and the escalators, a two-wide ramp
// with rails either side that climbs from the concourse's north wall to the balcony, with crate1 across its top. The balcony is the
// ring round the court's east side: a lower lane along the island of shops, a west lane along the court's windows, and a top lane that
// dead-ends in the north-east, with goo over most of it. The court (north-west) is an arena 22 by 14: the stalls along its north wall
// (a stallcap row over a stall row, where the Mind Flayer's body stands), a patch of floor under the skylight, tables pushed to the walls,
// and two doorways in its east wall, door1 and door2, on the balcony's west lane. Walls are a cap row over a face row looking onto the
// floor below, like the other mall stages. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { BURROWS, LIGHTS, SPAWNS } from './stage33_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 0
   '(ÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂ))){{)}{{){}{{){{}{))((', // 1
   '(ÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃ¢"¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢((', // 2
   '((ÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀ(¨¨¢¢¢¨y¢¢¢¢¨¨¢¢y¢¢¢¢¢((', // 3
   '((IÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÀ(¨"¢¢¢¢¨¨¢¢¢¢¢¢¢¢¢¢y¢¢((', // 4
   '((ÀÁÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÁÀ)¢"¨¨¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢((', // 5
   '((IÁÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÁÀÀ¢"¢¢(((((((((((((((((((', // 6
   '((IÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁÀÀ¨¨¨¢(((((((((((((((((((', // 7
   '((ÀÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁÀ?¢¨¢¢(((((((((((((((((((', // 8
   '((ÀÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁI?¨"¨¢){{)}{{){}{{){{})((', // 9
   '((ÀÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁI?¢"¢¨¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢((', // 10
   '((IÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁÀ?¢"¢¨¨¨¢¢y¢¢¢y¢¢¢¢¢¢¢¢((', // 11
   '((IÁÀÀÀÀÆÆÆÆÆÆÆÆÆÆÀÀÀÀÁÀÀ"¨""¨¨¨""""""""""""""((', // 12
   '((ÀÁÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÁÀÀ¨¢¨¨¢¢¨¨¢¢¢¢¢¢¢¢¢¢¢¢¢((', // 13
   '((¨ÁÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÀÁ¨(¢¢¢¢¨¨¢¢¢¢y¢¢¢¢¢¢¢¢¢¢((', // 14
   '((¨ÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁÁ¨(((((```````````ÅÅ````((', // 15
   '((À¨¨IIÀÀÀIIÀÀÀÀIIÀÀÀI¨¨(((((((((((((((`ÅÅ`(((((', // 16
   '(((((((((((((((((((((((((((((((((((((((`ÅÅ`(((((', // 17
   '((((()))((((((()(())())((((((((((((((((`ÅÅ`(((((', // 18
   '(((NN÷÷÷N((((((ÄNNÄÄCÄÄNN((((((((((((((`ÅÅ`(((((', // 19
   '(((÷÷÷÷÷÷((((((ÄÄÄÄÄÄÄÄÄÄ((((((((((((((`ÅÅ`(((((', // 20
   '(((÷÷÷÷÷÷((((((ÄÄÄÄÄÄÄÄÄN(((((((({{}{{}`ÅÅ`{}{{(', // 21
   '(((÷÷÷÷÷÷((((((NÄÄÄÄÄÄÄÄN((((((((¢¢"¢¢¢¢¢¢¢¢¨¨¨(', // 22
   '(((÷÷÷÷÷N((((((NÄÄÄÄÄÄÄÄÄ((((((((¢¢"¢¢¢¢¢¢¢¨"¨¨(', // 23
   '(((÷÷÷÷÷N((((((ÄÄÄÄÄÄÄÄÄÄ((((((((¢¢"¢¢¢¢¢¢¢¢¨¨¢(', // 24
   '(((((÷÷((((((((((((ÄÄ((((((((((((¢¢"¢y¢¢¢¢y¢"¢¨(', // 25
   '((iii÷÷iiiii(i))i)iÄÄ))i))i)))))(¢¢"¢¢¢¢¢¢¢¢"¨¢(', // 26
   '((÷÷÷÷÷÷÷÷÷÷(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ(y¢"¢¢¢¢¢¢¢¢"¢¢(', // 27
   '((ÞÞ÷÷÷÷÷÷÷N(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÇ(¢¢"¢¨¨¢¢¢¢¢"¢¢(', // 28
   '((ÞÞ÷÷÷÷÷÷÷÷(ÄÄÇÇÇÇÇÇÄÄÇÇÇÇÇÇÄÄÄ(¢¢"¢¢¨¢¢¢¢¢"¢y(', // 29
   '((÷÷÷÷÷÷NN÷÷)ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ(¢¨"¢¢¢¢¢¢¢¢"¢¢(', // 30
   '((÷÷÷÷÷÷÷÷÷÷÷ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ(¢¢¨¢y¢¢¢¢y¢"¢¢(', // 31
   '((÷÷÷÷÷÷÷÷÷÷÷ÄÄÄÄÄÄÄÄÄIÄÄÄÇÄÄÄÄÄ)¢¢"¢¢¢¢¢¢¢¢"¢¢(', // 32
   '((÷÷÷÷÷÷÷÷÷÷÷ÄÄÄÄÇÄÄÄÄIÄÄÄÄÄÄÄÄÄ¢¢¢"¢¢¢¢¢¢¨¨"¢¢(', // 33
   '((÷÷÷÷÷÷÷÷÷÷(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¢¢¢"¢¢¢¢¢¢¢¨"¢¢(', // 34
   '((÷÷÷÷÷÷÷÷÷÷(ÄÄZZZZZZÄÄÄZZZZZZÄÄ¢¢¢"¢¢y¢¢y¢¢"¢¢(', // 35
   '((NN÷÷÷÷÷÷NN(ÇÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ(¢¢"¢¢¢¢¢¢¢¢"¢¢(', // 36
   '((NN÷÷÷÷÷÷÷N(ÇÄÄÄÄÄÄÄÄÄÄÄÄÄÄIIÄÄ(¢¢"¢¢¢¢¢¢¢¢"¢¢(', // 37
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 38
   '((((((((((((((((((((((((((((((((((((((((((((((((', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// The sour beat waits on crate_hint, a rect beat on the ramp that every way up crosses, and not on crate_done: that one is an event beat,
// and a retry from a string before the crate rebuilds the stage with the crate kept open, so it would never fire again and the chain
// sour, balcony, billy would never start. Nothing is lost: the ramp's top is unreachable until the crate is open.
// The billy rect is the court's east end, two tiles and more clear of the doors (door1 and door2 are in column 24), so nobody stands in
// one when they shut. The balcony beat spans the whole lower lane, the only way to the court, so the party cannot walk round it. Billy's
// body is a group of its own (`boss`) and the Mind Flayer's is `flayer`: the clear waits on the second, and a retry after Billy is freed
// wakes an empty `boss`, which counts as cleared at once, so the doors shut, the script is skipped and the Mind Flayer comes in again.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 27, 8, 7) }, steps: [say('l9_start'), { t: 'leave', npc: 'hopper' }] },
  { id: 'kitchen', when: { rect: rect(12, 30, 3, 5) }, steps: [say('l9_kitchen')] },
  { id: 'crack_hint', when: { rect: rect(18, 27, 4, 2) }, steps: [say('l9_crack_hint')] },
  { id: 'crack_done', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l9_crack_done')] },
  { id: 'concourse', when: { rect: rect(33, 33, 3, 3) }, steps: [say('l9_concourse'), { t: 'wake', group: 'crowd' }] },
  { id: 'crate_hint', when: { rect: rect(40, 16, 2, 3) }, steps: [say('l9_crate_hint')] },
  { id: 'crate_done', when: { event: 'propCleared', prop: 'crate1' }, steps: [say('l9_crate_done')] },
  { id: 'sour', when: { rect: rect(39, 12, 4, 3), needs: 'crate_hint' }, steps: [{ t: 'music', track: 'sour' }, say('l9_sour')] },
  { id: 'balcony', when: { rect: rect(34, 10, 3, 5), needs: 'sour' }, steps: [say('l9_balcony'), { t: 'wake', group: 'balcony' }] },
  {
    id: 'billy', when: { rect: rect(20, 5, 3, 10), needs: 'balcony' },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'close', prop: 'door2' }, { t: 'music', track: 'clock' }, say('l9_billy'), { t: 'wake', group: 'boss' }],
  },
  { id: 'billy_down', when: { event: 'pinned', spawn: 'billy' }, steps: [say('l9_billy_down')] },
  { id: 'billy_freed', when: { cleared: 'boss' }, steps: [say('l9_billy_freed'), { t: 'wake', group: 'flayer' }] },
  {
    id: 'level_clear', when: { cleared: 'flayer' },
    steps: [{ t: 'boom' }, say('l9_clear'), { t: 'open', prop: 'door1' }, { t: 'open', prop: 'door2' }, { t: 'finish' }],
  },
];

// ---------------------------------------------------------------- puzzles
// crack1 wants Steve's nail bat and crate1 Eleven's shove; Eleven is locked into the party on the map (REQUIRED in core/campaign.ts), so the
// route can wait on her. A puzzle whose hero is out never shows its hint, so with Steve benched the freezer stays shut and nothing nags.
// The reach is the pinned Billy: the caret follows him and his death solves it.
const PUZZLES: PuzzleDef[] = [
  { id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT' },
  { id: 'crate', beat: 'crate_hint', prop: 'crate1', hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER SHOVE' },
  { id: 'reach', beat: 'billy_down', prop: 'billy', enemy: true, hero: 'eleven', hint: 'MAYBE ELEVEN CAN REACH HIM' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the service hall by the doorway, then east along the kitchens' open row between the fryer lines and the counters. The route
  // skips the freezer, so crack1 stays shut.
  wp(5, 31), wp(9, 32), wp(12, 32), wp(15, 31), wp(19, 31), wp(24, 31), wp(29, 31), wp(30, 34), wp(33, 34),
  // The concourse: north along the open column between the planters, past lights_concourse (a player lights it, so the route walks by it)
  // and across to the escalators' foot. The bot opens crate1 by flag two tiles short of it, after the hint beat's tiles have fired, as
  // 3.1's bot opened the shutter, and walks on up.
  wp(36, 31), wp(36, 26), wp(35, 24), wp(40, 23), wp(41, 21), wp(41, 17, { open: 'crate1' }),
  // Through the gap, then west along the balcony's lower lane through the goo and past the planters, by lights_balcony, to the court's
  // lower doorway.
  wp(41, 15), wp(41, 13), wp(37, 13), wp(32, 13), wp(28, 13), wp(26, 11), wp(25, 13),
  // Through door1 into the court and into the billy trigger.
  wp(22, 13), wp(21, 10),
];

// ---------------------------------------------------------------- the stage
export const STAGE_33: StageData = {
  id: '3.3',
  name: 'The food court',
  rows: ROWS,
  start: { x: px(5), y: fy(31) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // The owner's pick, from foodcourt-variations.html: the court at night, under the Confetti mall.
  time: 'night',
  // `starcourt` until the escalators' top: the sour beat switches it to `sour`, and the billy beat to `clock` for both phases. A retry
  // carries the last switch on (musicAfter in world/triggers.ts).
  music: 'starcourt',
  checkpoints: [
    { prop: 'lights_hall', x: px(5), y: fy(32) },
    { prop: 'lights_concourse', x: px(35), y: fy(24) },
    { prop: 'lights_balcony', x: px(26), y: fy(11) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  // Measured with node scripts/measure-stage.ts 3.3 chief 20 [--careless] on HARD, with the party a real run brings (Mike 7, Dustin 6,
  // Robin 4, Eleven 3), after the lead's boss pass (docs/level-9.md, "Result"): chief clears 19 of 20 for about 259 damage, 1.15 KOs,
  // 40% lowest HP and 118 s, the fight 62% of it; careless 13, kid 20, upside 5. NORMAL clears 20, careless 18.
  enemyMult: 1.6,
  // Pays the lead the rest of the way to Lv 8 at the end of chapter 3 (docs/pace.md): Lv 8 in nine runs of ten, the tenth a kill short.
  xpMult: 2,
  // The Flayed that Billy and the Mind Flayer call come up here, one at each side of the court.
  burrows: BURROWS,
  waypoints: WAYPOINTS,
};
