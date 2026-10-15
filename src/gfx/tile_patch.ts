// Merrill's pumpkin patch (stage 2.1, day): tilled furrows, whole pumpkins, rotten ones with the Upside Down in them, hay
// bales, the rot that spreads over the field and the hole at the end of it. The furrows and the rot are walkable, the rest
// are solid. Objects stand on whatever floor their neighbours show (the under callback, handed in by tile_objects). Veins in
// the rot meet at the tile edges, so a patch of rot is one network. Pure pixel work, so Node can run it. The barn and the
// corn are in tile_barn.ts.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import type { TileCtx } from './tile_ground.ts';
import type { UnderFn } from './tile_lab3.ts';

type Rnd = () => number;
const pick = (r: Rnd, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
const SIDES = ['n', 'e', 's', 'w'] as const;
type Side = (typeof SIDES)[number];

// ---------------------------------------------------------------- furrow
/** Tilled soil in rows 4 px apart that run on across the tiles: a pale ridge, a dark trough, clods, sprouts, and rot creeping in from a rot neighbour. */
function furrow(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('soil2');
  for (let x = 0; x < 16; x++) {
    const gx = c.tx * 16 + x;
    for (let band = 0; band < 4; band++) {
      const yc = band * 4 + 2 + Math.round(Math.sin(gx * 0.45 + band * 2.1 + c.ty) * 0.9);
      px.set(x, yc, 'soil3').set(x, yc - 1, 'soil2').set(x, yc + 1, 'soil2').set(x, yc + 2, 'soil1').set(x, yc - 2, 'soil1');
      if (((gx + band) & 3) === 0) px.set(x, yc - 1, 'sand');
    }
  }
  for (let i = 0; i < 7; i++) { const x = pick(r, 0, 13), y = pick(r, 0, 14); px.rect(x, y, 2, 2, 'soil3').rect(x, y + 1, 2, 1, 'soil1').set(x, y, 'sand'); }
  px.scatter(r, 'soil0', 9).scatter(r, 'soil1', 6);
  const roll = hash2(c.tx, c.ty, 701) % 20;
  const x = pick(r, 3, 11), y = pick(r, 4, 10);
  if (roll < 2) { px.rect(x, y, 1, 3, 'pine2').set(x - 1, y, 'pine3').set(x + 1, y - 1, 'pine3').set(x - 1, y + 1, 'leaf').set(x, y - 1, 'leaf'); }
  else if (roll === 2) px.rect(x, y, 3, 2, 'grey2').set(x, y, 'grey3');
  else if (roll === 3) { for (let i = 0; i < 10; i++) px.set(2 + i, y + (i >> 2) - 1 + ((i & 1) ? 0 : 0), i % 3 === 0 ? 'pine3' : 'pine2'); px.set(5, y - 1, 'leaf').set(9, y + 1, 'leaf'); }
  else if (roll === 4) { px.rect(x, y, 2, 4, 'sand').set(x, y, 'bone'); }
  else if (roll === 5) px.ellipse(x + 2, y + 1, 3, 1.6, 'soil0').set(x + 1, y, 'soil1');
  for (const s of SIDES) {
    if (c.near[s] !== 'rot') continue;
    for (let i = 0; i < 16; i++) {
      const depth = 1 + (hash2(c.tx * 16 + i, c.ty * 5 + SIDES.indexOf(s), 703) % 3);
      for (let d = 0; d < depth; d++) {
        const px2 = s === 'n' || s === 's' ? i : s === 'e' ? 15 - d : d, py2 = s === 'e' || s === 'w' ? i : s === 'n' ? d : 15 - d;
        if (((px2 + py2) & 1) === 0 || d === 0) px.set(px2, py2, d === depth - 1 && (i % 5) === 0 ? 'blood1' : 'soil0');
      }
    }
  }
  return px;
}

// ---------------------------------------------------------------- pumpkins
function groundShadow(px: Px, cx: number, y: number, rx: number): void {
  for (let i = -rx; i <= rx; i++) if ((i + y) & 1) px.set(cx + i, y, 'soil0');
}

/** A pumpkin: lobed orange body with darker ribs, a lit patch, and a curled green stem. */
function gourd(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  px.ellipse(cx, cy + 0.4, rx + 0.6, ry + 0.6, 'soil2').ellipse(cx, cy, rx, ry, 'orange');
  for (const k of [-0.55, 0.55]) for (let y = Math.round(cy - ry + 1); y <= Math.round(cy + ry - 1); y++) { const x = Math.round(cx + k * rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))); if (px.get(x, y)) px.set(x, y, 'soil2'); }
  px.set(Math.round(cx), Math.round(cy - ry + 1), 'soil2');
  px.ellipse(cx - rx * 0.4, cy - ry * 0.3, rx * 0.28, ry * 0.3, 'amber').set(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.45), 'yellow');
  px.rect(Math.round(cx) - 1, Math.round(cy - ry) - 2, 2, 3, 'pine1').set(Math.round(cx) + 1, Math.round(cy - ry) - 2, 'pine2').set(Math.round(cx) - 1, Math.round(cy - ry) - 2, 'pine2');
}

