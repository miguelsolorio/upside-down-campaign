// Stage baking and drawing. bakeStage paints every static tile into one big canvas; drawStage blits the
// visible part and then draws the animated water on top, and the veins and tears of the tunnels and the overrun Lab at the step of their
// pulse. A night stage is baked from the night art (night.ts).
// The day painters always run first, so a night tile is the same tile in a night palette with a few extras.
import type { TileName } from '../core/tiles.ts';
import { TILES } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { settings } from '../core/settings.ts';
import { canvasFromPixels, hash2 } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { Px } from './px.ts';
import { bankMask, groundTile, waterTile } from './tile_ground.ts';
import type { Block, Near, TileCtx } from './tile_ground.ts';
import { objectTile, pulseTile } from './tile_objects.ts';
import { ch4Tile } from './tile_ch4.ts';
import type { Skin } from './tile_ch4.ts';
import { clubNear, clubPulses, windowPhase } from './tile_club.ts';
import { creelNear } from './tile_creel.ts';
import { campBarrel, campNear } from './tile_camp.ts';
import { pitNear } from './tile_pit.ts';
import { litWindow, nightTile, nightWater } from './night.ts';
import { tunnelTile } from './tile_tunnel.ts';
import { findCourts } from './tile_school.ts';
import { fleshTile } from './tile_flesh.ts';

/** A point in world px. */
export interface Spot { readonly x: number; readonly y: number }

/**
 * Opaque handle for a pre-rendered stage. w and h are the stage size in pixels. A night stage lists where its
 * lit windows are (the foot of each one), so the world can paint a pool of light there.
 */
export interface BakedStage { readonly w: number; readonly h: number; readonly night: boolean; readonly windows: readonly Spot[] }

interface WaterSpot { tx: number; ty: number; deep: boolean; variant: number; banks: number }
/** A tile whose light moves: the tunnels' veins, the Gate's tears, the mall's fountain, the base's machine, the camp's burning drum, and the Hellfire Club's windows, the floor under them and the table with its candles. They are baked at their first step and drawn over at the others. */
interface PulseSpot { tx: number; ty: number; name: TileName; near: Near; blk?: Block }
interface StageData extends BakedStage { canvas: HTMLCanvasElement; water: WaterSpot[]; pulses: PulseSpot[] }

const T = 16;
const WATER_TICKS = 16;
/** Frames each step of a pulse lasts: the veins and the tears move through four steps. */
const PULSE_TICKS = 16;
const waterCache = new Map<string, HTMLCanvasElement>();
const pulseCache = new Map<string, HTMLCanvasElement>();

const isPulse = (n: TileName, near: Near): boolean => n === 'veins' || n === 'tear' || n === 'fountain' || n === 'machine' || n === 'barrel' || clubPulses(n, near);
/** The tiles that paint one picture across a run of them, and so need to know where in it they are: the club's table, and a run of its posters, which is the banner. */
const isBlock = (n: TileName): boolean => n === 'fountain' || n === 'machine' || n === 'lift' || n === 'drift' || n === 'dndtable' || n === 'clubposter';

/** The pixels of a pulsing tile at a step of its pulse. */
function pulsePx(name: TileName, c: TileCtx, phase: number): Px {
  if (name === 'veins') return tunnelTile(name, c, phase) as Px;
  if (name === 'barrel') return campBarrel(c, phase);
  if (name === 'clubwindow' || name === 'clubfloor' || name === 'dndtable') return ch4Tile(name, c, undefined, phase) as Px;
  return (name === 'tear' ? fleshTile(name, c, phase) : pulseTile(name, c, phase)) as Px;
}

function pulseCanvas(s: PulseSpot, phase: number, night: boolean): HTMLCanvasElement {
  const key = `${night ? 'n' : 'd'}:${s.name}:${s.tx}:${s.ty}:${phase}`;
  let c = pulseCache.get(key);
  if (!c) {
    const tc: TileCtx = { tx: s.tx, ty: s.ty, near: s.near, ...(s.blk ? { blk: s.blk } : {}) };
    const day = pulsePx(s.name, tc, phase);
    c = (night ? nightTile(day, s.name, tc) : day).toCanvas();
    pulseCache.set(key, c);
  }
  return c;
}

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

