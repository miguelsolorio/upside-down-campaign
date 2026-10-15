// The effects of level 9, drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// slam: a Mind Flayer leg striking the floor, x, y the tip, w the length of its line, angle its heading: a streak down the line, eight
// spokes and a ring of dust that spread from the tip, and drops of goo thrown out. glass: the skylight shattering as it comes in, x, y the
// body, w the spread: shafts of light, then panes and shards falling and breaking on the floor. sweep: a leg sweeping a band across the arena,
// x, y its top-left, w and h its size: for t under 40 the warning, a hatched band in hot red with marching dashes along its edges, then the
// strike, a band of white and hot that thins out. And the pools of goo a slam leaves (SimView.pools), drawn on the floor under the actors:
// a puddle that creeps out as it lands, bubbles, and thins to a dither as it dries. Pure pixel work: nothing here uses alpha.
import type { FxView, PoolView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { BAYER4, hash2, linepx, rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { Px } from './px.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));
const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;

// ---------------------------------------------------------------- slam
/** The strike: a streak of white down the line the leg came along, spokes and a ring of dust spreading from the tip, goo thrown out and falling. */
export function slam(ctx: Ctx, f: FxView, p: number): void {
  const x = Math.round(f.x), y = Math.round(f.y);
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  // The streak, back along the line, short and gone in the first third.
  if (p < 0.34) {
    const back = f.angle + Math.PI, len = Math.round(26 * (1 - p * 2.4));
    for (let i = 3; i < len; i++) if ((i + f.t) % 5 < 3) rect(ctx, x + Math.cos(back) * i, y + Math.sin(back) * i * 0.9, 1, 1, i < len * 0.5 ? 'white' : 'cream');
  }
  // Eight spokes, the long ones amber and the short ones white, flat to the floor.
  const reach = 5 + 15 * easeOut(clamp(p * 1.4));
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a), long = k & 1 ? 0.7 : 1;
    if (!keep(x + Math.round(c * reach), y + Math.round(s * reach * 0.65), fade)) continue;
    linepx(ctx, x + c * (reach * 0.45), y + s * reach * 0.3, x + c * reach * long, y + s * reach * 0.65 * long, k & 1 ? 'amber' : 'white');
  }
  // A flash at the tip for the first frames, then a ring of dust.
  if (p < 0.3) for (let j = -2; j <= 2; j++) rect(ctx, x - 4 + Math.abs(j), y + j, 9 - 2 * Math.abs(j), 1, j === 0 ? 'white' : 'cream');
  const r = 6 + 15 * easeOut(p);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, px = x + Math.round(Math.cos(a) * r), py = y + Math.round(Math.sin(a) * r * 0.6);
    if ((i & 1) === 0 && keep(px, py, fade)) rect(ctx, px, py, 1, 1, i % 6 === 0 ? 'white' : 'cream');
  }
  // Goo thrown out: it goes up and comes down.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.5 + unit(k, 1, 90) * 0.6, d = (5 + unit(k, 2, 90) * 9) * easeOut(p), lift = Math.sin(clamp(p * 1.3) * Math.PI) * (4 + unit(k, 3, 90) * 6);
    const px = x + Math.round(Math.cos(a) * d), py = y + Math.round(Math.sin(a) * d * 0.6 - lift);
    if (keep(px, py, fade)) rect(ctx, px, py, 1 + (k & 1), 1, k % 3 === 0 ? 'magenta' : 'purple');
  }
}

// ---------------------------------------------------------------- glass
const SHARD: ColorName[] = ['white', 'sky', 'cyan'];

/**
 * The skylight breaking: shafts of light down from where the body comes in, a few big panes and many shards falling at their own speeds
 * and landing on the floor, where they lie a moment and go. w is the spread across.
 */
