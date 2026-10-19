// Effects of levels 7 and 8, drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// scoop: Robin's ice cream, in flight (w 6, h its height off the ground) and its splat (w its diameter). babble: her Word vomit, a cone of
// letters spilling out of her (w the reach, h the chord at the far edge). bullet: a pistol or rifle round in flight, or when w is big the
// long streak of Nancy's crit. goo: a melting rat's burst (w its diameter). trap: one of Nancy's bear traps on the floor (14 by 8).
// arcs: the power box firing, w by h its plate, a web of lightning over it.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { settings } from '../core/settings.ts';
import { TINY_GLYPHS } from './data/font.ts';
import { discPx, hash2, linepx, rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

// ---------------------------------------------------------------- scoop
/**
 * A scoop in flight tumbles end over end: a pink ball on a wafer cone, with a drip of cream behind it. Where it lands it splats: a pink
 * puddle that spreads to w with a rim of cream, drops thrown out round it, and a few sprinkles, then thins to a dither.
 */
export function scoop(ctx: Ctx, f: FxView, p: number): void {
  if (f.w < 12) {
    const th = f.t * 0.5, c = Math.cos(th), s = Math.sin(th), x = Math.round(f.x), y = Math.round(f.y);
    for (let i = -3; i <= 3; i += 0.5) {
      const col: ColorName = i < -0.5 ? 'pink' : i < 0.5 ? 'white' : 'sand';
      for (let j = -1; j <= 1; j += 0.5) if (i < 0 ? Math.abs(j) <= 1 : Math.abs(j) <= 1 - i / 4) rect(ctx, x + i * c - j * s, y + i * s + j * c, 1, 1, col);
    }
    rect(ctx, x - c * 4, y - s * 4 + 1, 1, 1, 'pink');
    if ((f.t & 3) === 0) rect(ctx, x - c * 6, y - s * 6 + 2, 1, 1, 'white');
    return;
  }
  const R = f.w / 2, r = R * easeOut(clamp(p * 2));
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  for (let y = -Math.ceil(r * 0.6); y <= Math.ceil(r * 0.6); y++) {
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      const d = (x * x) / (r * r) + (y * y) / (r * r * 0.36);
      if (d > 1) continue;
      const px = Math.round(f.x) + x, py = Math.round(f.y) + y;
      if (!keep(px, py, fade)) continue;
      rect(ctx, px, py, 1, 1, d > 0.8 ? 'white' : d > 0.3 ? 'pink' : 'rose');
    }
  }
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.4, d = r * (0.7 + 0.5 * unit(k, 1, 55)) + 2, lift = Math.sin(clamp(p * 1.6) * Math.PI) * 5;
    if (!keep(Math.round(f.x + Math.cos(a) * d), Math.round(f.y + Math.sin(a) * d * 0.6), fade)) continue;
    rect(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6 - lift, 1 + (k & 1), 1, k % 3 === 0 ? 'white' : 'pink');
  }
  if (p < 0.7) for (let k = 0; k < 4; k++) rect(ctx, f.x + (unit(k, 2, 56) - 0.5) * r * 1.2, f.y + (unit(k, 3, 56) - 0.5) * r * 0.5, 1, 1, (['yellow', 'cyan', 'magenta', 'leaf'] as ColorName[])[k] as ColorName);
}

