// Stage 4.1, Kamchatka, the start of chapter 4 (docs/level-10.md). Pure data: no DOM, so Node tests can import it. Spawns, items, props and
// the pools of light are in stage41_data.ts.
//
// The route, in tiles. Hopper starts in the work yard, the pen in the south-west corner inside the wire, where the care package of Joyce's
// lights waits. The pen opens east through a four-tile gap in its fence onto the long strip of the work yard (crates, drums and drifts, and
// nobody hostile), and the strip's east end opens north through a four-tile gate in the inner fence into the snow yard. The yard runs west
// under the floodlight, a lit pole in its middle, with two rifle guards walking the loop round it, a third at the gate in the east, and a
// fourth with a baton guard at the west end, in front of the block. The block's south wall faces the yard: a cap row over a face row, and a
// notch two tiles wide in it shut by crack1. Past it the corridor runs east, three tiles wide, with the cell row along its north wall
// (barred doors set in the face), the cache cell shut by crack2 at the west end and the guard room off the middle by a three-tile doorway.
// The corridor ends in the shaft's landing, a grate in a floor of slabs, and a doorway two tiles wide in the pit's west wall, door1. The
// pit is an arena 18 by 12 of rock and timber, the barricade over the beast's tunnel in its north wall between lanterns, and a wall on every
// side, so every charge of the Demogorgon ends in one. South of the pit the wire closes the camp in. Walls are a cap row over
// a face row looking onto the floor below, like the other stages with walls: campcap over campwall for the block, pitcap over pitwall for the
// pit, and the gap in a cap row behind a prop's tile is floor. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage41_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //01234567890123456789012345678901234567890123
   'ÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓ', // 0
   'ÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÓÔÔÔÔÔÖÖÔÔÔÔÔÔÔÔÔÔÔÓ', // 1
   'ÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 2
   'ÌÌÌÌÌÌÌÌÌÌÌÍÍÍÍÍÌÌÌÌÌÌÌÌÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 3
   'ÌÌÌÍÍÍÍÌÌÌÌÑÏÏÏÑÌÌÌÌÌÌÌÌÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 4
   'ÌÌÌÑÏÏÏÌÌÌÌÏÏÏÏÏÌÌÌÌÌÌÌÌÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 5
   'ÌÌÌÏÏÏÏÌÌÌÌÏÏÑÏÏÌÌÌÌÌÌÌÌÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 6
   'ÌÌÌÏÏÏÏÌÌÌÌÏÏÑÏÏÌÌÌÍÍÍÍÍÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 7
   'ÌÌÌÏÏÏÏÌÌÌÌÏÏÏÏÒÌÌÌÏÏÏÏÏÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 8
   'ÌÌÌÌÏÏÌÌÌÌÌÌÏÏÏÌÌÌÌÏÏÏÏÏÔÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 9
   'ÌÍÎÎÏÏÍÎÎÍÍÍÏÏÏÍÍÎÎÏÐÐÐÏÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 10
   'ÌÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÐÏÏÏÐÐÐÏÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 11
   'ÌÏÏÏÏÏÐÏÏÏÏÏÐÏÏÏÏÏÏÏÐÐÐÏÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 12
   'ÌÒÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÓÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÕÓ', // 13
   'ÌÌÌÌÌÌÌÌÌÏÏÌÌÌÌÌÌÌÌÌÌÌÌÌÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓ', // 14
   'ËÍÍÍÍÍÍÍÍÏÏÍÍÍÍÍÍÍÍÍÍÍÍÍËËËËËËËËËËËËËËËËËËËË', // 15
   'ËÈÈÈÈÈÈÈÈÊÊÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË', // 16
   'ËÈÈÈÈÈÈÈÒÊÊÈÈÈÈÈÈÈÑÑÈÈÉÉÈÈÒÈÈÈÈÈÈÈÈÈÈÒÈÈÈÈÈË', // 17
   'ËÈÈÈÈÈÉÉÈÊÊÈÑÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÑÈÈÈÈÈÉÉÈË', // 18
   'ËÈÈÈÈÈÉÉÈÊÊÈÑÈÈÈÈÈÈÈÈÈÈÈÈÈÈÉÉÉÈÈÈÈÑÈÈÈÈÈÉÉÈË', // 19
   'ËÈÈÈÈÈÈÈÈÊÊÈÈÈÈÈÒÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË', // 20
   'ËÈÈÈÈÈÈÈÈÊÊÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÑÈÈÈÈÉÉÉÈÈÈÈÈË', // 21
   'ËÈÉÉÈÈÈÈÈÊÊÈÈÈÉÉÉÈÈÈÈÈÈÈÈÈÈÑÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË', // 22
   'ËÈÉÉÈÈÈÈÈÊÊÈÈÒÈÈÈÈÈÈÈÈÈÈÈÈÈÑÈÈÈÈÈÈÈÈÈÈÈÈÈÑÈË', // 23
   'ËÈÈÈÈÈÈÈÈÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÉÉÊÊÊÊÊÊÊÊÈÈË', // 24
   'ËÈÈÈÈÈÈÈÈÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÒÊÊÊÉÉÊÊÊÊÊÊÊÊÈÈË', // 25
   'ËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÊÊÊÊÈÈË', // 26
   'ËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËÊÊÊÊËËË', // 27
   'ËÈÈÈÈÈÈÈÈÈÈÈÉÉÉËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÊÊÈÈÈË', // 28
   'ËÈÉÉÈÈÈÈÈÈÈÈÈÈÈËÈÈÉÉÉÈÈÈÈÈÈÈÑÈÈÈÈÈÈÈÈÈÊÊÈÒÈË', // 29
   'ËÈÒÈÈÈÊÊÊÊÊÊÊÊÊËÈÈÉÉÉÈÈÈÑÑÈÈÈÈÈÈÈÈÉÉÈÈÊÊÈÈÈË', // 30
   'ËÈÑÈÈÈÊÊÊÊÊÊÊÑÊËÈÈÈÈÈÈÈÈÈÑÈÈÈÈÒÈÈÈÉÉÈÈÊÊÈÑÈË', // 31
   'ËÈÈÈÈÈÊÊÊÊÊÊÊÑÊËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÊÊÈÈÈË', // 32
   'ËÈÈÈÈÈÊÊÊÊÊÊÊÊÊÊÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÒÊÊÈÈÈË', // 33
   'ËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÈÈÈË', // 34
   'ËÈÈÈÈÈÈÈÈÈÈÈÈÈÈÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÊÈÈÈË', // 35
   'ËÈÈÈÈÈÈÑÑÉÉÈÒÈÈÊÈÈÈÈÈÈÒÈÈÈÉÉÉÈÈÑÑÈÈÈÈÈÈÈÉÉÈË', // 36
   'ËÈÈÈÈÈÈÈÑÉÉÈÈÈÈËÈÑÈÈÈÈÈÈÈÈÉÉÉÈÈÈÈÈÈÈÈÈÈÈÉÉÈË', // 37
   'ËÈÉÉÉÈÈÈÈÈÈÈÈÈÈËÈÈÈÈÈÉÉÉÉÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈË', // 38
   'ËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËËË', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// The block beat is the corridor in front of the guard room's doorway, a few tiles past the notch, so the sleepers wake as Hopper comes up
