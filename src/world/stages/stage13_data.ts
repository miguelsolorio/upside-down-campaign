// Stage 1.3, Hawkins Middle School: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage13.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn } from '../../core/types.ts';

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
const prop = (id: string, kind: PropKind, tx: number, ty: number, o: { w?: number; h?: number; solid?: boolean } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty };
  if (o.w !== undefined) { p.w = o.w; p.h = o.h ?? 16; }
  if (o.solid !== undefined) p.solid = o.solid;
  return p;
};

// ---------------------------------------------------------------- enemies
// 140 XP: five agents (40), an elite agent (16), six rats (24) and the boss (60), which the stage's xpMult makes 101. The lot
// and the hall are awake and pace; the science room's agent too. The rats wait in the strip behind the serving counter, the
// boss in the gym.
const ENEMIES: SimSpawn[] = [
  // The lot: two agents by the vans, a long way from the start.
  foe('lot_a', 'agent', 'lot', 13, 34, { patrol: [[13, 34], [10, 36]] }),
  foe('lot_b', 'agent', 'lot', 17, 34, { patrol: [[17, 34], [17, 37]] }),
  // The main hall: two agents, and an elite agent at the far end, where the hall turns up into the science room.
  foe('hall_a', 'agent', 'agents1', 30, 36, { patrol: [[30, 36], [34, 37]] }),
  foe('hall_b', 'agent', 'agents1', 34, 35, { patrol: [[34, 35], [38, 36]] }),
  foe('hall_c', 'agent', 'agents1', 38, 37, { patrol: [[38, 37], [44, 36]], elite: true }),
  // The science room: one agent in the aisle between the desks.
  foe('sci_a', 'agent', 'sci', 33, 30, { patrol: [[33, 30], [38, 30]] }),
  // The cafeteria: six rats in the strip behind the counter. The doorway beat wakes them.
  foe('rats1_a', 'rat', 'rats1', 26, 18, { dormant: true }),
  foe('rats1_b', 'rat', 'rats1', 27, 18, { dormant: true }),
  foe('rats1_c', 'rat', 'rats1', 28, 18, { dormant: true }),
  foe('rats1_d', 'rat', 'rats1', 29, 18, { dormant: true }),
  foe('rats1_e', 'rat', 'rats1', 30, 18, { dormant: true }),
  foe('rats1_f', 'rat', 'rats1', 31, 18, { dormant: true }),
  // The gym: the Demogorgon, in front of the wall that splits. The `demogorgon` beat wakes it.
  foe('demo', 'demogorgon', 'boss', 32, 8, { dormant: true, dir: 'right' }),
];

// ---------------------------------------------------------------- items
// Three Eggos (the hall's far corner, the cafeteria's north-east corner, the gym's east side before the arena), two Cokes
// and ten quarters. Nothing worth a detour lies on the near side of a gate from the far one: the bot would walk into it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 45, 38), item('eggo2', 'eggo', 46, 18), item('eggo3', 'eggo', 46, 9),
  item('coke1', 'coke', 42, 27), item('coke2', 'coke', 38, 18),
  item('q01', 'quarter', 2, 31), item('q02', 'quarter', 9, 38), item('q03', 'quarter', 19, 31),
  item('q04', 'quarter', 28, 34), item('q05', 'quarter', 35, 34), item('q06', 'quarter', 43, 34),
  item('q07', 'quarter', 28, 32), item('q08', 'quarter', 44, 23), item('q09', 'quarter', 33, 19), item('q10', 'quarter', 31, 14),
];

// ---------------------------------------------------------------- props
const PROPS: SimSpawn[] = [
  // Checkpoints: the lot, the hall before the science room, the gym's doors.
  prop('lights_lot', 'lights', 5, 33, { w: 48 }),
  prop('lights_hall', 'lights', 37, 35, { w: 48 }),
  prop('lights_gym', 'lights', 40, 15, { w: 48 }),
  // The four gates. van1 is parked across the side door in the lot's east wall, vines1 fills the science room's back door,
  // door1 the cafeteria's north doorway. firebox1 hangs on the wall face behind the serving counter.
  { kind: 'prop', id: 'van1', prop: 'van', tx: 18, ty: 35, pushBy: 'push' },
  { kind: 'prop', id: 'vines1', prop: 'vines', tx: 24, ty: 26, w: 32, h: 16, hitBy: 'burn', solid: true },
  { kind: 'prop', id: 'firebox1', prop: 'firebox', tx: 27, ty: 17, hitBy: 'shoot' },
  prop('door1', 'door', 44, 17, { w: 32 }),
  // Dressing in the lot: a second van and the bike rack.
  prop('van2', 'van', 14, 31),
  prop('bike1', 'bike', 3, 31, { solid: true }), prop('bike2', 'bike', 4, 31, { solid: true }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// At night the lot's lamps, the school's lit windows and the lights props get pools on their own. These are the rest: the
// lot's three lamps, a vending machine glow and the exit signs in the hall, and the heat lamp over the serving counter.
const T = 16;
export const LIGHTS: LightSource[] = [
  { x: 6 * T + 8, y: 32 * T + 4, r: 56, flicker: 0.2 },
  { x: 11 * T + 8, y: 37 * T + 4, r: 52, flicker: 0.3 },
  { x: 19 * T + 8, y: 33 * T + 4, r: 56, flicker: 0.15 },
  { x: 30 * T, y: 34 * T + 8, r: 30, flicker: 0.6 },
  { x: 41 * T, y: 33 * T + 8, r: 22, flicker: 0.1 },
  { x: 28 * T + 8, y: 19 * T + 4, r: 34, flicker: 0.3 },
  { x: 45 * T, y: 16 * T + 8, r: 22, flicker: 0.1 },
];