// ---------------------------------------------------------------- babble
/** Word vomit: letters spill out of her mouth and fan along the cone, tumbling and fading to a dither, bigger and brighter near her. */
export function babble(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const L = f.w > 0 ? f.w : 56, chord = f.h > 0 ? f.h : 48;
  const half = Math.asin(clamp(chord / (2 * L), 0, 1)) || 0.7;
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  const cols: ColorName[] = ['pink', 'yellow', 'cyan', 'white', 'magenta'];
  const keys = Object.keys(TINY_GLYPHS);
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  for (let i = 0; i < 16; i++) {
    const delay = (i % 8) / 8 * 0.4, u = clamp((p - delay) / 0.6);
    if (u <= 0) continue;
    const reach = L * easeOut(u) * (0.55 + 0.45 * unit(i, 1, 57)), side = Math.tan(half) * reach * (unit(i, 2, 57) * 2 - 1) * 0.9;
    const gx = Math.round(f.x + c * reach + px * side), gy = Math.round(f.y + s * reach + py * side + Math.sin(f.t * 0.3 + i) * 1.5);
    const rows = (TINY_GLYPHS[keys[hash2(i, 5, 58) % keys.length] as string] as string).split('/');
    const col = cols[i % cols.length] as ColorName;
    rows.forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === '#' && keep(gx + k, gy + j, fade - u * 0.15)) rect(ctx, gx + k - 1, gy + j - 2, 1, 1, col); });
  }
  if (p < 0.2) for (let k = 0; k < 6; k++) rect(ctx, f.x + c * (2 + p * 30) + px * (k - 2.5) * 2, f.y + s * (2 + p * 30) + py * (k - 2.5) * 2, 1, 1, k & 1 ? 'white' : 'pink');
}

// ---------------------------------------------------------------- bullet
/**
 * A round in flight: a white head with a yellow tail two pixels long, and for the first two frames a flash at the muzzle. When w is big
 * (Nancy's crit) it is a long tracer instead, h thick, from where it starts out along the heading, dashed and bright.
 */
export function bullet(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  if (f.w >= 40) {
    const L = f.w, T = Math.max(2, f.h), fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1, head = L * easeOut(clamp(p * 3));
    for (let d = 0; d <= head; d++) {
      if ((d + (f.t >> 1)) % 9 >= 6) continue;
      for (let o = -(T >> 2); o <= (T >> 2); o++) {
        const x = Math.round(f.x + c * d - s * o), y = Math.round(f.y + s * d + c * o);
        if (keep(x, y, fade)) rect(ctx, x, y, 1, 1, o === 0 ? 'white' : d < 6 ? 'yellow' : 'amber');
      }
    }
    discPx(ctx, f.x + c * head, f.y + s * head, 1, 'white');
    return;
  }
  const x = Math.round(f.x), y = Math.round(f.y);
  rect(ctx, x - c * 2, y - s * 2, 1, 1, 'amber');
  rect(ctx, x - c, y - s, 1, 1, 'yellow');
  rect(ctx, x, y, 1, 1, 'white');
  rect(ctx, x + c, y + s, 1, 1, 'white');
  if (f.t < 3) {
    rect(ctx, x - 1, y, 3, 1, 'yellow'); rect(ctx, x, y - 1, 1, 3, 'yellow');
    if (f.t < 2) rect(ctx, x, y, 1, 1, 'white');
  }
}

// ---------------------------------------------------------------- goo
/**
 * A melting rat's burst: a splat of purple goo that spreads to a puddle w by h with a dark rim and bright patches, drops thrown out and
 * falling round it, and it thins to a dither at the end.
 */
export function goo(ctx: Ctx, f: FxView, p: number): void {
  const W = f.w > 0 ? f.w : 44, H = f.h > 0 ? f.h : W / 2, rx = (W / 2) * easeOut(clamp(p * 2.2)), ry = (H / 2) * easeOut(clamp(p * 2.2));
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = (x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01);
      const wob = 1 + 0.15 * Math.sin(Math.atan2(y, x) * 5 + f.x);
      if (d > wob) continue;
      const px = Math.round(f.x) + x, py = Math.round(f.y) + y;
      if (!keep(px, py, fade)) continue;
      rect(ctx, px, py, 1, 1, d > wob * 0.82 ? 'ink' : (hash2(px >> 1, py >> 1, 59) & 7) === 0 ? 'magenta' : d < 0.3 ? 'purple' : 'purple');
    }
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3, u = clamp(p * 2.4), d = (W / 2) * (0.5 + 0.7 * unit(k, 1, 60)) * easeOut(u), arc = Math.sin(u * Math.PI) * 8 * unit(k, 2, 60);
    if (u >= 1 && p > 0.5) continue;
    rect(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.5 - arc, 1 + (k & 1), 1 + (k & 1), k % 3 === 0 ? 'magenta' : 'purple');
  }
  if (p < 0.3) discPx(ctx, f.x, f.y - 2, 3 - Math.floor(p * 9), 'magenta');
}