function staticTile(name: TileName, c: TileCtx, skin?: Skin): Px {
  return (skin ? ch4Tile(name, c, skin) : null) ?? groundTile(name, c) ?? objectTile(name, c) ?? (groundTile('grass', c) as Px);
}

/**
 * rows use the legend in core/tiles.ts. night bakes the night art instead of the day art. skin 'memory' bakes the Creel House's
 * letters in its Blood red skin, for the room the 4.2 curse turns red (docs/level-11.md); 'upside' in their Upside Down rot (4.4); and
 * 'flash' paints 4.3's letters as a storm's bolt lights them (docs/level-12.md). Every other tile bakes as always.
 */
export function bakeStage(rows: string[], night = false, skin?: Skin): BakedStage {
  const cols = rows[0]?.length ?? 0, nrows = rows.length;
  const names: TileName[] = [];
  for (let y = 0; y < nrows; y++) {
    for (let x = 0; x < cols; x++) names.push((TILES[(rows[y] as string)[x] as string] ?? TILES['.']).name);
  }
  const W = Math.max(1, cols * T), H = Math.max(1, nrows * T);
  const px = new Uint32Array(W * H);
  const water: WaterSpot[] = [];
  const pulses: PulseSpot[] = [];
  const windows: Spot[] = [];
  const mall = names.includes('mallfloor');
  const at = (x: number, y: number, self: TileName): TileName => (x < 0 || y < 0 || x >= cols || y >= nrows ? self : (names[y * cols + x] as TileName));
  /** How far a run of this kind goes from a tile in a direction, not counting the tile. */
  const run = (x: number, y: number, dx: number, dy: number, name: TileName): number => { let n = 0; while (at(x + dx * (n + 1), y + dy * (n + 1), '' as TileName) === name) n++; return n; };
  const courts = findCourts(names, cols);
  for (let ty = 0; ty < nrows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const name = names[ty * cols + tx] as TileName;
      const near: Near = { n: at(tx, ty - 1, name), e: at(tx + 1, ty, name), s: at(tx, ty + 1, name), w: at(tx - 1, ty, name) };
      if (name === 'creek' || name === 'shallows') {
        water.push({ tx, ty, deep: name === 'creek', variant: hash2(tx, ty, 2) % 3, banks: bankMask(near) });
        continue;
      }
      let blk: Block | undefined;
      if (isBlock(name)) { const ox = run(tx, ty, -1, 0, name), oy = run(tx, ty, 0, -1, name); blk = { ox, oy, w: ox + 1 + run(tx, ty, 1, 0, name), h: oy + 1 + run(tx, ty, 0, 1, name) }; }
      const court = courts[ty * cols + tx];
      const tc: TileCtx = { tx, ty, near, ...(court ? { court } : {}), ...(blk ? { blk } : {}), ...(mall && name === 'checker' ? { mall } : {}) };
      if (isPulse(name, near)) pulses.push({ tx, ty, name, near, ...(blk ? { blk } : {}) });
      const day = staticTile(name, tc, skin);
      const tile = night ? nightTile(day, name, tc) : day;
      if (night && litWindow(day, name)) windows.push({ x: tx * T + 8, y: ty * T + 16 });
      for (let j = 0; j < T; j++) {
        const dst = (ty * T + j) * W + tx * T;
        px.set(tile.d.subarray(j * T, j * T + T), dst);
      }
    }
  }
  const data: StageData = { w: W, h: H, night, windows, canvas: canvasFromPixels(px, W, H), water, pulses };
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
  const phase = ((t / PULSE_TICKS) | 0) & 3, storm = windowPhase(t, settings.reduceFlashing);
  for (const p of s.pulses) {
    const px = p.tx * T, py = p.ty * T;
    if (px + T <= x0 || px >= x1 || py + T <= y0 || py >= y1) continue;
    // The club's window and the floor under it keep their own time (rain and lightning), and are baked at the rain's first step, 1.
    const lit = p.name === 'clubwindow' || p.name === 'clubfloor', ph = lit ? storm : phase;
    if (ph === (lit ? 1 : 0)) continue;
    ctx.drawImage(pulseCanvas(p, ph, s.night), px, py);
  }
}

