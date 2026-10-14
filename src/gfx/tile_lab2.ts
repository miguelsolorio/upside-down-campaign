// Hawkins Lab floors, second pass: green clinical tile, office carpet, diamond plate, floor cables, drains, stains
// and creeping vines. Every pixel is a palette color, and each tile reads its position hash so a room is not stamped.
// Cables, drains, stains and vines lie on whatever floor their neighbours show (baseFloor). Pure pixel work, so Node
// can run it. The furniture and the wall tiles of this pass are in tile_lab3.ts.
import type { TileName } from '../core/tiles.ts';
import { createRng } from '../core/rng.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import { isWally, labFloor, wallShadow } from './tile_lab.ts';

export type Rnd = () => number;
/** Paints an outdoor ground tile (gravel, road, dirt, trail) for the tile at hand. Handed in by tile_ground. */
export type BaseFn = (n: TileName) => Px | null;
export const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));

// ---------------------------------------------------------------- green tile, carpet, plate
/** Clinical green tile, 8 px squares with pale grout. Some squares are a lighter green, some are cracked. */
function tilegreen(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16);
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const x = qx * 8, y = qy * 8;
      const light = hash2(c.tx * 2 + qx, c.ty * 2 + qy, 401) % 4 === 0;
      const body: ColorName = light ? 'pine3' : 'pine2';
      px.rect(x, y, 8, 8, 'bone').rect(x, y, 7, 7, body);
      px.rect(x, y, 7, 1, light ? 'leaf' : 'pine3').rect(x, y, 1, 7, light ? 'leaf' : 'pine3');
      px.rect(x + 6, y + 1, 1, 6, 'pine1').rect(x + 1, y + 6, 6, 1, 'pine1');
      px.set(x + 7, y + 7, 'grey3');
    }
  }
  px.scatter(r, 'pine3', 6).scatter(r, 'pine1', 5);
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 403) % 12;
    if (roll === 0) {
      let x = pick(r, 3, 10), y = pick(r, 1, 3);
      for (let i = 0; i < 9; i++) { px.set(x, y, 'pine0'); y++; if (r() < 0.5) x += r() < 0.5 ? 1 : -1; }
    } else if (roll === 1) {
      const x = pick(r, 3, 9), y = pick(r, 3, 9);
      px.rect(x, y, 5, 3, 'teal1').rect(x + 1, y - 1, 3, 1, 'teal1').rect(x + 1, y + 3, 3, 1, 'teal1').set(x + 1, y, 'cyan').set(x + 2, y, 'cyan');
      px.set(x, y + 2, 'teal0').set(x + 4, y + 2, 'teal0');
    } else if (roll === 2) {
      const x = pick(r, 2, 8), y = pick(r, 3, 12);
      for (let i = 0; i < 5; i++) px.set(x + i, y + (i > 2 ? 1 : 0), 'pine1');
    } else if (roll === 3) {
      for (const [x, y] of [[3, 3], [12, 12], [10, 5]] as [number, number][]) px.set(x, y, 'pine0');
    }
  }
  wallShadow(px, c, 'pine1');
  return px;
}

/** Dark office carpet: a diamond weave that runs on across the tiles, faint tile joints, and now and then a spill or a scrap of paper. */
function carpet(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16).fill('shadow');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const gx = c.tx * 16 + x, gy = c.ty * 16 + y;
      if (((gx + gy) & 7) === 0 || ((gx - gy) & 7) === 0) px.set(x, y, 'dusk');
      else if (((gx + gy) & 7) === 4 && ((gx - gy) & 7) === 4) px.set(x, y, (gx >> 3) % 3 === 0 ? 'blood0' : 'night');
    }
  }
  px.scatter(r, 'night', 12).scatter(r, 'dusk', 6).scatter(r, 'slate', 2);
  for (let i = 0; i < 16; i += 2) px.set(i, 15, 'night').set(15, i, 'night').set(i + 1, 0, 'slate').set(0, i + 1, 'slate');
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 405) % 14;
    const x = pick(r, 3, 10), y = pick(r, 3, 11);
    if (roll === 0) px.rect(x, y, 4, 3, 'soil1').rect(x + 1, y + 1, 2, 1, 'soil0').set(x + 3, y + 3, 'soil1');
    else if (roll === 1) px.rect(x, y, 4, 3, 'bone').rect(x, y + 1, 3, 1, 'grey3').set(x + 3, y + 2, 'grey3');
    else if (roll === 2) for (let i = 0; i < 6; i++) px.set(x + i, y + ((i >> 1) & 1), 'slate');
    else if (roll === 3) px.set(x, y, 'blood1').set(x + 1, y, 'blood1').set(x + 2, y + 1, 'red');
    else if (roll === 4) px.rect(x, y, 2, 1, 'grey3').set(x + 1, y + 1, 'mist');
  }
  wallShadow(px, c, 'ink');
  return px;
}

