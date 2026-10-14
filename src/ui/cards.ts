// Two full-screen cards: the chapter title and the game over screen.
import type { Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawText } from '../gfx/index.ts';
import type { IconId } from '../core/types.ts';
import { skipsDialogue } from '../core/settings.ts';
import { fadeLevel } from './format.ts';
import { bigText, box, RAMP_BONE, RAMP_RED, rampAt } from './kit.ts';
import { drawMenu, updateMenu } from './menu.ts';
import type { Menu } from './menu.ts';

const FADE_IN = 40;
const HOLD = 100;
const FADE_OUT = 40;
/** 180 frames, three seconds. */
const CARD_FRAMES = FADE_IN + HOLD + FADE_OUT;
/** The subtitle comes in this many frames after the title and leaves with it. */
const SUB_DELAY = 20;

/** Black card with the chapter name that fades in and out, then calls onDone. Confirm or a click skips it. */
export function createChapterCard(opts: { title: string; subtitle: string; onDone(): void }): Scene {
  let t = 0;
  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    opts.onDone();
  };
  return {
    opaque: true,
    update(g) {
      t++;
      const i = g.input;
      if (i.pressed('confirm') || i.pressed('skip') || i.clicked() || skipsDialogue() || t >= CARD_FRAMES) finish();
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
      const a = fadeLevel(t, FADE_IN, HOLD, FADE_OUT);
      const b = fadeLevel(t - SUB_DELAY, FADE_IN, HOLD - SUB_DELAY, FADE_OUT);
      bigText(ctx, opts.title, 128, 92, rampAt(RAMP_BONE, a), 2, 'center', false);
      const rule = Math.round(96 * b);
      if (rule > 0) box(ctx, 128 - rule / 2, 114, rule, 1, rampAt(RAMP_RED, b));
      drawText(ctx, opts.subtitle, 128, 122, rampAt(RAMP_RED, b), { align: 'center' });
    },
  };
}

const STRING: IconId[] = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'];
const BULBS = 15;
/** Frame where the menu appears. Confirm or a click before that just gets there faster. */
const MENU_AT = 150;

/** "The lights went out." A string of bulbs dies one by one, then retry or quit. */
export function createGameOverScene(opts: { onRetry(): void; onQuit(): void }): Scene {
  let t = 0;
  let chosen = false;
  const pick = (fn: () => void) => (): void => {
    if (chosen) return;
    chosen = true;
    fn();
  };
  const menu: Menu = {
    sel: 0,
    items: [
      { label: 'RETRY', activate: pick(opts.onRetry) },
      { label: 'QUIT', activate: pick(opts.onQuit) },
    ],
  };
  return {
    opaque: true,
    enter() { audio.jingle('gameOver'); },
    update(g) {
      t++;
      if (t < MENU_AT) {
        if (g.input.pressed('confirm') || g.input.clicked()) t = MENU_AT;
        return;
      }
      updateMenu(menu, g);
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'black');
      // The wire sags between the ends. Each bulb flickers for a moment and then stays dark.
      const wireY = (x: number): number => 52 + Math.round(Math.sin((x / SCREEN_W) * Math.PI) * 14);
      for (let x = 0; x < SCREEN_W; x++) box(ctx, x, wireY(x), 1, 1, 'grey1');
      for (let i = 0; i < BULBS; i++) {
        const x = 8 + i * 16;
        const dies = 20 + i * 5;
        const lit = t < dies - 8 || (t < dies && ((t >> 1) & 1) === 0);
        drawIcon(ctx, lit ? (STRING[i % STRING.length] as IconId) : 'bulbOff', x, wireY(x + 4), t);
      }
      const a = Math.max(0, Math.min(1, (t - 100) / 30));
      bigText(ctx, 'THE LIGHTS WENT OUT.', 128, 100, rampAt(RAMP_RED, a), 2, 'center', false);
      if (t >= MENU_AT) drawMenu(ctx, menu, 96, 140, 64, t, 13);
    },
  };
}
