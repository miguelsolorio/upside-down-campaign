// The Hellfire Club (stage 4.2), the owner's pick: Storm (gfx/var/hellfire_b.ts, docs/level-11.md). A Hawkins High classroom after hours, in a
// thunderstorm: painted cinder block under a dark wall top, a chalkboard three tiles wide with the club's doodles, posters (a run of two
// or more is the club's banner, a red horned demon on black), two-tile windows with rain sliding down the glass and a bolt of lightning
// now and then, the door with its little window, a bookcase of rule books, linoleum with the window light lying on it, and student desks
// with their chairs. In the middle the D&D table: the desks pushed together under a black cloth with a blood red trim, the dungeon map with
// its minis and dice, the DM screen at the head and five candles round it, which are the room's only warm light (litWindow in night.ts gives
// each its pool) and sway in four steps. The tiles are the sheet's own painters, called through the look the sheet has (the letters it
// reads are in LETTER); the banner and the table are made here, because they are one picture over a run of tiles, the way the camp's drift
// and the mall's fountain are (tiles.ts hands each tile its place in the run). The window and the floor under it are pulse tiles: the
// window's step is `windowPhase`, 0 the flash and 1 to 3 the rain, and the baked stage holds step 1. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2, px32 } from './canvas.ts';
import type { ColorName as N } from './palette.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { HELLFIRE_B } from './var/hellfire_b.ts';
import type { StageLook, TC } from './var/look_kit.ts';

export const CLUB_TILES: TileName[] = ['clubcap', 'clubwall', 'clubboard', 'clubposter', 'clubwindow', 'clubdoor', 'clubshelf', 'clubfloor', 'clubdesk', 'dndtable'];

/** The letters the sheet's painters read the room by: # wall top, W wall, C chalkboard, P poster, w window, D door, S bookcase, . floor, d desk. T is the table. */
const LETTER: Partial<Record<TileName, string>> = {
  clubcap: '#', clubwall: 'W', clubboard: 'C', clubposter: 'P', clubwindow: 'w', clubdoor: 'D', clubshelf: 'S', clubfloor: '.', clubdesk: 'd', dndtable: 'T',
};
const letter = (n: TileName): string => LETTER[n] ?? '.';

/** The step the window shows at world frame t: 0 is the lightning flash, 1 to 3 the rain. A flash is a double one every 7 s or so; calm (Reduce flashing) never flashes. */
export function windowPhase(t: number, calm = false): number {
  const n = (t / 16) | 0;
  return !calm && (n % 28 === 0 || n % 28 === 2) ? 0 : 1 + (n % 3);
}

/** What the sheet's Storm look is, to paint its letters with. */
const STORM = HELLFIRE_B.find((l) => l.slug === 'storm') as StageLook;

function tcOf(c: TileCtx, name: TileName): TC {
  return { ch: letter(name), tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 11) & 3, n: letter(c.near.n), s: letter(c.near.s), e: letter(c.near.e), w: letter(c.near.w) };
}

// ---------------------------------------------------------------- the banner
/** The club's red horned demon, 14 by 11: r the face, e the eyes, h the teeth. */
const DEMON = [
  'r............r', 'rr..........rr', 'rrr.rrrrrr.rrr', '.rrrrrrrrrrrr.', '..rrrrrrrrrr..', '..rreerreerr..',
  '..rrrrrrrrrr..', '...rrrrrrrr...', '...rhrrrrhr...', '....rrrrrr....', '.....rrrr.....',
];

/** The banner over a run of n posters, one piece of it: a rod across the top, a black cloth with a dark red border, the demon in the middle and tassels along the foot. */
function banner(c: TileCtx, blk: NonNullable<TileCtx['blk']>, phase: number): Px {
  const px = STORM.tile(tcOf(c, 'clubwall'), phase), W = blk.w * 16, ox = blk.ox * 16;
  const part = new Px(W, 16);
  part.rect(0, 1, W, 1, 'soil2').rect(0, 0, W, 1, 'soil3').rect(0, 1, 1, 2, 'soil2').rect(W - 1, 1, 1, 2, 'soil2');
  part.rect(2, 2, W - 4, 13, 'ink').frame(2, 2, W - 4, 13, 'blood0');
  part.art(DEMON, { r: 'blood1', e: 'orange', h: 'grey3' }, (W - 14) >> 1, 3);
  for (let x = 4; x < W - 4; x += 3) part.set(x, 15, 'blood0');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = part.get(ox + x, y); if (v) px.d[y * 16 + x] = v; }
  return px;
}