/** One diamond plate lug, a 3 px dash that leans one way or the other. */
function lug(px: Px, x: number, y: number, back: boolean): void {
  for (let i = 0; i < 3; i++) px.set(back ? x + i : x + 2 - i, y + i, i === 0 ? 'bone' : 'grey3');
  px.set(back ? x + 3 : x - 1, y + 3, 'grey1');
}

/** Steel diamond plate: lugs in a checker of two leans, bolted at the corners, scorched here and there. */
function plate(c: TileCtx, r: Rnd, bare = false): Px {
  const px = new Px(16).fill('grey2');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) lug(px, i * 4, j * 4, ((i + j) & 1) === 0);
  px.scatter(r, 'grey1', 3, 1, 1, 14, 14).scatter(r, 'bone', 2, 1, 1, 14, 14);
  px.rect(0, 0, 16, 1, 'mist').rect(0, 0, 1, 16, 'mist').rect(0, 15, 16, 1, 'grey1').rect(15, 0, 1, 16, 'grey1');
  for (const [x, y] of [[1, 1], [13, 1], [1, 13], [13, 13]] as [number, number][]) {
    px.rect(x, y, 2, 2, 'grey1').set(x, y, 'bone');
  }
  if (!bare) {
    const roll = hash2(c.tx, c.ty, 407) % 14;
    const x = pick(r, 4, 9), y = pick(r, 4, 9);
    if (roll < 1) {
      px.rect(x, y, 4, 3, 'ink').rect(x - 1, y + 1, 6, 1, 'ink').set(x, y - 1, 'grey1').set(x + 3, y + 3, 'grey1').set(x + 1, y, 'grey1');
      px.set(x + 2, y + 1, 'sky');
    } else if (roll === 1 || roll === 2) {
      px.rect(x, y, 5, 3, 'grey1').set(x + 1, y, 'ink').set(x + 3, y + 1, 'ink').set(x + 5, y + 2, 'grey1');
    } else if (roll === 3) {
      for (let i = 0; i < 5; i++) px.set(x + i, y + i, 'ink');
      px.set(x + 5, y + 5, 'yellow');
    }
  }
  wallShadow(px, c, 'grey1');
  return px;
}

// ---------------------------------------------------------------- base floor
/** The floor an overlay (cable, drain, stain, vines) lies on: what its neighbours show, else a plain lab floor. */
export function baseFloor(c: TileCtx, base: BaseFn): Px {
  const rnd = createRng(hash2(c.tx, c.ty, 777));
  for (const n of [c.near.s, c.near.n, c.near.e, c.near.w]) {
    switch (n) {
      case 'tilegreen': return tilegreen(c, rnd, true);
      case 'carpet': return carpet(c, rnd, true);
      case 'plate': return plate(c, rnd, true);
      case 'labfloor': return labFloor(c, rnd, false, true);
      case 'labfloor2': return labFloor(c, rnd, true, true);
      case 'gravel': case 'road': case 'dirt': case 'trail': { const b = base(n); if (b) return b; break; }
      case 'roadline': { const b = base('road'); if (b) return b; break; }
      default: break;
    }
  }
  return labFloor(c, rnd, (hash2(c.tx, c.ty, 5) & 1) === 1, true);
}

// ---------------------------------------------------------------- cable
type Side = 'n' | 'e' | 's' | 'w';
const SIDES: Side[] = ['n', 'e', 's', 'w'];
const OPP: Record<Side, Side> = { n: 's', e: 'w', s: 'n', w: 'e' };
const WALLISH = new Set<TileName>(['labwall', 'labcap', 'pipe', 'wallsign', 'mass', 'glass', 'locker', 'bench', 'cabinet', 'shelf', 'cage']);
const THIN: [ColorName, ColorName][] = [['yellow', 'amber'], ['hot', 'blood1'], ['cyan', 'teal1'], ['sky', 'blue']];

