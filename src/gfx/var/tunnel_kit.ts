// The sample room for tunnel-variations.html: 16 by 10 tiles of the tunnels under Hawkins. A look is a set of painters for
// the seven tunnel tiles (floor, cap, wall, roots, veins, nest) and the two props (gap, crack), all drawn with Px in the game's
// palette. The room runs every tile and prop through the game's own night art (night.ts) the way a night stage does, then
// paints light pools round the glowing veins, the nest and the crack, the way glow.ts does. Pure pixel work: no DOM.
import { BAYER4, hash2 } from '../canvas.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';

/** What a tile painter knows about its place: the variant (0 to 3), which neighbors are solid, and for a cap whether the wall face is right below it. */
export interface TC { tx: number; ty: number; v: number; sN: boolean; sS: boolean; sE: boolean; sW: boolean; faceS: boolean; rockS: boolean }

export interface Look {
  slug: string;
  name: string;
  note: string;
  floor(c: TC): Px;
  /** The top of a wall mass. faceS means the wall face is the next tile down, so the cap ends in a lip. */
  cap(c: TC): Px;
  /** The face of the wall, looking down onto the floor. */
  wall(c: TC): Px;
  roots(c: TC): Px;
  veins(c: TC, phase: number): Px;
  nest(c: TC): Px;
  /** The drop across a hall that runs east and west: 16 wide by 32 tall, clear outside the chasm. */
  gap(): Px;
  /** The cracked root wall across a two wide mouth: 32 by 16. */
  crack(): Px;
  /** The color the light pools add, as r, g, b. */
  glow: readonly [number, number, number];
}

/** # solid, . floor, r roots, v veins, n nest (solid), g the gap (two tiles tall), c the crack (two tiles wide). */
export const ROOM = [
  '################',
  '################',
  '#.nn..r.#####..#',
  '#.nn..v.#####..#',
  '#...r.vv#####cc#',
  '#..vvv.r..g.....',
  '#.r....v..g.....',
  '#....r.#########',
  '#..v...#########',
  '################',
];
export const TILE = 16, COLS = 16, ROWS = 10;
export const ROOM_W = COLS * TILE, ROOM_H = ROWS * TILE;
/** Light pools: x, y in room px, radius, strength. The veins, the nest and the crack. */
const LIGHTS: readonly [number, number, number, number][] = [[72, 88, 34, 1], [112, 100, 26, 1], [104, 60, 26, 1], [56, 140, 28, 1], [44, 44, 30, 0.8], [232, 70, 30, 0.7]];

const rock = (ch: string | undefined): boolean => ch === undefined || ch === '#' || ch === 'c';
const solid = (ch: string | undefined): boolean => rock(ch) || ch === 'n';

function ctxAt(tx: number, ty: number): TC {
  const at = (x: number, y: number): string | undefined => ROOM[y]?.[x];
  const rockS = rock(at(tx, ty + 1));
  return { tx, ty, v: hash2(tx, ty, 7) & 3, sN: solid(at(tx, ty - 1)), sS: solid(at(tx, ty + 1)), sE: solid(at(tx + 1, ty)), sW: solid(at(tx - 1, ty)), faceS: rockS && !rock(at(tx, ty + 2)), rockS };
}

const cache = new Map<string, Px>();
function night(look: Look, kind: string, c: TC | null, phase: number, make: () => Px): Px {
  const key = `${look.slug}|${kind}|${c ? `${c.v}${+c.sN}${+c.sS}${+c.sE}${+c.sW}${+c.faceS}${c.tx & 1}` : ''}|${phase}`;
  let p = cache.get(key);
  if (!p) { p = nightSprite(make()); cache.set(key, p); }
  return p;
}

/** Dithered light pools in four steps, lifting every pixel by a whole step, as glow.ts does. */
function glow(px: Px, tint: readonly [number, number, number]): void {
  const step = new Uint8Array(px.w * px.h);
  const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
  for (const [lx, ly, R, str] of LIGHTS) {
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

/** The whole room at night, veins at the given pulse phase (0 to 3). */
export function roomPx(look: Look, phase: number): Px {
  const out = new Px(ROOM_W, ROOM_H);
  ROOM.forEach((row, ty) => {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx] as string, c = ctxAt(tx, ty);
      let tile: Px;
      if (ch === '#') tile = c.rockS ? night(look, 'cap', c, 0, () => look.cap(c)) : night(look, 'wall', c, 0, () => look.wall(c));
      else if (ch === 'r') tile = night(look, 'roots', c, 0, () => look.roots(c));
      else if (ch === 'v') tile = night(look, 'veins', c, phase, () => look.veins(c, phase));
      else if (ch === 'n') tile = night(look, 'nest', c, 0, () => look.nest(c));
      else tile = night(look, 'floor', c, 0, () => look.floor(c));
      out.blit(tile, tx * TILE, ty * TILE);
    }
  });
  glow(out, look.glow);
  const gx = ROOM[5]?.indexOf('g') ?? 10, kx = ROOM[4]?.indexOf('c') ?? 13;
  out.blit(night(look, 'gap', null, 0, () => look.gap()), gx * TILE, 5 * TILE);
  out.blit(night(look, 'crack', null, 0, () => look.crack()), kx * TILE, 4 * TILE);
  return out;
}

/** The tiles and props one by one, for the legend: name and picture, in the night art. */
export function legend(look: Look, phase: number): { name: string; px: Px }[] {
  const c: TC = { tx: 3, ty: 4, v: 1, sN: false, sS: false, sE: false, sW: false, faceS: false, rockS: false };
  const wallC: TC = { ...c, sN: true, sS: false };
  const capC: TC = { ...c, sN: true, sS: true, faceS: true };
  const floorC: TC = { ...c, sN: false };
  return [
    { name: 'FLOOR', px: night(look, 'lf', floorC, 0, () => look.floor(floorC)) },
    { name: 'CAP', px: night(look, 'lc', capC, 0, () => look.cap(capC)) },
    { name: 'WALL', px: night(look, 'lw', wallC, 0, () => look.wall(wallC)) },
    { name: 'ROOTS', px: night(look, 'lr', floorC, 0, () => look.roots(floorC)) },
    { name: 'VEINS', px: night(look, 'lv', floorC, phase, () => look.veins(floorC, phase)) },
    { name: 'NEST', px: night(look, 'ln', floorC, 0, () => look.nest(floorC)) },
  ];
}

export const gapOf = (look: Look): Px => night(look, 'gap', null, 0, () => look.gap());
export const crackOf = (look: Look): Px => night(look, 'crack', null, 0, () => look.crack());
