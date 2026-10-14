// Stage 1.1, Mirkwood. Pure data: no DOM, so Node tests can import it.
//
// The route is a snake. South band: the Byers yard (south-west), the trail east, the first bend where the rats
// wake, a turn north through the agent clearing to the creek. The gate1 planks cross it. North band: the scare
// bend, the dump clearing, west along the trail to the shed (Eleven), the log, the forest bend, then east along
// the Lab road to the van. Coordinates are tiles. The scare path and the static lights are in px.
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
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 0
   'TTTTTTTTTTTTTTTTTtTTTTTTTXXXXXXXXXXXXXXXXXXXXXXT', // 1
   'TTTTTTTTT....,.b..,T,.,..ggggggggggggggggggggggT', // 2
   'TTTTTTTTT,---------------======================T', // 3
   'TTTTTTTTT.---------------______________________T', // 4
   'TTTTTTTTT.---------------======================T', // 5
   'TTTTTTTTTT---T..T...r..,,ggggggggggggggggggggggT', // 6
   'TTTTTTTTTT---T,......bbT.ggggggggggggggggggggggT', // 7
   'TTTTsssssT---TTTTTTTtTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 8
   'TTTTsssss.---,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTtTTTT', // 9
   'TTTTS:::S,---.TT....,.k,...TT.......,.,.b.,tTTTT', // 10
   'TTTT,----------------------------------,...TTTTT', // 11
   'TTTT.----------------------------------...,TTTTT', // 12
   'TTT,.----------------------------------...bTTtTT', // 13
   'TTTb,,...........rr...,r..,,........---....TTTTT', // 14
   'TTT.....,,.,.TTr....k,b.rb..TTTTT..,---.b.TTTTtT', // 15
   'TTTTT..,.b,TTTTT..........,TTTTTT...---...TTTTTT', // 16
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTwwwpppwwwwTTTTT', // 17
   'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ppp~~~~~~~~T', // 18
   'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ppp~~~~~~~~T', // 19
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTtTTTTFFFpppFFFFTTTTT', // 20
   'TTTTTTTTTTTTTTTtTTTTTTTTTTTTTTTT...,---..TTTTTTT', // 21
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,.,.---,.bTtTTTT', // 22
   'TTTTTTTTTTTTTTTTTTtTTTTTTTTTTT.....,---..,....TT', // 23
   'TTTTTTTTTTTTTTTTTTTTTTTTTtTTTt.,,r,.---.b..b..TT', // 24
   'TTTTTTTTTTTtTTTTTTTTTTTTTTTTTt.,....---.,TT..,TT', // 25
   'TThhhhhhhTTTTTTTTTTTTTtTTTTTTTTTTTT.---.TTT.b.TT', // 26
   'TThhhhhhhTTTTTT,.,..TTT...,.....,,,.---.TTtTTTTT', // 27
   'TTHHHdHHHFFFFTT,.,.bTTT,---------------.TTTTTTTT', // 28
   'T.......f,,,.FT..b..TT..---------------.TTTTTTTT', // 29
   'T.,.,......,,FT..,.kTr.,---------------,TTTTTTTT', // 30
   'T.....,.,....Fm...,.,..,---...,.,.,.....TTTTTTTT', // 31
   'Tf..,.....,.,--------------.,..TTTTTTTTTTTTTtTTT', // 32
   'T.,f,....,.,,--------------....TTTTTTTTTTTTTTTTT', // 33
   'T,..,..,.,.f.--------------,,..TTTTtTTTTTTTTtTTT', // 34
   'T.,.....,...lF,.,..,.T........TTtTTTTTTTTTTTTTTT', // 35
   'T.....f,.....FTTTTTTTTT..b.,.TTTTTTTTTTTTTTTTTTT', // 36
   'TFFFFFFFFFFFFTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 37
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtTTTTTTTTTTTTTT', // 38
   'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
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
  // rats1: dormant at the first bend until tut_attack. Four rats.
  rat('rats1_a', 'rats1', 26, 31, true), rat('rats1_b', 'rats1', 28, 34, true),
  rat('rats1_c', 'rats1', 24, 29, true), rat('rats1_d', 'rats1', 29, 31, true),
  // agents1: two patrols in the clearing south of the creek.
  agent('agents1_a', 'agents1', 32, 22, [[32, 22], [40, 22]]),
  agent('agents1_b', 'agents1', 34, 24, [[34, 24], [39, 24]]),
  // rats2: awake in the dump clearing. Four rats.
  rat('rats2_a', 'rats2', 19, 10), rat('rats2_b', 'rats2', 21, 14), rat('rats2_c', 'rats2', 24, 12), rat('rats2_d', 'rats2', 23, 16),
  // agents2: three patrols in the forest bend.
  agent('agents2_a', 'agents2', 18, 3, [[18, 3], [23, 3]]),
  agent('agents2_b', 'agents2', 22, 5, [[22, 5], [16, 5]]),
  agent('agents2_c', 'agents2', 17, 7, [[17, 7], [17, 2]]),
  // The ambush: three waves of three, dormant on the Lab road.
  agent('ambush1_a', 'ambush1', 33, 3, undefined, true), agent('ambush1_b', 'ambush1', 34, 5, undefined, true),
  agent('ambush1_c', 'ambush1', 36, 4, undefined, true),
  agent('ambush2_a', 'ambush2', 40, 6, undefined, true), agent('ambush2_b', 'ambush2', 38, 5, undefined, true),
  agent('ambush2_c', 'ambush2', 41, 2, undefined, true),
  agent('ambush3_a', 'ambush3', 29, 6, undefined, true), agent('ambush3_b', 'ambush3', 28, 2, undefined, true),
  agent('ambush3_c', 'ambush3', 30, 4, undefined, true),

  // Four Eggos: the pocket off the first trail, the agent clearing, the shed, the forest bend.
  item('eggo1', 'eggo', 16, 29), item('eggo2', 'eggo', 32, 23), item('eggo3', 'eggo', 7, 10), item('eggo4', 'eggo', 20, 7),
  // Two Cokes: the east nook and the dump clearing.
  item('coke1', 'coke', 45, 24), item('coke2', 'coke', 16, 15),
  // Twelve quarters, a few on the trail and the rest in side nooks.
  item('q01', 'quarter', 3, 34), item('q02', 'quarter', 10, 31), item('q03', 'quarter', 17, 33),
  item('q04', 'quarter', 17, 28), item('q05', 'quarter', 18, 29), item('q06', 'quarter', 29, 32),
  item('q07', 'quarter', 34, 23), item('q08', 'quarter', 44, 25), item('q09', 'quarter', 39, 10),
  item('q10', 'quarter', 41, 10), item('q11', 'quarter', 19, 15), item('q12', 'quarter', 15, 7),

  // Props. A prop's tx, ty is its top-left tile; w and h are px.
  { kind: 'prop', id: 'lights_yard', prop: 'lights', tx: 6, ty: 30, w: 48, h: 16 },
  { kind: 'prop', id: 'lights_shed', prop: 'lights', tx: 7, ty: 15, w: 48, h: 16 },
  { kind: 'prop', id: 'target1', prop: 'target', tx: 40, ty: 16, w: 32, h: 16, hitBy: 'shoot' },
  { kind: 'prop', id: 'gate1', prop: 'gate', tx: 36, ty: 20, w: 48, h: 16 },
  { kind: 'prop', id: 'log1', prop: 'log', tx: 10, ty: 7, w: 48, h: 16, pushBy: 'push' },
  { kind: 'prop', id: 'bike', prop: 'bike', tx: 3, ty: 30, solid: true },
  { kind: 'prop', id: 'sign1', prop: 'sign', tx: 14, ty: 35, solid: true },
  { kind: 'prop', id: 'van', prop: 'van', tx: 43, ty: 3 },
  { kind: 'prop', id: 'flood1', prop: 'floodlight', tx: 31, ty: 6, state: 'open' },
  { kind: 'prop', id: 'flood2', prop: 'floodlight', tx: 39, ty: 2, state: 'open' },

  { kind: 'npc', id: 'joyce', tx: 5, ty: 29, dir: 'down' },
  { kind: 'npc', id: 'eleven', tx: 6, ty: 10, dir: 'down' },
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