// ---------------------------------------------------------------- the D&D table
interface TableKit { cloth: N; hi: N; lo: N; trim: N; paper: N; paperLo: N; line: N; room: N; minis: N[]; boss: N; die: N; dieHi: N; can: N; sheet: N }
const KIT: TableKit = {
  cloth: 'black', hi: 'blood0', lo: 'ink', trim: 'blood1', paper: 'soil3', paperLo: 'soil2', line: 'soil0', room: 'soil2',
  minis: ['red', 'blue', 'amber', 'pink'], boss: 'pine2', die: 'bone', dieHi: 'white', can: 'red', sheet: 'bone',
};
const RUNES = ['a.a.a', '.a.a.', 'aa.aa', 'a...a'];
const D20 = ['..a..', '.aaa.', 'aabaa', '.aaa.', '..a..'];

/** A candle on the cloth, its base at (x, y): cream wax, a wick, and a flame that sways with the phase. The only yellow in the table is a flame (flameAt). */
function candle(px: Px, x: number, y: number, phase: number): void {
  const sway = [0, 1, 0, -1][phase & 3] as number, tall = phase === 1 || phase === 2;
  px.rect(x + 1, y - 5, 3, 5, 'cream').rect(x + 1, y - 5, 1, 5, 'bone').rect(x, y, 5, 1, 'ink').set(x + 2, y - 6, 'ink');
  px.set(x + 2, y - 7, 'yellow').set(x + 2, y - 8, 'yellow').set(x + 1, y - 7, 'orange').set(x + 3, y - 7, 'orange').set(x + 2 + sway, y - 9, 'orange');
  if (tall) px.set(x + 2 + sway, y - 10, 'orange');
}

function mini(px: Px, x: number, y: number, col: N): void {
  px.set(x + 1, y, 'skin0').rect(x, y + 1, 3, 2, col).rect(x, y + 3, 3, 1, 'ink');
}

/**
 * The whole table over w by h tiles, with the cloth seen from above and the skirt along the south edge, outlined: a dungeon map with
 * rooms, a boss and four minis, dice, character sheets and cans, the DM screen at the head (from three tiles deep), and five candles: one at
 * each corner of the cloth and one at the front (a table only two tiles deep has no room for the two at the front corners).
 */
function tablePx(w: number, h: number, phase: number): Px {
  const W = w * 16, H = h * 16, k = KIT, t = new Px(W, H);
  t.rect(1, 1, W - 2, H - 10, k.cloth).rect(1, 1, W - 2, 1, k.hi).rect(1, 1, 1, H - 10, k.hi).rect(W - 2, 2, 1, H - 11, k.lo).frame(3, 3, W - 6, H - 14, k.trim);
  t.rect(1, H - 9, W - 2, 8, k.cloth).rect(1, H - 9, W - 2, 1, k.lo);
  for (let x = 1; x < W - 1; x++) { const m = x % 8; t.rect(x, H - 8, 1, 5, m < 2 ? k.hi : m < 5 ? k.cloth : k.lo); }
  t.rect(1, H - 3, W - 2, 2, k.trim);
  const head = h >= 3, my = head ? 13 : 6, mx = 8, mw = W - 16, mh = H - 10 - my - (head ? 3 : 2);
  // The dungeon map: paper with a grid of dots, rooms, passages, a boss in the biggest room and the party in the others.
  t.rect(mx + 1, my + 1, mw, mh, k.paperLo).rect(mx, my, mw, mh, k.paper);
  for (let y = my + 2; y < my + mh - 1; y += 4) for (let x = mx + 2; x < mx + mw - 1; x += 4) t.set(x, y, k.paperLo);
  const room = (rx: number, ry: number, rw: number, rh: number): void => { t.rect(mx + rx, my + ry, rw, rh, k.room).frame(mx + rx, my + ry, rw, rh, k.line); };
  const rw = Math.max(6, (mw / 3) | 0), rh = Math.max(5, (mh / 2.4) | 0);
  room(3, 2, rw, rh);
  room(mw - rw - 3, mh - rh - 2, rw + 2, rh);
  if (mw >= 28) room(((mw - rw) >> 1) + 2, mh - rh - 2, rw - 1, rh);
  t.rect(mx + 3 + rw, my + 2 + (rh >> 1), mw - rw * 2 - 8, 1, k.line).rect(mx + mw - rw - 4, my + 2 + (rh >> 1), 1, mh - rh - 4, k.line);
  t.art(['a.....a', 'aa.a.aa', '.aaaaa.', '..aea..', '..aaa..'], { a: k.boss, e: 'orange' }, mx + mw - rw - 1, my + mh - rh).rect(mx + mw - rw + 0, my + mh - rh + 5, 5, 1, 'ink');
  k.minis.forEach((m, i) => mini(t, mx + 4 + ((i * (rw - 3)) % (rw - 1)), my + 3 + (i & 1) * 3, m));
  // Dice, sheets and cans along the edges of the cloth, clear of the candles.
  t.rect(5, my + 4, 3, 3, k.die).rect(5, my + 4, 3, 1, k.dieHi).set(6, my + 5, 'ink');
  t.rect(W - 8, my + 2, 3, 3, 'red').set(W - 7, my + 3, 'white').set(W - 8, my + 2, 'hot');
  t.rect(W - 8, my + 9, 4, 6, k.sheet).rect(W - 7, my + 11, 2, 1, k.paperLo).rect(W - 7, my + 13, 2, 1, k.paperLo);
  t.rect(5, my + mh - 6, 3, 4, k.can).rect(5, my + mh - 6, 3, 1, 'bone').rect(5, my + mh - 4, 3, 1, 'white');
  if (head) {
    const sx = (W - 28) >> 1, p = { panel: 'soil1', hi: 'soil2', lo: 'soil0', art: 'blood1', art2: 'soil3' } as const;
    t.rect(sx, 3, 28, 8, p.panel).rect(sx, 3, 9, 8, p.panel).rect(sx + 19, 3, 9, 8, p.panel).rect(sx, 3, 28, 1, p.hi).rect(sx, 10, 28, 1, p.lo).rect(sx + 9, 3, 1, 8, p.lo).rect(sx + 18, 3, 1, 8, p.lo);
    t.art(D20, { a: p.art, b: p.art2 }, sx + 11, 4).art(RUNES, { a: p.art2 }, sx + 2, 5).art(RUNES, { a: p.art2 }, sx + 21, 5);
  }
  const spots: [number, number][] = [[4, 11], [W - 9, 11], [(W >> 1) - 2, H - 12]];
  if (head) spots.push([4, H - 12], [W - 9, H - 12]);
  for (const [cx, cy] of spots) candle(t, cx, cy, phase);
  return t.outline('ink');
}

