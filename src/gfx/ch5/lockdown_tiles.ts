// The tiles of stage 5.1, Hawkins under lockdown (docs/chapter-5.md, "The looks"). Outside, the town tiles the map and stage 2.1 use, at dusk
// with the army laid over them: asphalt cut by tyre ruts, double yellow lines and a white stop line, the sidewalk strewn with curfew
// flyers, trampled lawn, the house front (roof, a boarded or lit wall, a wall under creeping vines, a door sealed with tape) and a red rift
// glowing in the asphalt as three tiles that join. Inside, the Lab's floor and wall dressed by the army: cable runs, crate stacks.
// `duskTile` is the filter that turns a day tile to dusk (night.ts takes it the rest of the way). Painters have the shape of tile_town.ts's:
// (name, ctx, rng) to a Px, or null for a tile that is not theirs, split into the walkable and the solid. Pure pixel work.
import type { TileName } from '../../core/tiles.ts';
import { hash2, px32 } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { groundTile, rngFor } from '../tile_ground.ts';
import type { TileCtx } from '../tile_ground.ts';
import { objectTile } from '../tile_objects.ts';
import { labFace, labFloor, transposed } from '../tile_lab.ts';
import { townGround } from '../tile_town.ts';

type Rnd = () => number;
const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

/** The names of 5.1's new tiles. They are not in core/tiles.ts yet: the build adds them and one case each in the ground and object painters. */
export type LockdownTile =
  | 'lockroad' | 'lockline' | 'lockstop' | 'lockwalk' | 'locklawn' | 'lockroof' | 'lockhouse' | 'lockvine' | 'lockdoor'
  | 'rift0' | 'rift1' | 'rift2'
  | 'armyfloor' | 'armycable' | 'armycable2' | 'armycrate' | 'armycrate2' | 'armywall';
export const LOCKDOWN_TOWN: readonly LockdownTile[] = ['lockroad', 'lockline', 'lockstop', 'lockwalk', 'locklawn', 'lockroof', 'lockhouse', 'lockvine', 'lockdoor', 'rift0', 'rift1', 'rift2'];
export const LOCKDOWN_LAB: readonly LockdownTile[] = ['armyfloor', 'armycable', 'armycable2', 'armycrate', 'armycrate2', 'armywall'];
export const LOCKDOWN_TILES: readonly LockdownTile[] = [...LOCKDOWN_TOWN, ...LOCKDOWN_LAB];
/** The ones you cannot walk through: the house front and the army's crates and wall. */
export const LOCKDOWN_SOLID: ReadonlySet<LockdownTile> = new Set<LockdownTile>(['lockroof', 'lockhouse', 'lockvine', 'lockdoor', 'armycrate', 'armycrate2', 'armywall']);

// ---------------------------------------------------------------- dusk
/** Lights keep their color at dusk, as they do in night.ts. */
const LIGHTS = new Set<number>((['amber', 'yellow', 'orange', 'cream', 'red', 'hot', 'pink', 'magenta', 'cyan', 'blood0', 'blood1'] as ColorName[]).map((n) => px32(n)));

/**
 * A day tile at dusk: everything but a light is dimmed toward violet, k from 0 (day) to 1 (full dusk). Walls and ground stay readable and the
 * lit windows, the red rift and the lamps carry the picture. night.ts's nightTile is the next step down.
 */
export function duskTile(day: Px, k = 1): Px {
  const out = new Px(day.w, day.h);
  const cache = new Map<number, number>();
  for (let i = 0; i < day.d.length; i++) {
    const v = day.d[i] as number;
    if (!v) continue;
    let m = cache.get(v);
    if (m === undefined) {
      if (LIGHTS.has(v)) m = v;
      else {
        const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
        const f = (c: number, mul: number, add: number): number => Math.max(0, Math.min(255, Math.round(c + (c * mul + add - c) * k)));
        m = ((255 << 24) | (f(b, 0.88, 26) << 16) | (f(g, 0.68, 10) << 8) | f(r, 0.74, 16)) >>> 0;
      }
      cache.set(v, m);
    }
    out.d[i] = m;
  }
  return out;
}

