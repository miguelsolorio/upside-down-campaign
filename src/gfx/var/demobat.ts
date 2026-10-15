// The cards of demobat-variations.html (stage 4.3 and chapter 5): for each demobat design the eight frames at 4x on the night
// (flap 1 to 4, glide, dive, stunned, hit), each over its ground shadow; and under them a 1x scene in the Blue storm street,
// the real size the game shows, with a flock of five flapping bats and one diving at Eddie, and the same flock again at 2x. On
// the page the flap runs: draw(phase) moves each bat on to its next frame. One canvas per design. Frames: demobat_kit.ts.
import { PAL } from '../palette.ts';
import { Px } from '../px.ts';
import type { Made } from './ch4_page.ts';
import { FRAMES, FW, eddieFrame } from './eddie_kit.ts';
import { EDDIE_OPTS } from './eddie_opts.ts';
import { BH, BW, FRAME_NAMES, demobatFrame } from './demobat_kit.ts';
import type { DemobatId, FrameName } from './demobat_kit.ts';
import { BLUE_STORM } from './hawkinsud_mix.ts';
import { HAWKINSUD_ROOM } from './hawkinsud.ts';
import { cardCanvas, fills, floorOval, label, paintRoles, zoom } from './kit.ts';
import { roomPx } from './look_kit.ts';

export interface DemobatOpt { id: DemobatId; name: string; note: string }

export const DEMOBAT_OPTS: DemobatOpt[] = [
  { id: 'show', name: 'Show bat', note: 'Grey-black leather wings with a scalloped edge, a long tail that curls, and a red petal head that opens when it dives.' },
  { id: 'pale', name: 'Pale', note: 'Bone-pale skin with red veins, the Demogorgon\'s colors, so it reads bright against the dark sky.' },
  { id: 'ray', name: 'Ray', note: 'A wide flat manta that ripples instead of flapping, with the tail a long stiff spine.' },
  { id: 'ember', name: 'Ember', note: 'Near black with glowing red veins and eyes, so a flock reads as red points in the storm.' },
];

const K = 4, GAP = 8, SH = 5;
const FW4 = BW * K, FH4 = (BH + SH) * K;
export const BAT_W = GAP + FRAME_NAMES.length * (FW4 + GAP);
const ROW2 = 12 + FH4 + 12 + 6;
const SCENE_W = 256, SCENE_H = 160;
export const BAT_H = ROW2 + 12 + SCENE_H + 8;
const NAMES: Record<FrameName, string> = { flap1: 'FLAP 1', flap2: 'FLAP 2', flap3: 'FLAP 3', flap4: 'FLAP 4', glide: 'GLIDE', dive: 'DIVE', stunned: 'STUNNED', hit: 'HIT' };

/** Fill colors a design uses over all its frames, not counting the ink outline or the ground shadow. */
export function colorsOf(o: DemobatOpt): number {
  return fills(...FRAME_NAMES.map((f) => demobatFrame(o.id, f)));
}

const cache = new Map<string, HTMLCanvasElement>();
const frameCanvas = (id: DemobatId, f: FrameName): HTMLCanvasElement => {
  const k = `${id}|${f}`;
  let c = cache.get(k);
  if (!c) { c = demobatFrame(id, f).toCanvas(); cache.set(k, c); }
  return c;
};

/** The ground shadow, a flat black oval under the bat, which doesn't count toward its colors. */
const SHADOW = new Px(9, 3).ellipse(4.5, 1.5, 4.5, 1.5, 'black');

/** A frame over its shadow: the sprite sits at the top, the shadow a pixel below it. */
function shadowed(o: DemobatOpt, f: FrameName): Px {
  const p = new Px(BW, BH + SH);
  p.blit(SHADOW, 4, BH);
  p.blit(demobatFrame(o.id, f), 0, 0);
  return p;
}

