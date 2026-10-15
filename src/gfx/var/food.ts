// The kit under foodcourt-variations.html (docs/level-9.md): a look is one painter per new tile of stage 3.3 (`foodfloor`, `foodband`,
// `skyfloor`, `stallcap`, `stall`, `kitchenfloor`, `fryer`, `escalator`) plus the table and the goo, each taking the same context the
// mall looks take (MC) and returning a 16 by 16 tile, so the picked look drops into the game's tile_food.ts as it is. This file builds
// the three sample rooms from them (a corner of the arena, a kitchen, a run of escalator), puts them through the game's night art
// (night.ts) the way a night stage does, and lays the dithered pools of light round the menu boards, the skylight's moon, the fryers and
// the goo (glow.ts's steps), beside the Confetti mall's own tiles for continuity. Pure pixel work: no DOM until a Px becomes a canvas.
import { BAYER4, hash2 } from '../canvas.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import { gooTile } from '../paint_kit.ts';
import type { MC, Pt } from '../paint_kit.ts';
import { CONFETTI_MALL } from './mall_confetti.ts';

export type { MC } from '../paint_kit.ts';
export type { Pt } from '../paint_kit.ts';
export type FoodPaint = (c: MC) => Px;
type Rgb = readonly [number, number, number];

/** The look's painters, one per tile name, plus the table and the goo that lie on the floor. */
export interface FoodSet {
  foodfloor: FoodPaint; foodband: FoodPaint; skyfloor: FoodPaint; stallcap: FoodPaint; stall: FoodPaint;
  kitchenfloor: FoodPaint; fryer: FoodPaint; escalator: FoodPaint; table: FoodPaint; goo: FoodPaint;
}
export interface Pool { r: number; k: number; tint: Rgb }
export interface FoodLook {
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  set: FoodSet;
  /** Pools of light at night: the stalls' menu boards, the moon through the skylight, the fryers, the goo, the escalator's head. */
  lights: Partial<Record<'board' | 'sky' | 'fryer' | 'goo' | 'escalator', Pool>>;
}

/** The goo is the mall's own (Confetti): the Flayers' mess is the same wherever it spreads. */
export const gooPaint: FoodPaint = (c) => gooTile(c, { body: 'purple', rim: 'ink', hi: 'magenta', spec: 'yellow', seed: 0.4 });

// ---------------------------------------------------------------- the rooms
/** M mall cap, W mall wall, C stall cap, S stall, = band, . floor, o skylight floor, T table, g goo. */
export const ARENA = [
  'MCCCCCCCCCCCCC',
  'WSSSSSSSSSSSSS',
  'W=============',
  'W=.T.......T..',
  'W=..oooooo....',
  'W=..oooooo.T..',
  'W=T.oooooo....',
  'W=.......ggg.T',
  'W=......ggggg.',
];
/** k kitchen floor, F fryer. */
export const KITCHEN = ['MMMMMMMM', 'WWWWWWWW', 'kFFFFFFk', 'kkkkkkkk', 'kFFkkFFk', 'kkkkkkkk'];
/** f the mall's floor, R railing, E escalator. */
export const ESCALATOR = ['fREERf', 'fREERf', 'fREERf', 'fREERf', 'fREERf', 'fREERf'];
export const TILE = 16;

const SOLID = new Set(['M', 'W', 'C', 'S', 'F', 'R']);
const FACE = new Set(['W', 'S']);
type Room = readonly string[];
const at = (room: Room, x: number, y: number): string | undefined => room[y]?.[x];

function ctxAt(room: Room, tx: number, ty: number): MC {
  const ch = at(room, tx, ty), n = at(room, tx, ty - 1), s = at(room, tx, ty + 1), e = at(room, tx + 1, ty), w = at(room, tx - 1, ty);
  const sol = (c: string | undefined): boolean => c === undefined || SOLID.has(c);
  return { tx, ty, v: hash2(tx, ty, 7) & 3, sN: sol(n), sS: sol(s), sE: sol(e), sW: sol(w), kN: n === ch, kS: s === ch, kE: e === ch, kW: w === ch, lipS: FACE.has(s ?? '') };
}

/** The mall's railing, Confetti's: a magenta rail on pink posts. The sheet's own, since the game's lives in tile_mall.ts. */
function railing(c: MC): Px {
  const px = new Px(16);
  px.rect(0, 5, 16, 1, 'ink').rect(0, 6, 16, 2, 'magenta').rect(0, 6, 16, 1, 'pink').rect(0, 13, 16, 2, 'purple').rect(0, 14, 16, 1, 'ink');
  for (let x = 1; x < 16; x += 4) px.rect(x, 8, 2, 5, 'purple0').set(x, 8, 'pink');
  if (!c.kS) px.rect(0, 15, 16, 1, 'ink');
  return px;
}