// ---------------------------------------------------------------- the street
const isRoad = (n: TileName): boolean => n === 'road' || n === 'roadline';

function asphalt(c: TileCtx): Px { return groundTile('road', c) as Px; }

/** Asphalt, now and then with the army's tyre ruts across it, a patch of fresh tar, or a dark oil spill. */
function lockroad(c: TileCtx, r: Rnd): Px {
  const px = asphalt(c);
  const v = hash2(c.tx, c.ty, 5101) % 10;
  if (v === 0) for (const y of [4, 11]) for (let x = 0; x < 16; x++) { px.set(x, y, 'ink'); if (x & 1) px.set(x, y + 1, 'grey2'); }
  else if (v === 1) { px.rect(3, 4, 10, 8, 'ink').rect(4, 5, 8, 6, 'grey1'); px.scatter(r, 'grey2', 4, 4, 5, 8, 6); px.set(3, 4, 'grey1').set(12, 11, 'grey1'); }
  else if (v === 2) { px.ellipse(8, 8, 4, 2.5, 'black').ellipse(7.5, 7.5, 2.4, 1.4, 'ink').set(6, 7, 'night'); }
  return px;
}

/** The double yellow center line, worn here and there. Runs along whichever way the road does. */
function lockline(c: TileCtx, r: Rnd): Px {
  const px = asphalt(c);
  const hRun = isRoad(c.near.e) && isRoad(c.near.w), vRun = isRoad(c.near.n) && isRoad(c.near.s);
  const line = new Px(16);
  for (const y of [5, 9]) line.rect(0, y, 16, 1, 'yellow').rect(0, y + 1, 16, 1, 'amber');
  const wear = new Px(16);
  for (let i = 0; i < 6; i++) wear.set(pick(r, 0, 15), [5, 6, 9, 10][pick(r, 0, 3)] as number, 'grey1');
  const done = hRun || !vRun ? line : transposed(line);
  px.blit(done, 0, 0);
  px.blit(hRun || !vRun ? wear : transposed(wear), 0, 0);
  return px;
}

/** The checkpoint's stop line: a thick white bar across the lane with its paint chipped, and two amber road studs. It crosses the road, whichever way the road runs. */
function lockstop(c: TileCtx, r: Rnd): Px {
  const px = asphalt(c);
  const bar = new Px(16);
  bar.rect(0, 10, 16, 3, 'bone').rect(0, 10, 16, 1, 'white');
  for (let i = 0; i < 7; i++) bar.set(pick(r, 0, 15), pick(r, 10, 12), 'grey2');
  bar.set(2, 7, 'amber').set(13, 7, 'amber').set(2, 6, 'yellow').set(13, 6, 'yellow');
  const along = isRoad(c.near.e) && isRoad(c.near.w) && !(isRoad(c.near.n) && isRoad(c.near.s));
  return px.blit(along ? transposed(bar) : bar, 0, 0);
}

/** The sidewalk, with curfew flyers blown along it and a dropped cap now and then. */
function lockwalk(c: TileCtx, r: Rnd): Px {
  const px = townGround('sidewalk', c, rngFor(c, 'sidewalk')) as Px;
  const roll = hash2(c.tx, c.ty, 5111) % 7;
  const x = pick(r, 3, 9), y = pick(r, 3, 9);
  if (roll === 0) { px.rect(x, y, 4, 5, 'bone').frame(x, y, 4, 5, 'grey3').rect(x + 1, y + 1, 2, 1, 'red').rect(x + 1, y + 3, 2, 1, 'grey2'); }
  else if (roll === 1) { px.rect(x, y, 3, 3, 'white').rect(x + 1, y, 1, 3, 'red').set(x + 4, y + 2, 'bone').set(x - 2, y + 4, 'bone'); }
  else if (roll === 2) { px.rect(x, y, 5, 2, 'pine1').rect(x + 1, y - 1, 3, 1, 'pine2').set(x + 4, y + 2, 'soil1'); }
  return px;
}

