// The cards of heroes2-variations.html: one canvas per hero design, with the sprite facing down, up and side, a walk frame and
// the two attack frames (wind-up, hit), then the portrait in two expressions. Each is drawn zoomed 4x on a dark ground, and
// again at 1x on a tunnel floor colour underneath, which is the size the game shows it. The canvas carries everything, so
// it can be exported as one image. The pure data is in max.ts, steve.ts and hopper.ts.
import type { Expr } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { KIDS } from '../data/heroes.ts';
import { ADULTS } from '../data/adultchars.ts';
import type { CharSpec } from '../data/types.ts';
import type { Px } from '../px.ts';
import { compose } from './compose.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import type { HeroName, HeroOpt } from './hero_types.ts';
import { HOPPER_OPTS } from './hopper.ts';
import { MAX_OPTS } from './max.ts';
import { portrait } from './portrait.ts';
import { STEVE_OPTS } from './steve.ts';

export type { HeroOpt } from './hero_types.ts';

export const HERO_GROUPS: { who: HeroName; title: string; role: string; opts: HeroOpt[] }[] = [
  { who: 'max', title: 'Max', role: 'Kid body. Joins in 2.2, a Monk with a skateboard.', opts: MAX_OPTS },
  { who: 'steve', title: 'Steve', role: 'Adult body, a head taller than the kids. Joins in 2.2, a Fighter with a nail bat.', opts: STEVE_OPTS },
  { who: 'hopper', title: 'Hopper', role: 'The big body: wider, with a belly and thick arms. An npc in 2.3.', opts: HOPPER_OPTS },
];

const K = 4, KP = 3, GAP = 8;
const FRAMES: { label: string; view: 'down' | 'up' | 'side'; anim: 'idle' | 'walk' | 'attack'; f: number }[] = [
  { label: 'DOWN', view: 'down', anim: 'idle', f: 0 }, { label: 'UP', view: 'up', anim: 'idle', f: 0 },
  { label: 'SIDE', view: 'side', anim: 'idle', f: 0 }, { label: 'WALK', view: 'side', anim: 'walk', f: 0 },
  { label: 'WIND UP', view: 'side', anim: 'attack', f: 0 }, { label: 'HIT', view: 'side', anim: 'attack', f: 1 },
];
export const CARD_W = GAP + FRAMES.length * (16 * K + GAP) + 2 * (24 * KP + GAP);
export const CARD_H = 150;
const STRIP = 104;

/** The sprites of a design, in the order of FRAMES. */
export function spriteFrames(o: HeroOpt): Px[] {
  return FRAMES.map((fr) => paintRoles(compose(o.rig, fr.view, fr.anim, fr.f), 16, o.rig.spec.pal));
}

/** Number of fill colors a design's sprites use, not counting the ink outline. */
export function colorsOf(o: HeroOpt): number { return fills(...spriteFrames(o)); }

/** One option's card canvas. */
export function heroCard(o: HeroOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  g.fillStyle = PAL.soil0;
  g.fillRect(0, STRIP, CARD_W, CARD_H - STRIP);
  const sprites = spriteFrames(o);
  sprites.forEach((p, i) => {
    const x = GAP + i * (16 * K + GAP);
    zoom(g, p, x, 8, K);
    label(g, FRAMES[i]!.label, x + (16 * K - FRAMES[i]!.label.length * 6) / 2, 82, 'mist');
    flat(g, p, x + 24, STRIP + 8);
  });
  const px0 = GAP + FRAMES.length * (16 * K + GAP);
  ([['neutral', 'NEUTRAL'], [o.other, o.other.toUpperCase()]] as [Expr, string][]).forEach(([ex, name], j) => {
    const x = px0 + j * (24 * KP + GAP), p = portrait(o.portrait, ex);
    zoom(g, p, x, 8, KP);
    label(g, name, x + (24 * KP - name.length * 6) / 2, 82, 'mist');
    flat(g, p, x + 24, STRIP + 8);
  });
  label(g, '1X ON A TUNNEL FLOOR', 8, CARD_H - 10, 'slate');
  c.setAttribute('data-snap', `heroes2-${o.who}-${o.slug}`);
  c.setAttribute('aria-label', `${o.who} ${o.name}: sprite down, up and side, a walk frame, two attack frames, and two portraits`);
  return c;
}

/** The game's own kids and adult for scale: Mike, Dustin, Joyce, as composeFrame draws them. */
export function scaleStrip(): HTMLCanvasElement {
  const specs: CharSpec[] = [KIDS[0]!, KIDS[1]!, ADULTS[0]!];
  const W = GAP + specs.length * (16 * K + GAP), { c, g } = cardCanvas(W, 16 * K + 24, 'night');
  specs.forEach((s, i) => {
    const x = GAP + i * (16 * K + GAP);
    zoom(g, paintRoles(composeFrame(s, 'down', 'idle', 0), 16, s.pal), x, 6, K);
    label(g, s.id.toUpperCase(), x + (16 * K - s.id.length * 6) / 2, 16 * K + 12, 'mist');
  });
  c.setAttribute('aria-label', 'Mike, Dustin and Joyce as the game draws them, for scale');
  return c;
}
