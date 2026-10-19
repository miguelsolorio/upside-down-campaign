// The Final Roll's finish card (docs/level-16.md, "The Final Roll"): what the dice stage shows once every hero has rolled. The plain
// finish is a line of text, the bigger one a larger line with sparks, and the gold one rays, sparkles and NAT 20. Drawn in frame
// px with the UI kit. Reduce flashing holds the rays still and the sparkles lit.
import { settings } from '../core/settings.ts';
import type { ColorName } from '../gfx/palette.ts';
import { drawText } from '../gfx/index.ts';
import { FINISH_NAMES } from './finalroll_logic.ts';
import type { Finish } from './finalroll_logic.ts';
import { bigText, box, clipped } from './kit.ts';
import type { Ctx } from './kit.ts';

/** The middle of the card, and the box the rays are held inside. */
export const CARD = { cx: 128, cy: 140, x: 12, y: 102, w: 232, h: 84 } as const;
const TAU = Math.PI * 2;

/** A plus-shaped sparkle of arm length `r`. */
function star(ctx: Ctx, x: number, y: number, r: number, c: ColorName): void {
  box(ctx, x - r, y, r * 2 + 1, 1, c);
  box(ctx, x, y - r, 1, r * 2 + 1, c);
}

/** Sparkles around the card, each on its own beat: lit for most of 48 frames, with a bigger flare for part of it. */
function sparkles(ctx: Ctx, t: number, spots: readonly (readonly [number, number])[], c: ColorName): void {
  spots.forEach(([x, y], i) => {
    const p = (t + i * 17) % 48;
    if (!settings.reduceFlashing && p > 34) return;
    star(ctx, x, y, !settings.reduceFlashing && p > 22 ? 3 : 2, c);
    if (p > 8 && p < 14) star(ctx, x, y, 1, 'white');
  });
}

/** Rays out of the middle that grow out over the first frames and turn slowly. */
function rays(ctx: Ctx, t: number): void {
  const reach = Math.min(120, t * 4);
  const spin = settings.reduceFlashing ? 0 : t * 0.006;
  clipped(ctx, CARD.x, CARD.y, CARD.w, CARD.h, () => {
    for (let i = 0; i < 14; i++) {
      const a = spin + (i * TAU) / 14;
      const dx = Math.cos(a), dy = Math.sin(a) * 0.8;
      const len = Math.min(reach, i & 1 ? 84 : 120);
      for (let r = 16; r < len; r += 2) {
        const c: ColorName = r < 44 ? 'cream' : r < 72 ? 'yellow' : r < 100 ? 'amber' : 'orange';
        box(ctx, CARD.cx + dx * r, CARD.cy + dy * r, 1 + (r >> 5), 1 + (r >> 5), c);
      }
    }
  });
}

/** The finish `t` frames in: its name, and the flourish that goes with its size. */
export function drawFinish(ctx: Ctx, finish: Finish, t: number): void {
  const name = FINISH_NAMES[finish];
  const { cx, cy } = CARD;
  if (finish === 'plain') {
    drawText(ctx, name, cx, cy - 4, 'white', { align: 'center', shadow: true });
    box(ctx, cx - Math.min(36, t), cy + 8, Math.min(72, t * 2), 1, 'mist');
    return;
  }
  if (finish === 'big') {
    sparkles(ctx, t, [[48, cy - 18], [208, cy - 14], [64, cy + 22], [196, cy + 24]], 'yellow');
    bigText(ctx, name, cx, cy - 10, 'yellow', 2, 'center', true);
    box(ctx, cx - Math.min(78, t * 2), cy + 12, Math.min(156, t * 4), 1, 'amber');
    return;
  }
  rays(ctx, t);
  sparkles(ctx, t, [[34, cy - 30], [222, cy - 26], [44, cy + 28], [212, cy + 30], [96, cy - 36], [160, cy + 36]], 'cream');
  // A plate behind the words so they read over the rays.
  box(ctx, 26, cy - 28, 204, 52, 'ink');
  box(ctx, 27, cy - 27, 202, 1, 'amber');
  box(ctx, 27, cy + 22, 202, 1, 'amber');
  bigText(ctx, 'NAT 20', cx, cy - 22, 'yellow', 3, 'center', true);
  bigText(ctx, name, cx, cy + 4, 'cream', 2, 'center', true);
}
