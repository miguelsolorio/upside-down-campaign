// Stage 3.2, the Russian base under Starcourt. Pure data: no DOM, so Node tests can import it. Spawns, items, props and the pools of
// light are in stage32_data.ts.
//
// The route, in tiles. The freight lift lands in the north-west corner (the lift drop), and a two-tile passage in its east wall leads
// into the loading bay, a long hall stacked with crates that the soldiers shoot from. A corridor runs south out of the bay's floor with
// cipher1 across it, and opens into the hall, where a soldier and an elite wait. The hall's east doorway is shut by cipher2: behind it
// the barracks, the cache. Its west doorway leads into the lab, which has two cells and the rats' cages; a passage runs out of the lab's
// south-east corner into the control room, where two soldiers stand, and whose east wall is a window over the Key chamber between two
// doorways. The chamber (south-east) is an arena 18 by 12: the machine along its north wall, the power box on the floor between the
// doors and Grigori, and the breaker in the wall over the machine, in the cap row with solid tiles all round it, so only a shot
// reaches it. Walls are a basecap row over a basewall row facing the floor below, like the Lab. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage32_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 0
   '¯¯¦¦¦¦¦¦¦¯¯¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¯¯¯¯¯¯¯', // 1
   '¯¯ÞÞ···±±¯¯······························¯¯¯¯¯¯¯', // 2
   '¯¯ÞÞ····±¦¦······±±··········±±·······±··¯¯¯¯¯¯¯', // 3
   '¯¯····································±··¯¯¯¯¯¯¯', // 4
   '¯¯······················±±···············¯¯¯¯¯¯¯', // 5
   '¯¯·······¯¯···±·········±±········±±·····¯¯¯¯¯¯¯', // 6
   '¯¯·······¯¯···±···················±±·····¯¯¯¯¯¯¯', // 7
   '¯¯±±·····¯¯······························¯¯¯¯¯¯¯', // 8
   '¯¯¯¯¯¯¯¯¯¯¯··················±±··········¯¯¯¯¯¯¯', // 9
   '¯¯¯¯¯¯¯¯¯¯¯······±±··········±±··········¯¯¯¯¯¯¯', // 10
   '¯¯¯¯¯¯¯¯¯¯¯···············±±·············¯¯¯¯¯¯¯', // 11
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯··¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 12
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯i··i¯¯¯¯¯¯¦¦¦¦¦¦¦¦¦¦¦¦¦¯¯¯¯¯', // 13
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯i··i¯¯¯¯¯¯·§§·§§·§§·§§·¯¯¯¯¯', // 14
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯i··i¯¯¯¯¯¯·············¯¯¯¯¯', // 15
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯··¯¯¯¯¯¯¯············L¯¯¯¯¯', // 16
   '¯¯¦¦¦¦¦¦¦¦¦¦¯¯¦iiii¦¦··¦¦ii¦¯¯············L¯¯¯¯¯', // 17
   '¯¯°°°°°ccc°°¯¯··············¦¦············L¯¯¯¯¯', // 18
   '¯¯°°°°°°°°°°¯¯·····························¯¯¯¯¯', // 19
   '¯¯×××××°°°°°¦¦············±················¯¯¯¯¯', // 20
   '¯¯×°°°×°°°°°········±±±±··±·¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 21
   '¯¯×°°°×°°°°°················¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 22
   '¯¯××°××°°°°°····±±··········¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 23
   '¯¯°°°°°°°°cc¯¯··············¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 24
   '¯¯°°°°°°°°cc¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¦¦¦¦¦¤¤¤¤¤¤¤¤¦¦¦¦¦¯¯', // 25
   '¯¯°°°°°°°°°°¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ººººº°°°°°°°°ººººº¯¯', // 26
   '¯¯°°°°°°°°cc¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ººººº°°°°°°°°ººººº¯¯', // 27
   '¯¯×××××°°°°°¯¯¯¯¯¯¦¦¦¦¦¦¦¦¯¯ºººººººººººººººººº¯¯', // 28
   '¯¯×°°°×°°°°°¦¦¦¦¦¦········¦¦ºººººººººººººººººº¯¯', // 29
   '¯¯×°°°×°°°°°················ºººººººººººººººººº¯¯', // 30
   '¯¯××°××°°°°°··±·············ºººººººººººººººººº¯¯', // 31
   '¯¯°°°°°°°°°°··±···········GGºººººººººººººººººº¯¯', // 32
   '¯¯°°°°°°°°°°··············GGºººººººººººººººººº¯¯', // 33
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯········GGºººººººººººººººººº¯¯', // 34
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯··········ºººººººººººººººººº¯¯', // 35
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯··········ºººººººººººººººº±±¯¯', // 36
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯·CC···C·¯¯ºººººººººººººººº±±¯¯', // 37
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 38
   '¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 2, 7, 7) }, steps: [say('l8_start')] },
  { id: 'bay', when: { rect: rect(11, 3, 2, 3) }, steps: [say('l8_bay')] },
  { id: 'cipher_hint', when: { rect: rect(20, 11, 4, 3) }, steps: [say('l8_cipher_hint')] },
  { id: 'cipher_open', when: { event: 'propCleared', prop: 'cipher1' }, steps: [say('l8_cipher_done')] },
  { id: 'cache_hint', when: { rect: rect(25, 19, 3, 2) }, steps: [say('l8_cache_hint')] },
  { id: 'cache_open', when: { event: 'propCleared', prop: 'cipher2' }, steps: [say('l8_cache_done')] },
  { id: 'lab', when: { rect: rect(11, 20, 3, 4) }, steps: [say('l8_lab'), { t: 'wake', group: 'lab' }] },
  { id: 'control', when: { rect: rect(18, 30, 3, 4) }, steps: [say('l8_control')] },
  // The party is well inside the chamber when the doors shut, so nobody stands in one. The trigger covers the west side, by both doors.
  {
    id: 'grigori', when: { rect: rect(29, 29, 3, 8), needs: 'control' },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'close', prop: 'door2' }, { t: 'music', track: 'clock' }, say('l8_grigori'), { t: 'wake', group: 'boss' }],
  },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [{ t: 'open', prop: 'door1' }, { t: 'open', prop: 'door2' }, say('l8_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// Both cipher doors want Robin, who is locked into the party on the map. The breaker wants a shot: Lucas's slingshot, or Nancy's pistol
// while he is out (PuzzleDef.alt). A party with neither never sees its hint and beats Grigori by flanking. The tracker keeps a puzzle
// solved once its prop has been lit, so the breaker re-arming 300 frames later does not bring the hint back (world/puzzles.ts).
const PUZZLES: PuzzleDef[] = [
  { id: 'cipher', beat: 'cipher_hint', prop: 'cipher1', hero: 'robin', hint: 'MAYBE ROBIN CAN READ IT' },
  { id: 'cache', beat: 'cache_hint', prop: 'cipher2', hero: 'robin', hint: 'MAYBE ROBIN CAN READ IT' },
  {
    id: 'breaker', beat: 'grigori', prop: 'breaker1', hero: 'lucas', hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT',
    alt: [{ hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER PISTOL' }],
  },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the lift drop, through the passage, across the bay past the crate stacks to the corridor mouth. The bot opens cipher1 by
  // flag where it reaches it, as 3.1's bot opened the shutter, and walks on through.
  wp(5, 5), wp(9, 4), wp(13, 4), wp(16, 5), wp(20, 6), wp(21, 10, { open: 'cipher1' }), wp(21, 13), wp(21, 16),
  // Down into the hall and west across it to the lab's doorway. The route skips cipher2 and the barracks.
  wp(21, 19), wp(18, 19), wp(15, 21), wp(13, 21), wp(10, 22),
  // South down the lab between the cells and the cages, then east along the passage past the post into the control room.
  wp(9, 24), wp(8, 27), wp(9, 30), wp(11, 31), wp(13, 30), wp(17, 31), wp(19, 32),
  // Through the control room to the chamber's lower doorway and into the grigori trigger.
  wp(23, 34), wp(26, 35), wp(30, 34),
];

// ---------------------------------------------------------------- the stage
export const STAGE_32: StageData = {
  id: '3.2',
  name: 'The Russian base',
  rows: ROWS,
  start: { x: px(4), y: fy(5) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // The owner's pick: the Brass base, after closing. Pools on the ceiling lamps, the consoles and the machine.
  time: 'night',
  // `starcourt` until Grigori wakes: the grigori beat switches it to `clock`, and a retry carries that on (world/play.ts).
  music: 'starcourt',
  checkpoints: [
    { prop: 'lights_lift', x: px(5), y: fy(6) },
    { prop: 'lights_lab', x: px(15), y: fy(23) },
    { prop: 'lights_control', x: px(22), y: fy(35) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  // Measured with node scripts/measure-stage.ts 3.2 chief 20 [--careless] after the lead's Grigori pass (his guard drops while he
  // recovers, softer hits, two soldiers called at half HP; rifle rounds at power 0.3), with the party a real run brings (Mike 7,
  // Dustin 6, Robin and Nancy at 3). At 1.25 the careless bot cleared 60 of 100, under chapters 1 and 2, so the difficulty pass eased
  // it to 1.1 (docs/level-8.md, "Result"). Chief clears 18 of 20 (97 of 100, none stuck) for about 279 damage, 0.55 KOs, 49% lowest HP
  // and 106 s, the fight 43% of it; careless 16 (80 of 100), kid 20, upside 13, normal 20 of 20 for 220 damage.
  enemyMult: 1.1,
  waypoints: WAYPOINTS,
};
