// The sample rooms for mall-variations.html: a mall room and a base room, 16 by 10 tiles each, painted by a Look (a set of tile
// painters per room) with the game's own Px tools and palette. A look is by day or after closing. After closing, every tile and
// prop goes through the game's night art (night.ts) the way a night stage does, and the neon, the lit windows, the fountain, the
// machine and the like get the same dithered pools of light the game paints round a lamp (glow.ts), so the neon signs are the only
// light. Pure pixel work: no DOM until a Px becomes a canvas.
import { BAYER4, hash2 } from '../canvas.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';

/** What a painter knows about its place: the variant (0 to 3), which neighbors are solid, which are the same kind, and for a cap whether a wall face is right below it. */
export interface MC { tx: number; ty: number; v: number; sN: boolean; sS: boolean; sE: boolean; sW: boolean; kN: boolean; kS: boolean; kE: boolean; kW: boolean; lipS: boolean }
type Paint = (c: MC) => Px;

/** The mall's tiles (tiles.ts, Starcourt) as one look paints them. Planter, counter, goo and fountain may leave the floor showing; the kit lays the floor under them. */
export interface MallSet {
  floor: Paint; band: Paint; cap: Paint; wall: Paint; shop: Paint; shut: Paint; glass: Paint;
  /** 32 by 32: the fountain as a 2 by 2 block. */
  fountain(): Px;
  planter: Paint; scoops: Paint; goo: Paint;
}

/** The base's tiles and props. The machine is a 4 by 2 block (64 by 32), animated by phase. */
export interface BaseSet {
  floor: Paint; grate: Paint; cap: Paint; wall: Paint; ammo: Paint; bunk: Paint; cell: Paint;
  machine(phase: number): Px;
  /** 32 by 16, a door across a two wide opening. */
  cipher(): Px;
  /** 32 by 32, a floor plate. */
  powerbox(lit: boolean): Px;
  /** 16 by 16, a switch on a wall. */
  breaker(lit: boolean): Px;
}

type Glow = readonly [radius: number, strength: number];
type Rgb = readonly [number, number, number];

export interface Look {
  slug: string;
  name: string;
  note: string;
  /** True after closing: the night art and pools of light. False by day: the art as painted. */
  night: boolean;
  mall: MallSet;
  base: BaseSet;
  /** Pools of light, in px radius and strength, by what lights: a lit shop's sign, the glass doors, the fountain, the counter, the band, a ceiling lamp. */
  mallLights: { shop?: Glow; door?: Glow; fountain?: Glow; scoops?: Glow; band?: Glow };
  baseLights: { machine?: Glow; breaker?: Glow; cipher?: Glow; cell?: Glow; wall?: Glow };
  /** The color a pool adds in the mall and in the base, as r, g, b. */
  tint: Rgb;
  baseTint: Rgb;
}

/** # wall (a cap, or a face where the floor is below it), L lit shop, X shut shop, D glass doors, . floor, = band, P planter, F fountain, S counter, g goo. */
export const MALL_ROOM = [
  '################',
  '#LL#XX#DD#LL#XX#',
  '#.P..........P.#',
  '#..............#',
  '#..............#',
  '#==============#',
  '#SSS......FF.g.#',
  '#..P......FF.gg#',
  '#..........gggg#',
  '################',
];

/** # wall, . floor, , grating, A ammo crates, B bunk, C cell, M machine (4 by 2), W power box plate (2 by 2), b breaker, k cipher door (2 wide). */
export const BASE_ROOM = [
  '################',
  '###b#######kk###',
  '#BB..MMMM....CC#',
  '#....MMMM......#',
  '#..............#',
  '#,,,,,,,,,,,,,,#',
  '#AA....WW......#',
  '#A.....WW...AA.#',
  '#..............#',
  '################',
];

export const TILE = 16, COLS = 16, ROWS = 10;
export const ROOM_W = COLS * TILE, ROOM_H = ROWS * TILE;

const FACE = new Set(['L', 'X', 'D', 'b', 'k']);
const SOLID_BASE = new Set(['#', 'L', 'X', 'D', 'b', 'k', 'A', 'B', 'C', 'M', 'P', 'F', 'S']);

type Room = readonly string[];
const at = (room: Room, x: number, y: number): string | undefined => room[y]?.[x];

