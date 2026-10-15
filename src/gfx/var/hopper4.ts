// The cards of hopper4-variations.html (stage 4.1): one canvas per Hopper design, with the sprite facing down, up and side, a
// walk frame and the two haymaker frames (wind up, hit) at 4x, then the portrait in two expressions at 3x. Under them a 1x strip
// stands each frame on the Blizzard look's night snow beside today's Uniform Hopper, which is the size the game shows him. The
// canvas carries everything, so it can be exported as one image. The pure data is in hopper4_opts.ts.
import type { Expr } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { HOPPER } from '../data/hopper.ts';
import type { CharSpec } from '../data/types.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';
import { HOPPER_PORTRAIT } from '../data/portraits_l56.ts';
import { KAMCHATKA_OPTS, KAMCHATKA_ROOM } from './kamchatka.ts';
import { cardCanvas, fills, flat, floorOval, label, paintRoles, zoom } from './kit.ts';
import { ctxAt } from './look_kit.ts';
import { portrait } from './portrait.ts';
import type { HopperOpt } from './hopper4_opts.ts';

export { HOPPER4_OPTS } from './hopper4_opts.ts';
export type { HopperOpt } from './hopper4_opts.ts';

const K = 4, KP = 3, GAP = 8;
const FRAMES: { label: string; view: 'down' | 'up' | 'side'; anim: 'idle' | 'walk' | 'attack'; f: number }[] = [
  { label: 'DOWN', view: 'down', anim: 'idle', f: 0 }, { label: 'UP', view: 'up', anim: 'idle', f: 0 },
  { label: 'SIDE', view: 'side', anim: 'idle', f: 0 }, { label: 'WALK', view: 'side', anim: 'walk', f: 0 },
  { label: 'WIND UP', view: 'side', anim: 'attack', f: 0 }, { label: 'HIT', view: 'side', anim: 'attack', f: 1 },
];
export const CARD_W = GAP + FRAMES.length * (16 * K + GAP) + 2 * (24 * KP + GAP);
const PANEL = 92, STRIP = 112, STRIP_H = 52;
export const CARD_H = STRIP + STRIP_H + 8;

const sprite = (s: CharSpec, fr: (typeof FRAMES)[number]): Px => paintRoles(composeFrame(s, fr.view, fr.anim, fr.f), 16, s.pal);

/** The sprites of a design, in the order of FRAMES. */
export function frames(o: HopperOpt): Px[] { return FRAMES.map((fr) => sprite(o.spec, fr)); }

/** Fill colors a design's sprites use, not counting the ink outline, over the card's frames and the hurt frame. */
export function colorsOf(o: HopperOpt): number {
  return fills(...frames(o), paintRoles(composeFrame(o.spec, 'side', 'hurt', 0), 16, o.spec.pal));
}

/** The Blizzard look's snow, as the night art paints it, laid under a strip. Tile variants run along the strip. */
function snow(w: number, h: number, y0: number): Px {
  const look = KAMCHATKA_OPTS[0]!, out = new Px(w, h);
  for (let ty = 0; ty * 16 < h; ty++) {
    for (let tx = 0; tx * 16 < w; tx++) {
      const c = { ...ctxAt(KAMCHATKA_ROOM, 0, 1), tx: tx + 1, ty: ty + y0, v: (tx + 2 * ty) & 3 };
      out.blit(nightSprite(look.tile(c, 0)), tx * 16, ty * 16);
    }
  }
  return out;
}

const center = (x: number, w: number, s: string): number => x + Math.round((w - s.length * 6) / 2);

/** One option's card canvas. */
export function hopperCard(o: HopperOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  g.fillStyle = PAL.dusk;
  g.fillRect(0, 0, CARD_W, PANEL);
  const mine = frames(o);
  mine.forEach((p, i) => {
    const x = GAP + i * (16 * K + GAP), name = FRAMES[i]!.label;
    zoom(g, p, x, 8, K);
    label(g, name, center(x, 16 * K, name), 82, 'mist');
  });
  const px0 = GAP + FRAMES.length * (16 * K + GAP);
  ([['neutral', 'NEUTRAL'], [o.other, o.other.toUpperCase()]] as [Expr, string][]).forEach(([ex, name], j) => {
    const x = px0 + j * (24 * KP + GAP);
    zoom(g, portrait(o.portrait, ex), x, 8, KP);
    label(g, name, center(x, 24 * KP, name), 82, 'mist');
  });
  // The 1x strip: this design, then Uniform Hopper, then the portraits and this design's walk cycle, on the yard's snow.
  flat(g, snow(CARD_W, STRIP_H, 0), 0, STRIP);
  const base = STRIP + 18, STEP = 22;
  const stand = (p: Px, x: number): void => { floorOval(g, x + 8, base + 13, 12, 'shadow'); flat(g, p, x, base); };
  mine.forEach((p, i) => stand(p, GAP + i * STEP));
  const ux = GAP + mine.length * STEP + 14;
  FRAMES.forEach((fr, i) => stand(sprite(HOPPER, fr), ux + i * STEP));
  const rx = ux + FRAMES.length * STEP + 10;
  flat(g, portrait(o.portrait, 'neutral'), rx, base - 6);
  flat(g, portrait(HOPPER_PORTRAIT, 'neutral'), rx + 30, base - 6);
  const wx = rx + 76;
  for (let f = 0; f < 4; f++) stand(paintRoles(composeFrame(o.spec, 'side', 'walk', f), 16, o.spec.pal), wx + f * STEP);
  label(g, '1X ON KAMCHATKA SNOW', GAP, PANEL + 6, 'mist');
  label(g, 'UNIFORM HOPPER', ux, PANEL + 6, 'slate');
  label(g, 'PORTRAITS', rx, PANEL + 6, 'slate');
  label(g, 'WALK CYCLE', wx, PANEL + 6, 'slate');
  c.setAttribute('data-snap', `hopper4-${o.slug}`);
  c.setAttribute('aria-label', `Hopper, ${o.name}: sprite down, up and side, a walk frame, two haymaker frames, two portraits, and at real size on snow the frames beside Uniform Hopper, the portraits and the walk cycle`);
  return c;
}
