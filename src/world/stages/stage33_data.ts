// Stage 3.3, the Starcourt food court: who and what stands where. Enemies, items, props, Hopper and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage33.ts.
import type { Burrow, Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; elite?: boolean; dir?: Dir }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.elite) e.tier = 'elite';
  if (o.dir) e.dir = o.dir;
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: { state?: 'open'; solid?: boolean; hitBy?: Utility; pushBy?: Utility } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  if (o.pushBy) p.pushBy = o.pushBy;
  return p;
};

// ---------------------------------------------------------------- enemies
// 278 XP before xpMult: five melting rats (20), five Flayed (55), three more rats and a Flayed on the balcony (23),
// Billy (60) and the Mind Flayer (120, its four legs pay nothing). The Flayed Billy calls and the waves the Mind Flayer sends are
// run-time spawns at 1 XP each and are not in the count. The kitchen's rats are awake among the fryers. The crowd is five puddles in
// the concourse's goo until the concourse beat wakes them, the balcony's rats and Flayed are dormant in its goo until the balcony beat,
// and Billy and the Mind Flayer sleep in the court. The body stands in the solid stall row of the north wall and its four legs are
// rooted one row below, spread along its front (tests/flayer-helpers.ts has the same layout in miniature).
const ENEMIES: SimSpawn[] = [
  // The kitchens: melting rats among the fryer lines and the counters.
  foe('kit_a', 'melter', 'kitchen', 16, 31), foe('kit_b', 'melter', 'kitchen', 21, 28), foe('kit_c', 'melter', 'kitchen', 25, 32),
  foe('kit_d', 'melter', 'kitchen', 28, 31), foe('kit_e', 'melter', 'kitchen', 23, 36),
  // The lower concourse: a Flayed crowd asleep in the goo patches. It had an elite, which wiped a party that doesn't dodge before the
  // fight at the factor the stage needs (docs/level-9.md, "Result").
  foe('crowd_a', 'flayed', 'crowd', 44, 24, { dormant: true }), foe('crowd_b', 'flayed', 'crowd', 45, 26, { dormant: true }),
  foe('crowd_c', 'flayed', 'crowd', 38, 28, { dormant: true }), foe('crowd_d', 'flayed', 'crowd', 43, 33, { dormant: true }),
  foe('crowd_e', 'flayed', 'crowd', 46, 23, { dormant: true }),
  // The balcony: three melting rats and a Flayed in the goo of the lower lane, west of the beat.
  foe('bal_a', 'melter', 'balcony', 31, 13, { dormant: true }), foe('bal_b', 'melter', 'balcony', 29, 11, { dormant: true }),
  foe('bal_c', 'melter', 'balcony', 27, 13, { dormant: true }), foe('bal_f', 'flayed', 'balcony', 30, 12, { dormant: true }),
  // The court: Billy asleep on its west side, the Mind Flayer on the north wall.
  foe('billy', 'billy', 'boss', 7, 10, { dormant: true, dir: 'right' }),
  foe('flayer', 'flayer', 'flayer', 12, 2, { dormant: true, dir: 'down' }),
  foe('leg1', 'flayerleg', 'flayer', 7, 3, { dormant: true, dir: 'down' }), foe('leg2', 'flayerleg', 'flayer', 10, 3, { dormant: true, dir: 'down' }),
  foe('leg3', 'flayerleg', 'flayer', 14, 3, { dormant: true, dir: 'down' }), foe('leg4', 'flayerleg', 'flayer', 17, 3, { dormant: true, dir: 'down' }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the freezer, the stockroom, the balcony's top lane and the concourse's south end), three Cokes and 12 quarters, three of
// them in the freezer behind crack1, which the bot leaves shut. Nothing in the court.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 20, 21), item('eggo2', 'eggo', 5, 21), item('eggo3', 'eggo', 43, 3), item('eggo4', 'eggo', 40, 36),
  item('coke1', 'coke', 10, 34), item('coke2', 'coke', 30, 30), item('coke3', 'coke', 44, 12),
  item('q01', 'quarter', 9, 32), item('q02', 'quarter', 4, 35), item('q03', 'quarter', 4, 22), item('q04', 'quarter', 7, 22),
  item('q05', 'quarter', 14, 33), item('q06', 'quarter', 26, 30), item('q07', 'quarter', 17, 21), item('q08', 'quarter', 22, 23),
  item('q09', 'quarter', 46, 31), item('q10', 'quarter', 36, 35), item('q11', 'quarter', 44, 13), item('q12', 'quarter', 33, 4),
];

