// The town around the stages, so Hawkins reads as a place: roads, fields, houses, Main Street shops, the water tower and
// more trees. All of it is small and quiet next to the six stage landmarks (map_art.ts), and it keeps out of their way:
// anything that would stand on a landmark, a node, the route or a label is dropped. The Upside Down mirrors all of it.
import { Px } from './px.ts';
import type { ColorName } from './palette.ts';
import { framed, oak, pine, tower } from './map_art.ts';
import { HZ, SCREEN_W } from './map_geo.ts';

export interface Box { x0: number; y0: number; x1: number; y1: number }
export const hit = (a: Box, b: Box, m = 0): boolean => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.y0 < b.y1 + m && a.y1 > b.y0 - m;

export interface Item { px: Px; x: number; y: number }

// ---------------------------------------------------------------- ground: roads and fields
/** A road is three rows or columns: a pale edge, the asphalt and a shaded edge. */
function hroad(G: Px, x0: number, x1: number, y: number): void {
  G.rect(x0, y, x1 - x0, 1, 'grey3'); G.rect(x0, y + 1, x1 - x0, 1, 'grey2'); G.rect(x0, y + 2, x1 - x0, 1, 'grey1');
  for (let x = x0 + 3; x < x1 - 2; x += 8) G.rect(x, y + 1, 3, 1, 'yellow');
}
function vroad(G: Px, x: number, y0: number, y1: number): void {
  G.rect(x, y0, 1, y1 - y0, 'grey3'); G.rect(x + 1, y0, 1, y1 - y0, 'grey2'); G.rect(x + 2, y0, 1, y1 - y0, 'grey1');
  for (let y = y0 + 3; y < y1 - 2; y += 8) G.rect(x + 1, y, 1, 3, 'cream');
}

function field(G: Px, x: number, y: number, w: number, h: number, kind: number): void {
  const [a, b]: ColorName[] = kind === 0 ? ['sand', 'soil3'] : kind === 1 ? ['leaf', 'pine3'] : ['soil2', 'soil1'];
  G.rect(x - 1, y - 1, w + 2, h + 2, 'pine2');
  for (let j = 0; j < h; j++) G.rect(x, y + j, w, 1, (j & 1) === 0 ? a : b);
}

const FIELDS: [number, number, number, number, number][] = [[206, 36, 22, 12, 0], [230, 36, 22, 12, 1], [166, 59, 12, 10, 2], [100, 59, 14, 8, 1], [66, 62, 5, 22, 0]];
const VROADS = [119, 183, 64];

/** The ground the town's buildings and trees keep off: the roads and the fields. */
export function groundBoxes(): Box[] {
  return [
    { x0: 0, y0: 52, x1: SCREEN_W, y1: 57 },
    ...VROADS.map((x) => ({ x0: x - 1, y0: 56, x1: x + 4, y1: HZ - 5 })),
    ...FIELDS.map(([x, y, w, h]) => ({ x0: x - 2, y0: y - 2, x1: x + w + 2, y1: y + h + 2 })),
  ];
}

/** Roads and fields, painted into the ground layer. Both are reflected below the horizon with the rest of the land. */
export function paintTownGround(G: Px): void {
  hroad(G, 0, SCREEN_W, 53);
  for (const x of VROADS) vroad(G, x, 56, HZ - 5);
  for (const [x, y, w, h, k] of FIELDS) field(G, x, y, w, h, k);
}

// ---------------------------------------------------------------- buildings
const sprites = new Map<string, Px>();
function cached(key: string, build: () => Px): Px {
  let s = sprites.get(key);
  if (!s) { s = build(); sprites.set(key, s); }
  return s;
}

/** A small house: pitched roof, two windows and a door. */
export function house(wall: ColorName, roof: ColorName, shade: ColorName): Px {
  return cached(`h${wall}${roof}`, () => {
    const p = new Px(9, 9);
    for (let r = 0; r < 4; r++) p.rect(3 - r, r, 3 + r * 2, 1, r === 3 ? shade : roof);
    p.set(3, 0, roof); p.set(2, 1, roof);
    p.rect(1, 4, 7, 5, wall); p.rect(1, 8, 7, 1, shade === 'blood1' ? 'grey2' : 'grey1');
    p.rect(2, 5, 2, 2, 'sky'); p.set(2, 5, 'white'); p.rect(5, 6, 2, 3, 'soil1');
    return framed(p);
  });
}

