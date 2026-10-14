// The title screen: the party at the edge of Mirkwood with the Upside Down glowing behind the trees. PRESS START (or
// CONTINUE and NEW GAME) and OPTIONS sit under the logo, and START sends the party walking into the woods.
// No key hints are drawn here. P still opens the options and T still flips skip story, and both are also on screen
// as a menu row and a status line.
import type { Game, Scene } from '../core/scene.ts';
import { FRAME_X, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { hasSave } from '../core/save.ts';
import type { HeroId } from '../core/types.ts';
import { drawIcon, drawLogo, drawPanel, drawText, paintGlow } from '../gfx/index.ts';
import type { Glow } from '../gfx/index.ts';
import { LAUNCH_FRAMES, launchLevel } from './format.ts';
import { bigText, blinkOn, box, dither, inFrame } from './kit.ts';
import type { Ctx } from './kit.ts';
import { drawMenu, settingItems, toggleSkipStory, updateMenu } from './menu.ts';
import type { Menu } from './menu.ts';
import { bigActor, sky, spores, woods } from './title_art.ts';

/** `continue` loads the save. `new` is a fresh run, and the caller wipes any save. */
export type StartMode = 'new' | 'continue';

const PARTY: { id: HeroId; x: number; y: number }[] = [
  { id: 'dustin', x: 70, y: 190 },
  { id: 'mike', x: 108, y: 188 },
  { id: 'eleven', x: 148, y: 192 },
  { id: 'lucas', x: 186, y: 188 },
];

/** The big prompt blinks while it waits, flickers once it is pressed, then holds. */
function promptOn(t: number, launch: number): boolean {
  if (launch > 0) return ((launch >> 1) & 1) === 0 || launch > 24;
  return blinkOn(t, 64, 44);
}

/** A fade of the whole screen to one color in dither steps. */
function fadeOut(ctx: Ctx, level: number): void {
  if (level <= 0) return;
  if (level >= 0.95) { box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink'); return; }
  if (level < 0.34) { dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 4); return; }
  dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
  if (level >= 0.67) {
    // A second, shifted pass fills in a quarter more of the pixels.
    ctx.save();
    ctx.translate(1, 0);
    dither(ctx, -1, 0, SCREEN_W + 1, SCREEN_H, 'ink', 4);
    ctx.restore();
  }
}

export function createTitleScene(opts: { onStart(mode: StartMode): void }): Scene {
  let t = 0;
  let open = false;
  /** With a save on disk, PRESS START gives way to CONTINUE and NEW GAME. NEW GAME asks twice. */
  let saved = false;
  let armed = false;
  /** 0 until START is chosen, then counts frames up to LAUNCH_FRAMES while the party walks off. */
  let launch = 0;
  let mode: StartMode = 'new';
  let settingsMenu: Menu | null = null;
  const main: Menu = { sel: 0, items: [] };
  const begin = (m: StartMode): void => { mode = m; launch = 1; };
  const openOptions = (): void => { open = true; if (settingsMenu) settingsMenu.sel = 0; };
  const build = (g: Game): Menu => {
    settingsMenu = { sel: 0, items: [...settingItems(g), { label: 'BACK', activate: () => { open = false; } }] };
    return settingsMenu;
  };
  const buildMain = (): void => {
    main.items = saved
      ? [
        { label: 'CONTINUE', activate: () => begin('continue') },
        {
          label: 'NEW GAME',
          value: () => (armed ? 'PRESS AGAIN' : ''),
          activate: () => { if (armed) begin('new'); else armed = true; },
        },
        { label: 'OPTIONS', activate: openOptions },
      ]
      : [
        { label: 'PRESS START', activate: () => begin('new') },
        { label: 'OPTIONS', activate: openOptions },
      ];
  };

  /** The menu, centered. With no save the first row is the big prompt and OPTIONS sits under it. */
  const drawMain = (ctx: Ctx): void => {
    let y = 78;
    let first = 0;
    if (!saved) {
      const on = main.sel === 0;
      if (promptOn(t, launch) || !on) bigText(ctx, 'PRESS START', 128, y, on ? 'white' : 'mist', 2);
      y += 24;
      first = 1;
    }
    for (let i = first; i < main.items.length; i++) {
      const it = main.items[i] as Menu['items'][number];
      const v = it.value?.() ?? '';
      const text = v ? `${it.label} ${v}` : it.label;
      const x = Math.round(128 - (text.length * 6) / 2);
      const on = i === main.sel;
      if (on) drawIcon(ctx, 'cursor', x - 11, y - 1, t);
      drawText(ctx, text, x, y, on ? 'yellow' : 'bone', { shadow: true });
      y += 13;
    }
  };

  return {
    opaque: true,
    enter(g) {
      t = 0;
      open = false;
      launch = 0;
      armed = false;
      saved = hasSave();
      buildMain();
      main.sel = 0;
      build(g);
      audio.music('static');
    },
    update(g) {
      t++;
      const i = g.input;
      if (launch > 0) {
        launch++;
        if (launch >= LAUNCH_FRAMES) { launch = 0; opts.onStart(mode); }
        return;
      }
      const m = settingsMenu ?? build(g);
      if (open) {
        updateMenu(m, g);
        if (i.pressed('cancel') || i.pressed('pause')) { open = false; audio.sfx('cancel'); }
        return;
      }
      if (i.pressed('skip')) { toggleSkipStory(g); return; }
      // A controller's Start button picks the highlighted row, the same as A.
      if (i.pressed('start')) { audio.sfx('confirm'); main.items[main.sel]?.activate?.(); return; }
      const before = main.sel;
      updateMenu(main, g);
      if (main.sel !== before) armed = false;
      if (launch > 0 || open) return;
      if (i.pressed('pause') || i.pressed('special')) { openOptions(); audio.sfx('select'); }
    },
    draw(ctx, g) {
      const walk = launchLevel(launch);
      sky(ctx, t);
      woods(ctx);
      spores(ctx, t);

      // Light on the path: the flashlights Mike and Lucas hold, which travel with the party as it walks off. The
      // pools are painted straight onto the pixels, so they take screen x, not the frame's.
      const lights: Glow[] = PARTY.filter((p) => p.id !== 'eleven').map((p) => ({ x: FRAME_X + p.x, y: p.y - 6 - walk * 30, r: 30, k: 0.85, flicker: 0.4 }));
      paintGlow(ctx, lights, t, 1);

      inFrame(ctx, () => {
        // Heroes in the back row first, so the front one overlaps them.
        for (const p of [...PARTY].sort((a, b) => a.y - b.y)) {
          const off = launch > 0 ? Math.round(launch * 1.1) : 0;
          bigActor(ctx, p.id, p.x, p.y - off, 2, launch > 0 ? launch : t, {
            dir: launch > 0 ? 'up' : 'down', anim: launch > 0 ? 'walk' : 'idle', strained: p.id === 'eleven',
          });
        }
        drawLogo(ctx, t, 128, 14);
        drawMain(ctx);

        const skip = g.settings.skipDialogue;
        drawText(ctx, `SKIP STORY: ${skip ? 'ON' : 'OFF'}`, 128, 213, skip ? 'yellow' : 'mist', { align: 'center', shadow: true });
        // A controller press can't always wake the browser's audio. Say so rather than leave the game silent.
        if (!open && g.input.device() === 'gamepad' && !audio.ready()) {
          drawText(ctx, 'CLICK THE GAME ONCE FOR SOUND', 128, 202, 'amber', { align: 'center', shadow: true });
        }
      });
      fadeOut(ctx, walk > 0.45 ? (walk - 0.45) / 0.55 : 0);

      if (open) {
        dither(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink', 2);
        inFrame(ctx, () => {
          drawPanel(ctx, 36, 58, 184, 92, 'menu');
          drawMenu(ctx, settingsMenu ?? build(g), 48, 65, 160, t, 10);
        });
      }
    },
  };
}
