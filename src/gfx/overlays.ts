// World overlays for the hard Lab: floor hazards (electric panels, steam grates) and the camera's cone of sight.
// Both take the camera so they can sit anywhere in the frame: called outside the world translate they place
// themselves (world px minus the camera, below the HUD strip, clipped to the world view); called inside it they draw
// in world px as they are. Every pixel is a palette color, shapes fade by dither, and everything is a pure function of
// the view and the frame counter, so there is nothing to keep between frames.
import type { HazardView, PropView } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { settings } from '../core/settings.ts';
import { BAYER4, ctx2d, hash2, linepx, makeCanvas, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ColorName } from './palette.ts';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- placement
/** Where world (0, 0) lands in this context: nowhere new if the caller already translated, else under the camera. */
function origin(ctx: Ctx, camX: number, camY: number): [number, number, boolean] {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const moved = m !== null && (m.e !== 0 || m.f !== 0);
  return moved ? [0, 0, false] : [-Math.round(camX), VIEW_TOP - Math.round(camY), true];
}

function clipped(ctx: Ctx, screen: boolean, draw: () => void): void {
  if (!screen) { draw(); return; }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
  ctx.clip();
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------- a scratch layer for dithered shapes
interface Layer { c: HTMLCanvasElement; g: Ctx; img: ImageData; u: Uint32Array; w: number; h: number }
let layer: Layer | null = null;

/** A cleared w by h area of the shared scratch bitmap. Fill u (stride l.w) with packed colors, then flush it. */
function scratch(w: number, h: number): Layer {
  if (!layer || layer.w < w || layer.h < h) {
    const W = Math.max(w, layer?.w ?? 0), H = Math.max(h, layer?.h ?? 0);
    const c = makeCanvas(W, H), g = ctx2d(c), img = g.createImageData(W, H);
    layer = { c, g, img, u: new Uint32Array(img.data.buffer), w: W, h: H };
  }
  for (let y = 0; y < h; y++) layer.u.fill(0, y * layer.w, y * layer.w + w);
  return layer;
}

function flush(ctx: Ctx, l: Layer, w: number, h: number, x: number, y: number): void {
  l.g.putImageData(l.img, 0, 0, 0, 0, w, h);
  ctx.drawImage(l.c, 0, 0, w, h, x, y, w, h);
}

const dither = (x: number, y: number, k: number): boolean => k * 16 > (BAYER4[(y & 3) * 4 + (x & 3)] as number);
const calm = (): boolean => settings.reduceFlashing;

// ---------------------------------------------------------------- electric
/** Corner brackets of tape around a hazard, so the rectangle reads even while it is off. */
function brackets(ctx: Ctx, x: number, y: number, w: number, h: number, a: ColorName, b: ColorName): void {
  const n = Math.min(5, w >> 1, h >> 1);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]] as [number, number, number, number][]) {
    for (let i = 0; i < n; i++) {
      rect(ctx, cx + i * sx, cy, 1, 1, i & 1 ? b : a);
      rect(ctx, cx, cy + i * sy, 1, 1, i & 1 ? b : a);
    }
  }
}

/** Blue sparks hopping about on the plate: a handful of pixels that jump to a new spot a few times a second. */
function sparks(ctx: Ctx, x: number, y: number, w: number, h: number, frame: number): void {
  const n = Math.max(2, Math.round((w * h) / 90));
  const beat = frame >> (calm() ? 5 : 3);
  for (let i = 0; i < n; i++) {
    const hv = hash2(i, beat, 61);
    if (hv % 3 === 0) continue;
    const sx = x + 1 + (hv >>> 3) % Math.max(1, w - 2), sy = y + 1 + (hv >>> 11) % Math.max(1, h - 2);
    rect(ctx, sx, sy, 1, 1, hv & 4 ? 'cyan' : 'sky');
    if (hv % 5 === 0) { rect(ctx, sx + 1, sy, 1, 1, 'white'); rect(ctx, sx, sy + 1, 1, 1, 'sky'); }
  }
}

/** One arc across the panel, end to end along its long side, zig-zagging, with a pale halo beside it. */
function arc(ctx: Ctx, x: number, y: number, w: number, h: number, lane: number, jitter: number, seed: number): void {
  const along = w >= h, L = along ? w : h, T = along ? h : w;
  const step = 3 + (seed & 1);
  let px = 0, po = lane;
  for (let s = step; s <= L + step - 1; s += step) {
    const at = Math.min(s, L - 1);
    const o = at >= L - 1 ? lane : clamp(lane + (hash2(s, seed, 63) % (jitter * 2 + 1)) - jitter, 1, T - 2);
    const [x0, y0, x1, y1] = along ? [x + px, y + po, x + at, y + o] : [x + po, y + px, x + o, y + at];
    linepx(ctx, x0 + (along ? 0 : 1), y0 + (along ? 1 : 0), x1 + (along ? 0 : 1), y1 + (along ? 1 : 0), 'cyan');
    linepx(ctx, x0, y0, x1, y1, 'white');
    px = at; po = o;
    if (at >= L - 1) break;
  }
}

