// Stage 5.2, the Abyss, the second stage of chapter 5 (docs/level-15.md). Pure data: no DOM, so Node tests can import it. Spawns, items and props are in
// stage52_data.ts.
//
// Broken pieces of Hawkins float over the void (the `abyssgap` tile, solid to walking and clear to the eye, so the backdrop shows through), each an
// island of floor over a cliff row over the rock that tapers under it, joined by single-lane vine bridges. The route, in tiles, winds up the map like an S:
// the lawn island at the south-west (the gate's landing is the porch at its west end, where the start is) and a bridge east to the road island, with the
// lane line down its middle. On the road's east edge a neck of two tiles, shut by gap1, leads to a pad of lawn that holds the cache: only Max's dash gets
// over it, and the route never goes there. From the road's north-west corner a bridge runs north to the deck (a porch, wide and low), with burn1, a wall
// of vines, across the middle of it. Past the deck's west end Will's bridge, sense1, runs north to the classroom island, which holds two Demogorgons. The
// classroom's neck at the north-east is shut by crack1, a fallen wall, and a long bridge east of it ends at the ring: a round island of rock about 18
// tiles across, with door1, the rock fall that shuts behind the party, across its way in on the west, and the twins. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { HeroId } from '../../core/types.ts';
import { CHAR_NAMES } from '../../core/config.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage52_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4         5 
  //0123456789012345678901234567890123456789012345678901
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 0
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 1
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 2
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùÿÿÿÿÿÿùùùùùùùùù', // 3
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿùùùùùùù', // 4
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿùùùùùù', // 5
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùùù', // 6
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùù', // 7
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùù', // 8
   'ùùùùüüüüüüüüüüüüüüüüüüüüùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùù', // 9
   'ùùùùüüüüüüüüüüüüüüüüüüüüøøøøøøøÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùù', // 10
   'ùùùùüüüüüüüüüüüüüüüüûûûûùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùù', // 11
   'ùùùùüüüüüüüüüüüüüüüüúúúúùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùù', // 12
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùûÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿûùùù', // 13
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùúÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿúùùù', // 14
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùù', // 15
   'ùùùùüüüüüüüüüüüüüüüüùùùùùùùùùùùùûÿÿÿÿÿÿÿÿÿÿÿÿÿÿûùùùù', // 16
   'ùùùùûûûûûûûûûûöûûûûûùùùùùùùùùùùùúûÿÿÿÿÿÿÿÿÿÿÿÿûúùùùù', // 17
   'ùùùùúúúúúúúúúúöúúúúúùùùùùùùùùùùùùúûÿÿÿÿÿÿÿÿÿÿûúùùùùù', // 18
   'ùùùùùùùùùùùùùùöùùùùùùùùùùùùùùùùùùùúûûÿÿÿÿÿÿûûúùùùùùù', // 19
   'ùùùùùùùùùùùùùùöùùùùùùùùùùùùùùùùùùùùúúûûûûûûúúùùùùùùù', // 20
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùúúúúúúùùùùùùùùù', // 21
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 22
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 23
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 24
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 25
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 26
   'ùùùùùùùùýýýýýýýýýýýýýýýýýýýùùùùùùùùùùùùùùùùùùùùùùùùù', // 27
   'ùùùùùùùùûûûûûûûûûûûûûûûûöûûùùùùùùùùùùùùùùùùùùùùùùùùù', // 28
   'ùùùùùùùùúúúúúúúúúúúúúúúúöúúùùùùùùùùùùùùùùùùùùùùùùùùù', // 29
   'ùùùùùùùùùùùùùùùùùùùùùùùùöùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 30
   'ùùùùùùùùùùùùùùùùùùùùùùùùöùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 31
   'ùùù¸¸¸¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùùùùùùùùùùùùùù', // 32
   'ùùù¸¸¸¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿù¸¸¸¸¸¸ùùùùùùù', // 33
   'ùùùýýý¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ¸¸¸¸¸¸ùùùùùùù', // 34
   'ùùùýýý¸¸¸¸¸¸¸¸¸¸¸øøøøøþþþþþþþþþþþþþþþþÿ¸¸¸¸¸¸ùùùùùùù', // 35
   'ùùùýýý¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿû¸¸¸¸¸¸ùùùùùùù', // 36
   'ùùù¸¸¸¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿú¸¸¸¸¸¸ùùùùùùù', // 37
   'ùùù¸¸¸¸¸¸¸¸¸¸¸¸¸¸ùùùùùÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿùûûûûûûùùùùùùù', // 38
   'ùùùûûûûûûûûûûûûûûùùùùùûûûûûûûûûûûûûûûûùúúúúúúùùùùùùù', // 39
   'ùùùúúúúúúúúúúúúúúùùùùùúúúúúúúúúúúúúúúúùùùùùùùùùùùùùù', // 40
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 41
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 42
   'ùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùùù', // 43
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// The twins rect is three tiles east of door1 (column 31), so nobody stands in the rock fall when it comes down. lights_ring hangs on the classroom's
// north-east corner, outside it: a retry from the string walks back over the bridge and fires the beat again.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(3, 33, 6, 5) }, steps: [say('l15_start')] },
  { id: 'burn_hint', when: { rect: rect(22, 32, 5, 2) }, steps: [say('l15_burn_hint')] },
  { id: 'burn_done', when: { event: 'propCleared', prop: 'burn1' }, steps: [say('l15_burn_done')] },
  { id: 'gap_hint', when: { rect: rect(34, 33, 4, 4) }, steps: [say('l15_gap_hint')] },
  { id: 'sense_hint', when: { rect: rect(11, 21, 7, 3) }, steps: [say('l15_sense_hint')] },
  { id: 'sense_done', when: { event: 'propCleared', prop: 'sense1' }, steps: [say('l15_sense_done')] },
  { id: 'crack_hint', when: { rect: rect(18, 8, 4, 4) }, steps: [say('l15_crack_hint')] },
  { id: 'crack_done', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l15_crack_done')] },
  {
    id: 'twins', when: { rect: rect(34, 8, 3, 6) },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, say('l15_twins'), { t: 'wake', group: 'boss' }],
  },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [say('l15_clear'), { t: 'open', prop: 'door1' }, { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// burn1 (Dustin, or Nancy from Lv 6) and crack1 (Steve or Hopper) are on the route, and Will is the only hero the party always has, so neither is the
// route's to leave shut: both give way to anyone's basic attack, CHIP_HITS of them (smashAimed in combat/props.ts), and the hint names the first hero
// in the party that can do it (PuzzleDef.alt, as 3.1's panel does): the gate's own heroes first, then the rest. sense1 is Will's, and he is locked in.
const everyone = (words: (name: string) => string, skip: HeroId[]): { hero: HeroId; hint: string }[] =>
  (['mike', 'dustin', 'lucas', 'eleven', 'max', 'robin', 'nancy', 'hopper', 'steve', 'will'] as HeroId[])
    .filter((h) => !skip.includes(h)).map((h) => ({ hero: h, hint: words(CHAR_NAMES[h].toUpperCase()) }));

const PUZZLES: PuzzleDef[] = [
  {
    id: 'burn', beat: 'burn_hint', prop: 'burn1', hero: 'dustin', hint: 'MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY',
    alt: [{ hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER MOLOTOV' }, ...everyone((n) => `MAYBE ${n} SHOULD HACK AT THE VINES`, ['dustin', 'nancy'])],
  },
  { id: 'gap', beat: 'gap_hint', prop: 'gap1', hero: 'max', hint: 'MAYBE MAX SHOULD TRY HER SKATE DASH' },
  { id: 'sense', beat: 'sense_hint', prop: 'sense1', hero: 'will', hint: 'MAYBE WILL CAN FEEL THE WAY' },
  {
    id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT',
    alt: [{ hero: 'hopper', hint: 'MAYBE HOPPER SHOULD THROW A PUNCH' }, ...everyone((n) => `MAYBE ${n} SHOULD BREAK THE WALL`, ['steve', 'hopper'])],
  },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The landing, east across the lawn past the pack, and over the first bridge onto the road.
  wp(8, 35), wp(12, 35), wp(16, 35), wp(19, 35), wp(22, 35),
  // The road's west end, then north-west to the foot of the bridge, where burn1 comes off by flag, and up the bridge onto the deck.
  wp(23, 34), wp(24, 33), wp(24, 32, { open: 'burn1' }), wp(24, 30), wp(24, 28),
  // West along the deck's north side past the pack, to the foot of Will's bridge, where sense1 opens by flag, and north over it.
  wp(23, 26), wp(19, 24), wp(15, 22), wp(14, 21, { open: 'sense1' }), wp(14, 19), wp(14, 17),
  // Across the classroom, north-east to the neck, where crack1 comes off by flag, then east over the long bridge onto the ring and into the twins' rect.
  wp(14, 14), wp(16, 12), wp(19, 10), wp(20, 10, { open: 'crack1' }), wp(23, 10), wp(27, 10), wp(30, 10), wp(33, 10), wp(35, 10),
];

// ---------------------------------------------------------------- the stage
export const STAGE_52: StageData = {
  id: '5.2',
  name: 'The Abyss',
  rows: ROWS,
  start: { x: px(4), y: fy(35) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // A day stage: the island tops are painted at their final values and baked with no night pass (docs/level-15.md, "Shape").
  time: 'day',
  // The void behind everything, drawn by drawAbyssBg.
  backdrop: 'abyss',
  // `upside` from the start: the twins' beat switches it to `clock`, and a retry carries that on (musicAfter in world/triggers.ts).
  music: 'upside',
  checkpoints: [
    { prop: 'lights_landing', x: px(4), y: fy(34) },
    { prop: 'lights_bridge', x: px(13), y: fy(24) },
    { prop: 'lights_ring', x: px(17), y: fy(8) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // Tuned with node scripts/measure-stage.ts 5.2 chief 20 [--careless] (docs/level-15.md, "Result"): the bot clears 16 of 20 (89 of 100, none stuck), the
  // one that never dodges 13. The party is Lv 7 to 10 with 66 to 111 HP each, so the stage needs a big factor, and the Demogorgons' swipe and charge are
  // down in enemies/defs.ts so that the factor does not make them a wall for a player who does not dodge. It is a cliff: over 100 seeds 2.6 clears 99, 3 only 65, and the bot that never dodges 77 and 23.
  enemyMult: 2.72,
  waypoints: WAYPOINTS,
};
