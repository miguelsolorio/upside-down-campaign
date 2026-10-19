// Stage 5.1, Hawkins under lockdown: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px (the footprint: an army prop's art stands on the bottom of
// it and may reach above). The map is in stage51.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; dir?: Dir; patrol?: [number, number][] }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.dir) e.dir = o.dir;
  if (o.patrol) e.patrol = o.patrol.map(([ptx, pty]) => ({ tx: ptx, ty: pty }));
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
interface Opts { state?: 'open'; solid?: boolean; hitBy?: Utility; pushBy?: Utility }
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: Opts = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  if (o.pushBy) p.pushBy = o.pushBy;
  return p;
};
/** An army prop that blocks: its footprint is solid (the sim leaves these kinds walkable unless the spawn says so). */
const wall = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number): SimSpawn => prop(id, kind, tx, ty, w, h, { solid: true });

// ---------------------------------------------------------------- enemies
// 308 XP before xpMult (docs/level-14.md, "Spawns and the XP budget"): eight troopers (18), six Lab agents (14) and the Commander (80). The
// squad he whistles up is run-time (1 XP each) and is not in the count. Demobats are left out: chapter 4 has not built them, and the spec
// puts three of them in `square`. A third trooper stands in `square` for the rifts until they do, and with the demobats in the budget
// still has room under 360 (tests/stage51.test.ts holds the band).
//   street      two troopers on patrol in the road, awake.
//   checkpoint  three troopers behind the sandbags east of the boom gate, asleep until the checkpoint beat.
//   square      a trooper and an agent in the west of the plaza, a trooper by the gap in the east, and a trooper and an agent on the
//               forecourt: the three clusters are more than a trooper's alert range (140 px) apart, so they are never one fight.
//   lab         two pairs of agents, one in the south corridor, one in the north corridor.
//   boss        the Commander, asleep in the bay until the commander beat.
const ENEMIES: SimSpawn[] = [
  foe('st_a', 'trooper', 'street', 12, 33, { dir: 'down', patrol: [[12, 33], [12, 35]] }),
  foe('st_b', 'trooper', 'street', 14, 35, { dir: 'up', patrol: [[14, 35], [14, 33]] }),
  foe('cp_a', 'trooper', 'checkpoint', 25, 33, { dormant: true, dir: 'left' }),
  foe('cp_b', 'trooper', 'checkpoint', 25, 35, { dormant: true, dir: 'left' }),
  foe('cp_c', 'trooper', 'checkpoint', 27, 34, { dormant: true, dir: 'left' }),
  foe('sq_a', 'trooper', 'square', 33, 31, { dir: 'left' }),
  foe('sq_b', 'agent5', 'square', 35, 34, { dir: 'left' }),
  foe('sq_c', 'trooper', 'square', 45, 31, { dir: 'down' }),
  foe('sq_d', 'trooper', 'square', 34, 21, { dir: 'left' }),
  foe('sq_e', 'agent5', 'square', 28, 23, { dir: 'right' }),
  foe('lab_a', 'agent5', 'lab', 11, 14, { dir: 'right' }),
  foe('lab_b', 'agent5', 'lab', 15, 15, { dir: 'right' }),
  foe('lab_c', 'agent5', 'lab', 12, 3, { dir: 'right' }),
  foe('lab_d', 'agent5', 'lab', 15, 4, { dir: 'right' }),
  foe('commander', 'commander', 'boss', 42, 9, { dormant: true, dir: 'left' }),
];

// ---------------------------------------------------------------- items
// Three Eggos (the cache behind crate1, the plaza, the south corridor), three Cokes (the street, the forecourt, the north corridor) and
// 12 quarters, two of them in the cache. The Eggos and Cokes outside the cache lie on the route, where a bot that is hurt or dry finds them.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 12, 9), item('eggo2', 'eggo', 23, 31), item('eggo3', 'eggo', 25, 14),
  item('coke1', 'coke', 8, 35), item('coke2', 'coke', 39, 23), item('coke3', 'coke', 17, 3),
  item('q01', 'quarter', 6, 33), item('q02', 'quarter', 7, 33), item('q03', 'quarter', 31, 36), item('q04', 'quarter', 29, 29),
  item('q05', 'quarter', 46, 33), item('q06', 'quarter', 37, 21), item('q07', 'quarter', 26, 24), item('q08', 'quarter', 3, 10),
  item('q09', 'quarter', 22, 8), item('q10', 'quarter', 44, 23), item('q11', 'quarter', 11, 8), item('q12', 'quarter', 14, 10),
];

