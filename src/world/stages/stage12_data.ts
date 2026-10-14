// Stage 1.2, Hawkins Lab: who and what stands where. Spawns, the floor hazards and the camera sweeps. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage12.ts.
import type { CamDef, Dir, EnemyKind, HazardDef, ItemKind, PropKind, SimSpawn } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { patrol?: [number, number][]; dormant?: boolean; elite?: boolean; dir?: Dir }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.patrol) e.patrol = o.patrol.map(([x, y]) => ({ tx: x, ty: y }));
  if (o.elite) e.tier = 'elite';
  if (o.dir) e.dir = o.dir;
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const prop = (id: string, kind: PropKind, tx: number, ty: number, w?: number, h?: number): SimSpawn =>
  w === undefined ? { kind: 'prop', id, prop: kind, tx, ty } : { kind: 'prop', id, prop: kind, tx, ty, w, h: h ?? 16 };
const camera = (id: string, tx: number, ty: number, cam: CamDef): SimSpawn => ({ kind: 'prop', id, prop: 'camera', tx, ty, hitBy: 'shoot', cam });

// ---------------------------------------------------------------- the cameras
// Each sits in a wall and sweeps the floor below or in front of it. Range and half angle are kept small enough
// that a tile five steps out along a diagonal is out of reach, so Lucas can shoot each one from where it can't see him.
export const CAMS: { cam1: CamDef; cam2: CamDef; cam3: CamDef } = {
  // Corridor A, two heads on the north wall, sweeping out of step with each other.
  cam1: { from: 40, to: 140, period: 300, range: 96, half: 28 },
  cam2: { from: 140, to: 40, period: 300, range: 96, half: 28 },
  // The observation corridor, on the south wall, looking up at the glass.
  cam3: { from: 215, to: 325, period: 260, range: 96, half: 30 },
};

// ---------------------------------------------------------------- the hazards
// Every hazard sits on plate tiles, and every plate is a hazard. The power room's panels arc for 36 of every 180 frames,
// the grates and drains vent for 36 to 50 of every 180 or 200, and the records wing's cracked panels arc for 45 of every
// 150 and hit hardest. Neighbours run out of step, so a careful party crosses one and then the next untouched.
export const HAZARDS: HazardDef[] = [
  // The power room: a panel across the way in, and one in front of door1 and the sensor.
  { id: 'arc1', kind: 'electric', tx: 33, ty: 31, w: 2, h: 4, period: 180, on: 36, phase: 0, dmg: 14 },
  { id: 'arc2', kind: 'electric', tx: 41, ty: 32, w: 4, h: 2, period: 180, on: 36, phase: 90, dmg: 14 },
  // The animal lab hall: the drains between door1 and the cages.
  { id: 'drain1', kind: 'steam', tx: 37, ty: 24, w: 4, h: 2, period: 200, on: 36, phase: 0, dmg: 9 },
  // The observation corridor: two grates across the whole corridor.
  { id: 'steam1', kind: 'steam', tx: 26, ty: 17, w: 2, h: 5, period: 200, on: 50, phase: 30, dmg: 9 },
  { id: 'steam2', kind: 'steam', tx: 19, ty: 17, w: 2, h: 5, period: 200, on: 50, phase: 130, dmg: 9 },
  // The storage hall: a burst line in the south lane's cross aisle, in sight of the first guard.
  { id: 'steam3', kind: 'steam', tx: 17, ty: 9, w: 2, h: 3, period: 180, on: 36, phase: 90, dmg: 9 },
  // The records wing: the growth has cracked the main feed. Panels at both ends of the middle aisle and across the
  // doorway hit hardest; the two at the Warden's end a little less. None is a spike: a mistimed step costs a quarter of
  // a hero, so the fights here are won by the enemies, not by a coin toss on the floor.
  { id: 'arc3', kind: 'electric', tx: 37, ty: 3, w: 3, h: 2, period: 150, on: 45, phase: 20, dmg: 16 },
  { id: 'arc4', kind: 'electric', tx: 37, ty: 9, w: 3, h: 3, period: 150, on: 45, phase: 95, dmg: 16 },
  { id: 'arc5', kind: 'electric', tx: 42, ty: 5, w: 2, h: 4, period: 150, on: 45, phase: 55, dmg: 14 },
  { id: 'arc6', kind: 'electric', tx: 45, ty: 5, w: 2, h: 4, period: 150, on: 45, phase: 5, dmg: 14 },
  { id: 'arc7', kind: 'electric', tx: 33, ty: 5, w: 2, h: 3, period: 150, on: 45, phase: 130, dmg: 16 },
];

