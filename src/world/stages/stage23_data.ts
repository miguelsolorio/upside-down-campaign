// Stage 2.3, the Gate: who and what stands where. Enemies, items, props, the burrows, the defense and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage23.ts.
import type { Burrow, DefenseDef, Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; elite?: boolean }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.elite) e.tier = 'elite';
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
const npc = (id: 'eleven' | 'hopper', tx: number, ty: number, dir: Dir): SimSpawn => ({ kind: 'npc', id, tx, ty, dir });

// ---------------------------------------------------------------- enemies
// 160 XP in all: two corridor demodogs and two vines (28), the storage pods, vine and two demodogs (32), the Alpha (70), and the
// run-time pups (nine from the howls and 21 in the defense, at 1 XP each, which is 30). The pods that burst pay nothing. The Alpha
// sleeps in the den, far from the doors, and wakes when the `alpha` beat shuts the seals behind the party.
const ENEMIES: SimSpawn[] = [
  // The sublevel corridor: a demodog on each side of the middle, a vine on the north wall and one on the south.
  foe('corridor_dog1', 'demodog', 'corridor', 15, 33), foe('corridor_dog2', 'demodog', 'corridor', 18, 35),
  foe('corridor_vine1', 'vine', 'corridor', 16, 32), foe('corridor_vine2', 'vine', 'corridor', 13, 35),
  // Storage: pods in the aisles the route crosses, a vine in the north-east corner, a demodog in each half.
  foe('storage_pod1', 'pod', 'storage', 27, 32), foe('storage_pod2', 'pod', 'storage', 31, 36), foe('storage_pod3', 'pod', 'storage', 35, 34),
  foe('storage_vine1', 'vine', 'storage', 36, 30),
  foe('storage_dog1', 'demodog', 'storage', 30, 34), foe('storage_dog2', 'demodog', 'storage', 33, 32),
  // The den.
  foe('alpha', 'alpha', 'boss', 19, 8, { dormant: true }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the cache, the stairwell, storage's north-east corner, the mouth), three Cokes and twelve quarters, two of them in the
// cache. Nothing lies near the route on the far side of gap1: the bot would walk into it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 43, 33), item('eggo2', 'eggo', 28, 7), item('eggo3', 'eggo', 35, 30), item('eggo4', 'eggo', 9, 32),
  item('coke1', 'coke', 11, 35), item('coke2', 'coke', 35, 37), item('coke3', 'coke', 7, 14),
  item('q01', 'quarter', 5, 34), item('q02', 'quarter', 9, 35), item('q03', 'quarter', 12, 33), item('q04', 'quarter', 17, 34),
  item('q05', 'quarter', 26, 35), item('q06', 'quarter', 31, 33), item('q07', 'quarter', 14, 19), item('q08', 'quarter', 22, 19),
  item('q09', 'quarter', 12, 13), item('q10', 'quarter', 30, 7), item('q11', 'quarter', 41, 33), item('q12', 'quarter', 44, 35),
];

// ---------------------------------------------------------------- props
// The seals are vines spawned open and not solid, with no hitBy: the `alpha` beat shuts them (Sim.closeProp) and nothing burns them.
// Each fills its doorway wall to wall, one tile deep. The rift is solid and stands on the chamber's north wall.
const PROPS: SimSpawn[] = [
  lights('lights_mouth', 2, 31), lights('lights_den', 11, 20), lights('lights_gate', 28, 10),
  { kind: 'prop', id: 'crack1', prop: 'crack', tx: 22, ty: 33, w: 16, h: 32, hitBy: 'smash', solid: true },
  { kind: 'prop', id: 'gap1', prop: 'gap', tx: 38, ty: 33, w: 16, h: 32, hitBy: 'dash', solid: true },
  { kind: 'prop', id: 'seal1', prop: 'vines', tx: 8, ty: 17, w: 32, h: 16, solid: false, state: 'open' },
  { kind: 'prop', id: 'seal2', prop: 'vines', tx: 25, ty: 8, w: 16, h: 32, solid: false, state: 'open' },
  { kind: 'prop', id: 'rift', prop: 'rift', tx: 38, ty: 3, w: 64, h: 48, solid: true },
];

// Eleven and Hopper stand below the rift, facing it. Hopper is scenery the whole time: enemies ignore him.
const NPCS: SimSpawn[] = [npc('eleven', 39, 6, 'up'), npc('hopper', 41, 6, 'up')];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS, ...NPCS];

// ---------------------------------------------------------------- burrows and the defense
// Four at the den's edges for the howls, and four on the tears of the Gate chamber, which are the ones nearest Eleven.
export const BURROWS: Burrow[] = [
  { tx: 21, ty: 4 }, { tx: 22, ty: 9 }, { tx: 22, ty: 14 }, { tx: 17, ty: 4 },
  { tx: 35, ty: 4 }, { tx: 44, ty: 4 }, { tx: 36, ty: 10 }, { tx: 44, ty: 10 },
];

// Eleven's HP is the lever that makes chief lose now and then (docs/level-6.md starts it at 400, which the bot never comes near): at 90
// she falls in about one chief run in seven. Her damage scales with the difficulty and enemyMult, so upside is harder on her too.
const S = 60;
export const DEFENSE: DefenseDef = {
  npc: 'eleven', hp: 90, frames: 45 * S, prop: 'rift',
  waves: [
    { at: 0, n: 3, type: 'demodog' }, { at: 7 * S, n: 3, type: 'demodog' }, { at: 14 * S, n: 4, type: 'demodog' },
    { at: 22 * S, n: 3, type: 'demodog' }, { at: 22 * S, n: 1, type: 'demodog', tier: 'elite' },
    { at: 30 * S, n: 4, type: 'demodog' }, { at: 37 * S, n: 3, type: 'demodog' },
  ],
};

// ---------------------------------------------------------------- the pools of light
// At night the lights props, lit, get pools on their own. These are the rest: the Gate and its tears, the glow of the flesh in the
// den, and a few dim emergency lamps along the route.
const T = 16;
const pool = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: tx * T + 8, y: ty * T + 8, r, flicker });
export const LIGHTS: LightSource[] = [
  // The Gate chamber: the rift itself, then the tears.
  { x: 40 * T, y: 4 * T + 8, r: 96, flicker: 0.15 },
  pool(35, 4, 40, 0.45), pool(44, 4, 40, 0.45), pool(36, 10, 40, 0.3), pool(44, 10, 40, 0.3), pool(40, 8, 56, 0.15),
  // The tunnel mouth, the corridor and storage.
  pool(4, 34, 56, 0.1), pool(13, 33, 44, 0.3), pool(18, 34, 40, 0.45), pool(28, 33, 48, 0.3), pool(34, 34, 44, 0.15), pool(31, 30, 36, 0.3),
  pool(43, 34, 40, 0.15),
  // The halls: bulbs that still work.
  pool(31, 25, 34, 0.45), pool(28, 19, 34, 0.15), pool(20, 19, 34, 0.45), pool(12, 19, 44, 0.15),
  // The den, glowing from the walls.
  pool(8, 14, 46, 0.3), pool(10, 6, 40, 0.45), pool(14, 9, 56, 0.3), pool(19, 6, 48, 0.3), pool(20, 12, 48, 0.45), pool(23, 9, 40, 0.3),
  // The stairwell.
  pool(25, 8, 31, 0.3), pool(29, 8, 56, 0.15), pool(29, 11, 40, 0.3),
];