function pumpkin(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'furrow');
  const v = hash2(c.tx, c.ty, 711) % 5;
  groundShadow(px, 8, 15, 6);
  if (v === 0 || v === 4) gourd(px, 8, 9.5, 6, 4.8);
  else if (v === 1) { gourd(px, 5, 10.5, 4.2, 3.6); gourd(px, 11.5, 9.5, 4.6, 4); }
  else if (v === 2) { gourd(px, 4.5, 11.5, 3.6, 3); gourd(px, 11, 11.5, 3.6, 3); gourd(px, 8, 7, 3.6, 3); }
  else { gourd(px, 8, 10, 5.5, 4.4); }
  if (v === 3 || v === 4) { px.line(1, 14, 5, 12, 'pine2').line(11, 13, 15, 11, 'pine2').set(3, 12, 'leaf').set(4, 13, 'pine3').set(13, 12, 'leaf').set(14, 11, 'pine3'); }
  if (v === 4) px.rect(2, 11, 3, 2, 'pine3').rect(12, 13, 3, 2, 'pine3').set(3, 11, 'leaf');
  return px;
}

/** A pumpkin gone over: sunk and dark, grey mould, veins of the Upside Down running out from the stem, and an ooze. */
function rotpumpkin(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'furrow');
  const v = hash2(c.tx, c.ty, 713) % 4;
  groundShadow(px, 8, 15, 6);
  const cx = v === 1 ? 7 : 8, cy = 10.5, rx = v === 2 ? 6.4 : 5.6, ry = v === 2 ? 3.6 : 4.2;
  px.ellipse(cx, cy + 0.5, rx + 0.6, ry + 0.6, 'soil0').ellipse(cx, cy, rx, ry, 'soil1');
  px.ellipse(cx - 1, cy - 1, rx * 0.55, ry * 0.5, 'soil2').scatter(r, 'purple0', 5, 3, 7, 10, 7).scatter(r, 'soil0', 6, 3, 7, 10, 7);
  px.ellipse(cx + 1.5, cy + 0.6, 2, 1.2, 'ink');
  for (let i = 0; i < 4; i++) px.set(pick(r, 4, 12), pick(r, 7, 13), i & 1 ? 'grey3' : 'grey2');
  const a0 = r() * 6;
  for (let k = 0; k < 4; k++) {
    let x = cx, y = cy - ry + 1; const a = a0 + k * 1.6;
    for (let i = 0; i < 7; i++) {
      x += Math.cos(a + i * 0.3) * 0.9; y += Math.abs(Math.sin(a + i * 0.3)) * 0.8 + 0.2;
      const xi = Math.round(x), yi = Math.round(y);
      if (px.get(xi, yi) && yi < 14) px.set(xi, yi, i % 3 === 0 ? 'red' : 'blood1');
    }
  }
  px.rect(7, 4, 2, 3, 'soil0').set(8, 3, 'soil1').set(7, 4, 'pine1');
  if (v !== 3) { px.rect(Math.round(cx) + 3, 12, 1, 3, 'blood1').set(Math.round(cx) + 3, 14, 'red'); }
  if (v === 0) px.set(5, 8, 'hot').set(10, 11, 'hot');
  px.set(2, 14, 'blood1').set(13, 14, 'blood0').set(5, 14, 'blood0');
  return px;
}

