// Stage 4.2, the Hellfire Club and the Creel House, the middle of chapter 4 (docs/level-11.md). Pure data: no DOM, so Node tests can import
// it. Spawns, items, props and the pools of light are in stage42_data.ts.
//
// The route, in tiles. The party starts in the Hellfire Club, a classroom in the south-west corner of Hawkins High: the board, the banner
// and the windows in the north wall, desks in rows and the D&D table in the middle, with the first string of lights by the board. A
// doorway three tiles tall in its east wall opens into the school hall, a long room of lockers and a trophy case in the north wall (the
// Walkman's locker is among them) and a checkered stripe down the floor. A doorway in the hall's north wall, three tiles wide, is the
// school's front door onto Hawkins: a street of sidewalk, road and lamps that runs the whole width of the map. East along it, a gate in the
// fence round the Creel yard opens north onto an overgrown lawn of dead trees, bushes and rubble with the second string of lights in the
// grass and the porch in front of the house. The front door is the foyer's: a room in the south-east of the house with the stairs in its
// corner and mirror1 across a doorway two tiles wide in its north wall. Past it is the hall, a long room under the house's north rooms, with
// mirror2 and mirror3 on its north wall. The hall's west end is the house's crossroads and holds the third string of lights: a doorway
// three tiles wide in its south wall opens on the dining room, where mirror4 closes the pantry behind it (the cache), and one in its north
// wall opens on the parlor, the memory room, with clock1 on its north wall between two mirrors. A doorway in the parlor's east wall leads to
// the back hall, the last room: a long corridor with three mirrors on its north wall and door_back in its east wall. Walls are a cap row
// over a face row looking onto the floor below, the club's a clubcap over a clubwall, the school's a schoolcap over lockers and the house's a
// creelcap over a creelwall, and a doorway in a side wall has a wall face over it, so no cap ever stands on floor. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage42_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   'TTTTTTTTTTTTTããããããããããããããããããããããããããããããããããT', // 0
   'TTTTTTTTTTTTTããããããããããããããããããããããããããããããããããT', // 1
   'TTTTTTTTTTTTTãäåäääåäääåääääãääåäääåäääåäääåääãT', // 2
   'TTTTTTTTTTTTTãêêæææææææææææêäæææææææææææææææææäT', // 3
   'TTTTTTTTTTTTTãææææççççççæææææææççççççççççççççææT', // 4
   'TTTTTTTTTTTTTãææææççççççæææææææççççççççççççççææT', // 5
   'TTTTTTTTTTTTTãêææææææææææææææèèæææêæææææèèææêæãT', // 6
   'TTTTTTTTTTTTTãããããããããããæææããããããããããããããããããããT', // 7
   'TTTTTTTTTTTTTãäåääåäääääæææääåääääääåääääääåääãT', // 8
   'TTTTTTTTTTTTTãêæææêãææææææææêæææææææææææææææêêãT', // 9
   'TTTTTTTTTTTTTãêææææãææççççççççççççççççççææææææãT', // 10
   'TTTTTTTTTTTTTãæææææãææççççççççççççççççççææææææãT', // 11
   'TTTTTTTTTTTTTãæææææãææææææææèèæêææææææææææææææãT', // 12
   'TTTTTTTTTTTTTããææãããããããæææãããããããããããããææãããããT', // 13
   'TTTTTTTTTTTTTãäææäåäåäääæææäääåääääääåääææääåäãT', // 14
   'TTTTTTTTTTTTTãæææææææææææææææææææêãêæææææææéééãT', // 15
   'TTTTTTTTTTTTTãææææççêêêêêêêêççççææãêæçççççæéééãT', // 16
   'TTTTTTTTTTTTTãææææççêêêêêêêêççççææãææçççççæéééãT', // 17
   'TTTTTTTTTTTTTãêææææææææææææææææææêãæææææææææææãT', // 18
   'TTTTTTTTTTTTTããããããããããããããããããããããããæææãããããããT', // 19
   'TTTTTTTTTTTTTãääåäääåäääåäääåäääåäääåpppäääåääãT', // 20
   'TTThhhhhhhTTTF....f...,.b...........ppppp.....FT', // 21
   'TTThhhhhhhTTTF.b,,..r..,,....f.t....pppppk..b.FT', // 22
   'TTTHHHHHHHTTTF...t,.......t...,......---....,.FT', // 23
   'TTTHHHdHHHT.TF.,...b..t..f..,,..r..b.---...t.,FT', // 24
   'TTb....b..b,,F......,,.....k..b..,,..b---.f...FT', // 25
   'TFFF.....,.m.FFFFFFFFFFFFFFFFFFFFFFFFF---FFFFFFT', // 26
   'T///////l/////////////l///////l/////////////l//T', // 27
   'T==============================================T', // 28
   'T______________________________________________T', // 29
   'T==============================================T', // 30
   'T//l////////////l//////////l//////////l////////T', // 31
   'ØØØØØØØØØØØØØØKKKKKKKKKKKKKKKKKKnnnKKKKKKKKKKKKT', // 32
   'ØØßÚÚÚÛÛÙÜÜÛÝØAAAAAAJAAARRAAAAAJnnnAKKKKKKKKKKKT', // 33
   'ØØàààààààààààÙnnnnnnnnnnnnnnnnnnnnnnKKKKKKKKKKKT', // 34
   'ØØàáàáàààààáànnnnnnnnnnnnnnnnnnnnnnnKKKKKKKKKKKT', // 35
   'ØØààààâââââàànjjjjjjjjjjjjjjjjjjjjjjKKKKKKKKKKKT', // 36
   'ØØàáàáâââââáànnnnnnnnnnnnnnnnPnnnnnnKKKKKKKKKKKT', // 37
   'ØØàààààààààààØnnnnnnnnPPnnnnPPnnnnnnKKKKKKKKKKKT', // 38
   'ØØØØØØØØØØØØØØKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKT', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// Two beats wait on a rect beat where the spec has an event beat. The curse waits on mirror_hint, not mirror_done, and the finale on the