/** A black power cable and a thin colored one beside it. They run along lanes fixed per row and column, so they join across tiles. */
function cable(c: TileCtx, _r: Rnd, base: BaseFn): Px {
  const px = baseFloor(c, base);
  const have: Record<Side, boolean> = { n: c.near.n === 'cable', e: c.near.e === 'cable', s: c.near.s === 'cable', w: c.near.w === 'cable' };
  const linked = SIDES.filter((d) => have[d]);
  const con = { ...have };
  if (linked.length === 0) {
    const into = SIDES.find((d) => WALLISH.has(c.near[d]));
    if (into) con[into] = true; else { con.e = true; con.w = true; }
  } else if (linked.length === 1 && WALLISH.has(c.near[OPP[linked[0] as Side]])) con[OPP[linked[0] as Side]] = true;
  const ly = 3 + (hash2(0, c.ty, 71) % 7), lx = 3 + (hash2(c.tx, 0, 72) % 7);
  const horiz = con.w || con.e, vert = con.n || con.s;
  const hx0 = con.w ? 0 : vert ? lx : 5, hx1 = con.e ? 15 : vert ? lx + 2 : 10;
  const vy0 = con.n ? 0 : horiz ? ly : 5, vy1 = con.s ? 15 : horiz ? ly + 2 : 10;
  const [tc, td] = THIN[hash2(0, c.ty, 73) % 4] as [ColorName, ColorName];
  const [vc, vd] = THIN[hash2(c.tx, 0, 74) % 4] as [ColorName, ColorName];
  if (horiz) {
    const x0 = con.w ? 0 : vert ? lx + 4 : hx0, x1 = con.e ? 15 : vert ? lx + 5 : hx1;
    px.rect(x0, ly + 4, x1 - x0 + 1, 1, tc).rect(x0, ly + 5, x1 - x0 + 1, 1, td);
  }
  if (vert) {
    const y0 = con.n ? 0 : horiz ? ly + 4 : vy0, y1 = con.s ? 15 : horiz ? ly + 5 : vy1;
    px.rect(lx + 4, y0, 1, y1 - y0 + 1, vc).rect(lx + 5, y0, 1, y1 - y0 + 1, vd);
  }
  const run = (x: number, y: number, w: number, h: number, across: boolean): void => {
    px.rect(x, y, w, h, 'grey1');
    if (across) px.rect(x, y, w, 1, 'grey2').rect(x, y + h - 1, w, 1, 'ink');
    else px.rect(x, y, 1, h, 'grey2').rect(x + w - 1, y, 1, h, 'ink');
  };
  if (horiz) run(hx0, ly, hx1 - hx0 + 1, 3, true);
  if (vert) run(lx, vy0, 3, vy1 - vy0 + 1, false);
  const plugAt = (x: number, y: number, w: number, h: number): void => { px.rect(x, y, w, h, 'grey2').rect(x, y, w, 1, 'bone').set(x + (w >> 1), y + (h >> 1), 'yellow'); };
  if (horiz && !vert) {
    if (!con.w) plugAt(hx0 - 3, ly - 1, 3, 5);
    if (!con.e) plugAt(hx1 + 1, ly - 1, 3, 5);
  } else if (vert && !horiz) {
    if (!con.n) plugAt(lx - 1, vy0 - 3, 5, 3);
    if (!con.s) plugAt(lx - 1, vy1 + 1, 5, 3);
  }
  if (horiz && !vert && con.w && con.e && hash2(c.tx, c.ty, 75) % 5 === 0) {
    px.rect(5, ly - 1, 6, 8, 'amber').rect(5, ly - 1, 6, 1, 'yellow');
    for (let y = ly; y < ly + 7; y += 2) px.rect(5, y, 6, 1, 'ink');
  }
  return px;
}