const tables = new Map<string, Px>();

/** The piece of the table a tile of a block of w by h shows, over the floor it stands on. */
function tableTile(c: TileCtx, phase: number): Px {
  const b = c.blk ?? { ox: 0, oy: 0, w: 1, h: 1 }, key = `${b.w}x${b.h}:${phase & 3}`;
  let t = tables.get(key);
  if (!t) { t = tablePx(b.w, b.h, phase); tables.set(key, t); }
  const px = STORM.tile(tcOf(c, 'clubfloor'), 1);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = t.get(b.ox * 16 + x, b.oy * 16 + y); if (v) px.d[y * 16 + x] = v; }
  return px;
}

/** True when a table tile has a flame in it: a pool of light goes on its foot at night (litWindow in night.ts). */
export function flameAt(day: Px): boolean {
  return day.d.includes(px32('yellow'));
}

/** A club tile, or null when `name` isn't one. phase is the step of whatever moves: the window's (see windowPhase, 1 is the rain the stage is baked with), the candles' sway. */
export function clubTile(name: TileName, c: TileCtx, phase = name === 'dndtable' ? 0 : 1): Px | null {
  if (name === 'dndtable') return tableTile(c, phase);
  if (name === 'clubposter' && c.blk && c.blk.w >= 2) return banner(c, c.blk, phase);
  return LETTER[name] ? STORM.tile(tcOf(c, name), phase) : null;
}

/** Tiles of the club that move: the window, the floor under it, which the light from the glass falls on, and the table, whose candles sway. */
export function clubPulses(name: TileName, near: Near): boolean {
  return name === 'clubwindow' || name === 'dndtable' || (name === 'clubfloor' && near.n === 'clubwindow');
}

/** The club's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function clubNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  const run = (self: TileName, floor: TileName, wall: TileName): Near => v === 0 ? { n: wall, e: self, s: floor, w: self } : v === 1 ? { n: wall, e: self, s: floor, w: floor } : { n: wall, e: floor, s: floor, w: self };
  switch (name) {
    case 'clubcap': return v === 0 ? all(name) : v === 1 ? { n: 'clubfloor', e: name, s: 'clubwall', w: name } : { n: 'clubfloor', e: 'clubfloor', s: 'clubwall', w: name };
    case 'clubwall': return v === 0 ? { n: 'clubcap', e: name, s: 'clubfloor', w: name } : v === 1 ? { n: 'clubcap', e: 'clubdoor', s: 'clubfloor', w: name } : { n: 'clubcap', e: name, s: 'clubfloor', w: 'clubshelf' };
    case 'clubboard': case 'clubwindow': case 'clubshelf': case 'clubdoor': case 'clubposter': return run(name, 'clubfloor', 'clubcap');
    case 'clubfloor': return v === 0 ? all(name) : v === 1 ? { n: 'clubwall', e: name, s: name, w: name } : { n: 'clubwindow', e: name, s: name, w: name };
    case 'clubdesk': return all('clubfloor');
    default: return near;
  }
}
