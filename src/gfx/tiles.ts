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

/** One tile on its own: v picks the position hash (so different variants), t drives water. */
export function tileSample(name: TileName, v: number, t = 0): HTMLCanvasElement {
  const frame = ((t / WATER_TICKS) | 0) & 3;
  const key = `${name}:${v}:${name === 'creek' || name === 'shallows' ? frame : 0}`;
  let c = sampleCache.get(key);
  if (c) return c;
  const tx = 5 + v * 3, ty = 4 + v * 7;
  let near: Near = { n: name, e: name, s: name, w: name };
  if (name === 'pine' || name === 'deadtree' || name === 'bush' || name === 'rock' || name === 'stump' || name === 'lamp' || name === 'mailbox') near = { n: 'grass2', e: 'grass2', s: 'grass2', w: 'grass2' };
  if (name === 'roadline') near = { n: 'road', e: 'roadline', s: 'road', w: 'roadline' };
  if (name === 'planks') near = v === 0 ? { n: 'creek', e: 'trail', s: 'creek', w: 'trail' } : { n: 'planks', e: 'planks', s: 'planks', w: 'planks' };
  if (name === 'trail' || name === 'dirt') near = { n: 'grass', e: v === 1 ? 'grass2' : name, s: name, w: 'grass' };
  if (name === 'fence' || name === 'labfence') near = v === 1 ? { n: name, e: 'grass', s: name, w: 'grass' } : { n: 'grass', e: name, s: 'grass', w: name };
  if (name === 'creek' || name === 'shallows') {
    const banks = v === 0 ? 0 : v === 1 ? 1 : 10;
    c = waterTile(name === 'creek', v, frame, banks).toCanvas();
  } else {
    c = staticTile(name, { tx, ty, near }).toCanvas();
  }
  sampleCache.set(key, c);
  return c;
}
