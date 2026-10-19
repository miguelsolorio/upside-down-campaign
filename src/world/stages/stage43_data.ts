// Stage 4.3, Upside Down Hawkins: who and what stands where. Enemies, items, props, the pools of light and the burrows on the roof. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage43.ts.
import type { Burrow, Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; elite?: boolean; dir?: Dir }

const foe = (type: EnemyKind, id: string, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.elite) e.tier = 'elite';
  if (o.dir) e.dir = o.dir;
  return e;
};
/** A Creel ghoul in `mirror`, stepping out at its tile: the road in front of the glass. */
const ghoul = (id: string, group: string, mirror: string, tx: number, ty: number): SimSpawn => ({ kind: 'enemy', id, type: 'ghoul', tx, ty, group, mirror });
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: { state?: 'open'; solid?: boolean; hitBy?: Utility; hits?: number } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  if (o.hits) p.hits = o.hits;
  return p;
};
/** A grandfather clock standing in the open, 16 by 32: Eddie's riff shatters it at once, anyone else takes three hits. */
const clock = (id: string, tx: number, ty: number): SimSpawn => prop(id, 'clock', tx, ty, 16, 32, { hitBy: 'riff', solid: true, hits: 3 });

// ---------------------------------------------------------------- enemies
// 245 XP before xpMult. The street's pack is awake on the lawns and the road: five demodogs, three vines along the sidewalk and three pods.
// bats1 is four demobats over the road's east end, dormant until the street beat and awake from then on, and the alley's three Creel ghouls
// wait in mirror1 and step out as the party comes within 80 px of the glass. The park's pack is awake in the lanes: five demodogs, four
// vines and three pods. bats2 is five demobats over the lot and the north lanes, one elite, dormant until the park beat. The spec has
// fewer ground foes; the XP budget (240 to 300) needs the rest.
const ENEMIES: SimSpawn[] = [
  foe('demodog', 'sdog_a', 'street', 21, 33), foe('demodog', 'sdog_b', 'street', 23, 35), foe('demodog', 'sdog_c', 'street', 24, 31),
  foe('demodog', 'sdog_d', 'street', 27, 35), foe('demodog', 'sdog_e', 'street', 26, 33),
  foe('vine', 'svine_a', 'street', 21, 30), foe('vine', 'svine_b', 'street', 26, 31), foe('vine', 'svine_c', 'street', 28, 30),
  foe('pod', 'spod_a', 'street', 23, 30), foe('pod', 'spod_b', 'street', 25, 31), foe('pod', 'spod_c', 'street', 19, 36),
  foe('demobat', 'bat1_a', 'bats1', 23, 34, { dormant: true }), foe('demobat', 'bat1_b', 'bats1', 25, 33, { dormant: true }),
  foe('demobat', 'bat1_c', 'bats1', 26, 35, { dormant: true }), foe('demobat', 'bat1_d', 'bats1', 28, 34, { dormant: true }),
  ghoul('alley_a', 'alley', 'mirror1', 18, 26), ghoul('alley_b', 'alley', 'mirror1', 19, 26), ghoul('alley_c', 'alley', 'mirror1', 18, 27),
  foe('demodog', 'pdog_a', 'park', 33, 22), foe('demodog', 'pdog_b', 'park', 34, 24), foe('demodog', 'pdog_c', 'park', 41, 22),
  foe('demodog', 'pdog_d', 'park', 44, 23), foe('demodog', 'pdog_e', 'park', 40, 27),
  foe('vine', 'pvine_a', 'park', 32, 20), foe('vine', 'pvine_b', 'park', 45, 22), foe('vine', 'pvine_c', 'park', 36, 27), foe('vine', 'pvine_d', 'park', 46, 17),
  foe('pod', 'ppod_a', 'park', 38, 28), foe('pod', 'ppod_b', 'park', 44, 27), foe('pod', 'ppod_c', 'park', 41, 16),
  foe('demobat', 'bat2_a', 'bats2', 36, 15, { dormant: true }), foe('demobat', 'bat2_b', 'bats2', 42, 15, { dormant: true }),
  foe('demobat', 'bat2_c', 'bats2', 45, 16, { dormant: true }), foe('demobat', 'bat2_d', 'bats2', 40, 15, { dormant: true, elite: true }),
  foe('demobat', 'bat2_e', 'bats2', 38, 16, { dormant: true }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the tear's lawn, the cross street, the park's south lane and the ladder's foot), three Cokes and 12 quarters, spread over the
// route and its corners. The lawn's Eggo and the lane's are side trips. The last one lies at the foot of the ladder, for whoever is hurt
// most before the song (a hero at full HP passes an Eggo to the most wounded).
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 8, 27), item('eggo2', 'eggo', 25, 21), item('eggo3', 'eggo', 33, 28), item('eggo4', 'eggo', 38, 14),
  item('coke1', 'coke', 12, 36), item('coke2', 'coke', 14, 20), item('coke3', 'coke', 43, 21),
  item('q01', 'quarter', 6, 34), item('q02', 'quarter', 20, 36), item('q03', 'quarter', 28, 36), item('q04', 'quarter', 7, 29),
  item('q05', 'quarter', 11, 19), item('q06', 'quarter', 24, 21), item('q07', 'quarter', 28, 24), item('q08', 'quarter', 19, 29),
  item('q09', 'quarter', 32, 17), item('q10', 'quarter', 45, 19), item('q11', 'quarter', 45, 24), item('q12', 'quarter', 36, 28),
];

