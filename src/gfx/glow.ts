// Painted light pools for night stages. Around each real light (a lamp, a lit window, a string of bulbs, a
// floodlight, the lantern) the ground is lifted and warmed in four dithered steps. It is a decal around the
// light, drawn after the tiles and before the sprites, so nothing else on the screen is dimmed or covered.
// Every pixel is lifted by a whole step, so the pools stay in the pixel-art look with no alpha gradients.
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { settings } from '../core/settings.ts';
import { BAYER4, hash2 } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { stagePixels } from './tiles.ts';
import type { BakedStage } from './tiles.ts';

/** A pool of light. x and y are in SCREEN px, so the world area starts at VIEW_TOP. */
export interface Glow {
  x: number;
  y: number;
  /** Radius in px. */
  r: number;
  /** Strength: 1 is the usual, more makes the pool brighter and reach further into the dither. */
  k?: number;
  /** How much the radius jitters. 0 is steady. */
  flicker?: number;
}

/** One step per pixel of the world view. Sized on first use and again whenever the screen's size changes. */
let W = 0;
let H = 0;
let step = new Uint8Array(0);
/** How much brighter each step is: 0 is untouched, 4 is the heart of the pool. */
const LIFT = [0, 0.3, 0.6, 0.95, 1.35];
/** The color a light adds: amber, so the pools read as warm against the green woods. */
const WARM = [255, 190, 90];

/**
 * The smoothed falloff of a pool of radius R at each whole-pixel offset, one quadrant (the pool is symmetric): index
 * |dy| * (R + 1) + |dx|, -1 outside the radius. It depends on R alone, so it is built once per radius, not per pixel per frame.
 */
const shapes = new Map<number, Float64Array>();
function shapeOf(R: number): Float64Array {
  let t = shapes.get(R);
  if (!t) {
    const n = R + 1;
    t = new Float64Array(n * n);
    for (let dy = 0; dy < n; dy++) {
      for (let dx = 0; dx < n; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = 1 - d / R;
        t[dy * n + dx] = d >= R ? -1 : f * f * (3 - 2 * f);
      }
    }
    shapes.set(R, t);
  }
  return t;
}

/** The part of the world view a set of pools touches, in view px: x0..x1 and y0..y1 inclusive. */
interface Box { x0: number; y0: number; x1: number; y1: number }

/**
 * Works out the step of every pixel the pools touch, into `step`, and returns the box they cover (null when no pool is in view).
 * Only that box is cleared and written, so a few small pools cost a few small loops, not the whole screen.
 */
