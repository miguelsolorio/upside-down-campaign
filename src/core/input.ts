import type { SimInput, Vec2 } from './types.ts';
import { actionsForCode } from './bindings.ts';
import type { Action } from './bindings.ts';
import { clientToGame } from './pointer.ts';
import { heldOn, pickPads, readPad, readPads } from './gamepad.ts';
import type { PadLike } from './gamepad.ts';
import { PAD_BUTTONS, currentPadMap, maskedMap } from './padmap.ts';
import type { PadBtn } from './padmap.ts';

export type { Action };
/** Whichever the player touched last. The prompts name its keys or buttons. */
export type Device = 'keyboard' | 'gamepad' | 'touch';

/** CSS px of wheel scroll per wheel() step. */
const WHEEL_STEP = 50;

export interface InputOptions {
  /** Fires when a controller button or stick direction goes down. The page uses it to try to start the sound. */
  onPadPress?(): void;
  /** The game canvas. With it, the mouse or a finger can point at and click the HUD. */
  canvas?: HTMLCanvasElement;
  /** The on-screen controls, read once a tick like a controller. Null while they are hidden. */
  touch?: { pad(): PadLike | null };
  /** The device the prompts speak for before anything is pressed. A phone starts on touch. */
  startDevice?: Device;
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
  device(): Device;
  /** Where the mouse is over the game, in game px (SCREEN_W by SCREEN_H), or null when it is elsewhere. A finger can't hover, so it's never here. */
  hover(): Vec2 | null;
  /** True on a tick the mouse moved over the game. A menu row under it takes the selection only then, so a resting mouse never fights the keys. */
  moved(): boolean;
  /** Mouse wheel steps since the last tick, down positive. */
  wheel(): number;
  /** Where the primary button or a finger went down this tick, in game px, or null. A short click is never lost. */
  clicked(): Vec2 | null;
  /** A scene says the mouse is over something a click would do, so the page shows a hand cursor. Cleared by poll. */
  point(): void;
  /** Takes and clears a one-line message about the controller (connected, lost), for a toast. */
  notice(): string | null;
  /**
   * True on the one tick after the player was pulled away from the game: the window lost focus, the tab was hidden, or the
   * controller they were playing with disconnected. A scene where something moves answers it by pausing. Cleared by poll.
   */
  interrupted(): boolean;
  /** The next key press goes to cb instead of the game, for rebinding. Returns a function that stops waiting. */
  capture(cb: (code: string) => void): () => void;
  /**
   * The next press of a controller's face, bumper or trigger button goes to cb instead of the game, for rebinding. Those
   * buttons do nothing in the game while it waits, and the one pressed stays silent until it is let go. Start, View, the
   * D-pad and the stick still work, so a controller can back out. Returns a function that stops waiting.
   */
  capturePad(cb: (b: PadBtn) => void): () => void;
  /** A scene says an action would do something this tick, so the touch screen can show its button. Cleared by poll. */
  offer(a: Action): void;
  offered(a: Action): boolean;
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
  let device: Device = opts.startDevice ?? 'keyboard';
  let touchPrev = new Set<Action>();
  let touchStickWas = false;
  let offers = new Set<Action>();
  let message: string | null = null;
  let breakLatch = false;
  let breakNow = false;
  let captureCb: ((code: string) => void) | null = null;
  let padCaptureCb: ((b: PadBtn) => void) | null = null;
  /** The rebindable buttons down last tick, to tell a fresh press from one already held. */
  let padHeld = new Set<number>();
  /** Buttons that stay silent until they are let go: the one a rebind just took. */
  let padSilent = new Set<number>();
  let at: Vec2 | null = null;
  let moveLatch = false;
  let movedNow = false;
  let wheelPx = 0;
  let wheelNow = 0;
  let clickLatch: Vec2 | null = null;
  let clickNow: Vec2 | null = null;
  let hand = false;
  let handShown = false;

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
  addEventListener('blur', () => { down.clear(); breakLatch = true; });
  // A hidden tab stops the loop, so the pause waits for the first tick after it comes back.
  if (typeof document !== 'undefined') {
    document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'hidden') breakLatch = true; });
  }
  // A finger anywhere on the page, the margins included, hands the prompts to the touch controls.
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') device = 'touch'; });

  const canvas = opts.canvas;
  if (canvas) {
    const place = (e: PointerEvent): Vec2 | null => clientToGame(e.clientX, e.clientY, canvas.getBoundingClientRect());
    // Only the mouse hovers. A finger is over the game just while it's down, and it only clicks.
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      at = place(e);
      moveLatch = true;
    });
    canvas.addEventListener('pointerleave', () => { at = null; });
    canvas.addEventListener('pointerdown', (e) => {
      const p = place(e);
      if (e.pointerType === 'mouse') at = p;
      if (e.button === 0 && p) clickLatch = p;
    });
    // A notch is about 100 px in most browsers and a trackpad sends many small steps, so every 50 px is one step.
    // Turning back drops what was left over the other way. A pinch on a trackpad comes as a wheel with ctrl held, and
    // isn't a scroll.
    canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      const d = e.deltaMode === 0 ? e.deltaY : e.deltaY * WHEEL_STEP;
      if (Math.sign(d) !== Math.sign(wheelPx)) wheelPx = 0;
      wheelPx += d;
    }, { passive: true });
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
    // Only a pad that was being played with interrupts. One lost while the keyboard or the touch screen had the hands isn't news to the game.
    if (device === 'gamepad') {
      device = opts.startDevice ?? 'keyboard';
      breakLatch = true;
    }
    message = 'CONTROLLER LOST';
  });

  const ALL_BUTTONS = new Set(PAD_BUTTONS.map((_, i) => i));

  /** Hands a fresh face, bumper or trigger press to the rebinding that is waiting for one. */
  function padCapture(held: ReadonlySet<number>): void {
    for (const i of padSilent) if (!held.has(i)) padSilent.delete(i);
    if (padCaptureCb) {
      const fresh = [...held].find((i) => !padHeld.has(i));
      if (fresh !== undefined) {
        const cb = padCaptureCb;
        padCaptureCb = null;
        padSilent = new Set(held);
        cb(PAD_BUTTONS[fresh] as PadBtn);
      }
    }
    padHeld = new Set(held);
  }

  /** All controller actions this tick. The device flips to gamepad on a fresh press, not on a stick that merely drifts. */
  function padActions(): Set<Action> {
    const pads = livePads();
    padCapture(heldOn(pads));
    const map = padCaptureCb ? maskedMap(currentPadMap(), ALL_BUTTONS) : padSilent.size > 0 ? maskedMap(currentPadMap(), padSilent) : currentPadMap();
    const r = readPads(pads, padPrev, map);
    analog = r.stick;
    const stickOn = r.stick.x !== 0 || r.stick.y !== 0;
    let fresh = stickOn && !stickWas;
    for (const a of r.actions) if (!padPrev.has(a)) fresh = true;
    if (fresh) { device = 'gamepad'; opts.onPadPress?.(); }
    stickWas = stickOn;
    padPrev = r.actions;
    return r.actions;
  }

  /** The on-screen controls this tick. They keep their own stick memory, and never count as a controller. */
  function touchActions(): Set<Action> {
    const p = opts.touch?.pad() ?? null;
    if (!p) {
      touchPrev = new Set<Action>();
      touchStickWas = false;
      return touchPrev;
    }
    const r = readPad(p, touchPrev);
    const stickOn = r.stick.x !== 0 || r.stick.y !== 0;
    let fresh = stickOn && !touchStickWas;
    for (const a of r.actions) if (!touchPrev.has(a)) fresh = true;
    if (fresh) device = 'touch';
    // The stronger stick wins, the same rule as two controllers.
    if (Math.hypot(r.stick.x, r.stick.y) > Math.hypot(analog.x, analog.y)) analog = r.stick;
    touchStickWas = stickOn;
    touchPrev = r.actions;
    return r.actions;
  }

  const self: InputState = {
    poll() {
      prev = now;
      keyNow = new Set<Action>();
      for (const code of down) for (const a of actionsForCode(code)) keyNow.add(a);
      now = new Set<Action>(keyNow);
      for (const a of padActions()) now.add(a);
      for (const a of touchActions()) now.add(a);
      offers = new Set<Action>();
      pressedNow = new Set<Action>();
      releasedNow = new Set<Action>();
      for (const a of now) if (!prev.has(a)) pressedNow.add(a);
      for (const a of latch) pressedNow.add(a);
      for (const a of prev) if (!now.has(a)) releasedNow.add(a);
      latch.clear();
      clickNow = clickLatch;
      clickLatch = null;
      movedNow = moveLatch;
      moveLatch = false;
      wheelNow = Math.trunc(wheelPx / WHEEL_STEP);
      wheelPx -= wheelNow * WHEEL_STEP;
      // Last tick's scenes said whether the mouse was over something clickable.
      if (canvas && hand !== handShown) {
        handShown = hand;
        canvas.style.cursor = hand ? 'pointer' : '';
      }
      hand = false;
      breakNow = breakLatch;
      breakLatch = false;
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
    hover: () => at,
    moved: () => movedNow,
    wheel: () => wheelNow,
    clicked: () => clickNow,
    point() { hand = true; },
    notice() {
      const m = message;
      message = null;
      return m;
    },
    capture(cb) {
      captureCb = cb;
      return () => { if (captureCb === cb) captureCb = null; };
    },
    capturePad(cb) {
      padCaptureCb = cb;
      padHeld = heldOn(livePads());
      return () => { if (padCaptureCb === cb) padCaptureCb = null; };
    },
    interrupted: () => breakNow,
    offer(a) { offers.add(a); },
    offered: (a) => offers.has(a),
  };
  return self;
}

/**
 * Turns the polled input into one tick of sim input. With `useBursts`, the interact key (Space) bursts too: the play
 * scene sets it when there's nothing in reach to light. A controller's A is attack and interact at once, so a press
 * that also attacks never bursts, and Y stays the controller's burst.
 */
export function toSimInput(i: InputState, useBursts = false): SimInput {
  const a = i.axis();
  let swapTo = -1;
  (['swap1', 'swap2', 'swap3', 'swap4'] as const).forEach((s, idx) => { if (i.pressed(s)) swapTo = idx; });
  return {
    mx: a.x, my: a.y,
    attackHeld: i.held('attack'), attackPressed: i.pressed('attack'),
    specialPressed: i.pressed('special'), specialHeld: i.held('special'),
    swapDelta: i.pressed('swapPrev') ? -1 : i.pressed('swapNext') ? 1 : 0,
    swapTo,
    burstPressed: i.pressed('burst') || (useBursts && i.pressed('interact') && !i.pressed('attack')),
  };
}
