// The scenery behind the title: the red glow, the pines, the path and a few sprite helpers. Palette colors only, no alpha.
import type { AnimId, CharId, Dir } from '../core/types.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { drawActor } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { BAYER4, hash2 } from '../gfx/canvas.ts';
import { Px } from '../gfx/px.ts';
import { settings } from '../core/settings.ts';
import { box, dither } from './kit.ts';
import type { Ctx } from './kit.ts';

/** Where the ground starts and the trees end. */
export const HORIZON = 150;
const RAMP: ColorName[] = ['ink', 'blood0', 'blood1', 'red'];

const glows = new Map<number, HTMLCanvasElement>();
/** The red light behind the trees as a baked ordered dither, in three strengths so it can breathe. */
function riftGlow(level: number): HTMLCanvasElement {
  const hit = glows.get(level);
  if (hit) return hit;
  const px = new Px(SCREEN_W, HORIZON + 4).fill('ink');
  const k = [2.7, 3.0, 3.35][level] as number;
  for (let y = 0; y < px.h; y++) {
    for (let x = 0; x < px.w; x++) {
      const d = Math.hypot((x - 128) / 118, (y - 92) / 82);
      const f = Math.max(0, 1 - d);
      const q = f * f * (3 - 2 * f) * k;
      const lo = Math.floor(q);
      const up = q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0;
      const c = RAMP[Math.min(3, lo + up)] as ColorName;
      if (c !== 'ink') px.set(x, y, c);
    }
  }
  const c = px.toCanvas();
  glows.set(level, c);
  return c;
}

/** The sky: the glow behind the trees, slowly breathing, with a few stars above it. */
export function sky(ctx: Ctx, t: number): void {
  const pulse = settings.reduceFlashing ? 1 : Math.min(2, Math.floor((Math.sin(t / 50) + 1) * 1.5));
  ctx.drawImage(riftGlow(pulse), 0, 0);
  box(ctx, 0, HORIZON + 4, SCREEN_W, SCREEN_H - HORIZON - 4, 'ink');
  for (let i = 0; i < 18; i++) {
    const x = hash2(i, 1, 11) % SCREEN_W, y = hash2(i, 2, 11) % 44;
    const tw = settings.reduceFlashing ? false : (((t >> 4) + i * 7) % 13) === 0;
    box(ctx, x, y, 1, 1, tw ? 'white' : hash2(i, 3, 11) % 5 === 0 ? 'mist' : 'slate');
  }
}

/** A pine seen from the side: tiers of widening boughs on a trunk. */
function pine(ctx: Ctx, cx: number, base: number, h: number, body: ColorName): void {
  const tiers = Math.max(3, Math.round(h / 9));
  const tierH = (h - 4) / tiers;
  const maxHalf = h * 0.28;
  for (let y = 0; y < h - 3; y++) {
    const tier = Math.min(tiers - 1, Math.floor(y / tierH));
    const local = (y - tier * tierH) / tierH;
    const reach = (tier + 0.45 + local * 0.55) / tiers;
    const half = Math.max(1, Math.round(1 + reach * maxHalf));
    box(ctx, cx - half, base - h + y, half * 2 + 1, 1, body);
  }
  box(ctx, cx - 1, base - 3, 3, 3, body);
}

/** The far tree line, the ground, a worn path up the middle, and the near trees standing to the sides. */
export function woods(ctx: Ctx): void {
  for (let i = 0, x = -6; x < SCREEN_W + 12; i++, x += 12 + (hash2(i, 4, 9) % 5)) {
    pine(ctx, x, HORIZON + 2, 34 + (hash2(i, 5, 9) % 18), 'pine0');
  }
  box(ctx, 0, HORIZON, SCREEN_W, SCREEN_H - HORIZON, 'pine0');
  dither(ctx, 0, HORIZON + 14, SCREEN_W, SCREEN_H - HORIZON - 14, 'ink', 4);
  dither(ctx, 0, HORIZON + 40, SCREEN_W, SCREEN_H - HORIZON - 40, 'ink', 2);
  for (let y = HORIZON; y < SCREEN_H; y++) {
    const half = 8 + (y - HORIZON) * 0.5;
    box(ctx, 128 - half, y, half * 2, 1, 'soil0');
    if ((y & 1) === 0) { box(ctx, 128 - half - 1, y, 1, 1, 'ink'); box(ctx, 128 + half, y, 1, 1, 'ink'); }
  }
  const near: [number, number, number][] = [[10, 176, 92], [34, 170, 78], [58, 164, 66], [236, 176, 92], [212, 170, 78], [190, 164, 66]];
  for (const [x, base, h] of near) pine(ctx, x, base, h, 'ink');
}

/** Specks drifting up through the whole screen, the Upside Down's snow. */
export function spores(ctx: Ctx, t: number): void {
  const colors: ColorName[] = ['pink', 'magenta', 'blood1', 'hot'];
  for (let i = 0; i < 26; i++) {
    const s = Math.imul(i + 1 + 7 * 97, 2654435761) >>> 0;
    const speed = 0.12 + ((s >> 8) % 10) / 60;
    const y = SCREEN_H - ((t * speed + ((s >> 12) % SCREEN_H)) % SCREEN_H);
    const x = (s % 256) + Math.round(Math.sin(t / 60 + i) * 3);
    box(ctx, x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, colors[i % colors.length] as ColorName);
  }
}

/** A hero sprite at a whole-number scale, feet at (x, y). */
export function bigActor(
  ctx: Ctx, id: CharId, x: number, y: number, scale: number, t: number,
  o: { dir?: Dir; anim?: AnimId; strained?: boolean } = {},
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  drawActor(ctx, {
    kind: 'hero', id, x: 0, y: 0, dir: o.dir ?? 'down', anim: o.anim ?? 'idle', t, flash: 0, blink: false,
    strained: !!o.strained, tint: null, alert: false, z: 0, bar: null,
  });
  ctx.restore();
}