/** A Main Street shop: flat front, a striped awning, a window and a door. */
export function shop(wall: ColorName, a: ColorName, b: ColorName): Px {
  return cached(`s${wall}${a}`, () => {
    const p = new Px(12, 12);
    p.rect(0, 0, 12, 12, wall); p.rect(0, 0, 12, 2, 'soil1'); p.rect(0, 0, 12, 1, 'soil2');
    for (let x = 0; x < 12; x++) { p.rect(x, 4, 1, 2, (x >> 1) % 2 === 0 ? a : b); if ((x >> 1) % 2 === 0) p.set(x, 6, a); }
    p.rect(1, 7, 6, 4, 'sky'); p.set(1, 7, 'white'); p.set(2, 7, 'white'); p.rect(8, 7, 3, 5, 'soil1'); p.set(9, 9, 'yellow');
    p.rect(0, 11, 12, 1, 'grey1');
    return framed(p);
  });
}

const tree = (kind: number, size: number): Px => cached(`t${kind}${size}`, () => {
  const p = new Px(size + 4, size + 5);
  if (kind === 0) pine(p, (size + 4) >> 1, size + 3, size, Math.max(3, size >> 1)); else oak(p, (size + 4) >> 1, size + 3, Math.max(2, size >> 1));
  return framed(p);
});

const SHOPS: [ColorName, ColorName, ColorName][] = [
  ['sand', 'hot', 'cream'], ['mist', 'pine3', 'cream'], ['pink', 'blue', 'white'], ['bone', 'orange', 'cream'],
  ['soil3', 'yellow', 'cream'], ['sky', 'red', 'white'], ['cream', 'leaf', 'white'], ['sand', 'blue', 'white'],
];
const HOUSES: [ColorName, ColorName, ColorName][] = [
  ['cream', 'red', 'blood1'], ['bone', 'blue', 'dusk'], ['sand', 'soil2', 'soil1'], ['mist', 'red', 'blood1'], ['cream', 'dusk', 'night'], ['pink', 'soil2', 'soil1'],
];

/**
 * The town's buildings and trees. `solid` is where a house, a shop or the tower may not stand (landmarks, nodes, the route,
 * the labels); `green` is where a tree may not (landmarks, nodes, the route). Every item is a sprite and its top left.
 */
export function townItems(solid: Box[], green: Box[], rnd: () => number): Item[] {
  const out: Item[] = [];
  const taken: Box[] = [], leaves: Box[] = [];
  const at = (px: Px, cx: number, base: number): Box => ({ x0: cx - (px.w >> 1), y0: base - px.h + 1, x1: cx - (px.w >> 1) + px.w, y1: base + 1 });
  const put = (px: Px, cx: number, base: number, isTree: boolean): boolean => {
    const b = at(px, cx, base);
    if (b.y0 < 34 || b.y1 > HZ - 4 || b.x0 < 0 || b.x1 > SCREEN_W) return false;
    if (green.some((z) => hit(b, z))) return false;
    if (!isTree && solid.some((z) => hit(b, z))) return false;
    if (taken.some((z) => hit(b, z))) return false;
    if (!isTree && leaves.some((z) => hit(b, z))) return false;
    (isTree ? leaves : taken).push(b);
    out.push({ px, x: b.x0, y: b.y0 });
    return true;
  };
  // Main Street: storefronts shoulder to shoulder on the north side, then houses along the road and its side streets.
  SHOPS.forEach((s, i) => put(shop(...s), 110 + i * 14, 51, false));
  for (let i = 0; i < 20; i++) {
    const x = 6 + i * 13;
    if (x > 104 && x < 205) continue;
    put(house(...(HOUSES[i % HOUSES.length] as [ColorName, ColorName, ColorName])), x, 51, false);
  }
  for (let i = 0; i < 12; i++) put(house(...(HOUSES[(i + 2) % HOUSES.length] as [ColorName, ColorName, ColorName])), 166 + i * 13, 69, false);
  for (const [x, y] of [[112, 68], [127, 68], [112, 80], [127, 82], [58, 72], [74, 84], [176, 80], [190, 70], [190, 82], [104, 90], [134, 92]] as const) {
    put(house(...(HOUSES[(x + y) % HOUSES.length] as [ColorName, ColorName, ColorName])), x, y, false);
  }
  put(tower(), 240, 68, false);
  // Whatever room is left along the roads fills up with more houses.
  let extra = 0;
  for (let k = 0; k < 400 && extra < 12; k++) {
    const x = 4 + Math.floor(rnd() * (SCREEN_W - 8)), base = 58 + Math.floor(rnd() * 34);
    if (put(house(...(HOUSES[Math.floor(rnd() * HOUSES.length)] as [ColorName, ColorName, ColorName])), x, base, false)) extra++;
  }
  // Trees: along the ridge, in clumps and in rows beside the roads.
  for (let k = 0; k < 150; k++) {
    const x = Math.floor(rnd() * SCREEN_W), y = 40 + Math.floor(rnd() * 54);
    put(tree(rnd() < 0.62 ? 0 : 1, 6 + Math.floor(rnd() * 5)), x, y, true);
  }
  return out.sort((a, b) => a.y + a.px.h - (b.y + b.px.h));
}
