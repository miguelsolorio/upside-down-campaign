// Lab props: the steel door (closed, open) and the wall console (dark, lit). Static art only; drawProp in props.ts
// rims it, caches it per size and state, and calls consoleLive for the blinking lamp and the scan line.
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { Px } from './px.ts';
import { transposed } from './tile_lab.ts';

/**
 * A blast door that fills its doorway, w by h px. Wider than tall it is drawn flat and slides left and right; taller
 * than wide it is the same door turned a quarter. Closed: two leaves meeting in a hazard seam under a striped header
 * with a red lamp. Open: the leaves are pulled back against the posts, the opening is empty, the lamp is green.
 */
export function doorArt(w: number, h: number, open: boolean): Px {
  const horiz = w >= h;
  const L = horiz ? w : h, T = horiz ? h : w;
  const d = new Px(L, T);
  const post = Math.max(2, Math.min(3, L >> 3));
  const head = Math.max(2, Math.min(4, T >> 2));
  const mid = L >> 1;
  const leafH = Math.max(1, T - 1 - head);
  for (let y = 0; y < head; y++) for (let x = 0; x < L; x++) d.set(x, y, ((x + y) & 7) < 4 ? 'yellow' : 'ink');
  d.rect(mid - 2, 0, 4, head, 'ink').rect(mid - 1, head > 2 ? 1 : 0, 2, Math.max(1, head - 2), open ? 'leaf' : 'hot');
  if (open) d.set(mid - 1, head > 2 ? 1 : 0, 'cream');
  d.rect(0, head, post, T - head, 'grey1').rect(0, head, 1, T - head, 'grey3');
  d.rect(L - post, head, post, T - head, 'grey1').rect(L - 1, head, 1, T - head, 'ink').rect(L - post, head, 1, T - head, 'grey2');
  if (open) {
    const s = Math.max(2, Math.min(4, (L - 2 * post) >> 2));
    for (const x0 of [post, L - post - s]) {
      d.rect(x0, head, s, leafH, 'grey2').rect(x0, head, s, 1, 'grey3');
      const edge = x0 === post ? x0 + s - 1 : x0;
      for (let y = head; y < head + leafH; y++) d.set(edge, y, (y & 3) < 2 ? 'yellow' : 'ink');
    }
    return horiz ? d : transposed(d);
  }
  const lw = mid - post;
  for (const lx of [post, mid]) {
    const lw2 = lx === post ? lw : L - post - mid;
    d.rect(lx, head, lw2, leafH, 'grey3').rect(lx, head, lw2, 1, 'bone').rect(lx, head + leafH - 1, lw2, 1, 'grey2');
    if (lw2 > 6 && leafH > 5) {
      d.rect(lx + 1, head + 2, lw2 - 5, leafH - 4, 'grey2').rect(lx + 1, head + 2, lw2 - 5, 1, 'mist');
      d.rect(lx + 2, head + 3, lw2 - 7, Math.max(1, leafH - 6), 'grey3');
    }
    const hx = lx === post ? mid - 3 : mid + 1;
    for (let y = head; y < head + leafH; y++) for (let k = 0; k < 2; k++) d.set(hx + k, y, ((y + k) & 3) < 2 ? 'yellow' : 'ink');
  }
  d.rect(mid - 1, head, 2, leafH, 'ink');
  d.rect(post, T - 1, L - 2 * post, 1, 'grey1');
  d.set(post + 1, head + 1, 'white');
  return horiz ? d : transposed(d);
}

/**
 * A control console, 16 by 16: a housing with a screen on top and a key deck below. Dark: a dead screen and a red
 * lamp. Lit: a teal screen with lines of text, a green lamp and an amber key. Both are shots or burns away.
 */
export function consoleArt(lit: boolean): Px {
  const p = new Px(16, 16);
  p.rect(1, 1, 14, 10, 'grey1').rect(1, 1, 14, 1, 'grey3').rect(1, 1, 1, 10, 'grey2').rect(14, 1, 1, 10, 'ink');
  p.rect(2, 2, 12, 8, 'ink');
  if (lit) {
    p.rect(3, 3, 10, 6, 'teal1').rect(3, 3, 10, 1, 'cyan');
    p.rect(4, 5, 5, 1, 'cyan').rect(4, 6, 3, 1, 'leaf').rect(8, 6, 4, 1, 'cyan').rect(4, 7, 7, 1, 'cyan').rect(10, 5, 2, 1, 'leaf');
    p.set(12, 8, 'white');
  } else {
    p.rect(3, 3, 10, 6, 'night').rect(3, 3, 10, 1, 'teal0');
    p.set(4, 4, 'dusk').set(5, 5, 'dusk').set(6, 6, 'shadow').rect(4, 7, 3, 1, 'teal0');
  }
  p.rect(0, 11, 16, 4, 'grey2').rect(0, 11, 16, 1, 'grey3').rect(0, 14, 16, 1, 'grey1');
  p.rect(2, 12, 10, 2, 'grey1');
  for (let x = 3; x < 11; x += 2) p.set(x, 12, lit ? 'bone' : 'grey2');
  if (lit) p.set(9, 12, 'amber');
  p.rect(12, 12, 2, 2, lit ? 'leaf' : 'blood1');
  if (lit) p.set(12, 12, 'cream');
  p.rect(1, 15, 3, 1, 'ink').rect(12, 15, 3, 1, 'ink');
  return p;
}

/**
 * The live part of a console, drawn over the static art. x and y are the top-left of its 16 by 16 body. A dark
 * console blinks its lamp; a lit one sweeps a scan line down the screen and flashes once when it is first lit.
 * Reduce-flashing holds the lamp on and drops the sweep and the flash.
 */
export function consoleLive(ctx: Ctx, lit: boolean, x: number, y: number, t: number, calm: boolean): void {
  if (!lit) {
    if (calm || ((t >> 4) & 1) === 1) rect(ctx, x + 12, y + 12, 2, 2, 'hot');
    return;
  }
  if (calm) return;
  rect(ctx, x + 3, y + 3 + ((t >> 2) % 5), 10, 1, 'sky');
  if (t < 14 && ((t >> 1) & 1) === 0) {
    rect(ctx, x + 2, y + 2, 12, 1, 'white');
    rect(ctx, x + 2, y + 9, 12, 1, 'white');
    rect(ctx, x + 2, y + 2, 1, 8, 'white');
    rect(ctx, x + 13, y + 2, 1, 8, 'white');
  }
}
