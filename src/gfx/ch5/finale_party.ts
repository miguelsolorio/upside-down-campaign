// The party as sprites, for the ending's basement and the mock scenes: a paper-doll frame (actor_pose.ts) painted with its hero's palette,
// at its own 16 by 16, facing any of the four ways (a left is the side view mirrored). Pure pixel work, so Node can run it.
import { px32 } from '../canvas.ts';
import { composeFrame } from '../actor_pose.ts';
import type { AnimId, Dir } from '../../core/types.ts';
import { MAX } from '../data/max.ts';
import { DUSTIN, ELEVEN, LUCAS, MIKE, WILL } from '../data/heroes.ts';
import type { CharSpec, View } from '../data/types.ts';
import { Px } from '../px.ts';

/** The heroes the ending seats at the table. */
export const PARTY = { mike: MIKE, dustin: DUSTIN, lucas: LUCAS, eleven: ELEVEN, will: WILL, max: MAX } as const;

/** A hero or foe as a Px: a paper-doll frame painted with its palette, `left` mirrored from the side view. */
export function heroPx(spec: CharSpec, dir: Dir = 'down', anim: AnimId = 'idle', frame = 0): Px {
  const view: View = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side';
  const buf = composeFrame(spec, view, anim, frame), out = new Px(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = buf[y * 16 + x] as number;
      if (!v) continue;
      const name = v === 107 ? 'ink' : spec.pal[String.fromCharCode(v)];
      if (name) out.d[y * 16 + (dir === 'left' ? 15 - x : x)] = px32(name);
    }
  }
  return out;
}
