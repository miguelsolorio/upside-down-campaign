// Stage 1.2, Hawkins Lab. Pure data: no DOM, so Node tests can import it. Spawns, hazards and cameras are in stage12_data.ts.
//
// The route is a snake in three bands. South band, going east: the loading dock (outdoors, south-west), corridor A
// with its lockers and two cameras, and the power room, where Dustin burns sensor1 between arcing panels to open door1.
// Middle band, going west: the animal lab (the hall with its drains, a wall of cages, the tank room), then the long
// observation corridor with its glass wall and steam grates, where Lucas shoots relay1 through the glass. The server
// room hangs off the corridor's south side, its door at the west end. door2 is at the corridor's west end. North band,
// going east: the storage hall (shelf islands, two riot guards, the checkpoint just past door2), the crate corridor
// Eleven clears, the vestibule with the third lights, and the records wing, where the lockdown brings the Warden over a
// floor of cracked panels. Vines and growth thicken toward the wing. Coordinates are tiles. The scare path is in px.
// Walls are a labcap row over a labwall row facing the room below.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { HAZARDS, SPAWNS } from './stage12_data.ts';

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
   'VVVWWWYWWWWWWWMYWWWWWYWWMWWVVYWWVWYWWWMWWYWWMMWV', // 2
   'VVVUUoooooooooooooxooooooUUVVooUVeeeeEEEeeUUeUMV', // 3
   'VVVooooooxooooooooooooxoooUVVoooVeeCCEEEeeeeCUMV', // 4
   'VVVoNNNNoooNNNNooooNNNNooooooooozEEeeeeeeeEEUEEV', // 5
   'VVVooooooooooooooooooooooooooooozEEeeeeeeCEEeEEV', // 6
   'VVVooooooooxoooooooooxoooooooooozEEeeeeeeCEEeEEV', // 7
   'VVVooooooooooooooooooooooooVVoooVeeeeeeeeeEEeEEV', // 8
   'VVVoxoooooooooxooEEooooooooVVoooVeeCCEEEeeeeCeeV', // 9
   'VVVUoooxoooooooooEEoooooxooVVVVVVeeeeEEEeeeeeUMV', // 10
   'VVVUoooooUoooooooEEooooooooVVVVVVeeeeEEEeeeeUMMV', // 11
   'VVVVzzVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 12
   'VVVVooVVVVVVVVVVVWWWWWWWWWWWWWVVVVVVVVVVVVVVVVVV', // 13
   'VVVVooVVVVVVVVVVVOOOOOOOOOOOOOVVVVVVVVVVVVVVVVVV', // 14
   'VVVVooVVVVVVVVVVVOOOOOOOOOOOOOVVVVVVVVVVVVVVVVVV', // 15
   'VVVVooWWWYWWWWWWWGGGGGGGGGGGGGVWWWWWYWWWWWWWMMMV', // 16
   'VVVVUUOOBOOOOBOOOBOEEOBOBOEEOOVccccacccaacccaMMV', // 17
   'VVVVUOOOOOOOOOOOOOOEEOOOOOEEOOzaaaaaaaaaaaaaUUMV', // 18
   'VVVVOOxOOOOOOOOOOOOEEOOOOOEEOOzaaaaaaaaaaxaaaUcV', // 19
   'VVVVOOOOOOOxOOOOOOOEEOOOOOEEOOzaaaaaDaaaaaaaUacV', // 20
   'VVVVOOOOOOOOOOOOOOOEEOOOOOEEOOVaxaaaaaaaDaaUaUcV', // 21
   'VVVVVVzzVVVVVVVVVVVVVVVVVVVVVVVaaaaaaaaaaaaaUacV', // 22
   'VVVVVVzzWWWWWWWWWWWWWWWWWWWWWVVccccccaaaaccccccV', // 23
   'VVVVVVOOOOOOOOOOOOOOOOOOOOOOOVVaaaaaaEEEEaaaaaaV', // 24
   'VVVVVVOOOOOOOOOOOOOOOOOOOOOOOVVaaaaxaEEEEaaaaDaV', // 25
   'VVVVVVqqqqqqqqqqqqqqqqqqqqqqqVVaaDaaaaaaaaDaaaaV', // 26
   'VVVVVVOOOBBOOOOOOBBOOBBOOOOvBVVaaaaaaaaaaaaaaaaV', // 27
   'TVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVzzVVV', // 28
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVzzVVV', // 29
   'TTTTTTTTTTTTTVWWWWWWWWWWWWWWVWiWWWWiWWWWWWWzzWWV', // 30
   'TXXXXXXXXXXXXVLoooLLLooLoooLVOOooEEOoqxOOOooOOiV', // 31
   'TlgggggggggglVozzzzzzzzzzzzoVoxOOEEoOqOooEEEEoiV', // 32
   'TggggggggggggVooooooLooooooozqqqqEEqqqqqqEEEEqiV', // 33
   'TggggggggggxgzooxoooLooooooozooOOEEoxqOOooOOOoiV', // 34
   'TggggggggggggzozzzzzzzzzzzzoVOOOooOOOqoxOOOooOiV', // 35
   'TggggggggggggVoLLoLovoLLoooLVooxOOOooqOOooxOOOiV', // 36
   'TggggggggxgggVVVVVVVVVVVVVVVVOOOooxOOqooOOOooxiV', // 37
   'TlgggggggggggVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqiV', // 38
   'T============VVVVVVVVVVVVVVVVxOOOooOOqooxOOOooiV', // 39
   'T____________VVVVVVVVVVVVVVVVOooxOOOoqOOOooxOviV', // 40
   'T============VVVVVVVVVVVVVVVViiiiooxOqOoCCCOooiV', // 41
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 42
   'TTTTTTTTTTTTTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', // 43
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });
/** A camera that sees the party sounds the klaxon and lets its reinforcements out. */
const spotted = (cam: string, group: string): Beat =>
  ({ id: `${cam}_spotted`, when: { event: 'spotted', prop: cam }, steps: [{ t: 'alarm' }, { t: 'wake', group }, say('l2_spotted')] });