function fillSteps(lights: readonly Glow[], t: number, level: number): Box | null {
  if (lights.length === 0 || level <= 0) return null;
  if (W !== SCREEN_W || H !== SCREEN_H - VIEW_TOP) {
    W = SCREEN_W;
    H = SCREEN_H - VIEW_TOP;
    step = new Uint8Array(W * H);
  }
  const calm = settings.reduceFlashing;
  // First pass: each pool's radius and box, and the box all of them cover.
  const pools: { cx: number; cy: number; R: number; k: number; x0: number; x1: number; y0: number; y1: number }[] = [];
  let ux0 = W, uy0 = H, ux1 = -1, uy1 = -1;
  lights.forEach((L, li) => {
    const jitter = !calm && L.flicker ? ((hash2(li, (t / 3) | 0, 31) % 200) - 100) / 100 : 0;
    const R = Math.round(L.r * (1 + (L.flicker ?? 0) * 0.14 * jitter));
    if (R < 2) return;
    const cx = Math.round(L.x), cy = Math.round(L.y) - VIEW_TOP;
    const x0 = Math.max(0, cx - R), x1 = Math.min(W - 1, cx + R);
    const y0 = Math.max(0, cy - R), y1 = Math.min(H - 1, cy + R);
    if (x1 < x0 || y1 < y0) return;
    pools.push({ cx, cy, R, k: (L.k ?? 1) * level * 4, x0, x1, y0, y1 });
    if (x0 < ux0) ux0 = x0;
    if (y0 < uy0) uy0 = y0;
    if (x1 > ux1) ux1 = x1;
    if (y1 > uy1) uy1 = y1;
  });
  if (pools.length === 0) return null;
  for (let y = uy0; y <= uy1; y++) step.fill(0, y * W + ux0, y * W + ux1 + 1);
  for (const P of pools) {
    const { cx, cy, R, k } = P;
    const shape = shapeOf(R), n = R + 1;
    for (let y = P.y0; y <= P.y1; y++) {
      const row = Math.abs(y - cy) * n, bayer = (y & 3) * 4;
      for (let x = P.x0; x <= P.x1; x++) {
        const base = shape[row + Math.abs(x - cx)] as number;
        if (base < 0) continue;
        const q = base * k, lo = Math.floor(q);
        // Ordered dither between steps: a Bayer threshold decides whether this pixel rounds up.
        const s = Math.min(4, lo + (q - lo > ((BAYER4[bayer + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
        const i = y * W + x;
        if (s > (step[i] as number)) step[i] = s;
      }
    }
  }
  return { x0: ux0, y0: uy0, x1: ux1, y1: uy1 };
}

/** One lifted channel: the pixel's value brightened by the step's lift, plus the warm light's share. */
const lifted = (v: number, lift: number, warm: number): number => Math.min(255, v * (1 + lift) + warm * lift * 0.2);

/** lifted() for every step and channel value, rounded the way a canvas byte rounds: index step * 768 + channel * 256 + value. */
const LUT = new Uint8ClampedArray(5 * 768);
for (let st = 0; st < 5; st++) for (let c = 0; c < 3; c++) for (let v = 0; v < 256; v++) LUT[st * 768 + c * 256 + v] = lifted(v, LIFT[st] as number, WARM[c] as number);

/** Paints the pools onto what is already on the canvas. level scales every pool, for a stutter or a fade. */
export function paintGlow(ctx: Ctx, lights: readonly Glow[], t: number, level = 1): void {
  const box = fillSteps(lights, t, level);
  if (!box) return;
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  const img = ctx.getImageData(box.x0, VIEW_TOP + box.y0, w, h);
  const px = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0, i = (box.y0 + y) * W + box.x0, p = y * w * 4; x < w; x++, i++, p += 4) {
      const s = step[i] as number;
      if (s === 0) continue;
      const lift = LIFT[s] as number;
      px[p] = lifted(px[p] as number, lift, WARM[0] as number);
      px[p + 1] = lifted(px[p + 1] as number, lift, WARM[1] as number);
      px[p + 2] = lifted(px[p + 2] as number, lift, WARM[2] as number);
    }
  }
  ctx.putImageData(img, box.x0, VIEW_TOP + box.y0);
}

/** What the pools lift: the stage's pixels under them, rebuilt each frame, and the ImageData they are lifted into. */
let source = new Uint32Array(0);
let patch: ImageData | null = null;

/**
 * The same pools as paintGlow, for a stage that was just drawn with drawStage at (camX, camY) (the camera, shake included).
 * paintGlow reads the canvas back to lift what is there, and a read-back makes the browser finish all its drawing first, which
 * took a quarter of every night frame. The stage's own pixels are known, so this lifts those and puts them back, never reading
 * the canvas. Pixel for pixel it gives what paintGlow gives. Call it right after drawStage, before anything else is drawn.
 */
export function paintStageGlow(ctx: Ctx, stage: BakedStage, camX: number, camY: number, lights: readonly Glow[], t: number, level = 1): void {
  const box = fillSteps(lights, t, level);
  if (!box) return;
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  if (source.length < w * h) source = new Uint32Array(w * h);
  stagePixels(stage, Math.round(camX) + box.x0, Math.round(camY) + box.y0, w, h, t, source);
  if (!patch || patch.width < w || patch.height < h) patch = ctx.createImageData(Math.max(w, patch?.width ?? 0), Math.max(h, patch?.height ?? 0));
  const out = new Uint32Array(patch.data.buffer), stride = patch.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0, i = (box.y0 + y) * W + box.x0, q = y * w, p = y * stride; x < w; x++, i++, q++, p++) {
      const v = source[q] as number, st = step[i] as number;
      if (st === 0) { out[p] = v; continue; }
      const b = st * 768;
      out[p] = ((LUT[b + (v & 255)] as number) | ((LUT[b + 256 + ((v >> 8) & 255)] as number) << 8) | ((LUT[b + 512 + ((v >> 16) & 255)] as number) << 16) | 0xff000000) >>> 0;
    }
  }
  ctx.putImageData(patch, box.x0, VIEW_TOP + box.y0, 0, 0, w, h);
}