// curse, not curse_end: a retry from a string before the event rebuilds the stage with mirror1 and clock1 kept open, so propCleared and
// curseEnd would never fire again and the chain would stop there for good. A curse that never starts (the Walkman is on, or nobody but
// Eddie and Max would be left standing) never ends either. Nothing is lost: the parlor is unreachable until mirror1 is open, and the
// back hall is only reachable through the parlor. (3.3's sour beat waits on crate_hint for the same reason.)
// The two mirror hints play on the way in, before the ghouls step out (80 px from the glass): mirror_hint at the front door, the foyer
// and the porch's edge, cache_hint on the dining room's side of the hall's doorway.
// The curse beat's rect is the parlor's south end, where the doorway from the hall comes in, so the party is a few steps from the clock
// when it chimes. The finale's rect is the whole back hall: the bot's last waypoint is inside it, standing where all three mirrors are
// within the ghouls' 80 px.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 34, 11, 5) }, steps: [say('l11_start')] },
  { id: 'walkman', when: { rect: rect(16, 34, 8, 2) }, steps: [{ t: 'walkman' }, say('l11_walkman')] },
  { id: 'street', when: { rect: rect(32, 30, 3, 2) }, steps: [say('l11_street')] },
  { id: 'yard', when: { rect: rect(38, 24, 3, 2) }, steps: [say('l11_yard')] },
  { id: 'mirror_hint', when: { rect: rect(36, 16, 7, 5) }, steps: [say('l11_mirror_hint')] },
  { id: 'mirror_done', when: { event: 'propCleared', prop: 'mirror1' }, steps: [say('l11_mirror_done')] },
  { id: 'cache_hint', when: { rect: rect(20, 15, 7, 3) }, steps: [say('l11_cache_hint')] },
  {
    id: 'curse', when: { rect: rect(20, 4, 8, 3), needs: 'mirror_hint' },
    steps: [{ t: 'curse', prop: 'clock1' }, { t: 'wake', group: 'parlor' }, say('l11_curse')],
  },
  { id: 'curse_end', when: { event: 'curseEnd' }, steps: [say('l11_curse_end')] },
  { id: 'finale', when: { rect: rect(29, 3, 17, 4), needs: 'curse' }, steps: [say('l11_finale'), { t: 'wake', group: 'finale' }] },
  { id: 'level_clear', when: { cleared: 'finale' }, steps: [{ t: 'open', prop: 'door_back' }, say('l11_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// Both mirror gates and the clock want Eddie's riff, and he is locked into the party on the map (REQUIRED in core/campaign.ts), so the
// route can wait on him. The hints are the spec's. The clock's hint counts HINT_AFTER (5 s) from the end of the curse beat, the second
// chime, 10 s before the fourth; a swing at it with anyone else shows the hint on the spot.
const PUZZLES: PuzzleDef[] = [
  { id: 'mirror', beat: 'mirror_hint', prop: 'mirror1', hero: 'eddie', hint: 'MAYBE EDDIE SHOULD PLAY IT A RIFF' },
  { id: 'cache', beat: 'cache_hint', prop: 'mirror4', hero: 'eddie', hint: 'MAYBE EDDIE SHOULD PLAY IT A RIFF' },
  { id: 'clock', beat: 'curse', prop: 'clock1', hero: 'eddie', hint: 'MAYBE EDDIE CAN SHATTER THE CLOCK' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Out of the club by its east doorway and east along the school hall, past the lockers (the Walkman beat) to the front doors.
  wp(11, 34), wp(12, 36), wp(15, 36), wp(20, 35), wp(26, 35), wp(31, 35), wp(33, 34), wp(33, 32), wp(33, 31),
  // Across the street and east along the north sidewalk to the Creel yard's gate, then up the trail to the porch and in at the front door.
  wp(35, 29), wp(38, 27), wp(39, 26), wp(39, 24), wp(38, 22), wp(38, 20), wp(38, 18),
  // The foyer. The bot opens mirror1 by flag from in front of it, inside the hint beat's tiles, and walks through the doorway.
  wp(40, 16, { open: 'mirror1' }), wp(40, 14), wp(40, 12),
  // West along the hall past mirror3 and mirror2 to its crossroads, then north through the parlor's doorway. The route skips the dining room
  // and the pantry. The curse beat is the parlor's south end, and under the curse the bot goes for the clock before it walks on.
  wp(36, 11), wp(32, 11), wp(27, 11), wp(25, 10), wp(25, 8), wp(25, 6),
  // East out of the parlor by its doorway and along the back hall to the middle of its three mirrors, inside the finale's tiles.
  wp(26, 5), wp(28, 5), wp(31, 5), wp(34, 5), wp(37, 5),
];

// ---------------------------------------------------------------- the stage
export const STAGE_42: StageData = {
  id: '4.2',
  name: 'The Creel House',
  rows: ROWS,
  start: { x: px(8), y: fy(34) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: [],
  lights: LIGHTS,
  // The owner's picks (docs/chapter-4.md): the club in Storm, the house in Abandoned with Blood red for the parlor while the curse counts.
  time: 'night',
  music: 'hawkins',
  checkpoints: [
    { prop: 'lights_club', x: px(4), y: fy(35) },
    { prop: 'lights_yard', x: px(33), y: fy(23) },
    { prop: 'lights_hall', x: px(21), y: fy(12) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // The first guesses (docs/level-11.md, "Result"): the stage's own numbers wait for the lead's pass.
  enemyMult: 1,
  xpMult: 1.8,
  // The parlor with its walls: the room the curse turns Blood red while the chimes count (docs/level-11.md, "The curse").
  memory: rect(13, 1, 16, 7),
  waypoints: WAYPOINTS,
};