export function glass(ctx: Ctx, f: FxView, p: number): void {
  const W = f.w > 0 ? f.w : 128, x0 = Math.round(f.x - W / 2), top = Math.round(f.y) - 70;
  const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
  // Shafts of light, in the first quarter, dotted and thinning.
  if (p < 0.3) {
    for (let i = 0; i < 26; i++) {
      const rx = x0 + Math.round(unit(i, 1, 91) * W), len = 50 + Math.round(unit(i, 2, 91) * 70), k = 1 - p / 0.3;
      for (let y = 0; y < len; y += 6) if (keep(rx, top + y, k)) rect(ctx, rx, top + y, 1, 3, y < len / 2 ? 'white' : 'sky');
    }
  }
  const fall = (i: number, slow: number): { x: number; y: number; landed: boolean } => {
    const floor = Math.round(f.y) + 28 + Math.round(unit(i, 3, 91) * 70), sx = unit(i, 4, 91) * 0.7 + 0.3;
    const q = clamp(p * slow * sx * 1.3), y = top + (floor - top) * q * q * (3 - 2 * q * 0.6);
    return { x: x0 + Math.round(unit(i, 1, 92) * W) + Math.round(Math.sin(p * 9 + i) * 2 * (1 - q)), y: Math.min(floor, Math.round(y)), landed: y >= floor };
  };
  for (let i = 0; i < 48; i++) {
    const s = fall(i, 1.15);
    if (!keep(s.x, s.y, fade)) continue;
    const c = SHARD[i % 3] as ColorName;
    if (s.landed) { rect(ctx, s.x, s.y, 3, 1, c); if (((p * 24 + i) | 0) % 5 === 0) rect(ctx, s.x + 1, s.y - 1, 1, 1, 'white'); }
    else { rect(ctx, s.x, s.y, 2, 2, c); rect(ctx, s.x + 1, s.y, 1, 1, 'white'); }
  }
  // Big panes: a slanted bar with a bright edge, tumbling as it falls.
  for (let i = 0; i < 8; i++) {
    const s = fall(i + 60, 0.85), tilt = ((i + (s.y >> 3)) & 1) ? 1 : -1;
    if (s.landed && fade < 1) continue;
    linepx(ctx, s.x - 4, s.y - tilt * 3, s.x + 4, s.y + tilt * 3, 'sky', 2);
    linepx(ctx, s.x - 4, s.y - tilt * 3 - 1, s.x + 4, s.y + tilt * 3 - 1, 'white');
  }
}

// ---------------------------------------------------------------- sweep
/** The warning is this many frames: the band's t counts up from it (enemies/flayerleg `sweepWarn`). */
const WARN = 40;

/**
 * The sweep. Warning: the band's top and bottom edges in hot red with dashes marching along them, the inside hatched in dark red, and in
 * its last 12 frames the hatch brightens and the dashes thicken. Then the strike: white at the middle and hot above and below it, solid,
 * and thinning out to a dither over the rest of its life.
 */
export function sweep(ctx: Ctx, f: FxView): void {
  const x = Math.round(f.x), y = Math.round(f.y), w = Math.round(f.w), h = Math.round(f.h), t = Math.max(0, f.t);
  if (w <= 0 || h <= 0) return;
  if (t < WARN) {
    const near = t >= WARN - 12;
    ctx.drawImage(band(w, h, near ? 'red' : 'blood1', near ? 2 : 1), x, y);
    for (let i = 0; i < w; i += 8) {
      const d = (i + t) % 8, len = near ? 6 : 4;
      if (d < len) { rect(ctx, x + i, y, len - d, near ? 2 : 1, 'hot'); rect(ctx, x + w - i - len + d, y + h - (near ? 2 : 1), len - d, near ? 2 : 1, 'hot'); }
    }
    return;
  }
  const q = clamp((t - WARN) / Math.max(1, f.life - WARN)), thin = q < 0.35 ? 1 : q < 0.65 ? 0.5 : 0.25;
  for (let j = 0; j < h; j++) {
    const mid = Math.abs(j - (h - 1) / 2), col: ColorName = mid < 2 ? 'white' : mid < h * 0.3 ? 'cream' : mid < h * 0.42 ? 'hot' : 'red';
    if (thin >= 1) rect(ctx, x, y + j, w, 1, col);
    else if (mid < 2 && q < 0.8) rect(ctx, x, y + j, w, 1, col);
    else if ((j & (thin > 0.4 ? 1 : 3)) === 0) rect(ctx, x, y + j, w, 1, col);
  }
}

