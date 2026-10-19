// Stage 4.4, Vecna's lair, the end of chapter 4 (docs/level-13.md). Pure data: no DOM, so Node tests can import it. Spawns, items, props and the
// pools of light are in stage44_data.ts.
//
// The route, in tiles. The party starts on the porch, a stretch of planks in a dead lawn at the foot of the map, and goes in at the front door, a
// doorway four tiles wide in the house's front wall. The foyer is a long room of furniture under sheets with the first fight (the house beat), and
// its way on is a doorway three tiles wide at its west end, up to the hall, which runs east the width of the house. A doorway three tiles wide at
// the hall's east end opens north on the parlor, the room of the clock and the broken mirrors, and a doorway two tiles tall in the parlor's west
// partition leads on to the dining room, with a table under a sheet. The stairs are in the dining room's north wall: a flight of creelstairs three
// tiles wide set in the wall's cap and face rows, and beside it a floor gap three tiles wide, the way up (the stairs beat is the foot of them).
// The landing is a hall of the upper floor, running east over the rooms below, and the attic's doorway, four tiles wide, is in the middle of its
// north wall with door_attic across it. The attic is the sheet's Vine nest (gfx/sheet_l13.ts) at 18 tiles across: the ridge over a knee wall on the
// north, a roof tile for each side wall, three tiles of eave down each side, two of floor, and the rug in the middle, six by four, where Vecna
// stands. gfx/tile_attic.ts hangs the knot of vines over the rug and runs the roots under it from the orbs' four corners. The attic's bottom wall
// is two rows thick, the landing's north wall.
//
// Walls are a cap row over a face row looking onto the floor below, the house's a creelcap over a creelwall, and a doorway in a side wall has a
// face row over it, so no cap ever stands on floor: the partition between the dining room and the parlor ends in a face over its doorway, with
// caps above it. The stairs fill both rows of the wall. The lawn and the porch are 4.3's dead lawn, veins and trees over the town's planks, and the
// pines are the edge of the map. Coordinates are tiles.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage44_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
  'TTTTTTTTTTTTTTTĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆTTTTTTTTTTTTTTT', // 0
  'TTTTTTTTTTTTTTTććććććććććććććććććTTTTTTTTTTTTTTT', // 1
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 2
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 3
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĉĉĉĉĉĉĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 4
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĉĉĉĉĉĉĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 5
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĉĉĉĉĉĉĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 6
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĉĉĉĉĉĉĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 7
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 8
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 9
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 10
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 11
  'TTTTTTTTTTTTTTTĆĊĊĊĈĈĈĈĈĈĈĈĈĈĊĊĊĆTTTTTTTTTTTTTTT', // 12
  'TTTTTTTTTããããããĆĆĆĆĆĆĆĈĈĈĈĆĆĆĆĆĆĆããããããTTTTTTTTT', // 13
  'TTTTTTTTTãääåääćććććććĈĈĈĈćććććććääåääãTTTTTTTTT', // 14
  'TTTTTTTTTãæêêæææææææææææææææêêææææêêææãTTTTTTTTT', // 15
  'TTTTTTTTTãææççççççççççççççççççççççççææãTTTTTTTTT', // 16
  'TTTTTTTTTãèæææææææææææææææææææèèææææææãTTTTTTTTT', // 17
  'TTTTTTTTTããéééæææããããããããããããããããããããããTTTTTTTTT', // 18
  'TTTTTTTTTãäéééæææäåäåäãäääääääääåäääåäãTTTTTTTTT', // 19
  'TTTTTTTTTãêæççççççççææãæêæææææææææææêêãTTTTTTTTT', // 20
  'TTTTTTTTTãææçççêêêêçææäæææçççççççççæææãTTTTTTTTT', // 21
  'TTTTTTTTTãææçççêêêêçææææææçççççççççæææãTTTTTTTTT', // 22
  'TTTTTTTTTãêæççççççççèææææèèæææææææææêêãTTTTTTTTT', // 23
  'TTTTTTTTTããããããããããããããããããããããããæææãããTTTTTTTTT', // 24
  'TTTTTTTTTãääåääääåääääääåäääääåääæææåäãTTTTTTTTT', // 25
  'TTTTTTTTTãææææææêêææææææêæææææêææææææêãTTTTTTTTT', // 26
  'TTTTTTTTTãæççççççççççççççççççççççççççæãTTTTTTTTT', // 27
  'TTTTTTTTTãææææèæææææèèææææææææææææææææãTTTTTTTTT', // 28
  'TTTTTTTTTããæææãããããããããããããããããããããããããTTTTTTTTT', // 29
  'TTTTTTTTTãäæææääåäääåäääääääåäääåäääåäãTTTTTTTTT', // 30
  'TTTTTTTTTãêææææææêêæææææææææææêêæææææêãTTTTTTTTT', // 31
  'TTTTTTTTTãææççççççççççççççççççççççççææãTTTTTTTTT', // 32
  'TTTTTTTTTãææææææææææææææææææææææææææææãTTTTTTTTT', // 33
  'TTTTTTTTTãããããããããããããææææãããããããããããããTTTTTTTTT', // 34
  'TTTTTTTTTãääåääåääåäääppppäääåääåääåääãTTTTTTTTT', // 35
  'TTTTTTTTTTăîîîîîïîîîppppppppîîîîîîîîîăTTTTTTTTTT', // 36
  'TTTTTTTTTTăîïïîîîîîîppppppppîîîîîïïîîăTTTTTTTTTT', // 37
  'TTTTTTTTTTăăîïîîîîîîppppppppîîîïîîïîîăTTTTTTTTTT', // 38
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

