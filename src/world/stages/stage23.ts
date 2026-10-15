// Stage 2.3, the Gate: the Lab, overrun, at night. Pure data: no DOM, so Node tests can import it. Spawns, items, props, the burrows,
// the defense and the pools of light are in stage23_data.ts.
//
// The route is an S. South band, going east: the tunnel mouth (south-west), where a tunnel broke through the Lab's wall and roots
// come in under the break, the sublevel corridor with its vines and flesh, and a throat two tiles wide that crack1 shuts. Storage
// (south-east) is shelves, pods and masses of flesh, with the cache off its east wall behind gap1. Out of storage's north side a hall
// runs north and then west along the middle band, to the loading bay's south doors, with the second lights outside them. The den
// (north-west) is an arena 18 by 12, ringed in flesh, with seal1 across its south doorway and seal2 across its east one. Out of
// the east door the stairwell rises, with the third lights, and the Gate chamber (north-east) lies beyond it: all flesh and tears,
// the rift on its north wall, Eleven and Hopper under it. The flesh thickens as the route goes: lab tiles at the mouth, patches in
// the corridor and storage, most of the den, all of the chamber. Coordinates are tiles. Lab walls are a labcap row (V) over a labwall
// row (W) facing the floor below, like 1.2, the tunnel's are tunnelcap (2) over tunnelwall (3), and where the Upside Down has eaten
// a wall it is fleshwall (9).
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { BURROWS, DEFENSE, LIGHTS, SPAWNS } from './stage23_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 0
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 1
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV99999999999999V', // 2
   'VVVVV99999999999999999999VVVVVVVV9M8888888888M9V', // 3
   'VVVVV98888M888M88888888M9VV999WWV98!!8888888!!9V', // 4
   'VVVVV9M888888ooo8888Coo89V9M8oooV98!88888888!89V', // 5
   'VVVVV988888888o88888ooo89V988EEoV98888888888889V', // 6
   'VVVVV98888OCC8888888ooo89W9o88oxW98888888888889V', // 7
   'VVVVV9888OOO888888888888OOOoxEEoOO8888888888889V', // 8
   'VVVVV9C888O8888888888888OOO88888OO888888!888889V', // 9
   'VVVVV98888888888888888889V988EEo9988!888!!88!89V', // 10
   'VVVVV98o88888888oCC888889V98o88899M8!!8M88M!!M9V', // 11
   'VVVVV9oooo88888ooo88888C9V9CoEEM999999999999999V', // 12
   'VVVVVVooooo88888o888888C9VVVVVVVVVVVVVVVVVVVVVVV', // 13
   'VVVVVVooooo88888888888889VVVVVVVVVVVVVVVVVVVVVVV', // 14
   'VVVVVVooooo8888M8888888M9VVVVVVVVVVVVVVVVVVVVVVV', // 15
   'VVVVVVV9OO999999999999999VVVVVVVVVVVVVVVVVVVVVVV', // 16
   'VVVVVVV9889VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 17
   'VVVVVVV98899999WWW99999WWWWW99999VVVVVVVVVVVVVVV', // 18
   'VVVVVVV9888888OOOOO888OOOOOOO888O9VVVVVVVVVVVVVV', // 19
   'VVVVVVV9OO88888qOMq888MOqOOq888889VVVVVVVVVVVVVV', // 20
   'VVVVVVVVV9999999VV99999VVVV99998O9VVVVVVVVVVVVVV', // 21
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV9OOVVVVVVVVVVVVVVV', // 22
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV98O9VVVVVVVVVVVVVV', // 23
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV9889VVVVVVVVVVVVVV', // 24
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV98O9VVVVVVVVVVVVVV', // 25
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV9OOVVVVVVVVVVVVVVV', // 26
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVOOVVVVVVVVVVVVVVV', // 27
   '22222222VVVVVVVVVVVVVVVVWWW9999OO99999VVVVVVVVVV', // 28
   '22222222VVVVVVVVVVVVVVVVoooo888o8CC8MMVVVVVVVVVV', // 29
   '22333339WWVVVVVVVVVVVVVVooUUo8oo88888CVVWWWWWWVV', // 30
   '22141419ooWWW99999WWWVVVoooNNNoo88NNNCVVoooxooVV', // 31
   '22114119ooOOUM888xUUO9WWooooooooo888ooWWoNNoxoVV', // 32
   '22411144ooOOOxx8OO888OOOooo8xxooooooooOOoo888CVV', // 33
   '22141144ooOx8OxOO88888OOoo888oooooxoooOOoo888oVV', // 34
   '22111419ooO888OqxM88M99Vo88NNNooooo8889Vox888oVV', // 35
   '22414119oo99999VV99999VVCox88ooooUo88C9VoooNNoVV', // 36
   '22222222VVVVVVVVVVVVVVVVCCo8ooxooMo88C9VVVVVVVVV', // 37
   '22222222VVVVVVVVVVVVVVVVVV999VVVVV99999VVVVVVVVV', // 38
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 31, 7, 6) }, steps: [say('l6_start')] },
  { id: 'crack_hint', when: { rect: rect(18, 33, 3, 2) }, steps: [say('l6_crack_hint')] },
  { id: 'crack_open', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l6_crack_done')] },
  { id: 'storage', when: { rect: rect(24, 33, 2, 2) }, steps: [say('l6_storage')] },
  { id: 'gap_hint', when: { rect: rect(35, 33, 3, 2) }, steps: [say('l6_gap_hint')] },
  { id: 'gap_crossed', when: { event: 'propCleared', prop: 'gap1' }, steps: [say('l6_gap_done')] },
  { id: 'den', when: { rect: rect(10, 19, 3, 2) }, steps: [say('l6_den')] },
  // The party is well inside the den when the seals shut, so nobody stands in one.
  {
    id: 'alpha', when: { rect: rect(7, 11, 6, 3), needs: 'den' },
    steps: [{ t: 'close', prop: 'seal1' }, { t: 'close', prop: 'seal2' }, { t: 'music', track: 'clock' }, say('l6_alpha'), { t: 'wake', group: 'boss' }],
  },
  { id: 'alpha_down', when: { cleared: 'boss' }, steps: [{ t: 'open', prop: 'seal1' }, { t: 'open', prop: 'seal2' }, say('l6_alpha_down')] },
  // Hopper strung the lights at the Gate: the beat lights lights_gate for the party, so a defense that fails always comes
  // back to the Gate with the party healed, never to the den.
  { id: 'gate', when: { rect: rect(32, 8, 2, 2), needs: 'alpha_down' }, steps: [say('l6_gate'), { t: 'light', prop: 'lights_gate' }] },
  { id: 'defend', when: { rect: rect(36, 7, 6, 3), needs: 'gate' }, steps: [say('l6_defend'), { t: 'defend' }] },
  { id: 'level_clear', when: { event: 'defended' }, steps: [say('l6_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// crack1 blocks the way on, so Steve (locked into the party on the map) breaks it. gap1 guards only the cache: a party without Max
// never sees its hint (world/puzzles.ts), and nothing nags.
const PUZZLES: PuzzleDef[] = [
  { id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT' },
  { id: 'gap', beat: 'gap_hint', prop: 'gap1', hero: 'max', hint: 'MAYBE MAX SHOULD TRY HER SKATE DASH' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the mouth and east along the corridor, to the crack. The bot breaks it by flag, then walks through.
  wp(5, 34), wp(9, 34), wp(12, 34), wp(16, 34), wp(20, 34, { open: 'crack1' }), wp(23, 34),
  // Across storage, skipping the cache, and north up the hall.
  wp(26, 34), wp(29, 33), wp(31, 31), wp(31, 27), wp(31, 22), wp(30, 20),
  // West along the hall to the den's south doors, and in: the `alpha` trigger is the den's south-west corner.
  wp(26, 19), wp(20, 19), wp(14, 19), wp(10, 19), wp(9, 17), wp(9, 14), wp(9, 12),
  // Across the den to the east door, up the stairwell, and into the Gate chamber, to the `defend` trigger.
  wp(13, 10), wp(18, 9), wp(22, 9), wp(25, 9), wp(28, 9), wp(31, 9), wp(33, 9), wp(35, 8), wp(38, 8),
];

// ---------------------------------------------------------------- the stage
export const STAGE_23: StageData = {
  id: '2.3',
  name: 'The Gate',
  rows: ROWS,
  start: { x: px(4), y: fy(34) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  time: 'night',
  // `lab` until the Alpha wakes: the `alpha` beat switches it to `clock`, and a retry carries that on (world/play.ts).
  music: 'lab',
  checkpoints: [
    { prop: 'lights_mouth', x: px(5), y: fy(33) },
    { prop: 'lights_den', x: px(14), y: fy(19) },
    { prop: 'lights_gate', x: px(29), y: fy(11) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(4), y: fy(33) }, to: { x: px(4), y: fy(33) }, frames: 1 },
  // Measured with node scripts/measure-stage.ts 2.3 chief 20 [--careless]. The gate beat lights lights_gate, so the party goes into
  // the defense healed and a failed defense comes back to the Gate. With the softer Alpha and the sparse defense (stage23_data.ts) the
  // stage runs at 1.0: see "Result" in docs/level-6.md for the numbers.
  enemyMult: 1,
  // XP factor for the campaign's pace (docs/pace.md), set with node scripts/measure-campaign.ts.
  xpMult: 1.6,
  burrows: BURROWS,
  defense: DEFENSE,
  waypoints: WAYPOINTS,
};
