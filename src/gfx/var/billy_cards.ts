// The cards of billy-variations.html: one canvas per design, with Billy at 4x on a dark ground. The top row is the walk (down, up, side,
// then a second side step) and Steve and Max beside him for scale; the second is the charge (the wind-up from the side and the front,
// the run), the grab, and the kneel: pinned, the veins fading, and freed and slumped with the veins gone and the color back. The third
// is the portrait: the thing Eleven finds, then the free man in the six expressions the dialogue box has. Under it the same sprites at
// 1x on a pale floor and on a dark one, which is the size the game shows them. The canvas carries everything, so it can be exported as
// one image. The designs are in billy.ts and the body in billy_body.ts.
import type { Expr } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { composeFrame } from '../actor_pose.ts';
import { MAX } from '../data/max.ts';
import { STEVE } from '../data/steve.ts';
import type { View } from '../data/types.ts';
import type { Px } from '../px.ts';
import { BPOSES, composeBilly } from './billy_body.ts';
import type { BPose } from './billy_body.ts';
import { BILLY_OPTS } from './billy.ts';
import type { BillyOpt } from './billy.ts';
import { flayedPortrait } from './billy_portrait.ts';
import { cardCanvas, fills, flat, label, paintRoles, zoom } from './kit.ts';
import { portrait } from './portrait.ts';

export { BILLY_OPTS } from './billy.ts';
export type { BillyOpt } from './billy.ts';

const K = 4, GAP = 8, SLOT = 24 * K + GAP;
export const CARD_W = GAP + 8 * SLOT;
const ROW = 24 * K + 20;
const STRIP = 3 * ROW + 12, STRIP_H = 32;
export const CARD_H = STRIP + 2 * STRIP_H + 6;

interface Frame { label: string; view: View; pose: BPose; keep: number; freed?: boolean }
const F = (label: string, view: View, pose: BPose, keep = 1, freed = false): Frame => ({ label, view, pose, keep, freed });
const ROW_A: Frame[] = [
  F('IDLE', 'down', BPOSES.idle), F('WALK DOWN', 'down', BPOSES.walkA), F('WALK UP', 'up', BPOSES.walkA), F('WALK SIDE', 'side', BPOSES.walkA), F('STEP SIDE', 'side', BPOSES.walkB),
];
const ROW_B: Frame[] = [
  F('WIND UP SIDE', 'side', BPOSES.charge), F('WIND UP FRONT', 'down', BPOSES.charge), F('RUN', 'side', BPOSES.run), F('GRAB SIDE', 'side', BPOSES.grab), F('GRAB FRONT', 'down', BPOSES.grab),
  F('PINNED', 'side', BPOSES.pinned), F('FADING', 'side', BPOSES.pinned, 0.5), F('FREED', 'side', BPOSES.freed, 0, true),
];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];

/** The palette of a design once the veins are gone: the skin warms back to a tan and nothing is left of the veins. */
function freedPal(o: BillyOpt): Record<string, ColorName> {
  const pal = { ...o.rig.pal }, skin = pal.s, shade = pal.d;
  for (const k of Object.keys(pal)) { if (pal[k] === skin) pal[k] = o.tan; else if (pal[k] === shade) pal[k] = 'skin2'; }
  pal.v = o.tan; pal.s = o.tan; pal.d = 'skin2';
  return pal;
}

/** A frame of a design, painted. */
export function billyPx(o: BillyOpt, fr: Frame): Px {
  return paintRoles(composeBilly(o.rig, fr.view, fr.pose, fr.keep), 24, fr.freed ? freedPal(o) : o.rig.pal);
}

/** Steve and Max, the game's own, facing the viewer: the scale for Billy. */
export function scalePair(): [Px, Px] {
  return [paintRoles(composeFrame(STEVE, 'down', 'idle', 0), 16, STEVE.pal), paintRoles(composeFrame(MAX, 'down', 'idle', 0), 16, MAX.pal)];
}

/** Number of fill colors a design's sprites use, not counting the ink outline. */
export function colorsOf(o: BillyOpt): number { return fills(...[...ROW_A, ...ROW_B].filter((fr) => !fr.freed).map((fr) => billyPx(o, fr))); }

/** One design's card canvas. */
export function billyCard(o: BillyOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  const strips: [number, 'bone' | 'shadow', string][] = [[STRIP, 'bone', 'DAY'], [STRIP + STRIP_H, 'shadow', 'DARK']];
  for (const [y, col] of strips) { g.fillStyle = PAL[col]; g.fillRect(0, y, CARD_W, STRIP_H); }
  const [steve, max] = scalePair();
  const idle = billyPx(o, ROW_A[0] as Frame);
  const one: { px: Px; dy: number }[] = [];
  const cell = (px: Px, name: string, col: number, row: number, hot = false): void => {
    const x = GAP + col * SLOT, y = 8 + row * ROW, small = px.w === 16;
    zoom(g, px, x + (small ? 4 * K : 0), y + (small ? 8 * K : 0), K);
    label(g, name, x + (24 * K - name.length * 6) / 2, y + 24 * K + 4, hot ? 'cream' : 'mist');
  };
  const frames = [...ROW_A, ...ROW_B];
  ROW_A.forEach((fr, i) => { const p = billyPx(o, fr); cell(p, fr.label, i, 0); });
  [[steve, 'STEVE'], [max, 'MAX'], [idle, 'BILLY']].forEach(([p, name], i) => cell(p as Px, name as string, 5 + i, 0, true));
  ROW_B.forEach((fr, i) => cell(billyPx(o, fr), fr.label, i, 1));
  const ports: [Px, string][] = [[flayedPortrait(o.portrait), 'FLAYED'], ...EXPRS.map((e) => [portrait(o.portrait, e), e.toUpperCase()] as [Px, string])];
  ports.forEach(([p, name], i) => cell(p, name, i, 2));
  label(g, 'FREE', GAP + 7 * SLOT + 8, 2 * ROW + 40, 'slate');
  label(g, 'SIX FACES', GAP + 7 * SLOT + 8, 2 * ROW + 51, 'slate');
  for (const fr of frames) one.push({ px: billyPx(o, fr), dy: 0 });
  one.push({ px: steve, dy: 8 }, { px: max, dy: 8 }, { px: idle, dy: 0 });
  const strip = [...one.map((s) => [s.px, s.dy] as [Px, number]), ...ports.map(([p]) => [p, 0] as [Px, number])];
  for (const [sy] of strips) strip.forEach(([p, dy], i) => flat(g, p, 34 + i * 27 + (i >= one.length ? 6 : 0), sy + 4 + dy));
  for (const [sy, , name] of strips) label(g, name, 4, sy + 13, sy === STRIP ? 'slate' : 'mist');
  c.setAttribute('data-snap', `billy-${o.slug}`);
  c.setAttribute('aria-label', `Flayed Billy, ${o.name}: a walk, the charge wind-up and run, the grab, the kneel pinned and freed, and portraits, with Steve and Max beside him for scale`);
  return c;
}