// The porch, the foyer, the foot of the stairs and the attic are rects, and the attic's needs the stairs, which are rects too: a retry from a
// string of lights restores the beats that had played by then, and a rect beat fires again on its own, but an event beat waits for an event the
// retry may never send. Nothing in the chain waits on one. `float` and `burn` are events (the phases), but nothing waits on them, and a string
// is never lit in the attic: the door shuts at the `vecna` beat, so no retry carries them. lights_landing is on the landing, past the stairs and
// before the attic, so a retry from it has `stairs` played and `vecna` still to come, and wakes Vecna at his full health.
// The attic's rect is the south half of the room, 3 to 9 rows down from its top: the leader is at least 4 rows in when the door shuts, and the
// followers trail him by about 3 tiles, so nobody is in the doorway (rows 13 and 14) when door_attic closes.
const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(19, 36, 10, 3) }, steps: [say('l13_start')] },
  { id: 'house', when: { rect: rect(19, 31, 11, 3) }, steps: [say('l13_house'), { t: 'wake', group: 'foyer' }] },
  { id: 'stairs', when: { rect: rect(11, 20, 4, 3) }, steps: [say('l13_stairs'), { t: 'wake', group: 'landing' }] },
  {
    id: 'vecna', when: { rect: rect(17, 3, 14, 7), needs: 'stairs' },
    steps: [{ t: 'close', prop: 'door_attic' }, { t: 'music', track: 'clock' }, say('l13_vecna'), { t: 'wake', group: 'boss' }],
  },
  { id: 'float', when: { event: 'phase', spawn: 'vecna', phase: 2 }, steps: [say('l13_float')] },
  { id: 'burn', when: { event: 'phase', spawn: 'vecna', phase: 3 }, steps: [say('l13_burn')] },
  { id: 'level_clear', when: { cleared: 'boss' }, steps: [say('l13_clear'), { t: 'open', prop: 'door_attic' }, { t: 'finish' }] },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number): BotWaypoint => ({ x: px(tx), y: fy(ty) });

const WAYPOINTS: BotWaypoint[] = [
  // Across the porch, in at the front door and west along the foyer to its doorway, and up it to the hall.
  wp(24, 37), wp(24, 35), wp(23, 33), wp(18, 32), wp(13, 32), wp(12, 30), wp(12, 28),
  // East along the hall to its doorway, and up it into the parlor.
  wp(18, 27), wp(26, 27), wp(33, 27), wp(34, 25), wp(34, 23),
  // West across the parlor, through its partition's doorway, and across the dining room to the foot of the stairs.
  wp(29, 22), wp(24, 22), wp(21, 22), wp(18, 20), wp(13, 20),
  // Up the gap beside the stairs, east along the landing to the attic's doorway, and up into the room, inside the `vecna` beat's rect.
  wp(15, 18), wp(15, 16), wp(20, 16), wp(23, 16), wp(23, 13), wp(23, 11), wp(24, 8),
];

// ---------------------------------------------------------------- the stage
export const STAGE_44: StageData = {
  id: '4.4',
  name: "Vecna's lair",
  rows: ROWS,
  start: { x: px(24), y: fy(37) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: [],
  waves: [],
  lights: LIGHTS,
  // The owner's picks (docs/chapter-4.md): the Creel House in its Upside Down skin, then the attic in Vine nest, at night. `upside` on the route,
  // `clock` from the `vecna` beat on (a retry carries it on, world/play.ts).
  time: 'night',
  music: 'upside',
  skin: 'upside',
  checkpoints: [
    { prop: 'lights_porch', x: px(21), y: fy(37) },
    { prop: 'lights_landing', x: px(19), y: fy(16) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(2), y: fy(2) }, to: { x: px(2), y: fy(2) }, frames: 1 },
  // Starting numbers, for the lead to tune with node scripts/measure-stage.ts 4.4 chief 20 (docs/level-13.md, "Targets").
  // Tuned by the lead on HARD (docs/level-13.md, "Result"), with Vecna at 1000 HP and 32 ATK and his lash and throw quick and soft:
  // chief clears 100 of 100, careless 86. The careful bot steps out of nearly every lash and throw, so its lowest HP stays high.
  enemyMult: 1.7,
  xpMult: 2.9,
  waypoints: WAYPOINTS,
};
