// Stage 1.2, Hawkins Lab. Pure data: no DOM, so Node tests can import it.
//
// The route is a snake in three bands. South band, going east: the loading dock (outdoors, south-west), corridor A,
// and the power room, where Dustin burns sensor1 to open door1. Middle band, going west: the animal lab (a hall,
// then the cage room where the rats wake), the observation corridor with its glass wall, and the passage up to
// door2, which Lucas opens from the corridor by shooting relay1 through the glass. North band, going east: the
// storage hall (rats, side rooms, the checkpoint just past door2), the crate corridor where Eleven shoves crate1
// aside, and the records wing, where the lockdown waves come from both ends. Coordinates are tiles. The scare path
// is in px. Walls are two tiles thick where they can be: a labcap row, then a labwall row facing the room below.
import type { SimSpawn } from '../../core/types.ts';
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';

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
   'VVVWWWWWWWWVWWWWWWWWWWWWWWWVVVVWWWWWWWWWWWWWWWVV', // 2
   'VVVOOOoooooVOoooOoooooOooccVVVVzoccccozzccccozVV', // 3
   'VVVooccooooVOccooccooccooooWWWWzoooooooooOooozVV', // 4
   'VVVooccooooWoccooccooccooOoOOozzoOooOoooooooOzVV', // 5
   'VVVoOOOOOoOzooooooooooooOooooozzOOoioooooiooOzVV', // 6
   'VVVoooooccozoooooccOoccooOOoOozzoOoioooooiooozVV', // 7
   'VVVooooooOoVOioooccooccoOOoVVVVzoooOoooooooOozVV', // 8
   'VVVooccooOoVooooooOooOOooooVVVVzooooooOoooooozVV', // 9
   'VVVOoOoooooVoooooooooooooOiVVVVzoccooozzooccOzVV', // 10
   'VVVVVVVVVVVVVVzzVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 11
   'VVVVVVVVVVVVVVzzVWWWWWWWWWWWWWVWWWWWWWWWWWWWWWVV', // 12
   'VVVVVVVVVVVVVVooVoooOoooOoooooVocccoocccoOcccoVV', // 13
   'VVVVVVVVVVVVVVoOVooooooooooOooVoooooooOooooOooVV', // 14
   'VVVVVVVVVVVVVVooWGGGGGGGGGGGGGVooocccoooooooooVV', // 15
   'VVVVVVVVVVVVVVoOoOOooooOOoooooWooocccooocccoocVV', // 16
   'VVVVVVVVVVVVVVooooooiOoooooooozoooooooOocccoocVV', // 17
   'VVVVVVVVVVVVVVoooOOoooooooiOoozoooooOooooOOoOoVV', // 18
   'VVVVVVVVVVVVVVoooooooOoooooooOVvvooooooooOOoooVV', // 19
   'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVzzzVVVVVVVV', // 20
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVWWWWWWzzzWWWWWWVV', // 21
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVccoooooOoooooccVV', // 22
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVcooooooOoooooOcVV', // 23
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVoOooiooooOoiOooVV', // 24
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVoOoooooooooooooVV', // 25
   'TTTTTTTTTTTTTVVVVVVVVVVWWWWWWVVOoOooooooOoooooVV', // 26
   'TTTTTTTTTTTTTVVVVVVVVVVooooOoVVoccooooooooocccVV', // 27
   'TTTTTTTTTTTTTVVVVVVVVVVooooooVVVVVVVVVzzVVVVVVVV', // 28
   'TTTTTTTTTTTTTVVVVVVVVVVOoooooVVWWWWWWWzzWWWWWWVV', // 29
   'TXXXXXXXXXXXXVVVVVVVVVVOoOoooVVoooooooooooooooVV', // 30
   'TglgggggggglgVVVVVVVVVVVVzzVVVVoooooooOooooooiVV', // 31
   'TggggggggggggWWWWWWWWWWWWzzWWWVoooOoOooooooioiVV', // 32
   'TggggggggggggzOccoOooccoooooccWOoovvooooooooOiVV', // 33
   'TggggggggggggzoooooooOOoooOooozooovvooooovvoooVV', // 34
   'T============zooooooiooOoioooozOooooioOoiooooiVV', // 35
   'T____________VooooooooOooOoooozoooOoOooooOoooiVV', // 36
   'T============VoooccoooooccOoooVoiioooooooOooooVV', // 37
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 38
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 39
];

