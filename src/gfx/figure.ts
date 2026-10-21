// The scare figure: the dark shape that crosses the trail in 1.1 while the lights stutter, walks the chamber behind the
// observation glass in 1.2 and passes behind the cafeteria counter in 1.3. It is the Demogorgon, seen three times before the
// fight in 1.3's gym, so it has no face: a walker in profile built from a few joints and a Shape, hunched forward on a long
// neck with the head low and ahead of the body, arms down to its knuckles, black with the far limbs in ink. world/render.ts
// draws it with its feet at the scare's position, facing the way the scare's path runs. Everything is fillRect through the
// canvas helpers, so a Node test can run it on the software canvas.
import type { Ctx } from './canvas.ts';
import { linepx, rect } from './canvas.ts';
import type { ColorName } from './palette.ts';
import type { ScareDef } from '../world/types.ts';

export interface Pt { x: number; y: number }

/** The proportions of a walker. Heights are px up from the feet, widths px across. */
export interface Shape {
  /** The hips' height off the floor and the torso's height from the hips to the shoulders. */
  legs: number; torso: number;
  /** The torso's width at the shoulders and at the hips, seen from the side. */
  shoulders: number; hips: number;
  /** How far forward of the hips the shoulders sit, and the head's base forward and up of the shoulders (up can be negative). */
  hunch: number; neck: readonly [number, number];
  /** The shut petal bud of the head, width and height, and how far its tip leans forward. Height 0 draws no head. */
  head: readonly [number, number]; tilt: number;
  /** The arms' reach straight down from the shoulder, how far forward both hands are held, and the claws' length and count. */
  arm: number; reach: number; claw: number; fingers: number;
  /** Half the stride in px, and the frames each of the walk's four phases lasts. */
  stride: number; step: number;
  /** The limbs' thickness, and the legs' when they differ. */
  s: number; ls?: number;
}

/** The joints a walker was drawn at. hands and feet are [near, far]. */
export interface Joints { hip: Pt; shoulder: Pt; head: Pt; crown: Pt; hands: [Pt, Pt]; feet: [Pt, Pt]; dir: number; phase: number }

/**
 * The Demogorgon as it stalks: the hips at a kid's shoulder, the torso leaning seven px forward, the head two px below the
 * shoulders on a long neck and tilted on, the hands on the ground ahead of the feet. 26 px tall and about 20 long.
 */
export const STALKER: Shape = { legs: 11, torso: 9, shoulders: 5, hips: 4, hunch: 7, neck: [6, -2], head: [6, 8], tilt: 4, arm: 17, reach: 2, claw: 3, fingers: 3, stride: 4, step: 5, s: 2 };

/** The way it walks: -1 toward the left, which every scare so far is. */
export function dirOf(s: ScareDef): number { return s.to.x < s.from.x ? -1 : 1; }

/** Feet to crown for a shape, standing. */
export function tallOf(sh: Shape): number { return sh.legs + sh.torso + sh.neck[1] + sh.head[1]; }

/** The figure with its feet at (x, y) in world px at frame t, facing along the scare's path. */
export function drawScareFigure(ctx: Ctx, x: number, y: number, t: number, scare: ScareDef): void {
  walker(ctx, x, y, t, STALKER, dirOf(scare), 'black', 'ink');
}

/** A limb stroked through its joint, s px thick. */
function limb(ctx: Ctx, a: Pt, b: Pt, c: Pt, col: ColorName, s: number): void {
  linepx(ctx, a.x, a.y, b.x, b.y, col, s);
  linepx(ctx, b.x, b.y, c.x, c.y, col, s);
}

/** The torso: one row per px from the shoulders down to the hips, its width and center easing between the two. */
function torso(ctx: Ctx, shoulder: Pt, hip: Pt, ws: number, wh: number, col: ColorName): void {
  const rows = hip.y - shoulder.y;
  for (let i = 0; i <= rows; i++) {
    const f = rows ? i / rows : 0;
    const w = Math.round(ws + (wh - ws) * f), cx = shoulder.x + (hip.x - shoulder.x) * f;
    rect(ctx, cx - w / 2, shoulder.y + i, w, 1, col);
  }
}

/**
 * The shut petal bud of the head: a teardrop h tall and w wide whose base sits on (x, y) and whose tip leans tilt px
 * toward dir. Widest a third of the way up, pointed at the top, and no face at all. seam draws the petals' seam up it.
 */
