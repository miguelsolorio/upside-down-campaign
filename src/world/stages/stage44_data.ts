// Stage 4.4, Vecna's lair: who and what stands where. Enemies, items, props and the pools of light. Pure data. Coordinates are tiles. A prop's tx,
// ty is its top-left tile and its w and h are px. The map is in stage44.ts.
import type { Dir, EnemyKind, ItemKind, LightSource, PropKind, SimSpawn } from '../../core/types.ts';

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
const prop = (id: string, kind: PropKind, tx: number, ty: number, w: number, h: number, o: { state?: 'open'; solid?: boolean } = {}): SimSpawn => {
  const p: Extract<SimSpawn, { kind: 'prop' }> = { kind: 'prop', id, prop: kind, tx, ty, w, h };
  if (o.state) p.state = o.state;
  if (o.solid !== undefined) p.solid = o.solid;
  return p;
};
/** A haunted mirror on a wall, long since broken: 16 by 16 in the wall's face row, spawned open (shattered, nothing in it). */
const broken = (id: string, tx: number, ty: number): SimSpawn => prop(id, 'mirror', tx, ty, 16, 16, { state: 'open' });

// ---------------------------------------------------------------- the boss
// The rug is tiles 21 to 26 across and 4 to 7 down (stage44.ts). gfx/tile_attic.ts anchors the roots at its corners, and the orbs stand where
// they end: 14 px out to the side of the rug and, for the two on the north, 16 px under its top edge, for the two on the south 8 px under its
// bottom edge (ORB_AT). An enemy stands at tx * 16 + 8 and ty * 16 + 12, so those feet are 19.625 and 27.375 across and 4.25 and 7.75 down.
// Vecna stands in the middle of the rug, his feet 40 px under its top edge, where the roots meet (the sheet stood him there): 23.5 across, 5.75 down.
const ORB_X = [19.625, 27.375] as const;
const ORB_Y = [4.25, 7.75] as const;
const BOSS: SimSpawn[] = [
  foe('vecna', 'vecna', 'boss', 23.5, 5.75, { dormant: true, dir: 'down' }),
  foe('orb1', 'orb', 'boss', ORB_X[0], ORB_Y[0], { dormant: true }), foe('orb2', 'orb', 'boss', ORB_X[1], ORB_Y[0], { dormant: true }),
  foe('orb3', 'orb', 'boss', ORB_X[0], ORB_Y[1], { dormant: true }), foe('orb4', 'orb', 'boss', ORB_X[1], ORB_Y[1], { dormant: true }),
];

// ---------------------------------------------------------------- enemies
// 280 XP before xpMult. The spec's groups are the foyer's (three demodogs and two vines, dormant until the house beat), the landing's (two demodogs,
// two pods and three demobats, dormant until the stairs beat) and the boss's (Vecna at 150, his orbs at 0): 229, under the 260 floor. The rest
// is the house between them, awake from the start like 4.2's foyer and hall: vines and pods in the hall and the parlor, rooted, and three
// demodogs in the dining room, at the foot of the stairs. The foyer's demodogs stand at both ends of the room, so they close on the party from
// two sides; the vines are in the foyer's north row, clear of the route along its south.
const ENEMIES: SimSpawn[] = [
  foe('foyer_a', 'demodog', 'foyer', 13, 33, { dormant: true }), foe('foyer_b', 'demodog', 'foyer', 30, 33, { dormant: true }),
  foe('foyer_c', 'demodog', 'foyer', 35, 32, { dormant: true }),
  foe('foyer_v1', 'vine', 'foyer', 15, 31, { dormant: true }), foe('foyer_v2', 'vine', 'foyer', 33, 31, { dormant: true }),
  foe('hall_v1', 'vine', 'hall', 22, 26), foe('hall_v2', 'vine', 'hall', 31, 28), foe('hall_p1', 'pod', 'hall', 26, 28),
  foe('parlor_p1', 'pod', 'parlor', 29, 23), foe('parlor_p2', 'pod', 'parlor', 27, 20), foe('parlor_v1', 'vine', 'parlor', 32, 23),
  foe('dining_a', 'demodog', 'dining', 19, 20), foe('dining_b', 'demodog', 'dining', 19, 23), foe('dining_c', 'demodog', 'dining', 12, 23),
  foe('landing_a', 'demodog', 'landing', 26, 16, { dormant: true }), foe('landing_b', 'demodog', 'landing', 33, 16, { dormant: true }),
  foe('landing_p1', 'pod', 'landing', 31, 15, { dormant: true }), foe('landing_p2', 'pod', 'landing', 27, 17, { dormant: true }),
  foe('landing_m1', 'demobat', 'landing', 30, 16, { dormant: true }), foe('landing_m2', 'demobat', 'landing', 31, 16, { dormant: true }),
  foe('landing_m3', 'demobat', 'landing', 32, 16, { dormant: true }),
  ...BOSS,
];

