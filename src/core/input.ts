import type { SimInput, Vec2 } from './types.ts';
import { actionsForCode } from './bindings.ts';
import type { Action } from './bindings.ts';

export type { Action };

export interface InputState {
  /** Call once at the start of every update tick, before scenes update. */
  poll(): void;
  held(a: Action): boolean;
  /** True on the first tick after the button went down. Short taps are never lost. */
  pressed(a: Action): boolean;
  released(a: Action): boolean;
  /** Movement vector, length <= 1. */
  axis(): Vec2;
  device(): 'keyboard' | 'gamepad';
  /** The next key press goes to cb instead of the game, for rebinding. Returns a function that stops waiting. */
  capture(cb: (code: string) => void): () => void;
}

export function createInput(): InputState {
  const down = new Set<string>();
  const latch = new Set<Action>();
  let prev = new Set<Action>();
  let now = new Set<Action>();
  let pressedNow = new Set<Action>();
  let releasedNow = new Set<Action>();
  let analog: Vec2 = { x: 0, y: 0 };
  let device: 'keyboard' | 'gamepad' = 'keyboard';
  let captureCb: ((code: string) => void) | null = null;

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

  function padActions(): Set<Action> {
    const out = new Set<Action>();
    analog = { x: 0, y: 0 };
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const p = Array.from(pads).find((x): x is Gamepad => !!x);
    if (!p) return out;
    const b = (i: number): boolean => !!p.buttons[i]?.pressed;
    if (b(0)) { out.add('attack'); out.add('confirm'); out.add('interact'); }
    if (b(2)) out.add('special');
    if (b(1)) { out.add('dash'); out.add('cancel'); }
    if (b(4)) out.add('swapPrev');
    if (b(5)) out.add('swapNext');
    if (b(3)) out.add('burst');
    if (b(9)) out.add('pause');
    if (b(8)) out.add('skip');
    if (b(12)) out.add('up');
    if (b(13)) out.add('down');
    if (b(14)) out.add('left');
    if (b(15)) out.add('right');
    const ax = p.axes[0] ?? 0;
    const ay = p.axes[1] ?? 0;
    if (Math.hypot(ax, ay) > 0.3) {
      analog = { x: ax, y: ay };
      if (ay < -0.4) out.add('up');
      if (ay > 0.4) out.add('down');
      if (ax < -0.4) out.add('left');
      if (ax > 0.4) out.add('right');
    }
    if (out.size) device = 'gamepad';
    return out;
  }

  const self: InputState = {
    poll() {
      prev = now;
      now = new Set<Action>();
      for (const code of down) for (const a of actionsForCode(code)) now.add(a);
      for (const a of padActions()) now.add(a);
      pressedNow = new Set<Action>();
      releasedNow = new Set<Action>();
      for (const a of now) if (!prev.has(a)) pressedNow.add(a);
      for (const a of latch) pressedNow.add(a);
      for (const a of prev) if (!now.has(a)) releasedNow.add(a);
      latch.clear();
    },
    held: (a) => now.has(a),
    pressed: (a) => pressedNow.has(a),
    released: (a) => releasedNow.has(a),
    axis() {
      if (Math.hypot(analog.x, analog.y) > 0.3) {
        const m = Math.hypot(analog.x, analog.y);
        return m > 1 ? { x: analog.x / m, y: analog.y / m } : { ...analog };
      }
      let x = (now.has('right') ? 1 : 0) - (now.has('left') ? 1 : 0);
      let y = (now.has('down') ? 1 : 0) - (now.has('up') ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    device: () => device,
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
    dashPressed: i.pressed('dash'),
    swapDelta: i.pressed('swapPrev') ? -1 : i.pressed('swapNext') ? 1 : 0,
    swapTo,
    burstPressed: i.pressed('burst'),
  };
}
