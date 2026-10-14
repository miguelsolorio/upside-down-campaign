// Stage baking and drawing. bakeStage paints every static tile into one big canvas; drawStage blits the
// visible part and then draws the animated water on top. A night stage is baked from the night art (night.ts).
// The day painters always run first, so a night tile is the same tile in a night palette with a few extras.
import type { TileName } from '../core/tiles.ts';
import { TILES } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { canvasFromPixels, hash2 } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { Px } from './px.ts';
import { bankMask, groundTile, waterTile } from './tile_ground.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { objectTile } from './tile_objects.ts';
import { litWindow, nightTile, nightWater } from './night.ts';

/** A point in world px. */
export interface Spot { readonly x: number; readonly y: number }

/**
 * Opaque handle for a pre-rendered stage. w and h are the stage size in pixels. A night stage lists where its
 * lit windows are (the foot of each one), so the world can paint a pool of light there.
 */
export interface BakedStage { readonly w: number; readonly h: number; readonly night: boolean; readonly windows: readonly Spot[] }

interface WaterSpot { tx: number; ty: number; deep: boolean; variant: number; banks: number }
interface StageData extends BakedStage { canvas: HTMLCanvasElement; water: WaterSpot[] }

const T = 16;
const WATER_TICKS = 16;
const waterCache = new Map<string, HTMLCanvasElement>();

function waterCanvas(s: WaterSpot, frame: number, night: boolean): HTMLCanvasElement {
  const key = `${night ? 'n' : 'd'}:${s.deep ? 1 : 0}:${s.variant}:${frame}:${s.banks}`;
  let c = waterCache.get(key);
  if (!c) {
    const day = waterTile(s.deep, s.variant, frame, s.banks);
    c = (night ? nightWater(day, s.deep, s.variant, frame) : day).toCanvas();
    waterCache.set(key, c);
  }
  return c;
}

function staticTile(name: TileName, c: TileCtx): Px {
  return groundTile(name, c) ?? objectTile(name, c) ?? (groundTile('grass', c) as Px);
}

/** rows use the legend in core/tiles.ts. night bakes the night art instead of the day art. */
export function bakeStage(rows: string[], night = false): BakedStage {
  const cols = rows[0]?.length ?? 0, nrows = rows.length;
  const names: TileName[] = [];
  for (let y = 0; y < nrows; y++) {
    for (let x = 0; x < cols; x++) names.push((TILES[(rows[y] as string)[x] as string] ?? TILES['.']).name);
  }
  const W = Math.max(1, cols * T), H = Math.max(1, nrows * T);
  const px = new Uint32Array(W * H);
  const water: WaterSpot[] = [];
  const windows: Spot[] = [];
  const at = (x: number, y: number, self: TileName): TileName => (x < 0 || y < 0 || x >= cols || y >= nrows ? self : (names[y * cols + x] as TileName));
  for (let ty = 0; ty < nrows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const name = names[ty * cols + tx] as TileName;
      const near: Near = { n: at(tx, ty - 1, name), e: at(tx + 1, ty, name), s: at(tx, ty + 1, name), w: at(tx - 1, ty, name) };
      if (name === 'creek' || name === 'shallows') {
        water.push({ tx, ty, deep: name === 'creek', variant: hash2(tx, ty, 2) % 3, banks: bankMask(near) });
        continue;
      }
      const tc: TileCtx = { tx, ty, near };
      const day = staticTile(name, tc);
      const tile = night ? nightTile(day, name, tc) : day;
      if (night && litWindow(day, name)) windows.push({ x: tx * T + 8, y: ty * T + 16 });
      for (let j = 0; j < T; j++) {
        const dst = (ty * T + j) * W + tx * T;
        px.set(tile.d.subarray(j * T, j * T + T), dst);
      }
    }
  }
  const data: StageData = { w: W, h: H, night, windows, canvas: canvasFromPixels(px, W, H), water };
  return data;
}

