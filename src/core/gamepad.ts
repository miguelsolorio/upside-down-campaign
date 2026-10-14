// Turns a gamepad snapshot into actions. Pure: no DOM at import, so Node can test it with fake pads.
// Layout is the browser's "standard" mapping, which is what an Xbox controller reports over USB or Bluetooth.
import type { Action } from './bindings.ts';
import type { Vec2 } from './types.ts';

export interface PadButton { pressed: boolean; value: number }
/** The slice of the DOM Gamepad this file reads. A real Gamepad fits. */
export interface PadLike {
  buttons: readonly PadButton[];
  axes: readonly number[];
  mapping: string;
  connected: boolean;
}

/** Standard-mapping button indices, named for the Xbox face. */
export const BTN = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9,
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
} as const;

/**
 * Inside this radius the stick reads as centered. Outside it the raw vector goes through, so a light tilt is a slow walk.
 * The sim has its own 0.15 cut-off on magnitude, so this one is set above it and the two never stack.
 */
export const DEADZONE = 0.2;
/** A stick counts as a direction press past ON and stays pressed until it drops under OFF. */
const ON = 0.5;
const OFF = 0.35;
const TRIGGER = 0.5;

export interface PadReading { actions: Set<Action>; stick: Vec2 }

const DIRS: ReadonlyArray<readonly [Action, 0 | 1, 1 | -1]> = [
  ['up', 1, -1], ['down', 1, 1], ['left', 0, -1], ['right', 0, 1],
];

/** Live pads only. Standard-mapped ones win, so a stray HID device that calls itself a gamepad can't take over. */
export function pickPads<T extends PadLike>(list: ArrayLike<T | null | undefined>): T[] {
  const live = Array.from(list).filter((p): p is T => !!p && p.connected);
  const standard = live.filter((p) => p.mapping === 'standard');
  return standard.length > 0 ? standard : live;
}

/** One pad. `prev` is the actions this pad produced last tick, which gives the stick its hysteresis. */
export function readPad(pad: PadLike, prev: ReadonlySet<Action> = new Set()): PadReading {
  const out = new Set<Action>();
  const down = (i: number): boolean => !!pad.buttons[i]?.pressed;
  const trigger = (i: number): boolean => (pad.buttons[i]?.value ?? 0) > TRIGGER;

  if (down(BTN.A)) { out.add('attack'); out.add('confirm'); out.add('interact'); }
  if (down(BTN.X)) out.add('special');
  if (down(BTN.B)) { out.add('dash'); out.add('cancel'); }
  if (down(BTN.Y)) out.add('burst');
  if (down(BTN.LB)) out.add('swapPrev');
  if (down(BTN.RB)) out.add('swapNext');
  if (trigger(BTN.RT)) out.add('attack');
  if (trigger(BTN.LT)) out.add('dash');
  if (down(BTN.VIEW)) out.add('skip');
  if (down(BTN.MENU)) { out.add('pause'); out.add('start'); }
  if (down(BTN.UP)) out.add('up');
  if (down(BTN.DOWN)) out.add('down');
  if (down(BTN.LEFT)) out.add('left');
  if (down(BTN.RIGHT)) out.add('right');

  const raw: [number, number] = [pad.axes[0] ?? 0, pad.axes[1] ?? 0];
  const mag = Math.hypot(raw[0], raw[1]);
  let stick: Vec2 = { x: 0, y: 0 };
  if (mag > DEADZONE) {
    // A stick's corners reach past a unit circle on some pads, so clamp the length.
    const k = mag > 1 ? 1 / mag : 1;
    stick = { x: raw[0] * k, y: raw[1] * k };
    for (const [action, axis, sign] of DIRS) {
      const v = raw[axis] * sign;
      if (v > (prev.has(action) ? OFF : ON)) out.add(action);
    }
  }
  return { actions: out, stick };
}

/** Every chosen pad at once: actions are merged and the strongest stick wins. */
export function readPads(pads: readonly PadLike[], prev: ReadonlySet<Action> = new Set()): PadReading {
  const actions = new Set<Action>();
  let stick: Vec2 = { x: 0, y: 0 };
  for (const pad of pads) {
    const r = readPad(pad, prev);
    for (const a of r.actions) actions.add(a);
    if (Math.hypot(r.stick.x, r.stick.y) > Math.hypot(stick.x, stick.y)) stick = r.stick;
  }
  return { actions, stick };
}
