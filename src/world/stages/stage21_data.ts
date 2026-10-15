// Stage 2.1, the Palace and the patch: who and what stands where. Enemies, items, props and the npc. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage21.ts.
import type { Dir, EnemyKind, ItemKind, PropKind, SimSpawn } from '../../core/types.ts';

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
// Up to 166 XP: thirteen demodogs (117), five vines (25), four pods (12) and three rats (12), which the stage's xpMult makes
// 260. A pod that bursts pays nothing.
// The spec's six rats and eleven demodogs are traded for three and thirteen: the damage in this stage is the demodogs' bites,
// so a pack of three waits in the barn yard, before the party burst has had time to refill, and the rats make room for it
// under the XP cap. The street, the rows, the barn and the corn are awake and wait where they are; the waves sleep in the hole.
const ENEMIES: SimSpawn[] = [
  // Main Street: three rats loitering by the storm drain, a long way east of the arcade door.
  foe('street_a', 'rat', 'street', 30, 11), foe('street_b', 'rat', 'street', 32, 12), foe('street_c', 'rat', 'street', 33, 10),
  // The pumpkin rows: two vines and three pods rooted in the rot, in the lanes the party has to walk.
  foe('rows_vine1', 'vine', 'rows', 7, 18), foe('rows_vine2', 'vine', 'rows', 25, 21),
  foe('rows_pod1', 'pod', 'rows', 12, 16), foe('rows_pod2', 'pod', 'rows', 24, 19), foe('rows_pod3', 'pod', 'rows', 15, 22),
  // The barn yard: a vine under the barn wall and a pack of three demodogs, the first the party meets.
  foe('barn_vine', 'vine', 'barn', 19, 27),
  foe('barn_dog1', 'demodog', 'barn', 12, 33), foe('barn_dog2', 'demodog', 'barn', 16, 35), foe('barn_dog3', 'demodog', 'barn', 8, 31),
  // The far field: two vines hidden in the corn at the edge of the lane, and a pod in it.
  foe('corn_vine1', 'vine', 'corn', 30, 26, { hidden: true }), foe('corn_vine2', 'vine', 'corn', 38, 29, { hidden: true }),
  foe('corn_pod', 'pod', 'corn', 35, 28),
  // The hole: three waves of young demodogs, each woken by the one before.
  foe('amb1_a', 'demodog', 'amb1', 33, 35, { dormant: true }), foe('amb1_b', 'demodog', 'amb1', 35, 34, { dormant: true }),
  foe('amb1_c', 'demodog', 'amb1', 36, 36, { dormant: true }),
  foe('amb2_a', 'demodog', 'amb2', 31, 35, { dormant: true }), foe('amb2_b', 'demodog', 'amb2', 34, 36, { dormant: true }),
  foe('amb2_c', 'demodog', 'amb2', 37, 35, { dormant: true }),
  foe('amb3_a', 'demodog', 'amb3', 32, 34, { dormant: true }), foe('amb3_b', 'demodog', 'amb3', 36, 35, { dormant: true }),
  foe('amb3_c', 'demodog', 'amb3', 38, 35, { dormant: true }), foe('amb3_d', 'demodog', 'amb3', 34, 34, { dormant: true }),
];

// ---------------------------------------------------------------- items
// Three Eggos (the street's dead end, the barn yard, the hole before the ambush), two Cokes and twelve quarters. Nothing worth
// a detour lies on the near side of a gate from the far one: the bot would walk into it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 45, 11), item('eggo2', 'eggo', 4, 36), item('eggo3', 'eggo', 43, 37),
  item('coke1', 'coke', 16, 1), item('coke2', 'coke', 21, 36),
  item('q01', 'quarter', 1, 7), item('q02', 'quarter', 17, 7), item('q03', 'quarter', 3, 10), item('q04', 'quarter', 44, 9),
  item('q05', 'quarter', 23, 11), item('q06', 'quarter', 28, 16), item('q07', 'quarter', 20, 22), item('q08', 'quarter', 3, 29),
  item('q09', 'quarter', 21, 32), item('q10', 'quarter', 36, 27), item('q11', 'quarter', 31, 32), item('q12', 'quarter', 45, 35),
];

// ---------------------------------------------------------------- props
const PROPS: SimSpawn[] = [
  // Checkpoints: the Palace, just inside the patch gate, just past the hidden path.
  prop('lights_palace', 'lights', 3, 7, { w: 48 }),
  prop('lights_patch', 'lights', 36, 16, { w: 48 }),
  prop('lights_field', 'lights', 43, 33, { w: 48 }),
  // The four gates. vines1 fills the gap in the fence along the street, gate1 the gap in the fence between the barn yard and
  // the far field, hidden1 the one-tile path through the corn. target1 hangs on the barn wall, above the yard.
  { kind: 'prop', id: 'vines1', prop: 'vines', tx: 40, ty: 14, w: 32, h: 16, hitBy: 'burn', solid: true },
  { kind: 'prop', id: 'target1', prop: 'target', tx: 13, ty: 25, hitBy: 'shoot' },
  { kind: 'prop', id: 'gate1', prop: 'gate', tx: 23, ty: 27, w: 16, h: 48 },
  { kind: 'prop', id: 'hidden1', prop: 'hidden', tx: 45, ty: 30, w: 16, h: 32, hitBy: 'sense', solid: true },
  // The Palace: rows of cabinets along the north wall and by the counter. digdug shows MADMAX.
  ...[2, 3, 4, 5, 6].map((x, i) => prop(`cab${i + 1}`, 'arcade', x, 1, { solid: true })),
  ...[9, 10, 11].map((x, i) => prop(`cab${i + 6}`, 'arcade', x, 4, { solid: true })),
  prop('digdug', 'arcade', 12, 4, { solid: true }),
  // Main Street: two parked bikes, and the trash can Dustin finds the creature in.
  prop('bike1', 'bike', 24, 9, { solid: true }), prop('bike2', 'bike', 25, 9, { solid: true }),
  prop('trash1', 'crate', 22, 13),
];

const NPCS: SimSpawn[] = [{ kind: 'npc', id: 'max', tx: 12, ty: 5, dir: 'up' }];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS, ...NPCS];
