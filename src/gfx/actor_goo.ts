// The Flayed's goo and the swirl of a confused enemy (docs/level-7.md). A dormant Flayed is a puddle of the goo the mall's floor is
// stained with, purple with a dark rim, a bubble that rises and pops; when its group wakes it comes up out of it in 40 frames, the head
// first, with the puddle still round its feet. A confused enemy has a small swirl of cold sparks turning over its head. The puddle is
// built as pixels (Node can run it); drawing it is canvas work. No alpha: every pixel is a palette color.
import { Px } from './px.ts';
import { rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import type { ColorName } from './palette.ts';

export const PUDDLE_W = 16, PUDDLE_H = 8;
/** Frames a Flayed takes to rise (enemies/flayed.ts, `rise` in ENEMY_DEFS). */
export const RISE_FRAMES = 40;

/** One of two looks of the puddle: round, then a size wider, with a bubble in a different place. */
export function puddlePx(step: number): Px {
  const p = new Px(PUDDLE_W, PUDDLE_H);
  const wide = step & 1;
  p.ellipse(8, 4.2, wide ? 7.5 : 6.5, wide ? 3.6 : 3.2, 'ink');
  p.ellipse(8, 4, wide ? 6.5 : 5.5, wide ? 2.8 : 2.4, 'purple');
  p.ellipse(7, 3.6, wide ? 4 : 3.2, 1.4, 'magenta');
  p.set(5 + (step & 3), 3, 'white').set(10 - (step & 1) * 3, 5, 'purple0');
  return p;
}

/** Which of the puddle's two looks a frame shows: it breathes every 24 ticks. */
export const puddleStep = (t: number): number => ((t / 24) | 0) & 3;

/** The swirl over a confused head: five sparks on a squashed ring that turns, bright at the head of the turn and fading behind it. */
export function swirl(ctx: Ctx, cx: number, cy: number, t: number): void {
  const cols: ColorName[] = ['white', 'cyan', 'sky', 'blue', 'blue'];
  for (let i = 0; i < 5; i++) {
    const a = t * 0.22 - i * 0.55;
    rect(ctx, cx + Math.round(Math.cos(a) * 4), cy + Math.round(Math.sin(a) * 1.6), 1 + (i === 0 ? 1 : 0), 1, cols[i] as ColorName);
  }
}
