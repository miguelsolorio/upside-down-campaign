// The heart's marks and its glow (stage 5.3). The channel marks are the two sigils on the arena floor where Eleven and Will stand to
// channel: a dais of dark stone cut into the flesh with a glowing ring, runes round it and a glyph inside, 32 by 32 on 2 by 2 tiles,
// squashed to the floor's slant. Eleven's is hot red and pink (a triangle over her three bars); Will's is cool blue (a diamond round an
// eye), so the pair reads at a glance and each hero finds their own. Unlit they are dim and still, lit (while the channel runs) the ring
// and glyph flare, the dais fills with light and the runes chase round it. channelMark builds the pixels, drawChannelMark places them
// like an actor, feet at the center. drawHeartGlow is the pulsing red over the whole arena: a dithered glow round the middle that
// swells twice a beat, lub and dub, and a dark vignette in the corners that closes in with it. Drawn after the tiles and before
// the sprites, as glow.ts's pools are. Reduce flashing holds it at one calm step. Pure pixel work, canvases built on first use.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { settings } from '../../core/settings.ts';
import { BAYER4 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

export type MarkOf = 'eleven' | 'will';

interface Look { dim: ColorName; ring: ColorName; bright: ColorName; hot: ColorName; floor: ColorName; glyph: ColorName }
const LOOKS: Record<MarkOf, { off: Look; on: Look }> = {
  eleven: {
    off: { dim: 'blood1', ring: 'hot', bright: 'rose', hot: 'pink', floor: 'ink', glyph: 'red' },
    on: { dim: 'red', ring: 'hot', bright: 'pink', hot: 'white', floor: 'blood1', glyph: 'pink' },
  },
  will: {
    off: { dim: 'teal0', ring: 'sky', bright: 'cyan', hot: 'white', floor: 'ink', glyph: 'blue' },
    on: { dim: 'teal1', ring: 'sky', bright: 'cyan', hot: 'white', floor: 'teal0', glyph: 'cyan' },
  },
};

const CX = 16, CY = 16, RX = 15, RY = 12;
const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;

/** The mark for one hero. phase 0 to 3 turns the runes and swells the glow; lit is true while the channel runs. */
export function channelMark(who: MarkOf, phase = 0, lit = false): Px {
  const L = LOOKS[who][lit ? 'on' : 'off'], px = new Px(32, 32), p = phase & 3;
  const ellipse = (x: number, y: number): number => ((x + 0.5 - CX) / RX) ** 2 + ((y + 0.5 - CY) / RY) ** 2;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const r = ellipse(x, y);
      if (r > 1.0) continue;
      if (r > 0.9) px.set(x, y, 'ink');
      else if (r > 0.66) px.set(x, y, r > 0.8 ? L.ring : L.dim);
      else {
        px.set(x, y, 'ink');
        if (r < 0.62) px.set(x, y, L.floor);
        if (lit && bayer(x, y) < (1 - r / 0.62) * (0.5 + 0.12 * p)) px.set(x, y, L.dim);
      }
    }
  }
  // The runes: eight notches round the ring, bright ones chasing round when lit, a dim one in each gap.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, x = Math.round(CX + Math.cos(a) * (RX - 3.2) - 0.5), y = Math.round(CY + Math.sin(a) * (RY - 2.6) - 0.5);
    const on = lit ? (k + p) % 4 === 0 : k % 2 === 0;
    px.set(x, y, on ? L.hot : L.bright).set(x + (Math.cos(a) > 0.3 ? 1 : Math.cos(a) < -0.3 ? -1 : 0), y + (Math.sin(a) > 0.3 ? 1 : Math.sin(a) < -0.3 ? -1 : 0), on ? L.bright : L.dim);
  }
  // The glyph, inside the ring and mostly clear of the hero's feet: a triangle and three bars for Eleven, a diamond round an eye for Will.
  if (who === 'eleven') {
    const top: [number, number] = [CX, 6], l: [number, number] = [CX - 9, 20], r: [number, number] = [CX + 9, 20];
    px.line(top[0], top[1], l[0], l[1], L.glyph).line(top[0], top[1], r[0], r[1], L.glyph).line(l[0], l[1], r[0], r[1], L.glyph);
    px.set(CX, 6, L.hot);
    for (const bx of [-3, 0, 3]) px.rect(CX + bx - 0, 12, 1, 5, L.hot).set(CX + bx, 11, L.bright);
    px.set(CX - 9, 20, L.bright).set(CX + 9, 20, L.bright);
  } else {
    px.line(CX, 5, CX + 10, CY, L.glyph).line(CX + 10, CY, CX, 27, L.glyph).line(CX, 27, CX - 10, CY, L.glyph).line(CX - 10, CY, CX, 5, L.glyph);
    px.ellipse(CX, CY, 5, 2.6, L.bright).ellipse(CX, CY, 3.6, 1.6, L.floor).set(CX, CY, L.hot).set(CX - 1, CY, L.hot);
    px.set(CX, 5, L.hot).set(CX, 27, L.bright).set(CX + 10, CY, L.bright).set(CX - 10, CY, L.bright);
  }
  return px;
}