/** The lawn, trodden through by boots and the checkpoint's jeeps now and then: ruts of bare earth, a pair of boot prints, a scatter of crushed brass. */
function locklawn(c: TileCtx, r: Rnd): Px {
  const px = groundTile('grass', c) as Px;
  const v = hash2(c.tx, c.ty, 5121) % 12;
  if (v === 0) {
    for (let x = 0; x < 16; x++) { px.set(x, 5 + (x >> 3), 'soil1'); px.set(x, 6 + (x >> 3), 'soil2'); px.set(x, 12 - (x >> 4), 'soil1'); px.set(x, 13 - (x >> 4), 'soil2'); }
    px.scatter(r, 'soil3', 4, 0, 5, 16, 3);
  } else if (v === 1 || v === 2) {
    const x = pick(r, 2, 9), y = pick(r, 3, 9);
    px.rect(x, y, 3, 5, 'soil2').rect(x + 1, y, 1, 2, 'soil1').rect(x + 5, y + 2, 3, 5, 'soil2').rect(x + 6, y + 2, 1, 2, 'soil1');
  } else if (v === 3) for (let i = 0; i < 3; i++) px.set(pick(r, 1, 14), pick(r, 1, 14), 'amber');
  return px;
}

// ---------------------------------------------------------------- the house front
const SIDING = (): Px => {
  const px = new Px(16).fill('soil2');
  for (let y = 3; y < 16; y += 4) px.rect(0, y, 16, 1, 'soil1').rect(0, y + 1, 16, 1, 'soil3');
  return px;
};

/** A house wall: boarded up, a lit window with a figure standing in it, or dark. The window is on the odd columns, as the town's houses have it. */
function lockhouse(c: TileCtx, r: Rnd): Px {
  const px = SIDING();
  px.scatter(r, 'soil1', 4);
  if ((c.tx & 1) === 0) return px;
  const v = hash2(c.tx, c.ty, 5131) % 3;
  px.rect(3, 2, 10, 10, 'bone').rect(2, 12, 12, 1, 'soil0').rect(2, 11, 12, 1, 'grey3');
  if (v === 0) {
    px.rect(4, 3, 8, 8, 'teal0');
    px.rect(2, 4, 12, 2, 'soil2').rect(2, 4, 12, 1, 'soil3').rect(3, 8, 11, 2, 'soil2').rect(3, 8, 11, 1, 'soil3');
    px.line(4, 3, 11, 10, 'soil1').line(5, 3, 12, 10, 'soil2');
    for (const [x, y] of [[3, 4], [12, 4], [4, 8], [12, 9]] as [number, number][]) px.set(x, y, 'grey3');
  } else if (v === 1) {
    px.rect(4, 3, 8, 8, 'amber').rect(4, 3, 8, 3, 'yellow').rect(7, 3, 2, 8, 'soil1').rect(4, 7, 8, 1, 'soil1');
    px.rect(5, 5, 2, 4, 'soil0').set(5, 4, 'soil0');
  } else px.rect(4, 3, 8, 8, 'teal0').rect(4, 3, 3, 2, 'blue').set(5, 3, 'sky').rect(7, 3, 2, 8, 'soil1').rect(4, 7, 8, 1, 'soil1');
  return px;
}

