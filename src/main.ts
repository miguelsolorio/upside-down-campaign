import * as bindings from './core/bindings.ts';
import { BASE_W, SCREEN_H, SCREEN_W, setScreenWidth } from './core/config.ts';
import { flags } from './core/flags.ts';
import { createInput } from './core/input.ts';
import { startLoop } from './core/loop.ts';
import { createSceneManager } from './core/scene.ts';
import type { Game } from './core/scene.ts';
import { applySettings, loadSettings, settings } from './core/settings.ts';
import { fitScreen } from './core/viewport.ts';
import { initGfx } from './gfx/index.ts';
import { createSheetScene } from './gfx/sheet.ts';
import { audio } from './audio/index.ts';
import { createAudioLabScene } from './audio/lab.ts';
import { createToast } from './ui/toast.ts';
import { startGame } from './flow.ts';

// The page shows #game, but the game draws at 1x into `frame`, which is copied up onto #game each frame.
const canvas = document.getElementById('game') as HTMLCanvasElement;
const view = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
const frame = document.createElement('canvas');
// The night stages paint their pools of light by reading the world's pixels back every frame.
const ctx = frame.getContext('2d', { alpha: false, willReadFrequently: true }) as CanvasRenderingContext2D;

loadSettings();
bindings.loadBindings();
applySettings();
initGfx();
if (flags.mute) audio.mute(true);
audio.setVolumes(settings.musicVol, settings.sfxVol);

const toast = createToast();

const g: Game = {
  // A controller press only counts as a user gesture in some browsers, so ask for sound only when this one did.
  input: createInput({ canvas, onPadPress: () => { if (navigator.userActivation?.isActive) audio.unlock(); } }),
  settings,
  flags,
  scenes: createSceneManager(() => g),
  frame: 0,
};

/** Sizes the screen to the window. The dev scenes are drawn for 256 wide, so they keep it. */
function fit(): void {
  const f = fitScreen(innerWidth, innerHeight, devicePixelRatio || 1, flags.sheet || flags.audio ? BASE_W : undefined);
  setScreenWidth(f.w);
  // Resizing a canvas resets its context, smoothing included.
  if (frame.width !== SCREEN_W || frame.height !== SCREEN_H) {
    frame.width = SCREEN_W;
    frame.height = SCREEN_H;
  }
  ctx.imageSmoothingEnabled = false;
  if (canvas.width !== SCREEN_W * f.k || canvas.height !== SCREEN_H * f.k) {
    canvas.width = SCREEN_W * f.k;
    canvas.height = SCREEN_H * f.k;
  }
  canvas.style.width = `${f.cssW}px`;
  canvas.style.height = `${f.cssH}px`;
}
fit();

// Resizing waits for the next tick, so a tick's update and draw always see the same width.
let refit = false;
addEventListener('resize', () => { refit = true; });
// Moving the window to a screen with a different pixel density doesn't fire resize.
const watchDensity = (): void => {
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', () => { refit = true; watchDensity(); }, { once: true });
};
watchDensity();

const unlock = (): void => audio.unlock();
addEventListener('keydown', unlock);
addEventListener('pointerdown', unlock);

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
Object.assign(window, { __ud: { g, audio, bindings, frame } });

startLoop(
  () => {
    if (refit) { refit = false; fit(); }
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
    view.imageSmoothingEnabled = false;
    view.drawImage(frame, 0, 0, canvas.width, canvas.height);
  },
);
