// Stage 2.2, the tunnels: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage22.ts.
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
// Up to 166 XP: fourteen demodogs (twelve at 9 and two elite at 18, which is 144), two vines (10) and four pods (12), which the
// stage's xpMult makes 258. A pod that bursts pays nothing. The spec's eighteen demodogs, four vines and four pods came to well
// over the cap of 170 the stage was built to, so the packs are smaller and two of the four vines are gone. The halls, the nest
// and the two packs in the long hall are awake and wait where they are. The three waves sleep in the hub.
const ENEMIES: SimSpawn[] = [
  // The root halls: two demodogs at the west end, where the halls turn south, and a vine where the long hall above the nest turns down.
  foe('halls_dog1', 'demodog', 'halls', 6, 13), foe('halls_dog2', 'demodog', 'halls', 5, 16),
  foe('halls_vine1', 'vine', 'halls', 33, 7),
  // The nest: pods rooted along the three lanes, and a vine where the top lane meets the way out.
  foe('nest_pod1', 'pod', 'nest', 30, 19), foe('nest_pod2', 'pod', 'nest', 27, 16), foe('nest_pod3', 'pod', 'nest', 32, 16),
  foe('nest_pod4', 'pod', 'nest', 30, 13), foe('nest_vine1', 'vine', 'nest', 34, 12),
  // Beyond gap3: a pack of two where the long hall widens into a bulge, well clear of the drop so that Max has crossed and landed.
  foe('hall2_dog1', 'demodog', 'hall2', 22, 26), foe('hall2_dog2', 'demodog', 'hall2', 25, 25),
  // Before the hub: a demodog and an elite in the west chamber.
  foe('hall3_dog1', 'demodog', 'hall3', 7, 28), foe('hall3_elite', 'demodog', 'hall3', 5, 26, { elite: true }),
  // The hub: three waves in the east end, past the last barrier, each woken by the one before.
  foe('amb1_a', 'demodog', 'amb1', 42, 31, { dormant: true }), foe('amb1_b', 'demodog', 'amb1', 42, 35, { dormant: true }),
  foe('amb2_a', 'demodog', 'amb2', 44, 32, { dormant: true }), foe('amb2_b', 'demodog', 'amb2', 41, 34, { dormant: true }),
  foe('amb2_c', 'demodog', 'amb2', 44, 36, { dormant: true }),
  foe('amb3_a', 'demodog', 'amb3', 45, 31, { dormant: true }), foe('amb3_b', 'demodog', 'amb3', 45, 34, { dormant: true }),
  foe('amb3_elite', 'demodog', 'amb3', 44, 33, { dormant: true, elite: true }),
];

// ---------------------------------------------------------------- items
// Three Eggos (a pocket off the first hall, the cache, the hub's north-east corner), two Cokes (a pocket off the west hall and the
// cache) and twelve quarters, three of them in the cache. Nothing lies within the bot's reach across a drop: it would walk into it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 18, 2), item('eggo2', 'eggo', 41, 9), item('eggo3', 'eggo', 46, 30),
  item('coke1', 'coke', 11, 15), item('coke2', 'coke', 39, 9),
  item('q01', 'quarter', 3, 8), item('q02', 'quarter', 13, 5), item('q03', 'quarter', 18, 3), item('q04', 'quarter', 7, 12),
  item('q05', 'quarter', 24, 36), item('q06', 'quarter', 33, 12), item('q07', 'quarter', 30, 15), item('q08', 'quarter', 45, 18),
  item('q09', 'quarter', 30, 26), item('q10', 'quarter', 38, 8), item('q11', 'quarter', 42, 7), item('q12', 'quarter', 43, 9),
];

