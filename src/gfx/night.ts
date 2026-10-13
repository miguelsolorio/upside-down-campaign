// Night art. A night stage is not the day art under a dark layer: its tiles are repainted in a night palette and
// get a few night-only details (rim light on the pines, drifting spores, vines). Each function takes the tile
// the day painters already made, so the shapes stay the same and only the colors and the extras change. Lights
// (window and lamp glow, bulbs, amber, yellow, orange, cream, red) are left out of the palette on purpose, so they
// stay bright. Pure pixel work, no DOM, so Node can run it.
import type { TileName } from '../core/tiles.ts';
import { createRng } from '../core/rng.ts';
import { hash2, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { pineMask } from './tile_objects.ts';
import { isTree } from './tile_ground.ts';
import type { TileCtx } from './tile_ground.ts';

type Rgb = readonly [number, number, number];
type Recolor = Partial<Record<ColorName, Rgb>>;

/** Packed little-endian RGBA, the same form as px32 and the Uint32 view of ImageData. */
const pack = (c: Rgb): number => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

/** The night color for each material, by the name the day art paints it with. */
const NIGHT: Recolor = {
  pine0: [8, 3, 14], pine1: [18, 6, 26], pine2: [30, 10, 40], pine3: [52, 18, 60], leaf: [104, 44, 96],
  soil0: [14, 5, 9], soil1: [30, 10, 16], soil2: [54, 20, 28], soil3: [86, 32, 42], sand: [140, 66, 72],
  grey1: [14, 8, 22], grey2: [34, 22, 52], grey3: [70, 50, 98],
  night: [12, 6, 24], shadow: [20, 10, 34], dusk: [36, 20, 60], slate: [54, 34, 86], mist: [96, 68, 130], bone: [150, 110, 160], white: [210, 170, 200],
  teal0: [16, 4, 26], teal1: [44, 12, 60], cyan: [255, 120, 190], sky: [220, 110, 200], blue: [120, 40, 150],
};
/** Trees sit darker than the ground around them: the same colors at about half the brightness. */
const TREE_SCALE: Partial<Record<ColorName, number>> = { pine0: 0.5, pine1: 0.5, pine2: 0.55, pine3: 0.62, leaf: 0.6 };
/** Flower petals and road paint are not lights, so at night they dim like everything else. */
const FLOWERS: Recolor = { white: [200, 150, 190], pink: [200, 60, 110], yellow: [200, 120, 80], magenta: [160, 50, 150] };
const ROAD_PAINT: Recolor = { yellow: [150, 70, 90], amber: [110, 40, 60] };

const RIM: Rgb = [160, 70, 140], RIM_DIM: Rgb = [90, 34, 84];
const SPORE: Rgb = [255, 150, 210], SPORE_HALO: Rgb = [90, 28, 70];
const VINE: Rgb = [74, 10, 30], VINE_RED: Rgb = [128, 20, 44];
const GLINT: Rgb = [255, 180, 225];

function mapOf(...layers: Recolor[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const layer of layers) for (const [name, c] of Object.entries(layer)) m.set(px32(name as ColorName), pack(c as Rgb));
  return m;
}
const NIGHT_MAP = mapOf(NIGHT);
const FLOWER_MAP = mapOf(NIGHT, FLOWERS);
const ROAD_MAP = mapOf(NIGHT, ROAD_PAINT);
const scale = (c: Rgb, f: number): Rgb => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
const TREE_MAP = (() => {
  const dark: Recolor = {};
  for (const [name, f] of Object.entries(TREE_SCALE)) dark[name as ColorName] = scale(NIGHT[name as ColorName] as Rgb, f as number);
  return mapOf(NIGHT, dark);
})();

function remap(d: Uint32Array, map: Map<number, number>): void {
  for (let i = 0; i < d.length; i++) { const m = map.get(d[i] as number); if (m !== undefined) d[i] = m; }
}
function put(d: Uint32Array, x: number, y: number, c: number): void {
  if (x >= 0 && y >= 0 && x < 16 && y < 16) d[y * 16 + x] = c;
}
/** One bright pixel with a dim cross around it. */
function glowDot(d: Uint32Array, x: number, y: number, core: number, halo: number): void {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) put(d, x + dx, y + dy, halo);
  put(d, x, y, core);
}