// ---------------------------------------------------------------- props
// crack1 shuts the freezer's neck in the kitchen's north wall (32 by 16). crate1 is the toppled kiosk across the escalators' top, two
// tiles wide between the rails. door1 and door2 are the court's two doorways in its east wall, one tile deep on the court side: spawned
// open, shut by the billy beat and opened again at the clear. Hopper stands by the lift, and the beat that ends his speech sends him away.
const PROPS: SimSpawn[] = [
  lights('lights_hall', 4, 33), lights('lights_concourse', 34, 23), lights('lights_balcony', 25, 10),
  prop('crack1', 'crack', 19, 26, 32, 16, { hitBy: 'smash', solid: true }),
  prop('crate1', 'crate', 40, 15, 32, 16, { pushBy: 'push' }),
  prop('door1', 'door', 24, 12, 16, 32, { state: 'open', solid: false }),
  prop('door2', 'door', 24, 6, 16, 32, { state: 'open', solid: false }),
];

const NPCS: SimSpawn[] = [{ kind: 'npc', id: 'hopper', tx: 4, ty: 29, dir: 'down' }];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS, ...NPCS];

/** Where the Flayed that Billy and the Mind Flayer call come up: one at each side of the court, level with its middle. */
export const BURROWS: Burrow[] = [{ tx: 3, ty: 10 }, { tx: 22, ty: 10 }];

// ---------------------------------------------------------------- the pools of light
// At night the lights props, lit, get pools on their own. These are the rest: the bulbs in the service hall and the kitchens, the freezer's
// cold light, the neon over the concourse's shop fronts and the balcony's, the exit signs over the court's two doors, the menu boards on
// the stalls and the moon through the skylight, the widest pool in the stage. `lamp` takes a tile, which may be halfway between two,
// and puts the pool on its center.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The service hall: the lift's lamp, and bulbs over the boxes. The stockroom's.
  lamp(3, 28, 44, 0.1), lamp(8, 28, 40, 0.3), lamp(8, 34, 40, 0.45), lamp(5, 21, 36, 0.3),
  // The kitchens: a glow at each fryer line, the heat lamps over the counters.
  lamp(17, 30, 40, 0.45), lamp(25, 30, 40, 0.45), lamp(18, 34, 40, 0.3), lamp(27, 34, 40, 0.15), lamp(14, 28, 32, 0.3),
  // The freezer: one cold light, one failing.
  lamp(20, 21, 44, 0.1), lamp(17, 23, 32, 0.45),
  // The lower concourse: neon over the shop fronts, the escalators' light, and the exit sign over the doorway to the kitchens.
  lamp(34, 21, 36, 0.3), lamp(37, 21, 36, 0.45), lamp(44, 21, 36, 0.3), lamp(40.5, 18, 40, 0.15), lamp(32, 34, 32, 0.15),
  lamp(37, 29, 40, 0.3), lamp(42, 27, 40, 0.45), lamp(41, 34, 40, 0.3),
  // The balcony: the island's shop fronts, the north wall's, and the west lane by the windows.
  lamp(33, 9, 40, 0.3), lamp(38, 9, 40, 0.45), lamp(43, 9, 40, 0.3), lamp(31, 1, 40, 0.3), lamp(37, 1, 40, 0.45), lamp(43, 1, 40, 0.3),
  lamp(26, 6, 36, 0.3), lamp(27, 12, 40, 0.45), lamp(40, 12, 36, 0.15),
  // The court: the exit signs over its doors, the menu boards on the stalls, then the moon through the skylight.
  lamp(24, 6, 28, 0.05), lamp(24, 12, 28, 0.05), lamp(4, 2, 44, 0.3), lamp(8, 2, 44, 0.45), lamp(16, 2, 44, 0.3), lamp(20, 2, 44, 0.45),
  lamp(5, 10, 36, 0.3), lamp(12.5, 9.5, 64, 0.1),
];