/** Draws the visible part of the stage, animated tiles included. t is the world frame counter. */
export function drawStage(ctx: Ctx, stage: BakedStage, camX: number, camY: number, t: number): void {
  const s = stage as StageData;
  const cx = Math.floor(camX), cy = Math.floor(camY);
  const x0 = Math.max(0, cx), y0 = Math.max(0, cy);
  const x1 = Math.min(s.w, cx + SCREEN_W), y1 = Math.min(s.h, cy + SCREEN_H - VIEW_TOP);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(s.canvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  const frame = ((t / WATER_TICKS) | 0) & 3;
  for (const w of s.water) {
    const px = w.tx * T, py = w.ty * T;
    if (px + T <= x0 || px >= x1 || py + T <= y0 || py >= y1) continue;
    ctx.drawImage(waterCanvas(w, frame, s.night), px, py);
  }
}

// ---------------------------------------------------------------- single tiles, for the sheet
const sampleCache = new Map<string, HTMLCanvasElement>();

/** Neighbours that show a lab tile at its best: v 0 sits in a run, v 1 at an end, v 2 beside a wall. */
function labNear(name: TileName, v: number, near: Near): Near {
  switch (name) {
    case 'labfloor': case 'labfloor2': return v === 0 ? { n: name, e: name, s: name, w: name } : v === 1 ? { n: 'labwall', e: name, s: name, w: name } : { n: 'labwall', e: name, s: name, w: 'labcap' };
    case 'hazard': return v === 2 ? { n: 'labwall', e: name, s: name, w: name } : { n: name, e: name, s: name, w: name };
    case 'vent': return { n: v === 1 ? 'labwall' : 'labfloor', e: 'labfloor', s: 'labfloor', w: 'labfloor' };
    case 'labwall': return v === 0 ? { n: 'labcap', e: name, s: 'labfloor', w: name } : v === 1 ? { n: 'labcap', e: 'labfloor', s: 'labfloor', w: name } : { n: 'labcap', e: name, s: 'labfloor', w: 'labfloor' };
    case 'labcap': return v === 0 ? { n: name, e: name, s: 'labwall', w: name } : v === 1 ? { n: 'labfloor', e: 'labfloor', s: 'labwall', w: name } : { n: 'labfloor', e: name, s: 'labfloor', w: 'labfloor' };
    case 'pipe': return v === 1 ? { n: name, e: 'labwall', s: name, w: 'labwall' } : { n: 'labcap', e: name, s: 'labfloor', w: name };
    case 'glass': return v === 0 ? { n: 'labcap', e: name, s: 'labfloor', w: name } : v === 1 ? { n: 'labcap', e: 'labwall', s: 'labfloor', w: 'labwall' } : { n: 'labcap', e: 'labwall', s: 'labfloor', w: name };
    case 'cage': return { n: 'labwall', e: v === 1 ? 'cage' : 'labfloor', s: 'labfloor', w: 'labfloor' };
    default: return near;
  }
}

/** The second pass of lab tiles, at their best: v 0 in a run, v 1 at one end of it, v 2 at the other or against a wall. */
function lab2Near(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  const run = (self: TileName, floor: TileName): Near => v === 0 ? { n: 'labwall', e: self, s: floor, w: self }
    : v === 1 ? { n: 'labwall', e: self, s: floor, w: floor } : { n: 'labwall', e: floor, s: floor, w: self };
  switch (name) {
    case 'tilegreen': case 'carpet': case 'plate':
      return v === 0 ? all(name) : v === 1 ? { n: 'labwall', e: name, s: name, w: name } : { n: 'labwall', e: name, s: name, w: 'labcap' };
    case 'cable': return v === 0 ? { n: 'plate', e: name, s: 'plate', w: name } : v === 1 ? { n: name, e: name, s: 'labfloor2', w: 'labfloor2' } : { n: 'plate', e: name, s: 'plate', w: 'plate' };
    case 'drain': return all('tilegreen');
    case 'stain': return v === 0 ? all('labfloor') : v === 1 ? { n: 'labwall', e: 'labfloor', s: 'labfloor', w: 'labfloor' } : all('gravel');
    case 'vines': return v === 0 ? { n: 'mass', e: name, s: 'carpet', w: 'carpet' } : v === 1 ? { n: 'labwall', e: name, s: 'labfloor', w: name } : all('carpet');
    case 'locker': return run(name, 'labfloor');
    case 'bench': return run(name, 'tilegreen');
    case 'cabinet': return run(name, 'carpet');
    case 'shelf': return run(name, 'labfloor');
    case 'mass': return v === 0 ? { n: 'labcap', e: name, s: 'vines', w: 'labwall' } : v === 1 ? { n: 'labcap', e: 'labwall', s: 'vines', w: name } : { n: 'labcap', e: 'labwall', s: 'carpet', w: 'labwall' };
    case 'wallsign': return { n: 'labcap', e: 'labwall', s: 'labfloor', w: 'labwall' };
    default: return near;
  }
}

/** The school's tiles at their best: v 0 in a run, v 1 at one end of it, v 2 at the other or against a wall. */
function schoolNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  const run = (self: TileName, floor: TileName, wall: TileName): Near => v === 0 ? { n: wall, e: self, s: floor, w: self }
    : v === 1 ? { n: wall, e: self, s: floor, w: floor } : { n: wall, e: floor, s: floor, w: self };
  switch (name) {
    case 'schoolfloor': case 'checker': return v === 0 ? all(name) : v === 1 ? { n: 'schoolwall', e: name, s: name, w: name } : { n: 'schoolwall', e: name, s: name, w: 'lockerwall' };
    case 'gymfloor': return v === 0 ? all(name) : v === 1 ? { n: 'bleachers', e: name, s: name, w: name } : { n: name, e: 'schoolwall', s: 'schoolwall', w: name };
    case 'schoolwall': case 'lockerwall': case 'chalkboard': case 'trophy': return run(name, 'schoolfloor', 'schoolcap');
    case 'schoolcap': return v === 0 ? { n: name, e: name, s: 'schoolwall', w: name } : v === 1 ? { n: 'schoolfloor', e: 'schoolfloor', s: 'schoolwall', w: name } : { n: 'schoolfloor', e: name, s: 'schoolfloor', w: 'schoolfloor' };
    case 'brick': return v === 0 ? { n: 'schoolcap', e: name, s: 'gravel', w: name } : v === 1 ? { n: name, e: name, s: 'gravel', w: name } : { n: 'schoolcap', e: name, s: name, w: name };
    case 'desk': return run(name, 'schoolfloor', 'schoolwall');
    case 'table': case 'counter': return run(name, 'checker', 'schoolwall');
    case 'bleachers': return run(name, 'gymfloor', 'schoolwall');
    default: return near;
  }
}