// ---------------------------------------------------------------- hay
/** A hay bale: a straw top, a front face with two twine bands, loose wisps. A bale on a bale shows no top. */
function haybale(c: TileCtx, r: Rnd, under: UnderFn): Px {
  const px = under(c, 'dirt');
  const l = c.near.w === 'haybale' ? 0 : 1, rr = c.near.e === 'haybale' ? 15 : 14, w = rr - l + 1;
  const stacked = c.near.n === 'haybale';
  const top = stacked ? 0 : 3, face = stacked ? 0 : 7;
  groundShadow(px, 8, 15, 6);
  if (!stacked) {
    px.rect(l, top, w, 4, 'yellow').rect(l, top, w, 1, 'cream');
    for (let x = l; x <= rr; x++) { if ((x + c.ty) % 3 === 0) px.set(x, top + 1, 'sand'); if ((x * 2 + c.tx) % 5 === 0) px.set(x, top + 2, 'amber'); }
    px.rect(l, top + 3, w, 1, 'sand');
  }
  px.rect(l, face, w, 8, 'sand').rect(l, face, w, 1, 'soil3');
  for (let y = face + 1; y < 14; y += 2) for (let x = l + ((y * 3) & 3); x <= rr; x += 6) px.rect(x, y, 3, 1, 'yellow');
  for (let y = face + 2; y < 15; y += 3) for (let x = l + ((y * 5) & 3); x <= rr; x += 5) px.set(x, y, 'soil3');
  for (const bx of [l + 3, rr - 4]) px.rect(bx, face === 0 ? 0 : top, 1, face === 0 ? 15 : 12, 'soil2');
  px.rect(l, 14, w, 1, 'soil3').rect(l, 15, w, 1, 'soil1');
  if (!stacked) px.set(l + 1, top - 1, 'yellow').set(rr - 2, top - 1, 'sand').set(rr - 5, top - 2, 'yellow');
  if (c.near.w !== 'haybale') px.rect(l, top, 1, 12, 'soil3');
  if (c.near.e !== 'haybale') px.rect(rr, top, 1, 12, 'soil2');
  if (r() < 0.3) px.set(pick(r, l + 2, rr - 2), 2 + (stacked ? 0 : 3), 'yellow');
  return px;
}

// ---------------------------------------------------------------- rot
/** Where a vein crosses the edge between two tiles: the same for both tiles, so it carries on. */
function edgeAt(c: TileCtx, s: Side): number {
  const [kx, ky, k] = s === 'n' ? [c.tx, c.ty, 721] : s === 's' ? [c.tx, c.ty + 1, 721] : s === 'w' ? [c.tx, c.ty, 722] : [c.tx + 1, c.ty, 722];
  return 3 + (hash2(kx as number, ky as number, k as number) % 10);
}

/** The Upside Down in the ground: crusted dark earth, a network of red veins that meet at the edges, mould and pale spores. */
function rot(c: TileCtx, r: Rnd): Px {
  const px = new Px(16).fill('soil1');
  px.scatter(r, 'soil0', 22).scatter(r, 'purple0', 8).scatter(r, 'soil2', 5);
  const nx = pick(r, 6, 9), ny = pick(r, 6, 9);
  const vein = (sx: number, sy: number): void => {
    let x = sx, y = sy;
    const steps = Math.max(Math.abs(nx - sx), Math.abs(ny - sy)) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wob = Math.round(Math.sin(t * 5 + sx + sy) * 1.2 * Math.min(1, t * 3));
      x = Math.round(sx + (nx - sx) * t + (sy === 0 || sy === 15 ? wob : 0));
      y = Math.round(sy + (ny - sy) * t + (sx === 0 || sx === 15 ? wob : 0));
      px.set(x, y, i % 4 === 0 ? 'red' : 'blood1');
      if (i % 3 === 1) px.set(x + 1, y, 'blood0').set(x, y + 1, 'blood0');
    }
  };
  let any = false;
  for (const s of SIDES) {
    if (c.near[s] !== 'rot') continue;
    any = true;
    const e = edgeAt(c, s);
    vein(s === 'w' ? 0 : s === 'e' ? 15 : e, s === 'n' ? 0 : s === 's' ? 15 : e);
  }
  px.rect(nx - 1, ny - 1, 3, 3, 'blood1').set(nx, ny, 'hot').set(nx - 1, ny - 1, 'red');
  if (!any) for (let k = 0; k < 2; k++) { const a = r() * 6.28; for (let i = 2; i < 6; i++) px.set(Math.round(nx + Math.cos(a) * i), Math.round(ny + Math.sin(a) * i), i === 5 ? 'red' : 'blood1'); }
  for (let i = 0; i < 6; i++) px.set(pick(r, 1, 14), pick(r, 1, 14), i < 3 ? 'grey3' : i < 5 ? 'bone' : 'pink');
  if (hash2(c.tx, c.ty, 727) % 6 === 0) { const x = pick(r, 3, 11), y = pick(r, 3, 11); px.frame(x, y, 3, 3, 'blood1').set(x + 1, y + 1, 'red'); }
  return px;
}

