// Billy's portrait (level 9), the owner's pick: Lifeguard. The free man, for `l9_billy_freed`, in the same 24 by 24 format and the same
// head, shoulders and expressions as data/portraits.ts, so he has every face the dialogue box asks for. A wet, slicked mullet in sun
// bleached yellow that falls to the collar, bare shoulders, and the whistle's cord round his neck. Types only come from portraits.ts, so
// this file can sit under it. Roles: s skin, d skin shade, h hair, i hair light, j hair dark, b the whistle, c its cord.
import type { PortraitSpec } from './portraits.ts';
import { P, S } from './billy.ts';

/** A row from segments, padded out to the 24 columns every portrait row has. */
const R = (...segs: Parameters<typeof S>): string => S(...segs).padEnd(24, '.');

/** A wet, slicked cut: close to the head, the same length behind. */
const SLICK = P(1,
  R([8, 'hhhhhhhh']), R([6, 'hhhhhhhhhhhh']), R([5, 'hhhhhihhhhhhhh']), R([5, 'hhhhhhhhhhhhhh']), R([5, 'hhhhhh'], [13, 'hhhhhh']),
  R([4, 'hhhhh'], [15, 'hhhhh']), R([4, 'hhhh'], [16, 'hhhh']), R([4, 'hhh'], [17, 'hhh']), R([4, 'hh'], [18, 'hh']),
  R([4, 'hh'], [18, 'hh']), R([4, 'hh'], [18, 'hh']), R([4, 'h'], [19, 'h']), R([3, 'hh'], [19, 'hh']), R([3, 'h'], [20, 'h']),
  R([3, 'hh'], [19, 'hh']), R([3, 'h'], [20, 'h']));

/** Lifeguard: bare shoulders, the whistle on its red cord. */
export const BILLY_PORTRAIT: PortraitSpec = {
  bg: 'blood1', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'yellow', i: 'cream', j: 'amber', a: 'skin0', b: 'white', c: 'red' },
  back: [],
  front: [SLICK],
  trim: [P(18, R([9, 'c'], [14, 'c']), R([6, 'ddd'], [10, 'c'], [13, 'c'], [15, 'ddd']), R([11, 'cc']), R([11, 'bb']), R([11, 'bb']))],
};