// ---------------------------------------------------------------- props
const PROPS: SimSpawn[] = [
  // Checkpoints: the drop, the nest's west end, the hub's doorway.
  prop('lights_drop', 'lights', 3, 8, { w: 48 }),
  prop('lights_nest', 'lights', 25, 19, { w: 48 }),
  prop('lights_hub', 'lights', 19, 33, { w: 48 }),
  // The drops. Each fills its hall wall to wall, one tile deep: gap1 and gap3 across halls that run east and west, gap2 across the
  // one that runs south. Max's Skate dash passes over them and they stay solid to everything else.
  { kind: 'prop', id: 'gap1', prop: 'gap', tx: 20, ty: 18, w: 16, h: 32, hitBy: 'dash', solid: true },
  { kind: 'prop', id: 'gap2', prop: 'gap', tx: 44, ty: 20, w: 32, h: 16, hitBy: 'dash', solid: true },
  { kind: 'prop', id: 'gap3', prop: 'gap', tx: 33, ty: 25, w: 16, h: 32, hitBy: 'dash', solid: true },
  // The crack across the mouth of the dead end north of the junction.
  { kind: 'prop', id: 'crack1', prop: 'crack', tx: 39, ty: 11, w: 32, h: 16, hitBy: 'smash', solid: true },
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// At night the lights props, lit, get pools on their own. These are the rest: the shaft of daylight at the drop, and each cluster
// of glowing veins, from the root halls to the hub. The veins pulse, so the pools flicker a little.
const T = 16;
export const LIGHTS: LightSource[] = [
  { x: 5 * T + 8, y: 5 * T + 8, r: 64, flicker: 0.05 },
  { x: 42 * T + 8, y: 7 * T + 8, r: 31, flicker: 0.15 },
  { x: 18 * T + 8, y: 8 * T + 8, r: 31, flicker: 0.45 },
  { x: 21 * T + 8, y: 8 * T + 8, r: 34, flicker: 0.15 },
  { x: 32 * T + 8, y: 12 * T + 8, r: 34, flicker: 0.3 },
  { x: 41 * T + 8, y: 12 * T + 8, r: 31, flicker: 0.3 },
  { x: 8 * T + 8, y: 13 * T + 8, r: 31, flicker: 0.45 },
  { x: 27 * T + 8, y: 13 * T + 8, r: 34, flicker: 0.45 },
  { x: 13 * T + 8, y: 18 * T + 8, r: 34, flicker: 0.45 },
  { x: 27 * T + 8, y: 18 * T + 8, r: 46, flicker: 0.3 },
  { x: 33 * T + 8, y: 18 * T + 8, r: 37, flicker: 0.15 },
  { x: 22 * T + 8, y: 19 * T + 8, r: 31, flicker: 0.15 },
  { x: 7 * T + 8, y: 23 * T + 8, r: 34, flicker: 0.15 },
  { x: 28 * T + 8, y: 26 * T + 8, r: 34, flicker: 0.3 },
  { x: 8 * T + 8, y: 31 * T + 8, r: 37, flicker: 0.45 },
  { x: 33 * T + 8, y: 31 * T + 8, r: 48, flicker: 0.45 },
  { x: 42 * T + 8, y: 31 * T + 8, r: 48, flicker: 0.3 },
  { x: 19 * T + 8, y: 32 * T + 8, r: 31, flicker: 0.3 },
  { x: 22 * T + 8, y: 32 * T + 8, r: 48, flicker: 0.45 },
  { x: 27 * T + 8, y: 32 * T + 8, r: 48, flicker: 0.3 },
  { x: 38 * T + 8, y: 32 * T + 8, r: 48, flicker: 0.15 },
  { x: 46 * T + 8, y: 32 * T + 8, r: 34, flicker: 0.45 },
  { x: 19 * T + 8, y: 36 * T + 8, r: 37, flicker: 0.15 },
  { x: 22 * T + 8, y: 36 * T + 8, r: 46, flicker: 0.45 },
  { x: 26 * T + 8, y: 36 * T + 8, r: 43, flicker: 0.3 },
  { x: 32 * T + 8, y: 36 * T + 8, r: 34, flicker: 0.15 },
  { x: 37 * T + 8, y: 36 * T + 8, r: 46, flicker: 0.15 },
  { x: 42 * T + 8, y: 36 * T + 8, r: 46, flicker: 0.45 },
];
