// Stage 3.2, the Russian base: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage32.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

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
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: { state?: 'open' | 'lit'; solid?: boolean; hitBy?: Utility } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  return p;
};

// ---------------------------------------------------------------- enemies
// 236 XP: five soldiers (60) and an elite one (24), seven melting rats (28), four Flayed (44) and Grigori (80). The spec's roster of
// eight soldiers and an elite was too hot in the first two rooms: soldiers fire from behind the crates, a burst always lands on a hero
// who never steps aside, and at that roster the careless bot died in the bay in 15 of 20 runs (the careful one took 129 of its 247
// damage there). So the bay has two soldiers, the hall one and an elite, the post two, and the lab's rats and Flayed carry more of the
// damage. Everything but the four Flayed and Grigori is awake and waits where it stands. The Flayed are puddles in the lab's two cells
// until the lab beat wakes them, and Grigori sleeps on the east side of the Key chamber, across the power box from the doors. The elite
// stands off to the east of the hall, out of the corridor's line: at the corridor's end it was a sniper on a two-tile lane.
const ENEMIES: SimSpawn[] = [
  // The loading bay: two soldiers among the crate stacks, east of the corridor mouth.
  foe('bay_a', 'soldier', 'bay', 26, 8, { dir: 'left' }), foe('bay_b', 'soldier', 'bay', 32, 4, { dir: 'left' }),
  // The hall past cipher1: a soldier at the lab end and the elite at the east end, both looking at the corridor's mouth.
  foe('hall_a', 'soldier', 'hall', 16, 20, { dir: 'right' }),
  foe('hall_elite', 'soldier', 'hall', 25, 22, { elite: true, dir: 'left' }),
  // The lab: melting rats among the cages, the Flayed asleep in the cells.
  foe('lab_m1', 'melter', 'lab', 8, 20), foe('lab_m2', 'melter', 'lab', 9, 23), foe('lab_m3', 'melter', 'lab', 6, 25),
  foe('lab_m4', 'melter', 'lab', 8, 27), foe('lab_m5', 'melter', 'lab', 9, 29), foe('lab_m6', 'melter', 'lab', 7, 32),
  foe('lab_m7', 'melter', 'lab', 5, 26),
  foe('lab_f1', 'flayed', 'lab', 3, 21, { dormant: true }), foe('lab_f2', 'flayed', 'lab', 4, 29, { dormant: true }),
  foe('lab_f3', 'flayed', 'lab', 5, 22, { dormant: true }), foe('lab_f4', 'flayed', 'lab', 3, 29, { dormant: true }),
  // The post: two soldiers on the control room's west side, looking back down the passage from the lab.
  foe('post_a', 'soldier', 'post', 22, 31, { dir: 'left' }), foe('post_b', 'soldier', 'post', 22, 35, { dir: 'left' }),
  // The Key chamber: Grigori, asleep, facing the doors.
  foe('grigori', 'grigori', 'boss', 40, 31, { dormant: true, dir: 'left' }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the barracks, the control room, the bay's far end and the lab's south-west corner), three Cokes and 12 quarters, three
// of them in the barracks behind cipher2. The bot skips the barracks.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 36, 17), item('eggo2', 'eggo', 24, 35), item('eggo3', 'eggo', 39, 10), item('eggo4', 'eggo', 3, 33),
  item('coke1', 'coke', 7, 5), item('coke2', 'coke', 27, 18), item('coke3', 'coke', 12, 33),
  item('q01', 'quarter', 5, 3), item('q02', 'quarter', 13, 10), item('q03', 'quarter', 20, 7), item('q04', 'quarter', 28, 6),
  item('q05', 'quarter', 33, 10), item('q06', 'quarter', 33, 17), item('q07', 'quarter', 38, 18), item('q08', 'quarter', 41, 19),
  item('q09', 'quarter', 15, 22), item('q10', 'quarter', 10, 22), item('q11', 'quarter', 20, 31), item('q12', 'quarter', 23, 33),
];

// ---------------------------------------------------------------- props
// The two cipher doors stand across a corridor (cipher1, 32 by 16) and a doorway (cipher2, 16 by 32). door1 and door2 are the chamber's
// two doorways, one tile deep on the chamber side: spawned open, shut by the grigori beat and opened again at the clear. The power box
// is the plate Grigori crosses on his way to the doors, and the breaker is in the north wall's cap row over the machine, with solid
// tiles all round it, so only a shot reaches it. The consoles are dressing in the wall faces.
const PROPS: SimSpawn[] = [
  lights('lights_lift', 4, 7), lights('lights_lab', 14, 24), lights('lights_control', 21, 36),
  prop('cipher1', 'cipher', 21, 14, 32, 16, { hitBy: 'read', solid: true }),
  prop('cipher2', 'cipher', 28, 19, 16, 32, { hitBy: 'read', solid: true }),
  prop('door1', 'door', 27, 35, 16, 32, { state: 'open', solid: false }),
  prop('door2', 'door', 27, 30, 16, 32, { state: 'open', solid: false }),
  prop('powerbox1', 'powerbox', 34, 30, 32, 32),
  prop('breaker1', 'breaker', 36, 24, 16, 16, { hitBy: 'shoot' }),
  prop('console1', 'console', 4, 17, 16, 16, { state: 'lit' }), prop('console2', 'console', 5, 17, 16, 16, { state: 'lit' }),
  prop('console3', 'console', 19, 28, 16, 16, { state: 'lit' }), prop('console4', 'console', 21, 28, 16, 16, { state: 'lit' }),
  prop('console5', 'console', 23, 28, 16, 16, { state: 'lit' }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// At night the lights props, lit, get pools on their own. These are the rest: the ceiling lamps over each room, the furnaces under the
// lab's grating, the consoles, and the machine's firebox, the brightest thing in the base.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The lift drop and the bay's lamps.
  lamp(5, 4, 44, 0.1), lamp(14, 4, 40, 0.3), lamp(20, 7, 44, 0.15), lamp(26, 3, 40, 0.45), lamp(32, 7, 44, 0.3), lamp(38, 7, 44, 0.15),
  // The corridor and the hall.
  lamp(21.5, 15, 32, 0.45), lamp(17, 20, 40, 0.3), lamp(24, 20, 40, 0.15),
  // The barracks.
  lamp(33, 17, 40, 0.3), lamp(39, 17, 40, 0.45),
  // The lab: furnace light through the grating.
  lamp(8, 21, 44, 0.3), lamp(8, 26, 48, 0.45), lamp(7, 31, 44, 0.3), lamp(4, 25, 30, 0.15),
  // The post and the control room.
  lamp(15, 31, 40, 0.3), lamp(20, 29, 32, 0.15), lamp(24, 29, 32, 0.45), lamp(22, 33, 44, 0.15),
  // The Key chamber: the machine, then a lamp at each corner of the floor.
  lamp(36.5, 26, 64, 0.1), lamp(30, 28, 44, 0.3), lamp(43, 28, 44, 0.45), lamp(30, 35, 44, 0.45), lamp(42, 35, 44, 0.3), lamp(36, 31, 48, 0.15),
];
