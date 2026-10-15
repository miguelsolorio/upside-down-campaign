// Stage 3.1, Starcourt Mall: who and what stands where. Enemies, items, props, Erica and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage31.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { patrol?: [number, number][]; dormant?: boolean; elite?: boolean; hidden?: boolean; dir?: Dir }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.patrol) e.patrol = o.patrol.map(([x, y]) => ({ tx: x, ty: y }));
  if (o.elite) e.tier = 'elite';
  if (o.hidden) e.hidden = true;
  if (o.dir) e.dir = o.dir;
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const prop = (id: string, kind: PropKind, tx: number, ty: number, o: { w?: number; h?: number; solid?: boolean } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty };
  if (o.w !== undefined) { p.w = o.w; p.h = o.h ?? 16; }
  if (o.solid !== undefined) p.solid = o.solid;
  return p;
};

// ---------------------------------------------------------------- enemies
// Up to 207 XP: 21 melting rats (84), seven Flayed, two of them elite (99), and two soldiers (24). The spec's roster comes to about 290 XP, well over the cap of
// 210, so the groups are thinner and the Flayed took the cut: the bot kites a Flayed (0.55 px a frame) without being touched, where the
// melting rats and the soldiers are what hurt it. The vent rats and the crowd are awake and wait where they are. The court and the
// three waves sleep: the court wakes at the doorway beat, and its Flayed rise out of the goo corner. A dormant melting rat is not
// drawn, a dormant Flayed is a puddle.
const ENEMIES: SimSpawn[] = [
  // The west concourse: melting rats out of the vent, east of Scoops Ahoy's doorway and short of the shutter.
  foe('vent_a', 'melter', 'vent', 17, 35), foe('vent_b', 'melter', 'vent', 19, 34), foe('vent_c', 'melter', 'vent', 20, 36),
  foe('vent_d', 'melter', 'vent', 22, 36), foe('vent_e', 'melter', 'vent', 19, 37),
  // The court: asleep in the goo corner, in the north-east, a long way from the doorway the party comes in by.
  foe('court_f1', 'flayed', 'court', 34, 16, { dormant: true }), foe('court_f2', 'flayed', 'court', 35, 18, { dormant: true }),
  foe('court_m1', 'melter', 'court', 33, 17, { dormant: true }), foe('court_m2', 'melter', 'court', 35, 16, { dormant: true }),
  foe('court_m3', 'melter', 'court', 36, 17, { dormant: true }), foe('court_m4', 'melter', 'court', 34, 18, { dormant: true }),
  // The east concourse: a Flayed crowd, shambling in the goo patches, an elite at the far end by the service door.
  foe('crowd_a', 'flayed', 'crowd', 46, 22), foe('crowd_elite', 'flayed', 'crowd', 46, 18, { elite: true }),
  // The service corridor: two soldiers at its west end, looking back down the way the party comes.
  foe('door_a', 'soldier', 'door', 24, 11, { dir: 'right' }), foe('door_b', 'soldier', 'door', 22, 12, { dir: 'right' }),
  // The loading dock: three waves asleep in the goo, east of the trigger, each woken by the one before.
  foe('amb1_a', 'flayed', 'amb1', 39, 3, { dormant: true }),
  foe('amb1_c', 'melter', 'amb1', 38, 6, { dormant: true }), foe('amb1_d', 'melter', 'amb1', 40, 5, { dormant: true }),
  foe('amb1_e', 'melter', 'amb1', 39, 7, { dormant: true }), foe('amb1_f', 'melter', 'amb1', 37, 4, { dormant: true }),
  foe('amb2_a', 'flayed', 'amb2', 41, 7, { dormant: true }),
  foe('amb2_c', 'melter', 'amb2', 42, 3, { dormant: true }), foe('amb2_d', 'melter', 'amb2', 43, 5, { dormant: true }),
  foe('amb2_e', 'melter', 'amb2', 41, 4, { dormant: true }), foe('amb2_f', 'melter', 'amb2', 45, 6, { dormant: true }),
  foe('amb3_elite', 'flayed', 'amb3', 44, 6, { dormant: true, elite: true }),
  foe('amb3_c', 'melter', 'amb3', 43, 7, { dormant: true }), foe('amb3_d', 'melter', 'amb3', 44, 3, { dormant: true }),
  foe('amb3_e', 'melter', 'amb3', 40, 7, { dormant: true }), foe('amb3_f', 'melter', 'amb3', 42, 7, { dormant: true }),
];

