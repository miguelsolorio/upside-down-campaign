// Starcourt Mall (stage 3.1), the owner's pick: Confetti, after closing. 1985 at its loudest with the lights off: black terrazzo with neon
// chips in it (thinned from the sheet by a third, so heroes and foes read on it), a zigzag of two tubes for the band, triangles along the
// top of the walls, a different bold pattern in every bay of wall, shop signs of rainbow arcs, a diamond basin lit from within, a pot shaped
// like a cube. The chips and the tubes are the colors the night art leaves alone (magenta, yellow, pink), so they glow on a floor that is
// nearly black, and the rest goes through the night remap the way it does on the sheet (gfx/var/mall_confetti.ts, mall_kit.ts). The
// service floor, the balcony railing and the freight lift are new here. Variants come from the tile's place, so halls don't look stamped.
// The painters share their helpers with the sheet (paint_kit.ts). Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { TILES } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { Paint } from './px.ts';
import { dots, gooTile, hazard, leaves, rects, shade } from './paint_kit.ts';
import type { MC, Pt } from './paint_kit.ts';
import type { TileCtx } from './tile_ground.ts';
import { transposed } from './tile_lab.ts';

export const MALL_TILES: TileName[] = [
  'mallfloor', 'mallband', 'mallcap', 'mallwall', 'mallglass', 'shopfront', 'shopshut', 'planter', 'fountain', 'railing', 'scoops', 'goo', 'servicefloor', 'lift',
];

const SOLID = new Set<TileName>(Object.values(TILES).filter((t) => t.solid).map((t) => t.name));
/** The wall faces: a cap above one of these has a lip. */
const FACE = new Set<TileName>(['mallwall', 'shopfront', 'shopshut', 'mallglass', 'basewall']);

/** What a painter knows about the tile's place (the sheet's MC): its variant, which neighbors are solid, which are its own kind. */
export function mcOf(c: TileCtx, name: TileName): MC {
  const n = c.near;
  return {
    tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 7) & 3, sN: SOLID.has(n.n), sS: SOLID.has(n.s), sE: SOLID.has(n.e), sW: SOLID.has(n.w),
    kN: n.n === name, kS: n.s === name, kE: n.e === name, kW: n.w === name, lipS: FACE.has(n.s),
  };
}

type Kind = 'dot' | 'tri' | 'zig' | 'plus' | 'bar' | 'ring';
const SHAPES: Record<Kind, Pt[]> = {
  dot: [[0, 0]], tri: [[1, 0], [0, 1], [1, 1], [2, 1]], zig: [[0, 0], [1, 1], [2, 0], [3, 1]],
  plus: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], bar: [[0, 0], [1, 0], [2, 0]], ring: [[1, 0], [0, 1], [2, 1], [1, 2]],
};
function chip(px: Px, x: number, y: number, k: Kind, col: Paint): void { for (const [dx, dy] of SHAPES[k]) px.set(x + dx, y + dy, col); }

/** Three or four chips a tile, one pattern per variant: the sheet had five, and the big ones are gone. */
const CHIPS: [number, number, Kind, Paint][][] = [
  [[2, 2, 'tri', 'magenta'], [9, 4, 'dot', 'yellow'], [5, 9, 'dot', 'cyan'], [11, 11, 'bar', 'pink']],
  [[10, 2, 'ring', 'cyan'], [3, 6, 'bar', 'yellow'], [9, 10, 'dot', 'magenta']],
  [[4, 3, 'dot', 'yellow'], [11, 7, 'dot', 'pink'], [2, 10, 'tri', 'cyan'], [10, 13, 'dot', 'purple']],
  [[6, 2, 'dot', 'cyan'], [2, 7, 'zig', 'magenta'], [10, 9, 'dot', 'yellow']],
];

function floor(c: MC): Px {
  const px = new Px(16).fill('night');
  px.rect(0, 0, 16, 1, 'shadow').rect(0, 0, 1, 16, 'shadow');
  for (const [x, y, k, col] of CHIPS[c.v] as [number, number, Kind, Paint][]) chip(px, x, y, k, col);
  shade(px, c, 'ink', 'ink');
  return px;
}

