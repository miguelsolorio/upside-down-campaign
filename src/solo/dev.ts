// ?solo=1: the Hellfire solo on its own, for trying it by hand with the keyboard, a pad or the touch controls. A stand-in
// stage behind the highway (the trailer roof, Eddie, the sound ring and the demobats, from the variation sheet), a title that
// picks the rooftop song (Attack) or the 6 s riff (Special), and a results card to play again from. With ?bot=1 a bot plays it.
// Loaded on demand from main.ts, so none of this art or this scene is in the game's own bundle path.
import type { Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { labelOf } from '../core/bindings.ts';
import { audio } from '../audio/index.ts';
import { rect } from '../gfx/canvas.ts';
import { drawText } from '../gfx/font.ts';
import { backdrop } from '../gfx/var/solo_kit.ts';
import { bigText, blinkOn, inFrame } from '../ui/kit.ts';
import { botInput, createSoloBot } from './bot.ts';
import type { SoloBot } from './bot.ts';
import { riff, rooftop } from './chart.ts';
import type { Chart } from './chart.ts';
import { createSolo } from './index.ts';
import type { Solo } from './index.ts';
import { ringRadius } from './judge.ts';

type State = 'title' | 'play' | 'results';

const stage = new Map<number, HTMLCanvasElement>();
/** The stand-in stage with the sound ring at a radius, drawn once for each. */
function stageAt(radius: number): HTMLCanvasElement {
  let c = stage.get(radius);
  if (!c) { c = backdrop(radius).toCanvas(); stage.set(radius, c); }
  return c;
}

export function createSoloDevScene(): Scene {
  let state: State = 'title';
  let solo: Solo | null = null;
  // Handy for browser-driven checks, like __ud.
  Object.defineProperty(window, '__solo', { configurable: true, get: () => ({ solo, state, chart }) });
  let bot: SoloBot | null = null;
  let chart: Chart = rooftop;
  let t = 0;
  let run = 0;

  const start = (c: Chart): void => {
    chart = c;
    run++;
    solo = createSolo({
      chart: c,
      onHit: (perfect) => audio.sfx(perfect ? 'crit' : 'hit'),
      onMiss: () => {},
    });
    bot = null;
    state = 'play';
  };

  return {
    opaque: true,
    enter(g) {
      if (g.flags.bot) start(rooftop);
    },
    update(g) {
      t++;
      if (state === 'title') {
        if (g.input.pressed('attack')) start(rooftop);
        else if (g.input.pressed('special')) start(riff);
        return;
      }
      if (state === 'play' && solo) {
        if (g.flags.bot) {
          bot ??= createSoloBot(chart, { accuracy: 0.9, jitter: 4, seed: run });
          solo.update(botInput(bot.at(solo.frame)));
        } else solo.update(g.input);
        if (solo.done) state = 'results';
        return;
      }
      if (state === 'results') {
        if (g.flags.bot) { if (t % 240 === 0) start(rooftop); return; }
        if (g.input.pressed('attack')) start(chart);
        else if (g.input.pressed('special')) state = 'title';
      }
    },
    draw(ctx) {
      rect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
      inFrame(ctx, () => {
        ctx.drawImage(stageAt(solo ? solo.radius : ringRadius(2)), 0, 0);
        drawText(ctx, 'EDDIE', 6, 6, 'cream');
        drawText(ctx, 'LV7', 40, 6, 'amber');
        drawText(ctx, 'HELLFIRE SOLO', 250, 6, 'hot', { align: 'right' });
        if (state === 'title') {
          rect(ctx, 24, 46, 208, 96, 'black');
          bigText(ctx, 'HELLFIRE SOLO', 128, 56, 'hot', 2);
          drawText(ctx, 'DEV BUILD OF THE NOTE HIGHWAY', 128, 78, 'mist', { align: 'center', shadow: true });
          drawText(ctx, `${labelOf('attack')}  THE ROOFTOP, ${Math.round(rooftop.length / 60)} S`, 128, 96, 'cream', { align: 'center', shadow: true });
          drawText(ctx, `${labelOf('special')}  THE RIFF, ${Math.round(riff.length / 60)} S`, 128, 108, 'cream', { align: 'center', shadow: true });
          if (blinkOn(t, 60, 40)) drawText(ctx, 'LANES ARE ATTACK, SPECIAL AND CRIT', 128, 128, 'amber', { align: 'center', shadow: true });
          return;
        }
        solo?.draw(ctx);
        if (state === 'results' && solo?.result) {
          const r = solo.result;
          rect(ctx, 40, 150, 176, 56, 'black');
          drawText(ctx, r.reason === 'feedback' ? 'CUT SHORT BY FEEDBACK' : 'SOLO DONE', 128, 156, r.reason === 'feedback' ? 'hot' : 'yellow', { align: 'center' });
          drawText(ctx, `HITS ${r.hits} OF ${r.notes}   PERFECT ${r.perfects}`, 128, 168, 'cream', { align: 'center' });
          drawText(ctx, `MISSES ${r.misses}   BEST STREAK ${r.bestStreak}`, 128, 178, 'cream', { align: 'center' });
          drawText(ctx, `${labelOf('attack')} AGAIN   ${labelOf('special')} TITLE`, 128, 192, 'mist', { align: 'center' });
        }
      });
    },
  };
}
