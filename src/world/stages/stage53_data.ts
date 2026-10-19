// Stage 5.3, the heart of the Abyss: who and what stands where. Enemies, items, props, the burrows, the final fight's channel and the pools of
// light. Pure data (docs/level-16.md). Coordinates are tiles. A prop's tx, ty is its top-left tile and its w and h are px. The map is in stage53.ts.
import type { Burrow, Dir, EnemyKind, FinaleDef, ItemKind, LightSource, PropKind, SimSpawn, Utility } from '../../core/types.ts';

type Enemy = Extract<SimSpawn, { kind: 'enemy' }>;
interface Foe { dormant?: boolean; dir?: Dir; x?: Record<string, number> }

const foe = (id: string, type: EnemyKind, group: string, tx: number, ty: number, o: Foe = {}): SimSpawn => {
  const e: Enemy = { kind: 'enemy', id, type, tx, ty, group };
  if (o.dormant) e.dormant = true;
  if (o.dir) e.dir = o.dir;
  if (o.x) e.x = o.x;
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

/** Basic attacks from anyone but Dustin and Nancy that wear burn1 down: the fallback when neither is picked (src/combat/props.ts, smashAimed). */
export const CHIP_HITS = 12;

// ---------------------------------------------------------------- the boss
// Phase one is 4.4's Vecna with his four memory orbs (enemies/vecna.ts), at 1.3 times his pace, the clock chiming every 12 s (720 frames), and
// sinking for 64 frames at 0 HP (combat/kills.ts, `sinks`). The orbs stand round him as the rug's corners do in the attic (stage44_data.ts):
// 4 tiles out to each side and 2 above and below his tile, which is (18, 9).
export const VECNA_X = { speedMul: 1.3, chimeEvery: 720, sinkT: 64 } as const;
const ORB_X = [14, 22] as const;
const ORB_Y = [7, 11] as const;
const BOSS: SimSpawn[] = [
  foe('vecna', 'vecna', 'boss', 18, 9, { dormant: true, dir: 'down', x: { ...VECNA_X } }),
  foe('orb1', 'orb', 'boss', ORB_X[0], ORB_Y[0], { dormant: true }), foe('orb2', 'orb', 'boss', ORB_X[1], ORB_Y[0], { dormant: true }),
  foe('orb3', 'orb', 'boss', ORB_X[0], ORB_Y[1], { dormant: true }), foe('orb4', 'orb', 'boss', ORB_X[1], ORB_Y[1], { dormant: true }),
];

// ---------------------------------------------------------------- enemies
// 350 XP before xpMult (docs/level-16.md, "Spawns and the XP budget"): two Flayed (22) and three demobats (18) in the climb, Vecna (150, his orbs
// pay nothing) and the Mind Flayer (160, its four legs pay nothing). The waves of the channel are run-time spawns worth 1 XP each and are not in the
// count. The climb is awake and waits where it stands; Vecna and the spider sleep in the arena until the `vecna` beat starts the fight (Sim.defend),
// and the spider until Vecna is down. Vecna stands in the middle of the arena's north half, the body at the arena's north tip, its legs spread along
// its front (the 3.3 layout in a circle).
const ENEMIES: SimSpawn[] = [
  // The hall: a Flayed and a demobat at each end and one more bat in the middle, the party coming in from the south-east.
  foe('climb_bat1', 'demobat', 'climb', 24, 36), foe('climb_flayed1', 'flayed', 'climb', 20, 35),
  foe('climb_bat2', 'demobat', 'climb', 16, 36), foe('climb_flayed2', 'flayed', 'climb', 13, 35),
  foe('climb_bat3', 'demobat', 'climb', 18, 34),
  // The arena.
  ...BOSS,
  foe('flayer', 'flayer5', 'flayer', 18, 4, { dormant: true, dir: 'down' }),
  foe('leg1', 'leg5', 'flayer', 13, 5, { dormant: true, dir: 'down' }), foe('leg2', 'leg5', 'flayer', 16, 5, { dormant: true, dir: 'down' }),
  foe('leg3', 'leg5', 'flayer', 20, 5, { dormant: true, dir: 'down' }), foe('leg4', 'leg5', 'flayer', 23, 5, { dormant: true, dir: 'down' }),
];

// ---------------------------------------------------------------- items
// Three Eggos and three Cokes before the fight, and ten quarters. Nothing lies in the arena: the bot would walk into the fight for it.
const ITEMS: SimSpawn[] = [
  item('eggo1', 'eggo', 25, 41), item('eggo2', 'eggo', 21, 37), item('eggo3', 'eggo', 15, 29),
  item('coke1', 'coke', 10, 36), item('coke2', 'coke', 20, 29), item('coke3', 'coke', 23, 34),
  item('q01', 'quarter', 20, 41), item('q02', 'quarter', 27, 42), item('q03', 'quarter', 24, 38), item('q04', 'quarter', 14, 36),
  item('q05', 'quarter', 11, 34), item('q06', 'quarter', 25, 35), item('q07', 'quarter', 14, 28), item('q08', 'quarter', 21, 31),
  item('q09', 'quarter', 17, 33), item('q10', 'quarter', 19, 27),
];

// ---------------------------------------------------------------- props
// lights_heart hangs on the antechamber's north wall: the one save point for the whole fight. burn1 is a wall of vines across the corridor
// north of the hall, Dustin's or Nancy's to burn, and anyone's basic attack wears it down, CHIP_HITS of them, for a party with neither. door1 is
// the arena's door, a fold of flesh across the neck: spawned open, shut by the `vecna` beat.
const PROPS: SimSpawn[] = [
  lights('lights_heart', 16, 28),
  prop('burn1', 'vines', 17, 32, 32, 32, { hitBy: 'burn', solid: true, smash: true, hits: CHIP_HITS }),
  prop('door1', 'door', 17, 25, 32, 32, { state: 'open', solid: false }),
];

export const SPAWNS: SimSpawn[] = [...ENEMIES, ...ITEMS, ...PROPS];

/** The heart makes its own light: the pulsing glow is the art's, and the lights prop and the bosses are the sources. */
export const LIGHTS: LightSource[] = [];

// ---------------------------------------------------------------- the channel
// Eight burrows round the arena's rim, left and right in turn, where the channel's waves come up. The marks are left and right of the arena's centre
// (18, 14), five and a half tiles out. The channelers' HP is the lever, as the Gate's ward's was: 380 each, and the waves are sized to what the two heroes
// who are not channeling can hold off. The clock is 40 s.
export const BURROWS: Burrow[] = [
  { tx: 18, ty: 5 }, { tx: 18, ty: 23 }, { tx: 11, ty: 8 }, { tx: 24, ty: 20 }, { tx: 24, ty: 8 }, { tx: 11, ty: 20 }, { tx: 8, ty: 14 }, { tx: 27, ty: 14 },
];

const S = 60;
export const FINALE: FinaleDef = {
  channelers: [{ hero: 'eleven', tx: 12, ty: 14 }, { hero: 'will', tx: 23, ty: 14 }],
  hp: 380, frames: 40 * S,
  waves: [
    { at: 0, n: 2, type: 'demodog' }, { at: 5 * S, n: 1, type: 'flayed' }, { at: 10 * S, n: 2, type: 'demodog' }, { at: 16 * S, n: 3, type: 'demobat' },
    { at: 21 * S, n: 1, type: 'flayed' }, { at: 27 * S, n: 2, type: 'demodog' }, { at: 32 * S, n: 1, type: 'flayed' }, { at: 35 * S, n: 3, type: 'demobat' },
  ],
};
