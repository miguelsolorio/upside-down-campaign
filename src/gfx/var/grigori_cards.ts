// The cards of grigori-variations.html: one canvas per design, with Grigori facing down and up, a walk frame in profile and from
// the front, the haymaker's wind-up and swing, and the grab from the side and the front, then Mike, Hopper and Grigori side by
// side for scale. Each is drawn zoomed 4x on a dark ground, and again at 1x on a pale floor and on a dark one, which is the size
// the game shows it. The canvas carries everything, so it can be exported as one image. The designs are in grigori.ts.
import { PAL } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { BIG } from '../data/big.ts';
import { HOPPER } from '../data/hopper.ts';
import { KIDS } from '../data/heroes.ts';
import type { Px } from '../px.ts';
import type { PoseDef } from './compose3.ts';
import { compose3, poseOf } from './compose3.ts';
import { GRIGORI_OPTS } from './grigori.ts';
import type { GrigoriOpt } from './grigori.ts';
import { GRAB, SWING, WIND } from './grigori_poses.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';

export { GRIGORI_OPTS } from './grigori.ts';
export type { GrigoriOpt } from './grigori.ts';

const K = 4, GAP = 8;
const FRAMES: { label: string; view: 'down' | 'up' | 'side'; pose: PoseDef }[] = [
  { label: 'DOWN', view: 'down', pose: poseOf('idle', 0) }, { label: 'UP', view: 'up', pose: poseOf('idle', 0) },
  { label: 'WALK', view: 'side', pose: poseOf('walk', 0) }, { label: 'WALK', view: 'down', pose: poseOf('walk', 2) },
  { label: 'WIND UP', view: 'side', pose: WIND }, { label: 'SWING', view: 'side', pose: SWING },
  { label: 'GRAB', view: 'side', pose: GRAB }, { label: 'GRAB', view: 'down', pose: GRAB },
];
const SCALE = ['MIKE', 'HOPPER', 'GRIGORI'];
const SLOT = 16 * K + GAP;
export const CARD_W = GAP + FRAMES.length * SLOT + 16 + SCALE.length * SLOT;
const STRIP = 100, STRIP_H = 30;
export const CARD_H = STRIP + 2 * STRIP_H + 14;

/** The game's own Hopper (the owner's pick) on the big body, and Mike on the kid body, facing the viewer. */
export function scalePair(): [Px, Px] {
  const mike = paintRoles(composeFrame(KIDS[0]!, 'down', 'idle', 0), 16, KIDS[0]!.pal);
  const hop = paintRoles(compose3({ spec: HOPPER, body: BIG, thick: true }, 'down', poseOf('idle', 0)), 16, HOPPER.pal);
  return [mike, hop];
}

/** The sprites of a design, in the order of FRAMES. */
export function spriteFrames(o: GrigoriOpt): Px[] {
  return FRAMES.map((fr) => paintRoles(compose3(o.rig, fr.view, fr.pose), 16, o.rig.spec.pal));
}

/** Number of fill colors a design's sprites use, not counting the ink outline. */
export function colorsOf(o: GrigoriOpt): number { return fills(...spriteFrames(o)); }

/** One design's card canvas. */
export function grigoriCard(o: GrigoriOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  const strips: [number, 'bone' | 'shadow', string][] = [[STRIP, 'bone', 'DAY'], [STRIP + STRIP_H, 'shadow', 'DARK']];
  for (const [y, col] of strips) { g.fillStyle = PAL[col]; g.fillRect(0, y, CARD_W, STRIP_H); }
  const sprites = spriteFrames(o);
  const [mike, hop] = scalePair();
  const all: [Px, string][] = [...sprites.map((p, i) => [p, FRAMES[i]!.label] as [Px, string]), [mike, SCALE[0]!], [hop, SCALE[1]!], [sprites[0]!, SCALE[2]!]];
  all.forEach(([p, name], i) => {
    const x = GAP + i * SLOT + (i >= FRAMES.length ? 16 : 0);
    zoom(g, p, x, 8, K);
    label(g, name, x + (16 * K - name.length * 6) / 2, 82, i >= FRAMES.length ? 'cream' : 'mist');
    for (const [sy] of strips) flat(g, p, x + 24, sy + 7);
  });
  for (const [sy, , name] of strips) label(g, name, 4, sy + 11, sy === STRIP ? 'slate' : 'mist');
  c.setAttribute('data-snap', `grigori-${o.slug}`);
  c.setAttribute('aria-label', `Grigori ${o.name}: down, up, a walk, the haymaker wind up and swing, the grab, and Mike and Hopper beside him for scale`);
  return c;
}

