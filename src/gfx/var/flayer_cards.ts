// The cards of flayer-variations.html: one canvas per design, three states of the same sample food court arena (22 by 14 tiles, with
// two heroes on the floor for scale): idle with the legs out, one leg warning with its line drawn on the floor beside one leg mid slam
// and a pool where the last one landed, and the head down on the floor with all four legs severed. Each state is drawn at 2x on the
// left and at 1x on the right, with a close up of the head under the 1x. The canvas carries everything, so it can be exported as one
// image. The kit is in flayer.ts and the designs in flayer_spider.ts, flayer_tower.ts, flayer_crown.ts, flayer_lump.ts, flayer_smoke.ts.
import { composeFrame } from '../actor_pose.ts';
import { KIDS } from '../data/heroes.ts';
import { Px } from '../px.ts';
import { CROWN } from './flayer_crown.ts';
import { LUMP } from './flayer_lump.ts';
import { SMOKE } from './flayer_smoke.ts';
import { SPIDER } from './flayer_spider.ts';
import { TOWER } from './flayer_tower.ts';
import { AH, AW, aimTip, arena, cutEnd, legPts, pool, slamFx, socket, warnLine } from './flayer.ts';
import type { FlayerStyle, LegState, Pt } from './flayer.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';

export type { FlayerStyle } from './flayer.ts';
export const FLAYER_OPTS: FlayerStyle[] = [SPIDER, TOWER, CROWN, LUMP, SMOKE];

export type FState = 'idle' | 'attack' | 'down';
const HEROES: Record<FState, [Pt, Pt]> = { idle: [[150, 172], [206, 186]], attack: [[138, 150], [200, 184]], down: [[116, 168], [238, 168]] };
const HEAD_DOWN: Pt = [176, 134];
const SLAM_AT: Pt = [250, 168];
const OLD_POOL: Pt = [296, 178];
const LABELS: Record<FState, string> = { idle: 'IDLE, LEGS OUT', attack: 'ONE LEG WARNS, ONE SLAMS', down: 'HEAD DOWN, LEGS SEVERED' };

/** The two heroes, the game's own Mike and Eleven, standing with their feet at a point. */
function heroes(px: Px, at: [Pt, Pt]): void {
  const specs = [KIDS[0]!, KIDS[3]!];
  specs.forEach((s, i) => {
    const [x, y] = at[i] as Pt;
    px.ellipse(x, y, 6, 2.5, 'black');
    px.blit(paintRoles(composeFrame(s, 'down', 'idle', 0), 16, s.pal), x - 8, y - 14);
  });
}

/** A layer with the style drawing into it, outlined in ink unless the design's edge is smoke. */
function layer(style: FlayerStyle, draw: (px: Px) => void): Px {
  const px = new Px(AW, AH);
  draw(px);
  if (!style.smoke) px.outline('ink');
  return px;
}

/** One state of the arena, 352 by 224. */
export function scene(style: FlayerStyle, state: FState): Px {
  const px = arena();
  const [ha, hb] = HEROES[state];
  const sts: LegState[] = state === 'down' ? ['severed', 'severed', 'severed', 'severed'] : state === 'attack' ? ['idle', 'warn', 'slam', 'idle'] : ['idle', 'idle', 'idle', 'idle'];
  const aims: (Pt | null)[] = [null, state === 'attack' ? aimTip(style.roots[1] as Pt, ha, 140) : null, state === 'attack' ? aimTip(style.roots[2] as Pt, SLAM_AT, 140) : null, null];
  if (state === 'attack') {
    pool(px, OLD_POOL[0], OLD_POOL[1], 0.35);
    pool(px, (aims[2] as Pt)[0], (aims[2] as Pt)[1]);
    warnLine(px, style.roots[1] as Pt, aims[1] as Pt);
  }
  px.blit(layer(style, (b) => { style.body(b); if (state === 'down') socket(b, style.head[0], style.head[1] - 2, 17); }), 0, 0);
  if (state !== 'down') px.blit(layer(style, (b) => style.headPx(b, style.head[0], style.head[1], false)), 0, 0);
  px.blit(layer(style, (b) => {
    sts.forEach((st, i) => {
      const pts = legPts(style, i, st, aims[i] ?? null);
      style.leg(b, pts, st, i);
      if (st === 'severed') cutEnd(b, pts[pts.length - 1] as Pt, 4, style.cut);
    });
  }), 0, 0);
  if (state === 'attack') slamFx(px, aims[2] as Pt);
  if (state === 'down') px.blit(layer(style, (b) => style.headPx(b, HEAD_DOWN[0], HEAD_DOWN[1], true)), 0, 0);
  heroes(px, [ha, hb]);
  return px;
}

const GAP = 8, K = 2;
const LEFT = AW * K, RIGHT = AW;
export const CARD_W = GAP + LEFT + GAP + RIGHT + GAP;
const BLOCK = AH * K + 34;
export const CARD_H = GAP + 3 * BLOCK;
const STATES: FState[] = ['idle', 'attack', 'down'];

/** Number of fill colors a design uses over its three states, not counting the ink outline. */
export function colorsOf(style: FlayerStyle): number { return fills(...STATES.map((s) => scene(style, s))); }

/** One design's card canvas. */
export function flayerCard(style: FlayerStyle): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'black');
  STATES.forEach((state, i) => {
    const y = GAP + i * BLOCK, px = scene(style, state);
    label(g, `${LABELS[state]}, 2X`, GAP, y, 'mist');
    zoom(g, px, GAP, y + 12, K);
    const rx = GAP + LEFT + GAP;
    label(g, 'AT 1X', rx, y, 'slate');
    flat(g, px, rx, y + 12);
    // a close up of the head, 3x
    const [hx, hy] = state === 'down' ? HEAD_DOWN : style.head;
    const sx = Math.max(0, Math.min(AW - 112, hx - 56)), sy = Math.max(0, Math.min(AH - 72, hy - 36));
    const crop = new Px(112, 72);
    for (let j = 0; j < 72; j++) for (let k = 0; k < 112; k++) crop.d[j * 112 + k] = px.get(sx + k, sy + j);
    label(g, 'THE HEAD, 3X', rx, y + 12 + AH + 6, 'slate');
    zoom(g, crop, rx, y + 12 + AH + 18, 3);
  });
  c.setAttribute('data-snap', `flayer-${style.slug}`);
  c.setAttribute('aria-label', `Mind Flayer ${style.name}: idle with its legs out, one leg warning and one slamming, and its head down with the legs severed, in a sample arena with two heroes for scale`);
  return c;
}