// ---------------------------------------------------------------- props
// lights_tear hangs on the lawn above the tear, lights_park on the first row's lawn on the cross street before the gate, and lights_roof
// in the lot, off to the side of the ladder. mirror1 is a doorway mirror, 32 by 16, across the far end of the alley, two tiles wide between the two houses.
// The three clocks stand free: clock1 in the first house's lawn, clock2 on the corner of the alley's mouth against the second house, clock3
// in the lane. door_roof is the ladder's doorway in the lip of the deck, open until the roof beat shuts it (not solid while it is open).
const PROPS: SimSpawn[] = [
  lights('lights_tear', 3, 27), lights('lights_park', 24, 19), lights('lights_roof', 33, 16),
  prop('mirror1', 'mirror', 18, 25, 32, 16, { hitBy: 'riff', solid: true }),
  clock('clock1', 13, 29), clock('clock2', 20, 23), clock('clock3', 36, 21),
  prop('door_roof', 'door', 37, 12, 32, 16, { state: 'open', solid: false }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the burrows
// Round the inside edge of the deck, where the flock that circles Eddie comes up while the song plays: three along the north lip, one at each
// end of the middle, two along the south lip and one by the ladder.
export const BURROWS: Burrow[] = [
  { tx: 31, ty: 3 }, { tx: 37, ty: 3 }, { tx: 44, ty: 3 }, { tx: 31, ty: 7 }, { tx: 44, ty: 7 }, { tx: 31, ty: 10 }, { tx: 44, ty: 10 }, { tx: 40, ty: 10 },
];

// ---------------------------------------------------------------- the pools of light
// The tear's red glow, the street's lamps (dead ones, a few of them guttering), the alley, the park's lamps and the lot, and the deck, which
// the storm lights but not enough to see a song by. The lights props and the bolts of the storm add their own.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The tear.
  lamp(4, 29, 52, 0.7), lamp(3, 33, 36, 0.3),
  // The street's lamps, along the sidewalk.
  lamp(8, 32, 40, 0.5), lamp(16, 32, 40, 0.1), lamp(24, 32, 40, 0.45), lamp(28, 32, 40, 0.1),
  // The alley, and the cross street's lamps.
  lamp(18.5, 27, 32, 0.2), lamp(13, 24, 40, 0.1), lamp(22, 20, 40, 0.5), lamp(27, 24, 40, 0.1),
  // The park: the gate, the middle lane, the north lane and the lot.
  lamp(31, 22, 40, 0.3), lamp(37, 23, 44, 0.1), lamp(42, 21, 40, 0.5), lamp(36, 27, 36, 0.1), lamp(40, 17, 44, 0.1), lamp(34, 16, 40, 0.3),
  // The deck.
  lamp(33, 4, 56, 0.1), lamp(42, 4, 56, 0.1), lamp(37, 7, 60, 0.1), lamp(33, 9, 48, 0.2), lamp(42, 9, 48, 0.2),
];
