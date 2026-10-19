// The Blue storm's bolt (stage 4.3, the owner's pick: hawkinsud_mix.ts, which has the sheet's cards): Blue night's kit with the lit edges pushed up
// the red ramp by the bolt, and the rain that streaks the road and glints on the roofs and slabs, dim between bolts and bright in one. Split
// out of the mix so the game's tiles (gfx/tile_udtown.ts) can read them without the cards and their room, which would close a loop of imports
// (look_kit.ts reads the night pass, which reads the club's tiles).
import type { Px } from '../px.ts';
import { BLUE, ps } from './hawkinsud_a.ts';
import type { Kit } from './hawkinsud_a.ts';
import type { TC } from './look_kit.ts';
import { dots } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

/** How hard the bolt lights the street, by phase: dark, dark, the bolt, its afterglow. In the game a bolt every 6 to 10 s. */
export const BOLT = [0, 0, 2, 1];

/** Blue night's kit with the lit edges pushed up the red ramp by the bolt. */
export function kitFor(f: number): Kit {
  if (!f) return BLUE;
  const hot = f > 1;
  return {
    ...BLUE,
    lip: hot ? 'hot' : 'red', rfHi: hot ? 'red' : 'blood1', sdHi: hot ? 'blood1' : BLUE.sdHi,
    drHi: hot ? 'red' : 'blood1', step: hot ? 'red' : BLUE.step, fr: hot ? 'blood1' : BLUE.fr,
    slHi: hot ? 'red' : 'blood1', cbHi: hot ? 'hot' : 'red', grHi: hot ? 'blood1' : BLUE.grHi, ln: hot ? 'rose' : BLUE.ln,
  };
}

type Rect = [number, number, number, number];
const STREAK: Rect[][] = [[[2, 3, 7, 1]], [[6, 11, 8, 1]], [[1, 4, 6, 1], [9, 12, 5, 1]], [[4, 4, 8, 1]]];
const SHEEN: Pt[][] = [[[4, 3], [12, 8]], [[10, 3], [3, 11]], [[6, 4], [14, 9]], [[3, 3], [9, 12]]];

/** Rain: red streaks on the asphalt (dim between bolts, bright in one), and glints on the roofs and slabs. */
export function rain(f: number): (px: Px, c: TC) => void {
  return (px, c) => {
    if (c.ch === '.' || c.ch === '=') {
      for (const [x, y, w] of STREAK[c.v] as Rect[]) {
        px.rect(x, y, w, 1, f > 1 ? 'hot' : f ? 'red' : 'blood1');
        if (f) px.set(x, y, f > 1 ? 'pink' : 'hot');
      }
    } else if (c.ch === '#' || c.ch === 'c') dots(px, ps(c, SHEEN[c.v] as Pt[]), f > 1 ? 'pink' : f ? 'red' : 'slate');
  };
}
