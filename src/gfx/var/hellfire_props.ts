// What sits in the Hellfire Club room over the tiles (hellfire.ts, stage 4.2): the D&D table (desks pushed together under a
// cloth, a dungeon map with minis on it, dice, character sheets, a can of soda, and candles when a look wants them), the club's
// banner (a red horned demon on black), the DM screen, six chairs, a wall clock, an AV cart, and the people: Eddie standing at the head of
// the table and Mike and Dustin seated either side, drawn the way the game draws them (as `actor` props, so the night pass
// leaves them). hellfireLook() turns a look's kits into a StageLook; hellfire_a.ts and hellfire_b.ts only hold the colors.
import type { ColorName as N } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { DUSTIN, MIKE } from '../data/heroes.ts';
import type { CharSpec } from '../data/types.ts';
import { Px } from '../px.ts';
import { FRAMES, FW, eddieFrame } from './eddie_kit.ts';
import type { EddieOpt, FrameDef } from './eddie_kit.ts';
import { EDDIE_OPTS } from './eddie_opts.ts';
import { paintRoles } from './kit.ts';
import type { Light, Prop, StageLook } from './look_kit.ts';
import { tiler } from './hellfire_paint.ts';
import type { Parts } from './hellfire_paint.ts';

export interface TableKit {
  cloth: N; clothHi: N; clothLo: N; trim: N;
  paper: N; paperLo: N; line: N; room: N;
  minis: N[]; boss: N; die: N; dieHi: N; can: N; sheet: N;
}
export interface BannerKit { field: N; face: N; teeth: N; eye: N; trim: N; rod: N }
export interface ScreenKit { panel: N; hi: N; lo: N; art: N; art2: N }
export interface ChairKit { back: N; backHi: N; seat: N; seatHi: N; seatLo: N; leg: N }
export interface ClockKit { rim: N; face: N; hand: N; tick: N }
export interface CartKit { body: N; hi: N; lo: N; glass: N; leg: N }

/** The table's top left on the room (its cloth, not counting the outline), and where Eddie stands at its head. */
export const TABLE_X = 100, TABLE_Y = 52;

// ---------------------------------------------------------------- the table
const ROOMS: [number, number, number, number][] = [[11, 16, 9, 7], [30, 16, 13, 8], [19, 31, 11, 8], [35, 32, 9, 7]];
const MINI: [number, number][] = [[12, 17], [16, 17], [21, 33], [25, 33]];
const CANDLES: [number, number][] = [[4, 12], [50, 11], [4, 37], [50, 37], [28, 45]];

function mini(t: Px, x: number, y: number, c: N): void {
  t.set(x + 1, y, 'skin0').rect(x, y + 1, 3, 2, c).rect(x, y + 3, 3, 1, 'ink');
}

/** The table seen from the south and above: a cloth over its top, a ribbed skirt below, outlined. 58 by 64. */
export function table(k: TableKit, phase: number): Px {
  const t = new Px(56, 62);
  t.rect(0, 0, 56, 52, k.cloth).rect(0, 0, 56, 1, k.clothHi).rect(0, 0, 1, 52, k.clothHi).rect(55, 1, 1, 51, k.clothLo).frame(2, 2, 52, 48, k.trim);
  t.rect(0, 52, 56, 10, k.cloth).rect(0, 52, 56, 1, k.clothLo);
  for (let x = 0; x < 56; x++) { const m = x % 8; t.rect(x, 53, 1, 7, m < 2 ? k.clothHi : m < 5 ? k.cloth : k.clothLo); }
  t.rect(0, 60, 56, 2, k.trim);
  // the dungeon map
  t.rect(9, 14, 40, 30, k.paperLo).rect(8, 13, 40, 30, k.paper);
  for (let y = 15; y < 42; y += 4) for (let x = 10; x < 46; x += 4) t.set(x, y, k.paperLo);
  for (const [x, y, w, h] of ROOMS) t.rect(x, y, w, h, k.room).frame(x, y, w, h, k.line);
  t.rect(20, 19, 10, 1, k.line).rect(15, 23, 1, 12, k.line).rect(15, 34, 4, 1, k.line).rect(30, 34, 5, 1, k.line).rect(36, 24, 1, 8, k.line);
  t.set(39, 35, k.trim).set(41, 35, k.trim).set(40, 36, k.trim).set(39, 37, k.trim).set(41, 37, k.trim);
  // the boss, then the party
  t.art(['a.....a', 'aa.a.aa', '.aaaaa.', '..aea..', '..aaa..'], { a: k.boss, e: 'yellow' }, 33, 18).rect(34, 23, 5, 1, 'ink');
  MINI.forEach(([x, y], i) => mini(t, x, y, k.minis[i % k.minis.length] as N));
  // dice, sheets and a can
  for (const [x, y] of [[3, 5], [6, 8]] as const) t.rect(x, y, 3, 3, k.die).rect(x, y, 3, 1, k.dieHi).set(x + 1, y + 1, 'ink');
  t.rect(48, 6, 3, 3, 'red').set(49, 7, 'white').set(48, 6, 'hot');
  t.rect(2, 18, 5, 8, k.sheet).rect(3, 20, 3, 1, k.paperLo).rect(3, 22, 3, 1, k.paperLo).rect(3, 24, 2, 1, k.paperLo);
  t.rect(49, 24, 5, 8, k.sheet).rect(50, 26, 3, 1, k.paperLo).rect(50, 28, 3, 1, k.paperLo).rect(50, 30, 2, 1, k.paperLo);
  t.rect(3, 40, 3, 4, k.can).rect(3, 40, 3, 1, 'bone').rect(3, 42, 3, 1, 'white').rect(50, 40, 3, 4, k.can).rect(50, 40, 3, 1, 'bone').rect(50, 42, 3, 1, 'white');
  return new Px(58, 64).blit(t, 1, 1).outline('ink');
}