/** The pixels of one tile on its own, beside the neighbours that show it at its best. Water is not here: see tileSample. */
export function samplePx(name: TileName, v: number): Px {
  const tx = 5 + v * 3, ty = 4 + v * 7;
  let near: Near = { n: name, e: name, s: name, w: name };
  if (name === 'pine' || name === 'deadtree' || name === 'bush' || name === 'rock' || name === 'stump' || name === 'lamp' || name === 'mailbox') near = { n: 'grass2', e: 'grass2', s: 'grass2', w: 'grass2' };
  if (name === 'roadline') near = { n: 'road', e: 'roadline', s: 'road', w: 'roadline' };
  if (name === 'planks') near = v === 0 ? { n: 'creek', e: 'trail', s: 'creek', w: 'trail' } : { n: 'planks', e: 'planks', s: 'planks', w: 'planks' };
  if (name === 'trail' || name === 'dirt') near = { n: 'grass', e: v === 1 ? 'grass2' : name, s: name, w: 'grass' };
  if (name === 'fence' || name === 'labfence') near = v === 1 ? { n: name, e: 'grass', s: name, w: 'grass' } : { n: 'grass', e: name, s: 'grass', w: name };
  near = schoolNear(name, v, lab2Near(name, v, labNear(name, v, near)));
  return staticTile(name, { tx, ty, near });
}

/** One tile on its own: v picks the position hash (so different variants), t drives water. */
export function tileSample(name: TileName, v: number, t = 0): HTMLCanvasElement {
  const frame = ((t / WATER_TICKS) | 0) & 3;
  const key = `${name}:${v}:${name === 'creek' || name === 'shallows' ? frame : 0}`;
  let c = sampleCache.get(key);
  if (c) return c;
  if (name === 'creek' || name === 'shallows') {
    const banks = v === 0 ? 0 : v === 1 ? 1 : 10;
    c = waterTile(name === 'creek', v, frame, banks).toCanvas();
  } else {
    c = samplePx(name, v).toCanvas();
  }
  sampleCache.set(key, c);
  return c;
}
