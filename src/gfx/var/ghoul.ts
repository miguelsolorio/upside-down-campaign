// The cards of ghoul-variations.html (stage 4.2): for each Creel ghoul the eight poses at 3x, each on a patch of the Abandoned
// look's real floor (the first two on the real wall with its mirror, the ghoul laid over the glass), and under them a scene of
// the Creel House at night at its real size and again at 2x: one ghoul stepping out of the mirror, one standing (it drifts
// when the page animates), and Max beside them for scale. The ghouls are drawn as the game draws an actor, on top of the
// night art, so how they read on the dark is what the sheet shows. One canvas per design. Data: ghoul_a.ts, ghoul_b.ts.
import { composeFrame } from '../actor_pose.ts';
import { MAX } from '../data/max.ts';
import { PAL } from '../palette.ts';
import { Px } from '../px.ts';
import type { Made } from './ch4_page.ts';
import { CREEL_OPTS, CREEL_ROOM } from './creel.ts';
import { GPOSES, POSE_NAMES, TILE_X, W, H } from './ghoul_kit.ts';
import type { GPose, GhoulOpt } from './ghoul_kit.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import { roomPx } from './look_kit.ts';

export { GHOUL_OPTS } from './ghoul_opts.ts';

const K = 3, GAP = 12, CELL = W * K;
export const GHOUL_W = GAP + GPOSES.length * (CELL + GAP);
const ROW1 = 16, ROW2 = ROW1 + H * K + 20;
const SW = 176, SH = 112;
export const GHOUL_H = ROW2 + 12 + SH * 2 + 8;
const MIRROR = [32, 16], FLOOR = [100, 130];

/** Fill colors a design uses across every pose, not counting the ink outline. */
export function colorsOf(o: GhoulOpt): number {
  return fills(...GPOSES.map((p) => o.draw(p, 0)));
}

/** A w by h patch of a Px. */
function crop(src: Px, x: number, y: number, w: number, h: number): Px {
  const out = new Px(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.d[j * w + i] = src.get(x + i, y + j);
  return out;
}

/** A flat dark oval on the floor under feet at (cx, y). */
function shadow(px: Px, cx: number, y: number, rx: number): void {
  px.ellipse(cx, y + 0.5, rx, 1.6, 'black');
}

const STAND_LOOP: GPose[] = ['stand', 'driftA', 'stand', 'driftB'];

/** The room round the mirror with the ghouls and Max on it. */
function scene(room: Px, o: GhoulOpt, phase: number): Px {
  const out = crop(room, 0, 0, SW, SH);
  const feet = 66;
  shadow(out, 95, feet, 8);
  shadow(out, 66, feet, 6);
  out.blit(o.draw('step'), MIRROR[0] - TILE_X, MIRROR[1]);
  out.blit(paintRoles(composeFrame(MAX, 'down', 'idle', 0), 16, MAX.pal), 58, feet - 15);
  out.blit(o.draw(STAND_LOOP[phase & 3] as GPose, phase), 84, feet - 24);
  return out;
}

export function ghoulCard(o: GhoulOpt): Made {
  const { c, g } = cardCanvas(GHOUL_W, GHOUL_H, 'night');
  const room = roomPx(CREEL_ROOM, CREEL_OPTS[1]!, 0);
  const wall = crop(room, MIRROR[0] - TILE_X, MIRROR[1], W, H), floor = crop(room, FLOOR[0], FLOOR[1], W, H);
  GPOSES.forEach((pose, i) => {
    const x = GAP + i * (CELL + GAP), name = POSE_NAMES[pose];
    const bed = pose === 'glass' || pose === 'step' ? wall : floor;
    zoom(g, new Px(W, H).blit(bed, 0, 0).blit(o.draw(pose, 0), 0, 0), x, ROW1, K);
    label(g, name, x + Math.round((CELL - name.length * 6) / 2), ROW1 + H * K + 4, 'mist');
  });
  label(g, 'THE CREEL HOUSE AT NIGHT, REAL SIZE AND 2X, WITH MAX FOR SCALE', GAP, ROW2, 'mist');
  const draw = (phase: number): void => {
    g.fillStyle = PAL.black;
    g.fillRect(GAP, ROW2 + 12, SW, SH);
    g.fillRect(GAP + SW + 12, ROW2 + 12, SW * 2, SH * 2);
    const px = scene(room, o, phase);
    flat(g, px, GAP, ROW2 + 12);
    zoom(g, px, GAP + SW + 12, ROW2 + 12, 2);
  };
  draw(0);
  c.setAttribute('data-snap', `ghoul-${o.slug}`);
  c.setAttribute('aria-label', `${o.name}: in the glass, stepping out, stand, drift A and B, lunge, hurt and shatter, and the ghoul in the Creel House beside Max at real size and 2x`);
  return { canvas: c, draw, meta: `${colorsOf(o)} fill colors and the ink outline. The standing ghoul in the scene drifts when the page animates.` };
}