export function bud(ctx: Ctx, x: number, y: number, dir: number, w: number, h: number, tilt: number, col: ColorName, seam?: ColorName): void {
  for (let i = 0; i < h; i++) {
    const f = (i + 0.5) / h;
    const k = f < 0.35 ? Math.sqrt(f / 0.35) : Math.pow((1 - f) / 0.65, 0.7);
    // Seen from the front (no lean) the rows are odd widths, so the two sides match and the outline stays smooth.
    let ww = Math.max(i === h - 1 ? 1 : 2, Math.round(w * k));
    if (!dir && !(ww & 1)) ww += 1;
    const cx = x + dir * tilt * f, ry = y - 1 - i;
    rect(ctx, cx - ww / 2, ry, ww, 1, col);
    if (seam && i >= 2 && i < h - 2 && (i & 1)) rect(ctx, cx, ry, 1, 1, seam);
  }
}

/** The claws: n fingers fanned down from the hand at (x, y), len px long. A twitch moves every other one a px. */
function claw(ctx: Ctx, x: number, y: number, dir: number, len: number, n: number, twitch: boolean, col: ColorName): void {
  const fan: [number, number][] = [[0, 1], [dir * 0.6, 0.8], [-dir * 0.45, 0.9], [dir, 0.45], [-dir * 0.8, 0.6]];
  for (let i = 0; i < Math.min(n, fan.length); i++) {
    const [fx, fy] = fan[i] as [number, number];
    const tw = twitch && (i & 1) ? 1 : 0;
    linepx(ctx, x, y, x + fx * len + tw * dir, y + fy * len - tw, col, 1);
  }
}

/**
 * A walker in profile facing dir, its feet at (bx, by), at frame t: the far leg and arm in the far color, then the torso,
 * neck, head and the near leg and arm in the near color. Four phases: the near foot leads, the feet pass, the far foot
 * leads, the feet pass. The body rides a px higher on a pass and the arms swing against the legs. A negative t stands
 * still. Returns the joints.
 */
export function walker(ctx: Ctx, bx: number, by: number, t: number, sh: Shape, dir: number, near: ColorName, far: ColorName, twitch = false): Joints {
  // A negative t is standing still: the feet together, nothing lifted.
  const phase = t < 0 ? 1 : Math.floor(t / sh.step) & 3;
  const swing = (phase === 0 ? 1 : phase === 2 ? -1 : 0) * sh.stride;
  const pass = t < 0 ? 0 : phase & 1;
  const ls = sh.ls ?? sh.s;
  const hip: Pt = { x: bx, y: by - sh.legs - pass };
  const shoulder: Pt = { x: bx + dir * sh.hunch, y: hip.y - sh.torso };
  const head: Pt = { x: shoulder.x + dir * sh.neck[0], y: shoulder.y - sh.neck[1] };
  // On a pass the foot coming forward is off the floor: the far one after the near led, the near one after the far led.
  const feet: [Pt, Pt] = [{ x: bx + dir * swing, y: by }, { x: bx - dir * swing, y: by }];
  if (pass) (feet[phase === 1 ? 1 : 0] as Pt).y = by - 2;
  const knee = (f: Pt): Pt => ({ x: Math.round((hip.x + f.x) / 2 + dir * (f.y < by ? 2 : 1)), y: Math.round((hip.y + f.y) / 2) });
  const hand = (sw: number): Pt => ({ x: Math.round(shoulder.x + dir * (sh.reach + sw)), y: shoulder.y + sh.arm });
  const elbow = (h: Pt): Pt => ({ x: Math.round((shoulder.x + h.x) / 2 - dir), y: Math.round((shoulder.y + h.y) / 2) });
  const hands: [Pt, Pt] = [hand(-swing * 0.6), hand(swing * 0.6)];
  limb(ctx, hip, knee(feet[1]), feet[1], far, ls);
  limb(ctx, shoulder, elbow(hands[1]), hands[1], far, sh.s);
  claw(ctx, hands[1].x, hands[1].y + sh.s - 1, dir, sh.claw, sh.fingers, twitch, far);
  torso(ctx, shoulder, hip, sh.shoulders, sh.hips, near);
  limb(ctx, hip, knee(feet[0]), feet[0], near, ls);
  linepx(ctx, shoulder.x, shoulder.y, head.x, head.y, near, sh.s);
  if (sh.head[1] > 0) bud(ctx, head.x, head.y, dir, sh.head[0], sh.head[1], sh.tilt, near, far);
  limb(ctx, shoulder, elbow(hands[0]), hands[0], near, sh.s);
  claw(ctx, hands[0].x, hands[0].y + sh.s - 1, dir, sh.claw, sh.fingers, twitch, near);
  return { hip, shoulder, head, crown: { x: Math.round(head.x + dir * sh.tilt), y: head.y - sh.head[1] }, hands, feet, dir, phase };
}