/** A house wall under the vines: dark red strands crawling up from the ground with leaves and buds, a window glowing red through them. */
function lockvine(c: TileCtx, r: Rnd): Px {
  const px = SIDING();
  if ((c.tx & 1) === 1) {
    px.rect(3, 2, 10, 10, 'bone').rect(4, 3, 8, 8, 'blood1').rect(4, 3, 8, 3, 'hot').rect(7, 3, 2, 8, 'soil1').rect(4, 7, 8, 1, 'soil1');
    px.rect(2, 12, 12, 1, 'soil0').rect(2, 11, 12, 1, 'grey3');
  }
  const base = hash2(c.tx, c.ty, 5141);
  for (let k = 0; k < 3; k++) {
    let x = 2 + ((base >>> (k * 4)) % 12);
    for (let y = 15; y >= 1; y--) {
      px.set(x, y, 'blood0').set(x + 1, y, 'blood1');
      if (y % 5 === 2) px.set(x + 2, y, 'red').set(x - 1, y - 1, 'blood1');
      if (y % 6 === 0) px.set(x, y - 1, 'pine1').set(x - 1, y, 'pine2');
      x += (hash2(x, y, k + 5143) & 3) === 0 ? ((y & 1) ? 1 : -1) : 0;
      x = Math.max(1, Math.min(13, x));
    }
  }
  for (let i = 0; i < 3; i++) px.set(pick(r, 1, 14), pick(r, 2, 14), 'rose');
  return px;
}

/** A door sealed with the army's yellow and black tape in an X, and a notice pinned beside it. */
function lockdoor(c: TileCtx): Px {
  const px = objectTile('housedoor', c) as Px;
  for (const [x0, y0, x1, y1] of [[2, 2, 13, 14], [13, 2, 2, 14]] as [number, number, number, number][]) {
    for (const o of [0, 1, 2]) px.line(x0 + o, y0, x1 + o, y1, 'yellow');
    px.line(x0 + 3, y0, x1 + 3, y1, 'ink').line(x0 - 1, y0, x1 - 1, y1, 'ink');
  }
  px.rect(0, 6, 2, 4, 'bone').set(0, 7, 'red').set(1, 8, 'grey2');
  return px;
}

// ---------------------------------------------------------------- the rift
/** Where each rift tile's crack runs: points and the half-width at each. Tile 0's right end meets tile 1's left end, and 1's meets 2's. */
const CRACKS: Record<number, [number, number, number][]> = {
  0: [[3, 8, 0.2], [4, 6.5, 0.4], [4, 9, 0.5], [6, 6.5, 0.6], [8, 9, 0.7], [10, 7, 0.7], [12, 9, 0.9], [14, 6.5, 0.9], [15, 7, 0.9]],
  1: [[0, 7, 0.9], [2, 5, 0.9], [4, 8, 1.1], [6, 5.5, 1.2], [8, 9, 1.4], [10, 6.5, 1.3], [12, 10, 1.1], [14, 8, 1], [15, 9, 0.9]],
  2: [[0, 9, 0.9], [2, 11, 0.7], [4, 8.5, 0.7], [6, 11.5, 0.6], [8, 9.5, 0.5], [10, 12.5, 0.4], [12, 10.5, 0.3], [13, 13, 0.2]],
};
/** A branch that stays inside its tile. */
const BRANCH: Record<number, [number, number, number][]> = {
  0: [[6, 8, 0.5], [5, 10, 0.4], [6, 12, 0.3]],
  1: [[8, 8, 0.8], [9, 6, 0.6], [11, 4, 0.5], [12, 2, 0.3]],
  2: [[6, 10, 0.5], [4, 12, 0.4], [5, 14, 0.3]],
};
/** Dark fractures that run out of the glow into the asphalt: [x0, y0, x1, y1]. */
const FRACTURES: Record<number, [number, number, number, number][]> = {
  0: [[3, 8, 1, 13], [10, 8, 13, 2], [13, 9, 15, 13]],
  1: [[4, 7, 2, 1], [12, 10, 14, 15], [7, 9, 4, 14], [10, 7, 12, 1]],
  2: [[4, 9, 2, 3], [8, 10, 11, 15], [11, 11, 14, 7]],
};

