import type { SimInput, Vec2 } from './types.ts';
import { actionsForCode } from './bindings.ts';
import type { Action } from './bindings.ts';
import { clientToGame } from './pointer.ts';
import { pickPads, readPads } from './gamepad.ts';

export type { Action };

export interface InputOptions {
  /** Fires when a controller button or stick direction goes down. The page uses it to try to start the sound. */
  onPadPress?(): void;
  /** The game canvas. With it, the mouse or a finger can point at and click the HUD. */
  canvas?: HTMLCanvasElement;
}

export interface InputState {
  /** Call once at the start of every update tick, before scenes update. */
  poll(): void;
  held(a: Action): boolean;
  /** True on the first tick after the button went down. Short taps are never lost. */
  pressed(a: Action): boolean;
  released(a: Action): boolean;
  /** Movement vector, length <= 1. */
  axis(): Vec2;
  /** Whichever the player touched last. A connected controller counts as touched. */
  device(): 'keyboard' | 'gamepad';
  /** Where the mouse or finger is over the game, in game px (256 by 224), or null when it is elsewhere. */
  pointer(): Vec2 | null;
  /** Where the primary button went down this tick, in game px, or null. A short click is never lost. */
  clicked(): Vec2 | null;
  /** Takes and clears a one-line message about the controller (connected, lost), for a toast. */
  notice(): string | null;
  /** The next key press goes to cb instead of the game, for rebinding. Returns a function that stops waiting. */
  capture(cb: (code: string) => void): () => void;
}

export function createInput(opts: InputOptions = {}): InputState {
  const down = new Set<string>();
  const latch = new Set<Action>();
  let prev = new Set<Action>();
  let now = new Set<Action>();
  /** The keyboard's share of `now`, so a drifting stick can't override held keys. */
  let keyNow = new Set<Action>();
  let padPrev = new Set<Action>();
  let stickWas = false;
  let pressedNow = new Set<Action>();
  let releasedNow = new Set<Action>();
  let analog: Vec2 = { x: 0, y: 0 };
  let device: 'keyboard' | 'gamepad' = 'keyboard';
  let message: string | null = null;
  let captureCb: ((code: string) => void) | null = null;
  let at: Vec2 | null = null;
  let clickLatch: Vec2 | null = null;
  let clickNow: Vec2 | null = null;

  addEventListener('keydown', (e) => {
    if (captureCb) {
      // Rebinding: this key belongs to the controls screen, not the game.
      e.preventDefault();
      if (e.repeat) return;
      const cb = captureCb;
      captureCb = null;
      cb(e.code);
      return;
    }
    const acts = actionsForCode(e.code);
    if (acts.length === 0) return;
    e.preventDefault();
    device = 'keyboard';
    if (e.repeat) return;
    down.add(e.code);
    for (const a of acts) latch.add(a);
  });
  addEventListener('keyup', (e) => { down.delete(e.code); });
  addEventListener('blur', () => { down.clear(); });

  const canvas = opts.canvas;
  if (canvas) {
    const place = (e: PointerEvent): Vec2 | null => clientToGame(e.clientX, e.clientY, canvas.getBoundingClientRect());
    canvas.addEventListener('pointermove', (e) => { at = place(e); });
    canvas.addEventListener('pointerleave', () => { at = null; });
    canvas.addEventListener('pointerdown', (e) => {
      at = place(e);
      if (e.button === 0 && at) clickLatch = at;
    });
  }

  const livePads = () => pickPads(typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []);

  // Browsers hide a controller until a button is pressed on it, then announce it here.
  addEventListener('gamepadconnected', (e) => {
    if (pickPads([e.gamepad]).length === 0) return;
    device = 'gamepad';
    message = 'CONTROLLER CONNECTED';
  });
  addEventListener('gamepaddisconnected', () => {
    if (livePads().length > 0) return;
    if (device === 'gamepad') device = 'keyboard';
    message = 'CONTROLLER LOST';
  });

  /** All controller actions this tick. The device flips to gamepad on a fresh press, not on a stick that merely drifts. */
  function padActions(): Set<Action> {
    const r = readPads(livePads(), padPrev);
    analog = r.stick;
    const stickOn = r.stick.x !== 0 || r.stick.y !== 0;
    let fresh = stickOn && !stickWas;
    for (const a of r.actions) if (!padPrev.has(a)) fresh = true;
    if (fresh) { device = 'gamepad'; opts.onPadPress?.(); }
    stickWas = stickOn;
    padPrev = r.actions;
    return r.actions;
  }

  const self: InputState = {
    poll() {
      prev = now;
      keyNow = new Set<Action>();
      for (const code of down) for (const a of actionsForCode(code)) keyNow.add(a);
      now = new Set<Action>(keyNow);
      for (const a of padActions()) now.add(a);
      pressedNow = new Set<Action>();
      releasedNow = new Set<Action>();
      for (const a of now) if (!prev.has(a)) pressedNow.add(a);
      for (const a of latch) pressedNow.add(a);
      for (const a of prev) if (!now.has(a)) releasedNow.add(a);
      latch.clear();
      clickNow = clickLatch;
      clickLatch = null;
    },
    held: (a) => now.has(a),
    pressed: (a) => pressedNow.has(a),
    released: (a) => releasedNow.has(a),
    axis() {
      // Held movement keys win over the stick. The stick is already past its deadzone and clamped to length one.
      const keyDir = keyNow.has('up') || keyNow.has('down') || keyNow.has('left') || keyNow.has('right');
      if (!keyDir && (analog.x !== 0 || analog.y !== 0)) return { ...analog };
      let x = (now.has('right') ? 1 : 0) - (now.has('left') ? 1 : 0);
      let y = (now.has('down') ? 1 : 0) - (now.has('up') ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    device: () => device,
    pointer: () => at,
    clicked: () => clickNow,
    notice() {
      const m = message;
      message = null;
      return m;
    },
    capture(cb) {
      captureCb = cb;
      return () => { if (captureCb === cb) captureCb = null; };
    },
  };
  return self;
}

/** Turns the polled input into one tick of sim input. */
export function toSimInput(i: InputState): SimInput {
  const a = i.axis();
  let swapTo = -1;
  (['swap1', 'swap2', 'swap3', 'swap4'] as const).forEach((s, idx) => { if (i.pressed(s)) swapTo = idx; });
  return {
    mx: a.x, my: a.y,
    attackHeld: i.held('attack'), attackPressed: i.pressed('attack'),
    specialPressed: i.pressed('special'), specialHeld: i.held('special'),
    swapDelta: i.pressed('swapPrev') ? -1 : i.pressed('swapNext') ? 1 : 0,
    swapTo,
    burstPressed: i.pressed('burst'),
  };
}
