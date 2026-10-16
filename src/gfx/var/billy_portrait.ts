// Billy's portraits (docs/level-9.md): the free man, for `l9_billy_freed`, in the game's PortraitSpec format so a chosen one goes into
// data/portraits.ts as it is, and the same face as Flayed, for the card. The mullet is the game's own head with the hair swept out over
// the ears; the five designs change the clothes at the shoulders, the hair's color and, for Lifeguard, the cut. Roles: s skin, d skin
// shade, h hair (i light, j dark), a b c what he wears.
import type { Expr } from '../../core/types.ts';
import type { ColorName } from '../palette.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import type { Part } from '../data/types.ts';
import { portrait } from './portrait.ts';
import type { Px } from '../px.ts';
import { P, S } from './billy_body.ts';

/** The mullet seen from the front: a mound with a center part, the sides swept out over the ears and down to the collar. */
const FULL: Part[] = [P(1,
  S([8, 'hhhhhhhh']), S([6, 'hhhhhhhhhhhh']), S([5, 'hhhhhihhhhhhhh']), S([4, 'hhhhhhhhhhhhhhhh']), S([4, 'hhhhhhhhhhhhhhhh']),
  S([3, 'hhhhhhh'], [14, 'hhhhhhh']), S([3, 'hhhhhh'], [15, 'hhhhhh']), S([3, 'hhhh'], [17, 'hhhh']), S([3, 'hhhh'], [17, 'hhhh']),
  S([3, 'hhhh'], [17, 'hhhh']), S([3, 'hhh'], [18, 'hhh']), S([3, 'hhh'], [18, 'hhh']), S([3, 'hh'], [19, 'hh']), S([4, 'h'], [19, 'h']),
  S([3, 'hh'], [19, 'hh']), S([3, 'h'], [20, 'h']))];
/** A wet, slicked cut: close to the head, the same length behind. */
const SLICK: Part[] = [P(1,
  S([8, 'hhhhhhhh']), S([6, 'hhhhhhhhhhhh']), S([5, 'hhhhhihhhhhhhh']), S([5, 'hhhhhhhhhhhhhh']), S([5, 'hhhhhh'], [13, 'hhhhhh']),
  S([4, 'hhhhh'], [15, 'hhhhh']), S([4, 'hhhh'], [16, 'hhhh']), S([4, 'hhh'], [17, 'hhh']), S([4, 'hh'], [18, 'hh']),
  S([4, 'hh'], [18, 'hh']), S([4, 'hh'], [18, 'hh']), S([4, 'h'], [19, 'h']), S([3, 'hh'], [19, 'hh']), S([3, 'h'], [20, 'h']),
  S([3, 'hh'], [19, 'hh']), S([3, 'h'], [20, 'h']))];

const spec = (bg: ColorName, pal: Record<string, ColorName>, front: Part[], trim: Part[]): PortraitSpec => ({ bg, shirt: 'plain', pal, back: [], front, trim });
const skin = { s: 'skin0', d: 'skin1' } as const;

export const BILLY_PORTRAITS: Record<string, PortraitSpec> = {
  // Bare shoulders, the whistle cord round the neck.
  lifeguard: spec('blood1', { ...skin, h: 'yellow', i: 'cream', j: 'amber', a: 'skin0', b: 'white', c: 'red' }, SLICK, [
    P(18, S([9, 'c'], [14, 'c']), S([6, 'ddd'], [10, 'c'], [13, 'c'], [15, 'ddd']), S([11, 'cc']), S([11, 'bb']), S([11, 'bb'])),
  ]),
  // A pale blue shirt open to the waist, the collar flared.
  opencollar: spec('dusk', { ...skin, h: 'sand', i: 'amber', j: 'soil3', a: 'sky', b: 'white', c: 'sky' }, FULL, [
    P(18, S([6, 'bbb'], [15, 'bbb']), S([7, 'bbb'], [14, 'bbb']), S([8, 'b'], [15, 'b']), S([10, 'ssss']), S([9, 'ssssss']), S([9, 'ssssss']), S([9, 'ssssss'])),
  ]),
  // A white tank: the shoulders and arms bare, a scoop of skin at the neck.
  tank: spec('teal0', { ...skin, h: 'amber', i: 'yellow', j: 'soil3', a: 'white', b: 'blood1', c: 'white' }, FULL, [
    P(19, S([3, 'sss'], [18, 'sss']), S([2, 'sssss'], [17, 'sssss']), S([10, 'ssss'], [2, 'ss'], [20, 'ss']), S([9, 'ssssss'], [2, 'ss'], [20, 'ss']), S([2, 'ss'], [20, 'ss'])),
  ]),
  // A denim vest open on the chest, a gold cross on a chain.
  denim: spec('soil1', { ...skin, h: 'sand', i: 'soil3', j: 'soil2', a: 'slate', b: 'mist', c: 'amber' }, FULL, [
    P(19, S([8, 'bb'], [14, 'bb']), S([10, 'ssss']), S([9, 'ssssss']), S([10, 'ssss']), S([11, 'ss'])),
    P(20, S([10, 'c'], [13, 'c']), S([11, 'cc']), S([10, 'cccc']), S([11, 'cc'])),
  ]),
  // A loud orange beach shirt, open at the chest, printed with yellow and pink.
  hawaiian: spec('purple0', { ...skin, h: 'cream', i: 'white', j: 'sand', a: 'orange', b: 'yellow', c: 'pink' }, FULL, [
    P(19, S([8, 'bb'], [14, 'bb'], [5, 'c'], [17, 'b']), S([10, 'ssss']), S([9, 'ssssss'], [4, 'b'], [7, 'c'], [15, 'c'], [19, 'b']), S([9, 'ssssss'], [5, 'c'], [17, 'b']), S([9, 'ssssss'], [3, 'b'], [7, 'b'], [16, 'c'], [19, 'c'])),
  ]),
};

const PALE: Partial<Record<ColorName, ColorName>> = { skin0: 'bone', skin1: 'grey3' };
/** The same face as the thing Eleven finds: ash skin, dead white eyes, and the veins across the forehead, the cheeks and the neck. */
export function flayedPortrait(src: PortraitSpec, expr: Expr = 'neutral'): Px {
  const pal: Record<string, ColorName> = {};
  for (const [k, v] of Object.entries(src.pal)) pal[k] = PALE[v] ?? v;
  const px = portrait({ ...src, pal }, expr);
  for (const [x, y] of [[8, 9], [9, 9], [8, 10], [9, 10], [14, 9], [15, 9], [14, 10], [15, 10]] as [number, number][]) px.set(x, y, 'white');
  for (const [x, y] of [[8, 11], [9, 11], [14, 11], [15, 11]] as [number, number][]) px.set(x, y, 'purple0');
  const veins: [number, number][] = [[11, 6], [11, 7], [12, 7], [12, 8], [10, 8], [6, 12], [7, 12], [7, 13], [8, 14], [17, 12], [16, 12], [16, 13], [15, 14], [11, 15], [11, 17], [12, 18], [11, 19], [10, 20]];
  for (const [x, y] of veins) if (px.get(x, y) !== 0) px.set(x, y, 'purple0');
  return px;
}