const cache = new Map<string, Px>();
function made(look: FoodLook, key: string, make: () => Px): Px {
  const k = `${look.slug}|${key}`;
  let p = cache.get(k);
  if (!p) { p = nightSprite(make()); cache.set(k, p); }
  return p;
}
const ckey = (c: MC): string => `${c.v}${+c.sN}${+c.sS}${+c.sE}${+c.sW}${+c.kN}${+c.kS}${+c.kE}${+c.kW}${+c.lipS}${c.tx & 1}${c.ty & 1}`;

/** One room's tile, in the look's art, at night. */
function tileAt(look: FoodLook, room: Room, tx: number, ty: number): Px {
  const ch = at(room, tx, ty) as string, c = ctxAt(room, tx, ty), k = ckey(c), s = look.set, m = CONFETTI_MALL;
  const put = (name: string, paint: (c: MC) => Px): Px => made(look, name + k, () => paint(c));
  const over = (floor: string, paint: (c: MC) => Px, name: string): Px => new Px(16).blit(put(floor === 'f' ? 'mf' : 'ff', floor === 'f' ? m.floor : s.foodfloor), 0, 0).blit(put(name, paint), 0, 0);
  switch (ch) {
    case 'M': return made(look, `mcap${k}`, () => m.cap({ ...c, lipS: true }));
    case 'W': return put('mwall', m.wall);
    case 'C': return put('stallcap', s.stallcap);
    case 'S': return put('stall', s.stall);
    case '=': return put('band', s.foodband);
    case 'o': return put('sky', s.skyfloor);
    case 'k': return put('kf', s.kitchenfloor);
    case 'F': return put('fryer', s.fryer);
    case 'E': return put('esc', s.escalator);
    case 'T': return over('o', s.table, 'table');
    case 'g': return over('o', s.goo, 'goo');
    case 'R': return over('f', railing, 'rail');
    case 'f': return put('mf', m.floor);
    default: return put('ff', s.foodfloor);
  }
}