// ---------------------------------------------------------------- single tiles, for the sheet
/** The tunnels' and the overrun Lab's tiles at their best: v 0 in a run, v 1 beside a wall, v 2 at the end of one. */
function l56Near(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'tunnelfloor': return v === 0 ? all(name) : v === 1 ? { n: 'tunnelwall', e: name, s: name, w: name } : { n: 'tunnelwall', e: name, s: name, w: 'tunnelcap' };
    case 'tunnelcap': return v === 0 ? all(name) : v === 1 ? { n: name, e: name, s: 'tunnelwall', w: name } : { n: 'tunnelwall', e: 'tunnelfloor', s: name, w: 'tunnelfloor' };
    case 'tunnelwall': return v === 0 ? { n: 'tunnelcap', e: name, s: 'tunnelfloor', w: name } : v === 1 ? { n: 'tunnelcap', e: name, s: 'roots', w: name } : { n: 'tunnelcap', e: 'tunnelfloor', s: 'tunnelfloor', w: name };
    case 'roots': return v === 0 ? { n: 'tunnelwall', e: name, s: 'tunnelfloor', w: name } : v === 1 ? { n: name, e: 'tunnelfloor', s: name, w: 'tunnelwall' } : { n: 'tunnelwall', e: name, s: name, w: 'tunnelfloor' };
    case 'veins': return v === 0 ? all(name) : v === 1 ? { n: name, e: name, s: 'tunnelfloor', w: 'tunnelfloor' } : { n: 'tunnelfloor', e: 'nest', s: name, w: name };
    case 'nest': return v === 0 ? all(name) : v === 1 ? { n: name, e: 'tunnelfloor', s: name, w: 'tunnelfloor' } : { n: 'tunnelfloor', e: 'tunnelfloor', s: name, w: 'tunnelwall' };
    case 'ladder': return all('tunnelfloor');
    case 'fleshfloor': return v === 0 ? all(name) : v === 1 ? { n: 'fleshwall', e: name, s: name, w: name } : { n: name, e: 'labfloor', s: 'tear', w: name };
    case 'fleshwall': return v === 0 ? { n: 'labcap', e: name, s: 'fleshfloor', w: name } : v === 1 ? { n: 'labcap', e: 'labwall', s: 'fleshfloor', w: name } : { n: 'labcap', e: name, s: 'labfloor', w: 'labwall' };
    case 'tear': return v === 0 ? { n: 'fleshfloor', e: name, s: 'fleshfloor', w: name } : v === 1 ? { n: name, e: 'fleshfloor', s: name, w: 'fleshfloor' } : { n: 'fleshfloor', e: 'fleshfloor', s: name, w: 'fleshfloor' };
    default: return near;
  }
}

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

