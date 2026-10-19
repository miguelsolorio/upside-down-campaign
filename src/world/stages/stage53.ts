// Stage 5.3, the heart of the Abyss, the last stage of the campaign (docs/level-16.md). Pure data: no DOM, so Node tests can import it. Spawns, items,
// props, the burrows and the channel are in stage53_data.ts.
//
// The route, in tiles, from the south. The party starts in a low chamber at the south-east (a few steps of flesh floor between heartwalls), climbs a
// two-tile passage into the hall, a long room with Flayed and demodogs in it, and goes west along it to the corridor at its north, shut by burn1,
// a wall of vines. Past it the antechamber, a small room with lights_heart on its north wall: the one save point for the whole fight. A two-tile
// neck north of it, shut by door1 once the fight starts, opens on the arena, a disc 22 tiles across with the rim (`heartrim`) all round its
// edge. Vecna stands in its middle, the Mind Flayer at its north tip with its legs spread along its front, and the two channel marks sit left
// and right of the centre, at (12, 14) and (23, 14). Every other wall is `heartwall`. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import { CHAR_NAMES } from '../../core/config.ts';
import type { HeroId } from '../../core/types.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { BURROWS, FINALE, LIGHTS, SPAWNS } from './stage53_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  'ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô', // 0
  'ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô', // 1
  'ôôôôôôôôôôôôôôôôôóóôôôôôôôôôôôôôôôôô', // 2
  'ôôôôôôôôôôôôôóóóóõõóóóóôôôôôôôôôôôôô', // 3
  'ôôôôôôôôôôôôóõõõõõõõõõõóôôôôôôôôôôôô', // 4
  'ôôôôôôôôôôôóõõõõõõõõõõõõóôôôôôôôôôôô', // 5
  'ôôôôôôôôôôóõõõõõõõõõõõõõõóôôôôôôôôôô', // 6
  'ôôôôôôôôôóõõõõõõõõõõõõõõõõóôôôôôôôôô', // 7
  'ôôôôôôôôóõõõõõõõõõõõõõõõõõõóôôôôôôôô', // 8
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 9
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 10
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 11
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 12
  'ôôôôôôóõõõõõõõõõõõõõõõõõõõõõõóôôôôôô', // 13
  'ôôôôôôóõõõõõõõõõõõõõõõõõõõõõõóôôôôôô', // 14
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 15
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 16
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 17
  'ôôôôôôôóõõõõõõõõõõõõõõõõõõõõóôôôôôôô', // 18
  'ôôôôôôôôóõõõõõõõõõõõõõõõõõõóôôôôôôôô', // 19
  'ôôôôôôôôôóõõõõõõõõõõõõõõõõóôôôôôôôôô', // 20
  'ôôôôôôôôôôóõõõõõõõõõõõõõõóôôôôôôôôôô', // 21
  'ôôôôôôôôôôôóõõõõõõõõõõõõóôôôôôôôôôôô', // 22
  'ôôôôôôôôôôôôóõõõõõõõõõõóôôôôôôôôôôôô', // 23
  'ôôôôôôôôôôôôôóóóóõõóóóóôôôôôôôôôôôôô', // 24
  'ôôôôôôôôôôôôôôôôôõõôôôôôôôôôôôôôôôôô', // 25
  'ôôôôôôôôôôôôôôôôôõõôôôôôôôôôôôôôôôôô', // 26
  'ôôôôôôôôôôôôôõõõõõõõõõõôôôôôôôôôôôôô', // 27
  'ôôôôôôôôôôôôôõõõõõõõõõõôôôôôôôôôôôôô', // 28
  'ôôôôôôôôôôôôôõõõõõõõõõõôôôôôôôôôôôôô', // 29
  'ôôôôôôôôôôôôôõõõõõõõõõõôôôôôôôôôôôôô', // 30
  'ôôôôôôôôôôôôôõõõõõõõõõõôôôôôôôôôôôôô', // 31
  'ôôôôôôôôôôôôôôôôôõõôôôôôôôôôôôôôôôôô', // 32
  'ôôôôôôôôôôôôôôôôôõõôôôôôôôôôôôôôôôôô', // 33
  'ôôôôôôôôôõõõõõõõõõõõõõõõõõõôôôôôôôôô', // 34
  'ôôôôôôôôôõõõõõõõõõõõõõõõõõõôôôôôôôôô', // 35
  'ôôôôôôôôôõõõõõõõõõõõõõõõõõõôôôôôôôôô', // 36
  'ôôôôôôôôôõõõõõõõõõõõõõõõõõõôôôôôôôôô', // 37
  'ôôôôôôôôôôôôôôôôôôôôôôôõõôôôôôôôôôôô', // 38
  'ôôôôôôôôôôôôôôôôôôôôôôôõõôôôôôôôôôôô', // 39
  'ôôôôôôôôôôôôôôôôôôõõõõõõõõõõõôôôôôôô', // 40
  'ôôôôôôôôôôôôôôôôôôõõõõõõõõõõõôôôôôôô', // 41
  'ôôôôôôôôôôôôôôôôôôõõõõõõõõõõõôôôôôôô', // 42
  'ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô', // 43
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// The vecna rect is the south of the arena, three tiles and more clear of door1 (rows 25 and 26), so nobody stands in it when it shuts. It shuts the
// door, switches the music to `abyss` (the fight's own track, which the phase beats then step up from 160 to 164 to 168 bpm) and starts the
// fight with `defend`, which wakes Vecna, or the Mind Flayer or the channel if a retry finds the one before it already down (Sim.defend, combat/finale.ts).
// The clear is the Final Roll: the channel running out sends it, and the Roll, Joyce and the boom come before the stage ends (the beat is
// fired once the scenes between are done).
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(18, 40, 11, 3) }, steps: [say('l16_start')] },
  { id: 'burn_hint', when: { rect: rect(15, 34, 6, 2) }, steps: [say('l16_burn_hint')] },
  { id: 'burn_done', when: { event: 'propCleared', prop: 'burn1' }, steps: [say('l16_burn_done')] },
  { id: 'antechamber', when: { rect: rect(13, 27, 10, 5) }, steps: [say('l16_antechamber')] },
  {
    id: 'vecna', when: { rect: rect(14, 19, 9, 4) },
    steps: [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'abyss' }, say('l16_vecna'), { t: 'defend' }],
  },
  { id: 'phase_spider', when: { event: 'bossPhase', phase: 2 }, steps: [{ t: 'phase', n: 1 }, say('l16_spider')] },
  { id: 'phase_channel', when: { event: 'bossPhase', phase: 3 }, steps: [{ t: 'phase', n: 2 }, say('l16_channel')] },
  { id: 'level_clear', when: { event: 'finalRoll' }, steps: [{ t: 'boom' }, say('l16_clear'), { t: 'open', prop: 'door1' }, { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// burn1 is Dustin's (or Nancy's from Lv 6) and gives way to anyone's basic attack, CHIP_HITS of them (smashAimed in combat/props.ts), so a party with
// neither is never shut in. The hint names the first hero in the party that can do it (PuzzleDef.alt), the gate's own heroes first.
const everyone = (words: (name: string) => string, skip: HeroId[]): { hero: HeroId; hint: string }[] =>
  (['mike', 'lucas', 'eleven', 'max', 'robin', 'hopper', 'steve', 'will'] as HeroId[])
    .filter((h) => !skip.includes(h)).map((h) => ({ hero: h, hint: words(CHAR_NAMES[h].toUpperCase()) }));

const PUZZLES: PuzzleDef[] = [
  {
    id: 'burn', beat: 'burn_hint', prop: 'burn1', hero: 'dustin', hint: 'MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY',
    alt: [{ hero: 'nancy', hint: 'MAYBE NANCY SHOULD TRY HER MOLOTOV' }, ...everyone((n) => `MAYBE ${n} SHOULD HACK AT THE VINES`, ['dustin', 'nancy'])],
  },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the start chamber, up the passage and west along the hall past the Flayed, to the foot of the corridor, where burn1 comes off by flag.
  wp(23, 41), wp(23, 39), wp(23, 37), wp(20, 36), wp(18, 35), wp(18, 34, { open: 'burn1' }), wp(18, 32),
  // Through the antechamber and the neck into the arena, and on to its middle, where the fight finds the bot.
  wp(18, 29), wp(18, 26), wp(18, 24), wp(18, 21), wp(18, 18),
];

// ---------------------------------------------------------------- the stage
export const STAGE_53: StageData = {
  id: '5.3',
  name: 'Vecna inside the Mind Flayer',
  rows: ROWS,
  start: { x: px(23), y: fy(41) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // A day stage: the heart's tiles carry their own darkness and the glow is drawn over them (docs/level-16.md, "Shape").
  time: 'day',
  // The climb plays `upside`; the `vecna` beat switches to `abyss` at the arena's door, and a retry carries that on (musicAfter in world/triggers.ts).
  music: 'upside',
  checkpoints: [{ prop: 'lights_heart', x: px(18), y: fy(30) }],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  burrows: BURROWS,
  finale: FINALE,
  enemyMult: 1.8,
  xpMult: 3.2,
  waypoints: WAYPOINTS,
};
