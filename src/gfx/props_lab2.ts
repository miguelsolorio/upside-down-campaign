// Lab props, second pass: the specimen tank, the server rack, the generator and the ceiling camera. Each is drawn at
// its spawn size, w by h. The body is cached static art (repainted at night like any prop); the live parts (fluid and
// bubbles, LEDs, sparks, the camera lens) are drawn over it from PropView.t alone, so a prop is a pure function of its
// view. Nothing here changes brightness faster than 3 Hz: an LED cycle is 24 frames or more.
import type { PropView } from '../core/types.ts';
import { hash2, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';

/** Builds (and caches) a body: the key names it, build paints it. At night the body is repainted in the night palette. */
export type ArtFn = (key: string, build: () => Px) => HTMLCanvasElement;

/** The art with a 1 px dark rim, so it is 2 px bigger each way. */
export function rim(art: Px): Px {
  const out = new Px(art.w + 2, art.h + 2);
  out.blit(art, 1, 1);
  return out.outline('ink');
}

const blink = (t: number, period: number, phase: number, on: number): boolean => ((t + phase) % period) < on;

// ---------------------------------------------------------------- tank
/** The tank's frame: lid, posts, a dark inside for the fluid to sit in, and a plinth with a status plate. */
function tankBack(w: number, h: number): Px {
  const p = new Px(w, h);
  p.rect(0, 2, w, h - 5, 'teal0');
  p.rect(0, 0, w, 2, 'grey3').rect(0, 0, w, 1, 'bone').rect(0, 1, w, 1, 'grey2');
  p.rect((w >> 1) - 1, 0, 3, 1, 'grey1');
  p.rect(0, 2, 1, h - 5, 'grey2').rect(w - 1, 2, 1, h - 5, 'grey1');
  p.rect(0, h - 3, w, 3, 'grey1').rect(0, h - 3, w, 1, 'grey2').rect(0, h - 1, w, 1, 'ink');
  p.rect(2, h - 2, 3, 1, 'yellow').set(3, h - 2, 'ink').set(w - 3, h - 2, 'leaf').set(w - 5, h - 2, 'hot');
  return p;
}

/** The glass in front of the fluid: a bright edge on each side, a rim at the top, a glint or two. */
function tankFront(w: number, h: number): Px {
  const p = new Px(w, h);
  p.rect(1, 2, w - 2, 1, 'cyan');
  for (let y = 4; y < h - 5; y += 2) p.set(2, y, 'white');
  p.rect(w - 3, 3, 1, h - 7, 'sky').set(w - 3, 3, 'white');
  p.rect(1, h - 4, w - 2, 1, 'sky');
  if (w >= 20) for (let k = 0; k < 3; k++) p.set((w >> 1) + 2 + k, 4 + k, 'white');
  return p;
}

function tankLive(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, kind: number): void {
  const fx = x + 2, fw = w - 4, top = y + 3, fh = h - 7;
  if (fw < 2 || fh < 2) return;
  rect(ctx, fx, top, fw, fh, 'pine2');
  rect(ctx, fx, top, Math.min(2, fw), fh, 'pine3');
  rect(ctx, fx + fw - 2, top, 2, fh, 'pine1');
  for (let j = Math.floor(fh * 0.6); j < fh; j++) for (let i = 0; i < fw; i++) if (((i + j) & 1) === 0 || j >= fh * 0.85) rect(ctx, fx + i, top + j, 1, 1, j >= fh - 1 ? 'pine0' : 'pine1');
  for (let i = 0; i < fw; i++) if (((i + (t >> 4)) & 3) !== 0) rect(ctx, fx + i, top, 1, 1, 'leaf');
  for (let i = 0; i < fw; i += 3) rect(ctx, fx + i, top + 1, 1, 1, 'pine3');
  rect(ctx, x + (w >> 1), y + h - 5, 2, 1, 'grey3');
  const cx = x + (w >> 1), mid = top + (fh >> 1);
  if (kind === 0) {
    for (let k = 0; k < 2; k++) {
      const bx = fx + 2 + k * (fw - 6), sway = ((t >> 5) + k) & 1;
      for (let j = 0; j < Math.min(5, fh - 2); j++) rect(ctx, bx + (j > 2 ? sway : 0), top + fh - 2 - j, 1, 1, j & 1 ? 'pine3' : 'pine1');
    }
  } else if (kind === 1) {
    const sx = cx - 3 + Math.round(Math.sin(t / 50) * 2), sy = mid + Math.round(Math.sin(t / 37));
    rect(ctx, sx, sy, 4, 2, 'pine0');
    rect(ctx, sx + 4, sy, 2, 2, 'pine0');
    rect(ctx, sx + 5, sy, 1, 1, 'hot');
    rect(ctx, sx - 1, sy + 1, 1, 1, 'pink');
    rect(ctx, sx - 2, sy + 1 + (((t >> 4) & 1) ? 0 : 1), 1, 1, 'pink');
  } else {
    for (let j = 0; j < fh - 1; j++) {
      const wob = Math.round(Math.sin(t / 22 + j * 0.8) * 1.4);
      rect(ctx, cx + wob, top + 1 + j, 1, 1, j % 3 === 1 ? 'red' : 'blood1');
      if (j % 4 === 2) rect(ctx, cx + wob + (j & 4 ? 1 : -1), top + 1 + j, 1, 1, 'blood1');
    }
  }
  const n = Math.max(2, (fw / 4) | 0);
  for (let i = 0; i < n; i++) {
    const per = 44 + (i % 3) * 14, prog = ((t + i * 29) % per) / per;
    const bx = fx + 1 + ((hash2(i, w, 7) % Math.max(1, fw - 2))) + Math.round(Math.sin((t + i * 17) / 11));
    const by = top + fh - 2 - Math.round(prog * (fh - 3));
    rect(ctx, bx, by, 1, 1, i & 1 ? 'white' : 'cream');
    if (prog > 0.5 && (i & 1) === 0) rect(ctx, bx + 1, by, 1, 1, 'leaf');
  }
}

// ---------------------------------------------------------------- rack
interface Led { x: number; y: number; color: ColorName; period: number; phase: number; on: number }

/** What each unit of a rack is: a server with drive bays, a switch with ports, a display strip or a vent panel. */
const unitKind = (seed: number, u: number): number => (seed + u * 3) % 4;

function rackArt(w: number, h: number, seed: number): Px {
  const p = new Px(w, h).fill('grey1');
  p.rect(0, 0, w, 3, 'grey3').rect(0, 0, w, 1, 'bone').rect(0, 2, w, 1, 'grey2').rect(0, h - 2, w, 2, 'ink');
  p.rect(0, 3, 1, h - 5, 'grey2').rect(w - 1, 3, 1, h - 5, 'ink');
  const units = Math.max(1, Math.floor((h - 6) / 4));
  for (let u = 0; u < units; u++) {
    const y = 4 + u * 4;
    p.rect(1, y, w - 2, 3, 'grey2').rect(1, y, w - 2, 1, 'grey3').rect(1, y + 3, w - 2, 1, 'ink');
    const k = unitKind(seed, u);
    if (k === 0) for (let bx = 2; bx + 3 < w - 4; bx += 4) p.rect(bx, y + 1, 3, 2, 'ink').set(bx, y + 1, 'grey1');
    else if (k === 1) for (let bx = 3; bx < w - 3; bx += 2) p.set(bx, y + 1, 'ink');
    else if (k === 2) p.rect(2, y + 1, w - 7, 2, 'night').set(w - 4, y + 1, 'bone').set(w - 4, y + 2, 'grey3');
    else for (let bx = 2; bx < w - 3; bx += 2) p.set(bx, y + 1, 'grey1').set(bx, y + 2, 'grey1');
  }
  p.rect(w - 3, h - 8, 1, 6, 'yellow').set(w - 3, h - 8, 'amber');
  return p;
}

/** The LEDs of a rack, with a blink pattern each. A pure function of the size and seed, so the pattern is the same every frame. */
function rackLeds(w: number, h: number, seed: number): Led[] {
  const out: Led[] = [];
  const units = Math.max(1, Math.floor((h - 6) / 4));
  const make = (x: number, y: number, key: number): void => {
    const hv = hash2(x, y, key + seed);
    const roll = hv % 20;
    const color: ColorName = roll < 13 ? 'leaf' : roll < 17 ? 'amber' : roll < 18 ? 'hot' : 'cyan';
    const period = color === 'hot' ? 120 : [24, 36, 48, 60][(hv >> 5) & 3] as number;
    out.push({ x, y, color, period, phase: (hv >>> 8) % period, on: color === 'hot' ? 40 : Math.round(period * (0.35 + ((hv >> 12) & 7) / 14)) });
  };
  for (let u = 0; u < units; u++) {
    const y = 4 + u * 4, k = unitKind(seed, u);
    if (k === 0) { make(w - 4, y + 1, 1); make(w - 4, y + 2, 2); make(w - 3 - 4, y + 1, 5); }
    else if (k === 1) for (let bx = 3; bx < w - 3; bx += 2) make(bx, y + 2, 3);
    else if (k === 2) make(w - 4, y + 1, 4);
    else make(w - 3, y + 2, 6);
  }
  return out;
}

function rackLive(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, seed: number): void {
  for (const l of rackLeds(w, h, seed)) if (blink(t, l.period, l.phase, l.on)) rect(ctx, x + l.x, y + l.y, 1, 1, l.color);
  const units = Math.max(1, Math.floor((h - 6) / 4));
  for (let u = 0; u < units; u++) {
    if (unitKind(seed, u) !== 2) continue;
    const uy = y + 4 + u * 4;
    for (let bx = 0; bx < w - 8; bx++) {
      const hgt = 1 + (hash2(bx, (t >> 5) + u, seed) % 2);
      rect(ctx, x + 3 + bx, uy + 3 - hgt, 1, hgt, bx % 3 === 0 ? 'cyan' : 'leaf');
    }
  }
}

// ---------------------------------------------------------------- generator
function generatorArt(w: number, h: number): Px {
  const p = new Px(w, h);
  const bot = h - 4;
  p.rect(1, 3, w - 2, bot - 3, 'yellow').rect(1, 3, w - 2, 1, 'cream').rect(1, 3, 1, bot - 3, 'cream').rect(w - 2, 3, 1, bot - 3, 'amber');
  p.rect(1, bot - 2, w - 2, 2, 'ink');
  for (let x = 1; x < w - 1; x++) for (let y = bot - 2; y < bot; y++) if (((x + y) & 3) < 2) p.set(x, y, 'yellow');
  p.rect(0, bot, w, 3, 'grey1').rect(0, bot, w, 1, 'grey2').rect(0, h - 1, w, 1, 'ink');
  p.rect(1, h - 2, 2, 1, 'ink').rect(w - 3, h - 2, 2, 1, 'ink');
  const fcx = 3 + Math.min(4, (w - 10) >> 1), fcy = 3 + ((bot - 3) >> 1), fr = Math.min(3.4, (bot - 4) / 2);
  p.disc(fcx + 0.5, fcy + 0.5, fr + 0.6, 'grey1').disc(fcx + 0.5, fcy + 0.5, fr, 'ink');
  p.line(fcx - 2, fcy - 2, fcx + 2, fcy + 2, 'grey3').line(fcx + 2, fcy - 2, fcx - 2, fcy + 2, 'grey3').set(fcx, fcy, 'grey2');
  const px0 = w - 7;
  p.rect(px0, 4, 5, Math.max(3, bot - 7), 'grey1').rect(px0, 4, 5, 1, 'grey2');
  p.rect(px0 + 1, 5, 2, 2, 'bone').set(px0 + 2, 6, 'hot').set(px0 + 3, 5, 'leaf').set(px0 + 3, 7, 'hot');
  p.rect(w - 5, 0, 2, 3, 'grey2').rect(w - 5, 0, 2, 1, 'grey1');
  for (const tx of [3, px0 - 3]) p.rect(tx, 1, 1, 2, 'grey3').set(tx, 1, 'amber');
  return p;
}

function generatorLive(ctx: Ctx, x: number, y: number, w: number, t: number): void {
  const win = t % 150, n = (t / 150) | 0;
  if (win < 10) {
    const tx = x + ((hash2(n, w, 3) & 1) ? 3 : w - 10);
    for (let i = 0; i < 5; i++) {
      const dx = (hash2(n, i + (win >= 4 ? 5 : 0), 4) % 5) - 2, dy = i;
      rect(ctx, tx + dx, y + 1 - dy, 1, 1, i < 2 ? 'white' : i < 4 ? 'cyan' : 'sky');
    }
  }
  for (let i = 0; i < 2; i++) {
    const age = ((t >> 2) + i * 5) % 10;
    rect(ctx, x + w - 5 + (age >> 2) - (i & 1), y - 1 - age, 1, 1, age < 5 ? 'grey3' : 'mist');
  }
}

// ---------------------------------------------------------------- camera
type CamMode = 'calm' | 'alert' | 'dead';
const camMode = (v: PropView): CamMode => (v.state === 'alert' ? 'alert' : v.state === 'lit' || v.state === 'off' || (v.cam && !v.cam.live) ? 'dead' : 'calm');
const camStep = (angle: number): number => ((Math.round(angle / (Math.PI / 8)) % 16) + 16) % 16;
const lensAt = (step: number): [number, number, boolean] => {
  const a = (step * Math.PI) / 8, dx = Math.cos(a), dy = Math.sin(a);
  return [8 + Math.round(dx * 2.6), 8 + Math.round(dy * 1.8), dy < -0.55];
};

/** A ceiling camera, 16 by 16: a mount plate, a pale dome with a smoked-glass bubble, and the lens group turned to face step (of 16). */
function cameraArt(step: number, mode: CamMode): Px {
  const p = new Px(16, 16);
  const dead = mode === 'dead', hot = mode === 'alert';
  const [lx, ly, away] = lensAt(step);
  for (let i = 3; i < 13; i++) if ((i & 1) === 0) p.set(i, 14, hot ? 'blood1' : 'grey3');
  if (hot) for (let i = 4; i < 12; i += 2) p.set(i, 15, 'blood0');
  p.rect(3, 0, 10, 2, 'grey2').rect(3, 0, 10, 1, 'grey3').rect(3, 1, 10, 1, 'grey1').rect(6, 2, 4, 1, 'grey1');
  const shell: ColorName = dead || hot ? 'grey1' : 'bone', hi: ColorName = dead ? 'grey2' : hot ? 'red' : 'white', lo: ColorName = dead || hot ? 'ink' : 'grey3';
  p.ellipse(8, 7.6, 5.6, 4.6, lo).ellipse(8, 7.2, 5.4, 4.2, shell);
  p.set(4, 5, hi).set(5, 4, hi).set(6, 4, hi).set(4, 6, hi).set(5, 5, hi);
  p.ellipse(8, 8.4, 4.4, 3.3, dead ? 'ink' : 'night');
  p.set(5, 7, dead ? 'grey1' : 'slate').set(6, 6, dead ? 'grey1' : 'slate').set(7, 6, dead ? 'grey1' : 'slate');
  if (away) {
    p.rect(lx - 1, ly - 1, 3, 2, 'dusk').rect(lx - 1, ly - 1, 3, 1, 'slate');
  } else {
    const wide = Math.abs(lx - 8) >= 2;
    p.rect(lx - 1, ly - 1, wide ? 4 : 3, 3, dead ? 'grey1' : 'dusk').rect(lx - 1, ly - 1, wide ? 4 : 3, 1, dead ? 'grey2' : 'slate');
    p.set(lx + (lx > 8 ? 1 : lx < 8 ? -1 : 0), ly, dead ? 'ink' : hot ? 'hot' : 'cyan');
    if (!dead) p.set(lx + (lx > 8 ? 1 : -1), ly - 1, hot ? 'red' : 'white');
  }
  if (dead) p.line(9, 5, 11, 9, 'grey2').set(10, 7, 'ink');
  return p;
}

function cameraLive(ctx: Ctx, x: number, y: number, mode: CamMode, step: number, t: number): void {
  const [lx, ly, away] = lensAt(step);
  if (mode === 'calm') {
    if (blink(t, 60, 0, 30)) rect(ctx, x + 11, y + 6, 1, 1, 'red');
    if (!away && blink(t, 150, 0, 6)) rect(ctx, x + lx + (lx > 8 ? 1 : lx < 8 ? -1 : 0), y + ly, 1, 1, 'cream');
  } else if (mode === 'alert') {
    rect(ctx, x + 11, y + 6, 1, 1, 'hot');
    if (blink(t, 24, 0, 12)) {
      const gx = x + lx + (away ? 0 : lx > 8 ? 2 : lx < 8 ? -2 : 0), gy = y + ly + (away ? -1 : 0);
      rect(ctx, gx, gy, 1, 1, 'hot');
      rect(ctx, gx - 1, gy, 3, 1, 'red');
      rect(ctx, gx, gy - 1, 1, 3, 'red');
    }
  } else {
    const ph = t % 120;
    if (ph < 48) { const k = (ph / 8) | 0; rect(ctx, x + 12 + (k & 1), y + 5 - k, 1, 1, k < 3 ? 'grey2' : 'grey3'); }
  }
}

// ---------------------------------------------------------------- public
/** Draws a tank, rack, generator or camera. Returns false for any other kind. */
export function drawLab2Prop(ctx: Ctx, v: PropView, art: ArtFn): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.max(8, Math.round(v.w)), h = Math.max(8, Math.round(v.h));
  const seed = hash2(x >> 4, y >> 4, 11);
  switch (v.kind) {
    case 'tank': {
      ctx.drawImage(art(`tankb${w}x${h}`, () => rim(tankBack(w, h))), x - 1, y - 1);
      tankLive(ctx, x, y, w, h, v.t, seed % 3);
      ctx.drawImage(art(`tankf${w}x${h}`, () => tankFront(w, h)), x, y);
      return true;
    }
    case 'rack': {
      const s = seed & 3;
      ctx.drawImage(art(`rack${w}x${h}:${s}`, () => rim(rackArt(w, h, s))), x - 1, y - 1);
      rackLive(ctx, x, y, w, h, v.t, s);
      return true;
    }
    case 'generator': {
      const sx = [0, 1, 0, 0, 1, 0, 1, 1][(v.t >> 3) & 7] as number;
      ctx.drawImage(art(`gen${w}x${h}`, () => rim(generatorArt(w, h))), x - 1 + sx, y - 1);
      generatorLive(ctx, x + sx, y, w, v.t);
      return true;
    }
    case 'camera': {
      const mode = camMode(v), step = camStep(v.cam ? v.cam.angle : Math.PI / 2);
      const cx = x + ((w - 16) >> 1), cy = y + ((h - 16) >> 1);
      ctx.drawImage(art(`cam${mode}${step}`, () => rim(cameraArt(step, mode))), cx - 1, cy - 1);
      cameraLive(ctx, cx, cy, mode, step, v.t);
      return true;
    }
    default: return false;
  }
}