// ---------------------------------------------------------------- trap
/** A bear trap on the floor, open: two steel jaws with teeth round a brass plate, a chain and a stake. It blinks for its last second and a half. */
export function trap(ctx: Ctx, f: FxView): void {
  if (f.life - f.t < 90 && ((f.t >> 3) & 1) === 1) return;
  const x = Math.round(f.x) - 7, y = Math.round(f.y) - 4;
  rect(ctx, x + 1, y + 1, 12, 6, 'ink');
  rect(ctx, x + 2, y + 2, 10, 4, 'grey2');
  rect(ctx, x + 5, y + 3, 4, 2, 'amber');
  for (let i = 0; i < 4; i++) { rect(ctx, x + 2 + i * 2, y, 1, 2, 'bone'); rect(ctx, x + 3 + i * 2, y + 6, 1, 2, 'bone'); }
  rect(ctx, x, y + 3, 2, 2, 'grey3'); rect(ctx, x + 12, y + 3, 2, 2, 'grey3');
  rect(ctx, x + 6, y + 3, 2, 1, 'white');
  if ((f.t >> 4) % 6 === 0) rect(ctx, x + 6, y - 1, 2, 1, 'white');
}

// ---------------------------------------------------------------- arcs
/** The power box firing: a web of lightning across the plate, re-struck every other frame (every 32 with Reduce flashing on, under two a second), with sparks at the corners and a flash at the start. */
export function arcs(ctx: Ctx, f: FxView, p: number): void {
  const W = f.w > 0 ? f.w : 32, H = f.h > 0 ? f.h : 32, x0 = f.x - W / 2, y0 = f.y - H / 2;
  const fade = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1, step = f.t >> (settings.reduceFlashing ? 5 : 1);
  const pts = (i: number): [number, number] => {
    const k = hash2(i, step, 63), edge = k & 3, r = unit(i, step, 64);
    return edge === 0 ? [x0 + r * W, y0] : edge === 1 ? [x0 + W, y0 + r * H] : edge === 2 ? [x0 + r * W, y0 + H] : [x0, y0 + r * H];
  };
  for (let i = 0; i < 5; i++) {
    const a = pts(i * 2), b = pts(i * 2 + 1);
    let px = a[0], py = a[1];
    const n = 5;
    for (let j = 1; j <= n; j++) {
      const u = j / n, tx = a[0] + (b[0] - a[0]) * u + (j < n ? (unit(i * 7 + j, step, 65) - 0.5) * 8 : 0), ty = a[1] + (b[1] - a[1]) * u + (j < n ? (unit(i * 7 + j, step, 66) - 0.5) * 8 : 0);
      if (keep(Math.round(tx), Math.round(ty), fade)) { linepx(ctx, px, py, tx, ty, i & 1 ? 'yellow' : 'sky'); linepx(ctx, px + 1, py, tx + 1, ty, 'white'); }
      px = tx; py = ty;
    }
  }
  for (const [cx, cy] of [[x0, y0], [x0 + W - 1, y0], [x0, y0 + H - 1], [x0 + W - 1, y0 + H - 1]] as [number, number][]) if ((step + (cx > x0 ? 1 : 0)) & 1) rect(ctx, cx - 1, cy - 1, 3, 3, 'white');
  if (p < 0.2) for (let k = 0; k < 8; k++) rect(ctx, f.x + (unit(k, 1, 67) - 0.5) * W * (1 + p * 2), f.y + (unit(k, 2, 67) - 0.5) * H * (1 + p * 2), 1, 1, k & 1 ? 'white' : 'yellow');
}