// ---------------------------------------------------------------- props
// boom1 is the checkpoint's boom gate, a crack three tiles tall across the road (a crack 40 px or more long is drawn as one): roofs fill the
// sidewalks and the lawn either side of it, so the road is the only way east (and the bot's map, which knows tiles and cracks and not the
// army's props, sees no way round it). The booth and a barrier stand on the sidewalks in front of the roofs. crate1 is the crate jammed in the cache's neck,
// two tiles wide in the south corridor's north wall. door1 is the bay's doorway in the partition: spawned open, shut by the commander beat.
// The towers stand on the sidewalk at the north edge of what they light, their cones falling south.
const PROPS: SimSpawn[] = [
  lights('lights_street', 2, 32), lights('lights_square', 43, 28), lights('lights_lab', 21, 2),
  prop('boom1', 'crack', 19, 33, 16, 48, { hitBy: 'smash', solid: true }),
  prop('crate1', 'crate', 12, 12, 32, 16, { pushBy: 'push' }),
  prop('door1', 'door', 28, 3, 16, 32, { state: 'open', solid: false }),
  // The checkpoint.
  wall('booth1', 'booth', 16, 32, 32, 16), wall('barrier1', 'barrier', 16, 36, 32, 16),
  wall('bags1', 'sandbags', 22, 33, 32, 16), wall('bags2', 'sandbags', 22, 35, 32, 16), wall('bags3', 'sandbags', 20, 32, 16, 16),
  // Main Street.
  prop('curfew1', 'curfew', 8, 32, 16, 16),
  wall('truck1', 'truck', 9, 36, 64, 32), wall('barricade1', 'barricade', 5, 36, 32, 16), wall('bags4', 'sandbags', 13, 36, 32, 16),
  wall('tower1', 'tower', 14, 32, 16, 16),
  // The town square.
  wall('tower2', 'tower', 21, 28, 16, 16), wall('tower3', 'tower', 34, 28, 16, 16), wall('tower4', 'tower', 47, 28, 16, 16),
  prop('curfew2', 'curfew', 30, 28, 16, 16),
  wall('bags5', 'sandbags', 31, 31, 32, 16), wall('bags6', 'sandbags', 40, 31, 32, 16), wall('barricade2', 'barricade', 27, 33, 32, 16),
  wall('truck2', 'truck', 44, 35, 64, 32), wall('tent1', 'tent', 38, 36, 48, 32),
  // The forecourt.
  wall('tower5', 'tower', 30, 18, 16, 16), wall('tower6', 'tower', 42, 18, 16, 16),
  wall('bags7', 'sandbags', 28, 20, 32, 16), wall('bags8', 'sandbags', 41, 24, 32, 16), wall('barricade3', 'barricade', 33, 24, 32, 16),
  wall('truck3', 'truck', 35, 24, 64, 32), wall('tent2', 'tent', 46, 19, 48, 32),
  wall('bags9', 'sandbags', 25, 18, 32, 16), wall('barrier2', 'barrier', 21, 21, 16, 16),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// The lit strings and the towers make their own pools. These are the rest: the streetlamps and the booth's lamp, the red glow of each rift,
// the gate's lamp, the Lab's bulbs along its halls and the work lights of the bay. `lamp` takes a tile, which may be halfway between two,
// and puts the pool on its center.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // Main Street: a streetlamp over the road, one dying one, and the booth's lamp.
  lamp(8, 34, 44, 0.1), lamp(12, 36, 36, 0.45), lamp(17, 34, 40, 0.2),
  // The rifts glow red.
  lamp(28, 30, 40, 0.3), lamp(37, 32, 40, 0.3), lamp(42, 35, 40, 0.3), lamp(34, 20, 40, 0.3),
  // The plaza and the forecourt: the lamp over the gate, a failing one over the square.
  lamp(23, 17, 44, 0.1), lamp(26, 31, 36, 0.45), lamp(44, 22, 40, 0.2),
  // The halls: bulbs over the south corridor, the west connector, the north corridor and the store, and the cache's cold light.
  lamp(8, 14, 40, 0.3), lamp(18, 14, 40, 0.45), lamp(3, 9, 40, 0.3), lamp(8, 3, 40, 0.45), lamp(14, 3, 40, 0.3), lamp(22, 8, 36, 0.3), lamp(12.5, 9, 40, 0.1),
  // The loading bay: work lights along the north wall and over the doorway.
  lamp(30, 3, 36, 0.1), lamp(37, 3, 44, 0.3), lamp(44, 3, 44, 0.45), lamp(33, 12, 40, 0.3), lamp(45, 11, 40, 0.3),
];