/** The band is two tubes in a zigzag. It runs across a hall or down one: down, it is turned a quarter. */
function band(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.rect(0, 0, 16, 1, 'shadow').rect(0, 15, 16, 1, 'shadow');
  for (let x = 0; x < 16; x++) {
    const t = x % 8 < 4 ? x % 8 : 8 - (x % 8);
    px.set(x, 3 + t, 'yellow').set(x, 8 + t, 'magenta');
  }
  dots(px, [[2, 14], [10, 1]], 'cyan');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

function cap(c: MC): Px {
  const px = new Px(16).fill('ink');
  for (const x0 of [0, 8]) for (const y0 of [1, 8]) { for (let k = 0; k < 4; k++) px.rect(x0 + 3 - k, y0 + k, 2 * k + 2, 1, k === 0 ? 'purple' : 'purple0'); }
  if (c.lipS) px.rect(0, 13, 16, 1, 'purple').rect(0, 14, 16, 2, 'ink');
  return px;
}

/** A bay of wall is a different bold pattern, by variant: stripes and a line, studs, a triangle, a pair of arches. */
function wall(c: MC): Px {
  const px = new Px(16).fill('purple0');
  if (c.v === 0) { for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if ((x + y) % 6 < 2) px.set(x, y, 'ink'); px.line(1, 8, 14, 8, 'cyan'); }
  else if (c.v === 1) { for (const [x, y] of [[3, 3], [11, 3], [7, 8], [3, 12], [11, 12]] as Pt[]) px.rect(x, y, 2, 2, 'magenta'); }
  else if (c.v === 2) { px.line(2, 12, 8, 2, 'yellow').line(8, 2, 14, 12, 'yellow').line(2, 12, 14, 12, 'yellow'); px.rect(7, 7, 2, 2, 'ink'); }
  else { for (const x of [3, 11]) px.ellipse(x + 0.5, 12, 3.5, 4, 'cyan').ellipse(x + 0.5, 12, 2, 2.5, 'purple0'); px.rect(0, 12, 16, 2, 'purple0'); }
  px.rect(0, 0, 16, 1, 'purple').rect(0, 14, 16, 2, 'ink');
  return px;
}

/** A shop window lit with a rainbow arc sign over a pink triangle and a few confetti bits. */
function shop(c: MC): Px {
  const px = new Px(16).fill('ink');
  px.ellipse(8, 7, 7.5, 6.5, 'magenta').ellipse(8, 7, 5.5, 4.5, 'yellow').ellipse(8, 7, 3.5, 2.5, 'cyan').ellipse(8, 7, 1.8, 1.2, 'ink');
  px.rect(0, 7, 16, 9, 'ink');
  px.rect(1, 8, 14, 6, 'night').frame(1, 8, 14, 6, 'purple');
  px.line(3, 13, 6, 9, 'hot').line(6, 9, 9, 13, 'hot').line(3, 13, 9, 13, 'hot');
  dots(px, [[11, 10], [12, 10], [11, 11], [12, 11]], 'yellow');
  dots(px, [[13, 12], [10, 13]], 'cyan');
  if (c.v & 1) dots(px, [[8, 11]], 'pink');
  px.rect(0, 14, 16, 2, 'purple0');
  return px;
}

/** A shut shop: a grille rolled down, the sign above it dark but for its arcs, a magenta stripe on the grille. */
function shut(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 16, 7, 'ink').frame(0, 0, 16, 7, 'purple0');
  px.ellipse(8, 7, 6, 5, 'purple0').ellipse(8, 7, 4, 3, 'ink').rect(0, 7, 16, 9, 'grey2');
  for (let y = 8; y < 14; y += 2) px.rect(0, y, 16, 1, 'grey3');
  for (let x = 0; x < 16; x++) px.set(x, 9 + (x % 4 < 2 ? 0 : 1), 'magenta');
  dots(px, [[3, 12], [11, 12]], 'yellow');
  px.rect(0, 14, 16, 2, 'grey1');
  if (c.v & 2) px.set(13, 1, 'red');
  return px;
}

/** The glass doors of an entrance: a pink exit sign over two dark leaves with a cyan triangle and a yellow handle plate. */
function glass(): Px {
  const px = new Px(16).fill('purple0');
  px.rect(0, 0, 16, 4, 'night').rect(3, 1, 10, 2, 'hot').rect(4, 1, 8, 1, 'pink');
  px.rect(1, 5, 6, 9, 'ink').rect(9, 5, 6, 9, 'ink');
  px.line(2, 12, 4, 6, 'cyan').line(4, 6, 6, 12, 'cyan').line(2, 12, 6, 12, 'cyan');
  px.frame(10, 7, 4, 4, 'yellow').rect(11, 8, 2, 2, 'yellow');
  px.rect(0, 14, 16, 2, 'ink').rect(7, 5, 2, 9, 'purple');
  return px;
}

