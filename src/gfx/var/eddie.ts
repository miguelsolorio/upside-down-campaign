// The cards of eddie-variations.html: for each Eddie the eight frames (down, up, side, a walk frame, the Flying V's wind up and
// hit, and two frames of the solo) at 3x, then the portrait in two expressions, and the same frames at 1x on a floor beside
// Steve and Max, the size the game shows them. One canvas per design, so it can be exported as one image. Data: eddie_opts.ts.
import type { Expr } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { MAX } from '../data/max.ts';
import { STEVE } from '../data/steve.ts';
import type { CharSpec } from '../data/types.ts';
import type { Px } from '../px.ts';
import { FH, FRAMES, FW, eddieFrame } from './eddie_kit.ts';
import type { EddieOpt } from './eddie_kit.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import { portrait } from './portrait.ts';

export type { EddieOpt } from './eddie_kit.ts';
export { EDDIE_OPTS } from './eddie_opts.ts';

const K = 3, GAP = 8, PK = 3;
export const CARD_W = GAP + FRAMES.length * (FW * K + GAP);
const ROW2 = 8 + FH * K + 20;
export const CARD_H = ROW2 + 24 * PK + 18;

/** The frames of a design, in the order of FRAMES. */
export function frames(o: EddieOpt): Px[] {
  return FRAMES.map((fr) => paintRoles(eddieFrame(o, fr), FW, o.spec.pal));
}

/** Fill colors a design's sprites use, not counting the ink outline. */
export function colorsOf(o: EddieOpt): number { return fills(...frames(o)); }

const center = (x: number, w: number, s: string): number => x + Math.round((w - s.length * 6) / 2);

export function eddieCard(o: EddieOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  frames(o).forEach((p, i) => {
    const x = GAP + i * (FW * K + GAP), name = FRAMES[i]!.label;
    zoom(g, p, x, 8, K);
    label(g, name, center(x, FW * K, name), 8 + FH * K + 6, 'mist');
  });
  ([['neutral', 'NEUTRAL'], [o.other, o.other.toUpperCase()]] as [Expr, string][]).forEach(([ex, name], j) => {
    const x = GAP + j * (24 * PK + GAP);
    zoom(g, portrait(o.portrait, ex), x, ROW2, PK);
    label(g, name, center(x, 24 * PK, name), ROW2 + 24 * PK + 5, 'mist');
  });
  const sx = GAP + 2 * (24 * PK + GAP) + 8, sw = CARD_W - sx - GAP;
  g.fillStyle = PAL.soil0;
  g.fillRect(sx, ROW2, sw, 24 * PK);
  const friends: CharSpec[] = [STEVE, MAX];
  const row: Px[] = [...frames(o), ...friends.map((s) => paintRoles(composeFrame(s, 'down', 'idle', 0), 16, s.pal))];
  row.forEach((p, i) => {
    const big = i < FRAMES.length;
    flat(g, p, sx + 10 + i * 30 + (big ? 0 : 4), ROW2 + 22 + (big ? 0 : 4));
  });
  flat(g, portrait(o.portrait, 'neutral'), sx + sw - 34, ROW2 + 44);
  label(g, '1X, WITH STEVE AND MAX', sx + 10, ROW2 + 8, 'slate');
  c.setAttribute('data-snap', `eddie-${o.slug}`);
  c.setAttribute('aria-label', `Eddie, ${o.name}: down, up, side, walk, wind up, hit, two solo frames, two portraits, and the frames at real size next to Steve and Max`);
  return c;
}