function ctxAt(room: Room, tx: number, ty: number): MC {
  const ch = at(room, tx, ty), n = at(room, tx, ty - 1), s = at(room, tx, ty + 1), e = at(room, tx + 1, ty), w = at(room, tx - 1, ty);
  const sol = (c: string | undefined): boolean => c === undefined || SOLID_BASE.has(c);
  return {
    tx, ty, v: hash2(tx, ty, 7) & 3, sN: sol(n), sS: sol(s), sE: sol(e), sW: sol(w),
    kN: n === ch, kS: s === ch, kE: e === ch, kW: w === ch, lipS: FACE.has(s ?? ''),
  };
}

const cache = new Map<string, Px>();
function made(look: Look, key: string, make: () => Px): Px {
  const k = `${look.slug}|${key}`;
  let p = cache.get(k);
  if (!p) { p = look.night ? nightSprite(make()) : make(); cache.set(k, p); }
  return p;
}
const ckey = (c: MC): string => `${c.v}${+c.sN}${+c.sS}${+c.sE}${+c.sW}${+c.kN}${+c.kS}${+c.kE}${+c.kW}${+c.lipS}${c.tx & 1}${c.ty & 1}`;

/** Dithered light pools in four steps, lifting every pixel by a whole step, as glow.ts does. */
function pools(px: Px, lights: readonly [number, number, number, number][], tint: Rgb): void {
  const step = new Uint8Array(px.w * px.h);
  const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
  for (const [lx, ly, R, str] of lights) {
    for (let y = Math.max(0, ly - R); y < Math.min(px.h, ly + R); y++) {
      for (let x = Math.max(0, lx - R); x < Math.min(px.w, lx + R); x++) {
        const d = Math.hypot(x - lx, y - ly);
        if (d >= R) continue;
        const f = 1 - d / R, q = f * f * (3 - 2 * f) * str * 4, lo = Math.floor(q);
        const s = Math.min(4, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        if (s > (step[y * px.w + x] as number)) step[y * px.w + x] = s;
      }
    }
  }
  for (let i = 0; i < px.d.length; i++) {
    const s = step[i] as number, v = px.d[i] as number;
    if (!s || !v) continue;
    const lift = LIFT[s] as number;
    const r = Math.min(255, (v & 255) * (1 + lift) + tint[0] * lift * 0.2), g = Math.min(255, ((v >> 8) & 255) * (1 + lift) + tint[1] * lift * 0.2), b = Math.min(255, ((v >> 16) & 255) * (1 + lift) + tint[2] * lift * 0.2);
    px.d[i] = ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
  }
}

/** Every position of a kind in a room. */
function where(room: Room, ch: string): [number, number][] {
  const out: [number, number][] = [];
  room.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); });
  return out;
}

/** Lays a sprite over what is there. */
const over = (dst: Px, src: Px, x: number, y: number): void => { dst.blit(src, x, y); };

/** A quadrant of a bigger sprite, as a tile. */
function crop(src: Px, ox: number, oy: number): Px {
  const out = new Px(TILE);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) out.d[y * TILE + x] = src.get(ox + x, oy + y);
  return out;
}

/** The mall room, at night or by day as the look says. */
export function mallRoom(look: Look): Px {
  const m = look.mall, out = new Px(ROOM_W, ROOM_H);
  MALL_ROOM.forEach((row, ty) => {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx] as string, c = ctxAt(MALL_ROOM, tx, ty);
      const k = ckey(c);
      const put = (name: string, paint: Paint): Px => made(look, `m${name}${k}`, () => paint(c));
      const floor = (): Px => put('floor', m.floor);
      let tile: Px;
      switch (ch) {
        case '#': tile = c.lipS || !c.sS ? (c.lipS ? put('cap', m.cap) : put('wall', m.wall)) : put('cap', m.cap); break;
        case 'L': tile = put('shop', m.shop); break;
        case 'X': tile = put('shut', m.shut); break;
        case 'D': tile = put('glass', m.glass); break;
        case '=': tile = put('band', m.band); break;
        case 'P': tile = floor().blit(put('planter', m.planter), 0, 0); break;
        case 'S': tile = floor().blit(put('scoops', m.scoops), 0, 0); break;
        case 'g': tile = floor().blit(put('goo', m.goo), 0, 0); break;
        case 'F': tile = floor().blit(crop(made(look, 'fountain', () => m.fountain()), (c.kW ? 1 : 0) * TILE, (c.kN ? 1 : 0) * TILE), 0, 0); break;
        default: tile = floor();
      }
      out.blit(tile, tx * TILE, ty * TILE);
    }
  });
  if (look.night) {
    const L = look.mallLights, lights: [number, number, number, number][] = [];
    const add = (list: [number, number][], g: Glow | undefined, dx = 8, dy = 12): void => { if (g) for (const [x, y] of list) lights.push([x * TILE + dx, y * TILE + dy, g[0], g[1]]); };
    add(where(MALL_ROOM, 'L'), L.shop);
    add(where(MALL_ROOM, 'D'), L.door);
    add(where(MALL_ROOM, 'S').filter(([x]) => x === 2), L.scoops, 8, 6);
    add(where(MALL_ROOM, 'F').filter(([x, y]) => x === 10 && y === 6), L.fountain, 16, 16);
    if (L.band) for (const x of [2, 6, 10, 13]) lights.push([x * TILE + 8, 5 * TILE + 8, L.band[0], L.band[1]]);
    pools(out, lights, look.tint);
  }
  return out;
}

