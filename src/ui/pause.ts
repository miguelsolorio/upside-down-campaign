// The pause overlay: resume, the character sheet, the settings, start over and quit (both ask twice). Pause or cancel resumes.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { drawPanel, drawText } from '../gfx/index.ts';
import { bigText, dither, inFrame } from './kit.ts';
import { drawMenu, settingItems, updateMenu } from './menu.ts';
import type { Menu } from './menu.ts';
import { createCharSheetScene } from './charsheet.ts';
import type { CharSheetHero } from './charsheet.ts';

/** Overlay: resume, characters, volumes, scanlines, shake, reduce flashing, skip story, controls, start over, quit.
 * `party` feeds the character sheet. Backing out of the sheet comes back here. */
export function createPauseScene(opts: { onResume(): void; onQuit(): void; onStartOver(): void; party(): CharSheetHero[] }): Scene {
  let t = 0;
  /** The label of the row waiting for a second press, if any. */
  let armed: string | null = null;
  let menu: Menu | null = null;
  const build = (g: Game): Menu => {
    const resume = { label: 'RESUME', activate: () => opts.onResume() };
    const characters = { label: 'CHARACTERS', activate: () => g.scenes.push(createCharSheetScene({ heroes: opts.party, onBack: () => g.scenes.pop() })) };
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
      items: [resume, characters, ...settingItems(g), twice('START OVER', opts.onStartOver), twice('QUIT', opts.onQuit)],
      onMove: () => { armed = null; },
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
      updateMenu(m, g);
    },
    draw(ctx, g) {
      dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
      inFrame(ctx, () => {
        bigText(ctx, 'PAUSED', 128, 30, 'yellow', 2, 'center', true);
        drawPanel(ctx, 36, 48, 184, 132, 'menu');
        drawMenu(ctx, menu ?? build(g), 48, 56, 160, t);
        // Escape always works on a keyboard. On a controller the back button does. On a touch screen, PAUSE again.
        const key = labelOf('pause');
        const device = getPromptDevice();
        const back = device === 'gamepad' ? 'B' : 'ESC';
        const hint = device === 'touch' ? 'TAP PAUSE TO RESUME' : key === back ? `${back} TO RESUME` : `${key} OR ${back} TO RESUME`;
        drawText(ctx, hint, 128, 189, 'mist', { align: 'center' });
      });
    },
  };
}