/**
 * The basin, a diamond of rings: a purple rim, a dark lip, rings of cyan and blue that run in as the phase goes round, a yellow ring
 * round a white eye, and a jet of yellow with a white cap and a few pink drops. w by h tiles, 2 by 2 on the sheet.
 */
export function fountainArt(w: number, h: number, phase = 0): Px {
  const W = w * 16, H = h * 16, cx = W / 2 - 0.5, cy = H / 2 + 1;
  const px = new Px(W, H);
  const sx = 15.5 / (W / 2), sy = 15.5 / (H / 2) * 0.87;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - cx) * sx + Math.abs(y - cy) * sy;
      if (d > 15.5) continue;
      px.set(x, y, d > 14.2 ? 'ink' : d > 12.4 ? 'purple' : d > 10.8 ? 'night' : d > 3.6 ? ((Math.floor(d) + phase) % 4 < 2 ? 'cyan' : 'blue') : d > 1.6 ? 'yellow' : 'white');
    }
  }
  const top = Math.max(1, Math.round(cy) - 12 - Math.min(6, h * 2));
  const mid = Math.round(cx);
  px.rect(mid, top + 2, 2, Math.round(cy) - top - 5, 'yellow').rect(mid - 1, top + 2, 4, 1, 'white').rect(mid, top, 2, 2, 'cyan');
  dots(px, [[mid - 4, top + 3], [mid + 5, top + 3], [mid - 5, top + 5], [mid + 6, top + 5], [mid, top - 1]], 'pink');
  return px;
}

function planter(c: MC): Px {
  const px = new Px(16);
  px.rect(4, 9, 8, 6, 'magenta').rect(4, 8, 8, 2, 'purple').frame(4, 8, 8, 7, 'ink').rect(4, 9, 8, 1, 'pink');
  px.rect(9, 10, 3, 4, 'purple0');
  const tips: Pt[][] = [[[4, 1], [7, 0], [10, 1], [12, 3], [3, 4]], [[3, 2], [8, 0], [12, 2], [13, 5], [5, 3]], [[5, 0], [9, 1], [11, 0], [3, 3], [13, 4]], [[4, 2], [7, 1], [11, 1], [2, 5], [13, 3]]];
  leaves(px, 8, 8, tips[c.v] as Pt[], 'pine3', 'yellow');
  return px;
}

/** The Scoops Ahoy counter: a steel top, a dark front with a wavy yellow stripe and cyan studs, and at one spot a pink scoop in a cone. */
function scoops(c: MC): Px {
  const px = new Px(16);
  const l = c.kW ? 0 : 1, r = c.kE ? 16 : 15;
  px.rect(l, 4, r - l, 3, 'slate').rect(l, 4, r - l, 1, 'mist');
  px.rect(l, 7, r - l, 8, 'purple0');
  for (let x = l; x < r; x++) px.set(x, 9 + ((x + c.tx * 3) % 4 < 2 ? 0 : 1), 'yellow');
  rects(px, [[l, 14, r - l, 1]], 'purple');
  dots(px, [[l + 2, 12], [l + 8, 12], [l + 12, 12]], 'cyan');
  if (c.tx % 3 === 2) { px.ellipse(8, 10.5, 2.4, 1.6, 'pink').line(6, 12, 8, 14, 'yellow').line(10, 12, 8, 14, 'yellow').rect(6, 12, 5, 1, 'yellow'); dots(px, [[7, 9]], 'white'); }
  return px;
}