/** The base room, at night or by day as the look says. The power box and the breaker are drawn at rest. */
export function baseRoom(look: Look, phase: number, lit = false): Px {
  const b = look.base, out = new Px(ROOM_W, ROOM_H);
  BASE_ROOM.forEach((row, ty) => {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx] as string, c = ctxAt(BASE_ROOM, tx, ty);
      const k = ckey(c);
      const put = (name: string, paint: Paint): Px => made(look, `b${name}${k}`, () => paint(c));
      let tile: Px;
      switch (ch) {
        case '#': tile = c.lipS ? put('cap', b.cap) : (c.sS ? put('cap', b.cap) : put('wall', b.wall)); break;
        case 'b': case 'k': tile = put('wall', b.wall); break;
        case ',': tile = put('grate', b.grate); break;
        case 'A': tile = put('ammo', b.ammo); break;
        case 'B': tile = put('bunk', b.bunk); break;
        case 'C': tile = put('cell', b.cell); break;
        default: tile = put('floor', b.floor);
      }
      out.blit(tile, tx * TILE, ty * TILE);
    }
  });
  const mp = where(BASE_ROOM, 'M')[0] as [number, number];
  over(out, made(look, `machine${phase}`, () => b.machine(phase)), mp[0] * TILE, mp[1] * TILE);
  const wp = where(BASE_ROOM, 'W')[0] as [number, number];
  over(out, made(look, `powerbox${+lit}`, () => b.powerbox(lit)), wp[0] * TILE, wp[1] * TILE);
  const bp = where(BASE_ROOM, 'b')[0] as [number, number];
  over(out, made(look, `breaker${+lit}`, () => b.breaker(lit)), bp[0] * TILE, bp[1] * TILE);
  const kp = where(BASE_ROOM, 'k')[0] as [number, number];
  over(out, made(look, 'cipher', () => b.cipher()), kp[0] * TILE, kp[1] * TILE);
  if (look.night) {
    const L = look.baseLights, lights: [number, number, number, number][] = [];
    if (L.machine) lights.push([(mp[0] + 2) * TILE, (mp[1] + 1) * TILE, L.machine[0], L.machine[1]]);
    if (L.breaker) lights.push([bp[0] * TILE + 8, (bp[1] + 1) * TILE, L.breaker[0], L.breaker[1]]);
    if (L.cipher) lights.push([(kp[0] + 1) * TILE, (kp[1] + 1) * TILE, L.cipher[0], L.cipher[1]]);
    if (L.cell) for (const [x, y] of where(BASE_ROOM, 'C')) lights.push([x * TILE + 8, y * TILE + 10, L.cell[0], L.cell[1]]);
    if (L.wall) for (let x = 1; x < COLS - 1; x++) if (x !== kp[0] && x !== kp[0] + 1 && (BASE_ROOM[1] as string)[x] === '#' && x % 3 === 0) lights.push([x * TILE + 8, 2 * TILE, L.wall[0], L.wall[1]]);
    pools(out, lights, look.baseTint);
  }
  return out;
}