export const WAVES = ['lock1', 'lock2', 'lock3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(3, 34, 3, 3) }, steps: [say('l2_start')] },
  { id: 'agents1', when: { rect: rect(14, 31, 2, 6) }, steps: [say('l2_agents')] },
  spotted('cam1', 'reinf1'),
  spotted('cam2', 'reinf2'),
  { id: 'burn_hint', when: { rect: rect(39, 31, 6, 3) }, steps: [say('l2_burn_hint')] },
  { id: 'door1_open', when: { event: 'targetHit', prop: 'sensor1' }, steps: [{ t: 'open', prop: 'door1' }, say('l2_burn_done')] },
  { id: 'cages', when: { rect: rect(41, 26, 5, 2) }, steps: [say('l2_cages'), { t: 'wake', group: 'rats1' }] },
  { id: 'scare', when: { rect: rect(27, 17, 3, 5) }, steps: [{ t: 'scare' }, say('l2_scare')] },
  { id: 'relay_hint', when: { after: 'scare' }, steps: [say('l2_shoot_hint')] },
  spotted('cam3', 'reinf3'),
  { id: 'door2_open', when: { event: 'targetHit', prop: 'relay1' }, steps: [{ t: 'open', prop: 'door2' }, say('l2_relay_done')] },
  { id: 'guards', when: { rect: rect(3, 9, 5, 3), needs: 'door2_open' }, steps: [say('l2_guards')] },
  { id: 'crate_hint', when: { rect: rect(24, 5, 3, 3), needs: 'door2_open' }, steps: [say('l2_push_hint')] },
  { id: 'crate_cleared', when: { event: 'propCleared', prop: 'crate1' }, steps: [say('l2_crate_cleared')] },
  { id: 'lockdown', when: { rect: rect(36, 3, 3, 9) }, steps: [{ t: 'alarm' }, say('l2_lockdown_start'), { t: 'waves' }] },
  { id: 'warden', when: { cleared: 'lock2' }, steps: [say('l2_warden')] },
  { id: 'level_clear', when: { cleared: 'lock3' }, steps: [say('l2_lockdown_clear'), say('l2_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
const PUZZLES: PuzzleDef[] = [
  { id: 'burn', beat: 'burn_hint', prop: 'sensor1', hero: 'dustin', blocks: ['door1'] },
  { id: 'relay', beat: 'relay_hint', prop: 'relay1', hero: 'lucas', blocks: ['door2'] },
  { id: 'crate', beat: 'crate_hint', prop: 'crate1', hero: 'eleven' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The dock, corridor A under both cameras, the power room across the first panel, door1.
  wp(9, 35), wp(14, 35), wp(18, 35), wp(23, 35), wp(27, 34), wp(31, 34), wp(38, 32), wp(43, 31, { open: 'door1' }),
  // The animal lab hall, the cage wall (the rats wake at the gap), the tank room, out west.
  wp(43, 27, { wake: 'rats1' }), wp(40, 26), wp(38, 23), wp(37, 18), wp(31, 18),
  // The observation corridor past both grates and the camera, then up the passage to door2.
  wp(28, 19), wp(23, 19), wp(17, 19), wp(10, 19), wp(5, 17), wp(5, 13, { open: 'door2' }),
  // The storage hall's south lane past the guards, then the crate.
  wp(5, 10), wp(10, 10), wp(16, 10), wp(21, 10), wp(25, 9), wp(25, 6), wp(27, 6, { open: 'crate1' }),
  // The vestibule and the records wing: the last waypoint is inside the lockdown trigger.
  wp(30, 6), wp(35, 6), wp(37, 6, { wake: 'lock1' }),
];

// ---------------------------------------------------------------- the stage
export const STAGE_12: StageData = {
  id: '1.2',
  name: 'Hawkins Lab',
  rows: ROWS,
  start: { x: px(4), y: fy(36) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: [],
  time: 'day',
  music: 'lab',
  checkpoints: [
    { prop: 'lights_dock', x: px(10), y: fy(34) },
    { prop: 'lights_hall', x: px(7), y: fy(10) },
    { prop: 'lights_records', x: px(30), y: fy(8) },
  ],
  // A dark shape walks along the chamber behind the observation glass, east to west.
  scare: { from: { x: 468, y: 248 }, to: { x: 292, y: 244 }, frames: 96 },
  hazards: HAZARDS,
  // The Lab's enemies are better trained than the woods': 30 percent more HP and 30 percent harder hits than the
  // difficulty setting alone gives. Measured with a bot that never dodges, this is what keeps the Lab dangerous on chief.
  enemyMult: 1.3,
  waypoints: WAYPOINTS,
};
