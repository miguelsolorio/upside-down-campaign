// The five Alpha designs in card order, and the card canvas for alpha-variations.html: for each design the walk frame, the howl
// and the leap at 4x, with the young demodog (the game's own frame) beside them for scale, then the same row at 1x on a tunnel
// floor. One canvas per design, so it can be exported as one image.
import { composeDog } from '../actor_dog.ts';
import { PAL } from '../palette.ts';
import type { Px } from '../px.ts';
import { ALPHA_A } from './alpha_a.ts';
import { ALPHA_B } from './alpha_b.ts';
import { H, W } from './alpha_kit.ts';
import type { AlphaOpt, AlphaPose } from './alpha_kit.ts';
import { cardCanvas, fills, flat, label, zoom } from './kit.ts';

export type { AlphaOpt } from './alpha_kit.ts';
export const ALPHA_OPTS: AlphaOpt[] = [...ALPHA_A, ...ALPHA_B];

const POSES: { pose: AlphaPose; label: string }[] = [{ pose: 'walk', label: 'WALK' }, { pose: 'howl', label: 'HOWL' }, { pose: 'leap', label: 'LEAP' }];
const K = 4, GAP = 10, DOG_W = 24, DOG_H = 20;
export const CARD_W = GAP + DOG_W * K + GAP + POSES.length * (W * K + GAP);
export const CARD_H = 156;
const STRIP = 110;

/** The three frames of a design. */
export function frames(o: AlphaOpt): Px[] { return POSES.map((p) => o.draw(p.pose)); }

/** Fill colors a design uses, not counting the ink outline. The young demodog uses four. */
export function colorsOf(o: AlphaOpt): number { return fills(...frames(o)); }

export function alphaCard(o: AlphaOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  g.fillStyle = PAL.soil0;
  g.fillRect(0, STRIP, CARD_W, CARD_H - STRIP);
  const dog = composeDog('side', 'stand', 0, false);
  const dogX = GAP, base = 8 + H * K;
  zoom(g, dog, dogX, base - DOG_H * K, K);
  label(g, 'YOUNG', dogX + (DOG_W * K - 30) / 2, 8 + H * K + 4, 'slate');
  flat(g, dog, dogX + 36, STRIP + 8 + (H - DOG_H));
  const x0 = GAP + DOG_W * K + GAP;
  frames(o).forEach((p, i) => {
    const x = x0 + i * (W * K + GAP);
    zoom(g, p, x, 8, K);
    label(g, POSES[i]!.label, x + (W * K - 24) / 2, 8 + H * K + 4, 'mist');
    flat(g, p, x + 48, STRIP + 8);
  });
  label(g, '1X ON A TUNNEL FLOOR', 8, CARD_H - 10, 'slate');
  c.setAttribute('data-snap', `alpha-${o.slug}`);
  c.setAttribute('aria-label', `${o.name}: walk, howl and leap frames next to the young demodog for scale`);
  return c;
}