/** Where a candle flame is on the room, for a look to put a pool of light on each. */
export const candleSpots = (): [number, number][] => CANDLES.map(([x, y]) => [TABLE_X + x, TABLE_Y + y - 4]);

/** Five candles on the table, drawn as actors so the pools of light don't wash their flames out. The flames sway with the phase. 5 by 13. */
export function candles(wax: N, flame: N, hi: N, phase: number): Prop[] {
  return CANDLES.map(([x, y], i) => {
    const ph = (phase + i) & 3, sway = [0, 1, 0, -1][ph] as number, px = new Px(5, 13), top = 6 + (i & 1);
    px.rect(1, top, 3, 12 - top, wax).rect(1, top, 1, 12 - top, 'bone').set(2, top - 1, 'ink').rect(0, 12, 5, 1, 'ink');
    px.set(2, top - 2, hi).set(2, top - 3, hi).set(1, top - 2, flame).set(3, top - 2, flame).set(2 + sway, top - 4, flame);
    if (ph === 1 || ph === 2) px.set(2 + sway, top - 5, flame);
    return { px, x: TABLE_X + x - 2, y: TABLE_Y + y - 8, actor: true };
  });
}

// ---------------------------------------------------------------- the banner and the DM screen
const DEMON = [
  'r............r', 'rr..........rr', 'rrr.rrrrrr.rrr', '.rrrrrrrrrrrr.', '..rrrrrrrrrr..', '..rreerreerr..',
  '..rrrrrrrrrr..', '...rrrrrrrr...', '...rhrrrrhr...', '....rrrrrr....', '.....rrrr.....',
];
/** The club's banner (24 by 22): a rod, a black cloth with a red horned demon on it, tassels along the bottom. */
export function banner(k: BannerKit): Px {
  const px = new Px(24, 22);
  px.rect(1, 1, 22, 1, k.rod).rect(1, 1, 1, 2, k.rod).rect(22, 1, 1, 2, k.rod);
  px.rect(3, 2, 18, 16, k.field).frame(3, 2, 18, 16, k.trim);
  px.art(DEMON, { r: k.face, e: k.eye, h: k.teeth }, 5, 4);
  for (let x = 4; x < 21; x += 3) px.set(x, 18, k.trim).set(x, 19, k.rod);
  return px.outline('ink');
}

const RUNES = ['a.a.a', '.a.a.', 'aa.aa', 'a...a'];
const D20 = ['..a..', '.aaa.', 'aabaa', '.aaa.', '..a..'];
/** The DM screen (30 by 12): three panels facing the players, a d20 on the middle one, runes on the wings. */
export function screen(k: ScreenKit): Px {
  const s = new Px(28, 10);
  s.rect(0, 1, 9, 8, k.panel).rect(19, 1, 9, 8, k.panel).rect(9, 0, 10, 9, k.panel);
  s.rect(0, 1, 9, 1, k.hi).rect(19, 1, 9, 1, k.hi).rect(9, 0, 10, 1, k.hi).rect(0, 8, 28, 1, k.lo).rect(9, 1, 1, 8, k.lo).rect(18, 1, 1, 8, k.lo);
  s.art(D20, { a: k.art, b: k.art2 }, 11, 2).art(RUNES, { a: k.art2 }, 2, 3).art(RUNES, { a: k.art2 }, 21, 3);
  return new Px(30, 12).blit(s, 1, 1).outline('ink');
}

// ---------------------------------------------------------------- chairs and the clock
/** A plastic school chair seen from the side, its back to the west (flip for the east). 16 by 20. */
function chairSide(k: ChairKit, east: boolean): Px {
  const px = new Px(16, 20);
  px.rect(1, 1, 3, 15, k.back).rect(1, 1, 1, 15, k.backHi).rect(4, 7, 10, 7, k.seat).rect(4, 7, 10, 1, k.seatHi).rect(4, 13, 10, 1, k.seatLo);
  px.rect(2, 16, 1, 3, k.leg).rect(13, 14, 1, 4, k.leg).rect(5, 14, 1, 3, k.leg).outline('ink');
  return east ? new Px(16, 20).blit(px, 0, 0, true) : px;
}
/** A chair pulled up from the south, its back toward us: the seat peeking over the backrest. 16 by 18. */
function chairBack(k: ChairKit): Px {
  const px = new Px(16, 18);
  px.rect(3, 1, 10, 5, k.seat).rect(3, 1, 10, 1, k.seatHi).rect(2, 6, 12, 8, k.back).rect(2, 6, 12, 1, k.backHi).rect(2, 13, 12, 1, k.seatLo);
  px.rect(3, 14, 1, 3, k.leg).rect(12, 14, 1, 3, k.leg);
  return px.outline('ink');
}

