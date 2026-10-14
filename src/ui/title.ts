// The title screen: the logo, Joyce's alphabet wall spelling RUN, PRESS START, and a quick options panel on P.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { getPromptDevice, labelOf, titleHintLines } from '../core/bindings.ts';
import { hasSave } from '../core/save.ts';
import { drawAlphabetWall, drawLogo, drawPanel, drawText } from '../gfx/index.ts';
import { wallLit } from './format.ts';
import { bigText, blinkOn, box, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { drawMenu, settingItems, toggleSkipStory, updateMenu } from './menu.ts';
import type { Menu } from './menu.ts';

const CREDIT = 'Fan tribute. Not affiliated with Netflix.';

/** A few red spores drifting up, the Upside Down's idea of snow. */
function spores(ctx: Ctx, t: number): void {
  for (let i = 0; i < 28; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const speed = 0.12 + ((seed >> 8) % 10) / 60;
    const y = 232 - ((t * speed + ((seed >> 12) % 224)) % 232);
    const x = (seed % 256) + Math.round(Math.sin(t / 60 + i) * 3);
    const big = i % 3 === 0 ? 2 : 1;
    box(ctx, x, y, big, big, i % 2 ? 'blood1' : 'blood0');
  }
}

/** `continue` loads the save. `new` is a fresh run, and the caller wipes any save. */
export type StartMode = 'new' | 'continue';

export function createTitleScene(opts: { onStart(mode: StartMode): void }): Scene {
  let t = 0;
  let open = false;
  let menu: Menu | null = null;
  /** With a save on disk, PRESS START gives way to CONTINUE and NEW GAME. NEW GAME asks twice. */
  let saved = false;
  let armed = false;
  const startMenu: Menu = {
    sel: 0,
    items: [
      { label: 'CONTINUE', activate: () => opts.onStart('continue') },
      {
        label: 'NEW GAME',
        value: () => (armed ? 'PRESS AGAIN' : ''),
        activate: () => {
          if (armed) opts.onStart('new');
          else armed = true;
        },
      },
    ],
  };
  const build = (g: Game): Menu => {
    menu = { sel: 0, items: [...settingItems(g), { label: 'BACK', activate: () => { open = false; } }] };
    return menu;
  };
  return {
    opaque: true,
    enter(g) {
      t = 0;
      open = false;
      saved = hasSave();
      armed = false;
      startMenu.sel = 0;
      build(g);
      audio.music('static');
    },
    update(g) {
      t++;
      const m = menu ?? build(g);
      const i = g.input;
      if (open) {
        updateMenu(m, g);
        if (i.pressed('cancel') || i.pressed('pause')) { open = false; audio.sfx('cancel'); }
        return;
      }
      if (i.pressed('skip')) { toggleSkipStory(g); return; }
      if (saved) {
        const before = startMenu.sel;
        updateMenu(startMenu, g);
        if (startMenu.sel !== before) armed = false;
        if (i.pressed('confirm')) return;
        // A controller's Start button picks the highlighted row, the same as A.
        if (i.pressed('start')) { audio.sfx('confirm'); startMenu.items[startMenu.sel]?.activate?.(); return; }
      } else if (i.pressed('confirm') || i.pressed('start')) { audio.sfx('confirm'); opts.onStart('new'); return; }
      if (i.pressed('pause') || i.pressed('special')) { open = true; m.sel = 0; audio.sfx('select'); }
    },
    draw(ctx, g) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      spores(ctx, t);
      drawLogo(ctx, t, 128, 16);
      // The wall: a strip of wallpaper with the alphabet on it.
      box(ctx, 36, 62, 184, 56, 'night');
      for (let x = 40; x < 220; x += 8) box(ctx, x, 63, 1, 54, 'shadow');
      outline(ctx, 36, 62, 184, 56, 'shadow');
      drawAlphabetWall(ctx, 50, 71, wallLit(t), t);
      if (open) {
        drawPanel(ctx, 36, 112, 184, 92, 'menu');
        drawMenu(ctx, menu ?? build(g), 48, 119, 160, t, 10);
      } else {
        // Wide enough that PRESS AGAIN clears the NEW GAME label, placed so the two labels sit centered.
        if (saved) drawMenu(ctx, startMenu, 94, 126, 128, t, 12);
        else if (blinkOn(t, 64, 42)) bigText(ctx, 'PRESS START', 128, 130, 'white', 2);
        // The hints follow the player's bindings, so a rebind shows up here at once.
        const hints = titleHintLines();
        hints.forEach((line, k) => drawText(ctx, line, 128, 158 + k * 9, 'mist', { align: 'center' }));
        const y = 158 + hints.length * 9 + 5;
        // Start begins the game on a controller, so the options sit on the special button there.
        const optionsKey = getPromptDevice() === 'gamepad' ? labelOf('special') : labelOf('pause');
        drawText(ctx, `${optionsKey} OPTIONS`, 128, y, 'yellow', { align: 'center' });
        const skip = g.settings.skipDialogue;
        const key = labelOf('skip');
        drawText(ctx, `${key === '--' ? '' : `${key} `}SKIP STORY: ${skip ? 'ON' : 'OFF'}`, 128, y + 11, skip ? 'yellow' : 'mist', { align: 'center' });
      }
      drawText(ctx, CREDIT, 128, 206, 'mist', { align: 'center' });
      // A controller press can't always wake the browser's audio. Say so rather than leave the game silent.
      if (!open && g.input.device() === 'gamepad' && !audio.ready()) {
        drawText(ctx, 'CLICK THE GAME ONCE FOR SOUND', 128, 215, 'amber', { align: 'center' });
      }
    },
  };
}