export const WAVES = ['ambush1', 'ambush2', 'ambush3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(6, 32, 3, 3) }, steps: [say('l1_start')] },
  { id: 'tut_attack', when: { rect: rect(18, 32, 2, 3) }, steps: [say('l1_tut_attack'), { t: 'wake', group: 'rats1' }] },
  { id: 'tut_special', when: { cleared: 'rats1' }, steps: [say('l1_tut_special')] },
  { id: 'tut_swap', when: { after: 'tut_special' }, steps: [say('l1_tut_swap')] },
  { id: 'agents1', when: { rect: rect(30, 28, 3, 3) }, steps: [say('l1_agents')] },
  { id: 'gate_lucas', when: { rect: rect(35, 21, 5, 2) }, steps: [say('l1_gate_hint')] },
  { id: 'gate_open', when: { event: 'targetHit', prop: 'target1' }, steps: [{ t: 'open', prop: 'gate1' }, say('l1_gate_open')] },
  { id: 'scare', when: { rect: rect(36, 14, 3, 2) }, steps: [{ t: 'scare' }, say('l1_scare')] },
  { id: 'rats2', when: { rect: rect(28, 11, 2, 3) }, steps: [] },
  {
    id: 'eleven_meet', when: { rect: rect(4, 11, 5, 2) },
    steps: [say('l1_eleven_meet'), { t: 'recruit', hero: 'eleven' }, say('l1_eleven_join')],
  },
  { id: 'push_gate', when: { rect: rect(10, 8, 3, 3), needs: 'eleven_meet' }, steps: [say('l1_push_hint')] },
  { id: 'log_cleared', when: { event: 'propCleared', prop: 'log1' }, steps: [say('l1_log_cleared')] },
  { id: 'agents2', when: { rect: rect(10, 4, 3, 2) }, steps: [] },
  { id: 'ambush', when: { rect: rect(25, 2, 2, 6) }, steps: [say('l1_ambush_start'), { t: 'waves' }] },
  { id: 'level_clear', when: { cleared: 'ambush3' }, steps: [say('l1_ambush_clear'), say('l1_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
const PUZZLES: PuzzleDef[] = [
  { id: 'gate', beat: 'gate_lucas', prop: 'target1', hero: 'lucas' },
  { id: 'log', beat: 'push_gate', prop: 'log1', hero: 'eleven' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { open?: string; wake?: string } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  wp(8, 33), wp(16, 33), wp(19, 33, { wake: 'rats1' }), wp(25, 33), wp(25, 29), wp(31, 29), wp(37, 29), wp(37, 25),
  wp(37, 22), wp(37, 21, { open: 'gate1' }), wp(37, 18), wp(37, 13),
  wp(30, 12), wp(22, 12), wp(14, 12), wp(6, 12), wp(11, 10, { open: 'log1' }),
  wp(11, 5), wp(18, 4), wp(25, 4), wp(27, 4, { wake: 'ambush1' }), wp(34, 4), wp(40, 5),
];

// ---------------------------------------------------------------- the stage
export const STAGE_11: StageData = {
  id: '1.1',
  name: 'Mirkwood',
  rows: ROWS,
  start: { x: px(7), y: fy(32) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: [
    { x: px(12), y: 35 * T + 4, r: 56, flicker: 0.25 },
    { x: px(5), y: 29 * T + 4, r: 44, flicker: 0.1 },
  ],
  time: 'night',
  music: 'mirkwood',
  checkpoints: [
    { prop: 'lights_yard', x: px(7), y: fy(31) },
    { prop: 'lights_shed', x: px(8), y: fy(14) },
  ],
  scare: { from: { x: 680, y: 204 }, to: { x: 520, y: 220 }, frames: 90 },
  waypoints: WAYPOINTS,
};