/** The tiles and props one by one, for the legend: a name and a picture, in the look's own light. */
export function legends(look: Look, phase: number): { mall: { name: string; px: Px }[]; base: { name: string; px: Px }[] } {
  const c: MC = { tx: 3, ty: 4, v: 1, sN: false, sS: false, sE: false, sW: false, kN: false, kS: false, kE: false, kW: false, lipS: false };
  const wallC: MC = { ...c, sN: true, sS: false }, capC: MC = { ...c, sN: true, sS: true, lipS: true };
  const m = look.mall, b = look.base;
  const mk = (key: string, fn: () => Px): Px => made(look, `L${key}`, fn);
  const onFloor = (p: Paint, fl: Paint, cc: MC, key: string): Px => mk(key, () => fl(c).blit(p(cc), 0, 0));
  return {
    mall: [
      { name: 'FLOOR', px: mk('mf', () => m.floor(c)) }, { name: 'BAND', px: mk('mb', () => m.band(c)) },
      { name: 'CAP', px: mk('mc', () => m.cap(capC)) }, { name: 'WALL', px: mk('mw', () => m.wall(wallC)) },
      { name: 'SHOP', px: mk('ms', () => m.shop(wallC)) }, { name: 'SHUT', px: mk('mx', () => m.shut(wallC)) },
      { name: 'GLASS', px: mk('mg', () => m.glass(wallC)) }, { name: 'PLANTER', px: onFloor(m.planter, m.floor, c, 'mp') },
      { name: 'COUNTER', px: onFloor(m.scoops, m.floor, { ...c, kE: true }, 'mo') }, { name: 'GOO', px: onFloor(m.goo, m.floor, c, 'mgo') },
      { name: 'FOUNTAIN', px: mk('mfo', () => new Px(32, 32).blit(m.floor(c), 0, 0).blit(m.floor(c), 16, 0).blit(m.floor(c), 0, 16).blit(m.floor(c), 16, 16).blit(m.fountain(), 0, 0)) },
    ],
    base: [
      { name: 'FLOOR', px: mk('bf', () => b.floor(c)) }, { name: 'GRATE', px: mk('bg', () => b.grate(c)) },
      { name: 'CAP', px: mk('bc', () => b.cap(capC)) }, { name: 'WALL', px: mk('bw', () => b.wall(wallC)) },
      { name: 'AMMO', px: mk('ba', () => b.ammo(c)) }, { name: 'BUNK', px: mk('bk', () => b.bunk(c)) }, { name: 'CELL', px: mk('bl', () => b.cell(c)) },
      { name: 'BREAKER', px: mk('bb0', () => b.breaker(false)) }, { name: 'THROWN', px: mk('bb1', () => b.breaker(true)) },
      { name: 'CIPHER', px: mk('bci', () => b.cipher()) },
      { name: 'POWER BOX', px: mk('bp0', () => b.powerbox(false)) }, { name: 'LIT', px: mk('bp1', () => b.powerbox(true)) },
      { name: 'MACHINE', px: mk(`bm${phase}`, () => b.machine(phase)) },
    ],
  };
}

/** Pale blocks of the Cyrillic the cipher door shows: 3 by 5 glyphs for the letters of СТОП, ВХОД-free so no foot is needed. */
export const CYR: Record<string, string[]> = {
  С: ['###', '#..', '#..', '#..', '###'], Т: ['###', '.#.', '.#.', '.#.', '.#.'], О: ['###', '#.#', '#.#', '#.#', '###'], П: ['###', '#.#', '#.#', '#.#', '#.#'],
  А: ['.#.', '#.#', '###', '#.#', '#.#'], Х: ['#.#', '#.#', '.#.', '#.#', '#.#'], В: ['##.', '#.#', '##.', '#.#', '##.'], З: ['##.', '..#', '.#.', '..#', '##.'],
  К: ['#.#', '#.#', '##.', '#.#', '#.#'], Р: ['##.', '#.#', '##.', '#..', '#..'], Е: ['###', '#..', '##.', '#..', '###'], Л: ['.##', '#.#', '#.#', '#.#', '#.#'],
  Г: ['###', '#..', '#..', '#..', '#..'], Ж: ['#.#', '.#.', '###', '.#.', '#.#'],
};

/** Draws a Cyrillic word in 3 by 5 glyphs, one pixel apart. */
export function cyr(px: Px, x: number, y: number, word: string, col: Parameters<Px['set']>[2]): number {
  let cx = x;
  for (const ch of word) {
    const g = CYR[ch];
    if (!g) continue;
    g.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') px.set(cx + i, y + j, col); });
    cx += 4;
  }
  return cx - x - 1;
}