// ---------------------------------------------------------------- enemies
const ENEMIES: SimSpawn[] = [
  // Corridor A: two agents pace the lane under the cameras. A camera that sees the party lets an elite rat out of the floor vent.
  foe('agents1_a', 'agent', 'agents1', 23, 34, { patrol: [[23, 34], [26, 33], [22, 33]] }),
  foe('agents1_b', 'agent', 'agents1', 18, 34, { patrol: [[18, 34], [21, 33], [17, 33]] }),
  foe('reinf1_a', 'rat', 'reinf1', 20, 36, { dormant: true, elite: true }),
  // The power room: an agent paces the generators, and an elite agent waits in the vent by the far wall for the second
  // camera's call.
  foe('power_a', 'agent', 'power', 38, 34, { patrol: [[38, 34], [42, 34]] }),
  foe('reinf2_a', 'agent', 'reinf2', 45, 40, { dormant: true, elite: true }),
  // The animal lab: six rats wait behind the cages, and a riot guard walks the lower hall the party comes into.
  foe('rats1_a', 'rat', 'rats1', 32, 18, { dormant: true }),
  foe('rats1_b', 'rat', 'rats1', 45, 22, { dormant: true }),
  foe('rats1_c', 'rat', 'rats1', 36, 19, { dormant: true }),
  foe('rats1_d', 'rat', 'rats1', 38, 22, { dormant: true }),
  foe('rats1_e', 'rat', 'rats1', 41, 20, { dormant: true }),
  foe('rats1_f', 'rat', 'rats1', 44, 21, { dormant: true }),
  foe('lab_guard', 'guard', 'labguard', 33, 26, { patrol: [[33, 26], [38, 26]], dir: 'right' }),
  // The observation corridor: an agent covers the west end, and an elite agent in the server room comes out if the third
  // camera sees the party.
  foe('obs_a', 'agent', 'obs', 9, 18, { patrol: [[9, 18], [14, 20]] }),
  foe('reinf3_a', 'agent', 'reinf3', 27, 27, { dormant: true, elite: true }),
  // The storage hall: two riot guards facing the way the party comes in, and an agent that shoots over their shoulders.
  foe('guard1', 'guard', 'guards1', 24, 10, { dir: 'left' }),
  foe('guard2', 'guard', 'guards1', 25, 6, { dir: 'left' }),
  foe('stor_a', 'agent', 'stor', 14, 8, { patrol: [[14, 8], [20, 8]] }),
  // The lockdown, from both ends of the wing. lock1 is three rats and an agent out of the vents; lock2 a guard at the
  // party's back, a second at the far end and an elite agent, at once; lock3 the Warden from the far end with an elite
  // agent behind the party.
  foe('lock1_a', 'rat', 'lock1', 33, 10, { dormant: true }),
  foe('lock1_b', 'rat', 'lock1', 34, 9, { dormant: true }),
  foe('lock1_c', 'rat', 'lock1', 34, 11, { dormant: true }),
  foe('lock1_d', 'agent', 'lock1', 36, 8, { dormant: true }),
  foe('lock2_a', 'guard', 'lock2', 30, 4, { dormant: true, dir: 'right' }),
  foe('lock2_c', 'guard', 'lock2', 43, 10, { dormant: true, elite: true, dir: 'left' }),
  foe('lock2_b', 'agent', 'lock2', 45, 6, { dormant: true, elite: true }),
  foe('warden', 'warden', 'lock3', 45, 7, { dormant: true, dir: 'left' }),
  foe('lock3_b', 'agent', 'lock3', 33, 4, { dormant: true, elite: true }),
];

