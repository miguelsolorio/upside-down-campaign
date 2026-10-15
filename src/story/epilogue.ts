// A chapter's epilogue: a short scene after the chapter's last clear, before its results (docs/level-9.md, "The chapter end").
// Chapter three's is Hopper's letter, read by Eleven. A stand-in until UI and Art dress it: the dark, the script in the shared
// dialogue box, a fade out. Like the prologue, the skip-story setting and the skip key skip it. No music. Opaque.
import type { Scene } from '../core/scene.ts';
import { skipsDialogue } from '../core/settings.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { PAL } from '../gfx/palette.ts';
import { audio } from '../audio/index.ts';
import { createDialogueBox } from '../ui/index.ts';
import { SCRIPTS } from './scripts.ts';

/** The script each chapter's epilogue plays. A chapter without one goes straight to its results. */
export const EPILOGUES: Record<number, string> = { 3: 'l9_letter' };

/** True when the chapter has an epilogue with words in it. */
export const hasEpilogue = (chapter: number): boolean => (SCRIPTS[EPILOGUES[chapter] ?? '']?.lines.length ?? 0) > 0;

const FADE_IN = 50;
const FADE_OUT = 70;

export function createEpilogueScene(opts: { chapter: number; onDone(): void }): Scene {
  const box = createDialogueBox();
  const script = SCRIPTS[EPILOGUES[opts.chapter] ?? ''];
  let phase: 'in' | 'talk' | 'out' = 'in';
  let t = 0;
  let finished = false;
  const finish = (): void => { if (!finished) { finished = true; opts.onDone(); } };

  return {
    opaque: true,
    enter() { audio.music(null); },
    update(g) {
      if (finished) return;
      g.input.offer('skip');
      if (!script || skipsDialogue() || g.input.pressed('skip') || box.skipClicked(g)) { finish(); return; }
      t++;
      if (phase === 'in' && t >= FADE_IN) { phase = 'talk'; t = 0; box.start(script, () => { phase = 'out'; t = 0; }); }
      else if (phase === 'talk') box.update(g);
      else if (phase === 'out' && t >= FADE_OUT) finish();
    },
    draw(ctx) {
      ctx.fillStyle = PAL.night;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      box.draw(ctx);
      const black = phase === 'in' ? 1 - t / FADE_IN : phase === 'out' ? t / FADE_OUT : 0;
      if (black > 0) {
        ctx.globalAlpha = Math.min(1, black);
        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.globalAlpha = 1;
      }
    },
  };
}
