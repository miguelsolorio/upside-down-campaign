// Stage 4.3, Upside Down Hawkins, the third of chapter 4 (docs/level-12.md). Pure data: no DOM, so Node tests can import it. Spawns, items,
// props, the pools of light and the roof's burrows are in stage43_data.ts.
//
// The route, in tiles. The party comes through the tear in the south-west corner, a lawn laced with red veins, onto a long street going east:
// houses with their fronts on the north side of it (the first row of them, with clock1 standing in the lawn of the first house), a sidewalk,
// a road and a fence along the south. At the far end of the street the side street goes north, a road two tiles wide between two houses, an
// alley, and mirror1 stands across its far end. Past the glass it comes out on the cross street, a second road under another row of houses, with
// clock2 on the corner of the alley's mouth. East along the cross street a gate three tiles wide opens in the trailer park's fence: Forest
// Hills, a yard of lanes between two rows of trailers with clock3 in the middle lane and the second string of lights by the gate. The lanes
// run north to Eddie's trailer, the park's end: its flat roof is the song's arena, a deck sixteen tiles by ten inside its lip, and a ladder
// leans on the trailer's front between its two halves, a doorway two tiles wide in the lip with door_roof across it. The third string of lights
// hangs in the lot in front of it. Roofs, trees and fences fill what the route does not walk, so every open tile is on it. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { BURROWS, LIGHTS, SPAWNS } from './stage43_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
  'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀ', // 0
  'ĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăąąąąąąąąąąąąąąąąąąĀ', // 1
  'ĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 2
  'ĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 3
  'ĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 4
  'ĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 5
  'ĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 6
  'ĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 7
  'ĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 8
  'ĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 9
  'ĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 10
  'ĀĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀąĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄĄąĀ', // 11
  'ĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăąąąąąąąąĄĄąąąąąąąąĀ', // 12
  'ĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀāāāāāāāāîîāāāāāāāāĀ', // 13
  'ĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀāāāāāāāāîîāāāāāāāāĀ', // 14
  'ĀĀăĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĂîîîîîîîîîîîîîîîîĀ', // 15
  'ĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĂîîîîîîîîïîîîîîîîĀ', // 16
  'ĀĀĀăĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĂîîîîîîîïîîîîîăïîĀ', // 17
  'ĀĀĀĀĀĀĀĀĀăðñðòðñðððñðòðñðððñððĂîîāāāāāāîîîāāāîîĀ', // 18
  'ĀĀĀĀăĀĀĀĀĀîîăîîîîîăîîîîîîîîăîîĂîîāāāāāāîîîāāāîîĀ', // 19
  'ĀĀĀĀĀĀĀĀĀĀííííííííííííííííííííĂîîîîîîîîïïîîîîîăĀ', // 20
  'ĀĀĀĀĀăĀĀĀĀëëëëëëëëëëëëëëëëëëëëëîîîîîîîîîîîîîîîîĀ', // 21
  'ĀĀĀĀĀĀĀĀĀĀìëëìïïìëëìëëìëëìëëìëëîîîîîîîîîîîîîîîîĀ', // 22
  'ĀĀĀĀĀĀăĀĀĀëëëëëëëëëëëëëëëëïïëëëîîîîîîîîîîîîîîîîĀ', // 23
  'ĀăĀĀĀĀĀĀĀĀííííííííííííííííííííĂîïîîîîîîîîïîîîîîĀ', // 24
  'ĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀííĀĀĀĀĀĀĀĀĀĀĂîîāāāāāāîîîāāāîîĀ', // 25
  'ĀăăîîîîîăăĀĀĀĀĀĀĀĀëëĀĀĀĀĀĀĀĀĀĀĂîîāāāāāāîîîāāāîîĀ', // 26
  'ĀîîîîîîîîăĀĀĀĀĀĀĀĀëëĀĀĀĀĀĀĀĀĀĀĂîîîîîîîîîîîîîîîîĀ', // 27
  'ĀîïïïîîăîîðñðòðñððëëðñðòðñððñðĂîîîïïîîîîîîîîîîîĀ', // 28
  'ĀîîïïïîîîîîîîîîăîîëëîîîîăîîăîîĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĀ', // 29
  'ĀîïîïïïîîîîîîîîîïîëëîîîîîïïîîîĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀ', // 30
  'ĀăîîîîïîîîîăîîîîîïëëîăîîîîîîîăĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀ', // 31
  'ĀíííííííííííííííííííííííííííííĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀ', // 32
  'ĀëëëëëëëëëëëëëëëëëëëëëïïëëëëëëĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀ', // 33
  'ĀìëëìëëìëëìëëìëëìëëìëëìëëìëëìëĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀ', // 34
  'ĀëëëëëëëëëëëïïëëëëëëëëëëëëëëëëĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀ', // 35
  'ĀííííííííííííïííííííííííííííííĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀ', // 36
  'ĀĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀ', // 37
  'ĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀĀĀĀĀăĀĀĀĀĀĀ', // 38
  'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀ', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// Every chain waits on a rect beat, not on an event beat: a retry rebuilds the stage with the shattered mirror and the broken clocks kept