// to their door and step out beside him. The pit rect is three tiles clear of door1 (column 24), so nobody stands in the doorway when it shuts, and it waits on the
// shaft beat, which every way to the pit crosses. lights_shaft stands outside the shaft rect, a retry from it fires nothing at once.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 29, 14, 9) }, steps: [say('l10_start')] },
  { id: 'yard', when: { rect: rect(37, 25, 4, 2) }, steps: [say('l10_yard')] },
  { id: 'crack_hint', when: { rect: rect(8, 16, 4, 3) }, steps: [say('l10_crack_hint')] },
  { id: 'crack_done', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l10_crack_done')] },
  { id: 'block', when: { rect: rect(11, 11, 4, 3) }, steps: [say('l10_block'), { t: 'wake', group: 'guardroom' }] },
  { id: 'cell_hint', when: { rect: rect(3, 11, 4, 2) }, steps: [say('l10_cell_hint')] },
  { id: 'shaft', when: { rect: rect(19, 8, 2, 6) }, steps: [say('l10_shaft')] },
  {
    id: 'pit', when: { rect: rect(27, 8, 3, 6), needs: 'shaft' },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, say('l10_pit'), { t: 'wake', group: 'boss' }],
  },
  { id: 'pit_down', when: { event: 'pinned', spawn: 'pitdemo' }, steps: [say('l10_pit_down')] },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [say('l10_clear'), { t: 'open', prop: 'door1' }, { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// Both cracks want Hopper's fists, and he is the whole party, so the hints always show. The finisher is the pinned Demogorgon: the caret
// follows it and its death solves it.
const PUZZLES: PuzzleDef[] = [
  { id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'hopper', hint: 'MAYBE HOPPER SHOULD THROW A PUNCH' },
  { id: 'cell', beat: 'cell_hint', prop: 'crack2', hero: 'hopper', hint: 'MAYBE HOPPER SHOULD THROW A PUNCH' },
  { id: 'finish', beat: 'pit_down', prop: 'pitdemo', enemy: true, hero: 'hopper', hint: 'MAYBE HOPPER SHOULD SLAM THE GROUND' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the pen by the gap in its fence and east along the strip's trodden path to the gate in the inner fence.
  wp(8, 34), wp(14, 34), wp(17, 34), wp(24, 34), wp(31, 34), wp(37, 34), wp(38, 30), wp(38, 27), wp(38, 25),
  // West across the snow yard under the floodlight, along its south edge, then up the path to the block. The bot opens crack1 by flag where
  // the path meets the hint beat's tiles, and walks on through the notch.
  wp(33, 25), wp(28, 26), wp(22, 26), wp(16, 25), wp(11, 24), wp(10, 21), wp(10, 17, { open: 'crack1' }),
  // Into the corridor, east past the guard room's doorway and across the shaft's landing, through door1 and into the pit trigger. The
  // route skips the cache.
  wp(10, 13), wp(14, 12), wp(18, 12), wp(21, 11), wp(23, 10), wp(27, 10), wp(28, 10),
];

// ---------------------------------------------------------------- the stage
export const STAGE_41: StageData = {
  id: '4.1',
  name: 'Kamchatka',
  rows: ROWS,
  start: { x: px(3), y: fy(33) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // The owner's pick, Blizzard for the camp and Mine shaft for the pit (docs/chapter-4.md), at night.
  time: 'night',
  // `kamchatka` from the start: the pit beat switches it to `clock`, and a retry carries that on (musicAfter in world/triggers.ts).
  music: 'kamchatka',
  checkpoints: [
    { prop: 'lights_yard', x: px(4), y: fy(35) },
    { prop: 'lights_block', x: px(13), y: fy(5) },
    { prop: 'lights_shaft', x: px(21), y: fy(9) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // A first pass for the lead to tune (docs/level-10.md, "Targets"). One hero on one bar is a cliff: node scripts/measure-stage.ts 4.1 chief 100
  // clears 100 at 0.4, 82 to 88 at 0.5, 29 at 0.6 and none from 0.7 up, a wipe each time it fails. The campaign run (tests/pace.test.ts, six
  // tries with the kills kept) clears every seed up to 0.6, loses two in ten at 0.65 and one in ten at 1. xpMult 1.8 pays 252 before
  // the pit, 25 short of Lv 6 (277 for Lv 5 to 6): 2.2 gets Lv 6 and the Wind-up in the pit for a run that kills every guard.
  enemyMult: 0.5,
  xpMult: 1.8,
  waypoints: WAYPOINTS,
};
