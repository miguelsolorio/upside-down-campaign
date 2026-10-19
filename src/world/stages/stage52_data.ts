// Stage 5.2, the Abyss: who and what stands where. Enemies, items, props and the pools of light. Pure data (docs/level-15.md).
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage52.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; dir?: Dir }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.dir) e.dir = o.dir;
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
interface Opts { state?: 'open'; solid?: boolean; hitBy?: Utility; smash?: boolean; hits?: number }
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: Opts = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  if (o.smash) p.smash = true;
  if (o.hits) p.hits = o.hits;
  return p;
};

/** Basic attacks from anyone but the gate's own heroes that wear burn1 or crack1 down: the fallback when neither of its heroes is picked (src/combat/props.ts, smashAimed). */
export const CHIP_HITS = 12;

// ---------------------------------------------------------------- enemies
// 348 XP before xpMult (docs/level-15.md, "Spawns and the XP budget"): six demodogs (54), three demobats (18), two vines (10), two pods (6), three
// Demogorgon foes (120) and the twins (140). The demobats are the deck's, in `bridge` with its vines and its pack. Everything but the twins is awake
// and waits where it stands; the twins sleep on the ring until the `twins` beat wakes them.
const ENEMIES: SimSpawn[] = [
  // The lawn island: the pack at the east end, by the bridge. The party starts ten tiles from the nearest of them.
  foe('landing_dog1', 'demodog', 'landing', 14, 33), foe('landing_dog2', 'demodog', 'landing', 15, 36), foe('landing_dog3', 'demodog', 'landing', 13, 38),
  // The road island: a Demogorgon on the lane, two pods in the road's corners.
  foe('road_demo', 'demofoe', 'road', 30, 35, { dir: 'left' }), foe('road_pod1', 'pod', 'road', 27, 33), foe('road_pod2', 'pod', 'road', 33, 37),
  // The deck past the burn wall: two vines either side of the bridge's mouth, a pack of three in the middle of the island.
  foe('bridge_vine1', 'vine', 'bridge', 21, 25), foe('bridge_vine2', 'vine', 'bridge', 26, 24),
  foe('bridge_dog1', 'demodog', 'bridge', 16, 23), foe('bridge_dog2', 'demodog', 'bridge', 18, 26), foe('bridge_dog3', 'demodog', 'bridge', 13, 25),
  foe('bridge_bat1', 'demobat', 'bridge', 12, 26), foe('bridge_bat2', 'demobat', 'bridge', 17, 22), foe('bridge_bat3', 'demobat', 'bridge', 21, 23),
  // The classroom island: a Demogorgon in the north-west corner and one in the north, either side of the way to the neck.
  foe('class_demo1', 'demofoe', 'classroom', 7, 8, { dir: 'down' }), foe('class_demo2', 'demofoe', 'classroom', 16, 6, { dir: 'down' }),
  // The ring: the twins, one at the north-east and one at the south-east, asleep.
  foe('twin1', 'twin', 'boss', 43, 6, { dormant: true, dir: 'down' }), foe('twin2', 'twin', 'boss', 44, 13, { dormant: true, dir: 'left' }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the lawn, the road, the deck, the cache), three Cokes (the deck, the classroom, the cache) and fourteen quarters, three in the
// cache. Nothing lies on the ring or within reach across a gap or a drop: the bot would walk into it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 15, 34), item('eggo2', 'eggo', 35, 33), item('eggo3', 'eggo', 10, 24), item('eggo4', 'eggo', 41, 35),
  item('coke1', 'coke', 11, 22), item('coke2', 'coke', 8, 13), item('coke3', 'coke', 43, 34),
  item('q01', 'quarter', 4, 32), item('q02', 'quarter', 9, 37), item('q03', 'quarter', 25, 37), item('q04', 'quarter', 36, 34),
  item('q05', 'quarter', 9, 26), item('q06', 'quarter', 23, 22), item('q07', 'quarter', 17, 25),
  item('q08', 'quarter', 6, 6), item('q09', 'quarter', 12, 13), item('q10', 'quarter', 18, 15), item('q11', 'quarter', 7, 15),
  item('q12', 'quarter', 40, 36), item('q13', 'quarter', 42, 36), item('q14', 'quarter', 44, 34),
];

// ---------------------------------------------------------------- props
// The strings of Joyce's lights hang from vines at the landing, on the deck and in the classroom. gap1 fills the neck to the cache wall to wall (Max's
// dash crosses it). burn1 is a wall of vines on the bridge north, sense1 Will's bridge, drawn as nothing until he stands close (it covers all four of the
// bridge's tiles) and crack1 a fallen wall across the classroom's neck. burn1 and crack1 also give way to anyone's basic attack, CHIP_HITS of them, for a
// party with neither of their heroes. door1 is the rock fall across the ring's way in: spawned open, shut by the `twins` beat.
const PROPS: SimSpawn[] = [
  lights('lights_landing', 3, 33), lights('lights_bridge', 12, 23), lights('lights_ring', 16, 7),
  prop('gap1', 'gap', 38, 34, 16, 32, { hitBy: 'dash', solid: true }),
  prop('burn1', 'vines', 24, 29, 16, 32, { hitBy: 'burn', solid: true, smash: true, hits: CHIP_HITS }),
  prop('sense1', 'hidden', 14, 17, 16, 64, { hitBy: 'sense', solid: true }),
  prop('crack1', 'crack', 22, 9, 16, 32, { hitBy: 'smash', solid: true, smash: true, hits: CHIP_HITS }),
  prop('door1', 'door', 31, 10, 16, 48, { state: 'open', solid: false }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

/** The Abyss is a day stage and its lights props make their own glow: nothing is always on. */
export const LIGHTS: LightSource[] = [];