const bands = new Map<string, HTMLCanvasElement>();
/** The warned band's inside: a dither of one color over the floor, half the pixels (`share` 2) or a quarter (1), cached by size. */
function band(w: number, h: number, c: ColorName, share: number): HTMLCanvasElement {
  const key = `${w}|${h}|${c}|${share}`;
  let img = bands.get(key);
  if (!img) {
    const px = new Px(w, h);
    for (let j = 2; j < h - 2; j++) for (let i = 0; i < w; i++) if (share === 2 ? ((i + j) & 1) === 0 : ((i & 1) === 0 && (j & 1) === 0)) px.set(i, j, c);
    img = px.toCanvas();
    bands.set(key, img);
  }
  return img;
}

// ---------------------------------------------------------------- pools
/** The widest a pool is drawn (the sim's pool radius, enemies/defs.ts `poolR`): the creep and the drying scale it. */
const POOL_RX = 20, POOL_RY = 13;
/** Frames a pool takes to spread when it lands, and the frames at the end of its life over which it dries to nothing. */
const SPREAD = 20, DRY = 100;
const pools = new Map<string, HTMLCanvasElement>();

/** A pool at a size (a share of full, 0 to 1.1), how far it has dried (0 to 1), a phase for its bubbles and a seed for its edge. */
function poolPx(size: number, dry: number, phase: number, seed: number): Px {
  const rx = Math.round(POOL_RX * size), ry = Math.round(POOL_RY * size), px = new Px(2 * POOL_RX + 8, 2 * POOL_RY + 8);
  const cx = POOL_RX + 4, cy = POOL_RY + 4;
  if (dry >= 1) return px;
  for (let y = -ry - 3; y <= ry + 3; y++) {
    for (let x = -rx - 3; x <= rx + 3; x++) {
      const a = Math.atan2(y / POOL_RY, x / POOL_RX), wob = 1 + 0.12 * Math.sin(a * 3 + seed * 2.1) + 0.08 * Math.sin(a * 5 + seed * 4.3);
      const d = ((x * x) / (rx * rx) + (y * y) / (ry * ry)) / (wob * wob);
      if (d > 1 || (dry > 0 && bayer(x + cx, y + cy) < dry * (0.5 + d))) continue;
      const rim = d > 0.78, wet = !rim && bayer(x + cx, y + cy) * 4 > 1 + (1 - d) * 2;
      px.set(cx + x, cy + y, rim ? 'purple0' : wet ? 'purple' : 'purple0');
      if (!rim && d < 0.62 && hash2(x + phase * 5, y, 3) % 23 === 0) px.set(cx + x, cy + y, 'magenta');
    }
  }
  return px;
}

/** A pool of the Mind Flayer's goo on the floor: spreading for the first frames, creeping a little wider for as long as it lies, drying away at the end. */
export function drawPool(ctx: Ctx, p: PoolView): void {
  const grown = easeOut(clamp(p.t / SPREAD)), size = Math.round(Math.min(1.1, (0.35 + 0.65 * grown + 0.1 * clamp(p.t / p.life)) * (p.r / POOL_RX)) * 16) / 16;
  const dry = Math.round(clamp((p.t - (p.life - DRY)) / DRY) * 5) / 5;
  const phase = (p.t >> 4) & 3, seed = hash2(Math.round(p.x), Math.round(p.y), 17) & 3;
  const key = `${size}|${dry}|${phase}|${seed}`;
  let img = pools.get(key);
  if (!img) { img = poolPx(size, dry, phase, seed).toCanvas(); pools.set(key, img); }
  ctx.drawImage(img, Math.round(p.x) - POOL_RX - 4, Math.round(p.y) - POOL_RY - 4);
}