// ---------------------------------------------------------------- drain and stain
/** A round floor drain with a rim, a grate and a damp ring. */
function drain(c: TileCtx, r: Rnd, base: BaseFn): Px {
  const px = baseFloor(c, base);
  const v = hash2(c.tx, c.ty, 411) % 4;
  const cx = 7 + (hash2(c.tx, c.ty, 412) % 3), cy = 7 + (hash2(c.tx, c.ty, 413) % 3);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 5.2 && d < 7.4 && ((x + y) & 1) === 0 && !(d > 6.4 && (x * 7 + y * 3) % 4 === 0)) px.set(x, y, v === 3 ? 'soil1' : 'grey3');
    }
  }
  px.disc(cx + 0.5, cy + 0.5, 5.2, 'grey1').disc(cx + 0.5, cy + 0.5, 4.4, v === 3 ? 'soil3' : 'grey3').disc(cx + 0.5, cy + 0.5, 3.4, 'ink');
  px.set(cx - 3, cy - 3, 'white').set(cx - 2, cy - 4, 'white').set(cx + 3, cy + 3, 'grey2');
  if (v === 0) for (let k = -2; k <= 2; k += 2) px.rect(cx - 2, cy + k, 5, 1, 'grey2');
  else if (v === 1) { px.rect(cx - 2, cy, 5, 1, 'grey2').rect(cx, cy - 2, 1, 5, 'grey2'); px.set(cx - 1, cy - 1, 'grey1').set(cx + 1, cy + 1, 'grey1'); }
  else for (const k of [3, 2, 1]) for (let a = 0; a < 8; a++) px.set(Math.round(cx + 0.5 + Math.cos(a * 0.785 + k) * k * 0.9 - 0.5), Math.round(cy + 0.5 + Math.sin(a * 0.785 + k) * k * 0.9 - 0.5), 'grey2');
  if (r() < 0.5) px.set(cx + 2, cy - 1, 'teal1').set(cx + 3, cy - 1, 'cyan');
  return px;
}

/** An ellipse of a stain with a ragged, dithered edge. */
function blob(px: Px, cx: number, cy: number, rx: number, ry: number, core: ColorName, rim: ColorName, seed: number): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry;
      const d = a * a + b * b + (hash2(x, y, seed) % 100) / 400 - 0.12;
      if (d <= 0.78) px.set(x, y, core);
      else if (d <= 1.15 && ((x + y) & 1) === 0) px.set(x, y, rim);
    }
  }
}

/** Dark ooze, oil, or an old stain, with a run down from the wall when there is a wall above it. */
function stain(c: TileCtx, r: Rnd, base: BaseFn): Px {
  const px = baseFloor(c, base);
  const v = hash2(c.tx, c.ty, 421) % 4;
  const seed = hash2(c.tx, c.ty, 422);
  const cx = pick(r, 6, 10), cy = pick(r, 6, 10);
  if (v === 0) {
    blob(px, cx, cy, 5.5, 4, 'ink', 'grey1', seed);
    blob(px, cx - 1, cy - 1, 2.6, 1.8, 'grey1', 'grey1', seed + 1);
    px.set(cx - 2, cy - 1, 'teal0').set(cx - 1, cy - 2, 'dusk').set(cx + 1, cy, 'purple0');
  } else if (v === 1) {
    blob(px, cx, cy, 5, 4.4, 'blood1', 'blood0', seed);
    blob(px, cx, cy + 1, 3, 2.4, 'blood0', 'blood0', seed + 2);
    px.set(cx - 2, cy - 1, 'red');
    for (let i = 0; i < 4; i++) px.set(cx + pick(r, -7, 7), cy + pick(r, -6, 6), 'blood0');
  } else if (v === 2) {
    blob(px, cx, cy, 4.8, 3.6, 'purple0', 'shadow', seed);
    blob(px, cx, cy, 2.8, 1.8, 'night', 'night', seed + 3);
    px.set(cx - 2, cy - 1, 'purple').set(cx + 1, cy - 2, 'purple').set(cx - 1, cy, 'dusk');
  } else {
    blob(px, cx, cy, 3.4, 2.6, 'ink', 'grey1', seed);
    for (let i = 0; i < 8; i++) {
      const a = r() * 6.28, d = 4 + r() * 5;
      px.set(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 'ink');
    }
  }
  if (isWally(c.near.n)) {
    const core: ColorName = v === 1 ? 'blood1' : v === 2 ? 'purple0' : 'ink';
    for (const x of [pick(r, 2, 5), pick(r, 7, 9), pick(r, 11, 13)]) {
      const len = pick(r, 3, 7);
      for (let y = 0; y < len; y++) px.set(x, y, core);
      px.set(x, len, core === 'ink' ? 'grey1' : 'blood0');
    }
  }
  return px;
}

// ---------------------------------------------------------------- vines
/** Where a vine meets the edge between two tiles: the same for both tiles, so they join. */
function edgePoint(c: TileCtx, side: Side): number {
  const [kx, ky, k] = side === 'n' ? [c.tx, c.ty, 91] : side === 's' ? [c.tx, c.ty + 1, 91] : side === 'w' ? [c.tx, c.ty, 92] : [c.tx + 1, c.ty, 92];
  return 3 + (hash2(kx as number, ky as number, k as number) % 10);
}

