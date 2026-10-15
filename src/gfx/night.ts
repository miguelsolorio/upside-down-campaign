// Night art. A night stage is not the day art under a dark layer: its tiles are repainted in a night palette and
// get a few night-only details (rim light on the pines, dew, glowing mushrooms and flowers, fireflies). Each
// function takes the tile the day painters already made, so the shapes stay the same and only the colors and the
// extras change. Lights (window and lamp glow, bulbs, amber, yellow, orange, cream, red) are left out of the palette
// on purpose, so they stay bright. Pure pixel work, no DOM, so Node can run it.
import type { TileName } from '../core/tiles.ts';
import { createRng } from '../core/rng.ts';
import { hash2, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { pineMask } from './tile_objects.ts';
import { isTree } from './tile_ground.ts';
import type { TileCtx } from './tile_ground.ts';
import { hasLitWindow } from './tile_school2.ts';

type Rgb = readonly [number, number, number];
type Recolor = Partial<Record<ColorName, Rgb>>;

/** Packed little-endian RGBA, the same form as px32 and the Uint32 view of ImageData. */
const pack = (c: Rgb): number => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

/** The night color for each material, by the name the day art paints it with: deep green woods, plum-grey earth. */
const NIGHT: Recolor = {
  pine0: [3, 12, 10], pine1: [6, 26, 22], pine2: [10, 40, 34], pine3: [16, 62, 50], leaf: [40, 120, 90],
  soil0: [14, 10, 14], soil1: [26, 20, 28], soil2: [42, 34, 46], soil3: [52, 44, 60], sand: [84, 76, 96],
  grey1: [10, 14, 22], grey2: [28, 36, 54], grey3: [60, 74, 100],
  night: [8, 12, 26], shadow: [14, 20, 36], dusk: [26, 36, 62], slate: [40, 54, 86], mist: [78, 96, 130], bone: [120, 138, 168], white: [170, 190, 215],
  teal0: [4, 16, 26], teal1: [10, 46, 66], cyan: [110, 240, 220], sky: [110, 190, 230], blue: [30, 70, 150],
};
/** Trees sit darker than the ground around them: the same colors at about half the brightness. */
const TREE_SCALE: Partial<Record<ColorName, number>> = { pine0: 0.5, pine1: 0.5, pine2: 0.55, pine3: 0.62, leaf: 0.6 };
/**
 * The Lab at midnight (stage 2.3): the pale panels and steel are dim blue-greys, near the school's floors in brightness, so the pools of the
 * lamps and bulbs do the lighting. Paint and the reds it carries are dimmed too: the flesh is the quiet part of that stage, and a lamp or a
 * lit sign is a small thing. Layered over NIGHT.
 */
const LAB_NIGHT: Recolor = {
  white: [46, 56, 80], bone: [34, 42, 62], mist: [40, 50, 74], grey3: [22, 28, 44], grey2: [16, 20, 34], grey1: [9, 12, 22],
  slate: [26, 34, 56], dusk: [18, 24, 42], shadow: [11, 15, 28], teal1: [8, 34, 50],
  yellow: [150, 128, 48], amber: [110, 84, 32],
};
/** The reds of the overrun Lab, a step down from the day reds: the flesh and what has grown into the Lab stay the quiet part of the picture. */
const OVERRUN: Recolor = {
  blood0: [40, 8, 16], blood1: [84, 12, 26], red: [124, 22, 36], hot: [170, 44, 52], pink: [150, 84, 108], rose: [120, 52, 74],
};
/** A lump of growth or a vine in the overrun Lab is flesh too: the reds drop to the flesh's own, so the edge where it meets the Lab stays quiet. */
const GROWTH: Recolor = {
  blood0: [26, 5, 12], blood1: [44, 8, 18], red: [64, 12, 24], hot: [80, 20, 30], pink: [86, 50, 66], rose: [70, 32, 46],
};
/** The tiles of Hawkins Lab and the stage 2.3 dressing that only the Lab has. */
const LAB = new Set<TileName>([
  'labfloor', 'labfloor2', 'hazard', 'labwall', 'labcap', 'vent', 'pipe', 'glass', 'cage', 'locker', 'cabinet', 'shelf',
  'cable', 'drain', 'stain', 'tilegreen', 'carpet', 'plate', 'wallsign',
]);
/** Dressing that the school uses at night too (a mass, vines, a bench in the gym): dim only where it sits against the Lab or its flesh. */
const SHARED = new Set<TileName>(['mass', 'vines', 'bench']);
const FLESH = new Set<TileName>(['fleshfloor', 'fleshwall', 'tear']);

/** True for a tile that gets the Lab's night colors. */
export function labNight(name: TileName, c: TileCtx): boolean {
  if (LAB.has(name)) return true;
  if (!SHARED.has(name)) return false;
  return Object.values(c.near).some((n) => LAB.has(n) || FLESH.has(n));
}

/** The flowers glow: bioluminescent petals, not daylight ones. */
const FLOWERS: Recolor = { white: [120, 255, 230], pink: [255, 120, 210], yellow: [255, 236, 120], magenta: [255, 90, 220] };
/** Road paint is not a light, so at night it dims like everything else. */
const ROAD_PAINT: Recolor = { yellow: [160, 136, 52], amber: [120, 92, 36] };

const RIM: Rgb = [60, 170, 140], RIM_DIM: Rgb = [30, 90, 80];
const DEW: Rgb = [130, 255, 220];
const CAP: Rgb = [90, 240, 210], CAP_HALO: Rgb = [20, 90, 80], STEM: Rgb = [40, 56, 70];
const FIREFLY: Rgb = [255, 235, 110], FIREFLY_HALO: Rgb = [88, 84, 28];
const GLINT: Rgb = [200, 255, 240];

function mapOf(...layers: Recolor[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const layer of layers) for (const [name, c] of Object.entries(layer)) m.set(px32(name as ColorName), pack(c as Rgb));
  return m;
}
const NIGHT_MAP = mapOf(NIGHT);
const FLOWER_MAP = mapOf(NIGHT, FLOWERS);
const ROAD_MAP = mapOf(NIGHT, ROAD_PAINT);
const LAB_MAP = mapOf(NIGHT, LAB_NIGHT, OVERRUN);
const FLESH_MAP = mapOf(NIGHT, OVERRUN);
const GROWTH_MAP = mapOf(NIGHT, LAB_NIGHT, GROWTH);
const scale = (c: Rgb, f: number): Rgb => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
const TREE_MAP = (() => {
  const dark: Recolor = {};
  for (const [name, f] of Object.entries(TREE_SCALE)) dark[name as ColorName] = scale(NIGHT[name as ColorName] as Rgb, f as number);
  return mapOf(NIGHT, dark);
})();
/** The day colors of flower petals, and of the grass around them. */
const PETALS = new Set((['white', 'pink', 'yellow', 'magenta'] as ColorName[]).map((n) => px32(n)));
const GRASS = new Set((['pine0', 'pine1', 'pine2', 'pine3'] as ColorName[]).map((n) => px32(n)));

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

/** The new art painted into a night tile: rim light on the treeline, dew, fireflies and glowing mushrooms on the grass. */
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
  if (!GROUND.has(name)) return;
  // The three passes below share one random stream, so the order matters: dew, then a firefly, then a mushroom.
  if (hash2(c.tx, c.ty, 31) % 100 < 30) for (let i = 0; i < 2; i++) put(d, rnd(1, 14), rnd(1, 14), pack(DEW));
  if (hash2(c.tx, c.ty, 41) % 9 === 0) glowDot(d, rnd(3, 12), rnd(3, 12), pack(FIREFLY), pack(FIREFLY_HALO));
  if (hash2(c.tx, c.ty, 43) % 11 === 0) {
    const x = rnd(3, 10), y = rnd(4, 11), cap = pack(CAP);
    for (const [dx, dy] of [[-1, 0], [3, 0], [0, -1], [2, -1], [1, -2]] as [number, number][]) put(d, x + dx, y + dy, pack(CAP_HALO));
    put(d, x, y, cap); put(d, x + 1, y, cap); put(d, x + 2, y, cap); put(d, x + 1, y - 1, cap);
    put(d, x + 1, y + 1, pack(STEM));
  }
}

/** A dim halo on the grass around every petal of a flower tile, so the blossoms look lit. */
function petalGlow(out: Uint32Array, day: Uint32Array): void {
  const halo = pack(CAP_HALO);
  for (let i = 0; i < 256; i++) {
    if (!PETALS.has(day[i] as number)) continue;
    const x = i % 16, y = (i / 16) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < 16 && yy < 16 && GRASS.has(day[yy * 16 + xx] as number)) out[yy * 16 + xx] = halo;
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
    remap(out.d, name === 'roadline' ? ROAD_MAP : name === 'flowers' ? FLOWER_MAP : FLESH.has(name) ? FLESH_MAP : labNight(name, c) ? (SHARED.has(name) && name !== 'bench' ? GROWTH_MAP : LAB_MAP) : NIGHT_MAP);
  }
  if (name === 'flowers') petalGlow(out.d, day.d);
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

/** The Byers house and the school's brick have lit windows on their odd columns. A lit one is amber at its middle. */
export function litWindow(day: Px, name: TileName): boolean {
  return (name === 'housewall' && day.get(5, 9) === px32('amber')) || (name === 'brick' && hasLitWindow(day));
}
