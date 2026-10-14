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

const g: Game = {
  input: createInput(canvas),
  settings,
  flags,
  scenes: createSceneManager(() => g),
  frame: 0,
};

function fit(): void {
  const raw = Math.min(innerWidth / SCREEN_W, innerHeight / SCREEN_H);
  const s = raw >= 1 ? Math.floor(raw) : raw;
  canvas.style.width = `${SCREEN_W * s}px`;
  canvas.style.height = `${SCREEN_H * s}px`;
}
addEventListener('resize', fit);
fit();

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
Object.assign(window, { __ud: { g, audio, bindings } });

startLoop(
  () => {
    g.input.poll();
    if (g.input.pressed('mute')) audio.mute(!audio.isMuted());
    g.scenes.update();
    g.frame++;
  },
  () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.scenes.draw(ctx);
  },
);
