// Stage 2.2, the tunnels under Hawkins, at night. Pure data: no DOM, so Node tests can import it. Spawns, items, props and the
// pools of light are in stage22_data.ts.
//
// The route is a long S, in rooms joined by halls two tiles wide. North band: the drop (north-west), where the hole from 2.1 comes
// down in a shaft of daylight, and the root halls, which wind east above the nest, back west, down, west again and east along the
// hall gap1 crosses. Then the nest, a chamber of three lanes divided by walls of nest, with pods rooted along them, and the
// junction, with a dead end north that crack1 shuts (the cache) and the way on east. Down the east side: a hall that runs south
// with gap2 across it, a bend, and the long hall west with gap3 across it and a pack in its bulge. A chamber on the west side where
// another pack waits, a corridor east, and the hub (south-east): a big cavern cut by three barriers of nest that the way winds
// round, where the ambush comes up at the far end by the ladder. The roots thicken to veins as the route goes: plain roots at the
// drop, veins by the nest, veins everywhere in the hub. Coordinates are tiles. Walls are a tunnelcap row (2) over a tunnelwall row
// (3) facing the floor below, like the Lab.
import type { BotWaypoint } from '../../combat/bot.ts';
import type { Beat, BeatStep, PuzzleDef, StageData, TileRect } from '../types.ts';
import { LIGHTS, SPAWNS } from './stage22_data.ts';

const T = 16;
/** Pixel x of a tile center, and the feet y for an actor standing on a tile. */
const px = (tx: number): number => tx * T + 8;
const fy = (ty: number): number => ty * T + 12;
const rect = (tx: number, ty: number, w: number, h: number): TileRect => ({ tx, ty, w, h });

export const ROWS: string[] = [
  //0         1         2         3         4
  //012345678901234567890123456789012345678901234567
   '222222222222222222222222222222222222222222222222', // 0
   '222222222222222222332222222222222222222222222222', // 1
   '223333333333222222112222222222222222222222222222', // 2
   '221444441411333333163333333333333322222222222222', // 3
   '221414441141441141114111115514111122233333332222', // 4
   '224444441111111111141511144551114422241141112222', // 5
   '221411411444222222222222222222221122216615442222', // 6
   '224444114111222233333333333333331422214541512222', // 7
   '221444441114222245554514141114151122241544512222', // 8
   '224444414111222214111551111111114122214114642222', // 9
   '222222222222222211222222222222222222222452222222', // 10
   '222233333333333311222222666666666666333113322222', // 11
   '222251115111111411222222651145145455414145122222', // 12
   '222211155151114111222222654511511515414111622222', // 13
   '222211222261222222222222611666666666211115133322', // 14
   '222211222211222222222222651411114516211115411122', // 15
   '222211222222222222222222655511114546211444111422', // 16
   '222211333333333333333333666666666146216111424122', // 17
   '222211111111155111111151154514511546215114121122', // 18
   '222211111111155151111155441554414516222222224122', // 19
   '222222222222222222222222666666666666222222221122', // 20
   '222233333322222222222222222222222222222222224122', // 21
   '222251415122222222222222222222222222222222331132', // 22
   '222244455122222222233323333332222222222226514512', // 23
   '222246151133333333311464141143333333333331114112', // 24
   '222244141111111114114111541451111114111111414112', // 25
   '222241114514111111111111111451111111151144541142', // 26
   '222215414622222222211611564552222222222224451562', // 27
   '222211441422222222222222222222222222222222222222', // 28
   '222246111122222222333333233333333333233333333332', // 29
   '222215411522222222415115655455115555654555151112', // 30
   '222254115122222222456554615455515555611511555552', // 31
   '222221422222222222455154644541654451645564454152', // 32
   '222221133333333333111551645455611111651154415412', // 33
   '222221151511411141545515655411611515651455164152', // 34
   '222222211415411154454455645544651415651555511152', // 35
   '222222222222222222454151555151655111551561545772', // 36
   '222222222222222222555655545151611515511115551772', // 37
   '222222222222222222222222222222222222222222222222', // 38
   '222222222222222222222222222222222222222222222222', // 39
];

// ---------------------------------------------------------------- beats
const say = (script: string): BeatStep => ({ t: 'say', script });

export const WAVES = ['amb1', 'amb2', 'amb3'];