function electric(ctx: Ctx, h: HazardView, x: number, y: number, w: number, hh: number, frame: number): void {
  if (h.state === 'off') { brackets(ctx, x, y, w, hh, 'amber', 'ink'); return; }
  const beat = (frame >> 4) & 1;
  if (h.state === 'warn') {
    brackets(ctx, x, y, w, hh, beat ? 'yellow' : 'ink', beat ? 'ink' : 'yellow');
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) if (dither(h.x + i, h.y + j, 0.12) && ((i + j) & 1) === 0) rect(ctx, x + i, y + j, 1, 1, 'blue');
    sparks(ctx, x, y, w, hh, frame);
    return;
  }
  const seed = frame >> (calm() ? 5 : 2);
  const l = scratch(w, hh);
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) if (dither(h.x + i, h.y + j, 0.3)) l.u[j * l.w + i] = px32((i + j) & 1 ? 'sky' : 'blue');
  flush(ctx, l, w, hh, x, y);
  brackets(ctx, x, y, w, hh, 'white', 'cyan');
  const along = w >= hh, T = along ? hh : w, n = clamp(Math.round(T / 9), 1, 3);
  for (let a = 0; a < n; a++) arc(ctx, x, y, w, hh, Math.round(((a + 0.5) / n) * T), Math.max(1, Math.min(4, (T / n) >> 1)), seed * 7 + a);
  for (const end of [0, 1]) {
    const ex = along ? (end ? x + w - 2 : x) : x + (w >> 1) - 1, ey = along ? y + (hh >> 1) - 1 : (end ? y + hh - 2 : y);
    rect(ctx, ex, ey, 2, 2, 'white');
  }
  for (let i = 0; i < 4; i++) {
    const hv = hash2(i, seed, 67);
    rect(ctx, x + (hv % w), y + ((hv >>> 8) % hh), 1, 1, 'white');
  }
}

// ---------------------------------------------------------------- steam
function wisps(ctx: Ctx, x: number, y: number, w: number, hh: number, frame: number): void {
  const n = Math.max(3, Math.round(w / 6));
  for (let i = 0; i < n; i++) {
    const bx = x + 2 + Math.round(((i + 0.5) / n) * (w - 4));
    const prog = ((frame * 0.5 + i * 11) % 24) / 24;
    const wy = y + (hh >> 1) - Math.round(prog * 12), wx = bx + Math.round(Math.sin(frame / 14 + i * 2) * (1 + prog * 1.5));
    rect(ctx, wx, wy, 1, 1, prog < 0.5 ? 'bone' : 'mist');
    if (prog < 0.7) rect(ctx, wx, wy + 1, 1, 1, 'mist');
  }
}

/** A plume rising from the grate: dense and white over the vent, thinning into dither as it climbs, drifting up in waves. */
function plume(ctx: Ctx, h: HazardView, x: number, y: number, w: number, hh: number, frame: number): void {
  const rise = Math.round(hh * 0.6 + 14), pad = 3;
  const W = w + pad * 2, H = hh + rise;
  const k = Math.min(1, (h.t + 2) / 10);
  const l = scratch(W, H);
  for (let j = 0; j < H; j++) {
    const up = (hh + rise - 1 - j) - (hh - 1);
    const dy = up > 0 ? up / rise : 0;
    for (let i = 0; i < W; i++) {
      const wid = pad * dy;
      const ex = Math.min(i - (pad - wid), W - 1 - (pad - wid) - i);
      if (ex < 0) continue;
      const wave = Math.sin(((h.x + i) + frame * 0.15) * 0.6 + (h.y + j) * 0.35 - frame * 0.3) * 0.5 + 0.5;
      const d = (up > 0 ? 0.8 * (1 - dy) : 0.85) * (0.55 + 0.45 * wave) * Math.min(1, ex / 3 + 0.3) * k;
      if (!dither(h.x + i, h.y + j, d)) continue;
      l.u[j * l.w + i] = px32(d > 0.62 ? 'white' : d > 0.34 ? 'bone' : 'mist');
    }
  }
  flush(ctx, l, W, H, x - pad, y - rise);
}

function steam(ctx: Ctx, h: HazardView, x: number, y: number, w: number, hh: number, frame: number): void {
  if (h.state === 'warn') wisps(ctx, x, y, w, hh, frame);
  else if (h.state === 'on') plume(ctx, h, x, y, w, hh, frame);
}