/** The street, the patch and the barn at their best: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
function patchNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  const run = (self: TileName, floor: TileName, wall: TileName): Near => v === 0 ? { n: wall, e: self, s: floor, w: self }
    : v === 1 ? { n: wall, e: self, s: floor, w: floor } : { n: wall, e: floor, s: floor, w: self };
  switch (name) {
    case 'arcadecarpet': return v === 0 ? all(name) : v === 1 ? { n: 'arcadewall', e: name, s: name, w: name } : { n: 'arcadewall', e: name, s: name, w: 'arcadewall' };
    case 'arcadewall': return run(name, 'arcadecarpet', 'arcadewall');
    case 'sidewalk': return v === 0 ? { n: 'storefront', e: name, s: 'road', w: name } : v === 1 ? all(name) : { n: 'grass', e: name, s: 'road', w: 'grass' };
    case 'storefront': return run(name, 'sidewalk', 'brick');
    case 'furrow': return v === 0 ? all(name) : v === 1 ? { n: name, e: 'rot', s: name, w: name } : { n: 'rot', e: name, s: name, w: 'haybale' };
    case 'pumpkin': case 'rotpumpkin': return all('furrow');
    case 'haybale': return v === 0 ? { n: 'dirt', e: name, s: 'dirt', w: name } : v === 1 ? { n: name, e: name, s: 'dirt', w: name } : { n: 'dirt', e: 'dirt', s: 'dirt', w: name };
    case 'rot': return v === 0 ? all(name) : v === 1 ? { n: 'furrow', e: name, s: name, w: name } : { n: name, e: 'dirt', s: name, w: name };
    case 'hole': return v === 0 ? all(name) : v === 1 ? { n: 'rot', e: name, s: name, w: name } : all('rot');
    case 'barnwall': return run(name, 'dirt', 'barnroof');
    case 'barnroof': return v === 0 ? { n: name, e: name, s: 'barnwall', w: name } : v === 1 ? { n: 'grass', e: name, s: name, w: name } : { n: name, e: 'grass', s: 'barnwall', w: name };
    case 'corn': return v === 0 ? all(name) : v === 1 ? { n: 'furrow', e: name, s: 'furrow', w: name } : { n: name, e: 'hole', s: name, w: name };
    default: return near;
  }
}

/** The food court at its best: v 0 in a run, v 1 at an edge, v 2 beside something else it meets; a stall under its awning, the escalator between its rails. */
function foodNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'foodfloor': return v === 0 ? all(name) : v === 1 ? { n: 'stall', e: name, s: name, w: name } : { n: 'stall', e: name, s: name, w: 'foodband' };
    case 'foodband': return v === 2 ? { n: name, e: 'foodfloor', s: name, w: 'foodfloor' } : { n: 'foodfloor', e: name, s: 'foodfloor', w: name };
    case 'skyfloor': return v === 0 ? all(name) : v === 1 ? { n: 'foodfloor', e: name, s: name, w: 'foodfloor' } : { n: 'foodfloor', e: 'foodfloor', s: name, w: name };
    case 'stallcap': return { n: 'mallcap', e: name, s: 'stall', w: name };
    case 'stall': return { n: 'stallcap', e: name, s: 'foodfloor', w: name };
    case 'kitchenfloor': return v === 0 ? all(name) : { n: 'fryer', e: name, s: name, w: name };
    case 'escalator': return v === 0 ? { n: name, e: name, s: name, w: 'railing' } : v === 1 ? { n: name, e: 'railing', s: name, w: name } : all(name);
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
  near = creelNear(name, v, clubNear(name, v, pitNear(name, v, campNear(name, v, foodNear(name, v, l56Near(name, v, patchNear(name, v, schoolNear(name, v, lab2Near(name, v, labNear(name, v, near))))))))));
  // The fountain, the lift and the machine are one picture over a block: v 0 is its top left piece, v 1 the one beside it, v 2 one inside.
  if (name === 'fountain' || name === 'lift' || name === 'machine') {
    const floor: TileName = name === 'machine' ? 'basefloor' : 'mallfloor';
    near = { n: v === 2 ? name : floor, e: name, s: name, w: v === 0 ? floor : name };
  }
  // The club's table is a 3 by 2 block (v 0 its top left piece, v 1 one on its skirt, v 2 the right end of it) and a poster run of two is the banner (v 1 its left half, v 2 its right).
  const blk: Block | undefined = name === 'dndtable' ? { ox: [0, 1, 2][v] as number, oy: v === 0 ? 0 : 1, w: 3, h: 2 } : name === 'clubposter' && v > 0 ? { ox: v - 1, oy: 0, w: 2, h: 1 } : undefined;
  return staticTile(name, { tx, ty, near, ...(blk ? { blk } : {}) });
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
