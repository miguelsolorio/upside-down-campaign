import * as bindings from './core/bindings.ts';
import { SCREEN_H, SCREEN_W } from './core/config.ts';
import { flags } from './core/flags.ts';
import { createInput } from './core/input.ts';
import { startLoop } from './core/loop.ts';
import { createSceneManager } from './core/scene.ts';
import type { Game } from './core/scene.ts';
import { applySettings, loadSettings, settings } from './core/settings.ts';
import { initGfx } from './gfx/index.ts';
import { createSheetScene } from './gfx/sheet.ts';
import { audio } from './audio/index.ts';
import { createAudioLabScene } from './audio/lab.ts';
import { createToast } from './ui/toast.ts';
import { mountTouchUi } from './ui/touchui.ts';
import type { TouchLayout } from './core/touchlayout.ts';
import { startGame } from './flow.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
// The night stages paint their pools of light by reading the world's pixels back every frame.
const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true }) as CanvasRenderingContext2D;
ctx.imageSmoothingEnabled = false;

loadSettings();
bindings.loadBindings();
applySettings();
initGfx();
if (flags.mute) audio.mute(true);
audio.setVolumes(settings.musicVol, settings.sfxVol);

const toast = createToast();
const touch = mountTouchUi();
// A phone or tablet starts with its controls on screen. A key or a controller press hides them until the next touch.
const touchFirst = flags.touch || matchMedia('(pointer: coarse)').matches;

const g: Game = {
  input: createInput({
    canvas,
    touch,
    startDevice: touchFirst ? 'touch' : 'keyboard',
    // A controller press only counts as a user gesture in some browsers, so ask for sound only when this one did.
    onPadPress: () => { if (navigator.userActivation?.isActive) audio.unlock(); },
  }),
  settings,
  flags,
  scenes: createSceneManager(() => g),
  frame: 0,
};

const stage = document.getElementById('stage') as HTMLElement;
const wrap = document.getElementById('wrap') as HTMLElement;
let placed = '';
/** Desktop: the biggest whole scale that fits, centered. Touch: wherever the touch layout puts the game. */
function fit(l: TouchLayout | null): void {
  const key = l ? `${l.game.x},${l.game.y},${l.game.w},${l.game.h}` : `${innerWidth}x${innerHeight}`;
  if (key === placed) return;
  placed = key;
  stage.classList.toggle('touch', l !== null);
  if (l) {
    wrap.style.left = `${l.game.x}px`;
    wrap.style.top = `${l.game.y}px`;
    canvas.style.width = `${l.game.w}px`;
    canvas.style.height = `${l.game.h}px`;
    return;
  }
  wrap.style.left = wrap.style.top = '';
  const raw = Math.min(innerWidth / SCREEN_W, innerHeight / SCREEN_H);
  const s = raw >= 1 ? Math.floor(raw) : raw;
  canvas.style.width = `${SCREEN_W * s}px`;
  canvas.style.height = `${SCREEN_H * s}px`;
}
fit(touch.frame(g.input));

// A touch only counts as a user gesture when the finger lifts, so sound starts on pointerup there.
// iOS can suspend the sound after a call or an app switch, so every tap asks again.
const unlock = (): void => audio.unlock();
addEventListener('keydown', unlock);
addEventListener('pointerdown', unlock);
addEventListener('pointerup', unlock);
addEventListener('touchend', unlock);

// Silence the game whenever the page isn't what you're looking at: another window, another tab, or the chat beside it.
const syncFocus = (): void => audio.focus(document.hasFocus() && document.visibilityState === 'visible');
addEventListener('blur', syncFocus);
addEventListener('focus', syncFocus);
document.addEventListener('visibilitychange', syncFocus);
syncFocus();

if (flags.sheet) g.scenes.go(createSheetScene());
else if (flags.audio) g.scenes.go(createAudioLabScene());
else startGame(g);

// Handy for the dev panel, the bot and browser-driven checks.
Object.assign(window, { __ud: { g, audio, bindings } });

startLoop(
  () => {
    g.input.poll();
    // Every hint on screen names keys or buttons for whichever device was touched last.
    bindings.setPromptDevice(g.input.device());
    const note = g.input.notice();
    if (note) toast.show(note);
    toast.tick();
    if (g.input.pressed('mute')) audio.mute(!audio.isMuted());
    g.scenes.update();
    g.frame++;
  },
  () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.scenes.draw(ctx);
    toast.draw(ctx);
    fit(touch.frame(g.input));
  },
);