// ---------------------------------------------------------------- public: hazards
/**
 * Draws one floor hazard from its view. camX and camY are the camera's top-left in world px, frame is the world
 * frame counter. Electric: tape corners while off, blue sparks while it warns, white-blue arcs across the panel
 * while it is on. Steam: nothing while off, thin wisps from the grate while it warns, a dithered white plume while on.
 */
export function drawHazard(ctx: Ctx, h: HazardView, camX: number, camY: number, frame: number): void {
  const [ox, oy, screen] = origin(ctx, camX, camY);
  const x = Math.round(h.x) + ox, y = Math.round(h.y) + oy, w = Math.max(1, Math.round(h.w)), hh = Math.max(1, Math.round(h.h));
  clipped(ctx, screen, () => (h.kind === 'electric' ? electric(ctx, h, x, y, w, hh, frame) : steam(ctx, h, x, y, w, hh, frame)));
}

// ---------------------------------------------------------------- public: camera cone
/** The cone's half width in radians. The view may carry it in degrees (the def does), and no real half cone is under two radians. */
const halfRad = (half: number): number => (half > 1.6 ? (half * Math.PI) / 180 : half);

/**
 * Draws a camera's cone of sight as a dithered wedge: yellow while calm, red while the prop is alert, nothing once the
 * camera is shot (cam.live false). The wedge is cast in rays from the middle of the camera's rect, as the sim does, and each ray stops at the first solid
 * tile it enters (isSolid takes tile coordinates), so it never shows through a wall. The tile the camera sits in does not count.
 */
export function drawCamCone(ctx: Ctx, p: PropView, isSolid: (tx: number, ty: number) => boolean, camX: number, camY: number, frame: number): void {
  const cam = p.cam;
  if (!cam || !cam.live || cam.range < 4) return;
  const R = Math.min(200, Math.round(cam.range)), half = halfRad(cam.half);
  const hot = p.state === 'alert';
  const wx = p.x + p.w / 2, wy = p.y + p.h / 2;
  const x0 = Math.floor(wx) - R, y0 = Math.floor(wy) - R, S = R * 2 + 1;
  if (x0 - camX >= SCREEN_W || x0 + S - camX <= 0 || y0 - camY >= SCREEN_H || y0 + S - camY <= 0) return;
  const otx = Math.floor(wx / 16), oty = Math.floor(wy / 16);
  const l = scratch(S, S);
  const rays = Math.min(420, Math.ceil(half * 2 * R) + 2);
  for (let i = 0; i < rays; i++) {
    const a = cam.angle - half + (2 * half * i) / (rays - 1), ca = Math.cos(a), sa = Math.sin(a);
    const edge = i === 0 || i === rays - 1;
    let last = -1, ltx = otx, lty = oty, lsolid = false;
    for (let r = 3; r <= R; r++) {
      const px = wx + ca * r, py = wy + sa * r;
      const tx = Math.floor(px / 16), ty = Math.floor(py / 16);
      if (tx !== ltx || ty !== lty) { ltx = tx; lty = ty; lsolid = (tx !== otx || ty !== oty) && isSolid(tx, ty); }
      if (lsolid) break;
      const ix = Math.floor(px) - x0, iy = Math.floor(py) - y0;
      if (ix < 0 || iy < 0 || ix >= S || iy >= S) break;
      const idx = iy * l.w + ix;
      if (edge) l.u[idx] = 2;
      else if (l.u[idx] === 0) l.u[idx] = 1;
      last = r;
    }
    if (last === R) { const ix = Math.floor(wx + ca * R) - x0, iy = Math.floor(wy + sa * R) - y0; if (ix >= 0 && iy >= 0 && ix < S && iy < S) l.u[iy * l.w + ix] = 2; }
  }
  const near: ColorName = hot ? 'hot' : 'yellow', mid: ColorName = hot ? 'red' : 'amber', far: ColorName = hot ? 'blood1' : 'orange';
  const pulse = hot && !calm() && ((frame / 12) | 0) % 2 === 0 ? 0.1 : 0;
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const idx = j * l.w + i, m = l.u[idx] as number;
      if (m !== 1 && m !== 2) continue;
      const gx = x0 + i, gy = y0 + j;
      const d = Math.hypot(gx + 0.5 - wx, gy + 0.5 - wy);
      if (m === 2) { l.u[idx] = ((((d / 2) | 0) + (frame >> 3)) & 1) === 0 ? px32(hot ? 'hot' : 'cream') : px32(near); continue; }
      const k = (1 - d / R) * 0.5 + 0.1 + pulse;
      l.u[idx] = dither(gx, gy, k) ? px32(k > 0.4 ? near : k > 0.24 ? mid : far) : 0;
    }
  }
  const [ox, oy, screen] = origin(ctx, camX, camY);
  clipped(ctx, screen, () => flush(ctx, l, S, S, x0 + ox, y0 + oy));
}