const XO = 16, XW = 48;
function stamp(mask: Uint8Array, pts: [number, number, number][]): void {
  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s] as [number, number, number], b = pts[s + 1] as [number, number, number];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, w = a[2] + (b[2] - a[2]) * t;
      for (let yy = Math.floor(y - w); yy <= Math.ceil(y + w); yy++) for (let xx = Math.floor(x - w); xx <= Math.ceil(x + w); xx++) {
        if (xx < -XO || yy < 0 || xx >= XW - XO || yy > 15 || Math.hypot(xx - x, yy - y) > w + 0.35) continue;
        const k = yy * XW + xx + XO;
        mask[k] = Math.max(mask[k] as number, Math.min(3, Math.max(1, Math.round(w * 1.2))));
      }
    }
  }
}

/** The crack of tile i with the cracks of the tiles beside it laid on, shifted a tile over, so the glow runs on across the seam. */
function pathsOf(i: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  if (i > 0) for (const [x, y, w] of CRACKS[i - 1] as [number, number, number][]) out.push([x - 16, y, w]);
  out.push(...(CRACKS[i] as [number, number, number][]));
  if (i < 2) for (const [x, y, w] of CRACKS[i + 1] as [number, number, number][]) out.push([x + 16, y, w]);
  return out;
}

/** A glowing crack in the asphalt: a dark red haze, a red rim, a hot core and an orange vein where it is widest. Three tiles in a row make one rift. */
function rift(i: number, c: TileCtx, r: Rnd, pulse: boolean): Px {
  const px = asphalt(c);
  const mask = new Uint8Array(XW * 16);
  stamp(mask, pathsOf(i));
  stamp(mask, BRANCH[i] as [number, number, number][]);
  const at = (x: number, y: number): number => (x < -XO || x >= XW - XO || y < 0 || y > 15 ? 0 : (mask[y * XW + x + XO] as number));
  const dist = new Float32Array(256).fill(99);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    for (let yy = Math.max(0, y - 5); yy <= Math.min(15, y + 5); yy++) for (let xx = x - 5; xx <= x + 5; xx++) {
      if (!at(xx, yy)) continue;
      const d = Math.hypot(xx - x, yy - y);
      if (d < (dist[y * 16 + x] as number)) dist[y * 16 + x] = d;
    }
  }
  const halo = pulse ? 3.9 : 3.1;
  const black = px32('black');
  for (const [x0, y0, x1, y1] of FRACTURES[i] as [number, number, number, number][]) px.line(x0, y0, x1, y1, 'black').line(x0 + 1, y0, x1 + 1, y1, 'grey3');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = dist[y * 16 + x] as number;
    if (at(x, y)) { px.set(x, y, 'hot'); continue; }
    if (d <= 1.2) px.set(x, y, 'red');
    else if (d <= 1.9) { if (px.get(x, y) !== black) px.set(x, y, 'blood1'); }
    else if (d <= halo && ((x + y) & 1) === 0 && px.get(x, y) !== black) px.set(x, y, 'blood0');
    else if (d <= halo + 1 && ((x + y) & 3) === 0 && px.get(x, y) !== black) px.set(x, y, 'blood0');
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (at(x, y) && at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1)) px.set(x, y, (x * 5 + y * 3) % 5 === 0 ? 'cream' : 'orange');
  }
  // flakes of asphalt thrown off, and a spark or two
  for (let k = 0; k < 4; k++) { const x = pick(r, 1, 14), y = pick(r, 1, 14); if (!at(x, y) && (dist[y * 16 + x] as number) > 2) px.set(x, y, 'grey2'); }
  const sx = i === 2 ? 11 : 8, sy = i === 1 ? 4 : 12;
  px.set(sx, sy, 'yellow');
  if (pulse) px.set(sx + 1, sy - 1, 'cream');
  return px;
}