// ---------------------------------------------------------------- items
const ITEMS: SimSpawn[] = [
  // Four Eggos: by the loading door, in the tank room, and two in the far corners of the records wing for the lockdown.
  // Nothing lies within a pickup's reach of the route on the far side of a shut gate: the bot would walk into the gate.
  item('eggo1', 'eggo', 14, 36), item('eggo2', 'eggo', 31, 22), item('eggo3', 'eggo', 40, 3), item('eggo4', 'eggo', 35, 3),
  // Two Cokes: the gap in the cage row and the server room.
  item('coke1', 'coke', 40, 17), item('coke2', 'coke', 8, 24),
  // Twelve quarters, most of them off the straight line.
  item('q01', 'quarter', 2, 33), item('q02', 'quarter', 12, 38), item('q03', 'quarter', 15, 31), item('q04', 'quarter', 26, 31),
  item('q05', 'quarter', 44, 39), item('q06', 'quarter', 30, 32), item('q07', 'quarter', 33, 27), item('q08', 'quarter', 35, 17),
  item('q09', 'quarter', 4, 21), item('q10', 'quarter', 28, 25), item('q11', 'quarter', 5, 3), item('q12', 'quarter', 43, 11),
];

// ---------------------------------------------------------------- props
const PROPS: SimSpawn[] = [
  // Checkpoints: the dock, just past door2, and the vestibule before the records wing.
  prop('lights_dock', 'lights', 9, 33, 48, 16),
  prop('lights_hall', 'lights', 6, 11, 48, 16),
  prop('lights_records', 'lights', 29, 9, 48, 16),
  // The three gates. Both consoles sit in a wall face. The doors fill two-tile doorways, the crate the corridor.
  { kind: 'prop', id: 'sensor1', prop: 'console', tx: 41, ty: 30, hitBy: 'burn' },
  { kind: 'prop', id: 'relay1', prop: 'console', tx: 23, ty: 13, hitBy: 'shoot' },
  prop('door1', 'door', 43, 30, 32, 16),
  prop('door2', 'door', 4, 12, 32, 16),
  { kind: 'prop', id: 'crate1', prop: 'crate', tx: 28, ty: 5, w: 16, h: 48, pushBy: 'push' },
  // Cameras in the walls.
  camera('cam1', 16, 30, CAMS.cam1),
  camera('cam2', 25, 30, CAMS.cam2),
  camera('cam3', 24, 22, CAMS.cam3),
  // The dock: the van on the road and crates by the door.
  prop('van', 'van', 6, 39),
  prop('dock_crate1', 'crate', 10, 36), prop('dock_crate2', 'crate', 11, 36),
  // The power room's generators, two tiles square.
  prop('gen1', 'generator', 30, 36, 32, 32), prop('gen2', 'generator', 44, 34, 32, 32), prop('gen3', 'generator', 36, 38, 32, 32),
  prop('gen4', 'generator', 40, 36, 32, 32),
  // Specimen tanks in the animal lab, one tile wide and two tall.
  prop('tank1', 'tank', 33, 19, 16, 32), prop('tank2', 'tank', 34, 19, 16, 32),
  prop('tank3', 'tank', 42, 19, 16, 32), prop('tank4', 'tank', 43, 19, 16, 32),
  prop('tank5', 'tank', 32, 24, 16, 32), prop('tank6', 'tank', 45, 24, 16, 32),
  // Server racks against the server room's north wall.
  prop('rack1', 'rack', 19, 24, 16, 32), prop('rack2', 'rack', 20, 24, 16, 32),
  prop('rack3', 'rack', 24, 24, 16, 32), prop('rack4', 'rack', 25, 24, 16, 32),
  prop('rack5', 'rack', 10, 24, 16, 32), prop('rack6', 'rack', 11, 24, 16, 32), prop('rack7', 'rack', 14, 24, 16, 32),
  // Crates in the storage hall lanes.
  prop('store_crate1', 'crate', 12, 3), prop('store_crate2', 'crate', 13, 3), prop('store_crate3', 'crate', 6, 7),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];
