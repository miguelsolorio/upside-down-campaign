// Variant 2, "The party": the four heroes stand at the edge of Mirkwood with the Upside Down glowing behind the
// trees. Eleven's nose is bleeding. START sends them walking into the woods.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import type { ColorName } from '../../gfx/palette.ts';
import { BAYER4, hash2 } from '../../gfx/canvas.ts';
import { Px } from '../../gfx/px.ts';
import { drawLogo, paintGlow } from '../../gfx/index.ts';
import type { Glow } from '../../gfx/index.ts';
import { bigText, box, dither } from '../kit.ts';
import type { Ctx } from '../kit.ts';
import { drawMenuBlock, fadeOut, promptOn } from './core.ts';
import type { TitleDesign, TitleView } from './core.ts';
import { bigActor, drift, pine, stars } from './art.ts';
import { launchLevel } from './timeline.ts';

const HORIZON = 150;
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

function trees(ctx: Ctx): void {
  // The far line, lit from behind.
  for (let i = 0, x = -6; x < SCREEN_W + 12; i++, x += 12 + (hash2(i, 4, 9) % 5)) {
    pine(ctx, x, HORIZON + 2, 34 + (hash2(i, 5, 9) % 18), 'pine0');
  }
  // Ground.
  box(ctx, 0, HORIZON, SCREEN_W, SCREEN_H - HORIZON, 'pine0');
  dither(ctx, 0, HORIZON + 14, SCREEN_W, SCREEN_H - HORIZON - 14, 'ink', 4);
  dither(ctx, 0, HORIZON + 40, SCREEN_W, SCREEN_H - HORIZON - 40, 'ink', 2);
  // A worn path up the middle, toward the glow.
  for (let y = HORIZON; y < SCREEN_H; y++) {
    const half = 8 + (y - HORIZON) * 0.5;
    const edge = (y & 1) === 0;
    box(ctx, 128 - half, y, half * 2, 1, 'soil0');
    if (edge) { box(ctx, 128 - half - 1, y, 1, 1, 'ink'); box(ctx, 128 + half, y, 1, 1, 'ink'); }
  }
  // The near trees stand to the sides and leave the middle open.
  const near: [number, number, number][] = [[10, 176, 92], [34, 170, 78], [58, 164, 66], [236, 176, 92], [212, 170, 78], [190, 164, 66]];
  for (const [x, base, h] of near) pine(ctx, x, base, h, 'ink');
}

function prompt(ctx: Ctx, v: TitleView, cx: number, y: number): number {
  const sel = v.rows[0]?.selected ?? false;
  if (promptOn(v) || !sel) bigText(ctx, 'PRESS START', cx, y, sel ? 'white' : 'mist', 2);
  return 24;
}

const PARTY: { id: 'dustin' | 'mike' | 'eleven' | 'lucas'; x: number; y: number }[] = [
  { id: 'dustin', x: 70, y: 190 },
  { id: 'mike', x: 108, y: 188 },
  { id: 'eleven', x: 148, y: 192 },
  { id: 'lucas', x: 186, y: 188 },
];

export const partyDesign: TitleDesign = {
  id: 2,
  name: 'The party',
  blurb: 'The four heroes at the edge of Mirkwood, the Upside Down glowing through the trees. START walks them in.',
  tradeoff: "Shows who you play before you press anything. Eleven is on the poster though she only joins at the shed, and it is the busiest to read.",
  credit: { y: 213, color: 'slate' },
  draw(ctx, v) {
    const pulse = settings.reduceFlashing ? 1 : Math.min(2, Math.floor((Math.sin(v.t / 50) + 1) * 1.5));
    ctx.drawImage(riftGlow(pulse), 0, 0);
    box(ctx, 0, HORIZON + 4, SCREEN_W, SCREEN_H - HORIZON - 4, 'ink');
    stars(ctx, v.t, 0, 44, 18, 11);
    trees(ctx);
    drift(ctx, v.t, 0, SCREEN_H, 26, ['pink', 'magenta', 'blood1', 'hot'], -1, 7);

    // Light on the path: the flashlights Mike and Lucas hold.
    const walk = launchLevel(v.launch);
    const lights: Glow[] = PARTY.filter((p) => p.id !== 'eleven').map((p) => ({ x: p.x, y: p.y - 6 - walk * 30, r: 30, k: 0.85, flicker: 0.4 }));
    paintGlow(ctx, lights, v.t, 1);

    const goes = v.launch > 0;
    // Heroes in the back row first, so the front one overlaps them.
    for (const p of [...PARTY].sort((a, b) => a.y - b.y)) {
      const off = goes ? Math.round(v.launch * 1.1) : 0;
      bigActor(ctx, p.id, p.x, p.y - off, 2, goes ? v.launch : v.t, {
        dir: goes ? 'up' : 'down', anim: goes ? 'walk' : 'idle', strained: p.id === 'eleven',
      });
    }
    drawLogo(ctx, v.t, 128, 14);
    drawMenuBlock(ctx, v, 128, 78, { prompt, rowH: 13 });
    fadeOut(ctx, walk > 0.45 ? (walk - 0.45) / 0.55 : 0);
  },
};