/** Red-veined growth from the Upside Down, creeping over the floor from its neighbours. */
function vines(c: TileCtx, r: Rnd, base: BaseFn): Px {
  const px = baseFloor(c, base);
  const mask = new Uint8Array(256);
  const mark = (x: number, y: number, v: number): void => { if (x >= 0 && y >= 0 && x < 16 && y < 16 && !mask[y * 16 + x]) mask[y * 16 + x] = v; };
  const cells: [number, number][] = [];
  const nx = pick(r, 5, 10), ny = pick(r, 5, 10);
  const grow = (side: Side): boolean => c.near[side] === 'vines' || c.near[side] === 'mass'
    || (isWally(c.near[side]) && hash2(c.tx, c.ty, 95 + SIDES.indexOf(side)) % 2 === 0);
  let any = false;
  const tendril = (sx: number, sy: number, side: Side | null): void => {
    const steps = Math.max(Math.abs(nx - sx), Math.abs(ny - sy), 4);
    const phase = r() * 6.28, amp = 1 + r() * 1.4;
    const dx = nx - sx, dy = ny - sy, len = Math.hypot(dx, dy) || 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, w = Math.round(Math.sin(t * 5 + phase) * amp * (side ? Math.min(1, t * 3) : 1) * (1 - t * 0.5));
      const x = Math.round(sx + dx * t - (dy / len) * w), y = Math.round(sy + dy * t + (dx / len) * w);
      mark(x, y, 1);
      cells.push([x, y]);
      if (t < 0.6) { if (side === 'n' || side === 's') mark(x + 1, y, 1); else mark(x, y + 1, 1); }
    }
  };
  for (const s of SIDES) {
    if (!grow(s)) continue;
    any = true;
    const e = edgePoint(c, s);
    tendril(s === 'w' ? 0 : s === 'e' ? 15 : e, s === 'n' ? 0 : s === 's' ? 15 : e, s);
  }
  if (!any) {
    const s = SIDES[pick(r, 0, 3)] as Side, e = pick(r, 3, 12);
    tendril(s === 'w' ? 2 : s === 'e' ? 13 : e, s === 'n' ? 2 : s === 's' ? 13 : e, null);
  }
  const twigs = pick(r, 2, 4);
  for (let k = 0; k < twigs && cells.length; k++) {
    const [sx, sy] = cells[pick(r, 0, cells.length - 1)] as [number, number];
    let x = sx, y = sy, dx = pick(r, -1, 1), dy = pick(r, -1, 1);
    if (!dx && !dy) dx = 1;
    for (let i = 0; i < pick(r, 3, 6); i++) {
      x += dx; y += dy;
      if (x < 1 || y < 1 || x > 14 || y > 14) break;
      mark(x, y, 2);
      if (r() < 0.4) { if (r() < 0.5) dx = pick(r, -1, 1); else dy = pick(r, -1, 1); }
    }
  }
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < 16 && y < 16 && mask[y * 16 + x] > 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (on(x, y)) continue;
      const near1 = on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1);
      if (near1 && ((x + y) & 1) === 0) px.set(x, y, 'blood0');
      else if (!near1 && (on(x + 2, y) || on(x - 2, y) || on(x, y + 2) || on(x, y - 2)) && (x * 5 + y * 3) % 7 === 0) px.set(x, y, 'blood0');
    }
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!on(x, y)) continue;
      const lit = !on(x, y - 1) || !on(x - 1, y);
      px.set(x, y, lit && mask[y * 16 + x] === 1 ? 'red' : (x + y) % 5 === 0 ? 'blood0' : 'blood1');
    }
  }
  for (let i = 0; i < 2 && cells.length; i++) { const [x, y] = cells[pick(r, 0, cells.length - 1)] as [number, number]; px.set(x, y, i ? 'pink' : 'hot'); }
  return px;
}

// ---------------------------------------------------------------- public
/** The floors of the second pass. Null for any other tile. */
export function lab2Ground(name: TileName, c: TileCtx, r: Rnd, base: BaseFn): Px | null {
  switch (name) {
    case 'tilegreen': return tilegreen(c, r);
    case 'carpet': return carpet(c, r);
    case 'plate': return plate(c, r);
    case 'cable': return cable(c, r, base);
    case 'drain': return drain(c, r, base);
    case 'stain': return stain(c, r, base);
    case 'vines': return vines(c, r, base);
    default: return null;
  }
}
