// Stage 4.2, the Hellfire Club and the Creel House: who and what stands where. Enemies, items, props and the pools of light. Pure data.
// Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage42.ts.
import type { Dir, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; elite?: boolean; dir?: Dir }

/** A Creel ghoul in `mirror`, stepping out at its tile: the floor in front of the glass. */
const ghoul = (id: string, group: string, mirror: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type: 'ghoul', tx, ty, group, mirror };
  if (o.dormant) e.dormant = true;
  if (o.elite) e.tier = 'elite';
  if (o.dir) e.dir = o.dir;
  return e;
};
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
/** A haunted mirror on a wall: 16 by 16 in the wall's face row (ty), solid as its wall is. */
const wallMirror = (id: string, tx: number, ty: number): SimSpawn => prop(id, 'mirror', tx, ty, 16, 16);

// ---------------------------------------------------------------- enemies
// 238 XP before xpMult: sixteen Creel ghouls, fifteen worth 14 and the elite 28. All of them wait in a mirror and step out as the party
// comes within 80 px of it. The foyer's two are in the doorway mirror, mirror1, and the
// hall's five in mirror2 and mirror3 (two each) and in mirror4, which closes the pantry: all awake, so they come out as the party nears.
// The parlor's two are dormant until the curse beat, and the back hall's seven until the finale beat: two in mirror7, two in mirror8 and
// three in mirror9, where the elite stands in the middle of the other two. Each ghoul's tile is the floor in front of its glass, where it
// steps out. The spec has the finale at six; the seventh is what the XP budget (230 to 290) needs.
const ENEMIES: SimSpawn[] = [
  ghoul('foyer_a', 'foyer', 'mirror1', 40, 15), ghoul('foyer_b', 'foyer', 'mirror1', 41, 15),
  ghoul('hall_a', 'hall', 'mirror2', 32, 9), ghoul('hall_b', 'hall', 'mirror2', 34, 9),
  ghoul('hall_c', 'hall', 'mirror3', 38, 9), ghoul('hall_d', 'hall', 'mirror3', 40, 9),
  ghoul('pantry_a', 'hall', 'mirror4', 15, 15),
  ghoul('parlor_a', 'parlor', 'mirror5', 17, 3, { dormant: true }), ghoul('parlor_b', 'parlor', 'mirror6', 25, 3, { dormant: true }),
  ghoul('back_a', 'finale', 'mirror7', 32, 3, { dormant: true }), ghoul('back_b', 'finale', 'mirror7', 34, 3, { dormant: true }),
  ghoul('back_c', 'finale', 'mirror8', 36, 3, { dormant: true }), ghoul('back_d', 'finale', 'mirror8', 38, 3, { dormant: true }),
  ghoul('back_e', 'finale', 'mirror9', 40, 3, { dormant: true }), ghoul('back_f', 'finale', 'mirror9', 41, 3, { dormant: true, elite: true }),
  ghoul('back_g', 'finale', 'mirror9', 42, 3, { dormant: true }),
];

// ---------------------------------------------------------------- items
// Four Eggos (the neighbor's front yard on the street, the pantry behind mirror4, the parlor and the back hall), three Cokes and 12
// quarters. The yard's Eggo and the pantry's are side trips; the bot walks past the other two.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 6, 25), item('eggo2', 'eggo', 16, 10), item('eggo3', 'eggo', 15, 5), item('eggo4', 'eggo', 30, 4),
  item('coke1', 'coke', 30, 35), item('coke2', 'coke', 36, 27), item('coke3', 'coke', 30, 10),
  item('q01', 'quarter', 12, 38), item('q02', 'quarter', 19, 38), item('q03', 'quarter', 27, 36), item('q04', 'quarter', 12, 28),
  item('q05', 'quarter', 41, 30), item('q06', 'quarter', 22, 23), item('q07', 'quarter', 36, 18), item('q08', 'quarter', 17, 11),
  item('q09', 'quarter', 30, 18), item('q10', 'quarter', 43, 11), item('q11', 'quarter', 19, 6), item('q12', 'quarter', 44, 3),
];

// ---------------------------------------------------------------- props
// lights_club hangs at the club's board, lights_yard in the grass by the porch and lights_hall at the hall's west end, between the
// parlor's doorway and the pantry's wall. The two gates are doorway mirrors, 32 by 16, in the face row of the wall between a room and the
// room behind it: mirror1 between the foyer and the hall, mirror4 between the dining room and the pantry. The other seven mirrors hang
// on walls, and clock1 stands against the parlor's north wall, 16 by 32. door_back is the way out of the back hall, shut until the clear.
const PROPS: SimSpawn[] = [
  lights('lights_club', 2, 34), lights('lights_yard', 32, 22), lights('lights_hall', 20, 11),
  prop('mirror1', 'mirror', 40, 14, 32, 16, { hitBy: 'riff', solid: true }),
  prop('mirror4', 'mirror', 15, 14, 32, 16, { hitBy: 'riff', solid: true }),
  wallMirror('mirror2', 33, 8), wallMirror('mirror3', 39, 8), wallMirror('mirror5', 17, 2), wallMirror('mirror6', 25, 2),
  wallMirror('mirror7', 33, 2), wallMirror('mirror8', 37, 2), wallMirror('mirror9', 41, 2),
  prop('clock1', 'clock', 21, 2, 16, 32, { hitBy: 'riff', solid: true, hits: 3 }),
  prop('door_back', 'door', 46, 4, 16, 32, { solid: true }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

// ---------------------------------------------------------------- the pools of light
// The candles on the D&D table light themselves, and so do the lights props once lit. These are the rest: the storm's cold light on the
// club's floor, the street lamps, the school hall's one lit bulb over the trophy case, the porch, and the moon through the Creel House's
// boarded windows, a pale patch of floor below each.
const T = 16;
const lamp = (tx: number, ty: number, r: number, flicker: number): LightSource => ({ x: Math.round((tx + 0.5) * T), y: Math.round((ty + 0.5) * T), r, flicker });
export const LIGHTS: LightSource[] = [
  // The club: the table's candles and the window's storm.
  lamp(8, 36, 52, 0.5), lamp(9.5, 34, 34, 0.6),
  // The school hall: a bulb over the trophy case, and the doors out.
  lamp(24.5, 34, 40, 0.3), lamp(33, 34, 36, 0.1),
  // Hawkins at night: the street lamps, a failing one among them.
  lamp(8, 27, 44, 0.1), lamp(22, 27, 44, 0.45), lamp(30, 27, 44, 0.1), lamp(44, 27, 44, 0.1),
  lamp(3, 31, 44, 0.1), lamp(16, 31, 44, 0.1), lamp(27, 31, 44, 0.3), lamp(38, 31, 44, 0.1),
  // The porch.
  lamp(38, 22, 40, 0.3),
  // The house, by moonlight: the parlor, the back hall, the hall, the dining room and the foyer.
  lamp(15, 2, 28, 0.05), lamp(23, 2, 28, 0.05), lamp(31, 2, 28, 0.05), lamp(39, 2, 28, 0.05), lamp(43, 2, 28, 0.05),
  lamp(29, 8, 28, 0.05), lamp(36, 8, 28, 0.05), lamp(43, 8, 28, 0.05), lamp(18, 14, 28, 0.05), lamp(30, 14, 28, 0.05),
  lamp(37, 14, 28, 0.05),
];