/** Dithered light pools in four steps, lifting every pixel by a whole step, as glow.ts does; each light adds its own tint. */
function pools(px: Px, lights: readonly [number, number, number, number, Rgb][]): void {
  const step = new Uint8Array(px.w * px.h), who = new Uint8Array(px.w * px.h);
  const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
  lights.forEach(([lx, ly, R, str], li) => {
    for (let y = Math.max(0, ly - R); y < Math.min(px.h, ly + R); y++) {
      for (let x = Math.max(0, lx - R); x < Math.min(px.w, lx + R); x++) {
        const d = Math.hypot(x - lx, y - ly);
        if (d >= R) continue;
        const f = 1 - d / R, q = f * f * (3 - 2 * f) * str * 4, lo = Math.floor(q);
        const s = Math.min(4, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        if (s > (step[y * px.w + x] as number)) { step[y * px.w + x] = s; who[y * px.w + x] = li; }
      }
    }
  });
  for (let i = 0; i < px.d.length; i++) {
    const s = step[i] as number, v = px.d[i] as number;
    if (!s || !v) continue;
    const lift = LIFT[s] as number, tint = (lights[who[i] as number] as [number, number, number, number, Rgb])[4];
    const r = Math.min(255, (v & 255) * (1 + lift) + tint[0] * lift * 0.2), g = Math.min(255, ((v >> 8) & 255) * (1 + lift) + tint[1] * lift * 0.2), b = Math.min(255, ((v >> 16) & 255) * (1 + lift) + tint[2] * lift * 0.2);
    px.d[i] = ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
  }
}

/** Every position of a kind in a room. */
const where = (room: Room, ch: string): [number, number][] => room.flatMap((row, y) => [...row].map((c, x) => (c === ch ? [x, y] as [number, number] : null)).filter((p): p is [number, number] => p !== null));

export type RoomName = 'arena' | 'kitchen' | 'escalator';
const ROOMS: Record<RoomName, Room> = { arena: ARENA, kitchen: KITCHEN, escalator: ESCALATOR };

/** A sample room of a look at night, with its pools of light. */
export function foodRoom(look: FoodLook, name: RoomName): Px {
  const room = ROOMS[name], out = new Px(room[0]!.length * TILE, room.length * TILE);
  room.forEach((row, ty) => { for (let tx = 0; tx < row.length; tx++) out.blit(tileAt(look, room, tx, ty), tx * TILE, ty * TILE); });
  const L = look.lights, lights: [number, number, number, number, Rgb][] = [];
  const add = (list: [number, number][], p: Pool | undefined, dx = 8, dy = 8): void => { if (p) for (const [x, y] of list) lights.push([x * TILE + dx, y * TILE + dy, p.r, p.k, p.tint]); };
  if (name === 'arena') {
    add(where(room, 'S').filter(([x]) => x % 3 === 1), L.board, 8, 6);
    const sky = where(room, 'o');
    if (L.sky) lights.push([Math.round((sky.reduce((s, [x]) => s + x, 0) / sky.length) * TILE + 8), Math.round((sky.reduce((s, [, y]) => s + y, 0) / sky.length) * TILE + 8), L.sky.r, L.sky.k, L.sky.tint]);
    add(where(room, 'g').filter(([x, y]) => (x + y) % 3 === 0), L.goo, 8, 8);
  } else if (name === 'kitchen') add(where(room, 'F').filter(([x]) => x % 2 === 1), L.fryer, 8, 6);
  else if (L.escalator) { lights.push([3 * TILE, 8, L.escalator.r, L.escalator.k, L.escalator.tint]); }
  pools(out, lights);
  return out;
}

/** The tiles one by one, at night in the look's own art: a name and a picture, then the Confetti mall's for continuity. */
export function foodLegend(look: FoodLook): { name: string; px: Px; mall?: boolean }[] {
  const c: MC = { tx: 3, ty: 4, v: 1, sN: false, sS: false, sE: false, sW: false, kN: false, kS: false, kE: false, kW: false, lipS: false };
  const s = look.set, m = CONFETTI_MALL;
  const mk = (key: string, fn: () => Px): Px => made(look, `L${key}`, fn);
  const onFloor = (p: FoodPaint, key: string): Px => mk(key, () => s.foodfloor(c).blit(p(c), 0, 0));
  const row = { ...c, kE: true, kW: false, sN: false };
  return [
    { name: 'FOODFLOOR', px: mk('ff', () => s.foodfloor(c)) }, { name: 'FOODBAND', px: mk('fb', () => s.foodband(c)) }, { name: 'SKYFLOOR', px: mk('sf', () => s.skyfloor(c)) },
    { name: 'STALLCAP', px: mk('sc', () => s.stallcap({ ...c, sN: true })) }, { name: 'STALL', px: mk('st', () => s.stall(c)) }, { name: 'STALL', px: mk('st2', () => s.stall({ ...c, v: 3 })) },
    { name: 'KITCHEN', px: mk('kf', () => s.kitchenfloor(c)) }, { name: 'FRYER', px: mk('fr', () => s.fryer(c)) }, { name: 'ESCALATOR', px: mk('es', () => s.escalator(row)) },
    { name: 'TABLE', px: onFloor(s.table, 'tb') }, { name: 'GOO', px: mk('go', () => s.foodfloor(c).blit(s.goo({ ...c, kN: true, kS: true, kE: true, kW: true }), 0, 0)) },
    { name: 'FLOOR', px: mk('mf', () => m.floor(c)), mall: true }, { name: 'BAND', px: mk('mb', () => m.band(c)), mall: true }, { name: 'WALL', px: mk('mw', () => m.wall({ ...c, sN: true })), mall: true },
  ];
}

/** One of four lists of points by tile variant, so a floor's flecks differ from tile to tile. */
export const pickPts = (v: number, ...lists: Pt[][]): Pt[] => lists[v & 3] as Pt[];

/** A menu board's pictograms, 7 by 6, by stall variant: a burger, a slice of pizza, a soda, a cone. Letters map through the look's colors. */
export const GLYPHS: string[][] = [
  ['.aaaaa.', 'aaaaaaa', '.ggggg.', '.ppppp.', 'bbbbbbb', '.bbbbb.'],
  ['ccccccc', '.crrcc.', '.ccrrc.', '..ccc..', '...c...', '.......'],
  ['wwwwwww', '.sssss.', '.swwws.', '.sssss.', '..sss..', '..sss..'],
  ['.ppp...', 'ppppp..', '.ppp...', '.ttt...', '..t....', '.......'],
];
/** Draws a pictogram at a spot. */
export function glyph(px: Px, v: number, x: number, y: number, map: Record<string, Paint>): void { px.art(GLYPHS[v & 3] as string[], map, x, y); }

/** Pixels of the band's edge where a tile of one kind meets another, dithered so the patch's edge is not a hard line. */
export function ditherEdge(px: Px, c: MC, a: Paint, b: Paint): void {
  for (let i = 0; i < 16; i++) {
    for (let d = 0; d < 3; d++) {
      const ok = (BAYER4[((i + d) & 3) * 4 + (d & 3)] as number) / 16 < (3 - d) / 4;
      if (!ok) continue;
      if (!c.kN) px.set(i, d, bayer(i, d) ? a : b);
      if (!c.kS) px.set(i, 15 - d, bayer(i, d) ? a : b);
      if (!c.kW) px.set(d, i, bayer(i, d) ? a : b);
      if (!c.kE) px.set(15 - d, i, bayer(i, d) ? a : b);
    }
  }
}
const bayer = (x: number, y: number): boolean => (BAYER4[(y & 3) * 4 + (x & 3)] as number) > 7;