// open, so propCleared and curseEnd would never fire again and the chain would stop there for good. The three clock beats curse when the
// party is a few steps from the clock, on the street, the corner of the alley and the lane. A clock that is broken already, or a curse that
// would leave nobody standing, does nothing and the beat's script plays all the same. mirror_hint is the road below the alley, 80 px and
// more from the glass, so it plays before the ghouls step out. The park beat is the gate, and lights_park hangs on the cross street before it
// (the checkpoints are outside every rect that wakes). roof needs park and is the deck a few steps in from the ladder: the door shuts behind
// the party, the music changes, and solo follows it as soon as its script is done, then level_clear when the song ends.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(1, 27, 8, 5) }, steps: [say('l12_start')] },
  { id: 'street', when: { rect: rect(8, 32, 3, 4) }, steps: [say('l12_street'), { t: 'wake', group: 'bats1' }] },
  { id: 'clock1', when: { rect: rect(12, 32, 3, 2) }, steps: [{ t: 'curse', prop: 'clock1' }, say('l12_clock1')] },
  { id: 'mirror_hint', when: { rect: rect(17, 31, 4, 2) }, steps: [say('l12_mirror_hint')] },
  { id: 'clock2', when: { rect: rect(17, 23, 3, 2) }, steps: [{ t: 'curse', prop: 'clock2' }, say('l12_clock2')] },
  { id: 'park', when: { rect: rect(28, 21, 3, 3) }, steps: [say('l12_park'), { t: 'wake', group: 'bats2' }] },
  { id: 'clock3', when: { rect: rect(32, 21, 4, 3) }, steps: [{ t: 'curse', prop: 'clock3' }, say('l12_clock3')] },
  {
    id: 'roof', when: { rect: rect(34, 6, 8, 3), needs: 'park' },
    steps: [{ t: 'close', prop: 'door_roof' }, { t: 'music', track: 'clock' }, say('l12_roof')],
  },
  { id: 'solo', when: { after: 'roof' }, steps: [say('l12_solo'), { t: 'solo', chart: 'rooftop' }] },
  { id: 'level_clear', when: { after: 'solo' }, steps: [{ t: 'fall', hero: 'eddie' }, say('l12_fall'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// The mirror gate and the three clocks all want Eddie's riff, and he is locked into the party on the map, so the route can wait on him. The
// hints are the spec's. The clock's hint counts from the end of its beat: HINT_AFTER (5 s) after the first chime, 10 s before the fourth.
const CLOCK_HINT = 'MAYBE EDDIE CAN SHATTER THE CLOCK';
const PUZZLES: PuzzleDef[] = [
  { id: 'mirror', beat: 'mirror_hint', prop: 'mirror1', hero: 'eddie', hint: 'MAYBE EDDIE SHOULD PLAY IT A RIFF' },
  { id: 'clock1', beat: 'clock1', prop: 'clock1', hero: 'eddie', hint: CLOCK_HINT },
  { id: 'clock2', beat: 'clock2', prop: 'clock2', hero: 'eddie', hint: CLOCK_HINT },
  { id: 'clock3', beat: 'clock3', prop: 'clock3', hero: 'eddie', hint: CLOCK_HINT },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the tear and east along the street, past clock1 (the beat is the sidewalk in front of its yard) to the side street.
  wp(5, 31), wp(7, 33), wp(9, 34), wp(11, 34), wp(13, 33), wp(15, 34), wp(17, 34), wp(18, 33), wp(18, 32),
  // North up the side street. The bot shatters mirror1 by flag from the road below it, inside the hint, and walks on through the
  // alley to the cross street, where clock2 stands on the corner.
  wp(18, 31, { open: 'mirror1' }), wp(18, 29), wp(18, 27), wp(18, 25), wp(18, 24),
  // East along the cross street to the park's gate, and in along the middle lane past clock3.
  wp(21, 22), wp(25, 22), wp(28, 22), wp(31, 22), wp(34, 22), wp(35, 23), wp(37, 23), wp(40, 23),
  // North up the lane between the two halves of the first row, across the lot to the ladder, up it and a few steps onto the deck.
  wp(40, 20), wp(40, 18), wp(40, 16), wp(38, 15), wp(38, 13), wp(38, 11), wp(38, 9), wp(38, 7),
];

// ---------------------------------------------------------------- the stage
export const STAGE_43: StageData = {
  id: '4.3',
  name: 'Upside Down Hawkins',
  rows: ROWS,
  start: { x: px(4), y: fy(29) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // The owner's pick (docs/chapter-4.md): Blue storm, a night under a storm whose bolts flood the lit edges red.
  time: 'night',
  music: 'upside',
  storm: true,
  checkpoints: [
    { prop: 'lights_tear', x: px(4), y: fy(28) },
    { prop: 'lights_park', x: px(25), y: fy(20) },
    { prop: 'lights_roof', x: px(34), y: fy(17) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // Starting numbers: the lead tunes them on HARD (docs/level-12.md, "Result").
  enemyMult: 1.5,
  xpMult: 1.8,
  // The deck's edge: where the flock that circles Eddie comes up from while the song plays.
  burrows: BURROWS,
  waypoints: WAYPOINTS,
};
