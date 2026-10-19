// The final boss's art (stage 5.3): everything that is drawn for Vecna inside the Mind Flayer, behind one file.
//   The spider: 3.3's Mind Flayer (actor_flayer.ts), unchanged, with a hatch cut in the middle of its abdomen and Vecna inside it.
//     drawFinaleSpider(ctx, v, open) draws the body as drawFlayer does and the chest over it; the four legs are drawFlayerLeg's, as before.
//     Shut, the hatch is two flaps of raw meat clamped with bone, ringed with bone teeth, and a seam of amber light runs down it where
//     Vecna's glow leaks out. Open, the flaps are peeled back to either side, the ring's teeth bare, and in the hole sits Vecna, ash grey
//     in his Rooted body with his tendrils writhing, eyes white hot, against a furnace of red, the rim burning amber.
//   Vecna in the fast phase: idle, walk, the clock curse, and the sink into the floor (finale_vecna.ts).
//   Joyce with her axe, in a 16 by 16 hero cell like the others and a swing (finale_joyce.ts).
// v.pose 'rise' and 'down' and a dead body are drawn as drawFlayer draws them, and the chest follows the body in. The chest takes a flag for
// open; the sim can send it on any field (`petals` is the one the Demogorgon's head uses, and the default here). Pure pixel work.
import type { ActorView } from '../../core/types.ts';
import { FLAYER_H, FLAYER_RISE, drawFlayer } from '../actor_flayer.ts';
import { frameFor } from '../actor_kit.ts';
import type { Frame } from '../actor_kit.ts';
import { BAYER4 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { POSES, TOP } from '../var/vecna_kit.ts';
import { VECNA_SCARY } from '../var/vecna_scary.ts';

export { drawFlayerLeg as drawFinaleLeg } from '../actor_flayer.ts';
export { FAST_H, FAST_W, SINK_FRAMES, drawFinaleVecna, fastPoseOf, vecnaFastPx } from './finale_vecna.ts';
export type { VecnaFast } from './finale_vecna.ts';
export { JOYCE_AXE, JOYCE_H, JOYCE_W, drawJoyce, joycePx } from './finale_joyce.ts';
export type { JoycePose } from './finale_joyce.ts';

/** The chest's cell, and its center in the cell. The center sits 19 px above the body's feet line, on the abdomen's middle; the cell leaves 6 px round the ring for the light an open chest spills. */
export const CHEST_W = 52, CHEST_H = 44;
const CX = 26, CY = 22;
const UP = 19;
const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;
const rooted = VECNA_SCARY.find((o) => o.slug === 'rooted') as (typeof VECNA_SCARY)[number];

/** How far into an ellipse of radii (rx, ry) at the chest's center a pixel is: under 1 is inside. */
const rr = (x: number, y: number, rx: number, ry: number): number => ((x + 0.5 - CX) / rx) ** 2 + ((y + 0.5 - CY) / ry) ** 2;

/** The ring of the hatch: a band of bone lit on its upper left, shaded on its lower right, and 14 teeth of bone round the outside. */
function ring(px: Px, glow: boolean): void {
  for (let y = 0; y < CHEST_H; y++) {
    for (let x = 0; x < CHEST_W; x++) {
      const r = rr(x, y, 20, 16);
      if (r > 1.08) continue;
      if (r > 0.98) px.set(x, y, 'ink');
      else if (r > 0.74) px.set(x, y, x + y < CX + CY - 4 ? 'cream' : x + y > CX + CY + 6 ? 'grey2' : 'bone');
    }
  }
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.2, c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 3; i++) {
      const x = Math.round(CX + c * (19.5 + i) - 0.5), y = Math.round(CY + s * (15.5 + i) - 0.5);
      if (x >= 0 && y >= 0 && x < CHEST_W && y < CHEST_H) px.set(x, y, i === 2 ? 'ink' : 'bone');
    }
  }
  if (glow) for (let y = 0; y < CHEST_H; y++) for (let x = 0; x < CHEST_W; x++) { const r = rr(x, y, 20, 16); if (r > 0.68 && r <= 0.74) px.set(x, y, 'amber'); }
}

/** The chest shut: two flaps of meat in ridges that curve like the abdomen's, a seam between them with amber light in it, three bone clasps across it. */
function shut(px: Px, phase: number): void {
  ring(px, false);
  for (let y = 0; y < CHEST_H; y++) {
    for (let x = 0; x < CHEST_W; x++) {
      const r = rr(x, y, 20, 16);
      if (r > 0.74) continue;
      const dx = x - CX + 0.5;
      px.set(x, y, Math.abs(dx) < 3 ? 'blood0' : dx < 0 ? 'blood1' : 'red');
      for (const y0 of [-9, -4, 1, 6, 11]) {
        const ry = CY + y0 + Math.round((dx * dx) / 36);
        if (y === ry) px.set(x, y, 'blood0'); else if (y === ry - 1 && Math.abs(dx) > 3) px.set(x, y, dx < 0 ? 'red' : 'rose');
      }
    }
  }
  // The seam: black, with light in it that crawls down it, and a spill of amber on the meat beside it.
  for (let y = 3; y < CHEST_H - 3; y++) {
    if (rr(CX, y, 20, 16) > 0.7) continue;
    px.set(CX - 1, y, 'ink').set(CX, y, 'ink');
    const on = (y + phase * 2) % 6 < 3;
    if (on) { px.set(CX - 1, y, y % 2 ? 'yellow' : 'amber'); px.set(CX, y, 'amber'); }
    if (on && (y & 1) === 0) { px.set(CX - 3, y, 'orange'); px.set(CX + 2, y, 'orange'); }
  }
  for (const y0 of [-9, 0, 9]) {
    const y = CY + y0;
    px.rect(CX - 5, y, 10, 3, 'bone').rect(CX - 5, y + 2, 10, 1, 'grey2').rect(CX - 5, y, 10, 1, 'cream').rect(CX - 1, y, 2, 3, 'ink');
  }
}