// ---------------------------------------------------------------- the Lab, held by the army
/** The lab floor with mud tracks, a stencilled arrow, or a strip of yellow and black tape. */
function armyfloor(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, false, true);
  const v = hash2(c.tx, c.ty, 5201) % 4;
  if (v === 0) for (const [x, y] of [[3, 3], [4, 5], [3, 8], [5, 11], [10, 2], [11, 5], [10, 8], [12, 12]] as [number, number][]) px.rect(x, y, 2, 2, 'soil1').set(x, y, 'soil2');
  else if (v === 1) px.rect(7, 2, 3, 9, 'pine2').rect(5, 8, 7, 1, 'pine2').rect(6, 9, 5, 1, 'pine2').rect(7, 10, 3, 1, 'pine2').rect(7, 2, 1, 9, 'pine3');
  else if (v === 2) for (let i = 0; i < 16; i++) { px.set(i, 12, ((i >> 1) & 1) ? 'ink' : 'yellow'); px.set(i, 13, ((i >> 1) & 1) ? 'ink' : 'yellow'); }
  else px.scatter(r, 'soil1', 5, 2, 2, 12, 12);
  return px;
}

/** A bundle of cable taped along the floor, level across the middle of the tile so the runs join. `vertical` turns it a quarter. */
function armycable(c: TileCtx, r: Rnd, vertical: boolean): Px {
  const flat = labFloor(c, r, false, true);
  const run = new Px(16);
  run.rect(0, 5, 16, 6, 'ink').rect(0, 6, 16, 1, 'grey2').rect(0, 7, 16, 2, 'grey1').rect(0, 9, 16, 1, 'black');
  run.rect(0, 5, 16, 1, 'black').set(3, 7, 'grey3').set(9, 6, 'grey3').set(13, 8, 'grey3');
  for (const x of [2, 7, 12]) run.rect(x, 5, 2, 6, 'yellow').rect(x, 5, 2, 1, 'amber').rect(x, 10, 2, 1, 'amber');
  run.rect(0, 11, 16, 1, 'grey3');
  flat.blit(vertical ? transposed(run) : run, 0, 0);
  return flat;
}

/** A crate: olive planks, a lit lid, two straps and a stencil in white. */
function crate(px: Px, x: number, y: number, w: number, h: number, mark: number): void {
  px.rect(x, y, w, h, 'pine1').rect(x, y, w, 2, 'pine3').rect(x, y + 2, w, 1, 'pine2');
  for (let i = x + 3; i < x + w - 1; i += 4) px.rect(i, y + 3, 1, h - 3, 'pine2');
  px.rect(x + 1, y + 3, 2, h - 3, 'soil2').rect(x + w - 3, y + 3, 2, h - 3, 'soil2').rect(x, y + h - 1, w, 1, 'ink');
  px.frame(x, y, w, h, 'ink');
  const sx = x + (w >> 1) - 2;
  px.rect(sx, y + 5, 5, 1, 'bone');
  if (mark === 0) px.rect(sx + 2, y + 6, 1, 2, 'bone'); else px.rect(sx, y + 6, 1, 2, 'bone').rect(sx + 4, y + 6, 1, 2, 'bone');
}

/** A stack of two crates against the floor. */
function armycrate(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, false, true);
  px.rect(0, 14, 16, 2, 'grey2');
  crate(px, 1, 8, 14, 7, hash2(c.tx, c.ty, 5211) & 1);
  crate(px, 3, 1, 10, 7, hash2(c.tx, c.ty, 5213) & 1);
  return px;
}