// ---------------------------------------------------------------- hole
/** The hole in the ground: a ragged pit that goes red, then black, with a lip of crumbled earth. Neighbouring hole tiles join into one pit. */
function hole(c: TileCtx, r: Rnd): Px {
  const px = new Px(16);
  const wall = (s: Side): boolean => c.near[s] !== 'hole';
  const L = wall('w') ? 1.2 : -14, R = wall('e') ? 14.8 : 30, T = wall('n') ? 1.2 : -14, B = wall('s') ? 14.8 : 30;
  const mx = (L + R) / 2, my = (T + B) / 2, hx = (R - L) / 2, hy = (B - T) / 2, rad = 6;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const qx = Math.abs(x + 0.5 - mx) - hx + rad, qy = Math.abs(y + 0.5 - my) - hy + rad;
      const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
      const depth = -sdf + ((hash2(c.tx * 16 + x, c.ty * 16 + y, 731) % 100) / 100 - 0.5) * 1.8;
      let col: ColorName;
      if (depth <= 0) col = (x + y) & 1 ? 'soil1' : 'soil2';
      else if (depth < 1.2) col = 'soil0';
      else if (depth < 2.8) col = (x + y) & 1 ? 'blood0' : 'soil0';
      else if (depth < 4.6) col = (x + y) & 1 ? 'blood0' : 'ink';
      else col = depth > 7 ? ((x + y) % 3 === 0 ? 'ink' : 'black') : 'ink';
      if (depth > 3 && depth < 6 && hash2(c.tx * 16 + x, c.ty * 16 + y, 733) % 5 === 0) col = 'blood1';
      if (depth > 6 && hash2(c.tx * 16 + x, c.ty * 16 + y, 735) % 29 === 0) col = 'hot';
      px.set(x, y, col);
    }
  }
  for (const s of SIDES) {
    if (!wall(s)) continue;
    for (let k = 0; k < 2; k++) {
      const e = pick(r, 3, 12);
      for (let i = 0; i < 3; i++) {
        const x = s === 'w' ? i : s === 'e' ? 15 - i : e, y = s === 'n' ? i : s === 's' ? 15 - i : e;
        px.set(x, y, i === 2 ? 'red' : 'blood1');
      }
    }
  }
  return px;
}

// ---------------------------------------------------------------- public
/** The walkable patch tiles: furrow, rot and the hole. Null for any other tile. */
export function patchGround(name: TileName, c: TileCtx, r: Rnd): Px | null {
  switch (name) {
    case 'furrow': return furrow(c, r);
    case 'rot': return rot(c, r);
    case 'hole': return hole(c, r);
    default: return null;
  }
}

/** The solid patch tiles: pumpkin, rotpumpkin and haybale. Null for any other tile. */
export function patchObject(name: TileName, c: TileCtx, r: Rnd, under: UnderFn): Px | null {
  switch (name) {
    case 'pumpkin': return pumpkin(c, r, under);
    case 'rotpumpkin': return rotpumpkin(c, r, under);
    case 'haybale': return haybale(c, r, under);
    default: return null;
  }
}
