// The cards of vecna-variations.html: for each Vecna the eight poses at 2x under the phase they belong to (Clock, Float at
// 60%, Burn at 25%, then hurt), and a second row with his curse on a hero (Max lifted off the floor, eyes rolled white, the
// clock over her with two of four chimes sounded) at 2x and 1x, and Vecna at 1x beside Steve, Mike, Hopper and the
// Demogorgon for scale. One canvas per design. Data: vecna_opts.ts.
import { PAL } from '../palette.ts';
import { composeDemo } from '../actor_demo.ts';
import { composeFrame } from '../actor_pose.ts';
import { KIDS } from '../data/heroes.ts';
import { HOPPER } from '../data/hopper.ts';
import { MAX } from '../data/max.ts';
import { STEVE } from '../data/steve.ts';
import type { CharSpec } from '../data/types.ts';
import { Px } from '../px.ts';
import type { Made } from './ch4_page.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import { POSE_ORDER, VH, VW, curseMark } from './vecna_kit.ts';
import type { VecnaOpt } from './vecna_opts.ts';

export { VECNA_OPTS } from './vecna_opts.ts';

const K = 2, GAP = 8, FX = VW * K + GAP;
export const VECNA_W = GAP + POSE_ORDER.length * FX;
const ROW2 = 16 + VH * K + 22;
export const VECNA_H = ROW2 + 12 + 84 + 8;
const PHASES: [string, number, number][] = [['1 CLOCK', 0, 3], ['2 FLOAT, 60%', 3, 2], ['3 BURN, 25%', 5, 2], ['HURT', 7, 1]];

/** Fill colors of his sprite across every pose, not counting the ink outline or the fire. */
export function colorsOf(o: VecnaOpt): number {
  return fills(...POSE_ORDER.filter((p) => p !== 'burn' && p !== 'whip').map((p) => o.draw(p)));
}

/** Max under the curse: the hurt pose, her eyes white, lifted five px over her shadow, the clock above her. */
function cursed(o: VecnaOpt): Px {
  const p = new Px(20, 40);
  const max = paintRoles(composeFrame(MAX, 'down', 'hurt', 0), 16, { ...MAX.pal, e: 'white' });
  p.ellipse(10, 38.5, 5, 1.2, 'black');
  p.blit(max, 2, 18);
  p.blit(curseMark(o.mark.ring, o.mark.face, 2, o.mark.pip), 2, 0);
  return p;
}

/** The extra row a design that moves on its own gets: its stand pose through the whole loop at 2x. */
const LOOP_H = 16 + VH * K + 8;

export function vecnaCard(o: VecnaOpt): Made {
  const loop = o.loop ?? 0, H = VECNA_H + (loop ? LOOP_H : 0);
  const { c, g } = cardCanvas(VECNA_W, H, 'night');
  for (const [name, i0, n] of PHASES) {
    const x = GAP + i0 * FX, w = n * FX - GAP;
    g.fillStyle = PAL.shadow;
    g.fillRect(x, 12, w, 1);
    label(g, name, x, 3, name === 'HURT' ? 'slate' : 'hot');
  }
  POSE_ORDER.forEach((pose, i) => {
    const x = GAP + i * FX, name = pose.toUpperCase();
    label(g, name, x + Math.round((VW * K - name.length * 6) / 2), 16 + VH * K + 4, 'mist');
  });
  label(g, 'THE CURSE ON A HERO', GAP, ROW2, 'mist');
  g.fillStyle = PAL.soil0;
  g.fillRect(GAP, ROW2 + 12, VECNA_W - GAP * 2, 84);
  const cur = cursed(o);
  zoom(g, cur, GAP + 8, ROW2 + 14, 2);
  flat(g, cur, GAP + 56, ROW2 + 54);
  const sx = GAP + 96;
  label(g, '1X, WITH STEVE, MIKE, HOPPER AND THE DEMOGORGON', sx, ROW2 + 18, 'slate');
  const friends: CharSpec[] = [STEVE, KIDS[0]!, HOPPER];
  const base = ROW2 + 12 + 78;
  friends.forEach((s, i) => flat(g, paintRoles(composeFrame(s, 'down', 'idle', 0), 16, s.pal), sx + 44 + i * 22, base - 16));
  const demo = composeDemo('down', 'stand', 0, false);
  flat(g, demo, sx + 44 + 3 * 22 + 4, base - demo.h);
  if (loop) {
    const ly = VECNA_H;
    label(g, `THE TENDRILS WRITHE IN EVERY POSE, A LOOP OF ${loop} FRAMES`, GAP, ly, 'hot');
    for (let f = 0; f < Math.min(loop, POSE_ORDER.length); f++) {
      const x = GAP + f * FX;
      zoom(g, o.draw('stand', f), x, ly + 12, K);
      label(g, String(f + 1), x + VW * K / 2 - 3, ly + 12 + VH * K - 2, 'slate');
    }
  }
  /** The poses and the 1x figure, which move when the design has a loop. */
  const draw = (phase: number): void => {
    POSE_ORDER.forEach((pose, i) => {
      const x = GAP + i * FX;
      g.fillStyle = PAL.night;
      g.fillRect(x, 16, VW * K, VH * K);
      zoom(g, o.draw(pose, phase), x, 16, K);
    });
    g.fillStyle = PAL.soil0;
    g.fillRect(sx, base - VH, VW, VH);
    flat(g, o.draw('stand', phase), sx, base - VH);
  };
  draw(0);
  c.setAttribute('data-snap', `vecna-${o.slug}`);
  c.setAttribute('aria-label', `Vecna, ${o.name}: stand, walk, curse, float, throw, burn, whip and hurt, his curse on Max, and Vecna at real size beside the heroes and the Demogorgon`);
  const meta = `${colorsOf(o)} fill colors and the ink outline. The fire in the Burn phase is an effect drawn over him.${loop ? ' The tendrils are a layer of their own behind him, so they loop under every pose.' : ''}`;
  return loop ? { canvas: c, draw, meta } : { canvas: c, meta };
}