// ---------------------------------------------------------------- spawns
const rat = (id: string, group: string, tx: number, ty: number, dormant = false): SimSpawn =>
  dormant ? { kind: 'enemy', id, type: 'rat', tx, ty, group, dormant: true } : { kind: 'enemy', id, type: 'rat', tx, ty, group };

const agent = (id: string, group: string, tx: number, ty: number, patrol?: [number, number][], dormant = false): SimSpawn => {
  const base = { kind: 'enemy' as const, id, type: 'agent' as const, tx, ty, group };
  if (dormant) return { ...base, dormant: true };
  return patrol ? { ...base, patrol: patrol.map(([ptx, pty]) => ({ tx: ptx, ty: pty })) } : base;
};

const item = (id: string, kind: 'eggo' | 'coke' | 'quarter', tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });

const SPAWNS: SimSpawn[] = [
  // agents1: two patrols in corridor A, one along each side of the pillars.
  agent('agents1_a', 'agents1', 22, 34, [[22, 34], [28, 34]]),
  agent('agents1_b', 'agents1', 24, 36, [[24, 36], [19, 36]]),
  // rats1: six rats beside the cages, dormant until the cages beat.
  rat('rats1_a', 'rats1', 33, 14, true), rat('rats1_b', 'rats1', 38, 14, true), rat('rats1_c', 'rats1', 43, 14, true),
  rat('rats1_d', 'rats1', 44, 18, true), rat('rats1_e', 'rats1', 38, 16, true), rat('rats1_f', 'rats1', 33, 18, true),
  // agents2: two patrols in the animal lab hall, either side of the door1 doorway.
  agent('agents2_a', 'agents2', 33, 25, [[33, 25], [36, 25]]),
  agent('agents2_b', 'agents2', 45, 25, [[45, 25], [42, 25]]),
  // rats2: awake in the storage hall.
  rat('rats2_a', 'rats2', 22, 6), rat('rats2_b', 'rats2', 24, 9),
  // The lockdown: three waves, dormant in the records wing. The east end and the west end both feed them.
  agent('lock1_a', 'lock1', 44, 4, undefined, true), agent('lock1_b', 'lock1', 44, 9, undefined, true),
  rat('lock2_a', 'lock2', 32, 4, true), rat('lock2_b', 'lock2', 32, 9, true), rat('lock2_c', 'lock2', 33, 7, true),
  agent('lock2_d', 'lock2', 44, 6, undefined, true),
  agent('lock3_a', 'lock3', 32, 5, undefined, true), agent('lock3_b', 'lock3', 44, 5, undefined, true),
  agent('lock3_c', 'lock3', 44, 8, undefined, true),

  // Three Eggos: the closet off corridor A, the cold storage room, the storage hall before the crate.
  item('eggo1', 'eggo', 26, 28), item('eggo2', 'eggo', 4, 9), item('eggo3', 'eggo', 26, 6),
  // Two Cokes: the power room and the observation corridor.
  item('coke1', 'coke', 44, 36), item('coke2', 'coke', 21, 19),
  // Twelve quarters: a few on the way, the rest in the side rooms.
  item('q01', 'quarter', 2, 33), item('q02', 'quarter', 11, 36), item('q03', 'quarter', 16, 36),
  item('q04', 'quarter', 28, 36), item('q05', 'quarter', 24, 28), item('q06', 'quarter', 27, 29),
  item('q07', 'quarter', 33, 31), item('q08', 'quarter', 44, 23), item('q09', 'quarter', 44, 15),
  item('q10', 'quarter', 27, 17), item('q11', 'quarter', 9, 9), item('q12', 'quarter', 13, 3),

  // Props. A prop's tx, ty is its top-left tile; w and h are px. Both consoles sit in a wall face (a labwall tile),
  // so the floor in front stays free. The doors fill a two-tile doorway. The crate fills the three-tile corridor.
  { kind: 'prop', id: 'lights_dock', prop: 'lights', tx: 6, ty: 32, w: 48, h: 16 },
  { kind: 'prop', id: 'lights_hall', prop: 'lights', tx: 17, ty: 10, w: 48, h: 16 },
  { kind: 'prop', id: 'sensor1', prop: 'console', tx: 34, ty: 29, hitBy: 'burn' },
  { kind: 'prop', id: 'relay1', prop: 'console', tx: 23, ty: 12, hitBy: 'shoot' },
  { kind: 'prop', id: 'door1', prop: 'door', tx: 38, ty: 29, w: 32, h: 16 },
  { kind: 'prop', id: 'door2', prop: 'door', tx: 14, ty: 12, w: 32, h: 16 },
  { kind: 'prop', id: 'crate1', prop: 'crate', tx: 28, ty: 5, w: 16, h: 48, pushBy: 'push' },
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

export const WAVES = ['lock1', 'lock2', 'lock3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(3, 33, 3, 3) }, steps: [say('l2_start')] },
  { id: 'agents1', when: { rect: rect(14, 33, 2, 5) }, steps: [say('l2_agents')] },
  { id: 'burn_hint', when: { rect: rect(32, 31, 3, 6) }, steps: [say('l2_burn_hint')] },
  { id: 'door1_open', when: { event: 'targetHit', prop: 'sensor1' }, steps: [{ t: 'open', prop: 'door1' }, say('l2_burn_done')] },
  { id: 'agents2', when: { rect: rect(37, 24, 4, 3) }, steps: [] },
  { id: 'cages', when: { rect: rect(37, 20, 3, 2) }, steps: [say('l2_cages'), { t: 'wake', group: 'rats1' }] },
  { id: 'scare', when: { rect: rect(27, 16, 3, 4) }, steps: [{ t: 'scare' }, say('l2_scare')] },
  { id: 'relay_hint', when: { after: 'scare' }, steps: [say('l2_shoot_hint')] },
  { id: 'door2_open', when: { event: 'targetHit', prop: 'relay1' }, steps: [{ t: 'open', prop: 'door2' }, say('l2_relay_done')] },
  { id: 'rats2', when: { rect: rect(19, 5, 5, 5) }, steps: [] },
  { id: 'crate_hint', when: { rect: rect(24, 5, 3, 3), needs: 'door2_open' }, steps: [say('l2_push_hint')] },
  { id: 'crate_cleared', when: { event: 'propCleared', prop: 'crate1' }, steps: [say('l2_crate_cleared')] },
  { id: 'lockdown', when: { rect: rect(37, 4, 4, 6) }, steps: [{ t: 'alarm' }, say('l2_lockdown_start'), { t: 'waves' }] },
  { id: 'level_clear', when: { cleared: 'lock3' }, steps: [say('l2_lockdown_clear'), say('l2_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
const PUZZLES: PuzzleDef[] = [
  { id: 'burn', beat: 'burn_hint', prop: 'sensor1', hero: 'dustin' },
  { id: 'relay', beat: 'relay_hint', prop: 'relay1', hero: 'lucas' },
  { id: 'crate', beat: 'crate_hint', prop: 'crate1', hero: 'eleven' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // Dock, corridor A, the power room, door1.
  wp(9, 34), wp(15, 34), wp(21, 34), wp(29, 34), wp(34, 32), wp(38, 30, { open: 'door1' }),
  // The hall, the cage room (the rats wake at the doorway), out west into the observation corridor.
  wp(38, 26), wp(38, 21, { wake: 'rats1' }), wp(36, 18), wp(31, 18), wp(28, 16), wp(16, 16),
  // Up the passage to door2, then the storage hall and the crate.
  wp(15, 14), wp(15, 13, { open: 'door2' }), wp(15, 10), wp(20, 10), wp(25, 9), wp(25, 6), wp(27, 6, { open: 'crate1' }),
  // The records wing: the walk crosses the lockdown trigger on the way to the last waypoint, where lock1 wakes.
  wp(31, 6), wp(34, 5), wp(40, 5, { wake: 'lock1' }),
];

// ---------------------------------------------------------------- the stage
export const STAGE_12: StageData = {
  id: '1.2',
  name: 'Hawkins Lab',
  rows: ROWS,
  start: { x: px(4), y: fy(34) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: [],
  time: 'day',
  music: 'lab',
  checkpoints: [
    { prop: 'lights_dock', x: px(7), y: fy(33) },
    { prop: 'lights_hall', x: px(18), y: fy(9) },
  ],
  // A dark shape walks along the chamber behind the observation glass, east to west.
  scare: { from: { x: 476, y: 236 }, to: { x: 292, y: 232 }, frames: 96 },
  waypoints: WAYPOINTS,
};