const GLOW: ColorName[] = ['blood0', 'blood1', 'red', 'hot'];

/** The cavity behind Vecna: a furnace glow, dark red at the rim and hot behind his head, stepped in dither. */
function cavity(px: Px, phase: number): void {
  for (let y = 0; y < CHEST_H; y++) {
    for (let x = 0; x < CHEST_W; x++) {
      const r = rr(x, y, 17, 13);
      if (r > 1) continue;
      const d = Math.hypot(x + 0.5 - CX, (y + 0.5 - (CY - 4)) * 1.1) / 23, f = Math.max(0, 1 - d * 0.8) * (0.94 + 0.06 * (phase & 1)) * 3.4, lo = Math.floor(f);
      px.set(x, y, GLOW[Math.min(3, lo + (f - lo > bayer(x, y) ? 1 : 0))] as ColorName);
    }
  }
}

/** Vecna from the chest up, the Rooted body, set in the cavity and clipped to it, with his eyes burning. */
function bust(px: Px, phase: number): void {
  const body = rooted.draw('stand', phase), dx = CX - 18, dy = CY - 5 - (POSES.stand.head[1] + 2 + TOP);
  const clipped = new Px(CHEST_W, CHEST_H);
  clipped.blit(body, dx, dy);
  for (let y = 0; y < CHEST_H; y++) for (let x = 0; x < CHEST_W; x++) if (rr(x, y, 17, 13) > 1) clipped.d[y * CHEST_W + x] = 0;
  px.blit(clipped, 0, 0);
  const ex = CX, ey = CY - 5;
  px.set(ex - 3, ey, 'hot').set(ex - 2, ey, 'white').set(ex + 1, ey, 'white').set(ex + 2, ey, 'hot');
}

/** The flaps, peeled back to either side of the hole: lobes of raw meat lit on their outer edge. */
function flaps(px: Px): void {
  for (const s of [-1, 1]) {
    const cx = CX + s * 15.5;
    for (let y = 0; y < CHEST_H; y++) {
      for (let x = 0; x < CHEST_W; x++) {
        const a = (x + 0.5 - cx) / 3.4, b = (y + 0.5 - CY) / 9, r = a * a + b * b;
        if (r > 1 || rr(x, y, 20, 16) > 0.94) continue;
        const outer = (x + 0.5 - cx) * s > 1.6, inner = (x + 0.5 - cx) * s < -2.2;
        px.set(x, y, r > 0.72 ? 'ink' : outer ? 'pink' : inner ? 'blood1' : y < CY ? 'rose' : 'red');
      }
    }
  }
}

/** The chest, shut or open. phase 0 to 7 moves the light in the seam and the tendrils round Vecna. */
export function vecnaChestPx(open: boolean, phase = 0): Px {
  const px = new Px(CHEST_W, CHEST_H);
  if (!open) { shut(px, phase); return px; }
  ring(px, true);
  cavity(px, phase);
  bust(px, phase);
  flaps(px);
  // The rim of the hole burns, amber and yellow, and light spills out over the meat round the ring.
  for (let y = 0; y < CHEST_H; y++) {
    for (let x = 0; x < CHEST_W; x++) {
      const r = rr(x, y, 17, 13), o = rr(x, y, 20, 16);
      if (r > 0.9 && r <= 1 && !px.get(x, y)) px.set(x, y, (x + y + phase) & 2 ? 'yellow' : 'amber');
      else if (o > 1.1 && o < 1.6 && !px.get(x, y) && bayer(x, y) < (1.6 - o) * 0.5) px.set(x, y, o < 1.3 ? 'amber' : 'orange');
    }
  }
  return px;
}

const frames = new Map<string, Frame>();
const bases = new Map<string, Px>();

/** Draws the chest over a Mind Flayer body at the view's feet, following the body down from the skylight; nothing when the head is down or the body is dead. */
export function drawVecnaChest(ctx: Ctx, v: ActorView, open = v.petals === true): void {
  if (v.blink || v.pose === 'down' || v.anim === 'ko') return;
  const cx = Math.round(v.x), cy = Math.round(v.y);
  const dy = v.pose === 'rise' ? -Math.round((1 - Math.max(0, Math.min(1, v.t / FLAYER_RISE))) ** 2 * (FLAYER_H + 8)) : 0;
  const phase = (v.t >> 3) & 7, key = `${open ? 1 : 0}${phase}`;
  let src = bases.get(key);
  if (!src) { src = vecnaChestPx(open, phase); bases.set(key, src); }
  ctx.drawImage(frameFor(frames, key, src, v).img, cx - CX, cy - UP - CY + dy);
}

/** The Mind Flayer's body with Vecna in its chest: drawFlayer, then the chest, shut or open. Feet at v.x, v.y. */
export function drawFinaleSpider(ctx: Ctx, v: ActorView, open = v.petals === true): void {
  drawFlayer(ctx, v);
  drawVecnaChest(ctx, v, open);
}

export type { ColorName };