const GROUND = new Set<TileName>(['grass', 'grass2']);
const PATH = new Set<TileName>(['trail', 'dirt', 'gravel']);

/** The new art painted into a night tile: rim light on the treeline, spores on the ground, vines on the grass. */
function detail(d: Uint32Array, name: TileName, c: TileCtx, canopy: Uint8Array | null): void {
  const r = createRng(hash2(c.tx, c.ty, 901));
  const rnd = (lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
  if (canopy) {
    const rim = pack(RIM), dim = pack(RIM_DIM);
    // A pixel on the tile edge outside the canopy shape still counts as tree when the next tile is a tree.
    const tree = (x: number, y: number): boolean => (x < 0 ? isTree(c.near.w) : x > 15 ? isTree(c.near.e) : y < 0 ? isTree(c.near.n) : y > 15 ? isTree(c.near.s)
      : canopy[y * 16 + x] === 1 || (x === 0 && isTree(c.near.w)) || (x === 15 && isTree(c.near.e)) || (y === 0 && isTree(c.near.n)) || (y === 15 && isTree(c.near.s)));
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (!canopy[y * 16 + x]) continue;
        if (!tree(x, y - 1)) put(d, x, y, rim);
        else if (!tree(x - 1, y) && (x + y) % 2 === 0) put(d, x, y, dim);
      }
    }
  }
  const grass = GROUND.has(name), path = PATH.has(name);
  if ((grass || path) && hash2(c.tx, c.ty, 47) % 5 === 0) {
    glowDot(d, rnd(3, 12), rnd(3, 12), pack(SPORE), pack(SPORE_HALO));
    if (r() < 0.5) put(d, rnd(1, 14), rnd(1, 14), pack(SPORE));
  }
  if (grass && hash2(c.tx, c.ty, 53) % 8 === 0) {
    let x = rnd(0, 15), y = rnd(0, 15);
    const dir = r() < 0.5 ? 1 : -1;
    for (let i = 0; i < 11; i++) {
      put(d, x, y, pack(i % 4 === 3 ? VINE_RED : VINE));
      x += dir * (r() < 0.7 ? 1 : 0);
      y += r() < 0.5 ? 1 : -1;
      if (i % 5 === 2) put(d, x, y - 1, pack(VINE));
    }
  }
}

/** The night version of a tile the day painters made. Same shape and position, new colors and details. */
export function nightTile(day: Px, name: TileName, c: TileCtx): Px {
  const out = new Px(16);
  out.d.set(day.d);
  let canopy: Uint8Array | null = null;
  if (name === 'pine') {
    // Canopy pixels use the darker tree palette. The trunk and the ground showing through keep the normal one.
    canopy = pineMask(c);
    for (let i = 0; i < 256; i++) {
      const v = out.d[i] as number;
      out.d[i] = ((canopy[i] ? TREE_MAP : NIGHT_MAP).get(v)) ?? v;
    }
  } else {
    remap(out.d, name === 'roadline' ? ROAD_MAP : name === 'flowers' ? FLOWER_MAP : NIGHT_MAP);
  }
  detail(out.d, name, c, canopy);
  return out;
}

/** One frame of night water: the day frame repainted, plus a couple of moon glints that slide with the ripples. */
export function nightWater(day: Px, deep: boolean, variant: number, frame: number): Px {
  const out = new Px(16);
  out.d.set(day.d);
  remap(out.d, NIGHT_MAP);
  const r = createRng(variant * 131 + (deep ? 7 : 3));
  for (let i = 0; i < 2; i++) {
    const y = 2 + Math.floor(r() * 12), x0 = Math.floor(r() * 16);
    if ((frame + i) % 2 === 0) put(out.d, (x0 + frame * 4) & 15, y, pack(GLINT));
  }
  return out;
}

/** A prop or any other sprite repainted in the night palette. Lights in it stay lights. */
export function nightSprite(day: Px): Px {
  const out = new Px(day.w, day.h);
  out.d.set(day.d);
  remap(out.d, NIGHT_MAP);
  return out;
}

/** The Byers house has lit windows on its odd columns. A lit one is amber at its middle. */
export function litWindow(day: Px, name: TileName): boolean {
  return name === 'housewall' && day.get(5, 9) === px32('amber');
}