const BEATS: Beat[] = [
  { id: 'start', when: { rect: rect(2, 4, 5, 4) }, steps: [say('l5_start')] },
  { id: 'crew', when: { rect: rect(10, 4, 3, 2) }, steps: [say('l5_crew')] },
  { id: 'gap_hint', when: { rect: rect(16, 18, 3, 2) }, steps: [say('l5_gap_hint')] },
  { id: 'gap_crossed', when: { event: 'propCleared', prop: 'gap1' }, steps: [say('l5_gap_done')] },
  { id: 'nest', when: { rect: rect(24, 18, 2, 2) }, steps: [say('l5_nest')] },
  { id: 'crack_hint', when: { rect: rect(38, 12, 4, 2) }, steps: [say('l5_crack_hint')] },
  { id: 'crack_open', when: { event: 'propCleared', prop: 'crack1' }, steps: [say('l5_crack_done')] },
  { id: 'dart', when: { rect: rect(38, 25, 3, 2) }, steps: [say('l5_dart')] },
  { id: 'hub', when: { rect: rect(18, 34, 3, 2) }, steps: [say('l5_hub')] },
  { id: 'ambush', when: { rect: rect(37, 30, 4, 8) }, steps: [say('l5_ambush'), { t: 'waves' }] },
  { id: 'level_clear', when: { cleared: 'amb3' }, steps: [say('l5_clear'), { t: 'finish' }] },
];

// ---------------------------------------------------------------- puzzles
// Only gap1 and crack1 are puzzles. gap2 and gap3 are the same drop again: Max crosses them without being told. A puzzle whose
// hero is not in the party never shows its hint (world/puzzles.ts), so with Steve benched the cache stays shut and nothing nags.
const PUZZLES: PuzzleDef[] = [
  { id: 'gap', beat: 'gap_hint', prop: 'gap1', hero: 'max', hint: 'MAYBE MAX SHOULD TRY HER SKATE DASH' },
  { id: 'crack', beat: 'crack_hint', prop: 'crack1', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT' },
];

// ---------------------------------------------------------------- bot
const wp = (tx: number, ty: number, flags: { dash?: true } = {}): BotWaypoint => ({ x: px(tx), y: fy(ty), ...flags });

const WAYPOINTS: BotWaypoint[] = [
  // The drop, east out of it along the root halls, which switch back: east above the nest, down, west again, down, west, down,
  // then east along the hall gap1 crosses.
  // Each dash waypoint is three tiles short of its gap, in line with the next waypoint, so the roll runs straight over it.
  wp(9, 5), wp(14, 5), wp(30, 5), wp(33, 7), wp(30, 9), wp(18, 9), wp(17, 11), wp(16, 12), wp(10, 13), wp(5, 13), wp(5, 16), wp(8, 18), wp(13, 18), wp(17, 18, { dash: true }), wp(23, 18),
  // The nest's three lanes: east along the bottom, west along the middle, east along the top. Then the junction: the bot walks past
  // the dead end, so crack1 stays shut.
  wp(29, 19), wp(34, 19), wp(34, 16), wp(30, 16), wp(25, 16), wp(25, 13), wp(30, 13), wp(34, 13), wp(36, 13), wp(40, 14), wp(43, 15),
  // Down the east hall and over gap2, round the bend and west along the long hall, over gap3 and past the bulge's pack.
  wp(44, 16), wp(44, 18, { dash: true }), wp(44, 23), wp(41, 25), wp(36, 25, { dash: true }), wp(30, 25), wp(24, 25),
  // The west chamber's pack, the corridor east, and the hub: round the three barriers to the ambush trigger at the far end.
  wp(12, 25), wp(7, 26), wp(6, 31), wp(6, 34), wp(12, 34), wp(22, 34), wp(23, 36), wp(26, 36), wp(28, 31), wp(32, 31), wp(35, 36), wp(38, 36), wp(38, 34),
];

// ---------------------------------------------------------------- the stage
export const STAGE_22: StageData = {
  id: '2.2',
  name: 'The tunnels',
  rows: ROWS,
  start: { x: px(4), y: fy(5) },
  spawns: SPAWNS,
  beats: BEATS,
  puzzles: PUZZLES,
  waves: WAVES,
  lights: LIGHTS,
  time: 'night',
  music: 'upside',
  checkpoints: [
    { prop: 'lights_drop', x: px(6), y: fy(7) },
    { prop: 'lights_nest', x: px(26), y: fy(18) },
    { prop: 'lights_hub', x: px(20), y: fy(35) },
  ],
  // This stage has no scare. The beats never ask for one.
  scare: { from: { x: px(10), y: fy(3) }, to: { x: px(10), y: fy(3) }, frames: 1 },
  // The chapter 2 enemies carry their own numbers for a Lv 5 party (enemies/defs.ts), so this is a little over the spec's 1. Measured
  // with node scripts/measure-stage.ts 2.2 chief 20 [--careless]: chief clears 18 of 20 (90 of 100, none stuck) for about 250 damage,
  // 1.6 KOs and 101 s, careless 19, kid 20, upside 8. The damage is demodog bites. A Max who is down cannot cross gap3, so the
  // gaps all come before the packs the bot fights as Max.
  enemyMult: 1.25,
  // XP factor for the campaign's pace (docs/pace.md), set with node scripts/measure-campaign.ts.
  xpMult: 1.5,
  waypoints: WAYPOINTS,
};
