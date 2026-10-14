// The pause overlay: resume, the settings, start over and quit (both ask twice). Pause or cancel resumes.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { drawPanel, drawText } from '../gfx/index.ts';
import { bigText, dither, inFrame } from './kit.ts';
import { drawMenu, settingItems, updateMenu } from './menu.ts';
import type { Menu } from './menu.ts';

/** Overlay: resume, volumes, scanlines, shake, reduce flashing, skip story, controls, start over, quit. */
export function createPauseScene(opts: { onResume(): void; onQuit(): void; onStartOver(): void }): Scene {
  let t = 0;
  /** The label of the row waiting for a second press, if any. */
  let armed: string | null = null;
  let menu: Menu | null = null;
  const build = (g: Game): Menu => {
    const resume = { label: 'RESUME', activate: () => opts.onResume() };
    // Destructive rows: the first press arms them, the second one does it.
    const twice = (label: string, go: () => void) => ({
      label,
      value: () => (armed === label ? 'PRESS AGAIN' : ''),
      activate: () => {
        if (armed === label) go();
        else armed = label;
      },
    });
    menu = {
      sel: 0,
      items: [resume, ...settingItems(g), twice('START OVER', opts.onStartOver), twice('QUIT', opts.onQuit)],
    };
    return menu;
  };
  return {
    enter(g) {
      build(g);
      audio.sfx('pause');
    },
    update(g) {
      t++;
      const m = menu ?? build(g);
      if (g.input.pressed('pause') || g.input.pressed('cancel')) {
        audio.sfx('cancel');
        opts.onResume();
        return;
      }
      const before = m.sel;
      updateMenu(m, g);
      if (m.sel !== before) armed = null;
    },
    draw(ctx, g) {
      dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
      inFrame(ctx, () => {
        bigText(ctx, 'PAUSED', 128, 30, 'yellow', 2, 'center', true);
        drawPanel(ctx, 36, 48, 184, 132, 'menu');
        drawMenu(ctx, menu ?? build(g), 48, 56, 160, t);
        // Escape always works on a keyboard. On a controller the back button does.
        const key = labelOf('pause');
        const back = getPromptDevice() === 'gamepad' ? 'B' : 'ESC';
        drawText(ctx, key === back ? `${back} TO RESUME` : `${key} OR ${back} TO RESUME`, 128, 189, 'mist', { align: 'center' });
      });
    },
  };
}
