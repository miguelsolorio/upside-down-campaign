// Two props wear a look of their own in stage 5.2, the Abyss (docs/level-15.md): Will's hidden bridge and the rock fall across the ring's way in. Both
// are ordinary props (`hidden`, `door`) that the other stages draw as corn and as the Lab's steel door, so drawProp asks drawAbyssProp first while the
// Abyss is the stage that is up (inAbyss in looks.ts, which the play scene tells whenever the stage changes).
//
// hidden: the bridge's tiles are a vine bridge under it; shut, the prop draws a veil of black over them that leaves one pixel in four, so the bridge
//   is only a faint ghost in the dark (and drifts a little, a pixel up and down, unless motion is reduced), and open it draws nothing, so the bridge shows.
// door: the rock fall, w by h px of grey boulders with the red of the void in their cracks; open (lifted) it is nothing but a few stones at the edges.
// Pure pixel work on a Px: no DOM until the art is cached.
import type { PropView } from '../core/types.ts';
import { createRng } from '../core/rng.ts';
import { BAYER4, hash2 } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ArtFn } from './props_lab2.ts';
import { Px } from './px.ts';

/** The veil: black on every pixel but the ones a 4 by 4 Bayer pattern leaves clear (about one in four), `phase` 0 or 1 sliding the pattern one row. */
export function veilArt(w: number, h: number, phase: number): Px {
  const px = new Px(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const b = ((BAYER4[(((y + phase) & 3) * 4) + (x & 3)] as number) + 0.5) / 16;
      if (b < 0.26) continue;
      px.set(x, y, hash2(x, y, 52) % 9 === 0 ? 'blood0' : 'black');
    }
  }
  return px;
}

/** One boulder: an ellipse of grey stone with a lit top left, a dark underside and a crack of red. */
function boulder(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  px.ellipse(cx, cy + 1, rx, ry, 'ink').ellipse(cx, cy, rx, ry, 'grey1').ellipse(cx - 1, cy - 1, rx - 1.5, ry - 1.5, 'grey2');
  px.ellipse(cx - rx / 3, cy - ry / 3, rx / 3, ry / 3, 'grey3');
  const x0 = Math.round(cx - rx / 2), y0 = Math.round(cy - ry / 2);
  px.set(x0 + 1, y0 + 2, 'blood1').set(x0 + 2, y0 + 3, 'red').set(x0 + 2, y0 + 4, 'blood1').set(x0 + 3, y0 + 5, 'blood0');
}

/** The rock fall, w by h px (16 by 48 across the ring's west tip): boulders heaped three deep, gravel between them, a glow of red in the gaps. */
export function rockFallArt(w: number, h: number, open: boolean): Px {
  const px = new Px(w, h);
  const r = createRng(hash2(w, h, 53));
  if (open) {
    // Lifted: the way is clear and a few stones lie along the edges.
    for (let i = 0; i < Math.max(4, h >> 3); i++) {
      const x = r() < 0.5 ? Math.floor(r() * 2) : w - 1 - Math.floor(r() * 2), y = Math.floor(r() * h);
      px.set(x, y, i & 1 ? 'grey2' : 'grey1');
    }
    return px;
  }
  px.rect(0, 2, w, h - 3, 'blood0');
  const rows = Math.max(2, Math.ceil(h / 14));
  for (let k = 0; k < rows; k++) {
    const cy = h - 6 - k * ((h - 12) / Math.max(1, rows - 1)) + (k & 1 ? -1 : 1);
    boulder(px, w / 2 + (k % 2 ? 2 : -2), cy, w / 2 - 1.2, 6.6);
    px.ellipse(w / 2 + (k % 2 ? -4 : 5), cy - 3, 3.6, 3, 'grey1').ellipse(w / 2 + (k % 2 ? -4.6 : 4.4), cy - 3.6, 2.2, 1.8, 'grey2');
  }
  px.scatter(r, 'grey2', 12, 0, 0, w, h).scatter(r, 'slate', 5, 0, 0, w, h).scatter(r, 'red', 4, 1, 4, w - 2, h - 6);
  return px;
}

/** Draws the Abyss's version of `v` if it has one. Returns false for every other prop, which the caller draws as it always did. */
export function drawAbyssProp(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  if (v.kind === 'hidden') {
    if (v.state === 'open') return true;
    const phase = calm ? 0 : (v.t >> 5) & 1;
    ctx.drawImage(art(`abyssveil${w}x${h}${phase}`, () => veilArt(w, h, phase)), x, y);
    return true;
  }
  if (v.kind === 'door') {
    const open = v.state === 'open';
    ctx.drawImage(art(`abyssrock${w}x${h}${open}`, () => rockFallArt(w, h, open)), x, y);
    return true;
  }
  return false;
}