/** Bare concrete behind the shops: slabs with a dark joint, a few pale scuffs, an oil stain now and then, a faded safety line at some. */
function service(c: MC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(15, 0, 1, 16, 'grey1').rect(0, 15, 16, 1, 'grey1');
  if (c.v === 1) px.rect(0, 7, 16, 1, 'grey1');
  const scuff: Pt[][] = [[[2, 3], [3, 3], [9, 10]], [[11, 4], [12, 4], [4, 12]], [[5, 6], [6, 6], [13, 12]], [[3, 11], [4, 11], [10, 3]]];
  dots(px, scuff[c.v] as Pt[], 'grey3');
  if (hash2(c.tx, c.ty, 19) % 5 === 0) px.rect(5 + (c.v & 1) * 4, 5, 4, 2, 'grey1').rect(6 + (c.v & 1) * 4, 7, 2, 1, 'grey1');
  if (hash2(c.tx, c.ty, 23) % 9 === 0) px.rect(0, 11, 16, 2, 'yellow').rect(0, 11, 16, 1, 'amber');
  shade(px, c, 'ink', 'grey1');
  return px;
}

/** The balcony's railing: a magenta top rail and a purple one under it, pink posts, along a run or, down one, a quarter turn of it. */
function railing(c: MC): Px {
  const px = new Px(16);
  px.rect(0, 6, 16, 2, 'magenta').rect(0, 6, 16, 1, 'pink').rect(0, 13, 16, 2, 'purple').rect(0, 14, 16, 1, 'ink');
  for (let x = 1; x < 16; x += 4) px.rect(x, 8, 2, 5, 'purple0').set(x, 8, 'pink');
  px.rect(0, 5, 16, 1, 'ink');
  return (c.kN || c.kS) && !(c.kE || c.kW) ? transposed(px) : px;
}

/** The freight lift, one steel plate over its whole block: a hazard border round it, grooves across it, a yellow chevron pointing down. */
export function liftArt(w: number, h: number): Px {
  const W = w * 16, H = h * 16;
  const px = new Px(W, H).fill('grey3');
  for (let y = 4; y < H - 4; y += 4) px.rect(4, y, W - 8, 1, 'grey2');
  hazard(px, 0, 0, W, H, 3, 'amber', 'ink');
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  for (let k = 0; k < 3; k++) px.line(cx - 6 + k, cy - 4 + k, cx, cy + 2 + k, 'yellow').line(cx + 5 - k, cy - 4 + k, cx - 1, cy + 2 + k, 'yellow');
  return px;
}

const cache = new Map<string, Px>();
function crop(src: Px, ox: number, oy: number): Px {
  const out = new Px(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.d[y * 16 + x] = src.get(ox + x, oy + y);
  return out;
}
function block(key: string, make: () => Px): Px {
  let p = cache.get(key);
  if (!p) { p = make(); cache.set(key, p); }
  return p;
}

/** Floors you walk on: the terrazzo, the band and the service floor. */
export function mallGround(name: TileName, c: TileCtx): Px | null {
  const m = mcOf(c, name);
  switch (name) {
    case 'mallfloor': return floor(m);
    case 'mallband': return band(m);
    case 'servicefloor': return service(m);
    default: return null;
  }
}

/** The solid tiles and the dressing that stands on a floor. `under` lays the floor the neighbors show (or the mall's). */
export function mallObject(name: TileName, c: TileCtx, under: (c: TileCtx, prefer: TileName) => Px, phase = 0): Px | null {
  const m = mcOf(c, name);
  const on = (art: Px): Px => under(c, 'mallfloor').blit(art, 0, 0);
  switch (name) {
    case 'mallcap': return cap(m);
    case 'mallwall': return wall(m);
    case 'mallglass': return glass();
    case 'shopfront': return shop(m);
    case 'shopshut': return shut(m);
    case 'planter': return on(planter(m));
    case 'scoops': return on(scoops(m));
    case 'goo': return on(gooTile(m, { body: 'purple', rim: 'ink', hi: 'magenta', spec: 'yellow', seed: 0.4 }));
    case 'railing': return on(railing(m));
    case 'fountain': {
      const b = c.blk ?? { ox: m.kW ? 1 : 0, oy: m.kN ? 1 : 0, w: 2, h: 2 };
      return on(crop(block(`f${b.w}x${b.h}:${phase}`, () => fountainArt(b.w, b.h, phase)), b.ox * 16, b.oy * 16));
    }
    case 'lift': {
      const b = c.blk ?? { ox: m.kW ? 1 : 0, oy: m.kN ? 1 : 0, w: 2, h: 2 };
      return crop(block(`l${b.w}x${b.h}`, () => liftArt(b.w, b.h)), b.ox * 16, b.oy * 16);
    }
    default: return null;
  }
}
