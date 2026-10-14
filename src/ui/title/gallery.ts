// The page behind title-variations.html: every title variant running live, side by side, on the real title code.
// Click a screen to give it the keyboard. Nothing here ships in the game.
import { SCREEN_H, SCREEN_W } from '../../core/config.ts';
import { actionsForCode, loadBindings } from '../../core/bindings.ts';
import type { Action } from '../../core/bindings.ts';
import { flags } from '../../core/flags.ts';
import type { InputState } from '../../core/input.ts';
import { startLoop } from '../../core/loop.ts';
import type { Game, Scene, SceneManager } from '../../core/scene.ts';
import { loadSettings, settings } from '../../core/settings.ts';
import { initGfx } from '../../gfx/index.ts';
import { TITLE_DESIGNS } from './index.ts';
import { createVariantScene } from './core.ts';
import type { StartMode, TitleDesign } from './core.ts';

interface Card {
  design: TitleDesign;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene: Scene;
  game: Game;
  press(a: Action): void;
  note: HTMLElement;
}

loadSettings();
loadBindings();
initGfx();

/** A hand-driven input: the card's buttons and, when it has the keyboard, the real keys. */
function makeInput(): InputState & { press(a: Action): void } {
  const queued = new Set<Action>();
  let now = new Set<Action>();
  return {
    press: (a) => { queued.add(a); },
    poll() { now = new Set(queued); queued.clear(); },
    held: () => false,
    pressed: (a) => now.has(a),
    released: () => false,
    axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard',
    capture: () => () => {},
  };
}

const stubScenes: SceneManager = {
  go() {}, push() {}, pop() {}, top: () => null, update() {}, draw() {},
};

let withSave = false;
let active: Card | null = null;
const cards: Card[] = [];

function note(card: Card, text: string): void {
  card.note.textContent = text;
  card.note.classList.add('show');
  window.setTimeout(() => card.note.classList.remove('show'), 1800);
}

function enter(card: Card): void {
  card.scene = createVariantScene(card.design, {
    silent: true,
    saved: () => withSave,
    onStart: (mode: StartMode) => {
      note(card, mode === 'continue' ? 'CONTINUE: the game would load your save now' : 'NEW GAME: the game would start now');
      window.setTimeout(() => enter(card), 1400);
    },
  });
  card.scene.enter?.(card.game);
}

const grid = document.getElementById('grid') as HTMLElement;
for (const design of TITLE_DESIGNS) {
  const el = document.createElement('article');
  el.className = 'card';
  el.id = `v${design.id}`;
  el.innerHTML = `
    <div class="screen"><canvas width="${SCREEN_W}" height="${SCREEN_H}" tabindex="0" aria-label="Title variant ${design.id}: ${design.name}"></canvas><div class="note" role="status"></div><span class="keys">Keyboard on</span></div>
    <div class="meta">
      <h2><span class="num">${design.id}</span>${design.name}</h2>
      <p>${design.blurb}</p>
      <p class="muted">${design.tradeoff}</p>
      <div class="row">
        <button data-do="start">Press start</button>
        <button data-do="options">Options</button>
        <a class="btn" href="/?title=${design.id}" target="_blank" rel="noopener">Open in the game</a>
      </div>
    </div>`;
  grid.appendChild(el);
  const canvas = el.querySelector('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  const input = makeInput();
  const game: Game = { input, settings, flags, scenes: stubScenes, frame: 0 };
  const card = { design, canvas, ctx, game, press: input.press, note: el.querySelector('.note') as HTMLElement, scene: null as unknown as Scene } satisfies Card;
  cards.push(card);
  enter(card);
  canvas.addEventListener('pointerdown', () => { active = card; sync(); canvas.focus(); });
  el.querySelector('[data-do="start"]')?.addEventListener('click', () => card.press('confirm'));
  el.querySelector('[data-do="options"]')?.addEventListener('click', () => card.press('pause'));
}

function sync(): void {
  for (const c of cards) c.canvas.closest('.card')?.classList.toggle('live', c === active);
}

// The keyboard goes to the card that was clicked last, and the same key map as the game decides what a key means.
addEventListener('keydown', (e) => {
  if (!active || e.repeat) return;
  const acts = actionsForCode(e.code);
  if (acts.length === 0) return;
  e.preventDefault();
  for (const a of acts) active.press(a);
});
addEventListener('pointerdown', (e) => {
  if (!(e.target as HTMLElement).closest('.screen')) { active = null; sync(); }
});

const saveBox = document.getElementById('save') as HTMLInputElement;
saveBox.addEventListener('change', () => { withSave = saveBox.checked; for (const c of cards) enter(c); });
const calmBox = document.getElementById('calm') as HTMLInputElement;
calmBox.checked = settings.reduceFlashing;
// This one is for looking only: it is not saved, so the game's own setting is left alone.
calmBox.addEventListener('change', () => { settings.reduceFlashing = calmBox.checked; });

// For review and screenshots: pause the clock, then step a card a known number of frames.
function draw(c: Card): void {
  c.ctx.fillStyle = '#000';
  c.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  c.scene.draw(c.ctx, c.game);
}

const dev = {
  cards,
  enter,
  paused: false,
  setSaved(v: boolean): void { withSave = v; },
  /** Draws a card now, without waiting for the next animation frame. */
  draw(i: number): void { draw(cards[i] as Card); },
  step(i: number, n: number): void {
    const c = cards[i] as Card;
    for (let k = 0; k < n; k++) {
      (c.game.input as InputState).poll();
      c.scene.update(c.game);
      c.game.frame++;
    }
  },
};

startLoop(
  () => {
    if (dev.paused) return;
    for (const c of cards) {
      (c.game.input as InputState).poll();
      c.scene.update(c.game);
      c.game.frame++;
    }
  },
  () => {
    for (const c of cards) draw(c);
  },
);

Object.assign(window, { __titles: dev });