const marks = new Map<string, HTMLCanvasElement>();

/** Draws a mark centered on (cx, cy), the point a hero's feet rest on. t drives the pulse; lit is true while the channel runs. */
export function drawChannelMark(ctx: Ctx, who: MarkOf, cx: number, cy: number, t: number, lit: boolean): void {
  const phase = settings.reduceFlashing ? 0 : (t >> 4) & 3, key = `${who}${lit ? 1 : 0}${phase}`;
  let c = marks.get(key);
  if (!c) { c = channelMark(who, phase, lit).toCanvas(); marks.set(key, c); }
  ctx.drawImage(c, Math.round(cx) - CX, Math.round(cy) - CY);
}

// ---------------------------------------------------------------- the glow
const BEAT = 60;
/** The heart's swell at frame t, 0 to 3: a lub at the start of each beat and a smaller dub a few frames after. */
export function heartStep(t: number): number {
  const f = ((t % BEAT) + BEAT) % BEAT, tri = (at: number, w: number): number => Math.max(0, 1 - Math.abs(f - at) / w);
  return Math.min(3, Math.round(Math.max(tri(3, 7), 0.7 * tri(17, 6)) * 3));
}

const W = 384, H = 336, R = 124;
const layers: (HTMLCanvasElement | undefined)[] = [];

/** One step of the glow: red dither thick round the middle and thinning to nothing at R, and a dark vignette that begins past R and closes in a little on each step. */
function layer(step: number): HTMLCanvasElement {
  let c = layers[step];
  if (c) return c;
  const px = new Px(W, H), gain = 0.02 + 0.03 * step, reach = 1 - step * 0.02;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - W / 2, (y + 0.5 - H / 2) * 1.08) / R, b = bayer(x, y);
      if (d < 1) {
        const f = (1 - d) ** 1.8 * gain * 2.4;
        if (b < f * 0.4) px.set(x, y, 'red'); else if (b < f) px.set(x, y, 'blood1');
      } else {
        const v = Math.min(0.9, (d - reach * 0.95) * 0.8);
        if (v > 0 && b < v) px.set(x, y, v > 0.6 && b < v - 0.5 ? 'black' : 'ink');
      }
    }
  }
  c = px.toCanvas();
  layers[step] = c;
  return c;
}

/** Draws the pulsing glow over the arena, centered on (cx, cy) in screen px. level 0 to 1 fades it in or out in steps. */
export function drawHeartGlow(ctx: Ctx, t: number, cx = SCREEN_W / 2, cy = SCREEN_H / 2, level = 1): void {
  if (level <= 0) return;
  const step = settings.reduceFlashing ? 1 : Math.min(heartStep(t), Math.ceil(level * 3));
  ctx.drawImage(layer(step), Math.round(cx - W / 2), Math.round(cy - H / 2));
}
