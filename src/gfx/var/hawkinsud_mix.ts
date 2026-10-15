// The owner's pick for Upside Down Hawkins (stage 4.3): Blue night and Red storm mixed. Blue night is the town between bolts:
// blue black roofs, lawns and road, red veins, pale spores, and rain, so the asphalt holds dim red reflections of the sky.
// Every few seconds a bolt hits and the red storm runs through it: the lit edges (roof lips, shingle butts, curb tops, slab
// bevels, door frames) flash red and hot, the wet road streaks bright, then it fades back to blue over a step. The night pass
// leaves the reds alone, so the flash reads on the dark. mixCard() shows the room between bolts and in the bolt side by side.
import type { ColorName as N } from '../palette.ts';
import type { Ctx } from '../canvas.ts';
import { PAL } from '../palette.ts';
import type { Px } from '../px.ts';
import { BLUE, GLOW, car, place, ps, streetlight, tear, tiler, vine, yardClock } from './hawkinsud_a.ts';
import type { Kit } from './hawkinsud_a.ts';
import { HAWKINSUD_ROOM } from './hawkinsud.ts';
import { ROOM_H, ROOM_W, roomPx } from './look_kit.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { cardCanvas, label, zoom } from './kit.ts';
import { dots } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

/** How hard the bolt lights the street, by phase: dark, dark, the bolt, its afterglow. In the game a bolt every 6 to 10 s. */
export const BOLT = [0, 0, 2, 1];

/** Blue night's kit with the lit edges pushed up the red ramp by the bolt. */
function kitFor(f: number): Kit {
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
function rain(f: number): (px: Px, c: TC) => void {
  return (px, c) => {
    if (c.ch === '.' || c.ch === '=') {
      for (const [x, y, w] of STREAK[c.v] as Rect[]) {
        px.rect(x, y, w, 1, f > 1 ? 'hot' : f ? 'red' : 'blood1');
        if (f) px.set(x, y, f > 1 ? 'pink' : 'hot');
      }
    } else if (c.ch === '#' || c.ch === 'c') dots(px, ps(c, SHEEN[c.v] as Pt[]), f > 1 ? 'pink' : f ? 'red' : 'slate');
  };
}

const TILES = [0, 1, 2].map((f) => tiler(kitFor(f), rain(f)));

/** The four props in Blue night's colors, their highlights going red in the bolt. */
function props(phase: number): Prop[] {
  const f = BOLT[phase & 3] as number, k = kitFor(f), hi: N = f > 1 ? 'red' : f ? 'blood1' : 'mist';
  const auto = car({ b: 'slate', hi, lo: 'dusk', roof: f > 1 ? 'blood1' : 'mist', gl: 'black', gh: f ? 'red' : 'slate', tire: 'ink', lamp: 'grey2', tail: 'blood1' });
  vine(auto, [[12, 15], [12, 12], [14, 9], [13, 6], [15, 3], [16, 0]], k); vine(auto, [[14, 9], [18, 9], [22, 6], [26, 7]], k);
  const pole = streetlight({ pole: 'slate', hi, lo: 'dusk', head: 'dusk', headHi: hi, lens: 'black', foot: 'dusk' });
  vine(pole, [[8, 28], [6, 24], [9, 20], [6, 16], [9, 12], [7, 8]], k);
  const ck = yardClock({ body: 'slate', hi, lo: 'dusk', brass: 'blood1', brassHi: 'red', face: f > 1 ? 'pink' : 'grey3', hand: 'blood0', well: 'night' }, k, phase);
  return place(auto, pole, tear(GLOW, 'teal0', phase), ck);
}

export const BLUE_STORM: StageLook = {
  slug: 'blue-storm', name: 'Blue storm', night: true, glow: [640, 40, 90],
  note: 'Your mix: Blue night between bolts, with rain throwing dim red off the asphalt. A bolt every few seconds floods the lit edges red, then fades back to blue.',
  tile: (c, phase) => (TILES[BOLT[phase & 3] as number] as (c: TC, phase: number) => Px)(c, phase),
  props,
  lights: [[128, 146, 56, 0.75], [200, 40, 30, 0.6], [40, 136, 30, 0.6], [232, 136, 30, 0.5], [184, 24, 24, 0.4]],
};

const K = 2, PAD = 8, GAP = 12;
export const MIX_W = PAD * 2 + GAP + ROOM_W * K * 2;
export const MIX_H = PAD + 14 + ROOM_H * K + PAD;

/** The room between bolts and in the bolt, side by side at 2x. draw(phase) animates the left one through the cycle. */
export function mixCard(): { canvas: HTMLCanvasElement; draw: (phase: number) => void } {
  const { c, g } = cardCanvas(MIX_W, MIX_H, 'black');
  const paint = (ctx: Ctx, phase: number, x: number, name: string): void => {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(x, PAD, ROOM_W * K, 12);
    label(ctx, name, x, PAD, 'mist');
    zoom(ctx, roomPx(HAWKINSUD_ROOM, BLUE_STORM, phase), x, PAD + 14, K);
  };
  const draw = (phase: number): void => paint(g, phase & 3, PAD, phase ? 'THE CYCLE' : 'BETWEEN BOLTS');
  draw(0);
  paint(g, 2, PAD + ROOM_W * K + GAP, 'THE BOLT');
  c.setAttribute('aria-label', 'Blue storm: the street between bolts and in a bolt of red lightning');
  return { canvas: c, draw };
}
