// Stage 4.1, Kamchatka: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage41.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; dir?: Dir; patrol?: [number, number][] }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.dir) e.dir = o.dir;
  if (o.patrol) e.patrol = o.patrol.map(([ptx, pty]) => ({ tx: ptx, ty: pty }));
  return e;
};
const item = (id: string, kind: ItemKind, tx: number, ty: number): SimSpawn => ({ kind: 'item', id, item: kind, tx, ty });
const lights = (id: string, tx: number, ty: number): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, w: 48, h: 16 });
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: { state?: 'open'; solid?: boolean; hitBy?: Utility } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  if (o.hitBy) p.hitBy = o.hitBy;
  return p;
};

// ---------------------------------------------------------------- enemies
// 200 XP before xpMult: five Kamchatka guards with rifles (60), five camp guards with batons (80) and the pit Demogorgon (60). The yard has
// four rifles and a baton: two rifles walk the loop round the floodlight, opposite each other, one stands at the yard's gate in the east,
// and one stands with the baton guard in front of crack1. The block has two batons and a rifle awake in the corridor east of the guard room's
// doorway, and the guard room two more batons asleep until the block beat. The pit Demogorgon sleeps under its barricade. Everyone but the
// sleepers and the Demogorgon is awake and waits where he stands.
const ENEMIES: SimSpawn[] = [
  // The snow yard, in three clusters more than a rifle's alert range (140 px) apart, so the whole yard never joins one fight: a rifle at
  // the gate in the east, the two on the loop round the floodlight, and a rifle and the baton guard in the west, by the block.
  foe('yard_c', 'kguard', 'yard', 34, 22, { dir: 'down' }),
  foe('yard_a', 'kguard', 'yard', 18, 18, { dir: 'right', patrol: [[24, 18], [24, 24], [18, 24], [18, 18]] }),
  foe('yard_b', 'kguard', 'yard', 24, 24, { dir: 'left', patrol: [[18, 24], [18, 18], [24, 18], [24, 24]] }),
  foe('yard_d', 'kguard', 'yard', 5, 20, { dir: 'right' }),
  foe('yard_e', 'kbaton', 'yard', 8, 21, { dir: 'right' }),
  // The corridor, east of the guard room's doorway: two batons and a rifle at its far end.
  foe('block_a', 'kbaton', 'block', 17, 11, { dir: 'left' }), foe('block_b', 'kbaton', 'block', 17, 13, { dir: 'left' }),
  foe('block_c', 'kguard', 'block', 18, 12, { dir: 'left' }),
  // The guard room: two batons asleep, either side of the table of crates.
  foe('room_a', 'kbaton', 'guardroom', 12, 7, { dormant: true, dir: 'down' }), foe('room_b', 'kbaton', 'guardroom', 14, 7, { dormant: true, dir: 'down' }),
  // The pit: the Demogorgon, in front of the barricade over its tunnel.
  foe('pitdemo', 'pitdemo', 'boss', 31, 4, { dormant: true, dir: 'down' }),
];

// ---------------------------------------------------------------- items
// Three Eggos (one in the cache behind crack2, one in front of the block, one on the shaft's landing for the walk to the pit), two Cokes
// (the yard's south edge, the corridor) and eight quarters, two of them in the cache. The Eggos and Cokes lie on the route, where a bot
// that is hurt or dry finds them; it skips the cache.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 11, 22), item('eggo2', 'eggo', 5, 7), item('eggo3', 'eggo', 22, 13),
  // Two Eggos in the pit's corners, dropped from the rim: alone, Hopper has nobody to swap to, so the fight carries its own heals.
  item('eggo4', 'eggo', 26, 3), item('eggo5', 'eggo', 41, 12),
  item('coke1', 'coke', 30, 25), item('coke2', 'coke', 11, 13),
  item('q01', 'quarter', 9, 30), item('q02', 'quarter', 20, 36), item('q03', 'quarter', 28, 33), item('q04', 'quarter', 36, 36),
  item('q05', 'quarter', 41, 24), item('q06', 'quarter', 4, 25), item('q07', 'quarter', 6, 5), item('q08', 'quarter', 3, 7),
];

// ---------------------------------------------------------------- props
// crack1 shuts the notch in the block's south wall (32 by 16) and crack2 the cache cell's door in the corridor's north wall. door1 is the pit's
// doorway in its west wall, two tiles tall and one deep: spawned open, shut by the pit beat and opened again at the clear. The floodlight
// stands in the middle of the yard, lit. lights_yard is the care package, lights_block hangs in the guard room and lights_shaft on the landing.
const PROPS: SimSpawn[] = [
  lights('lights_yard', 3, 36), lights('lights_block', 12, 4), lights('lights_shaft', 20, 8),
  prop('crack1', 'crack', 9, 15, 32, 16, { hitBy: 'smash', solid: true }),
  prop('crack2', 'crack', 4, 10, 32, 16, { hitBy: 'smash', solid: true }),
  prop('door1', 'door', 24, 10, 16, 32, { state: 'open', solid: false }),
  prop('flood1', 'floodlight', 21, 21, 16, 16, { state: 'open' }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// The burning drums and the pit's lanterns light themselves at night, and so do the floodlight and a lit string. These are the rest: the
// pen's lamp at the start, the bulbs in the block (the corridor, the cache, the guard room), the shaft's, and the one over the pit's door.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The work yard: a lamp over the crate that came from home, and one over the strip's gate.
  lamp(6, 34, 44, 0.1), lamp(38, 30, 40, 0.3),
  // The block: bulbs over the corridor, a failing one in the cache, the guard room's.
  lamp(4, 12, 40, 0.45), lamp(11, 12, 40, 0.3), lamp(16, 12, 40, 0.45), lamp(4.5, 6.5, 32, 0.45), lamp(13, 5, 44, 0.3),
  // The shaft's landing, and the lamp over the pit's door.
  lamp(21, 10, 44, 0.3), lamp(23, 9, 28, 0.05),
];
