import * as bindings from './core/bindings.ts';
import { BASE_W, SCREEN_H, SCREEN_W, setScreenWidth } from './core/config.ts';
import { flags } from './core/flags.ts';
import { createInput } from './core/input.ts';
import { startLoop } from './core/loop.ts';
import { createSceneManager } from './core/scene.ts';
import type { Game } from './core/scene.ts';
import { applySettings, loadSettings, settings } from './core/settings.ts';
import { registerServiceWorker } from './core/pwa.ts';
import { fitScreen } from './core/viewport.ts';
import { initGfx } from './gfx/index.ts';
import { createSheetScene } from './gfx/sheet.ts';
import { audio } from './audio/index.ts';
import { createAudioLabScene } from './audio/lab.ts';
import { perfMark, perfOn } from './core/perf.ts';
import { createToast } from './ui/toast.ts';
import { mountTouchUi } from './ui/touchui.ts';
import type { TouchLayout } from './core/touchlayout.ts';
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
/**
 * Sizes the screen and places the canvas, when the window or the touch layout changed. Desktop: as wide as the
 * window's shape and filling it. Touch: 256 wide, wherever the touch layout puts the game. The dev scenes are drawn
 * for 256 wide, so they keep it too. Moving to a screen with a different pixel density counts as a change.
 */
function fit(l: TouchLayout | null): void {
  const dpr = devicePixelRatio || 1;
  const key = l ? `${l.game.x},${l.game.y},${l.game.w},${l.game.h}@${dpr}` : `${innerWidth}x${innerHeight}@${dpr}`;
  if (key === placed) return;
  placed = key;
  stage.classList.toggle('touch', l !== null);
  const f = l
    ? fitScreen(l.game.w, l.game.h, dpr, BASE_W)
    : fitScreen(innerWidth, innerHeight, dpr, flags.sheet || flags.audio ? BASE_W : undefined);
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
  wrap.style.left = l ? `${l.game.x}px` : '';
  wrap.style.top = l ? `${l.game.y}px` : '';
  canvas.style.width = `${l ? l.game.w : f.cssW}px`;
  canvas.style.height = `${l ? l.game.h : f.cssH}px`;
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
Object.assign(window, { __ud: { g, audio, bindings, frame } });

registerServiceWorker();

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
    // Before drawing, so a resize never shows a frame drawn for the old size.
    fit(touch.frame(g.input));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.scenes.draw(ctx);
    toast.draw(ctx);
    view.imageSmoothingEnabled = false;
    const t = perfOn ? performance.now() : 0;
    view.drawImage(frame, 0, 0, canvas.width, canvas.height);
    if (perfOn) perfMark.copy = performance.now() - t;
  },
);