// ---------------------------------------------------------------- items
// Three Eggos (the back room, the side shop, the corridor before the dock), two Cokes and fourteen quarters, six of them in the two
// caches. The caches are behind crack1 and crate1, which the bot leaves shut.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 18, 21), item('eggo2', 'eggo', 40, 20), item('eggo3', 'eggo', 28, 3),
  item('coke1', 'coke', 26, 35), item('coke2', 'coke', 21, 7),
  item('q01', 'quarter', 7, 35), item('q02', 'quarter', 14, 36), item('q03', 'quarter', 24, 36), item('q04', 'quarter', 13, 21),
  item('q05', 'quarter', 14, 21), item('q06', 'quarter', 16, 22), item('q07', 'quarter', 24, 20), item('q08', 'quarter', 34, 24),
  item('q09', 'quarter', 39, 19), item('q10', 'quarter', 41, 21), item('q11', 'quarter', 40, 22), item('q12', 'quarter', 45, 18),
  item('q13', 'quarter', 38, 10), item('q14', 'quarter', 24, 3),
];

// ---------------------------------------------------------------- props
const PROPS: SimSpawn[] = [
  // Checkpoints: the lobby, the passage into the court (before the court's doorway beat), the east concourse's north end.
  prop('lights_entry', 'lights', 3, 34, { w: 48 }),
  prop('lights_court', 'lights', 21, 31, { w: 48 }),
  prop('lights_service', 'lights', 43, 14, { w: 48 }),
  // shutter1 closes the mouth in the concourse's north wall. panel1 hangs on the wall face beside it: a shot lights it, and so does
  // anyone's basic attack from up close (smash), so the route never waits on a hero who is benched.
  { kind: 'prop', id: 'shutter1', prop: 'shutter', tx: 21, ty: 33, w: 48, h: 16, solid: true },
  { kind: 'prop', id: 'panel1', prop: 'firebox', tx: 20, ty: 33, hitBy: 'shoot', smash: true },
  // The back room's door, behind the Scoops Ahoy counter, and the side shop's door in the exit corridor's north wall.
  { kind: 'prop', id: 'crack1', prop: 'crack', tx: 14, ty: 24, w: 32, h: 16, hitBy: 'smash', solid: true },
  { kind: 'prop', id: 'crate1', prop: 'crate', tx: 39, ty: 24, w: 32, h: 16, pushBy: 'push' },
  // Dressing: the mall directory by the entrance. It is not solid.
  prop('directory', 'sign', 7, 33),
];

// Erica minds the Scoops Ahoy counter and will not be left out of anything.
const NPCS: SimSpawn[] = [{ kind: 'npc', id: 'erica', tx: 13, ty: 27, dir: 'down' }];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS, ...NPCS];

// ---------------------------------------------------------------- the pools of light
// At night the lights props, lit, get pools on their own. These are the rest: the neon over each lit shop front, the fountain, the
// glass doors and the dock doors (the exit signs), the lift, and the bulbs in the service corridor. `lamp` takes a tile, which may be
// halfway between two, and puts the pool on its center.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The lobby's glass doors, and the neon on the west concourse's shop fronts.
  lamp(5, 31, 48, 0.05), lamp(11, 33, 40, 0.15), lamp(18.5, 33, 36, 0.3), lamp(25.5, 33, 36, 0.45),
  // Scoops Ahoy: the pink neon over the counter, and the back room's bulb.
  lamp(13, 26, 44, 0.15), lamp(17, 29, 40, 0.3), lamp(15, 21, 30, 0.45),
  // The court: the shop fronts on its north wall and the fountain in the middle.
  lamp(23, 14, 40, 0.3), lamp(27, 14, 40, 0.15), lamp(34, 14, 40, 0.45), lamp(28.5, 21, 64, 0.1),
  // The east concourse.
  lamp(44.5, 25, 36, 0.3), lamp(44.5, 19, 36, 0.45),
  // The service corridor, bulb by bulb.
  lamp(26, 11, 38, 0.45), lamp(32, 11, 38, 0.3), lamp(38, 11, 38, 0.45), lamp(22, 7, 34, 0.3), lamp(25, 3, 38, 0.45), lamp(29, 3, 34, 0.3),
  // The loading dock: a pool at each pair of dock doors, one over the goo, and the lift's.
  lamp(34, 2, 44, 0.45), lamp(39, 2, 44, 0.3), lamp(43, 2, 44, 0.45), lamp(38, 5, 48, 0.3), lamp(43, 6, 48, 0.45), lamp(45.5, 3, 52, 0.15),
];
