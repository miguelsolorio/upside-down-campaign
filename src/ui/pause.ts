// The pause overlay: resume, the character sheet, the settings, start over and quit (both ask twice). Pause or cancel resumes.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { drawPanel, drawText } from '../gfx/index.ts';
import { bigText, dither, inFrame } from './kit.ts';
import { drawMenu, reshape, settingItems, settingsKind, updateMenu } from './menu.ts';
import type { Menu, SettingsKind } from './menu.ts';
import { createCharSheetScene } from './charsheet.ts';
import type { CharSheetHero } from './charsheet.ts';

/** Overlay: resume, characters, difficulty, volumes, scanlines, shake, reduce flashing, skip story, controls, start over, quit.
 * `party` feeds the character sheet. Backing out of the sheet comes back here. */
export function createPauseScene(opts: { onResume(): void; onQuit(): void; onStartOver(): void; party(): CharSheetHero[] }): Scene {
  let t = 0;
  /** The label of the row waiting for a second press, if any. */
  let armed: string | null = null;
  let menu: Menu | null = null;
  /** The input the settings rows were built for. Picking up the controller while paused brings RUMBLE in. */
  let builtFor: SettingsKind = 'keys';
  const build = (g: Game): Menu => {
    builtFor = settingsKind(g);
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
      if (settingsKind(g) !== builtFor) {
        const fresh = build(g);
        reshape(m, fresh.items);
        menu = m;
      }
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
        const m = menu ?? build(g);
        // DIFFICULTY makes a twelfth row and RUMBLE a thirteenth. Both fit the same panel, the rows a pixel closer for each.
        drawMenu(ctx, m, 48, 56, 160, t, m.items.length > 12 ? 9 : m.items.length > 11 ? 10 : 11);
        // Escape always works on a keyboard. On a controller and on the touch screen's Game Boy, B does.
        const key = labelOf('pause');
        const back = getPromptDevice() === 'keyboard' ? 'ESC' : 'B';
        const hint = key === back ? `${back} TO RESUME` : `${key} OR ${back} TO RESUME`;
        drawText(ctx, hint, 128, 189, 'mist', { align: 'center' });
      });
    },
  };
}