// ---------------------------------------------------------------- the scene
interface Flyer { x: number; y: number; off: number; dive?: boolean }
const FLOCK: Flyer[] = [
  { x: 48, y: 54, off: 0 }, { x: 84, y: 34, off: 1 }, { x: 168, y: 40, off: 2 }, { x: 184, y: 76, off: 3 }, { x: 60, y: 90, off: 2 },
  { x: 136, y: 52, off: 0, dive: true },
];
/** The body rides up on the down stroke: a row of lift for each of the four flap frames. */
const BOB = [0, 0, -1, 0];
const FLAP: FrameName[] = ['flap1', 'flap2', 'flap3', 'flap4'];
const EDDIE_AT: [number, number] = [114, 84];
const CROP = { x: 36, y: 30, w: 168, h: 80 };

let roomCanvas: HTMLCanvasElement | null = null, shadowCanvas: HTMLCanvasElement | null = null;
const heroCanvas = (): HTMLCanvasElement => {
  const o = EDDIE_OPTS[0]!, solo = FRAMES.findIndex((f) => f.label === 'SOLO');
  const p = new Px(FW, 22).blit(paintRoles(eddieFrame(o, FRAMES[solo]!), FW, o.spec.pal), 0, 0);
  return p.toCanvas();
};
let hero: HTMLCanvasElement | null = null;

/** The street with the flock over it at flap step `phase`: shadows on the ground first, then Eddie, then the bats. */
function scene(g: CanvasRenderingContext2D, o: DemobatOpt, phase: number): void {
  roomCanvas ??= roomPx(HAWKINSUD_ROOM, BLUE_STORM, 0).toCanvas();
  hero ??= heroCanvas();
  shadowCanvas ??= SHADOW.toCanvas();
  g.imageSmoothingEnabled = false;
  g.drawImage(roomCanvas, 0, 0);
  for (const b of FLOCK) g.drawImage(shadowCanvas, b.x + 4, b.y + BH + 4);
  floorOval(g, EDDIE_AT[0] + 14, EDDIE_AT[1] + 18, 16);
  g.drawImage(hero, EDDIE_AT[0], EDDIE_AT[1]);
  for (const b of FLOCK) {
    const step = (phase + b.off) & 3;
    g.drawImage(frameCanvas(o.id, b.dive ? 'dive' : FLAP[step] as FrameName), b.x, b.y + (b.dive ? 0 : BOB[step] as number));
  }
}

export function batCard(o: DemobatOpt): Made {
  const { c, g } = cardCanvas(BAT_W, BAT_H, 'night');
  FRAME_NAMES.forEach((f, i) => {
    const x = GAP + i * (FW4 + GAP), name = NAMES[f];
    g.fillStyle = PAL.shadow;
    g.fillRect(x, 12, FW4, FH4);
    zoom(g, shadowed(o, f), x, 12, K);
    label(g, name, x + Math.round((FW4 - name.length * 6) / 2), 12 + FH4 + 4, f === 'hit' ? 'slate' : 'mist');
  });
  label(g, 'THE FRAMES AT 4X, EACH OVER ITS SHADOW', GAP, 2, 'slate');
  label(g, '1X IN THE BLUE STORM, WITH EDDIE', GAP, ROW2, 'slate');
  label(g, 'THE SAME FLOCK AT 2X', GAP + SCENE_W + GAP, ROW2, 'slate');
  const sc = document.createElement('canvas');
  sc.width = SCENE_W; sc.height = SCENE_H;
  const sg = sc.getContext('2d') as CanvasRenderingContext2D;
  const draw = (phase: number): void => {
    scene(sg, o, phase);
    g.imageSmoothingEnabled = false;
    g.drawImage(sc, GAP, ROW2 + 12);
    const x2 = GAP + SCENE_W + GAP;
    g.fillStyle = PAL.black;
    g.fillRect(x2, ROW2 + 12, BAT_W - x2 - GAP, CROP.h * 2);
    g.drawImage(sc, CROP.x, CROP.y, CROP.w, CROP.h, x2, ROW2 + 12, CROP.w * 2, CROP.h * 2);
  };
  draw(0);
  c.setAttribute('aria-label', `Demobat, ${o.name}: flap 1 to 4, glide, dive, stunned and hit at 4x, and a flock of six over the Blue storm street with Eddie at real size and at 2x`);
  return { canvas: c, draw, meta: `${colorsOf(o)} fill colors and the ink outline. The flat black oval under each bat is its shadow, drawn by the game, not part of the sprite.` };
}
