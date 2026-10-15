// The cards of heroes3-variations.html: one canvas per hero design, with the sprite facing down, up, left and right, a walk frame
// in profile and one from the front, then the portrait in two expressions. Each is drawn zoomed 4x on a dark ground, and again at
// 1x twice, on a pale mall floor and on a dark one, which is the size the game shows it. The canvas carries everything, so it can
// be exported as one image. The pure data is in robin.ts, nancy.ts and erica.ts.
import type { Expr } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { KIDS } from '../data/heroes.ts';
import { ADULTS } from '../data/adultchars.ts';
import type { CharSpec } from '../data/types.ts';
import type { Px } from '../px.ts';
import { compose3, mirror, poseOf } from './compose3.ts';
import { ERICA_OPTS } from './erica.ts';
import type { Hero3Opt, Who3 } from './heroes3_types.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import { NANCY_OPTS } from './nancy.ts';
import { portrait } from './portrait.ts';
import { ROBIN_OPTS } from './robin.ts';

export type { Hero3Opt } from './heroes3_types.ts';

export const HERO3_GROUPS: { who: Who3; title: string; role: string; opts: Hero3Opt[] }[] = [
  { who: 'robin', title: 'Robin', role: 'Teen body. Joins in 3.1, a Rogue who throws scoops. Scoops Ahoy sailor uniform, short hair.', opts: ROBIN_OPTS },
  { who: 'nancy', title: 'Nancy', role: 'Teen body. Joins in 3.1, a Gunslinger with a pistol and a shotgun. Brown hair, denim, 1985.', opts: NANCY_OPTS },
  { who: 'erica', title: 'Erica', role: 'Kid body. An npc in 3.1 who runs the ice cream cart. Small, bossy, bright.', opts: ERICA_OPTS },
];

const K = 4, KP = 3, GAP = 8;
const FRAMES: { label: string; view: 'down' | 'up' | 'side'; anim: 'idle' | 'walk'; f: number; flip?: boolean }[] = [
  { label: 'DOWN', view: 'down', anim: 'idle', f: 0 }, { label: 'UP', view: 'up', anim: 'idle', f: 0 },
  { label: 'LEFT', view: 'side', anim: 'idle', f: 0, flip: true }, { label: 'RIGHT', view: 'side', anim: 'idle', f: 0 },
  { label: 'WALK', view: 'side', anim: 'walk', f: 0 }, { label: 'WALK', view: 'down', anim: 'walk', f: 2 },
];
export const CARD_W = GAP + FRAMES.length * (16 * K + GAP) + 2 * (24 * KP + GAP);
const STRIP = 100, STRIP_H = 30;
export const CARD_H = STRIP + 2 * STRIP_H + 14;

/** The sprites of a design, in the order of FRAMES. */
export function spriteFrames(o: Hero3Opt): Px[] {
  return FRAMES.map((fr) => {
    const b = compose3(o.rig, fr.view, poseOf(fr.anim, fr.f));
    return paintRoles(fr.flip ? mirror(b) : b, 16, o.rig.spec.pal);
  });
}

/** Number of fill colors a design's sprites use, not counting the ink outline. */
export function colorsOf(o: Hero3Opt): number { return fills(...spriteFrames(o)); }

/** One option's card canvas. */
export function heroCard(o: Hero3Opt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  const strips: [number, 'bone' | 'shadow', string][] = [[STRIP, 'bone', 'DAY'], [STRIP + STRIP_H, 'shadow', 'DARK']];
  for (const [y, col] of strips) { g.fillStyle = PAL[col]; g.fillRect(0, y, CARD_W, STRIP_H); }
  const sprites = spriteFrames(o);
  const px0 = GAP + FRAMES.length * (16 * K + GAP);
  const shots: [Px, number, number][] = [];
  sprites.forEach((p, i) => {
    const x = GAP + i * (16 * K + GAP);
    zoom(g, p, x, 8, K);
    label(g, FRAMES[i]!.label, x + (16 * K - FRAMES[i]!.label.length * 6) / 2, 82, 'mist');
    shots.push([p, x + 24, 7]);
  });
  ([['neutral', 'NEUTRAL'], [o.other, o.other.toUpperCase()]] as [Expr, string][]).forEach(([ex, name], j) => {
    const x = px0 + j * (24 * KP + GAP), p = portrait(o.portrait, ex);
    zoom(g, p, x, 8, KP);
    label(g, name, x + (24 * KP - name.length * 6) / 2, 82, 'mist');
    shots.push([p, x + 24, 3]);
  });
  for (const [sy, , name] of strips) {
    label(g, name, 4, sy + 11, sy === STRIP ? 'slate' : 'mist');
    for (const [p, x, dy] of shots) flat(g, p, x, sy + dy);
  }
  c.setAttribute('data-snap', `heroes3-${o.who}-${o.slug}`);
  c.setAttribute('aria-label', `${o.who} ${o.name}: sprite down, up, left and right, two walk frames, and two portraits`);
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

