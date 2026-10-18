// THE END (docs/chapter-5.md, "The ending"): the basement again with the room dimmed and one die lit on the table, the title in the
// big pixel type over it (gfx/ch5/finale_end.ts does the drawing). It fades in, holds a moment, and then waits for confirm or a click
// before it fades out into the results. The epilogue's music, `ending`, is asked for here too: asking again while it plays changes
// nothing, and with the story off, where the epilogue was skipped, it plays out under the card. Opaque.
import type { Scene } from '../core/scene.ts';
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { labelOf } from '../core/bindings.ts';
import { audio } from '../audio/index.ts';
import { drawTheEnd } from '../gfx/ch5/finale_end.ts';
import { drawText } from '../gfx/index.ts';
import { clamp01 } from './format.ts';
import { blinkOn, box, inFrame } from './kit.ts';

/** The card fades up over this many frames, from the room at its brightest to the dimmed card. */
export const FADE_IN = 90;
/** Confirm does nothing before this many frames, so the press that ended the epilogue cannot dismiss the card. */
export const HOLD = 150;
/** After confirm the card fades to black over this many frames, then onDone runs. */
export const FADE_OUT = 36;

/** How far the dimming and the title are in at frame `t`, 0 to 1. */
export const levelAt = (t: number): number => clamp01(t / FADE_IN);
/** How black the card is `t` frames after confirm, 0 to 1. */
export const blackAfter = (t: number): number => clamp01(t / FADE_OUT);

export function createTheEndScene(opts: { onDone(): void }): Scene {
  let t = 0;
  /** Frames since confirm, or -1 while the card waits. */
  let leaving = -1;
  let finished = false;
  return {
    opaque: true,
    enter() { audio.music('ending'); },
    exit() { audio.music(null); },
    update(g) {
      t++;
      if (finished) return;
      if (leaving >= 0) {
        leaving++;
        if (leaving >= FADE_OUT) { finished = true; opts.onDone(); }
        return;
      }
      if (t >= HOLD && (g.input.pressed('confirm') || g.input.clicked())) leaving = 0;
    },
    draw(ctx) {
      drawTheEnd(ctx, SCREEN_W, FRAME_X, t, levelAt(t));
      if (t >= HOLD && leaving < 0 && blinkOn(t, 70, 46)) {
        inFrame(ctx, () => drawText(ctx, `PRESS ${labelOf('attack')}`, 128, 204, 'mist', { align: 'center', shadow: true }));
      }
      if (leaving >= 0) {
        ctx.globalAlpha = blackAfter(leaving);
        box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
        ctx.globalAlpha = 1;
      }
    },
  };
}
