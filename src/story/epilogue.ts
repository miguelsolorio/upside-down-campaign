// A chapter's epilogue: a short scene after the chapter's last clear, before its results (docs/level-9.md, "The chapter end").
// Chapter three's is Hopper's letter, read by Eleven in her room the morning after, among her moving boxes. The still is
// gfx/epilogue_room.ts: it fades in slowly, the night in its window paling toward sunrise while the letter plays line by line
// through the shared dialogue box, then fades out slowly. Like the prologue, the skip-story setting, the skip key and a click on
// the box's skip label skip it. No music. Opaque.
// Chapter four's is the party on a guardrail over Hawkins the night after the attic (gfx/epilogue_hill.ts): the same timeline, a night
// that goes from lights on to the army arriving, and the map's track, `hawkins`, for the length of it (docs/level-13.md).
// Chapter five's is the basement in 1987, with its own room, its music and a last die (epilogue_end.ts).
import type { Scene } from '../core/scene.ts';
import type { TrackId } from '../core/types.ts';
import { skipsDialogue } from '../core/settings.ts';
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { PAL } from '../gfx/palette.ts';
import { drawSideFade } from '../gfx/index.ts';
import { epilogueStill } from '../gfx/epilogue_room.ts';
import type { Sky } from '../gfx/epilogue_room.ts';
import { hillStill } from '../gfx/epilogue_hill.ts';
import { audio } from '../audio/index.ts';
import { createDialogueBox } from '../ui/index.ts';
import { SCRIPTS } from './scripts.ts';
import { createBasementEpilogue } from './epilogue_end.ts';

/** The script each chapter's epilogue plays. A chapter without one goes straight to its results. */
export const EPILOGUES: Record<number, string> = { 3: 'l9_letter', 4: 'l13_hill', 5: 'l16_basement' };

/** True when the chapter has an epilogue with words in it. */
export const hasEpilogue = (chapter: number): boolean => (SCRIPTS[EPILOGUES[chapter] ?? '']?.lines.length ?? 0) > 0;

// ---------------------------------------------------------------- timeline (frames at 60 Hz)
export type StepId = 'fadeIn' | 'hold' | 'talk' | 'rest' | 'fadeOut';
/** `len` is in frames. The letter's step has none: it lasts as long as the reading does. */
export interface Step { id: StepId; len: number }

/** A slow fade up from black, a beat of the room in silence, the letter, a beat, a slow fade down. */
export const STEPS: readonly Step[] = [
  { id: 'fadeIn', len: 120 },
  { id: 'hold', len: 40 },
  { id: 'talk', len: 0 },
  { id: 'rest', len: 50 },
  { id: 'fadeOut', len: 150 },
];

/** How black the screen is, 0 to 1, `t` frames into a step of `len` frames: down through the fade in, up through the fade out. */
export function blackAt(id: StepId, t: number, len: number): number {
  if (len <= 0) return id === 'fadeIn' ? 1 : 0;
  const u = Math.max(0, Math.min(1, t / len));
  return id === 'fadeIn' ? 1 - u : id === 'fadeOut' ? u : 0;
}

/** The night in the window, by frames since the scene began: dark with its last stars, then grey, then the first color. It never
 * goes back, and a reader who takes their time sees the sun come up. */
export const SKY_AT: readonly [number, number, number] = [0, 600, 1500];
export function skyAt(clock: number, at: readonly [number, number, number] = SKY_AT): Sky {
  return clock >= at[2] ? 2 : clock >= at[1] ? 1 : 0;
}

/** The hill road's night, on the same clock: lights on, then the lights going out, then the army at the Lab. */
export const HILL_AT: readonly [number, number, number] = [0, 420, 900];

/** What a chapter's scene is drawn over, when its stages change, and the track under it (none for the letter). */
interface Look { still(screenW: number, frameX: number, stage: Sky): HTMLCanvasElement; at: readonly [number, number, number]; music: TrackId | null }
const LOOKS: Record<number, Look> = {
  3: { still: epilogueStill, at: SKY_AT, music: null },
  4: { still: hillStill, at: HILL_AT, music: 'hawkins' },
};

export function createEpilogueScene(opts: { chapter: number; onDone(): void }): Scene {
  if (opts.chapter === 5) return createBasementEpilogue({ onDone: opts.onDone });
  const box = createDialogueBox();
  const script = SCRIPTS[EPILOGUES[opts.chapter] ?? ''];
  const look = LOOKS[opts.chapter] ?? (LOOKS[3] as Look);
  let idx = 0;
  /** Frames into the current step, and since the scene began. */
  let t = 0;
  let clock = 0;
  let talkDone = false;
  let finished = false;

  const finish = (): void => { if (!finished) { finished = true; opts.onDone(); } };
  function next(): void {
    idx++;
    t = 0;
    talkDone = false;
    const s: Step | undefined = STEPS[idx];
    if (!s) { finish(); return; }
    // The box may call back at once (an empty script), so only a flag is set here and update() moves on.
    if (s.id === 'talk' && script) box.start(script, () => { talkDone = true; });
  }

  return {
    opaque: true,
    enter() {
      if (!script || skipsDialogue()) { audio.music(null); return; }
      audio.music(look.music);
      // Every sky is drawn once now, under the black, so the dawn never hitches.
      for (const sky of [0, 1, 2] as const) look.still(SCREEN_W, FRAME_X, sky);
    },
    exit() {
      if (look.music) audio.music(null);
    },
    update(g) {
      if (finished) return;
      g.input.offer('skip');
      if (!script || skipsDialogue() || g.input.pressed('skip') || box.skipClicked(g)) { finish(); return; }
      clock++;
      const s: Step | undefined = STEPS[idx];
      if (!s) return;
      if (s.id === 'talk') {
        box.update(g);
        if (talkDone) next();
        return;
      }
      t++;
      if (t >= s.len) next();
    },
    draw(ctx) {
      const s: Step | undefined = STEPS[idx];
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(look.still(SCREEN_W, FRAME_X, skyAt(clock, look.at)), 0, 0);
      // On a wider screen, the room past the set falls away into the dark.
      drawSideFade(ctx, FRAME_X, FRAME_X + 256, 0, SCREEN_H);
      box.draw(ctx);
      const black = s ? blackAt(s.id, t, s.len) : 1;
      if (black > 0) {
        ctx.globalAlpha = Math.min(1, black);
        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.globalAlpha = 1;
      }
    },
  };
}