// ---------------------------------------------------------------- items
// Four Eggos, three Cokes and 12 quarters. The foyer's east end, the hall's, the parlor's and the landing's are short side trips; the dining room's
// Eggo and the foyer's Coke are on the way.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 36, 33), item('eggo2', 'eggo', 37, 28), item('eggo3', 'eggo', 37, 21), item('eggo4', 'eggo', 11, 23),
  item('coke1', 'coke', 12, 33), item('coke2', 'coke', 36, 22), item('coke3', 'coke', 36, 17),
  item('q01', 'quarter', 14, 37), item('q02', 'quarter', 30, 37), item('q03', 'quarter', 24, 38), item('q04', 'quarter', 26, 33),
  item('q05', 'quarter', 18, 28), item('q06', 'quarter', 27, 26), item('q07', 'quarter', 34, 27), item('q08', 'quarter', 29, 21),
  item('q09', 'quarter', 19, 22), item('q10', 'quarter', 21, 16), item('q11', 'quarter', 32, 17), item('q12', 'quarter', 13, 16),
];

// ---------------------------------------------------------------- props
// lights_porch hangs on the porch under the front wall and lights_landing on the landing's top row, by where the stairs let out. door_attic is the
// attic's doorway, one row thick in the wall's face row, spawned open and shut by the `vecna` beat (and open again at the clear). clock_attic is
// Vecna's clock on the attic's north wall, 16 by 32 over the wall face and the floor under it: solid, never broken (no hits, and nobody in this
// party has the riff), and first in the list, because the chime he sounds is shown over the first clock prop there is (enemies/vecna.ts). The
// parlor's clock ticks whole and chimes for no one. The five mirrors are broken: no ghouls step out of them.
const PROPS: SimSpawn[] = [
  prop('clock_attic', 'clock', 19, 1, 16, 32, { solid: true }),
  lights('lights_porch', 20, 36), lights('lights_landing', 18, 15),
  prop('door_attic', 'door', 22, 14, 64, 16, { state: 'open', solid: false }),
  prop('clock_parlor', 'clock', 30, 19, 16, 32, { solid: true }),
  broken('mirror1', 25, 19), broken('mirror2', 27, 19), broken('mirror3', 34, 19), broken('mirror4', 14, 25), broken('mirror5', 27, 25),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// The lights props, lit, add pools of their own. These are the rest: the red window light on the floor below each window of the house, the lamp
// on the porch, and the attic's, the biggest pool over the rug where the knot hangs, and a small red one at each orb.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The porch and the front rooms.
  lamp(24, 36, 44, 0.3), lamp(16, 32, 28, 0.05), lamp(28, 32, 28, 0.05), lamp(36, 32, 28, 0.05),
  // The hall: the windows in its north wall.
  lamp(12, 26, 28, 0.05), lamp(17, 26, 28, 0.05), lamp(24, 26, 28, 0.05), lamp(30, 26, 28, 0.05), lamp(36, 26, 28, 0.05),
  // The parlor and the dining room.
  lamp(32, 20, 28, 0.05), lamp(36, 20, 28, 0.05), lamp(18, 20, 28, 0.05), lamp(20, 20, 28, 0.05),
  // The landing, with the stairs' gap.
  lamp(12, 15, 28, 0.05), lamp(35, 15, 28, 0.05), lamp(15, 17, 32, 0.3),
  // The attic: the knot over the rug, the orbs, the clock, and the doorway.
  lamp(24, 6, 64, 0.2), lamp(19.625, 4.25, 28, 0.4), lamp(27.375, 4.25, 28, 0.4), lamp(19.625, 7.75, 28, 0.4), lamp(27.375, 7.75, 28, 0.4),
  lamp(19, 3, 28, 0.1), lamp(24, 11, 40, 0.1),
];
