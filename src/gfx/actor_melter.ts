// The melting rat (docs/level-7.md): the rat's own frames (data/foes.ts), purple, standing a pixel higher in a puddle of its own goo, with
// drips running down its belly into it. Its legs are gone into the puddle. When it dies it is a flat puddle with its ears and tail still
// sticking out of it. Role letters are the rat's: d back fur and the goo, n ears, tail and a bright drop, w belly, e eye, y teeth.
// Five fill colors (dark purple, purple, pink, red, white) and the ink outline. Pure: no DOM.
import type { AnimId } from '../core/types.ts';
import type { View } from './data/types.ts';
import { outlineRoles } from './canvas.ts';
import { CELL, ratRoles } from './actor_pose.ts';

export const MELTER_PAL = { d: 'purple0', s: 'purple', n: 'pink', w: 'pink', e: 'hot', y: 'white' } as const;
const code = (c: string): number => c.charCodeAt(0);

function put(buf: Uint8Array, x: number, y: number, ch: string, over = false): void {
  if (x >= 0 && x < CELL && y >= 0 && y < CELL && (over || !buf[y * CELL + x])) buf[y * CELL + x] = code(ch);
}
function row(buf: Uint8Array, y: number, text: string, over = false): void {
  for (let x = 0; x < text.length; x++) if (text[x] !== '.') put(buf, x, y, text[x] as string, over);
}

/** The flat puddle it leaves, ears and tail and eyes still showing. */
const MELTED = [
  '................', '................', '................', '................', '................', '................', '................', '................',
  '................', '................', '...n........n...', '..nn........nn..', '..ddddndsndddd..', '.ddddeyddeydddd.', 'dddddnddddnddddd', '.dddddddddddddd.',
];

/** One frame of the melting rat, facing right when view is 'side'. */
export function composeMelter(view: View, anim: AnimId, frame: number): Uint8Array {
  const buf = new Uint8Array(CELL * CELL);
  if (anim === 'ko') {
    MELTED.forEach((r, y) => row(buf, y, r, true));
    outlineRoles(buf, CELL, CELL, code('k'));
    return buf;
  }
  const src = ratRoles(view, anim, frame);
  for (let y = 1; y < CELL; y++) for (let x = 0; x < CELL; x++) buf[(y - 1) * CELL + x] = src[y * CELL + x] as number;
  // The legs have run into the puddle: the bottom row of the rat is goo.
  for (let x = 0; x < CELL; x++) if (buf[13 * CELL + x]) buf[13 * CELL + x] = code('d');
  const wide = (frame + (anim === 'walk' ? 1 : 0)) & 1;
  row(buf, 13, wide ? '...dddddddddd...' : '....dddddddd....');
  row(buf, 14, wide ? '.dddddddddddddd.' : '..dddddddddddd..', true);
  // Drips down the belly, and a bright drop in the puddle.
  const at = wide ? [5, 10] : [4, 11];
  for (const x of at) { put(buf, x, 12, 'd', true); put(buf, x, 13, 'd', true); }
  put(buf, wide ? 8 : 7, 14, 'n', true);
  if (anim === 'attack') put(buf, view === 'side' ? 2 : 3, 11, 'n');
  outlineRoles(buf, CELL, CELL, code('k'));
  return buf;
}