/** A row of ammunition boxes, two high, with a rolled tarp on top. */
function armycrate2(c: TileCtx, r: Rnd): Px {
  const px = labFloor(c, r, false, true);
  px.rect(0, 14, 16, 2, 'grey2');
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) {
    const x = 1 + k * 7, y = 7 + j * 4 - (j ? 0 : 0);
    px.rect(x, y, 7, 4, 'pine2').rect(x, y, 7, 1, 'pine3').rect(x + 1, y + 2, 5, 1, 'yellow').rect(x + 3, y + 1, 1, 3, 'amber').frame(x, y, 7, 4, 'ink');
  }
  px.rect(1, 3, 14, 3, 'sand').rect(1, 3, 14, 1, 'cream').rect(1, 5, 14, 1, 'soil3').frame(1, 3, 14, 3, 'ink').rect(4, 3, 1, 3, 'soil2').rect(11, 3, 1, 3, 'soil2');
  return px;
}

/** The lab wall with something of the army's hung on it: a tarp, a map with pins in it, or a field radio. */
function armywall(c: TileCtx, r: Rnd): Px {
  const px = labFace(c, r, false);
  const v = hash2(c.tx, c.ty, 5221) % 3;
  if (v === 0) {
    px.rect(0, 0, 16, 10, 'pine2').rect(0, 0, 16, 1, 'pine3').rect(0, 9, 16, 1, 'pine1');
    for (let x = 0; x < 16; x += 5) px.rect(x, 1, 1, 8, 'pine1');
    for (const x of [1, 8, 14]) px.set(x, 1, 'grey3').set(x, 2, 'soil3');
    px.rect(5, 4, 6, 2, 'bone').rect(6, 4, 1, 2, 'ink').rect(9, 4, 1, 2, 'ink');
  } else if (v === 1) {
    px.rect(2, 1, 12, 8, 'bone').frame(2, 1, 12, 8, 'grey2').rect(3, 2, 10, 6, 'sand');
    px.line(4, 7, 11, 2, 'sky').line(3, 4, 12, 5, 'grey2').rect(5, 3, 3, 2, 'pine2');
    for (const [x, y] of [[5, 6], [9, 3], [11, 6]] as [number, number][]) px.set(x, y, 'hot');
    px.rect(1, 1, 2, 1, 'yellow').rect(13, 1, 2, 1, 'yellow');
  } else {
    px.rect(2, 2, 12, 7, 'pine1').frame(2, 2, 12, 7, 'ink').rect(3, 3, 6, 4, 'ink').rect(4, 4, 4, 1, 'leaf').rect(4, 6, 3, 1, 'pine3');
    px.rect(10, 3, 3, 3, 'grey2').set(11, 4, 'amber').set(11, 7, 'hot').line(13, 2, 14, 0, 'grey3');
  }
  return px;
}

// ---------------------------------------------------------------- public
/** The walkable lockdown tiles: the street, the sidewalk, the lawn, the rift and the Lab's floors. Null for any other tile. */
export function lockdownGround(name: LockdownTile, c: TileCtx, r: Rnd, pulse = false): Px | null {
  switch (name) {
    case 'lockroad': return lockroad(c, r);
    case 'lockline': return lockline(c, r);
    case 'lockstop': return lockstop(c, r);
    case 'lockwalk': return lockwalk(c, r);
    case 'locklawn': return locklawn(c, r);
    case 'rift0': return rift(0, c, r, pulse);
    case 'rift1': return rift(1, c, r, pulse);
    case 'rift2': return rift(2, c, r, pulse);
    case 'armyfloor': return armyfloor(c, r);
    case 'armycable': return armycable(c, r, false);
    case 'armycable2': return armycable(c, r, true);
    default: return null;
  }
}

/** The solid lockdown tiles: the house front and the army's crates and wall. Null for any other tile. */
export function lockdownObject(name: LockdownTile, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'lockroof': return objectTile('houseroof', c);
    case 'lockhouse': return lockhouse(c, r);
    case 'lockvine': return lockvine(c, r);
    case 'lockdoor': return lockdoor(c);
    case 'armycrate': return armycrate(c, r);
    case 'armycrate2': return armycrate2(c, r);
    case 'armywall': return armywall(c, r);
    default: return null;
  }
}