/** A round school clock on the wall (14 by 14). The red hand ticks round with the phase. */
function clock(k: ClockKit, phase: number): Px {
  const px = new Px(14, 14);
  px.disc(7, 7, 6, k.rim).disc(7, 7, 4.6, k.face).line(7, 7, 10, 4, k.hand).line(7, 7, 9, 7, k.hand);
  const [x, y] = [[7, 3], [11, 7], [7, 11], [3, 7]][phase & 3] as [number, number];
  px.line(7, 7, x, y, k.tick).set(7, 7, k.hand);
  return px.outline('ink');
}

/** The AV cart (22 by 30): a television on top, a VCR under it, two shelves and wheels. The set is off. */
function cart(k: CartKit): Px {
  const px = new Px(22, 30);
  px.rect(1, 1, 18, 14, k.body).rect(1, 1, 18, 1, k.hi).rect(3, 3, 13, 9, k.lo).rect(4, 4, 11, 7, k.glass).set(5, 5, k.hi).set(6, 5, k.hi).set(5, 6, k.hi).rect(16, 4, 2, 1, k.hi).rect(16, 7, 2, 1, k.lo);
  px.rect(0, 15, 20, 2, k.hi).rect(2, 17, 16, 4, k.body).rect(4, 18, 7, 1, k.lo).set(15, 19, 'red').rect(0, 21, 20, 2, k.hi);
  px.rect(1, 23, 1, 5, k.leg).rect(18, 23, 1, 5, k.leg).set(1, 28, 'ink').set(18, 28, 'ink');
  return px.outline('ink');
}

// ---------------------------------------------------------------- the people
let people: { eddie: Px; mike: Px; dustin: Px } | null = null;
/** A kid from the waist up, seated: the game's side view, the hands empty, an ink line along the cut. */
function seated(spec: CharSpec, flip: boolean): Px {
  const full = paintRoles(composeFrame({ ...spec, weapon: 'none' }, 'side', 'idle', 0), 16, spec.pal);
  const px = new Px(16, 12).blit(full, 0, 0, flip);
  for (let x = 0; x < 16; x++) if (px.get(x, 11)) px.set(x, 11, 'ink');
  return px;
}
function cast(): { eddie: Px; mike: Px; dustin: Px } {
  if (!people) {
    const o = EDDIE_OPTS[0] as EddieOpt;
    people = { eddie: paintRoles(eddieFrame(o, FRAMES[0] as FrameDef), FW, o.spec.pal), mike: seated(MIKE, false), dustin: seated(DUSTIN, true) };
  }
  return people;
}

// ---------------------------------------------------------------- a look
export interface LookSpec {
  slug: string; name: string; note: string; night: boolean;
  glow: readonly [number, number, number];
  lights: readonly Light[];
  tiles: Parts;
  table: TableKit; banner: BannerKit; screen: ScreenKit; chair: ChairKit; clock: ClockKit; cart: CartKit;
  /** Anything only this look has, drawn after the common props. */
  extra?: (phase: number) => Prop[];
}

/** The props in the order room.props names them (table, banner, screen, Eddie, Mike, Dustin), then the chairs, the clock, the AV cart and the look's own. */
export function hellfireLook(s: LookSpec): StageLook {
  const { eddie, mike, dustin } = cast();
  return {
    slug: s.slug, name: s.name, note: s.note, night: s.night, glow: s.glow, lights: s.lights, tile: tiler(s.tiles),
    props: (phase): Prop[] => [
      { px: table(s.table, phase), x: TABLE_X - 1, y: TABLE_Y - 1 },
      { px: banner(s.banner), x: 116, y: 14 },
      { px: screen(s.screen), x: 113, y: 51 },
      { px: eddie, x: 114, y: 31, actor: true },
      { px: mike, x: 84, y: 77, actor: true },
      { px: dustin, x: 156, y: 53, actor: true },
      { px: chairSide(s.chair, false), x: 82, y: 56 }, { px: chairSide(s.chair, false), x: 82, y: 80 },
      { px: chairSide(s.chair, true), x: 158, y: 56 }, { px: chairSide(s.chair, true), x: 158, y: 80 },
      { px: chairBack(s.chair), x: 108, y: 114 }, { px: chairBack(s.chair), x: 132, y: 114 },
      { px: clock(s.clock, phase), x: 193, y: 17 },
      { px: cart(s.cart), x: 198, y: 74 },
      ...(s.extra?.(phase) ?? []),
    ],
  };
}
