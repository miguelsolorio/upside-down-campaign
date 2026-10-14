// Small pieces of scenery the title variants share. Palette colors only, and no alpha: fades are dithers.
import type { AnimId, CharId, Dir } from '../../core/types.ts';
import { settings } from '../../core/settings.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { hash2 } from '../../gfx/canvas.ts';
import { drawActor, drawIcon } from '../../gfx/index.ts';
import { box } from '../kit.ts';
import type { Ctx } from '../kit.ts';

const BULBS = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'] as const;
const HALO: ColorName[] = ['blood1', 'orange', 'pine1', 'dusk'];

/** A hero sprite at a whole-number scale, feet at (x, y). */
export function bigActor(
  ctx: Ctx, id: CharId, x: number, y: number, scale: number, t: number,
  o: { dir?: Dir; anim?: AnimId; strained?: boolean; tint?: ColorName | null } = {},
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  drawActor(ctx, {
    kind: 'hero', id, x: 0, y: 0, dir: o.dir ?? 'down', anim: o.anim ?? 'idle', t, flash: 0, blink: false,
    strained: !!o.strained, tint: o.tint ?? null, alert: false, z: 0, bar: null,
  });
  ctx.restore();
}

/** A ring of dithered light around a bulb. */
function halo(ctx: Ctx, cx: number, cy: number, color: ColorName): void {
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const d2 = i * i + j * j;
      if (d2 < 14 || d2 > 40) continue;
      if (((i + j) & 1) === 0 && (d2 < 26 || ((i & 1) === 0 && (j & 1) === 0))) box(ctx, cx + i, cy + j, 1, 1, color);
    }
  }
}

/**
 * Christmas lights on a wire that sags between x0 and x1, anchored at y. Bulbs twinkle, and each one that is lit
 * gets a halo. `chase` makes the lit bulbs run along the string, the way Joyce's did.
 */
export function lightString(
  ctx: Ctx, x0: number, x1: number, y: number, sag: number, t: number,
  o: { pitch?: number; chase?: boolean; halos?: boolean } = {},
): void {
  const pitch = o.pitch ?? 14;
  const calm = settings.reduceFlashing;
  const at = (x: number): number => y + Math.round(sag * 4 * ((x - x0) / (x1 - x0)) * (1 - (x - x0) / (x1 - x0)));
  for (let x = x0; x <= x1; x++) box(ctx, x, at(x), 1, 1, 'grey2');
  const n = Math.floor((x1 - x0) / pitch);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + 7 + i * ((x1 - x0 - 14) / Math.max(1, n)));
    const by = at(x);
    const k = i & 3;
    const dip = !calm && (((t >> 3) + i * 5) % 17) < 2;
    const wave = o.chase ? ((((t >> 3) - i) % 8) + 8) % 8 < 3 : true;
    const lit = wave && !dip;
    if (lit && o.halos !== false) halo(ctx, x, by + 6, HALO[k] as ColorName);
    drawIcon(ctx, lit ? (BULBS[k] as typeof BULBS[number]) : 'bulbOff', x - 4, by, t + i * 11);
  }
}

/** Specks drifting up (dir -1) or down (dir 1) through a band, the Upside Down's snow. */
export function drift(
  ctx: Ctx, t: number, y0: number, y1: number, n: number, colors: ColorName[], dir: -1 | 1 = -1, seed = 0,
): void {
  const span = y1 - y0;
  for (let i = 0; i < n; i++) {
    const s = Math.imul(i + 1 + seed * 97, 2654435761) >>> 0;
    const speed = 0.12 + ((s >> 8) % 10) / 60;
    const phase = (t * speed + ((s >> 12) % span)) % span;
    const y = dir < 0 ? y1 - phase : y0 + phase;
    const x = (s % 256) + Math.round(Math.sin(t / 60 + i) * 3);
    const big = i % 3 === 0 ? 2 : 1;
    box(ctx, x, y, big, big, colors[i % colors.length] as ColorName);
  }
}

/** Fixed stars with a slow twinkle, in a band. */
export function stars(ctx: Ctx, t: number, y0: number, y1: number, n: number, seed = 5): void {
  for (let i = 0; i < n; i++) {
    const x = hash2(i, 1, seed) % 256;
    const y = y0 + (hash2(i, 2, seed) % Math.max(1, y1 - y0));
    const tw = settings.reduceFlashing ? 0 : (((t >> 4) + i * 7) % 13) === 0;
    const bright = hash2(i, 3, seed) % 5 === 0;
    box(ctx, x, y, 1, 1, tw ? 'white' : bright ? 'mist' : 'slate');
  }
}

/** A pine seen from the side: tiers of widening boughs on a trunk, flat color with a darker underside. */
export function pine(ctx: Ctx, cx: number, base: number, h: number, body: ColorName, under?: ColorName): void {
  const tiers = Math.max(3, Math.round(h / 9));
  const tierH = (h - 4) / tiers;
  const maxHalf = h * 0.28;
  for (let y = 0; y < h - 3; y++) {
    const tier = Math.min(tiers - 1, Math.floor(y / tierH));
    const local = (y - tier * tierH) / tierH;
    const reach = (tier + 0.45 + local * 0.55) / tiers;
    const half = Math.max(1, Math.round(1 + reach * maxHalf));
    box(ctx, cx - half, base - h + y, half * 2 + 1, 1, body);
    if (under && local > 0.8) box(ctx, cx - half, base - h + y, half * 2 + 1, 1, under);
  }
  box(ctx, cx - 1, base - 3, 3, 3, body);
}

/** A right-pointing play triangle, h rows tall. */
export function playTriangle(ctx: Ctx, x: number, y: number, h: number, color: ColorName): void {
  const half = Math.floor(h / 2);
  for (let r = 0; r < h; r++) {
    const w = r <= half ? r + 1 : h - r;
    box(ctx, x, y + r, Math.max(1, Math.round(w * 1.2)), 1, color);
  }
}
