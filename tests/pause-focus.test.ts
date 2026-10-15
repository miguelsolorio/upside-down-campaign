// Losing focus or the controller pauses the level, in the real play scene and the arcade cabinet, headless on the same fake
// canvas and game as stage13-scene.test.ts. Scenes where nothing moves (the title, the map) don't look at the signal at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { Sim } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';

const noop = (): undefined => undefined;
function fakeCtx(): unknown {
  const own: Record<string, unknown> = {};
  return new Proxy(own, {
    get(t, k: string) {
      if (k === 'createImageData' || k === 'getImageData') return (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 0 });
      return k in t ? t[k] : noop;
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
}
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => { const c: Record<string, unknown> = { width: 1, height: 1 }; c.getContext = () => fakeCtx(); return c; },
};
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');
const { createArcadeScene } = await import('../src/arcade/scene.ts');
const { createBoard } = await import('../src/arcade/scores.ts');
const { settings } = await import('../src/core/settings.ts');

const stack: Scene[] = [];
/** The actions the fake input holds down this tick, and whether the player was just pulled away. */
let pressed = new Set<string>();
let interrupted = false;
const game: Game = {
  input: {
    poll: noop, held: () => false, pressed: (a: string) => pressed.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    interrupted: () => interrupted, capture: () => noop, offer: noop, offered: () => false,
  } as unknown as Game['input'],
  settings: { difficulty: 'chief', shake: 1, reduceFlashing: false } as unknown as Game['settings'],
  flags: { bot: false, god: false, dev: false, level: 0, seed: 1, party: null } as unknown as Game['flags'],
  scenes: {
    push(s: Scene) { stack.push(s); s.enter?.(game); },
    pop() { stack.pop(); },
    top: () => stack[stack.length - 1] ?? null,
    go: noop, update: noop, draw: noop,
  } as unknown as Game['scenes'],
  frame: 0,
};
const tickOf = (s: Scene, n = 1): void => { for (let i = 0; i < n; i++) { game.frame++; (stack[stack.length - 1] ?? s).update(game); } };
const quiet = (): void => { pressed = new Set(); interrupted = false; stack.length = 0; };

function level(stageId = '1.1', opts: { bot?: boolean } = {}): { play: Scene; sim: () => Sim; tick: (n?: number) => void } {
  quiet();
  (game.flags as { bot: boolean }).bot = opts.bot ?? false;
  const play = createPlayScene({ stageId, party: defaultParty(stageId), onClear: noop, onQuit: noop, onStartOver: noop });
  play.enter?.(game);
  const live = (): Sim => (globalThis as unknown as { __ud: { play: { sim: Sim } } }).__ud.play.sim;
  return { play, sim: live, tick: (n = 1) => tickOf(play, n) };
}

test('losing focus mid-stage opens the pause menu and the level stops', () => {
  const l = level();
  l.tick(20);
  assert.equal(stack.length, 0, 'playing');
  const frames = l.sim().stats().frames;
  assert.ok(frames > 0);
  interrupted = true;
  l.tick();
  interrupted = false;
  assert.equal(stack.length, 1, 'the pause menu is up over the level');
  assert.notEqual(stack[0], l.play);
  l.tick(60);
  assert.equal(l.sim().stats().frames, frames, 'and nothing in the level moves while it is');
});

test('the pause menu closes the same way as one opened by Esc: pressing pause or cancel resumes', () => {
  const l = level();
  l.tick(5);
  interrupted = true;
  l.tick();
  interrupted = false;
  assert.equal(stack.length, 1);
  pressed = new Set(['cancel']);
  l.tick();
  pressed = new Set();
  assert.equal(stack.length, 0, 'back in the level');
  const frames = l.sim().stats().frames;
  l.tick(10);
  assert.ok(l.sim().stats().frames > frames, 'which runs again');
});

test('the Lab pauses on an interruption too', () => {
  const l = level('1.2');
  l.tick(10);
  interrupted = true;
  l.tick();
  interrupted = false;
  assert.equal(stack.length, 1);
});

test('a tick without an interruption never pauses', () => {
  const l = level();
  l.tick(120);
  assert.equal(stack.length, 0);
});

test('a bot run is not paused by the window, so a background tab still plays itself out', () => {
  const l = level('1.1', { bot: true });
  l.tick(5);
  interrupted = true;
  l.tick();
  assert.equal(stack.length, 0);
  (game.flags as { bot: boolean }).bot = false;
});

/** Stage 1.1 with the story on, run until Joyce's opening lines are up: her beat is waiting on the box. */
function levelWithBox(): ReturnType<typeof level> & { busy: () => boolean } {
  settings.skipDialogue = false;
  const l = level();
  const busy = (): boolean => (globalThis as unknown as { __ud: { play: { director: { busy(): boolean } } } }).__ud.play.director.busy();
  for (let n = 0; n < 600 && !busy(); n++) l.tick();
  assert.ok(busy(), 'the opening lines are up');
  return { ...l, busy };
}

test('the pause key opens the menu over a dialogue box, and the box is still up when the menu closes', () => {
  try {
    const l = levelWithBox();
    pressed = new Set(['pause']);
    l.tick();
    pressed = new Set();
    assert.equal(stack.length, 1, 'the pause menu is up over the box');
    l.tick(30);
    pressed = new Set(['cancel']);
    l.tick();
    pressed = new Set();
    assert.equal(stack.length, 0, 'back in the level');
    assert.ok(l.busy(), 'with the box where it was');
    pressed = new Set(['skip']);
    l.tick();
    pressed = new Set();
    l.tick(5);
    assert.ok(!l.busy(), 'and the skip key still closes it');
  } finally {
    settings.skipDialogue = true;
  }
});

test('losing focus over a dialogue box holds nothing, and the pause is not queued behind the box', () => {
  try {
    const l = levelWithBox();
    interrupted = true;
    l.tick();
    interrupted = false;
    assert.equal(stack.length, 0, 'no menu over a box for a blur');
    pressed = new Set(['skip']);
    l.tick();
    pressed = new Set();
    l.tick(10);
    assert.equal(stack.length, 0, 'and none after it closes');
  } finally {
    settings.skipDialogue = true;
  }
});

test('an arcade run is held when focus goes, and Esc then leaves instead of holding', () => {
  quiet();
  let left = 0;
  const cab = createArcadeScene({ game: 'galaga', player: 'MIKE', board: createBoard({ get: () => null, set: noop }), onExit: () => { left++; } });
  cab.enter?.(game);
  pressed = new Set(['attack']);
  cab.update(game);
  pressed = new Set();
  cab.update(game);
  assert.equal(left, 0, 'the run is on');
  interrupted = true;
  cab.update(game);
  interrupted = false;
  pressed = new Set(['cancel']);
  cab.update(game);
  assert.equal(left, 1, 'it was already held, so the cancel leaves; in play it would only have held the run');
});

test('without an interruption, Esc in a run holds it and does not leave', () => {
  quiet();
  let left = 0;
  const cab = createArcadeScene({ game: 'galaga', player: 'MIKE', board: createBoard({ get: () => null, set: noop }), onExit: () => { left++; } });
  cab.enter?.(game);
  pressed = new Set(['attack']);
  cab.update(game);
  pressed = new Set(['cancel']);
  cab.update(game);
  assert.equal(left, 0);
});
