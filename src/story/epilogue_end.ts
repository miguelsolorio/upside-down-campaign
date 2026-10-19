// The chapter five epilogue (docs/level-16.md, "The ending"): the basement in 1987, the party round the table, Mike closing the
// campaign book. It plays `l16_basement` through the shared dialogue box over `ending`, the music that plays once, and its last
// beat is one die rolled across the table, landing as the music ends (the track's own last bar is that die). The room is the
// ending's still (gfx/ch5/finale_end.ts), so it hands over to THE END without a seam: both end on the same table with the die at rest.
// Skipping works as in the other epilogues: the story setting, the skip key and a click on the box's skip label. With the story off
// the scene is over at once and `ending` is left to THE END. Confirm during the wait for the last bar rolls the die now. Opaque.
// The clock and the die's path are in epilogue_end_logic.ts.
import type { Scene } from '../core/scene.ts';
import { skipsDialogue } from '../core/settings.ts';
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { labelOf } from '../core/bindings.ts';
import { ctx2d, makeCanvas } from '../gfx/canvas.ts';
import { endingStill } from '../gfx/ch5/finale_end.ts';
import { drawText } from '../gfx/index.ts';
import { audio } from '../audio/index.ts';
import { createDialogueBox } from '../ui/index.ts';
import { DIE_BONE, drawDie } from '../ui/die.ts';
import { blinkOn, box, inFrame } from '../ui/kit.ts';
import { PAL } from '../gfx/palette.ts';
import { SCRIPTS } from './scripts.ts';
import {
  BOUNCES, DIE_RADIUS, FADE_IN, FROM, HINT_AT, HOLD, ROLL_LEN, SETTLE, blackAt, dieAt, mayLeave, mayRoll, rollStartAt,
} from './epilogue_end_logic.ts';

export const BASEMENT_SCRIPT = 'l16_basement';

type Phase = 'fadeIn' | 'hold' | 'talk' | 'settle' | 'wait' | 'roll' | 'land';

let bare: { c: HTMLCanvasElement; key: string } | null = null;
/** The ending's room with the die gone from the table, for the moment it is in Will's hand. The table top is painted over where the
 * die and its shadow lie (x 144 to 153, y 114 to 125 in the set), with the one grain line that runs through it. */
function bareStill(screenW: number, frameX: number): HTMLCanvasElement {
  const key = `${screenW}:${frameX}`;
  if (bare?.key === key) return bare.c;
  const c = makeCanvas(screenW, SCREEN_H), x = ctx2d(c);
  x.drawImage(endingStill(screenW, frameX), 0, 0);
  x.fillStyle = PAL.soil3;
  x.fillRect(frameX + 144, 114, 10, 12);
  x.fillStyle = PAL.soil2;
  x.fillRect(frameX + 144, 124, 10, 1);
  bare = { c, key };
  return c;
}

export function createBasementEpilogue(opts: { onDone(): void }): Scene {
  const dialogue = createDialogueBox();
  const script = SCRIPTS[BASEMENT_SCRIPT];
  let phase: Phase = 'fadeIn';
  /** Frames in the phase, and since the music could first sound. */
  let t = 0;
  let since = 0;
  let talkDone = false;
  let finished = false;
  /** The player asked for the roll before the last bar. */
  let asked = false;
  /** The music's own last bar is carrying the die's sound, so the scene adds none. */
  let covered = false;
  const startAt = rollStartAt(audio.trackSeconds('ending'));

  const finish = (): void => { if (!finished) { finished = true; opts.onDone(); } };
  const go = (p: Phase): void => { phase = p; t = 0; };

  return {
    opaque: true,
    enter() {
      // With the story off, update() ends the scene at once and THE END plays `ending` itself.
      if (!script || skipsDialogue()) return;
      audio.music('ending');
      endingStill(SCREEN_W, FRAME_X);
      bareStill(SCREEN_W, FRAME_X);
    },
    update(g) {
      if (finished) return;
      g.input.offer('skip');
      if (!script || skipsDialogue() || g.input.pressed('skip') || dialogue.skipClicked(g)) { finish(); return; }
      t++;
      // The music's clock runs from when sound could first play, which is later than the scene if the browser held it back.
      const live = audio.ready();
      if (live) since++;
      switch (phase) {
        case 'fadeIn': if (t >= FADE_IN) go('hold'); break;
        case 'hold':
          if (t >= HOLD) { go('talk'); dialogue.start(script, () => { talkDone = true; }); }
          break;
        case 'talk':
          dialogue.update(g);
          if (talkDone) go('settle');
          break;
        case 'settle': if (t >= SETTLE) go('wait'); break;
        case 'wait':
          if (g.input.pressed('confirm') || g.input.clicked()) asked = true;
          if (mayRoll(since, startAt, live, audio.musicEnded(), asked)) {
            covered = !asked && live && !audio.musicEnded();
            go('roll');
          }
          break;
        case 'roll':
          if (!covered && BOUNCES.includes(t)) audio.sfx('roll');
          if (t >= ROLL_LEN) {
            if (!covered) audio.sfx('rollLand');
            go('land');
          }
          break;
        // A roll the player asked for early has no music ending to wait for: the music plays on under THE END.
        case 'land': if (mayLeave(t, live && !asked, audio.musicEnded())) finish(); break;
      }
    },
    draw(ctx) {
      ctx.imageSmoothingEnabled = false;
      const handed = phase === 'settle' || phase === 'wait' || phase === 'roll';
      ctx.drawImage(handed ? bareStill(SCREEN_W, FRAME_X) : endingStill(SCREEN_W, FRAME_X), 0, 0);
      if (handed) {
        inFrame(ctx, () => {
          const p = phase === 'roll' ? dieAt(t) : { x: FROM.x, y: FROM.y, lift: 0, angle: 0, squash: 1 };
          const x = Math.round(p.x), y = Math.round(p.y);
          box(ctx, x - 4 + (p.lift > 6 ? 1 : 0), y + DIE_RADIUS + 1, p.lift > 6 ? 7 : 9, 1, 'soil1');
          drawDie(ctx, x, y - p.lift, DIE_RADIUS, { scheme: DIE_BONE, angle: p.angle, squash: p.squash });
        });
      }
      dialogue.draw(ctx);
      if (phase === 'wait' && t >= HINT_AT && blinkOn(t, 100, 64)) {
        inFrame(ctx, () => drawText(ctx, `${labelOf('attack')} TO ROLL`, 128, 200, 'mist', { align: 'center', shadow: true }));
      }
      const black = phase === 'fadeIn' ? blackAt(t) : 0;
      if (black > 0) {
        ctx.globalAlpha = black;
        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.globalAlpha = 1;
      }
    },
  };
}
